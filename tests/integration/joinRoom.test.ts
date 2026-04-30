import { describe, expect, it, beforeEach } from 'vitest';
import { createRoom, joinRoom } from '@/lib/rooms';
import { getServiceClient, makeAnonClient, wipeAllTables } from './setup';

/**
 * #325: integration smoke for the multi-player join path against real
 * Supabase (Postgres + GoTrue + PostgREST + RLS).
 *
 * The bug this test pins (red before the fix, green after):
 *
 *   `joinRoom` calculated the next free seat by reading `players` under
 *   the JOINER's auth scope. The `players_member_select` RLS policy
 *   denies that read because the joiner isn't yet a member of the room
 *   — they see an empty list, pick seat 0, and collide with the host
 *   on `players_seat_per_room_unique`.
 *
 * #265 worked around this in `setZodiacSign.test.ts` with a
 * service-role helper (`seedSecondPlayer`); the production browser
 * flow has no such workaround, so multi-player was effectively broken
 * end-to-end. The fix is a `security definer` RPC
 * (`join_room_next_seat`) that bypasses RLS for the seat read.
 *
 * Coverage here:
 *   1. Host creates → guest joins via real `joinRoom` (no service-role
 *      shortcut). Asserts both players land with distinct seats and no
 *      `players_seat_per_room_unique` violation.
 *   2. Host + 3 guests fill the room (seats 0..3) without collision.
 *   3. Joining a non-existent code returns the existing `room-not-found`
 *      shape — RPC's "no row" path doesn't get mistranslated to a
 *      different error kind.
 */

describe('integration: joinRoom multi-player flow (real Supabase)', () => {
  beforeEach(async () => {
    await wipeAllTables();
  });

  it('seats host + guest with distinct seats via real joinRoom (no service-role shortcut)', async () => {
    // Host creates the room — gets seat 0.
    const host = await makeAnonClient();
    const created = await createRoom({ nickname: 'Andy', client: host.client });
    if (!created.ok) {
      throw new Error(`createRoom failed: ${JSON.stringify(created.error)}`);
    }

    // Guest joins via real joinRoom — must get seat 1, not 0.
    const guest = await makeAnonClient();
    const joined = await joinRoom({
      code: created.value.code,
      nickname: 'Bea',
      client: guest.client,
    });
    if (!joined.ok) {
      throw new Error(`joinRoom failed: ${JSON.stringify(joined.error)}`);
    }
    expect(joined.value.roomId).toBe(created.value.roomId);
    expect(joined.value.playerId).toBe(guest.userId);
    expect(joined.value.seat).toBe(1);

    // Verify against ground truth (service-role) — both rows exist
    // and seats are 0 and 1.
    const svc = getServiceClient();
    const players = await svc
      .from('players')
      .select('id, seat')
      .eq('room_id', created.value.roomId)
      .order('seat', { ascending: true });
    expect(players.error).toBeNull();
    const rows = (players.data ?? []) as { id: string; seat: number }[];
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.seat)).toEqual([0, 1]);
    expect(rows[0]?.id).toBe(host.userId);
    expect(rows[1]?.id).toBe(guest.userId);
  });

  it('fills the room to 4 players without seat collision', async () => {
    const host = await makeAnonClient();
    const created = await createRoom({ nickname: 'Andy', client: host.client });
    if (!created.ok) {
      throw new Error(`createRoom failed: ${JSON.stringify(created.error)}`);
    }

    const seatsAssigned: number[] = [0]; // host's seat
    for (const nick of ['Bea', 'Cyrus', 'Dara']) {
      const guest = await makeAnonClient();
      const r = await joinRoom({
        code: created.value.code,
        nickname: nick,
        client: guest.client,
      });
      if (!r.ok) {
        throw new Error(`joinRoom (${nick}) failed: ${JSON.stringify(r.error)}`);
      }
      seatsAssigned.push(r.value.seat);
    }
    // Seats are unique 0..3.
    expect([...seatsAssigned].sort()).toEqual([0, 1, 2, 3]);
  });

  it('returns room-not-found for an unknown code', async () => {
    const guest = await makeAnonClient();
    const r = await joinRoom({
      code: 'NOPE99',
      nickname: 'A',
      client: guest.client,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe('room-not-found');
  });

  it('is idempotent — joining the same room twice as the same auth user returns the existing seat', async () => {
    const host = await makeAnonClient();
    const created = await createRoom({ nickname: 'Andy', client: host.client });
    if (!created.ok) {
      throw new Error(`createRoom failed: ${JSON.stringify(created.error)}`);
    }
    const guest = await makeAnonClient();
    const first = await joinRoom({
      code: created.value.code,
      nickname: 'Bea',
      client: guest.client,
    });
    if (!first.ok) {
      throw new Error(`joinRoom #1 failed: ${JSON.stringify(first.error)}`);
    }
    const second = await joinRoom({
      code: created.value.code,
      nickname: 'Bea',
      client: guest.client,
    });
    if (!second.ok) {
      throw new Error(`joinRoom #2 failed: ${JSON.stringify(second.error)}`);
    }
    expect(second.value.seat).toBe(first.value.seat);
    expect(second.value.playerId).toBe(first.value.playerId);
  });
});
