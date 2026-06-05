'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameState } from '@/engine/types';
import type { SefirahKey } from '@/data';

export type PeerEventKind = 'turn-start' | 'move' | 'encounter' | 'meditate';

export interface PeerEvent {
  readonly kind: PeerEventKind;
  readonly playerName: string;
  /** Sefirah where the event occurred — present for move and encounter. */
  readonly sefirahKey?: SefirahKey;
  readonly ts: number;
}

/**
 * Numeric priority for debouncing rapid events. Higher wins.
 * When move → encounter happen within the debounce window, only
 * encounter surfaces.
 */
export const PEER_EVENT_PRIORITY: Record<PeerEventKind, number> = {
  encounter: 4,
  move: 3,
  meditate: 2,
  'turn-start': 1,
};

const DEBOUNCE_MS = 400;
const AUTO_DISMISS_MS = 5000;

/**
 * Pure diff: given two consecutive GameState snapshots, return the
 * single most-significant peer event that occurred, or null.
 *
 * Priority order: encounter > move > meditate > turn-start.
 * Turn-start is treated specially: it fires when activePlayerId
 * changes (which resets the per-turn signals); it is returned
 * regardless of priority ordering when it is the only detectable
 * change but is overridden by encounter/move/meditate if those also
 * changed in the same diff.
 */
export function diffPeerEvent(prev: GameState, next: GameState): PeerEvent | null {
  const now = Date.now();

  const activePlayer = next.players.find((p) => p.id === next.activePlayerId);
  if (!activePlayer) return null;

  const prevActivePlayer = prev.players.find((p) => p.id === next.activePlayerId);

  // Turn rotation — only possible change is a new activePlayerId.
  const turnRotated = prev.activePlayerId !== next.activePlayerId;

  // Check for higher-priority events within the same turn.
  if (!turnRotated) {
    // Encounter: phase just entered 'challenge'
    if (next.phase === 'challenge' && prev.phase !== 'challenge') {
      const sefirahKey = next.encounter?.sefirah;
      return {
        kind: 'encounter',
        playerName: activePlayer.name,
        ...(sefirahKey !== undefined && { sefirahKey }),
        ts: now,
      };
    }

    // Move: active player's position changed
    if (prevActivePlayer && prevActivePlayer.position !== activePlayer.position) {
      return {
        kind: 'move',
        playerName: activePlayer.name,
        sefirahKey: activePlayer.position,
        ts: now,
      };
    }

    // Meditate: meditatedThisTurn just became true
    if (next.meditatedThisTurn === true && prev.meditatedThisTurn !== true) {
      return { kind: 'meditate', playerName: activePlayer.name, ts: now };
    }
  }

  if (turnRotated) {
    return { kind: 'turn-start', playerName: activePlayer.name, ts: now };
  }

  return null;
}

/**
 * Debounced peer-event hook for non-active multiplayer players.
 *
 * Watches the game state for peer events (turn rotation, move,
 * encounter, meditate) and surfaces the single highest-priority
 * event within a DEBOUNCE_MS window. Auto-dismisses after
 * AUTO_DISMISS_MS.
 *
 * Only active when `isMultiplayer` is true and `currentPlayerId`
 * identifies a non-active seat. Returns null in hot-seat mode.
 */
export function usePeerEvents(
  state: GameState | null,
  currentPlayerId: string | undefined,
  isMultiplayer: boolean,
): PeerEvent | null {
  const prevRef = useRef<GameState | null>(null);
  const pendingRef = useRef<PeerEvent | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState<PeerEvent | null>(null);

  useEffect(() => {
    if (!isMultiplayer || state === null) {
      prevRef.current = state;
      return;
    }

    const prev = prevRef.current;
    prevRef.current = state;

    if (prev === null) return;

    // Active player sees overlays, not toasts — skip their own events.
    if (currentPlayerId !== undefined && currentPlayerId === state.activePlayerId) {
      return;
    }

    const event = diffPeerEvent(prev, state);
    if (!event) return;

    // Debounce: accumulate within the window; keep highest priority.
    const current = pendingRef.current;
    if (
      current === null ||
      PEER_EVENT_PRIORITY[event.kind] > PEER_EVENT_PRIORITY[current.kind]
    ) {
      pendingRef.current = event;
    }

    if (debounceTimer.current !== null) return;

    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      const toShow = pendingRef.current;
      pendingRef.current = null;
      if (toShow) setVisible(toShow);
    }, DEBOUNCE_MS);
  }, [state, currentPlayerId, isMultiplayer]);

  // Auto-dismiss
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(null), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  return visible;
}
