import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  parseCursorEvent,
  parseTargetEvent,
  parseActionEvent,
  shouldThrottleCursor,
  peerPresenceSubscription,
  type PeerPresenceStatus,
  type PeerCursorEvent,
  type PeerTargetEvent,
  type PeerActionEvent,
} from '../presence';

/**
 * Tests for the ephemeral peer-presence layer (#322): cursor + target +
 * action broadcasts. Pure parsing/throttle helpers + the Supabase
 * channel observable. The React adapter (`usePeerPresence`) is tested
 * via component tests; this file pins the wire-format contract and the
 * channel-status branches.
 */

describe('shouldThrottleCursor', () => {
  it('lets the first sample through (no last sample)', () => {
    expect(shouldThrottleCursor(1000, null, 30)).toBe(false);
  });

  it('drops samples that arrive within the throttle window', () => {
    // 30Hz → ~33ms window. Two samples 10ms apart: drop the second.
    expect(shouldThrottleCursor(1010, 1000, 30)).toBe(true);
  });

  it('lets samples through past the throttle window', () => {
    expect(shouldThrottleCursor(1040, 1000, 30)).toBe(false);
  });

  it('respects the reduce-motion 4Hz cap', () => {
    // 4Hz → 250ms window. 100ms apart = throttled; 300ms apart = ok.
    expect(shouldThrottleCursor(1100, 1000, 4)).toBe(true);
    expect(shouldThrottleCursor(1300, 1000, 4)).toBe(false);
  });
});

describe('parseCursorEvent', () => {
  it('accepts a well-formed cursor payload', () => {
    const result = parseCursorEvent({
      playerId: 'p1',
      x: 0.5,
      y: 0.5,
      viewport: { w: 1024, h: 768 },
      ts: 1730000000,
    });
    expect(result).not.toBeNull();
    expect(result?.x).toBe(0.5);
    expect(result?.viewport.w).toBe(1024);
  });

  it('rejects missing fields', () => {
    expect(parseCursorEvent({ x: 0.5 })).toBeNull();
    expect(parseCursorEvent(null)).toBeNull();
    expect(parseCursorEvent('not-an-object')).toBeNull();
  });

  it('rejects out-of-range normalized coordinates', () => {
    // Coordinates are normalized 0..1 — anything outside is suspect.
    expect(
      parseCursorEvent({
        playerId: 'p1',
        x: 2,
        y: 0.5,
        viewport: { w: 100, h: 100 },
        ts: 0,
      }),
    ).toBeNull();
    expect(
      parseCursorEvent({
        playerId: 'p1',
        x: -0.1,
        y: 0.5,
        viewport: { w: 100, h: 100 },
        ts: 0,
      }),
    ).toBeNull();
  });

  it('does not accept extra/PII fields — only the documented shape', () => {
    // Acceptance criterion: "no payload fields beyond the spec (no PII
    // leak)". Parser strips down to the canonical shape so any caller
    // that re-broadcasts a parsed event cannot leak fields a sender
    // accidentally added.
    const parsed = parseCursorEvent({
      playerId: 'p1',
      x: 0.5,
      y: 0.5,
      viewport: { w: 100, h: 100 },
      ts: 0,
      ipAddress: '192.0.2.1',
      email: 'leak@example.com',
    });
    expect(parsed).not.toBeNull();
    expect(parsed && Object.keys(parsed).sort()).toEqual([
      'playerId',
      'ts',
      'viewport',
      'x',
      'y',
    ]);
  });
});

describe('parseTargetEvent', () => {
  it('accepts a Sefirah-key target', () => {
    const parsed = parseTargetEvent({
      playerId: 'p1',
      nodeId: 'tiferet',
      ts: 0,
    });
    expect(parsed?.nodeId).toBe('tiferet');
  });

  it('accepts a null target (peer cleared focus)', () => {
    const parsed = parseTargetEvent({ playerId: 'p1', nodeId: null, ts: 0 });
    expect(parsed?.nodeId).toBeNull();
  });

  it('rejects non-Sefirah node ids', () => {
    expect(
      parseTargetEvent({ playerId: 'p1', nodeId: 'not-a-sefirah', ts: 0 }),
    ).toBeNull();
  });

  it('strips PII fields beyond the documented shape', () => {
    const parsed = parseTargetEvent({
      playerId: 'p1',
      nodeId: 'tiferet',
      ts: 0,
      sessionToken: 'sneaky-secret',
    });
    expect(parsed).not.toBeNull();
    expect(parsed && Object.keys(parsed).sort()).toEqual([
      'nodeId',
      'playerId',
      'ts',
    ]);
  });
});

describe('parseActionEvent', () => {
  it('accepts a known action kind', () => {
    const parsed = parseActionEvent({
      playerId: 'p1',
      kind: 'choosing-card',
      ts: 0,
    });
    expect(parsed?.kind).toBe('choosing-card');
  });

  it('accepts an idle action (clearing the toast)', () => {
    const parsed = parseActionEvent({ playerId: 'p1', kind: null, ts: 0 });
    expect(parsed?.kind).toBeNull();
  });

  it('rejects unknown action kinds', () => {
    expect(
      parseActionEvent({ playerId: 'p1', kind: 'unrelated-string', ts: 0 }),
    ).toBeNull();
  });
});

interface FakeChannel {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  fireBroadcast: (event: string, payload: unknown) => void;
  fireStatus: (status: string) => void;
}

let channel: FakeChannel;
let removeChannelCalls = 0;

function makeFakeClient(): SupabaseClient {
  // The fake captures every `.on('broadcast', { event }, handler)` call
  // and exposes a single `fireBroadcast` so a test can synthesise an
  // event arriving on the channel.
  const handlers = new Map<string, (payload: unknown) => void>();
  let statusHandler: ((status: string) => void) | null = null;

  channel = {
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
      statusHandler = cb;
      return this;
    }),
    send: vi.fn(async () => 'ok'),
    fireBroadcast(event, payload) {
      handlers.get(event)?.(payload);
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

describe('peerPresenceSubscription', () => {
  beforeEach(() => {
    removeChannelCalls = 0;
  });

  it('connects and reports SUBSCRIBED via onStatus', () => {
    const client = makeFakeClient();
    const sub = peerPresenceSubscription(client, 'room-1', 'p1');
    const onStatus = vi.fn<(s: PeerPresenceStatus) => void>();
    sub.subscribe({
      onCursor: vi.fn(),
      onTarget: vi.fn(),
      onAction: vi.fn(),
      onStatus,
    });
    channel.fireStatus('SUBSCRIBED');
    expect(onStatus).toHaveBeenCalledWith('connected');
  });

  it('routes cursor broadcasts to onCursor (parsed shape)', () => {
    const client = makeFakeClient();
    const sub = peerPresenceSubscription(client, 'room-1', 'p1');
    const onCursor = vi.fn<(e: PeerCursorEvent) => void>();
    sub.subscribe({
      onCursor,
      onTarget: vi.fn(),
      onAction: vi.fn(),
      onStatus: vi.fn(),
    });
    channel.fireBroadcast('cursor', {
      payload: {
        playerId: 'p2',
        x: 0.4,
        y: 0.6,
        viewport: { w: 1024, h: 768 },
        ts: 1,
      },
    });
    expect(onCursor).toHaveBeenCalledTimes(1);
    expect(onCursor.mock.calls[0]?.[0].playerId).toBe('p2');
  });

  it('drops cursor broadcasts that originate from self', () => {
    const client = makeFakeClient();
    const sub = peerPresenceSubscription(client, 'room-1', 'p1');
    const onCursor = vi.fn<(e: PeerCursorEvent) => void>();
    sub.subscribe({
      onCursor,
      onTarget: vi.fn(),
      onAction: vi.fn(),
      onStatus: vi.fn(),
    });
    channel.fireBroadcast('cursor', {
      payload: {
        playerId: 'p1',
        x: 0.4,
        y: 0.6,
        viewport: { w: 100, h: 100 },
        ts: 1,
      },
    });
    expect(onCursor).not.toHaveBeenCalled();
  });

  it('routes target broadcasts to onTarget', () => {
    const client = makeFakeClient();
    const sub = peerPresenceSubscription(client, 'room-1', 'p1');
    const onTarget = vi.fn<(e: PeerTargetEvent) => void>();
    sub.subscribe({
      onCursor: vi.fn(),
      onTarget,
      onAction: vi.fn(),
      onStatus: vi.fn(),
    });
    channel.fireBroadcast('target', {
      payload: { playerId: 'p2', nodeId: 'tiferet', ts: 1 },
    });
    expect(onTarget).toHaveBeenCalledWith(
      expect.objectContaining({ nodeId: 'tiferet', playerId: 'p2' }),
    );
  });

  it('routes action broadcasts to onAction', () => {
    const client = makeFakeClient();
    const sub = peerPresenceSubscription(client, 'room-1', 'p1');
    const onAction = vi.fn<(e: PeerActionEvent) => void>();
    sub.subscribe({
      onCursor: vi.fn(),
      onTarget: vi.fn(),
      onAction,
      onStatus: vi.fn(),
    });
    channel.fireBroadcast('action', {
      payload: { playerId: 'p2', kind: 'choosing-card', ts: 1 },
    });
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'choosing-card', playerId: 'p2' }),
    );
  });

  it('silently drops malformed broadcasts (no throw)', () => {
    const client = makeFakeClient();
    const sub = peerPresenceSubscription(client, 'room-1', 'p1');
    const onCursor = vi.fn<(e: PeerCursorEvent) => void>();
    sub.subscribe({
      onCursor,
      onTarget: vi.fn(),
      onAction: vi.fn(),
      onStatus: vi.fn(),
    });
    expect(() =>
      channel.fireBroadcast('cursor', { payload: { x: 'bad' } }),
    ).not.toThrow();
    expect(onCursor).not.toHaveBeenCalled();
  });

  it('sendCursor / sendTarget / sendAction call channel.send with the canonical event names', async () => {
    const client = makeFakeClient();
    const sub = peerPresenceSubscription(client, 'room-1', 'p1');
    sub.subscribe({
      onCursor: vi.fn(),
      onTarget: vi.fn(),
      onAction: vi.fn(),
      onStatus: vi.fn(),
    });
    channel.fireStatus('SUBSCRIBED');

    await sub.sendCursor({
      x: 0.1,
      y: 0.2,
      viewport: { w: 100, h: 100 },
    });
    expect(channel.send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'broadcast', event: 'cursor' }),
    );

    await sub.sendTarget({ nodeId: 'tiferet' });
    expect(channel.send).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'broadcast', event: 'target' }),
    );

    await sub.sendAction({ kind: 'choosing-card' });
    expect(channel.send).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'broadcast', event: 'action' }),
    );
  });

  it('unsubscribe() removes the channel', () => {
    const client = makeFakeClient();
    const sub = peerPresenceSubscription(client, 'room-1', 'p1');
    const unsubscribe = sub.subscribe({
      onCursor: vi.fn(),
      onTarget: vi.fn(),
      onAction: vi.fn(),
      onStatus: vi.fn(),
    });
    expect(removeChannelCalls).toBe(0);
    unsubscribe();
    expect(removeChannelCalls).toBe(1);
  });

  it('unsubscribe() is idempotent', () => {
    const client = makeFakeClient();
    const sub = peerPresenceSubscription(client, 'room-1', 'p1');
    const unsubscribe = sub.subscribe({
      onCursor: vi.fn(),
      onTarget: vi.fn(),
      onAction: vi.fn(),
      onStatus: vi.fn(),
    });
    unsubscribe();
    unsubscribe();
    expect(removeChannelCalls).toBe(1);
  });

  it('post-unsubscribe broadcasts do not fire callbacks', () => {
    const client = makeFakeClient();
    const sub = peerPresenceSubscription(client, 'room-1', 'p1');
    const onCursor = vi.fn<(e: PeerCursorEvent) => void>();
    const unsubscribe = sub.subscribe({
      onCursor,
      onTarget: vi.fn(),
      onAction: vi.fn(),
      onStatus: vi.fn(),
    });
    unsubscribe();
    channel.fireBroadcast('cursor', {
      payload: {
        playerId: 'p2',
        x: 0.5,
        y: 0.5,
        viewport: { w: 100, h: 100 },
        ts: 0,
      },
    });
    expect(onCursor).not.toHaveBeenCalled();
  });
});
