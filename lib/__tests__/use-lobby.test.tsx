import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useLobby } from '../use-lobby';
import { __resetSupabaseClientForTests } from '../supabase';
import type * as SupabaseModule from '../supabase';
import type { PlayerRow, RoomRow } from '../supabase';

/**
 * Mocking strategy: stub `getSupabaseBrowserClient` to a controllable
 * fake whose responses are set per-test via module-level lets. The
 * hook's begin-game flow uses `fetch`, which we stub via `vi.stubGlobal`.
 */

let userResult: { data: { user: { id: string } | null } } = {
  data: { user: { id: 'p1' } },
};
let roomResponse: { data: unknown; error: unknown } = {
  data: null,
  error: null,
};
let playersResponse: { data: unknown; error: unknown } = {
  data: [],
  error: null,
};
let sessionResult: { data: { session: { access_token: string } | null } } = {
  data: { session: { access_token: 'caller-token' } },
};
let fetchCalls: { url: string; init: RequestInit | undefined }[] = [];
let fetchResponse: { ok: boolean; status: number; jsonBody: unknown } = {
  ok: true,
  status: 200,
  jsonBody: {},
};

vi.mock('../supabase', async (importActual) => {
  const actual = await importActual<typeof SupabaseModule>();
  return {
    ...actual,
    getSupabaseBrowserClient: () => ({
      auth: {
        getUser: vi.fn(async () => userResult),
        getSession: vi.fn(async () => sessionResult),
      },
      from: (table: string) => ({
        select: () => ({
          eq: () => {
            // rooms.maybeSingle vs players.order — the chain after
            // .eq() differs per table.
            if (table === 'rooms') {
              return { maybeSingle: async () => roomResponse };
            }
            return { order: async () => playersResponse };
          },
        }),
      }),
    }),
  };
});

const VALID_ROOM: RoomRow = {
  id: 'room-uuid',
  code: 'ABCDEF',
  host_id: 'p1',
  state: 'lobby',
  created_at: 't',
  started_at: null,
  finished_at: null,
};

const VALID_PLAYERS: readonly PlayerRow[] = [
  {
    id: 'p1',
    room_id: 'room-uuid',
    nickname: 'Alex',
    soul_aspect: 'chesed',
    ready: true,
    seat: 0,
    joined_at: 't',
  },
  {
    id: 'p2',
    room_id: 'room-uuid',
    nickname: 'Bea',
    soul_aspect: 'gevurah',
    ready: true,
    seat: 1,
    joined_at: 't',
  },
];

describe('useLobby', () => {
  beforeEach(() => {
    __resetSupabaseClientForTests();
    userResult = { data: { user: { id: 'p1' } } };
    roomResponse = { data: VALID_ROOM, error: null };
    playersResponse = { data: VALID_PLAYERS, error: null };
    sessionResult = {
      data: { session: { access_token: 'caller-token' } },
    };
    fetchCalls = [];
    fetchResponse = { ok: true, status: 200, jsonBody: {} };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        fetchCalls.push({ url, init });
        return {
          ok: fetchResponse.ok,
          status: fetchResponse.status,
          json: async () => fetchResponse.jsonBody,
        } as Response;
      }),
    );
  });

  afterEach(() => {
    // Restore the real `fetch`. Without this the stub bleeds into
    // any later test in the same vitest worker.
    vi.unstubAllGlobals();
  });

  it('starts with empty state then hydrates from the supabase fetch', async () => {
    const { result } = renderHook(() => useLobby('ABCDEF'));
    expect(result.current.room).toBeNull();
    expect(result.current.players).toEqual([]);

    await waitFor(() => {
      expect(result.current.room?.id).toBe('room-uuid');
    });
    expect(result.current.players).toHaveLength(2);
    expect(result.current.currentPlayerId).toBe('p1');
    expect(result.current.error).toBeNull();
  });

  it('loading is true initially and flips false once the fetch resolves', async () => {
    const { result } = renderHook(() => useLobby('ABCDEF'));
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.room?.id).toBe('room-uuid');
  });

  it('loading flips false even on the room-not-found path', async () => {
    roomResponse = { data: null, error: null };
    const { result } = renderHook(() => useLobby('NOPE'));
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).not.toBeNull();
  });

  it('reports an error when the room is not found', async () => {
    roomResponse = { data: null, error: null };
    const { result } = renderHook(() => useLobby('XXXXXX'));
    await waitFor(() => {
      expect(result.current.error).toMatch(/no room/i);
    });
    expect(result.current.room).toBeNull();
  });

  it('reports an error when players-fetch fails', async () => {
    playersResponse = {
      data: null,
      error: { message: 'permission denied' },
    };
    const { result } = renderHook(() => useLobby('ABCDEF'));
    await waitFor(() => {
      expect(result.current.error).toMatch(/permission denied/);
    });
  });

  it('beginGame() POSTs to /api/rooms/[code]/start with bearer + sets beginning during in-flight', async () => {
    const { result } = renderHook(() => useLobby('ABCDEF'));
    await waitFor(() => expect(result.current.room).not.toBeNull());

    expect(result.current.beginning).toBe(false);
    act(() => {
      result.current.beginGame();
    });
    // beginning is true synchronously after the click.
    expect(result.current.beginning).toBe(true);

    await waitFor(() => expect(result.current.beginning).toBe(false));

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0]?.url).toBe('/api/rooms/ABCDEF/start');
    expect((fetchCalls[0]?.init?.headers as Record<string, string>)['authorization']).toBe(
      'Bearer caller-token',
    );
  });

  it('beginGame() surfaces server reason on rejection', async () => {
    fetchResponse = {
      ok: false,
      status: 403,
      jsonBody: { error: 'unauthorized', reason: { kind: 'not-host' } },
    };
    const { result } = renderHook(() => useLobby('ABCDEF'));
    await waitFor(() => expect(result.current.room).not.toBeNull());

    act(() => {
      result.current.beginGame();
    });
    await waitFor(() => {
      expect(result.current.error).toMatch(/not-host/);
    });
  });

  it('beginGame() is idempotent under double-click — second call returns early', async () => {
    const { result } = renderHook(() => useLobby('ABCDEF'));
    await waitFor(() => expect(result.current.room).not.toBeNull());

    act(() => {
      result.current.beginGame();
      result.current.beginGame(); // second click while in-flight
    });
    await waitFor(() => expect(result.current.beginning).toBe(false));
    // Only one POST went out.
    expect(fetchCalls).toHaveLength(1);
  });

  it('refresh() re-fetches room + players', async () => {
    const { result } = renderHook(() => useLobby('ABCDEF'));
    await waitFor(() => expect(result.current.room).not.toBeNull());

    // Mutate the simulated server response between fetches.
    const baseline = VALID_PLAYERS[0];
    if (!baseline) throw new Error('VALID_PLAYERS empty');
    playersResponse = {
      data: [...VALID_PLAYERS, { ...baseline, id: 'p3', seat: 2 }],
      error: null,
    };
    act(() => {
      result.current.refresh();
    });
    await waitFor(() => expect(result.current.players).toHaveLength(3));
  });
});
