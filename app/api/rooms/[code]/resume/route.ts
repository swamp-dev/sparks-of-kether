import { NextResponse } from 'next/server';
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
  type PlayerRow,
  type RoomRow,
} from '@/lib/supabase';
import { query } from '@/lib/supabase-query';

/**
 * Transition a room from `paused` to `playing`. Any room member may call
 * this — the first player to reconnect can unilaterally resume so nobody is
 * stuck waiting for a specific player to press Resume.
 *
 * Clients observing the room via the `rooms` Realtime channel receive the
 * state change and dismiss the pause overlay automatically.
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

  if (room.state !== 'paused') {
    return NextResponse.json({ error: 'room-not-paused', state: room.state }, { status: 409 });
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

  // Conditional update: only write if still paused. Guards concurrent resume
  // requests from racing each other on a brief Realtime delivery gap.
  // { count: 'exact' } sends Prefer: count=exact so PostgREST populates
  // the count field — without it count is always null and the 0-row check below is dead.
  const roomUpdate = await query(serviceClient, 'rooms')
    .update({ state: 'playing', paused_at: null }, { count: 'exact' })
    .eq('id', room.id)
    .eq('state', 'paused');
  if (roomUpdate.error) {
    return NextResponse.json(
      { error: 'update-failed', cause: roomUpdate.error.message },
      { status: 500 },
    );
  }
  if ((roomUpdate as { count?: number }).count === 0) {
    return NextResponse.json({ error: 'state-changed', state: 'paused' }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
