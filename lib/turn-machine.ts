import { sefirahByKey } from '@/data';
import type { SefirahKey } from '@/data';
import { applyMove } from '@/engine/movement';
import {
  acceptSetback,
  resolveChallenge,
  type ChallengeRejection,
  type ChallengeSuccess,
  type CheckModifiers,
  type CheckOutcome,
} from '@/engine/checks';
import type { Rng } from '@/engine/rng';
import { endTurn as endTurnReducer } from '@/engine/turn';
import type { GameState, MoveRejection, Result } from '@/engine/types';

/**
 * Pure turn-loop state machine.
 *
 * Extracted from `lib/use-turn.ts` per #106. The hook is now a thin
 * React adapter (`useReducer`-style) that calls into this module;
 * properties and unit tests can exercise the phase-transition logic
 * without a `renderHook` harness.
 *
 * Phase contract:
 *   move      — player can `move` (apply path) or `meditate`.
 *   challenge — entered after `move` lands on an uncleared `'check'`
 *               Sefirah. Player resolves via `submit-challenge` (pass
 *               or fail with retries) or `accept-setback`.
 *   draw      — refill toward `STARTING_HAND_SIZE`, capped at `HAND_CAP`,
 *               recycling the discard pile if the deck is empty.
 *   end       — advance to next player; phase resets to `move`.
 *
 * The reducer is fully deterministic: same `(snapshot, event, rng)`
 * always produces the same output. RNG is consumed only by the
 * challenge resolver when no pre-rolled `outcome` is supplied.
 */

export type TurnPhase = 'move' | 'challenge' | 'draw' | 'end';

export const STARTING_HAND_SIZE = 4;
export const HAND_CAP = 6;

export interface TurnSnapshot {
  readonly state: GameState;
  readonly phase: TurnPhase;
}

export type TurnEvent =
  | { readonly kind: 'move'; readonly pathNumber: number }
  | { readonly kind: 'meditate' }
  | {
      readonly kind: 'submit-challenge';
      readonly sefirah: SefirahKey;
      readonly modifiers: CheckModifiers;
      readonly outcome?: CheckOutcome;
    }
  | {
      readonly kind: 'accept-setback';
      readonly sefirah: SefirahKey;
      readonly shortcut?: boolean;
    }
  | { readonly kind: 'draw' }
  | { readonly kind: 'end-turn' }
  | { readonly kind: 'replace-state'; readonly state: GameState };

export type TurnReducerError =
  | { readonly kind: 'wrong-phase'; readonly expected: TurnPhase; readonly actual: TurnPhase }
  | { readonly kind: 'no-active-player' }
  | { readonly kind: 'move-rejected'; readonly cause: MoveRejection }
  | { readonly kind: 'challenge-rejected'; readonly cause: ChallengeRejection };

export interface TurnReducerSuccess {
  readonly next: TurnSnapshot;
  /**
   * Event-specific outcome data. Populated only when the event
   * produces it — currently `submit-challenge` returns the
   * `ChallengeSuccess` payload so callers can inspect the d20
   * outcome.
   */
  readonly meta?: { readonly challenge: ChallengeSuccess };
}

export type TurnReducerResult = Result<TurnReducerSuccess, TurnReducerError>;

function activePlayer(state: GameState) {
  return state.players.find((p) => p.id === state.activePlayerId);
}

/**
 * Compute the `next` `TurnSnapshot` for an event applied to the
 * current `snapshot`, OR a structured rejection. The hook commits
 * `next` to React state on success.
 */
export function turnReducer(
  snapshot: TurnSnapshot,
  event: TurnEvent,
  rng: Rng,
): TurnReducerResult {
  const { state, phase } = snapshot;

  if (event.kind === 'replace-state') {
    // Force-replace: used when an external action (multiplayer
    // server push) mutates state out-of-band. Phase is preserved
    // since the external action does not know about phase.
    return { ok: true, value: { next: { state: event.state, phase } } };
  }

  const player = activePlayer(state);
  if (!player) {
    return { ok: false, reason: { kind: 'no-active-player' } };
  }

  switch (event.kind) {
    case 'move': {
      if (phase !== 'move') {
        return { ok: false, reason: { kind: 'wrong-phase', expected: 'move', actual: phase } };
      }
      const result = applyMove(state, player.id, event.pathNumber);
      if (!result.ok) {
        return { ok: false, reason: { kind: 'move-rejected', cause: result.reason } };
      }
      const newState = result.value;
      const movedPlayer = newState.players.find((p) => p.id === player.id);
      // Decide the next phase: if the arrival is an uncleared
      // standard-check Sefirah, enter `challenge`; otherwise jump
      // straight to `draw` (Malkuth's no-check, Kether's collective,
      // and already-cleared Sefirot all skip the challenge phase).
      let nextPhase: TurnPhase = 'draw';
      if (movedPlayer) {
        const arrival = sefirahByKey(movedPlayer.position);
        const alreadyCleared = movedPlayer.clearedSefirot.has(
          movedPlayer.position,
        );
        if (arrival.challenge.kind === 'check' && !alreadyCleared) {
          nextPhase = 'challenge';
        }
      }
      return { ok: true, value: { next: { state: newState, phase: nextPhase } } };
    }

    case 'meditate': {
      if (phase !== 'move') {
        return { ok: false, reason: { kind: 'wrong-phase', expected: 'move', actual: phase } };
      }
      // Meditate skips movement; the extra-draw boost lands in the
      // `draw` phase.
      return { ok: true, value: { next: { state, phase: 'draw' } } };
    }

    case 'submit-challenge': {
      if (phase !== 'challenge') {
        return { ok: false, reason: { kind: 'wrong-phase', expected: 'challenge', actual: phase } };
      }
      const result = resolveChallenge({
        state,
        playerId: player.id,
        sefirah: event.sefirah,
        modifiers: event.modifiers,
        rng,
        ...(event.outcome !== undefined ? { outcome: event.outcome } : {}),
      });
      if (!result.ok) {
        return { ok: false, reason: { kind: 'challenge-rejected', cause: result.reason } };
      }
      // Pass: state changed, advance to draw. Fail: state unchanged
      // by the engine; we still advance to `draw` only on pass —
      // failed checks remain in `challenge` phase so the caller can
      // retry-with-burn or accept-setback. The orchestrator owns
      // that branching.
      const passed = result.value.outcome.pass;
      const nextPhase: TurnPhase = passed ? 'draw' : 'challenge';
      return {
        ok: true,
        value: {
          next: { state: result.value.newState, phase: nextPhase },
          meta: { challenge: result.value },
        },
      };
    }

    case 'accept-setback': {
      if (phase !== 'challenge') {
        return { ok: false, reason: { kind: 'wrong-phase', expected: 'challenge', actual: phase } };
      }
      const next = acceptSetback(state, {
        playerId: player.id,
        sefirah: event.sefirah,
        shortcut: event.shortcut ?? false,
      });
      return { ok: true, value: { next: { state: next, phase: 'draw' } } };
    }

    case 'draw': {
      if (phase !== 'draw') {
        return { ok: false, reason: { kind: 'wrong-phase', expected: 'draw', actual: phase } };
      }
      return { ok: true, value: { next: { state: drawToHand(state, player.id), phase: 'end' } } };
    }

    case 'end-turn': {
      if (phase !== 'end') {
        return { ok: false, reason: { kind: 'wrong-phase', expected: 'end', actual: phase } };
      }
      return { ok: true, value: { next: { state: endTurnReducer(state), phase: 'move' } } };
    }
  }
}

/**
 * Pure: refill `playerId`'s hand up to `STARTING_HAND_SIZE`. If the
 * deck is empty mid-fill, recycle the discard pile face-down.
 * Stranded states (no cards anywhere) leave the hand short —
 * `checkEndgame` reports the loss.
 *
 * `HAND_CAP` (6) is the *gift/burn* ceiling — applied when other
 * players send cards or in spark abilities — NOT a draw ceiling.
 * This function only fills toward `STARTING_HAND_SIZE` (4), so a
 * hand already at or above 4 is left alone. The previous loop
 * condition `< STARTING_HAND_SIZE && < HAND_CAP` was dead-code
 * branching since 4 < 6 always; reviewer caught the misleading
 * implication on #106.
 *
 * Recycling is order-preserving here. A real game would shuffle via
 * the session RNG; we hold off on coupling this reducer to a shuffle
 * dependency. The single-player path is deterministic; the
 * multiplayer route owns the shuffle if/when it cares.
 */
function drawToHand(state: GameState, playerId: string): GameState {
  const pIndex = state.players.findIndex((p) => p.id === playerId);
  if (pIndex === -1) return state;
  let pHand = state.players[pIndex]?.hand ?? [];
  let deck = state.deck;
  let discard = state.discardPile;
  while (pHand.length < STARTING_HAND_SIZE) {
    if (deck.length === 0) {
      if (discard.length === 0) break;
      deck = [...discard];
      discard = [];
    }
    const top = deck[0];
    if (top === undefined) break;
    pHand = [...pHand, top];
    deck = deck.slice(1);
  }
  const updated = state.players[pIndex];
  if (!updated) return state;
  return {
    ...state,
    players: state.players.map((p, idx) =>
      idx === pIndex ? { ...updated, hand: pHand } : p,
    ),
    deck,
    discardPile: discard,
  };
}
