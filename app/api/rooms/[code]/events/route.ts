import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from '@/lib/supabase';
import {
  deserializeGameState,
  serializeGameState,
  type GameStateRow,
  type RoomRow,
} from '@/lib/supabase';
import { applyClientAction, type ClientAction } from '@/lib/room-actions';
import { authorize } from '@/lib/authorize';
import { seededRng } from '@/engine/rng';

/**
 * Append-and-fold endpoint. The client posts a `ClientAction` and the
 * server:
 *   1. Authenticates via the bearer token (Supabase anon JWT).
 *   2. Loads the current room snapshot.
 *   3. Authorizes the action against turn state (only the active
 *      player can submit turn-locked actions).
 *   4. Folds the action through the engine reducer.
 *   5. Writes the new snapshot + appends to `game_events`.
 *
 * Realtime broadcasts the `game_states` UPDATE to all subscribed
 * clients, who deserialize and re-render. Optimistic local updates on
 * the actor client are the caller's job — the engine's pure reducers
 * are deterministic given the same `outcome` payload, so the client's
 * pre-applied state will match what the server broadcasts.
 *
 * Rejected actions are logged to `game_events` with an event_type
 * prefix of `rejected:` so dev tooling can audit attempts. Rejected
 * actions never mutate the snapshot.
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

  let action: ClientAction;
  try {
    action = (await request.json()) as ClientAction;
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  }
  if (!action || typeof action !== 'object' || typeof action.kind !== 'string') {
    return NextResponse.json({ error: 'invalid-action-shape' }, { status: 400 });
  }

  const client = createSupabaseServerClient();
  // Verify the bearer token corresponds to a real user, and pin the
  // caller's identity to `auth.uid()`. The action's `playerId` is
  // claimed by the client and must match — without this check, a
  // malicious caller could submit actions as another player and the
  // engine would fold them before the game_events RLS rejected the
  // insert (after-the-fact, surfacing as 500).
  const userResult = await client.auth.getUser(token);
  if (userResult.error || !userResult.data.user) {
    return NextResponse.json({ error: 'invalid-token' }, { status: 401 });
  }
  const callerId = userResult.data.user.id;
  if (action.playerId !== callerId) {
    // Same response shape as `authorize`'s `identity-mismatch`
    // rejection (see `lib/authorize.ts`). The two checks are
    // defense-in-depth: this one short-circuits before the snapshot
    // load to avoid a wasted DB roundtrip; `authorize` is the
    // authoritative rule for any future caller that bypasses this
    // route. They MUST stay shape-compatible — JSON consumers don't
    // distinguish.
    return NextResponse.json(
      {
        error: 'unauthorized',
        reason: {
          kind: 'identity-mismatch',
          callerId,
          claimedPlayerId: action.playerId,
        },
      },
      { status: 403 },
    );
  }

  // Apply the caller's auth so RLS reads scope to their membership.
  await client.auth.setSession({ access_token: token, refresh_token: '' });
  // Untyped surface for inserts/updates — Supabase 2.x's overload
  // resolution collapses Insert types to `never` when the Database
  // generic carries readonly Row shapes through Omit/Pick. Reads
  // still get explicit row types via `.maybeSingle<RowType>()` /
  // `.single<RowType>()`. Same workaround as `lib/rooms.ts`.
  const writeClient: SupabaseClient = client;

  // Resolve the room by its code.
  const roomLookup = await client
    .from('rooms')
    .select()
    .eq('code', params.code)
    .maybeSingle<RoomRow>();
  if (roomLookup.error || !roomLookup.data) {
    return NextResponse.json({ error: 'room-not-found' }, { status: 404 });
  }
  const room = roomLookup.data;

  // Load the current snapshot. `game_states` is service-role-write
  // only per the migration; the read here goes through the caller's
  // auth via the membership-based SELECT policy.
  const snapshotLookup = await client
    .from('game_states')
    .select()
    .eq('room_id', room.id)
    .maybeSingle<GameStateRow>();
  if (snapshotLookup.error) {
    return NextResponse.json(
      { error: 'snapshot-read-failed', cause: snapshotLookup.error.message },
      { status: 500 },
    );
  }
  if (!snapshotLookup.data) {
    return NextResponse.json(
      { error: 'snapshot-missing' },
      { status: 404 },
    );
  }

  const currentState = deserializeGameState(snapshotLookup.data.snapshot);

  // Authorize: turn-locked actions require the caller to be the
  // active player. On reject we log an audit row (best effort — if
  // the audit insert fails we still send 403; the snapshot is never
  // mutated) and bail before the engine sees the action. AC #3:
  // rejected events never mutate state.
  const authResult = authorize(action, currentState, callerId);
  if (!authResult.ok) {
    await writeClient.from('game_events').insert({
      room_id: room.id,
      player_id: callerId,
      event_type: `rejected:${action.kind}`,
      payload: { action, reason: authResult.reason },
    });
    return NextResponse.json(
      { error: 'unauthorized', reason: authResult.reason },
      { status: 403 },
    );
  }

  // Fold the action. RNG is seeded from the row's last_event_id so
  // re-applying the same action against the same snapshot produces
  // the same outcome — handy for any future "verify client outcome"
  // checks. The action's `outcome` field still wins for challenge
  // rolls (the player saw it; we honor it).
  //
  // Engine reducers (e.g. `endTurn`) throw on corrupted snapshots —
  // an `activePlayerId` that's not in `state.players`, etc. We catch
  // and surface as a structured 500 rather than a raw stack trace,
  // since a corrupted snapshot is a real-but-rare ops case.
  const rng = seededRng(snapshotLookup.data.last_event_id + 1);
  let apply;
  try {
    apply = applyClientAction(currentState, action, rng);
  } catch (err) {
    return NextResponse.json(
      {
        error: 'engine-error',
        cause: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
  if (!apply.ok) {
    return NextResponse.json(
      { error: 'action-rejected', detail: apply.error },
      { status: 422 },
    );
  }

  // Persist: append the event row, write the new snapshot. NOTE:
  // these two writes are not atomic. A trustworthy implementation
  // would put them behind an edge function or use a stored
  // procedure; for now an event-without-snapshot or vice-versa is
  // a known recovery case (event log is the source of truth on
  // restart). Documented in the README's multiplayer section.
  const eventInsert = await writeClient
    .from('game_events')
    .insert({
      room_id: room.id,
      player_id: action.playerId,
      event_type: action.kind,
      payload: action,
    })
    .select()
    .single<{ id: number }>();
  if (eventInsert.error) {
    return NextResponse.json(
      { error: 'event-insert-failed', cause: eventInsert.error.message },
      { status: 500 },
    );
  }
  const newEventId = eventInsert.data.id;

  // Snapshot writes go through the service-role client. The
  // `game_states` table has no UPDATE RLS policy by design — the
  // engine is the only legitimate writer, and it lives here on the
  // server. Using the caller's anon JWT for this UPDATE would be
  // denied by Postgres (RLS enabled + no matching policy = deny).
  const serviceClient: SupabaseClient = createSupabaseServiceClient();
  const snapshotUpdate = await serviceClient
    .from('game_states')
    .update({
      snapshot: serializeGameState(apply.newState),
      last_event_id: newEventId,
      updated_at: new Date().toISOString(),
    })
    .eq('room_id', room.id);
  if (snapshotUpdate.error) {
    return NextResponse.json(
      {
        error: 'snapshot-write-failed',
        cause: snapshotUpdate.error.message,
        recovered: false,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, eventId: newEventId });
}
