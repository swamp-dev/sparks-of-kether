import { NextResponse } from 'next/server';
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
  serializeGameState,
  type PlayerRow,
  type RoomRow,
} from '@/lib/supabase';
import { query } from '@/lib/supabase-query';
import { validateAndBuildSetup } from '@/lib/start-game';
import { initializeGame } from '@/engine/setup';
import { seededRng } from '@/engine/rng';

/**
 * Transition a room from `lobby` to `playing`. Host-only.
 *
 * Steps:
 *   1. Authenticate caller (bearer JWT).
 *   2. Load room + players via the caller's session (RLS-scoped).
 *   3. Validate via `validateAndBuildSetup` (pure).
 *   4. Build initial GameState via `initializeGame`.
 *   5. Service-role: INSERT `game_states` snapshot + UPDATE
 *      `rooms.state = 'playing'` + `started_at`. Both writes go via
 *      the service-role client because the tables intentionally have
 *      no client-side INSERT/UPDATE policies for these columns
 *      (matches the engine-only-writer pattern from #34/#35).
 *
 * RNG seed: a fresh Math.random()-based 32-bit seed. Game replay
 * isn't a feature here, but if it becomes one the seed should be
 * persisted on the room or game_states row for re-derivation.
 */

interface RouteParams {
  readonly params: { readonly code: string };
}

export async function POST(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json(
      { error: 'missing-bearer-token' },
      { status: 401 },
    );
  }
  const token = authHeader.slice('bearer '.length).trim();

  const client = createSupabaseServerClient();
  const userResult = await client.auth.getUser(token);
  if (userResult.error || !userResult.data.user) {
    return NextResponse.json({ error: 'invalid-token' }, { status: 401 });
  }
  const callerId = userResult.data.user.id;

  // RLS-scoped reads via the caller's session.
  await client.auth.setSession({ access_token: token, refresh_token: '' });

  const roomLookup = await client
    .from('rooms')
    .select()
    .eq('code', params.code)
    .maybeSingle<RoomRow>();
  if (roomLookup.error || !roomLookup.data) {
    return NextResponse.json({ error: 'room-not-found' }, { status: 404 });
  }
  const room = roomLookup.data;

  const playersLookup = await client
    .from('players')
    .select()
    .eq('room_id', room.id)
    .order('seat', { ascending: true });
  if (playersLookup.error) {
    return NextResponse.json(
      { error: 'players-fetch-failed', cause: playersLookup.error.message },
      { status: 500 },
    );
  }
  const players = (playersLookup.data ?? []) as readonly PlayerRow[];

  const validated = validateAndBuildSetup({ room, players, callerId });
  if (!validated.ok) {
    const status =
      validated.error.kind === 'not-host'
        ? 403
        : validated.error.kind === 'not-lobby'
          ? 409
          : 422;
    return NextResponse.json(
      { error: 'start-rejected', reason: validated.error },
      { status },
    );
  }

  // Build the initial GameState. Errors here would be programmer
  // bugs (the validator already cleared the cases initializeGame
  // throws on), but we still catch — a corrupt data layer can
  // surface throws and we'd rather return a structured 500 than a
  // raw stack trace. Same pattern as the events route.
  let initialState;
  try {
    initialState = initializeGame({
      players: validated.value.setups,
      rng: seededRng((Date.now() >>> 0) ^ Math.floor(Math.random() * 0x100000000)),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'engine-error',
        cause: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  // Service-role writes: game_states INSERT + rooms.state UPDATE.
  // Both tables are intentionally service-role-only for these
  // operations. The `query()` helper centralizes the cast that
  // bypasses the Insert-overload-collapses-to-`never` issue
  // (see lib/supabase-query.ts).
  const serviceClient = createSupabaseServiceClient();

  const snapshotInsert = await query(serviceClient, 'game_states').insert({
    room_id: room.id,
    snapshot: serializeGameState(initialState),
    last_event_id: 0,
  });
  if (snapshotInsert.error) {
    // 23505 = unique_violation. game_states.room_id is UNIQUE; if a
    // row already exists this is a re-start race. Surface idempotent
    // success-with-noop OR explicit conflict — chose conflict so the
    // caller knows nothing changed on this call.
    const code = (snapshotInsert.error as { code?: string }).code;
    if (code === '23505') {
      return NextResponse.json(
        { error: 'already-started' },
        { status: 409 },
      );
    }
    return NextResponse.json(
      {
        error: 'snapshot-insert-failed',
        cause: snapshotInsert.error.message,
      },
      { status: 500 },
    );
  }

  const roomUpdate = await query(serviceClient, 'rooms')
    .update({
      state: 'playing',
      started_at: new Date().toISOString(),
    })
    .eq('id', room.id);
  if (roomUpdate.error) {
    // Recovery: snapshot insert succeeded but room update failed.
    // Without cleanup the host would be stuck — next /start returns
    // 409 `already-started` (game_states.room_id is UNIQUE) but the
    // room is still in 'lobby', so the multiplayer flow can't
    // proceed and the host has no in-UI path forward. Roll the
    // snapshot back so the host can retry cleanly. Best-effort —
    // if THIS delete also fails the host hits the dead-end, but
    // we surface that distinction so future ops tooling can see
    // the partial state.
    const cleanup = await query(serviceClient, 'game_states')
      .delete()
      .eq('room_id', room.id);
    return NextResponse.json(
      {
        error: 'room-state-update-failed',
        cause: roomUpdate.error.message,
        recovered: cleanup.error === null,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, roomId: room.id });
}
