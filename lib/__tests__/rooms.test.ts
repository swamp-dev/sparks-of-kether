import { describe, expect, it, vi } from 'vitest';
import {
  MAX_PLAYERS_PER_ROOM,
  createRoom,
  joinRoom,
  kickPlayer,
} from '../rooms';
import type { PlayerRow, RoomRow } from '../supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Helper to fabricate a stub `SupabaseClient<Database>` with just the
 * surface our helpers use. Each test wires the responses it needs.
 */
interface SupabaseStubs {
  readonly auth?: {
    readonly getUser?: () => Promise<{
      data: { user: { id: string } | null };
      error: null;
    }>;
    readonly signInAnonymously?: () => Promise<{
      data: { user: { id: string } | null };
      error: { message: string } | null;
    }>;
  };
  readonly tableHandlers?: Partial<Record<'rooms' | 'players' | 'game_states' | 'game_events', TableHandler>>;
}

interface TableHandler {
  // Two shapes the production code uses:
  //   1. `client.from('rooms').insert(...).select().single<RoomRow>()`
  //      — chains `.select().single()`, used for rooms (server-default
  //      id makes us need the returned row).
  //   2. `client.from('players').insert(...)` — awaited directly. The
  //      players insert path was rewritten to NOT chain `.select()`
  //      because PostgREST 12 + RLS + client-supplied PK + Prefer:
  //      return=representation produces a 42501 false-positive (see
  //      `lib/rooms.ts`). The stub's `insert()` therefore needs to
  //      return either an InsertChain (rooms) or a thenable resolving
  //      to `{data,error}` (players).
  readonly insert?: (row: unknown) => InsertChain | InsertThenable;
  readonly select?: (cols: string) => SelectChain;
  readonly delete?: () => { eq: (col: string, val: string) => Promise<unknown> };
}

interface InsertChain {
  // Production callers pass no args (`.select().single<RoomRow>()`),
  // so the `cols` arg is optional in the stub.
  readonly select: (cols?: string) => {
    readonly single: () => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
  };
}

type InsertThenable = PromiseLike<{
  data: unknown;
  error: { message?: string; code?: string } | null;
}>;

interface SelectChain {
  readonly eq: (col: string, val: string) => SelectFilterChain;
  readonly maybeSingle?: () => Promise<{ data: unknown; error: { message?: string } | null }>;
}

interface SelectFilterChain {
  readonly maybeSingle?: () => Promise<{ data: unknown; error: { message?: string } | null }>;
  readonly then?: (fn: (v: unknown) => unknown) => Promise<unknown>;
}

function makeClient(stubs: SupabaseStubs): SupabaseClient {
  return {
    auth: {
      getUser: stubs.auth?.getUser ?? vi.fn(async () => ({ data: { user: null }, error: null })),
      signInAnonymously:
        stubs.auth?.signInAnonymously ??
        vi.fn(async () => ({ data: { user: { id: 'auth-user-1' } }, error: null })),
    },
    from: (table: string) => {
      const handler = stubs.tableHandlers?.[table as 'rooms' | 'players' | 'game_states' | 'game_events'];
      if (!handler) {
        throw new Error(`Test stub missing handler for table: ${table}`);
      }
      return handler;
    },
  } as unknown as SupabaseClient;
}

describe('createRoom', () => {
  it('creates a room and seats the caller as host (seat 0)', async () => {
    const client = makeClient({
      tableHandlers: {
        rooms: {
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: {
                  id: 'room-1',
                  code: 'ABC234',
                  host_id: 'auth-user-1',
                  state: 'lobby',
                  created_at: 'now',
                  started_at: null,
                  finished_at: null,
                } as RoomRow,
                error: null,
              }),
            }),
          }),
        },
        players: {
          insert: () => Promise.resolve({ data: null, error: null }),
        },
      },
    });
    const result = await createRoom({ nickname: 'Andy', client });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.code).toBe('ABC234');
    expect(result.value.roomId).toBe('room-1');
    expect(result.value.playerId).toBe('auth-user-1');
  });

  it('retries on a code unique-violation', async () => {
    let attempt = 0;
    const client = makeClient({
      tableHandlers: {
        rooms: {
          insert: () => ({
            select: () => ({
              single: async () => {
                attempt++;
                if (attempt === 1) {
                  return {
                    data: null,
                    error: { code: '23505', message: 'duplicate key' },
                  };
                }
                return {
                  data: {
                    id: 'room-2',
                    code: 'XYZ999',
                    host_id: 'auth-user-1',
                    state: 'lobby',
                    created_at: 'now',
                    started_at: null,
                    finished_at: null,
                  } as RoomRow,
                  error: null,
                };
              },
            }),
          }),
        },
        players: {
          insert: () => Promise.resolve({ data: null, error: null }),
        },
      },
    });
    const result = await createRoom({ nickname: 'A', client });
    expect(result.ok).toBe(true);
    expect(attempt).toBe(2);
  });

  it('returns auth-failed when sign-in fails', async () => {
    const client = makeClient({
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        signInAnonymously: async () => ({
          data: { user: null },
          error: { message: 'anon disabled' },
        }),
      },
      tableHandlers: {},
    });
    const result = await createRoom({ nickname: 'A', client });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('auth-failed');
  });

  it('rolls back the room when the player insert fails', async () => {
    const deleteChainEq = vi.fn(async () => ({ data: null, error: null }));
    const client = makeClient({
      tableHandlers: {
        rooms: {
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: {
                  id: 'room-3',
                  code: 'GHJKLM',
                  host_id: 'auth-user-1',
                  state: 'lobby',
                  created_at: 'now',
                  started_at: null,
                  finished_at: null,
                } as RoomRow,
                error: null,
              }),
            }),
          }),
          delete: () => ({ eq: deleteChainEq }),
        },
        players: {
          insert: () =>
            Promise.resolve({
              data: null,
              error: { message: 'permission denied' },
            }),
        },
      },
    });
    const result = await createRoom({ nickname: 'A', client });
    expect(result.ok).toBe(false);
    expect(deleteChainEq).toHaveBeenCalledExactlyOnceWith('id', 'room-3');
  });
});

describe('joinRoom', () => {
  it('joins a lobby room and gets the next seat', async () => {
    const client = makeClient({
      tableHandlers: {
        rooms: {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 'room-1',
                  code: 'ABC234',
                  host_id: 'host-1',
                  state: 'lobby',
                  created_at: 'now',
                  started_at: null,
                  finished_at: null,
                } as RoomRow,
                error: null,
              }),
            }),
          }),
        },
        players: {
          select: () => ({
            eq: async (_col: string, _val: string) => ({
              data: [
                {
                  id: 'host-1',
                  room_id: 'room-1',
                  nickname: 'Host',
                  soul_aspect: null,
                  ready: false,
                  seat: 0,
                  joined_at: 'now',
                } as PlayerRow,
              ],
              error: null,
            }),
          }),
          insert: () => Promise.resolve({ data: null, error: null }),
        },
      },
    });
    const result = await joinRoom({ code: 'ABC234', nickname: 'Bea', client });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.seat).toBe(1);
    expect(result.value.playerId).toBe('auth-user-1');
  });

  it('returns room-not-found when the code does not exist', async () => {
    const client = makeClient({
      tableHandlers: {
        rooms: {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        },
      },
    });
    const result = await joinRoom({ code: 'NOPE99', nickname: 'A', client });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('room-not-found');
  });

  it('returns room-not-joinable for non-lobby state', async () => {
    const client = makeClient({
      tableHandlers: {
        rooms: {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 'room-1',
                  code: 'ABC234',
                  host_id: 'host-1',
                  state: 'playing',
                  created_at: 'now',
                  started_at: 'now',
                  finished_at: null,
                } as RoomRow,
                error: null,
              }),
            }),
          }),
        },
      },
    });
    const result = await joinRoom({ code: 'ABC234', nickname: 'A', client });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('room-not-joinable');
  });

  it('returns room-full at the player ceiling', async () => {
    const fullPlayers: PlayerRow[] = Array.from(
      { length: MAX_PLAYERS_PER_ROOM },
      (_, i) => ({
        id: `existing-${i}`,
        room_id: 'room-1',
        nickname: `P${i}`,
        soul_aspect: null,
        ready: false,
        seat: i,
        joined_at: 'now',
      }),
    );
    const client = makeClient({
      tableHandlers: {
        rooms: {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 'room-1',
                  code: 'ABC234',
                  host_id: 'existing-0',
                  state: 'lobby',
                  created_at: 'now',
                  started_at: null,
                  finished_at: null,
                } as RoomRow,
                error: null,
              }),
            }),
          }),
        },
        players: {
          select: () => ({
            eq: async () => ({ data: fullPlayers, error: null }),
          }),
        },
      },
    });
    const result = await joinRoom({ code: 'ABC234', nickname: 'A', client });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('room-full');
  });

  it('returns the existing seat if the caller is already in the room (idempotent)', async () => {
    const client = makeClient({
      auth: {
        getUser: async () => ({ data: { user: { id: 'auth-user-1' } }, error: null }),
        signInAnonymously: async () => {
          throw new Error('should not sign in again');
        },
      },
      tableHandlers: {
        rooms: {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 'room-1',
                  code: 'ABC234',
                  host_id: 'auth-user-1',
                  state: 'lobby',
                  created_at: 'now',
                  started_at: null,
                  finished_at: null,
                } as RoomRow,
                error: null,
              }),
            }),
          }),
        },
        players: {
          select: () => ({
            eq: async () => ({
              data: [
                {
                  id: 'auth-user-1',
                  room_id: 'room-1',
                  nickname: 'Andy',
                  soul_aspect: null,
                  ready: false,
                  seat: 0,
                  joined_at: 'now',
                } as PlayerRow,
              ],
              error: null,
            }),
          }),
        },
      },
    });
    const result = await joinRoom({ code: 'ABC234', nickname: 'Andy', client });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.seat).toBe(0);
  });
});

describe('kickPlayer', () => {
  function makeKickClient(deleteResult: {
    data: unknown;
    error: { message: string } | null;
  }): SupabaseClient {
    return {
      from: () => ({
        delete: () => ({
          eq: () => ({
            eq: () => ({
              select: async () => deleteResult,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;
  }

  it('refuses self-kick before touching the database', async () => {
    let deleteCalled = false;
    const client = {
      from: () => ({
        delete: () => {
          deleteCalled = true;
          return { eq: () => ({ eq: () => ({ select: async () => ({ data: [], error: null }) }) }) };
        },
      }),
    } as unknown as SupabaseClient;

    const result = await kickPlayer(client, {
      roomId: 'room-1',
      targetPlayerId: 'host-uid',
      callerId: 'host-uid',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('self-kick-forbidden');
    expect(deleteCalled).toBe(false);
  });

  it('returns the deleted player id on success', async () => {
    const client = makeKickClient({
      data: [{ id: 'target-uid' }],
      error: null,
    });
    const result = await kickPlayer(client, {
      roomId: 'room-1',
      targetPlayerId: 'target-uid',
      callerId: 'host-uid',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.playerId).toBe('target-uid');
  });

  it('surfaces a transient delete-failed error on DB error', async () => {
    const client = makeKickClient({
      data: null,
      error: { message: 'connection reset' },
    });
    const result = await kickPlayer(client, {
      roomId: 'room-1',
      targetPlayerId: 'target-uid',
      callerId: 'host-uid',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('delete-failed');
  });

  it('returns no-row-deleted when RLS silently denies (empty result)', async () => {
    // The `players_host_delete` RLS policy returns success-with-empty
    // when the caller isn't the host — Supabase doesn't raise an
    // error in that case. We surface it as a distinct failure mode
    // so callers can show a useful message.
    const client = makeKickClient({ data: [], error: null });
    const result = await kickPlayer(client, {
      roomId: 'room-1',
      targetPlayerId: 'target-uid',
      callerId: 'not-the-host-uid',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('no-row-deleted');
  });
});
