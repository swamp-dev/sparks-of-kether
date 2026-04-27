import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  computeGraceState,
  GRACE_PERIOD_MS,
  useDisconnectGrace,
} from '../grace';

const t0 = 1_700_000_000_000;

describe('computeGraceState', () => {
  it('returns "connected" when the active player is online', () => {
    const result = computeGraceState({
      activePlayerId: 'p1',
      onlinePlayerIds: new Set(['p1', 'p2']),
      activeOfflineSince: null,
      now: t0,
    });
    expect(result.phase).toBe('connected');
    expect(result.remainingMs).toBe(0);
  });

  it('returns "grace" with countdown while the active player is offline within the window', () => {
    const result = computeGraceState({
      activePlayerId: 'p1',
      onlinePlayerIds: new Set(['p2']),
      activeOfflineSince: t0,
      now: t0 + 10_000,
    });
    expect(result.phase).toBe('grace');
    expect(result.remainingMs).toBe(GRACE_PERIOD_MS - 10_000);
  });

  it('returns "expired" once the grace window has passed', () => {
    const result = computeGraceState({
      activePlayerId: 'p1',
      onlinePlayerIds: new Set(['p2']),
      activeOfflineSince: t0,
      now: t0 + GRACE_PERIOD_MS + 1,
    });
    expect(result.phase).toBe('expired');
    expect(result.remainingMs).toBe(0);
  });

  it('boundary: at exactly grace window end, phase is still "grace" with 0 remaining', () => {
    // Inclusive boundary: the grace tick fires *after* exceeding the
    // window so a 60.000s tick is still in-grace, 60.001s is expired.
    const result = computeGraceState({
      activePlayerId: 'p1',
      onlinePlayerIds: new Set(['p2']),
      activeOfflineSince: t0,
      now: t0 + GRACE_PERIOD_MS,
    });
    expect(result.phase).toBe('grace');
    expect(result.remainingMs).toBe(0);
  });

  it('treats a non-active player going offline as "connected" — only the active player triggers grace', () => {
    // Per design: "pause game if it was that players turn". Other
    // players' disconnects are visible (the indicator shows the dot)
    // but don't pause anything.
    const result = computeGraceState({
      activePlayerId: 'p1',
      onlinePlayerIds: new Set(['p1']), // p2 is offline, p1 active
      activeOfflineSince: null,
      now: t0,
    });
    expect(result.phase).toBe('connected');
  });

  it('returns "connected" with cleared offline timestamp once the active player reappears', () => {
    // Caller is responsible for nulling out activeOfflineSince when
    // the player reconnects; this test asserts the function honors
    // that input — if active is back online, grace is reset
    // regardless of what activeOfflineSince says.
    const result = computeGraceState({
      activePlayerId: 'p1',
      onlinePlayerIds: new Set(['p1', 'p2']),
      activeOfflineSince: t0, // stale value
      now: t0 + 30_000,
    });
    expect(result.phase).toBe('connected');
  });
});

describe('useDisconnectGrace — wiring', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(t0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports connected while the active player is in the online set', () => {
    const { result } = renderHook(() =>
      useDisconnectGrace({
        activePlayerId: 'p1',
        onlinePlayerIds: new Set(['p1', 'p2']),
      }),
    );
    expect(result.current.phase).toBe('connected');
  });

  it('enters grace when the active player drops, then expires after the window', () => {
    const initial = new Set(['p1', 'p2']);
    const { result, rerender } = renderHook(
      ({ online }: { online: ReadonlySet<string> }) =>
        useDisconnectGrace({ activePlayerId: 'p1', onlinePlayerIds: online }),
      { initialProps: { online: initial } },
    );
    expect(result.current.phase).toBe('connected');

    // p1 drops off presence.
    rerender({ online: new Set(['p2']) });
    expect(result.current.phase).toBe('grace');

    // Advance past the grace window.
    act(() => {
      vi.advanceTimersByTime(GRACE_PERIOD_MS + 1_000);
    });
    expect(result.current.phase).toBe('expired');
  });

  it('clears the grace state if the active player reconnects within the window', () => {
    const { result, rerender } = renderHook(
      ({ online }: { online: ReadonlySet<string> }) =>
        useDisconnectGrace({ activePlayerId: 'p1', onlinePlayerIds: online }),
      { initialProps: { online: new Set(['p1']) as ReadonlySet<string> } },
    );
    rerender({ online: new Set(['p2']) }); // p1 drops
    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.phase).toBe('grace');

    rerender({ online: new Set(['p1', 'p2']) }); // p1 returns
    expect(result.current.phase).toBe('connected');
  });
});
