'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Grace-window length: how long after the active player drops we wait
 * before surfacing the "host can kick" affordance. Per ticket #36
 * acceptance criteria: 60s.
 */
export const GRACE_PERIOD_MS = 60_000;

/**
 * How often to re-evaluate the grace state while the active player is
 * disconnected. 1s gives a smooth countdown without burning cycles.
 */
const GRACE_TICK_MS = 1_000;

export type GracePhase = 'connected' | 'grace' | 'expired';

export interface GraceStateInput {
  /** Whose turn it currently is (from `state.activePlayerId`). */
  readonly activePlayerId: string;
  /** Player ids currently present on the room channel. */
  readonly onlinePlayerIds: ReadonlySet<string>;
  /**
   * Wall-clock timestamp (ms) when the active player was last seen
   * leaving presence; null while they're connected. The hook owns
   * this — the pure function just reads it.
   */
  readonly activeOfflineSince: number | null;
  /** Current wall-clock time (ms). Injected for testability. */
  readonly now: number;
}

export interface GraceState {
  readonly phase: GracePhase;
  /** Milliseconds left in the grace window; 0 once expired or connected. */
  readonly remainingMs: number;
}

/**
 * Pure: derive the disconnect-grace phase from current presence + a
 * monotonic clock. Owns no timers; the caller (a React hook) drives
 * `now` on a tick.
 *
 * Design intent (per `design/mechanics.md` is silent on disconnects;
 * this is a multiplayer-engineering rule, not a game rule):
 *   - If the active player is online → `connected`.
 *   - If the active player is offline within the grace window → `grace`.
 *   - If the active player has been offline past the window → `expired`.
 *
 * Non-active players going offline never trigger grace — the game
 * just shows a grey dot for them. Only the active player's drop
 * stalls the turn loop.
 */
export function computeGraceState(input: GraceStateInput): GraceState {
  const { activePlayerId, onlinePlayerIds, activeOfflineSince, now } = input;

  if (onlinePlayerIds.has(activePlayerId)) {
    return { phase: 'connected', remainingMs: 0 };
  }

  if (activeOfflineSince === null) {
    // Caller hasn't yet captured the offline moment — treat as
    // connected for one tick. The hook will set the timestamp on
    // the next presence diff.
    return { phase: 'connected', remainingMs: 0 };
  }

  const elapsed = now - activeOfflineSince;
  if (elapsed > GRACE_PERIOD_MS) {
    return { phase: 'expired', remainingMs: 0 };
  }
  return { phase: 'grace', remainingMs: GRACE_PERIOD_MS - elapsed };
}

export interface UseDisconnectGraceInput {
  readonly activePlayerId: string | null;
  readonly onlinePlayerIds: ReadonlySet<string>;
}

/**
 * React hook wrapping `computeGraceState` with timer management.
 *
 * Owns one piece of state — `activeOfflineSince` — set when the active
 * player drops from presence and cleared when they reappear or the
 * active id changes. A `setInterval` tick at `GRACE_TICK_MS` keeps the
 * countdown live; the interval auto-clears once we hit `expired` or
 * `connected` to avoid wasted renders.
 */
export function useDisconnectGrace(
  input: UseDisconnectGraceInput,
): GraceState {
  const { activePlayerId, onlinePlayerIds } = input;
  const [activeOfflineSince, setActiveOfflineSince] = useState<number | null>(
    null,
  );
  const [now, setNow] = useState(() => Date.now());
  // Keep the latest active id in a ref so the offline-detect effect
  // can compare without forcing a re-run dependency loop.
  const lastActiveRef = useRef<string | null>(activePlayerId);

  useEffect(() => {
    // Reset the timer if the active player rotates — a new player's
    // turn starts the grace clock fresh.
    if (lastActiveRef.current !== activePlayerId) {
      lastActiveRef.current = activePlayerId;
      setActiveOfflineSince(null);
    }
    if (activePlayerId === null) return;
    const isOnline = onlinePlayerIds.has(activePlayerId);
    if (isOnline) {
      // Reconnected (or was always online) — clear the timestamp.
      if (activeOfflineSince !== null) setActiveOfflineSince(null);
    } else if (activeOfflineSince === null) {
      setActiveOfflineSince(Date.now());
    }
  }, [activePlayerId, onlinePlayerIds, activeOfflineSince]);

  // Tick the clock while we're in grace. Self-stops on expiry from
  // INSIDE the callback — the effect's cleanup only runs when deps
  // change, but `setNow` doesn't change deps, so a guard at effect
  // setup time wouldn't catch the expiry boundary. The callback
  // checks each tick and clears its own interval when the window
  // has passed.
  useEffect(() => {
    if (activePlayerId === null) return;
    if (onlinePlayerIds.has(activePlayerId)) return;
    if (activeOfflineSince === null) return;
    if (Date.now() - activeOfflineSince > GRACE_PERIOD_MS) return;
    const id = setInterval(() => {
      const t = Date.now();
      if (t - activeOfflineSince > GRACE_PERIOD_MS) {
        clearInterval(id);
      }
      setNow(t);
    }, GRACE_TICK_MS);
    return () => clearInterval(id);
  }, [activePlayerId, onlinePlayerIds, activeOfflineSince]);

  return computeGraceState({
    activePlayerId: activePlayerId ?? '',
    onlinePlayerIds,
    activeOfflineSince,
    now,
  });
}

