import { sefirahByKey } from '@/data';
import type { SefirahKey } from '@/data';
import { applyMove } from '@/engine/movement';
import {
  acceptSetback,
  resolveChallenge,
  type ChallengeRejection,
  type ChallengeSuccess,
  type CheckModifiers,
} from '@/engine/checks';
import type { Rng } from '@/engine/rng';
import {
  drawNCards,
  MEDITATE_DRAW as ENGINE_MEDITATE_DRAW,
} from '@/engine/draws';
import {
  HAND_CAP as ENGINE_HAND_CAP,
  STARTING_HAND_SIZE as ENGINE_STARTING_HAND_SIZE,
} from '@/engine/setup';
import { endTurn as endTurnReducer } from '@/engine/turn';
import {
  EMPTY_PENDING_MODIFIERS,
  type ChallengeSubPhase,
  type CheckOutcome,
  type GameState,
  type MoveRejection,
  type PendingModifiers,
  type Result,
  type TurnPhase,
} from '@/engine/types';

// Re-exported so existing callers (`lib/use-turn.ts`, `lib/room-actions.ts`,
// component code) can keep importing these types from
// `lib/turn-machine` unchanged. The canonical home is `engine/types.ts`
// post-#227 review fix; the types lifted there because the multiplayer
// dispatcher needed them on `GameState` to close the `react-retry`
// synthesized-`lastOutcome` exploit.
export type { ChallengeSubPhase, TurnPhase };

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
 *               Sefirah. Internally cycles three sub-phases:
 *                 prep    — player stages modifiers (card-burn, spark-burn,
 *                           assist-request) into `state.pendingModifiers`.
 *                 resolve — kernel call: `prep-confirm` event invokes
 *                           `engine/checks.ts:resolveChallenge`.
 *                 react   — post-roll outcome visible. On pass the next
 *                           event is whatever advances the turn (currently
 *                           an external transition to `'draw'`); on fail
 *                           the player chooses `react-retry` (loops back
 *                           to prep, preserving cumulative card-burns) or
 *                           `accept-setback` (Separation +1, phase →
 *                           `'draw'`).
 *               See `design/encounter-prep-phase.md` for the full split.
 *   draw      — refill toward `STARTING_HAND_SIZE`, capped at `HAND_CAP`,
 *               recycling the discard pile if the deck is empty.
 *   end       — advance to next player; phase resets to `move`.
 *
 * The reducer is fully deterministic: same `(snapshot, event, rng)`
 * always produces the same output. RNG is consumed only by the
 * challenge resolver when no pre-rolled `outcome` is supplied.
 */

// Re-exported from engine/setup so the hand-size constants have a
// single source of truth (#56). Legacy callers that import from here
// keep working unchanged; new engine-layer call sites go straight
// to `@/engine/setup`.
export const STARTING_HAND_SIZE = ENGINE_STARTING_HAND_SIZE;
export const HAND_CAP = ENGINE_HAND_CAP;
/** Re-exported from `engine/draws` so legacy imports through `turn-machine` keep working. */
export const MEDITATE_DRAW = ENGINE_MEDITATE_DRAW;

/** Maximum simultaneous assist-requests per challenge (design § 7). */
export const MAX_ASSIST_REQUESTS = 2;

/**
 * Snapshot fold for the turn reducer. Post-#227 review fix the
 * snapshot is purely a wrapper around `GameState` — `phase`,
 * `challengeSubPhase`, and `lastOutcome` all live on `GameState`
 * directly. The wrapper is kept (instead of inlining `GameState`
 * everywhere) so the reducer signature has a stable extension
 * point if a future field genuinely doesn't belong on
 * `GameState` (e.g. UI-only animation state).
 *
 * Reading shorthand: `snapshot.state.phase`, `snapshot.state.challengeSubPhase`,
 * `snapshot.state.lastOutcome`. The reducer never writes to a separate
 * snapshot-level copy — there is none.
 */
export interface TurnSnapshot {
  readonly state: GameState;
}

/**
 * Modifier shape for `prep-add-modifier` and `prep-remove-modifier`.
 * Same shape for both — for remove, the reducer finds the first
 * entry in the relevant `PendingModifiers` array where every field
 * matches by value (`===` on each primitive). Removed silently if
 * the modifier isn't present.
 */
export type PrepModifier =
  | { readonly kind: 'card-burn'; readonly arcanum: number }
  | {
      readonly kind: 'spark-burn';
      readonly sefirah: SefirahKey;
      readonly sourcePlayerId: string;
    }
  | { readonly kind: 'assist-request'; readonly allyId: string };

export type TurnEvent =
  | { readonly kind: 'move'; readonly pathNumber: number }
  | { readonly kind: 'meditate' }
  | {
      readonly kind: 'prep-add-modifier';
      readonly modifier: PrepModifier;
    }
  | {
      readonly kind: 'prep-remove-modifier';
      readonly modifier: PrepModifier;
    }
  | {
      readonly kind: 'prep-confirm';
      readonly sefirah: SefirahKey;
      /**
       * UI-supplied pre-rolled outcome. When the modal animates the
       * d20 it consumes one value from `rng` to produce a
       * `CheckOutcome`; passing it back here keeps engine-state
       * mutation in sync with what the player saw. Optional so engine-
       * only callers (tests, future bots) can use the rng-rolled path.
       */
      readonly outcome?: CheckOutcome;
    }
  | { readonly kind: 'react-retry' }
  | {
      /**
       * @deprecated Hot-seat compatibility shim. Will be removed in E4
       * (#229) once `useTurn` migrates to the per-step prep methods.
       * Internally fires the same path as `prep-confirm`, but accepts
       * pre-built `CheckModifiers` directly instead of translating
       * from `state.pendingModifiers`. New code MUST use `prep-confirm`.
       */
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
  | {
      readonly kind: 'wrong-sub-phase';
      readonly expected: ChallengeSubPhase;
      readonly actual: ChallengeSubPhase | undefined;
    }
  | { readonly kind: 'no-active-player' }
  | { readonly kind: 'prep-cap-exceeded'; readonly cap: number }
  | { readonly kind: 'react-retry-on-pass' }
  | { readonly kind: 'move-rejected'; readonly cause: MoveRejection }
  | { readonly kind: 'challenge-rejected'; readonly cause: ChallengeRejection };

export interface TurnReducerSuccess {
  readonly next: TurnSnapshot;
  /**
   * Event-specific outcome data. Populated only when the event
   * produces it — currently `prep-confirm` returns the
   * `ChallengeSuccess` payload so callers can inspect the d20
   * outcome, plus the list of staged modifiers that were dropped at
   * confirm-time validation (e.g. card no longer in hand).
   */
  readonly meta?: {
    readonly challenge: ChallengeSuccess;
    readonly dropped: readonly PrepModifier[];
  };
}

export type TurnReducerResult = Result<TurnReducerSuccess, TurnReducerError>;

function activePlayer(state: GameState) {
  return state.players.find((p) => p.id === state.activePlayerId);
}

/**
 * Translate a `PendingModifiers` blob into engine `CheckModifiers`,
 * filtering out anything whose stage-time presupposition has since
 * changed (card not in hand, spark not held, ally moved off the
 * Sefirah). Surviving assist-requests are translated into the ally's
 * stat keyed to the challenged Sefirah; the engine then halves
 * (rounded down) when summing.
 *
 * Returns the `CheckModifiers` and the list of modifiers that were
 * dropped, in the order they appeared in `PendingModifiers`.
 */
function translatePendingModifiers(
  state: GameState,
  challenger: GameState['players'][number],
  sefirah: SefirahKey,
): {
  readonly modifiers: CheckModifiers;
  readonly dropped: readonly PrepModifier[];
} {
  const pending = state.pendingModifiers;
  const sefirahRecord = sefirahByKey(sefirah);
  const dropped: PrepModifier[] = [];

  // card-burn: card must still be in the active player's hand.
  let cardBurns = 0;
  // Track which arcanum-numbers have already "consumed" a hand slot,
  // so two staged copies of the same card don't both succeed when
  // the player only has one in hand. Mirrors the consumption that
  // happens at resolve time.
  const handByArcanum = new Map<number, number>();
  for (const card of challenger.hand) {
    handByArcanum.set(card, (handByArcanum.get(card) ?? 0) + 1);
  }
  for (const arcanum of pending.cardBurns) {
    const remaining = handByArcanum.get(arcanum) ?? 0;
    if (remaining > 0) {
      cardBurns += 1;
      handByArcanum.set(arcanum, remaining - 1);
    } else {
      dropped.push({ kind: 'card-burn', arcanum });
    }
  }

  // spark-burn: source player must still hold the named Spark. Allow
  // multiple staged sparks on the same (sefirah, sourcePlayerId) pair
  // by tracking remaining held sparks per source.
  let sparkBurns = 0;
  const sparkLedger = new Map<string, Set<SefirahKey>>();
  for (const burn of pending.sparkBurns) {
    let held = sparkLedger.get(burn.sourcePlayerId);
    if (held === undefined) {
      const source = state.players.find((p) => p.id === burn.sourcePlayerId);
      held = new Set(source?.sparksHeld ?? []);
      sparkLedger.set(burn.sourcePlayerId, held);
    }
    if (held.has(burn.sefirah)) {
      sparkBurns += 1;
      held.delete(burn.sefirah);
    } else {
      dropped.push({
        kind: 'spark-burn',
        sefirah: burn.sefirah,
        sourcePlayerId: burn.sourcePlayerId,
      });
    }
  }

  // assist-request: ally must still be alive (currently always — no
  // death yet) and stand at the same Sefirah as the challenger.
  // Translate to ½ ally stat (the engine floors when summing).
  const assistStats: number[] = [];
  for (const allyId of pending.assistRequests) {
    const ally = state.players.find((p) => p.id === allyId);
    if (!ally || ally.position !== challenger.position) {
      dropped.push({ kind: 'assist-request', allyId });
      continue;
    }
    assistStats.push(ally.stats[sefirahRecord.stat]);
  }

  const modifiers: CheckModifiers = {
    assistStats,
    cardBurns,
    sparkBurns,
    shortcutPenalty: false,
  };
  return { modifiers, dropped };
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
  const { state } = snapshot;
  const { phase, challengeSubPhase } = state;

  if (event.kind === 'replace-state') {
    // Force-replace: used when an external action (multiplayer
    // server push) mutates state out-of-band. The replacement state
    // brings its own phase / sub-phase / lastOutcome — they live on
    // GameState now (post-#227 fix), so a server-pushed snapshot
    // already carries the canonical machinery and we don't need to
    // splice the prior snapshot's view back over it.
    return { ok: true, value: { next: { state: event.state } } };
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
      if (nextPhase === 'challenge') {
        // Entering challenge: clear any stale prep state from a
        // prior encounter and seed the prep sub-phase.
        const cleanState: GameState = {
          ...newState,
          pendingModifiers: EMPTY_PENDING_MODIFIERS,
          phase: 'challenge',
          challengeSubPhase: 'prep',
          lastOutcome: undefined,
        };
        return { ok: true, value: { next: { state: cleanState } } };
      }
      const nextState: GameState = {
        ...newState,
        phase: nextPhase,
        challengeSubPhase: undefined,
        lastOutcome: undefined,
      };
      return { ok: true, value: { next: { state: nextState } } };
    }

    case 'meditate': {
      if (phase !== 'move') {
        return { ok: false, reason: { kind: 'wrong-phase', expected: 'move', actual: phase } };
      }
      // Meditate is a complete turn-action that draws 2 cards (capped
      // at HAND_CAP) — see `design/mechanics.md` § Drawing & gift
      // handling. Skips the 'draw' phase entirely: with no card
      // played, there's nothing to replenish. Surfaced by the
      // 2026-04-27 hot-seat playtest (#128) — players hit Meditate,
      // landed in 'draw' phase, hit Draw, and saw no change because
      // `drawToHand` only refilled toward STARTING_HAND_SIZE which
      // they already had.
      const drewState = drawNCards(state, player.id, MEDITATE_DRAW, HAND_CAP, rng);
      const nextState: GameState = { ...drewState, phase: 'end' };
      return { ok: true, value: { next: { state: nextState } } };
    }

    case 'prep-add-modifier': {
      if (phase !== 'challenge' || challengeSubPhase !== 'prep') {
        return {
          ok: false,
          reason: { kind: 'wrong-sub-phase', expected: 'prep', actual: challengeSubPhase },
        };
      }
      const pending = state.pendingModifiers;
      let nextPending: PendingModifiers;
      switch (event.modifier.kind) {
        case 'card-burn':
          nextPending = {
            ...pending,
            cardBurns: [...pending.cardBurns, event.modifier.arcanum],
          };
          break;
        case 'spark-burn':
          nextPending = {
            ...pending,
            sparkBurns: [
              ...pending.sparkBurns,
              {
                sefirah: event.modifier.sefirah,
                sourcePlayerId: event.modifier.sourcePlayerId,
              },
            ],
          };
          break;
        case 'assist-request':
          if (pending.assistRequests.length >= MAX_ASSIST_REQUESTS) {
            return {
              ok: false,
              reason: { kind: 'prep-cap-exceeded', cap: MAX_ASSIST_REQUESTS },
            };
          }
          nextPending = {
            ...pending,
            assistRequests: [...pending.assistRequests, event.modifier.allyId],
          };
          break;
      }
      return {
        ok: true,
        value: {
          next: {
            state: {
              ...state,
              pendingModifiers: nextPending,
              phase: 'challenge',
              challengeSubPhase: 'prep',
            },
          },
        },
      };
    }

    case 'prep-remove-modifier': {
      if (phase !== 'challenge' || challengeSubPhase !== 'prep') {
        return {
          ok: false,
          reason: { kind: 'wrong-sub-phase', expected: 'prep', actual: challengeSubPhase },
        };
      }
      const pending = state.pendingModifiers;
      const target = event.modifier;
      let nextPending: PendingModifiers = pending;
      switch (target.kind) {
        case 'card-burn': {
          const idx = pending.cardBurns.findIndex((arcanum) => arcanum === target.arcanum);
          if (idx >= 0) {
            nextPending = {
              ...pending,
              cardBurns: [
                ...pending.cardBurns.slice(0, idx),
                ...pending.cardBurns.slice(idx + 1),
              ],
            };
          }
          break;
        }
        case 'spark-burn': {
          const idx = pending.sparkBurns.findIndex(
            (b) =>
              b.sefirah === target.sefirah &&
              b.sourcePlayerId === target.sourcePlayerId,
          );
          if (idx >= 0) {
            nextPending = {
              ...pending,
              sparkBurns: [
                ...pending.sparkBurns.slice(0, idx),
                ...pending.sparkBurns.slice(idx + 1),
              ],
            };
          }
          break;
        }
        case 'assist-request': {
          const idx = pending.assistRequests.findIndex((id) => id === target.allyId);
          if (idx >= 0) {
            nextPending = {
              ...pending,
              assistRequests: [
                ...pending.assistRequests.slice(0, idx),
                ...pending.assistRequests.slice(idx + 1),
              ],
            };
          }
          break;
        }
      }
      return {
        ok: true,
        value: {
          next: {
            state: {
              ...state,
              pendingModifiers: nextPending,
              phase: 'challenge',
              challengeSubPhase: 'prep',
            },
          },
        },
      };
    }

    case 'prep-confirm': {
      if (phase !== 'challenge' || challengeSubPhase !== 'prep') {
        return {
          ok: false,
          reason: { kind: 'wrong-sub-phase', expected: 'prep', actual: challengeSubPhase },
        };
      }
      const { modifiers, dropped } = translatePendingModifiers(
        state,
        player,
        event.sefirah,
      );
      const result = resolveChallenge({
        state,
        playerId: player.id,
        sefirah: event.sefirah,
        modifiers,
        rng,
        ...(event.outcome !== undefined ? { outcome: event.outcome } : {}),
      });
      if (!result.ok) {
        return { ok: false, reason: { kind: 'challenge-rejected', cause: result.reason } };
      }
      // Whether pass or fail, we land in `react`. On pass:
      // `resolveChallenge` already advanced the state (Sefirah
      // cleared, Spark earned, Illumination ticked) and the player
      // is done with this encounter — clear `pendingModifiers` so
      // the next encounter starts clean.
      // On fail: `resolveChallenge` returns the input state
      // unchanged. We deliberately PRESERVE `pendingModifiers` so a
      // subsequent `react-retry` brings the cumulative card-burn /
      // spark-burn / assist stack back into prep visible to the
      // player (design § 6: "the failed-roll history visible so the
      // player can stack additional burns on top"). Without this,
      // retry would land in prep with an empty staging panel and
      // the player loses the rhythm of "3 cards burned, +9
      // modifier; stage another".
      const passed = result.value.outcome.pass;
      const baseState = passed
        ? { ...result.value.newState, pendingModifiers: EMPTY_PENDING_MODIFIERS }
        : result.value.newState;
      const stateAfter: GameState = {
        ...baseState,
        phase: 'challenge',
        challengeSubPhase: 'react',
        lastOutcome: result.value.outcome,
      };
      return {
        ok: true,
        value: {
          next: { state: stateAfter },
          meta: { challenge: result.value, dropped },
        },
      };
    }

    case 'react-retry': {
      if (phase !== 'challenge' || challengeSubPhase !== 'react') {
        return {
          ok: false,
          reason: { kind: 'wrong-sub-phase', expected: 'react', actual: challengeSubPhase },
        };
      }
      // Success path can't retry — re-rolling a passed challenge
      // would let the player consume burns to win something they
      // already won. Gate on `state.lastOutcome.pass` (post-#227 fix:
      // lastOutcome lives on GameState so the multiplayer dispatcher
      // reads truth from the persisted snapshot, not a synthesized
      // value).
      if (state.lastOutcome === undefined || state.lastOutcome.pass) {
        return { ok: false, reason: { kind: 'react-retry-on-pass' } };
      }
      // Loop back to prep. `pendingModifiers` is preserved because
      // the fail path of `prep-confirm` left them alone (the kernel
      // returns input state unchanged on fail, and the reducer
      // intentionally does NOT clear them — see the `prep-confirm`
      // case above). The player stacks new burns on top of the
      // cumulative count from the failed attempt (design § 6:
      // "the failed-roll history visible so the player can stack
      // additional burns on top"). `lastOutcome` is cleared so a
      // second `react-retry` before a new resolve will be rejected
      // by the sub-phase guard above (challengeSubPhase is now
      // 'prep') AND, defensively, by the lastOutcome === undefined
      // branch of the gate.
      const stateAfter: GameState = {
        ...state,
        phase: 'challenge',
        challengeSubPhase: 'prep',
        lastOutcome: undefined,
      };
      return { ok: true, value: { next: { state: stateAfter } } };
    }

    case 'submit-challenge': {
      // Deprecated hot-seat compatibility shim — see TurnEvent
      // declaration. E4 (#229) will delete this once `useTurn`
      // migrates to the per-step prep methods. Gates on `phase ===
      // 'challenge'` only (not `challengeSubPhase`) because legacy
      // callers don't know about sub-phases. Calls `resolveChallenge`
      // directly with the modal's pre-built `CheckModifiers` — no
      // translation from `state.pendingModifiers`.
      if (phase !== 'challenge') {
        return {
          ok: false,
          reason: { kind: 'wrong-phase', expected: 'challenge', actual: phase },
        };
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
      // Match the legacy contract: pass → 'draw' with no sub-phase;
      // fail → stay in 'challenge', exposing the new `react`
      // sub-phase + `lastOutcome` (now on GameState — see the
      // #227 review fix) so legacy callers can upgrade piecewise.
      // `pendingModifiers` is cleared on both paths (the prep stack
      // was not used by this code path anyway — modifiers came
      // pre-built from the modal).
      const passed = result.value.outcome.pass;
      const baseState: GameState = {
        ...result.value.newState,
        pendingModifiers: EMPTY_PENDING_MODIFIERS,
      };
      const stateAfter: GameState = passed
        ? {
            ...baseState,
            phase: 'draw',
            challengeSubPhase: undefined,
            lastOutcome: undefined,
          }
        : {
            ...baseState,
            phase: 'challenge',
            challengeSubPhase: 'react',
            lastOutcome: result.value.outcome,
          };
      return {
        ok: true,
        value: {
          next: { state: stateAfter },
          meta: { challenge: result.value, dropped: [] },
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
      // Phase leaves 'challenge' → clear prep machinery and the
      // sub-phase / lastOutcome (now on GameState).
      const cleared: GameState = {
        ...next,
        pendingModifiers: EMPTY_PENDING_MODIFIERS,
        phase: 'draw',
        challengeSubPhase: undefined,
        lastOutcome: undefined,
      };
      return { ok: true, value: { next: { state: cleared } } };
    }

    case 'draw': {
      if (phase !== 'draw') {
        return { ok: false, reason: { kind: 'wrong-phase', expected: 'draw', actual: phase } };
      }
      const drewState = drawToHand(state, player.id, rng);
      const stateAfter: GameState = { ...drewState, phase: 'end' };
      return { ok: true, value: { next: { state: stateAfter } } };
    }

    case 'end-turn': {
      if (phase !== 'end') {
        return { ok: false, reason: { kind: 'wrong-phase', expected: 'end', actual: phase } };
      }
      const turned = endTurnReducer(state);
      const stateAfter: GameState = { ...turned, phase: 'move' };
      return { ok: true, value: { next: { state: stateAfter } } };
    }
  }
}

/**
 * Pure: refill `playerId`'s hand up to `STARTING_HAND_SIZE`. Delegates
 * to the engine's shared `drawNCards`, which handles the deck →
 * discard recycle and the hard cap.
 *
 * `HAND_CAP` (6) is the *gift/burn* ceiling — applied when other
 * players send cards or in spark abilities — NOT a draw ceiling.
 * This function only fills toward `STARTING_HAND_SIZE` (4), so a
 * hand already at or above 4 is left alone.
 */
function drawToHand(state: GameState, playerId: string, rng: Rng): GameState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return state;
  const need = Math.max(0, STARTING_HAND_SIZE - player.hand.length);
  return drawNCards(state, playerId, need, HAND_CAP, rng);
}
