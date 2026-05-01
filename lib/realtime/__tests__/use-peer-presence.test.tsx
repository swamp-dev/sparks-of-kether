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
    // the first one should reach `channel.send`.
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
