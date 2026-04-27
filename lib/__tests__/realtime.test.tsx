import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRoomState } from '../realtime';
import {
  __resetSupabaseClientForTests,
  serializeGameState,
} from '../supabase';
import type * as SupabaseModule from '../supabase';
import { makeState } from '@/test/fixtures';

/**
 * Mocking strategy: stub `getSupabaseBrowserClient` so the hook gets
 * a controllable client. We capture the channel handler so the test
 * can fire fake Realtime UPDATE events.
 */

interface FakeChannel {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  fireUpdate: (payload: unknown) => void;
}

let onHandler: ((payload: unknown) => void) | null = null;
let subscribeStatus: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' = 'SUBSCRIBED';
let snapshotResponse: { data: unknown; error: unknown } = {
  data: null,
  error: null,
};

function makeFakeChannel(): FakeChannel {
  const channel = {
    on: vi.fn(function (
      this: FakeChannel,
      _event: string,
      _filter: unknown,
      handler: (payload: unknown) => void,
    ) {
      onHandler = handler;
      return this;
    }),
    subscribe: vi.fn(function (
      this: FakeChannel,
      cb: (status: string) => void,
    ) {
      // Defer the status callback so the React effect can settle.
      setTimeout(() => cb(subscribeStatus), 0);
      return this;
    }),
    fireUpdate: (payload: unknown) => onHandler?.(payload),
  };
  return channel as unknown as FakeChannel;
}

vi.mock('../supabase', async (importActual) => {
  const actual = await importActual<typeof SupabaseModule>();
  return {
    ...actual,
    getSupabaseBrowserClient: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => snapshotResponse,
          }),
        }),
      }),
      channel: () => makeFakeChannel(),
      removeChannel: vi.fn(),
    }),
  };
});

describe('useRoomState', () => {
  beforeEach(() => {
    __resetSupabaseClientForTests();
    onHandler = null;
    subscribeStatus = 'SUBSCRIBED';
    snapshotResponse = { data: null, error: null };
  });

  it('returns null state until the initial snapshot fetch resolves', async () => {
    const { result } = renderHook(() => useRoomState('room-1'));
    expect(result.current.state).toBeNull();
    expect(result.current.connected).toBe(false);
    await waitFor(() => {
      expect(result.current.connected).toBe(true);
    });
  });

  it('hydrates from the initial snapshot', async () => {
    const fixture = makeState({}, { illumination: 4, separation: 2 });
    snapshotResponse = {
      data: {
        id: 'gs-1',
        room_id: 'room-1',
        snapshot: serializeGameState(fixture),
        last_event_id: 7,
        updated_at: 'now',
      },
      error: null,
    };
    const { result } = renderHook(() => useRoomState('room-1'));
    await waitFor(() => {
      expect(result.current.state?.illumination).toBe(4);
    });
    expect(result.current.lastEventId).toBe(7);
  });

  it('updates state when a Realtime UPDATE fires', async () => {
    const initial = makeState({}, { illumination: 0 });
    snapshotResponse = {
      data: {
        id: 'gs-1',
        room_id: 'room-1',
        snapshot: serializeGameState(initial),
        last_event_id: 0,
        updated_at: 'now',
      },
      error: null,
    };
    const { result } = renderHook(() => useRoomState('room-1'));
    await waitFor(() => {
      expect(result.current.state?.illumination).toBe(0);
      expect(onHandler).not.toBeNull();
    });

    const updated = makeState({}, { illumination: 9 });
    onHandler?.({
      new: {
        id: 'gs-1',
        room_id: 'room-1',
        snapshot: serializeGameState(updated),
        last_event_id: 5,
        updated_at: 'now',
      },
    });
    await waitFor(() => {
      expect(result.current.state?.illumination).toBe(9);
    });
    expect(result.current.lastEventId).toBe(5);
  });

  it('reports an error on snapshot read failure', async () => {
    snapshotResponse = { data: null, error: { message: 'permission denied' } };
    const { result } = renderHook(() => useRoomState('room-1'));
    await waitFor(() => {
      expect(result.current.error).toBe('permission denied');
    });
  });

  it('does nothing when roomId is null', () => {
    const { result } = renderHook(() => useRoomState(null));
    expect(result.current.state).toBeNull();
    expect(result.current.connected).toBe(false);
    // No subscription was opened.
    expect(onHandler).toBeNull();
  });
});
