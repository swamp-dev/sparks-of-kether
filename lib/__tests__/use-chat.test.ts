import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useChat } from '../use-chat';
import { __resetSupabaseClientForTests } from '../supabase';
import type * as SupabaseModule from '../supabase';
import type { ChatMessageRow } from '../supabase';

/**
 * Mocking strategy: stub `getSupabaseBrowserClient` to a controllable
 * fake whose responses are set per-test via module-level lets.
 * Mirrors the pattern in use-lobby.test.tsx exactly.
 */

let historyResponse: { data: ChatMessageRow[] | null; error: { message: string } | null } = {
  data: [],
  error: null,
};

interface InsertCall {
  room_id: string;
  player_id: string;
  nickname: string;
  body: string;
}
let insertCalls: InsertCall[] = [];
let insertResponse: { data: null; error: { message: string } | null } = {
  data: null,
  error: null,
};

type InsertHandler = (payload: { new: ChatMessageRow }) => void;
let chatInsertHandler: InsertHandler | null = null;
let chatChannelSubscribeStatus: 'SUBSCRIBED' | 'CHANNEL_ERROR' = 'SUBSCRIBED';

interface FakeChannel {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
}

function makeFakeChannel(channelName: string): FakeChannel {
  const channel: FakeChannel = {
    on: vi.fn(function (this: FakeChannel, _event: string, _filter: unknown, handler: InsertHandler) {
      if (channelName.startsWith('chat:')) {
        chatInsertHandler = handler;
      }
      return this;
    }),
    subscribe: vi.fn(function (this: FakeChannel, cb?: (status: string) => void) {
      if (cb !== undefined) {
        setTimeout(() => cb(chatChannelSubscribeStatus), 0);
      }
      return this;
    }),
  };
  return channel;
}

vi.mock('../supabase', async (importActual) => {
  const actual = await importActual<typeof SupabaseModule>();
  return {
    ...actual,
    getSupabaseBrowserClient: () => ({
      channel: (name: string) => makeFakeChannel(name),
      removeChannel: vi.fn(),
      from: (_table: string) => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => historyResponse,
            }),
          }),
        }),
        insert: (row: InsertCall) => {
          insertCalls.push(row);
          return Promise.resolve(insertResponse);
        },
      }),
    }),
  };
});

const ROOM_ID = 'room-uuid-001';
const PLAYER_ID = 'player-uuid-001';
const NICKNAME = 'Alex';

const makeMessage = (id: number, body: string): ChatMessageRow => ({
  id,
  room_id: ROOM_ID,
  player_id: PLAYER_ID,
  nickname: NICKNAME,
  body,
  created_at: new Date().toISOString(),
});

describe('useChat', () => {
  beforeEach(() => {
    __resetSupabaseClientForTests();
    historyResponse = { data: [], error: null };
    insertCalls = [];
    insertResponse = { data: null, error: null };
    chatInsertHandler = null;
    chatChannelSubscribeStatus = 'SUBSCRIBED';
  });

  it('loading=true initially, false after history resolves', async () => {
    const { result } = renderHook(() => useChat(ROOM_ID, PLAYER_ID, NICKNAME));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('loading=false immediately when roomId is null', async () => {
    const { result } = renderHook(() => useChat(null, PLAYER_ID, NICKNAME));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(chatInsertHandler).toBeNull();
  });

  it('hydrates messages from the initial history fetch', async () => {
    // DB returns DESC order; hook reverses to restore chronological display order.
    historyResponse = {
      data: [makeMessage(2, 'world'), makeMessage(1, 'hello')],
      error: null,
    };
    const { result } = renderHook(() => useChat(ROOM_ID, PLAYER_ID, NICKNAME));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]?.body).toBe('hello');
    expect(result.current.messages[1]?.body).toBe('world');
  });

  it('history fetch returns newest 50 in chronological order', async () => {
    // The mock returns data in whatever order it is declared. The hook
    // requests DESC + reverses, so if the mock returns [newest, oldest]
    // (DESC order) the hook should restore [oldest, newest] display order.
    historyResponse = {
      data: [makeMessage(50, 'newest'), makeMessage(1, 'oldest')],
      error: null,
    };
    const { result } = renderHook(() => useChat(ROOM_ID, PLAYER_ID, NICKNAME));
    await waitFor(() => expect(result.current.loading).toBe(false));
    // After the DESC→reverse pass, oldest should be first (chronological).
    expect(result.current.messages[0]?.body).toBe('oldest');
    expect(result.current.messages[1]?.body).toBe('newest');
  });

  it('reports error when history fetch fails', async () => {
    historyResponse = { data: null, error: { message: 'permission denied' } };
    const { result } = renderHook(() => useChat(ROOM_ID, PLAYER_ID, NICKNAME));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toContain('permission denied');
    expect(result.current.messages).toHaveLength(0);
  });

  it('Realtime INSERT appends the new message to state', async () => {
    historyResponse = { data: [makeMessage(1, 'first')], error: null };
    const { result } = renderHook(() => useChat(ROOM_ID, PLAYER_ID, NICKNAME));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      chatInsertHandler?.({ new: makeMessage(2, 'second') });
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1]?.body).toBe('second');
  });

  it('Realtime INSERT is deduplicated if message already in history', async () => {
    // Simulates the race: message 1 arrives via history AND Realtime echo.
    historyResponse = { data: [makeMessage(1, 'first')], error: null };
    const { result } = renderHook(() => useChat(ROOM_ID, PLAYER_ID, NICKNAME));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      chatInsertHandler?.({ new: makeMessage(1, 'first') }); // duplicate echo
    });

    expect(result.current.messages).toHaveLength(1);
  });

  it('sendMessage inserts with correct shape and returns true on success', async () => {
    const { result } = renderHook(() => useChat(ROOM_ID, PLAYER_ID, NICKNAME));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = false;
    await act(async () => {
      ok = await result.current.sendMessage('Hello, room!');
    });

    expect(ok).toBe(true);
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]).toMatchObject({
      room_id: ROOM_ID,
      player_id: PLAYER_ID,
      nickname: NICKNAME,
      body: 'Hello, room!',
    });
  });

  it('sendMessage trims whitespace before inserting', async () => {
    const { result } = renderHook(() => useChat(ROOM_ID, PLAYER_ID, NICKNAME));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.sendMessage('  trimmed  ');
    });

    expect(insertCalls[0]?.body).toBe('trimmed');
  });

  it('sendMessage returns false and does not insert for blank input', async () => {
    const { result } = renderHook(() => useChat(ROOM_ID, PLAYER_ID, NICKNAME));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = true;
    await act(async () => {
      ok = await result.current.sendMessage('   ');
    });

    expect(ok).toBe(false);
    expect(insertCalls).toHaveLength(0);
  });

  it('sendMessage returns false and does not insert for body over 280 chars', async () => {
    const { result } = renderHook(() => useChat(ROOM_ID, PLAYER_ID, NICKNAME));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = true;
    await act(async () => {
      ok = await result.current.sendMessage('x'.repeat(281));
    });

    expect(ok).toBe(false);
    expect(insertCalls).toHaveLength(0);
  });

  it('sendMessage returns false when roomId is null', async () => {
    const { result } = renderHook(() => useChat(null, PLAYER_ID, NICKNAME));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = true;
    await act(async () => {
      ok = await result.current.sendMessage('hello');
    });

    expect(ok).toBe(false);
    expect(insertCalls).toHaveLength(0);
  });

  it('sendMessage sets error and returns false when insert fails', async () => {
    insertResponse = { data: null, error: { message: 'RLS violation' } };
    const { result } = renderHook(() => useChat(ROOM_ID, PLAYER_ID, NICKNAME));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = true;
    await act(async () => {
      ok = await result.current.sendMessage('hello');
    });

    expect(ok).toBe(false);
    expect(result.current.error).toContain('RLS violation');
  });

  it('CHANNEL_ERROR sets error state and calls console.error', async () => {
    chatChannelSubscribeStatus = 'CHANNEL_ERROR';
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { result } = renderHook(() => useChat(ROOM_ID, PLAYER_ID, NICKNAME));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error).toContain('Chat sync error');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(`chat:${ROOM_ID}`));
    consoleSpy.mockRestore();
  });
});
