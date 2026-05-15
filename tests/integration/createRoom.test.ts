import { describe, expect, it, beforeEach } from 'vitest';
import { createRoom } from '@/lib/rooms';
import { getServiceClient, makeAnonClient, wipeAllTables } from './setup';

/**
 * T3 smoke: createRoom against real Supabase (Postgres + GoTrue +
 * PostgREST + RLS). Validates that:
 *
 *   1. `signInAnonymously` works against the live auth service.
 *   2. The `rooms_create` RLS policy lets a host insert their own row.
 *   3. The `players_join` RLS policy lets the same anon user insert
 *      themselves into the room.
 *   4. The combined transaction leaves both rows intact.
 *
 * The in-memory shim from T2 (#88) cannot exercise any of this — RLS
 * is the value-add of T3.
 *
 * Additional cases (joinRoom non-member, kickPlayer host-vs-non-host,
 * full /start + /events flow, FK violations, unique violations) land
 * in a follow-up once this scaffolding has proven out in CI.
 */

describe('integration: createRoom (real Supabase)', () => {
  beforeEach(async () => {
    await wipeAllTables();
  });

  it('creates a room and seats the caller as host', async () => {
    const { client } = await makeAnonClient();
    const result = await createRoom({ nickname: 'Andy', client });
    if (!result.ok) {
      // Surface the structured rejection in the assertion message so
      // CI failures are diagnostic without re-running with extra
      // logging.
      throw new Error(`createRoom rejected: ${JSON.stringify(result.error)}`);
    }
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(result.value.roomId).toBeTruthy();
    // createRoom calls signOut() then signInAnonymously() internally so
    // the userId captured by makeAnonClient() is stale after the call.
    // Verify the returned playerId matches the CURRENT session's auth.uid.
    const {
      data: { user },
    } = await client.auth.getUser();
    expect(result.value.playerId).toBe(user?.id);

    // Service-role read confirms both rows landed.
    const svc = getServiceClient();
    const room = await svc.from('rooms').select().eq('id', result.value.roomId).maybeSingle();
    expect(room.error).toBeNull();
    expect(room.data).not.toBeNull();
    expect((room.data as { state: string }).state).toBe('lobby');

    const players = await svc.from('players').select().eq('room_id', result.value.roomId);
    expect(players.error).toBeNull();
    expect(players.data).toHaveLength(1);
    expect((players.data as { id: string }[])[0]?.id).toBe(result.value.playerId);
  });
});
