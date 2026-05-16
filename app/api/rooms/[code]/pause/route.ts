import { NextResponse } from 'next/server';
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
  type PlayerRow,
  type RoomRow,
} from '@/lib/supabase';
import { query } from '@/lib/supabase-query';

/**
 * Transition a room from `playing` to `paused`. Any room member may call
 * this — pause is a cooperative signal, not a moderation action.
 *
 * Clients in the game receive the state change via the `rooms` Realtime
 * subscription (migration 0007 adds rooms to supabase_realtime) and render
 * a pause overlay automatically.
 *
 * Auth pattern mirrors `/api/rooms/[code]/start`:
 *   - `createSupabaseServerClient` for `getUser` (validates the JWT)
 *   - `createSupabaseServiceClient` for the state write (bypasses RLS,
 *     which has no client-side UPDATE policy for rooms.state)
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

  if (room.state !== 'playing') {
    return NextResponse.json({ error: 'room-not-playing', state: room.state }, { status: 409 });
  }

  const memberLookup = await serviceClient
    .from('players')
    .select()
    .eq('room_id', room.id)
    .eq('id', callerId)
    .maybeSingle<PlayerRow>();
  if (memberLookup.error || !memberLookup.data) {
    return NextResponse.json({ error: 'not-a-member' }, { status: 403 });
  }

  // Conditional update: only write if the room is still in 'playing' state.
  // Guards the TOCTOU window between the state check above and this write —
  // two concurrent pause requests both pass the check, but only one wins the
  // conditional update; the other gets 0 rows and returns 409.
  // { count: 'exact' } sends Prefer: count=exact so PostgREST populates
  // the count field — without it count is always null and the 0-row check below is dead.
  const roomUpdate = await query(serviceClient, 'rooms')
    .update({ state: 'paused', paused_at: new Date().toISOString() }, { count: 'exact' })
    .eq('id', room.id)
    .eq('state', 'playing');
  if (roomUpdate.error) {
    return NextResponse.json(
      { error: 'update-failed', cause: roomUpdate.error.message },
      { status: 500 },
    );
  }
  // count === 0 means another request won the race and already changed state.
  if ((roomUpdate as { count?: number }).count === 0) {
    return NextResponse.json({ error: 'state-changed', state: 'playing' }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
