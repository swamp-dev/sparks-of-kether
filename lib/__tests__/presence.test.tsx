import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePresence } from '../presence';
import { __resetSupabaseClientForTests } from '../supabase';
import type * as SupabaseModule from '../supabase';

/**
 * Mocking strategy: stub `getSupabaseBrowserClient` so the hook gets a
 * controllable channel. We capture the sync handler so the test can
 * fire fake presence-state diffs, and stub `presenceState()` so the
 * hook reads what we set.
 */

let presenceState: Record<string, { playerId: string; joinedAt: string }[]> = {};
let syncHandler: (() => void) | null = null;
let trackCalls: { playerId: string }[] = [];

function makeFakeChannel() {
  return {
    on: vi.fn(function (this: unknown, _scope: string, _filter: unknown, handler: () => void) {
      syncHandler = handler;
      return this as { on: unknown };
    }),
    subscribe: vi.fn(function (this: unknown, cb: (status: string) => void) {
      // Defer so the React effect can settle.
      setTimeout(() => cb('SUBSCRIBED'), 0);
      return this;
    }),
    presenceState: () => presenceState,
    track: vi.fn(async (meta: { playerId: string }) => {
      trackCalls.push(meta);
      return 'ok';
    }),
    untrack: vi.fn(async () => 'ok'),
  };
}

vi.mock('../supabase', async (importActual) => {
  const actual = await importActual<typeof SupabaseModule>();
  return {
    ...actual,
    getSupabaseBrowserClient: () => ({
      channel: () => makeFakeChannel(),
      removeChannel: vi.fn(),
    }),
  };
});

describe('usePresence', () => {
  beforeEach(() => {
    __resetSupabaseClientForTests();
    presenceState = {};
    syncHandler = null;
    trackCalls = [];
  });

  it('starts with an empty online set and not-connected', () => {
    const { result } = renderHook(() => usePresence(null, null));
    expect(result.current.onlinePlayerIds.size).toBe(0);
    expect(result.current.connected).toBe(false);
  });

  it('does nothing when roomId or selfPlayerId is null (no subscription)', () => {
    renderHook(() => usePresence(null, 'p1'));
    renderHook(() => usePresence('room-1', null));
    expect(syncHandler).toBeNull();
    expect(trackCalls).toEqual([]);
  });

  it('subscribes, tracks self, and reflects connect status', async () => {
    const { result } = renderHook(() => usePresence('room-1', 'p1'));
    await waitFor(() => {
      expect(result.current.connected).toBe(true);
    });
    // Self-presence broadcast happened.
    expect(trackCalls).toHaveLength(1);
    expect(trackCalls[0]?.playerId).toBe('p1');
  });

  it('updates onlinePlayerIds on a presence sync event', async () => {
    const { result } = renderHook(() => usePresence('room-1', 'p1'));
    await waitFor(() => {
      expect(result.current.connected).toBe(true);
    });

    // Two players present, each with one tab.
    presenceState = {
      p1: [{ playerId: 'p1', joinedAt: 't1' }],
      p2: [{ playerId: 'p2', joinedAt: 't2' }],
    };
    act(() => {
      syncHandler?.();
    });
    expect(result.current.onlinePlayerIds.has('p1')).toBe(true);
    expect(result.current.onlinePlayerIds.has('p2')).toBe(true);
    expect(result.current.onlinePlayerIds.size).toBe(2);
  });

  it('collapses multiple metas under the same playerId to one entry', async () => {
    const { result } = renderHook(() => usePresence('room-1', 'p1'));
    await waitFor(() => expect(result.current.connected).toBe(true));

    presenceState = {
      p1: [
        { playerId: 'p1', joinedAt: 't1' },
        { playerId: 'p1', joinedAt: 't2' }, // same player, two tabs
      ],
    };
    act(() => {
      syncHandler?.();
    });
    expect(result.current.onlinePlayerIds.size).toBe(1);
    expect(result.current.onlinePlayerIds.has('p1')).toBe(true);
  });

  it('drops a player from the online set when they leave (sync diff)', async () => {
    const { result } = renderHook(() => usePresence('room-1', 'p1'));
    await waitFor(() => expect(result.current.connected).toBe(true));

    // Both online.
    presenceState = {
      p1: [{ playerId: 'p1', joinedAt: 't' }],
      p2: [{ playerId: 'p2', joinedAt: 't' }],
    };
    act(() => syncHandler?.());
    expect(result.current.onlinePlayerIds.size).toBe(2);

    // p2 disappears.
    presenceState = {
      p1: [{ playerId: 'p1', joinedAt: 't' }],
    };
    act(() => syncHandler?.());
    expect(result.current.onlinePlayerIds.has('p2')).toBe(false);
    expect(result.current.onlinePlayerIds.size).toBe(1);
  });
});
