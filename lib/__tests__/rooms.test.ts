import { describe, expect, it, vi } from 'vitest';
import {
  createRoom,
  joinRoom,
  kickPlayer,
  setReady,
  setZodiacSign,
} from '../rooms';
import type { RoomRow } from '../supabase';
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
    readonly signOut?: () => Promise<{ error: null }>;
  };
  readonly tableHandlers?: Partial<Record<'rooms' | 'players' | 'game_states' | 'game_events', TableHandler>>;
  // RPC handler for `join_room_next_seat` (and any future RPC the
  // joinRoom path acquires). Receives the named-param object the
  // production code passes (`{ target_room_id }`) and returns a
  // `{ data, error }` shape mirroring supabase-js's `.rpc()` await.
  readonly rpcHandlers?: Partial<
    Record<
      'join_room_next_seat',
      (params: Record<string, unknown>) => Promise<{
        data: unknown;
        error: { message?: string } | null;
      }>
    >
  >;
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
  // Two-eq variant: `select(...).eq(col1, v1).eq(col2, v2).maybeSingle()`.
  // Used by the joinRoom self-lookup after the seat RPC.
  readonly eq?: (col: string, val: string) => {
    readonly maybeSingle: () => Promise<{
      data: unknown;
      error: { message?: string } | null;
    }>;
  };
}

function makeClient(stubs: SupabaseStubs): SupabaseClient {
  return {
    auth: {
      getUser: stubs.auth?.getUser ?? vi.fn(async () => ({ data: { user: null }, error: null })),
      signInAnonymously:
        stubs.auth?.signInAnonymously ??
        vi.fn(async () => ({ data: { user: { id: 'auth-user-1' } }, error: null })),
      signOut: stubs.auth?.signOut ?? vi.fn(async () => ({ error: null })),
    },
    from: (table: string) => {
      const handler = stubs.tableHandlers?.[table as 'rooms' | 'players' | 'game_states' | 'game_events'];
      if (!handler) {
        throw new Error(`Test stub missing handler for table: ${table}`);
      }
      return handler;
    },
    rpc: (
      name: string,
      params: Record<string, unknown>,
    ): Promise<{ data: unknown; error: { message?: string } | null }> => {
      const handler = stubs.rpcHandlers?.[name as 'join_room_next_seat'];
      if (!handler) {
        throw new Error(`Test stub missing handler for RPC: ${name}`);
      }
      return handler(params);
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

  it('signs out before creating a room (regression: stale anonymous session causes players_pkey 23505)', async () => {
    // Supabase anonymous sessions persist in localStorage. A returning user
    // who still has a player row from a previous game hits a 23505 unique
    // constraint on players.id = auth.uid(). Fix: signOut at the start of
    // createRoom so every room creation begins with a fresh identity.
    const signOut = vi.fn(async () => ({ error: null }));
    const client = makeClient({
      auth: { signOut },
      tableHandlers: {
        rooms: {
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: {
                  id: 'room-4',
                  code: 'ABCDEF',
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
    await createRoom({ nickname: 'Andy', client });
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('returns auth-failed when signOut fails (silently keeping the stale session regenerates the 23505)', async () => {
    // If signOut errors, the stale session stays active. ensureAnonymousSession
    // then returns the OLD userId via getUser() — skipping signInAnonymously —
    // and the player insert hits 23505 again. Surface the error early instead.
    const client = makeClient({
      auth: {
        signOut: vi.fn(async () => ({ error: { message: 'network error' } })),
      },
      tableHandlers: {},
    });
    const result = await createRoom({ nickname: 'Andy', client });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('auth-failed');
    expect((result.error as { kind: 'auth-failed'; cause: string }).cause).toBe('network error');
  });
});

describe('joinRoom', () => {
  /**
   * Common stub builders. The new joinRoom shape (post-#325) calls:
   *   1. `rooms.select(...).eq('code', code).maybeSingle()`
   *   2. `client.rpc('join_room_next_seat', { target_room_id })`
   *   3. `players.select(...).eq('room_id', X).eq('id', Y).maybeSingle()`
   *   4. `players.insert({...})`  (only if step 3 returned null)
   */
  function lobbyRoom(overrides?: Partial<RoomRow>): RoomRow {
    return {
      id: 'room-1',
      code: 'ABC234',
      host_id: 'host-1',
      state: 'lobby',
      created_at: 'now',
      started_at: null,
      finished_at: null,
      ...overrides,
    };
  }

  function roomLookupOk(room: RoomRow | null) {
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: room, error: null }),
        }),
      }),
    };
  }

  function selfLookupReturns(row: unknown) {
    return {
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: row, error: null }),
          }),
        }),
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
    };
  }

  it('joins a lobby room and gets the seat assigned by the RPC', async () => {
    const client = makeClient({
      tableHandlers: {
        rooms: roomLookupOk(lobbyRoom()),
        // Self-lookup returns null (we're not yet a member) → insert path.
        players: selfLookupReturns(null),
      },
      rpcHandlers: {
        join_room_next_seat: async (params) => {
          expect(params).toEqual({ target_room_id: 'room-1' });
          return { data: 1, error: null };
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
        rooms: roomLookupOk(null),
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
        rooms: roomLookupOk(
          lobbyRoom({ state: 'playing', started_at: 'now' }),
        ),
      },
    });
    const result = await joinRoom({ code: 'ABC234', nickname: 'A', client });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('room-not-joinable');
  });

  it('returns room-full when the RPC reports null (room at the player ceiling)', async () => {
    // The RPC encodes the ceiling check (count >= MAX_PLAYERS_PER_ROOM).
    // A null return means "no seat available." We translate that to
    // the existing `room-full` Result variant for caller compat.
    const client = makeClient({
      tableHandlers: {
        rooms: roomLookupOk(lobbyRoom()),
      },
      rpcHandlers: {
        join_room_next_seat: async () => ({ data: null, error: null }),
      },
    });
    const result = await joinRoom({ code: 'ABC234', nickname: 'A', client });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('room-full');
  });

  it('surfaces an RPC failure as seat-rpc-failed', async () => {
    const client = makeClient({
      tableHandlers: {
        rooms: roomLookupOk(lobbyRoom()),
      },
      rpcHandlers: {
        join_room_next_seat: async () => ({
          data: null,
          error: { message: 'function not found' },
        }),
      },
    });
    const result = await joinRoom({ code: 'ABC234', nickname: 'A', client });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('seat-rpc-failed');
  });

  it('returns the existing seat if the caller is already in the room (idempotent)', async () => {
    // The RPC hands back the existing seat for a returning member.
    // The self-lookup then finds the row and short-circuits before
    // attempting an insert that would have collided on the unique
    // constraint. Insert should NOT be called.
    let insertCalled = false;
    const client = makeClient({
      auth: {
        getUser: async () => ({ data: { user: { id: 'auth-user-1' } }, error: null }),
        signInAnonymously: async () => {
          throw new Error('should not sign in again');
        },
      },
      tableHandlers: {
        rooms: roomLookupOk(lobbyRoom({ host_id: 'auth-user-1' })),
        players: {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'auth-user-1', seat: 0 },
                  error: null,
                }),
              }),
            }),
          }),
          insert: () => {
            insertCalled = true;
            return Promise.resolve({ data: null, error: null });
          },
        },
      },
      rpcHandlers: {
        join_room_next_seat: async () => ({ data: 0, error: null }),
      },
    });
    const result = await joinRoom({ code: 'ABC234', nickname: 'Andy', client });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.seat).toBe(0);
    expect(insertCalled).toBe(false);
  });

  it('passes the RPC the correct target_room_id (not the code)', async () => {
    // Regression guard: a careless rewrite could pass `code` to the
    // RPC. Pin the call shape so a future refactor doesn't silently
    // break the seat-pick.
    let observedParams: Record<string, unknown> | null = null;
    const client = makeClient({
      tableHandlers: {
        rooms: roomLookupOk(lobbyRoom({ id: 'room-uuid-xyz' })),
        players: selfLookupReturns(null),
      },
      rpcHandlers: {
        join_room_next_seat: async (params) => {
          observedParams = params;
          return { data: 1, error: null };
        },
      },
    });
    await joinRoom({ code: 'ABC234', nickname: 'Bea', client });
    expect(observedParams).toEqual({ target_room_id: 'room-uuid-xyz' });
  });

  it('surfaces an insert-failed error from the player insert path', async () => {
    // The seat RPC succeeded and the self-lookup returned null (we
    // are not yet a member), so we attempt the insert. Postgres
    // returns an error (e.g. an unrelated constraint or a transient
    // failure); surface it as `insert-failed` for parity with the
    // pre-#325 contract.
    const client = makeClient({
      tableHandlers: {
        rooms: roomLookupOk(lobbyRoom()),
        players: {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
          insert: () =>
            Promise.resolve({
              data: null,
              error: { message: 'connection reset' },
            }),
        },
      },
      rpcHandlers: {
        join_room_next_seat: async () => ({ data: 2, error: null }),
      },
    });
    const result = await joinRoom({ code: 'ABC234', nickname: 'A', client });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('insert-failed');
    if (result.error.kind !== 'insert-failed') return;
    expect(result.error.cause).toMatch(/connection reset/);
  });

  it('surfaces a self-lookup error as self-lookup-failed without calling insert', async () => {
    // Security retro-review (#325 PR #333) finding: if the self-lookup
    // PostgREST call returns an error (e.g. transient connection drop),
    // the previous code only inspected `.data` and fell through to the
    // insert path. For a re-joining player that path then hit the
    // `players_seat_per_room_unique` constraint and surfaced as a
    // confusing `insert-failed` with a constraint-violation cause.
    // Guard the error explicitly. Pin the contract with the
    // load-bearing assertion: insert must NOT be called.
    let insertCalled = false;
    const client = makeClient({
      tableHandlers: {
        rooms: roomLookupOk(lobbyRoom()),
        players: {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: null,
                  error: { message: 'connection lost' },
                }),
              }),
            }),
          }),
          insert: () => {
            insertCalled = true;
            return Promise.resolve({ data: null, error: null });
          },
        },
      },
      rpcHandlers: {
        join_room_next_seat: async () => ({ data: 2, error: null }),
      },
    });
    const result = await joinRoom({ code: 'ABC234', nickname: 'A', client });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('self-lookup-failed');
    if (result.error.kind !== 'self-lookup-failed') return;
    expect(result.error.cause).toMatch(/connection lost/);
    // Load-bearing: insert NEVER runs when the self-lookup errors.
    expect(insertCalled).toBe(false);
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

/**
 * Helper for `setZodiacSign` / `setReady` tests. Both mutations use
 * `query(client, 'players').update(...).eq('id', playerId)` and await
 * the chain directly. The stub mirrors that exactly.
 */
interface UpdateChainCalls {
  readonly updates: unknown[];
  readonly eqArgs: { col: string; val: string }[];
}

function makeUpdateClient(
  result: { data?: unknown; error: { message: string } | null },
  calls: UpdateChainCalls,
): SupabaseClient {
  return {
    from: () => ({
      update: (row: unknown) => {
        (calls.updates as unknown[]).push(row);
        return {
          eq: (col: string, val: string) => {
            (calls.eqArgs as { col: string; val: string }[]).push({ col, val });
            return Promise.resolve({ data: result.data ?? null, error: result.error });
          },
        };
      },
    }),
  } as unknown as SupabaseClient;
}

describe('setZodiacSign', () => {
  it('issues UPDATE players SET zodiac_sign WHERE id = playerId', async () => {
    const calls: UpdateChainCalls = { updates: [], eqArgs: [] };
    const client = makeUpdateClient({ error: null }, calls);
    const result = await setZodiacSign(client, {
      playerId: 'p1',
      sign: 'aries',
    });
    expect(result.ok).toBe(true);
    expect(calls.updates).toEqual([{ zodiac_sign: 'aries' }]);
    expect(calls.eqArgs).toEqual([{ col: 'id', val: 'p1' }]);
  });

  it('surfaces a Postgres error as update-failed', async () => {
    const calls: UpdateChainCalls = { updates: [], eqArgs: [] };
    const client = makeUpdateClient(
      { error: { message: 'permission denied' } },
      calls,
    );
    const result = await setZodiacSign(client, {
      playerId: 'p1',
      sign: 'leo',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('update-failed');
    expect(result.error.cause).toMatch(/permission denied/);
  });
});

describe('setReady', () => {
  it('issues UPDATE players SET ready WHERE id = playerId', async () => {
    const calls: UpdateChainCalls = { updates: [], eqArgs: [] };
    const client = makeUpdateClient({ error: null }, calls);
    const result = await setReady(client, { playerId: 'p1', ready: true });
    expect(result.ok).toBe(true);
    expect(calls.updates).toEqual([{ ready: true }]);
    expect(calls.eqArgs).toEqual([{ col: 'id', val: 'p1' }]);
  });

  it('can clear readiness with ready=false', async () => {
    const calls: UpdateChainCalls = { updates: [], eqArgs: [] };
    const client = makeUpdateClient({ error: null }, calls);
    await setReady(client, { playerId: 'p2', ready: false });
    expect(calls.updates).toEqual([{ ready: false }]);
  });

  it('surfaces a Postgres error as update-failed', async () => {
    const calls: UpdateChainCalls = { updates: [], eqArgs: [] };
    const client = makeUpdateClient(
      { error: { message: 'connection reset' } },
      calls,
    );
    const result = await setReady(client, { playerId: 'p1', ready: true });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('update-failed');
    expect(result.error.cause).toMatch(/connection reset/);
  });
});
