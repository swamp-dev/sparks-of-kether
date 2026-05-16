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

interface UpdateCall {
  table: string;
  row: unknown;
  eq: { col: string; val: string } | null;
}
let updateCalls: UpdateCall[] = [];
let updateResponse: { error: { message: string } | null } = { error: null };

interface FakeChannel {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  fireRow: (event: 'INSERT' | 'UPDATE' | 'DELETE', row: unknown, old?: unknown) => void;
}
type ChannelPayloadHandler = (payload: {
  eventType: string;
  new: unknown;
  old: unknown;
}) => void;
// Players channel handler — referenced by existing tests via `channelHandler`.
let channelHandler: ChannelPayloadHandler | null = null;
// Rooms channel handler — used by the new rooms-subscription test.
let roomsChannelHandler: ChannelPayloadHandler | null = null;
let channelSubscribeStatus: 'SUBSCRIBED' | 'CHANNEL_ERROR' = 'SUBSCRIBED';

function makeFakeChannel(name: string): FakeChannel {
  const channel: FakeChannel = {
    on: vi.fn(function (
      this: FakeChannel,
      _event: string,
      _filter: unknown,
      handler: ChannelPayloadHandler,
    ) {
      if (name.startsWith('lobby_players:')) {
        channelHandler = handler;
      } else if (name.startsWith('lobby_room:')) {
        roomsChannelHandler = handler;
      }
      return this;
    }),
    subscribe: vi.fn(function (
      this: FakeChannel,
      cb?: (status: string) => void,
    ) {
      // Defer so the React effect can settle. The callback is
      // optional in the Supabase client's runtime API; the lobby
      // hook doesn't pass one.
      if (cb !== undefined) {
        setTimeout(() => cb(channelSubscribeStatus), 0);
      }
      return this;
    }),
    fireRow: (event, row, old) =>
      channelHandler?.({ eventType: event, new: row, old: old ?? null }),
  };
  return channel;
}

vi.mock('../supabase', async (importActual) => {
  const actual = await importActual<typeof SupabaseModule>();
  return {
    ...actual,
    getSupabaseBrowserClient: () => ({
      auth: {
        getUser: vi.fn(async () => userResult),
        getSession: vi.fn(async () => sessionResult),
      },
      channel: (name: string) => makeFakeChannel(name),
      removeChannel: vi.fn(),
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
        update: (row: unknown) => ({
          eq: (col: string, val: string) => {
            updateCalls.push({ table, row, eq: { col, val } });
            return Promise.resolve({ data: null, error: updateResponse.error });
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
    zodiac_sign: 'aries',
    ready: true,
    seat: 0,
    joined_at: 't',
  },
  {
    id: 'p2',
    room_id: 'room-uuid',
    nickname: 'Bea',
    zodiac_sign: 'leo',
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
    updateCalls = [];
    updateResponse = { error: null };
    channelHandler = null;
    roomsChannelHandler = null;
    channelSubscribeStatus = 'SUBSCRIBED';
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

  it('setZodiacSign() updates the players row for the current player', async () => {
    const { result } = renderHook(() => useLobby('ABCDEF'));
    await waitFor(() => expect(result.current.room).not.toBeNull());

    let mutation: { ok: boolean } | undefined;
    await act(async () => {
      mutation = await result.current.setZodiacSign('aries');
    });
    expect(mutation?.ok).toBe(true);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0]).toMatchObject({
      table: 'players',
      row: { zodiac_sign: 'aries' },
      eq: { col: 'id', val: 'p1' },
    });
  });

  it('setZodiacSign() returns ok=false when not signed in', async () => {
    userResult = { data: { user: null } };
    const { result } = renderHook(() => useLobby('ABCDEF'));
    await waitFor(() => expect(result.current.error).toBeNull());

    let mutation: { ok: boolean } | undefined;
    await act(async () => {
      mutation = await result.current.setZodiacSign('aries');
    });
    expect(mutation?.ok).toBe(false);
    expect(updateCalls).toHaveLength(0);
  });

  it('setReady() flips the players.ready flag', async () => {
    const { result } = renderHook(() => useLobby('ABCDEF'));
    await waitFor(() => expect(result.current.room).not.toBeNull());

    await act(async () => {
      await result.current.setReady(true);
    });
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0]).toMatchObject({
      table: 'players',
      row: { ready: true },
      eq: { col: 'id', val: 'p1' },
    });
  });

  it('a Realtime UPDATE on the players channel patches that player in state', async () => {
    const { result } = renderHook(() => useLobby('ABCDEF'));
    await waitFor(() => expect(result.current.room).not.toBeNull());
    await waitFor(() => expect(channelHandler).not.toBeNull());

    expect(result.current.players[1]?.zodiac_sign).toBe('leo');
    channelHandler?.({
      eventType: 'UPDATE',
      new: {
        id: 'p2',
        room_id: 'room-uuid',
        nickname: 'Bea',
        zodiac_sign: 'scorpio',
        ready: true,
        seat: 1,
        joined_at: 't',
      },
      old: null,
    });
    await waitFor(() => {
      expect(result.current.players[1]?.zodiac_sign).toBe('scorpio');
    });
    // Other players are untouched.
    expect(result.current.players[0]?.zodiac_sign).toBe('aries');
  });

  it('a Realtime INSERT appends the new player', async () => {
    const { result } = renderHook(() => useLobby('ABCDEF'));
    await waitFor(() => expect(result.current.room).not.toBeNull());
    await waitFor(() => expect(channelHandler).not.toBeNull());

    expect(result.current.players).toHaveLength(2);
    channelHandler?.({
      eventType: 'INSERT',
      new: {
        id: 'p3',
        room_id: 'room-uuid',
        nickname: 'Cy',
        zodiac_sign: null,
        ready: false,
        seat: 2,
        joined_at: 't',
      },
      old: null,
    });
    await waitFor(() => {
      expect(result.current.players).toHaveLength(3);
    });
    // Sorted by seat — Cy lands at index 2.
    expect(result.current.players[2]?.id).toBe('p3');
  });

  it('a Realtime DELETE removes the player', async () => {
    const { result } = renderHook(() => useLobby('ABCDEF'));
    await waitFor(() => expect(result.current.room).not.toBeNull());
    await waitFor(() => expect(channelHandler).not.toBeNull());

    channelHandler?.({
      eventType: 'DELETE',
      new: null,
      old: {
        id: 'p2',
        room_id: 'room-uuid',
        nickname: 'Bea',
        zodiac_sign: 'leo',
        ready: true,
        seat: 1,
        joined_at: 't',
      },
    });
    await waitFor(() => {
      expect(result.current.players).toHaveLength(1);
    });
    expect(result.current.players[0]?.id).toBe('p1');
  });

  it('Realtime CHANNEL_ERROR sets an error message instead of silently failing', async () => {
    // Without a status callback the hook silently stops receiving
    // updates on a CHANNEL_ERROR; the host stares at a Begin that
    // never lights up. The fix surfaces an error string so the
    // failure has a paper trail.
    channelSubscribeStatus = 'CHANNEL_ERROR';
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {
        /* swallow during this test */
      });
    const { result } = renderHook(() => useLobby('ABCDEF'));
    await waitFor(() => expect(result.current.room).not.toBeNull());

    await waitFor(() => {
      expect(result.current.error).toMatch(/realtime/i);
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
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

  it('a Realtime event on the rooms channel triggers a re-fetch', async () => {
    const { result } = renderHook(() => useLobby('ABCDEF'));
    await waitFor(() => expect(result.current.room).not.toBeNull());
    await waitFor(() => expect(roomsChannelHandler).not.toBeNull());

    // Update server response before the rooms event fires so we can
    // detect the re-fetch by observing the updated player count.
    const baseline = VALID_PLAYERS[0];
    if (!baseline) throw new Error('VALID_PLAYERS empty');
    playersResponse = {
      data: [...VALID_PLAYERS, { ...baseline, id: 'p3', seat: 2 }],
      error: null,
    };

    // Simulate rooms.state changing (e.g. playing → lobby on host reset).
    roomsChannelHandler?.({
      eventType: 'UPDATE',
      new: { ...VALID_ROOM, state: 'lobby' },
      old: { ...VALID_ROOM, state: 'playing' },
    });

    await waitFor(() => expect(result.current.players).toHaveLength(3));
  });
});
