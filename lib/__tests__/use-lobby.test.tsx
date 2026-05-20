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

type ChannelPayloadHandler = (payload: { eventType: string; new: unknown; old: unknown }) => void;

// useLobby subscribes to two channels: lobby_players and lobby_room.
// Track handlers by channel name so tests can fire events on the right one.
const channelHandlers = new Map<string, ChannelPayloadHandler>();
// Legacy alias: `channelHandler` points to the players channel handler.
let channelHandler: ChannelPayloadHandler | null = null;
// Direct alias for the rooms channel — used by the CHANNEL_ERROR + state-update tests.
let roomsChannelHandler: ChannelPayloadHandler | null = null;
// Per-channel subscribe statuses so tests can error one channel independently.
let playersChannelSubscribeStatus: 'SUBSCRIBED' | 'CHANNEL_ERROR' = 'SUBSCRIBED';
let roomsChannelSubscribeStatus: 'SUBSCRIBED' | 'CHANNEL_ERROR' = 'SUBSCRIBED';

function makeFakeChannel(channelName: string): FakeChannel {
  const channel: FakeChannel = {
    on: vi.fn(function (
      this: FakeChannel,
      _event: string,
      _filter: unknown,
      handler: ChannelPayloadHandler,
    ) {
      channelHandlers.set(channelName, handler);
      if (channelName.startsWith('lobby_players')) {
        channelHandler = handler;
      } else if (channelName.startsWith('lobby_room')) {
        roomsChannelHandler = handler;
      }
      return this;
    }),
    subscribe: vi.fn(function (this: FakeChannel, cb?: (status: string) => void) {
      if (cb !== undefined) {
        // useLobby only ever creates lobby_players:* and lobby_room:* channels,
        // so the fallback branch is unreachable in practice.
        const status = channelName.startsWith('lobby_players')
          ? playersChannelSubscribeStatus
          : channelName.startsWith('lobby_room')
            ? roomsChannelSubscribeStatus
            : 'SUBSCRIBED';
        setTimeout(() => cb(status), 0);
      }
      return this;
    }),
    fireRow: (event, row, old) =>
      channelHandlers.get(channelName)?.({ eventType: event, new: row, old: old ?? null }),
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
  paused_at: null,
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
    channelHandlers.clear();
    playersChannelSubscribeStatus = 'SUBSCRIBED';
    roomsChannelSubscribeStatus = 'SUBSCRIBED';
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

  it('CHANNEL_ERROR on any channel sets an error message and rooms error clears room', async () => {
    // When both channels error: error message appears AND room is cleared
    // (the lobby_room CHANNEL_ERROR calls setRoom(null) so the play page
    // shows the error UI rather than a ghost state with stale room.state).
    playersChannelSubscribeStatus = 'CHANNEL_ERROR';
    roomsChannelSubscribeStatus = 'CHANNEL_ERROR';
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {
      /* swallow during this test */
    });
    const { result } = renderHook(() => useLobby('ABCDEF'));
    await waitFor(() => {
      expect(result.current.error).toMatch(/realtime/i);
    });
    // room is null because CHANNEL_ERROR on lobby_room clears it.
    expect(result.current.room).toBeNull();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('rooms channel CHANNEL_ERROR sets an error message (players channel healthy)', async () => {
    // The rooms channel CHANNEL_ERROR fires after the initial fetch resolves
    // and the rooms effect mounts. It sets error + clears room to null —
    // so we wait for error directly rather than room !== null.
    roomsChannelSubscribeStatus = 'CHANNEL_ERROR';
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {
      /* swallow during this test */
    });
    const { result } = renderHook(() => useLobby('ABCDEF'));
    await waitFor(() => {
      expect(result.current.error).toMatch(/realtime/i);
    });
    // lobby_room CHANNEL_ERROR clears room so the play page renders
    // the error UI rather than a ghost state with stale room.state.
    expect(result.current.room).toBeNull();
    expect(consoleError).toHaveBeenCalledWith(expect.stringMatching(/lobby_room:/));
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

  it('a Realtime UPDATE on the rooms channel updates room state directly', async () => {
    const { result } = renderHook(() => useLobby('ABCDEF'));
    await waitFor(() => expect(result.current.room).not.toBeNull());
    await waitFor(() => expect(roomsChannelHandler).not.toBeNull());

    expect(result.current.room?.state).toBe('lobby');

    // Simulate rooms.state changing (e.g. lobby → playing when game starts).
    roomsChannelHandler?.({
      eventType: 'UPDATE',
      new: { ...VALID_ROOM, state: 'playing' },
      old: { ...VALID_ROOM, state: 'lobby' },
    });

    await waitFor(() => expect(result.current.room?.state).toBe('playing'));
  });
});
