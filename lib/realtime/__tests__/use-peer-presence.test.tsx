import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { usePeerPresence } from '../use-peer-presence';
import { __resetSupabaseClientForTests } from '../../supabase';
import type * as SupabaseModule from '../../supabase';

/**
 * Hook-level tests for #322. Pins the throttle behaviour + the basic
 * subscribe/track lifecycle. The pure parsers + observable are covered
 * by `presence.test.ts`.
 */

interface FakeChannel {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  fireBroadcast: (event: string, payload: unknown) => void;
}

let channel: FakeChannel | null = null;
let sendCalls: { event: string; payload: unknown }[] = [];

function makeFakeChannel(): FakeChannel {
  const handlers = new Map<string, (payload: unknown) => void>();
  const ch: FakeChannel = {
    on: vi.fn(function (
      this: FakeChannel,
      _scope: string,
      filter: { event?: string },
      handler: (payload: unknown) => void,
    ) {
      if (filter.event) handlers.set(filter.event, handler);
      return this;
    }),
    subscribe: vi.fn(function (
      this: FakeChannel,
      cb: (status: string) => void,
    ) {
      // Defer so the React effect can settle.
      setTimeout(() => cb('SUBSCRIBED'), 0);
      return this;
    }),
    send: vi.fn(async (msg: { event: string; payload: unknown }) => {
      sendCalls.push({ event: msg.event, payload: msg.payload });
      return 'ok';
    }),
    fireBroadcast(event, payload) {
      handlers.get(event)?.(payload);
    },
  };
  channel = ch;
  return ch;
}

vi.mock('../../supabase', async (importActual) => {
  const actual = await importActual<typeof SupabaseModule>();
  return {
    ...actual,
    getSupabaseBrowserClient: () => ({
      channel: () => makeFakeChannel(),
      removeChannel: vi.fn(),
    }),
  };
});

describe('usePeerPresence', () => {
  beforeEach(() => {
    __resetSupabaseClientForTests();
    channel = null;
    sendCalls = [];
  });

  it('subscribes when both roomId and selfPlayerId are non-null', async () => {
    const { result } = renderHook(() => usePeerPresence('room-1', 'p1'));
    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });
    expect(channel).not.toBeNull();
  });

  it('does nothing when roomId or selfPlayerId is null', () => {
    renderHook(() => usePeerPresence(null, 'p1'));
    expect(channel).toBeNull();
  });

  it('routes a broadcast cursor into the cursors map', async () => {
    const { result } = renderHook(() => usePeerPresence('room-1', 'p1'));
    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });
    act(() => {
      channel?.fireBroadcast('cursor', {
        payload: {
          playerId: 'p2',
          x: 0.5,
          y: 0.5,
          viewport: { w: 1024, h: 768 },
          ts: 1,
        },
      });
    });
    expect(result.current.cursors.get('p2')).toBeDefined();
    expect(result.current.cursors.get('p2')?.x).toBe(0.5);
  });

  it('throttles cursor sends so a burst goes out at most once per window', async () => {
    const { result } = renderHook(() => usePeerPresence('room-1', 'p1'));
    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });
    // Burst — three samples in quick succession.
    act(() => {
      result.current.sendCursor({
        x: 0.1,
        y: 0.1,
        viewport: { w: 100, h: 100 },
      });
      result.current.sendCursor({
        x: 0.2,
        y: 0.2,
        viewport: { w: 100, h: 100 },
      });
      result.current.sendCursor({
        x: 0.3,
        y: 0.3,
        viewport: { w: 100, h: 100 },
      });
    });
    // Allow the send promises to settle.
    await Promise.resolve();
    // The throttle helper drops samples within the 30Hz window — only
    // the first one should reach `channel.send`. (Trailing-edge emit
    // for the dropped samples is covered by the next test.)
    expect(sendCalls.filter((c) => c.event === 'cursor')).toHaveLength(1);
  });

  it('emits a trailing-edge sample after a burst stops (#356)', async () => {
    // The Figma-style trailing-edge contract: when the user drags
    // through the throttle window and stops, the LAST dropped sample
    // fires after the window expires so peers see the resting
    // position, not the position 33ms before the user stopped.
    const { result } = renderHook(() => usePeerPresence('room-1', 'p1'));
    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });

    // Burst of three samples — leading-edge fires immediately;
    // 2nd and 3rd are throttled but the 3rd is queued for trailing.
    act(() => {
      result.current.sendCursor({ x: 0.1, y: 0.1, viewport: { w: 100, h: 100 } });
      result.current.sendCursor({ x: 0.2, y: 0.2, viewport: { w: 100, h: 100 } });
      result.current.sendCursor({ x: 0.3, y: 0.3, viewport: { w: 100, h: 100 } });
    });
    await Promise.resolve();
    expect(sendCalls.filter((c) => c.event === 'cursor')).toHaveLength(1);

    // Wait past the throttle window. 30Hz cap is ~33ms; 80ms gives
    // a comfortable margin for the queued trailing sample to fire.
    await new Promise((r) => setTimeout(r, 80));

    const cursorCalls = sendCalls.filter((c) => c.event === 'cursor');
    expect(cursorCalls).toHaveLength(2);
    // Leading was the FIRST sample (0.1); trailing is the LAST (0.3).
    expect((cursorCalls[0]?.payload as { x: number }).x).toBe(0.1);
    expect((cursorCalls[1]?.payload as { x: number }).x).toBe(0.3);
  });

  it('does NOT double-emit when only one sample landed in the window (#356)', async () => {
    // If a single sample lands in the window with no follow-up, only
    // the leading-edge emit fires — the trailing timer must be a
    // no-op when there's nothing queued.
    const { result } = renderHook(() => usePeerPresence('room-1', 'p1'));
    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });

    act(() => {
      result.current.sendCursor({ x: 0.5, y: 0.5, viewport: { w: 100, h: 100 } });
    });
    await Promise.resolve();
    expect(sendCalls.filter((c) => c.event === 'cursor')).toHaveLength(1);

    await new Promise((r) => setTimeout(r, 80));
    // No trailing emit — the leading-edge sample WAS the last one.
    expect(sendCalls.filter((c) => c.event === 'cursor')).toHaveLength(1);
  });

  it('cancels the pending trailing-edge timer on unmount (#356)', async () => {
    const { result, unmount } = renderHook(() => usePeerPresence('room-1', 'p1'));
    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });

    // Burst that queues a trailing sample.
    act(() => {
      result.current.sendCursor({ x: 0.1, y: 0.1, viewport: { w: 100, h: 100 } });
      result.current.sendCursor({ x: 0.9, y: 0.9, viewport: { w: 100, h: 100 } });
    });
    await Promise.resolve();
    expect(sendCalls.filter((c) => c.event === 'cursor')).toHaveLength(1);

    unmount();

    // Wait past the throttle window. The trailing-edge timer should
    // have been cancelled at unmount; no late send.
    // (Pin the absolute count here — a `=== beforeUnmount` snapshot
    // would silently pass if the trailing-edge had fired before
    // unmount due to scheduler jitter.)
    await new Promise((r) => setTimeout(r, 80));
    expect(sendCalls.filter((c) => c.event === 'cursor')).toHaveLength(1);
  });

  it('forwards sendTarget to the channel as a target broadcast', async () => {
    const { result } = renderHook(() => usePeerPresence('room-1', 'p1'));
    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });
    act(() => {
      result.current.sendTarget('tiferet');
    });
    await Promise.resolve();
    const targetCall = sendCalls.find((c) => c.event === 'target');
    expect(targetCall).toBeDefined();
    expect((targetCall?.payload as { nodeId: string }).nodeId).toBe('tiferet');
  });

  it('forwards sendAction to the channel as an action broadcast', async () => {
    const { result } = renderHook(() => usePeerPresence('room-1', 'p1'));
    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });
    act(() => {
      result.current.sendAction('choosing-card');
    });
    await Promise.resolve();
    const actionCall = sendCalls.find((c) => c.event === 'action');
    expect(actionCall).toBeDefined();
    expect((actionCall?.payload as { kind: string }).kind).toBe('choosing-card');
  });
});
