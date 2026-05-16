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

  if (callerId !== room.host_id) {
    return NextResponse.json({ error: 'not-host' }, { status: 403 });
  }

  const serviceClient = createSupabaseServiceClient();

  // game_events references players, so delete events before resetting
  // players. game_states holds last_event_id but is independent — both
  // deletes are safe in either order since we're removing rows, not
  // updating foreign keys. Clear events and snapshot before the room
  // state flip so a concurrent /start can't race in between.
  await query(serviceClient, 'game_events').delete().eq('room_id', room.id);
  await query(serviceClient, 'game_states').delete().eq('room_id', room.id);
  await query(serviceClient, 'players')
    .update({ ready: false })
    .eq('room_id', room.id);

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
