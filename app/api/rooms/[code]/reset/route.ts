import { NextResponse } from 'next/server';
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
  type RoomRow,
} from '@/lib/supabase';
import { query } from '@/lib/supabase-query';

/**
 * Reset a room back to `lobby` state. Host-only.
 *
 * Clears the game snapshot (`game_states`), all recorded events
 * (`game_events`), resets every player's `ready` flag, and sets
 * `rooms.state = 'lobby'`. Idempotent: calling this on a room already
 * in `lobby` is a no-op (cleans any orphan rows and returns success).
 *
 * Intended for: (a) after a game ends and players want to play again,
 * (b) recovering a room stuck in `playing` due to a partial write
 * during the original `/start` call.
 */

interface RouteParams {
  readonly params: { readonly code: string };
}

export async function POST(request: Request, { params }: RouteParams): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json({ error: 'missing-bearer-token' }, { status: 401 });
  }
  const token = authHeader.slice('bearer '.length).trim();

  const client = createSupabaseServerClient();
  const userResult = await client.auth.getUser(token);
  if (userResult.error || !userResult.data.user) {
    return NextResponse.json({ error: 'invalid-token' }, { status: 401 });
  }
  const callerId = userResult.data.user.id;

  // Use the service client for all reads. setSession silently fails on
  // production Supabase, leaving auth.uid() null and causing RLS-gated reads
  // to return null. Security is enforced by: (1) getUser above validates the
  // JWT, (2) the explicit callerId === host_id check below.
  const serviceClient = createSupabaseServiceClient();

  const roomLookup = await serviceClient
    .from('rooms')
    .select()
    .eq('code', params.code)
    .maybeSingle<RoomRow>();
  if (roomLookup.error || !roomLookup.data) {
    return NextResponse.json({ error: 'room-not-found' }, { status: 404 });
  }
  const room = roomLookup.data;

  if (callerId !== room.host_id) {
    return NextResponse.json({ error: 'not-host' }, { status: 403 });
  }

  // Clear events and snapshot before the room state flip so a concurrent
  // /start can't win the lobby check and then have its game_states row
  // deleted out from under it. Each write is checked; a failure here means
  // the room is still in its prior state and the host can retry.
  const eventsDelete = await query(serviceClient, 'game_events').delete().eq('room_id', room.id);
  if (eventsDelete.error) {
    return NextResponse.json(
      { error: 'reset-failed', cause: eventsDelete.error.message },
      { status: 500 },
    );
  }

  const snapshotDelete = await query(serviceClient, 'game_states').delete().eq('room_id', room.id);
  if (snapshotDelete.error) {
    return NextResponse.json(
      { error: 'reset-failed', cause: snapshotDelete.error.message },
      { status: 500 },
    );
  }

  const playersReset = await query(serviceClient, 'players')
    .update({ ready: false })
    .eq('room_id', room.id);
  if (playersReset.error) {
    return NextResponse.json(
      { error: 'reset-failed', cause: playersReset.error.message },
      { status: 500 },
    );
  }

  const roomReset = await query(serviceClient, 'rooms')
    .update({ state: 'lobby', started_at: null, finished_at: null })
    .eq('id', room.id);
  if (roomReset.error) {
    return NextResponse.json(
      { error: 'reset-failed', cause: roomReset.error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
