import type { Pillar } from '@/data';
import type { GameEvent } from './events';
import { deltaFor } from './events';
import type { GameState, PillarStreakState } from './types';

/**
 * Number of consecutive same-pillar moves needed to trigger imbalance,
 * and the number of alternating Mercy↔Severity moves needed to trigger
 * equilibrium. Same threshold for both per `design/mechanics.md`.
 */
export const STREAK_THRESHOLD = 3;

// ──────────────── applyEvent / applyEvents ────────────────

/**
 * Single source of truth for counter mutations. Reducers should NEVER
 * write to `state.illumination` or `state.separation` directly; they
 * emit events and call this. That makes counter rules:
 *   - One place to audit.
 *   - Easy to test (just test the event → delta map).
 *   - Easy to extend (a new event variant + a new case in `deltaFor`).
 */
export function applyEvent(state: GameState, event: GameEvent): GameState {
  const delta = deltaFor(event);
  if (delta.illumination === 0 && delta.separation === 0) return state;
  return {
    ...state,
    illumination: state.illumination + delta.illumination,
    separation: state.separation + delta.separation,
  };
}

/** Fold a sequence of events. Returns the same state reference if the list is empty. */
export function applyEvents(state: GameState, events: readonly GameEvent[]): GameState {
  if (events.length === 0) return state;
  return events.reduce(applyEvent, state);
}

// ──────────────── recordPillarMove ────────────────

export interface PillarStreakResult {
  /**
   * The streak's new state — caller writes this back to
   * `GameState.pillarStreak`. The streak itself is not event-sourced;
   * only its counter side-effects flow through `applyEvent`.
   */
  readonly streak: PillarStreakState;
  /** Events emitted by this move (zero, one, or both stream-thresholds). */
  readonly events: readonly GameEvent[];
}

/**
 * Update the team's pillar-streak state for one move and emit any
 * threshold events. Pure — caller is responsible for writing the
 * returned `streak` back to state and folding the events through
 * `applyEvents`.
 *
 * Rules:
 *   - Balance moves are neutral. Streak is unchanged; no events.
 *   - Same-pillar move (Mercy→Mercy or Severity→Severity): `sameCount`
 *     increments, `alternationCount` resets to 0. At threshold, emit
 *     `pillar-streak-imbalance` and reset `sameCount` to 0 (NOT 1 —
 *     the triggering move is not counted toward the next streak).
 *   - Cross-pillar move (Mercy↔Severity): `alternationCount` increments,
 *     `sameCount` resets to 1 (the new move itself counts). At
 *     threshold, emit `pillar-streak-equilibrium` and reset
 *     `alternationCount` to 0.
 *   - First non-Balance move: both counters become 1.
 *
 * The two threshold checks are evaluated independently after the move,
 * so in a single call both could in principle fire — but per
 * construction, `sameCount` and `alternationCount` are mutually
 * exclusive on any one move (same-pillar resets alternation; cross-
 * pillar resets sameCount to 1). The dual-emission case is structurally
 * unreachable today; the dual checks remain as defensive code.
 */
export function recordPillarMove(streak: PillarStreakState, pillar: Pillar): PillarStreakResult {
  if (pillar === 'balance') return { streak, events: [] };

  let next: PillarStreakState;
  if (streak.currentPillar === null) {
    next = { currentPillar: pillar, sameCount: 1, alternationCount: 1 };
  } else if (streak.currentPillar === pillar) {
    next = {
      currentPillar: pillar,
      sameCount: streak.sameCount + 1,
      alternationCount: 0,
    };
  } else {
    next = {
      currentPillar: pillar,
      sameCount: 1,
      alternationCount: streak.alternationCount + 1,
    };
  }

  const events: GameEvent[] = [];
  if (next.sameCount >= STREAK_THRESHOLD) {
    events.push({ kind: 'pillar-streak-imbalance', pillar });
    next = { ...next, sameCount: 0 };
  }
  if (next.alternationCount >= STREAK_THRESHOLD) {
    events.push({ kind: 'pillar-streak-equilibrium' });
    next = { ...next, alternationCount: 0 };
  }

  return { streak: next, events };
}
