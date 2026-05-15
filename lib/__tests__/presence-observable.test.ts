import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { presenceSubscription, type PresenceStatus } from '../presence-observable';

/**
 * Tests the pure presence subscription without React. The hook tests
 * (`presence.test.tsx`) cover the React adapter; this file covers the
 * channel-status branches + teardown that the hook tests would need
 * a `renderHook` harness to reach.
 */

interface FakeChannel {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  presenceState: ReturnType<typeof vi.fn>;
  track: ReturnType<typeof vi.fn>;
  untrack: ReturnType<typeof vi.fn>;
  /** Manually invoke the captured sync handler with a presence state. */
  fireSync: (state: Record<string, { playerId: string; joinedAt: string }[]>) => void;
  /** Manually invoke the captured subscribe callback with a status. */
  fireStatus: (status: string) => void;
}

let channel: FakeChannel;
let removeChannelCalls = 0;

function makeFakeClient(): SupabaseClient {
  let syncHandler: (() => void) | null = null;
  let statusHandler: ((status: string) => void) | null = null;
  let presenceStateValue: Record<string, { playerId: string; joinedAt: string }[]> = {};

  channel = {
    on: vi.fn(function (this: FakeChannel, _scope: string, _filter: unknown, handler: () => void) {
      syncHandler = handler;
      return this;
    }),
    subscribe: vi.fn(function (this: FakeChannel, cb: (status: string) => void) {
      statusHandler = cb;
      return this;
    }),
    presenceState: vi.fn(() => presenceStateValue),
    track: vi.fn(async () => 'ok'),
    untrack: vi.fn(async () => 'ok'),
    fireSync(state) {
      presenceStateValue = state;
      syncHandler?.();
    },
    fireStatus(status) {
      statusHandler?.(status);
    },
  };

  return {
    channel: () => channel,
    removeChannel: vi.fn(() => {
      removeChannelCalls += 1;
    }),
  } as unknown as SupabaseClient;
}

describe('presenceSubscription', () => {
  beforeEach(() => {
    removeChannelCalls = 0;
  });

  it('fires onStatus("connected") + tracks self when channel reaches SUBSCRIBED', () => {
    const client = makeFakeClient();
    const sub = presenceSubscription(client, 'room-1', 'p1');
    const onStatus = vi.fn<(s: PresenceStatus) => void>();
    sub.subscribe(vi.fn(), onStatus);
    channel.fireStatus('SUBSCRIBED');
    expect(onStatus).toHaveBeenCalledWith('connected');
    expect(channel.track).toHaveBeenCalledWith({
      playerId: 'p1',
      joinedAt: expect.any(String),
    });
  });

  it('maps CHANNEL_ERROR / TIMED_OUT / CLOSED to their status strings', () => {
    const client = makeFakeClient();
    const sub = presenceSubscription(client, 'room-1', 'p1');
    const onStatus = vi.fn<(s: PresenceStatus) => void>();
    sub.subscribe(vi.fn(), onStatus);

    channel.fireStatus('CHANNEL_ERROR');
    channel.fireStatus('TIMED_OUT');
    channel.fireStatus('CLOSED');

    expect(onStatus).toHaveBeenNthCalledWith(1, 'error');
    expect(onStatus).toHaveBeenNthCalledWith(2, 'timed-out');
    expect(onStatus).toHaveBeenNthCalledWith(3, 'closed');
  });

  it('onSnapshot receives the deduplicated playerId set on every sync', () => {
    const client = makeFakeClient();
    const sub = presenceSubscription(client, 'room-1', 'p1');
    const onSnapshot = vi.fn<(s: { onlinePlayerIds: ReadonlySet<string> }) => void>();
    sub.subscribe(onSnapshot, vi.fn());

    channel.fireSync({
      p1: [
        { playerId: 'p1', joinedAt: 't1' },
        { playerId: 'p1', joinedAt: 't2' }, // same player, two tabs
      ],
      p2: [{ playerId: 'p2', joinedAt: 't' }],
    });

    expect(onSnapshot).toHaveBeenCalledTimes(1);
    const snap = onSnapshot.mock.calls[0]?.[0];
    expect(snap?.onlinePlayerIds.size).toBe(2);
    expect(snap?.onlinePlayerIds.has('p1')).toBe(true);
    expect(snap?.onlinePlayerIds.has('p2')).toBe(true);
  });

  it('unsubscribe() calls untrack() and removeChannel() in order', () => {
    const client = makeFakeClient();
    const sub = presenceSubscription(client, 'room-1', 'p1');
    const unsubscribe = sub.subscribe(vi.fn(), vi.fn());

    expect(channel.untrack).not.toHaveBeenCalled();
    expect(removeChannelCalls).toBe(0);

    unsubscribe();

    expect(channel.untrack).toHaveBeenCalledTimes(1);
    expect(removeChannelCalls).toBe(1);
  });

  it('unsubscribe() is idempotent — calling twice does not double-tear-down', () => {
    const client = makeFakeClient();
    const sub = presenceSubscription(client, 'room-1', 'p1');
    const unsubscribe = sub.subscribe(vi.fn(), vi.fn());
    unsubscribe();
    unsubscribe();
    expect(channel.untrack).toHaveBeenCalledTimes(1);
    expect(removeChannelCalls).toBe(1);
  });

  it('onSnapshot does not fire after unsubscribe (cancelled-flag check)', () => {
    const client = makeFakeClient();
    const sub = presenceSubscription(client, 'room-1', 'p1');
    const onSnapshot = vi.fn<(s: { onlinePlayerIds: ReadonlySet<string> }) => void>();
    const unsubscribe = sub.subscribe(onSnapshot, vi.fn());

    unsubscribe();
    channel.fireSync({ p1: [{ playerId: 'p1', joinedAt: 't' }] });
    expect(onSnapshot).not.toHaveBeenCalled();
  });

  it('onStatus does not fire after unsubscribe', () => {
    const client = makeFakeClient();
    const sub = presenceSubscription(client, 'room-1', 'p1');
    const onStatus = vi.fn<(s: PresenceStatus) => void>();
    const unsubscribe = sub.subscribe(vi.fn(), onStatus);

    unsubscribe();
    channel.fireStatus('CHANNEL_ERROR');
    expect(onStatus).not.toHaveBeenCalled();
  });
});
