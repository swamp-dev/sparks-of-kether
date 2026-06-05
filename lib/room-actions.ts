import { sefirahByKey } from '@/data';
import type { SefirahKey } from '@/data';
import { applyMove } from '@/engine/movement';
import {
  ketherConfirmClosure,
  ketherTrialStageSpark,
  ketherTrialUnstageSpark,
  ketherTrialResolve,
  ketherStageSpark,
  ketherUnstageSpark,
  maybeTriggerKetherRitual,
  type KetherRejection,
} from '@/engine/kether';
import { acceptSetback } from '@/engine/checks';
import type { CheckOutcome } from '@/engine/types';
import { drawNCards, drawToHand, MEDITATE_DRAW } from '@/engine/draws';
import type { Rng } from '@/engine/rng';
import { HAND_CAP } from '@/engine/setup';
import { discard, endTurn } from '@/engine/turn';
import {
  EMPTY_PENDING_MODIFIERS,
  type GameState,
  type MoveRejection,
  type TurnPhase,
} from '@/engine/types';
import { initEncounterEnvelope } from './turn-machine';
import {
  turnReducer,
  type PrepModifier,
  type TurnEvent,
  type TurnReducerError,
  type TurnSnapshot,
} from './turn-machine';

/**
 * Client-action union — the wire format for everything a player can
 * do during a multiplayer turn. The server applies these via the
 * engine reducers; the same action shape is sent over the
 * `game_events` table so other clients see it via Realtime.
 *
 * Sparks, draw, and full assist coordination are still TBD — they'll
 * arrive when the multiplayer game UI starts using them. `meditate`
 * was filled in by #216 (the action otherwise silently no-opped on
 * the server because the dispatcher had no case for it).
 */
export type ClientAction =
  | {
      readonly kind: 'move';
      readonly playerId: string;
      readonly pathNumber: number;
      /**
       * #350: server-side Realtime arrival timestamp (ms since epoch).
       * Optional; when present and the move lands the player at Kether,
       * `applyClientAction` overrides the local `Date.now()` stamp on
       * `PlayerState.arrivedAtKetherAt` with this value so all clients
       * agree on `witnessOrder` (`design/final-threshold.md` § 2.2).
       * Hot-seat callers omit it; multiplayer route stamps it from the
       * server clock before dispatching.
       */
      readonly serverArrivedAtKether?: number;
    }
  | {
      readonly kind: 'prep-add-modifier';
      readonly playerId: string;
      readonly modifier: PrepModifier;
    }
  | {
      readonly kind: 'prep-remove-modifier';
      readonly playerId: string;
      readonly modifier: PrepModifier;
    }
  | {
      readonly kind: 'prep-confirm';
      readonly playerId: string;
      readonly sefirah: SefirahKey;
      /**
       * UI-supplied pre-rolled outcome (single-source-of-truth for
       * the d20 the player saw). The engine applies it directly so
       * server and client agree.
       */
      readonly outcome?: CheckOutcome;
    }
  | {
      readonly kind: 'react-retry';
      readonly playerId: string;
    }
  | {
      /**
       * #390: pass-path teardown of the challenge cycle. Wire-format
       * sibling of the `react-continue` TurnEvent (#385). Hot-seat
       * play wires this through `useTurn.reactContinue()` directly;
       * multiplayer Play (when wired) needs it on the wire format
       * so a player who passes a challenge and clicks Continue can
       * advance phase out of `challenge.react`. Without this arm,
       * pre-#385's "phase frozen at challenge.react" bug would
       * re-appear in multiplayer.
       */
      readonly kind: 'react-continue';
      readonly playerId: string;
    }
  | {
      readonly kind: 'accept-setback';
      readonly playerId: string;
      readonly sefirah: SefirahKey;
      readonly shortcut?: boolean;
    }
  | {
      readonly kind: 'meditate';
      readonly playerId: string;
    }
  | {
      /**
       * #291: shed one card from the active player's hand. Sent by
       * the UI's DiscardPrompt after a Meditate-at-cap. Wire-format
       * sibling of the `discard` TurnEvent in `lib/turn-machine.ts`.
       */
      readonly kind: 'discard';
      readonly playerId: string;
      readonly arcanum: number;
    }
  | {
      readonly kind: 'end-turn';
      readonly playerId: string;
    }
  | {
      /**
       * #232 (K2): current trial player stages one of their held Sparks
       * to burn on their challenge. Any player may stage from their own
       * held Sparks. Pre-resolve only; cleared automatically when
       * `kether-trial-resolve` fires.
       */
      readonly kind: 'kether-trial-stage-spark';
      readonly playerId: string;
      readonly sefirah: SefirahKey;
    }
  | {
      /**
       * #232 (K2): un-stage a previously staged trial Spark.
       */
      readonly kind: 'kether-trial-unstage-spark';
      readonly playerId: string;
      readonly sefirah: SefirahKey;
    }
  | {
      /**
       * #232 (K2): current trial player resolves their challenge.
       * Authorized only when `playerId === currentTrialPlayerId(state)`
       * and `subPhase === 'trial'`. The server injects the shared RNG;
       * the client pre-rolls and passes the outcome optimistically.
       */
      readonly kind: 'kether-trial-resolve';
      readonly playerId: string;
    }
  | {
      /**
       * #232 (K2): any player stages one of their held Sparks for the
       * closure window. Pre-confirm only.
       */
      readonly kind: 'kether-close-stage-spark';
      readonly playerId: string;
      readonly sefirah: SefirahKey;
    }
  | {
      /**
       * #232 (K2): symmetric un-stage. Pre-confirm only.
       */
      readonly kind: 'kether-close-unstage-spark';
      readonly playerId: string;
      readonly sefirah: SefirahKey;
    }
  | {
      /**
       * #232 (K2): any player closes the Spark window. First confirm
       * wins. The reducer consumes staged Sparks (+1 Illumination each),
       * locks `closureLocked: true`, and exits the ritual to
       * `phase: 'end'` so post-state `checkEndgame` carries the actual
       * `'won'` / `'lost'` signal.
       */
      readonly kind: 'threshold-confirm';
      readonly playerId: string;
    };

export type ApplyActionRejection =
  | { readonly kind: 'move'; readonly cause: MoveRejection }
  | { readonly kind: 'prep'; readonly cause: TurnReducerError }
  | { readonly kind: 'challenge'; readonly cause: string }
  | {
      readonly kind: 'meditate';
      readonly cause: 'unknown-player' | 'already-meditated' | 'wrong-phase';
    }
  | {
      // #522: mirrors `turnReducer`'s `allowEndTurn` gate at
      // `lib/turn-machine.ts:1423`. Surfaces when an HTTP-level
      // bypass (cheating client / racing tabs / future code path)
      // sends end-turn from a phase that should silently skip the
      // turn — instead we reject so the caller can render a precise
      // message instead of pretending the seat rotated.
      readonly kind: 'end-turn';
      readonly cause: {
        readonly kind: 'wrong-phase';
        readonly expected: TurnPhase;
        readonly actual: TurnPhase;
      };
    }
  | { readonly kind: 'kether'; readonly cause: KetherRejection }
  | { readonly kind: 'unknown-action' };

export type ApplyActionResult =
  | { readonly ok: true; readonly newState: GameState }
  | { readonly ok: false; readonly error: ApplyActionRejection };

/**
 * Pure: apply one client action to a game state. The server route
 * calls this; the client's useTurn hook does its own engine calls
 * for optimistic local updates. Both call the same engine reducers
 * so server and client outcomes always agree (modulo `rng` which
 * is server-authoritative — clients pre-roll outcomes and pass
 * them in).
 */
export function applyClientAction(
  state: GameState,
  action: ClientAction,
  rng: Rng,
): ApplyActionResult {
  switch (action.kind) {
    case 'move': {
      // The dispatcher calls `applyMove` directly (not through
      // `turnReducer`) so the rejection-shape contract surfaces a
      // `MoveRejection` as-is to the caller. We then pad the result
      // with a phase transition that mirrors what `turnReducer` does
      // for a 'move' event: a check arrival enters 'challenge'/'prep'
      // (with stale prep state cleared), anything else lands in 'end'
      // (#502: pre-#502 the no-challenge branch landed in 'draw'; the
      // discrete 'draw' phase has been folded into 'end-turn').
      //
      // #350: when the multiplayer route attaches `serverArrivedAtKether`
      // to a Kether-landing move, we override `applyMove`'s clock so
      // `PlayerState.arrivedAtKetherAt` carries the server timestamp.
      // This keeps `witnessOrder` deterministic across clients even
      // when local clocks drift (`design/final-threshold.md` § 2.2).
      const moveOptions =
        action.serverArrivedAtKether !== undefined
          ? { now: () => action.serverArrivedAtKether as number }
          : undefined;
      const result = applyMove(state, action.playerId, action.pathNumber, moveOptions);
      if (!result.ok) return { ok: false, error: { kind: 'move', cause: result.reason } };
      return { ok: true, newState: padPhaseAfterMove(result.value, action.playerId) };
    }
    case 'prep-add-modifier':
      return dispatchPrepEvent(state, rng, {
        kind: 'prep-add-modifier',
        modifier: action.modifier,
      });
    case 'prep-remove-modifier':
      return dispatchPrepEvent(state, rng, {
        kind: 'prep-remove-modifier',
        modifier: action.modifier,
      });
    case 'prep-confirm':
      return dispatchPrepEvent(
        state,
        rng,
        action.outcome !== undefined
          ? {
              kind: 'prep-confirm',
              sefirah: action.sefirah,
              outcome: action.outcome,
            }
          : { kind: 'prep-confirm', sefirah: action.sefirah },
      );
    case 'react-retry':
      return dispatchPrepEvent(state, rng, { kind: 'react-retry' });
    case 'react-continue':
      // #390: forward to the engine's `react-continue` reducer arm
      // (#385). The reducer's existing guards — `phase === 'challenge'`,
      // `challengeSubPhase === 'react'`, `lastOutcome.pass === true` —
      // gate the legitimate post-pass path. A wire dispatch from any
      // other state lands in the reducer's rejection shape, which
      // `dispatchPrepEvent` surfaces back as `{ ok: false, error:
      // { kind: 'prep', cause: <TurnReducerError> } }`.
      return dispatchPrepEvent(state, rng, { kind: 'react-continue' });
    case 'accept-setback': {
      const next = acceptSetback(state, {
        playerId: action.playerId,
        sefirah: action.sefirah,
        shortcut: action.shortcut ?? false,
      });
      // Mirror the reducer's `accept-setback` teardown so the post-
      // setback snapshot has the right phase machinery. #502: lands
      // in `'end'` directly (pre-#502 this transitioned to `'draw'`;
      // start-of-turn refill folded that step into `end-turn`). This
      // is also what closes the "react-retry on a passed challenge"
      // exploit's alternate path: after a failed challenge an active
      // player who calls `accept-setback` lands in 'end' with no
      // sub-phase — and a subsequent `react-retry` will be rejected
      // by `turnReducer`'s sub-phase guard.
      const newState: GameState = {
        ...next,
        pendingModifiers: EMPTY_PENDING_MODIFIERS,
        phase: 'end',
        challengeSubPhase: undefined,
        lastOutcome: undefined,
        // #334: mirror the reducer — encounter envelope clears on
        // accept-setback (the encounter has ended).
        encounter: undefined,
        // #292/#502: tag the end-phase entry so PlayScreen's auto-
        // advance timer fires.
        lastAction: 'move-draw',
      };
      return { ok: true, newState };
    }
    case 'meditate': {
      // Mirrors the meditate path in `lib/turn-machine.ts` so server-
      // and client-applied state agree.
      //
      // #291: meditate ALWAYS draws MEDITATE_DRAW (no hand-full
      // rejection). Post-#503 the over-cap reconciliation lives on
      // `end-turn`, NOT here — see the `end-turn` arm below for the
      // cap check that fires when the player tries to advance.
      //
      // #503: phase stays at `'move'` so the player can still play a
      // card the same turn. The once-per-turn cap is enforced by
      // `state.meditatedThisTurn` — pre-cap rejection lives here so
      // server-applied state matches the engine reducer.
      //
      // The unknown-player guard remains: production callers go
      // through `authorize` first, so this is a programming error or
      // a bypass — surfacing it cleanly costs nothing and matches the
      // `MoveRejection.unknown-player` precedent.
      if (state.phase !== 'move' && state.phase !== 'end') {
        return {
          ok: false,
          error: { kind: 'meditate', cause: 'wrong-phase' },
        };
      }
      const player = state.players.find((p) => p.id === action.playerId);
      if (!player) {
        return {
          ok: false,
          error: { kind: 'meditate', cause: 'unknown-player' },
        };
      }
      if (state.meditatedThisTurn === true) {
        return {
          ok: false,
          error: { kind: 'meditate', cause: 'already-meditated' },
        };
      }
      const drewState = drawNCards(state, action.playerId, MEDITATE_DRAW, HAND_CAP, rng, {
        overCap: true,
      });
      const newState: GameState = {
        ...drewState,
        phase: state.phase,
        meditatedThisTurn: true,
        ...(state.phase === 'end' ? { lastAction: undefined } : {}),
      };
      return { ok: true, newState };
    }
    case 'discard': {
      // #291: shed one over-cap card. Mirrors the `discard` event in
      // turn-machine. The engine's `discard` reducer is itself
      // defensive (no-op if the card isn't in hand or the player is
      // unknown), so the dispatcher can stay terse.
      const after = discard(state, action.playerId, action.arcanum);
      return { ok: true, newState: after };
    }
    case 'end-turn': {
      // #522: close the HTTP-level skip-turn bypass. A fresh-`'move'`
      // player who has neither meditated nor moved must not be able
      // to skip their turn by POSTing `end-turn` directly through the
      // events route — the UI does not render an End Turn button in
      // that state, so any dispatch reaching the dispatcher is a
      // cheating client / racing tabs / future code path. Mirrors
      // the corresponding reducer gate at `lib/turn-machine.ts:1423`
      // for this specific case (move without meditate).
      //
      // Scope: this guard fires ONLY for `'move'` without
      // `meditatedThisTurn`. Other phase asymmetries between the
      // dispatcher and the reducer (e.g. `'challenge'` or `'kether'`
      // end-turn) pre-date this ticket and have load-bearing
      // exercises in integration tests; tightening those is out of
      // scope here and would balloon the PR.
      if (
        state.phase === 'move' &&
        state.meditatedThisTurn !== true &&
        state.movedThisTurn !== true
      ) {
        return {
          ok: false,
          error: {
            kind: 'end-turn',
            cause: {
              kind: 'wrong-phase',
              expected: 'end',
              actual: state.phase,
            },
          },
        };
      }
      // #503 (post-meditate cap check): if the active player is over
      // HAND_CAP at end-turn time, set `pendingDiscard` and return
      // *without* rotating the seat. Mirrors the engine reducer's arm
      // so server- and client-applied state agree on when the discard
      // prompt fires (only when ending the turn, not on Meditate).
      const activeForCap = state.players.find((p) => p.id === state.activePlayerId);
      if (
        activeForCap !== undefined &&
        activeForCap.hand.length > HAND_CAP &&
        (state.pendingDiscard?.count ?? 0) === 0
      ) {
        const excess = activeForCap.hand.length - HAND_CAP;
        const stateWithDiscard: GameState = {
          ...state,
          pendingDiscard: { count: excess, requiredBy: 'end-of-turn' },
        };
        return { ok: true, newState: stateWithDiscard };
      }
      const turned = endTurn(state);
      // #291: detect the engine's no-advance signal (engine returns
      // input state when pendingDiscard.count > 0). Pass through
      // unchanged so the multiplayer wire layer does NOT record a
      // phantom seat advance — the active player still owes a trim.
      if (turned === state) {
        return { ok: true, newState: turned };
      }
      // #502: start-of-turn refill — refill the NEW active player's
      // hand toward STARTING_HAND_SIZE (capped at HAND_CAP). Mirrors
      // `lib/turn-machine.ts` `end-turn` arm so server- and client-
      // applied state agree on the post-rotation hand contents.
      // `drawToHand` is a no-op for a hand already at or above
      // STARTING_HAND_SIZE — a player who has been gifted up to the
      // cap during the prior turn simply skips the refill.
      const drewForNext = drawToHand(turned, turned.activePlayerId, rng);
      // Mirror the reducer: end-turn rotates seat AND resets phase
      // to 'move' for the new active player. Also clear `encounter`
      // defensively — the invariant is that no live encounter envelope
      // crosses the seat boundary; this guard makes the invariant
      // explicit (matches `lib/turn-machine.ts` `end-turn` arm).
      const newState: GameState = {
        ...drewForNext,
        phase: 'move',
        encounter: undefined,
      };
      return { ok: true, newState };
    }
    case 'kether-trial-stage-spark': {
      const result = ketherTrialStageSpark(state, {
        playerId: action.playerId,
        sefirah: action.sefirah,
      });
      if (!result.ok) return { ok: false, error: { kind: 'kether', cause: result.reason } };
      return { ok: true, newState: result.value };
    }
    case 'kether-trial-unstage-spark': {
      const result = ketherTrialUnstageSpark(state, {
        playerId: action.playerId,
        sefirah: action.sefirah,
      });
      if (!result.ok) return { ok: false, error: { kind: 'kether', cause: result.reason } };
      return { ok: true, newState: result.value };
    }
    case 'kether-trial-resolve': {
      const result = ketherTrialResolve(state, { playerId: action.playerId, rng });
      if (!result.ok) return { ok: false, error: { kind: 'kether', cause: result.reason } };
      return { ok: true, newState: result.value };
    }
    case 'kether-close-stage-spark': {
      const result = ketherStageSpark(state, {
        playerId: action.playerId,
        sefirah: action.sefirah,
      });
      if (!result.ok) return { ok: false, error: { kind: 'kether', cause: result.reason } };
      return { ok: true, newState: result.value };
    }
    case 'kether-close-unstage-spark': {
      const result = ketherUnstageSpark(state, {
        playerId: action.playerId,
        sefirah: action.sefirah,
      });
      if (!result.ok) return { ok: false, error: { kind: 'kether', cause: result.reason } };
      return { ok: true, newState: result.value };
    }
    case 'threshold-confirm': {
      const result = ketherConfirmClosure(state, { playerId: action.playerId });
      if (!result.ok) return { ok: false, error: { kind: 'kether', cause: result.reason } };
      return { ok: true, newState: result.value };
    }
  }
}

/**
 * Compute the post-`move` phase machinery that mirrors the reducer's
 * `'move'` case: arrival on an uncleared standard-check Sefirah →
 * `phase: 'challenge'`, `challengeSubPhase: 'prep'`, prep stack
 * cleared. Any other arrival → `phase: 'end'` with `lastAction:
 * 'move-draw'` so the auto-advance timer fires. Stale `lastOutcome`
 * is always cleared on a fresh move (a new turn cannot inherit the
 * prior turn's failed-roll record).
 *
 * #502: pre-#502 non-challenge arrivals landed in `'draw'` (a discrete
 * phase that fired an end-of-turn refill). With the refill moved to
 * start-of-turn (inside `end-turn`), non-challenge arrivals now land
 * in `'end'` directly.
 *
 * #345: when this move was the LAST player's arrival at Kether, the
 * Final Threshold ritual trips. `maybeTriggerKetherRitual` returns a
 * state with `phase: 'kether'` and a populated `ketherRitual`; we
 * surface that directly without any further phase padding (no
 * 'challenge', no 'end' — the ritual owns the phase machinery from
 * here until it exits to 'end' on `threshold-confirm`).
 */
function padPhaseAfterMove(state: GameState, playerId: string): GameState {
  // #345: detect convergence first. The helper is idempotent — a no-op
  // when the trigger predicate is unmet — so we can fold it into the
  // pipeline without a guard. When the ritual trips, return the
  // ritual-padded state directly: no further phase decision applies.
  const triggered = maybeTriggerKetherRitual(state);
  if (triggered.phase === 'kether') {
    return triggered;
  }
  const movedPlayer = triggered.players.find((p) => p.id === playerId);
  if (!movedPlayer) {
    return {
      ...triggered,
      phase: 'end',
      challengeSubPhase: undefined,
      lastOutcome: undefined,
      // #334: keep encounter undefined on the malformed-snapshot
      // path; matches the reducer's behaviour.
      encounter: undefined,
      lastAction: 'move-draw',
    };
  }
  const arrival = sefirahByKey(movedPlayer.position);
  const alreadyCleared = movedPlayer.clearedSefirot.has(movedPlayer.position);
  if (arrival.challenge.kind === 'check' && !alreadyCleared) {
    return {
      ...triggered,
      pendingModifiers: EMPTY_PENDING_MODIFIERS,
      phase: 'challenge',
      challengeSubPhase: 'prep',
      lastOutcome: undefined,
      // #334: mirror the reducer — initialize the per-encounter
      // envelope at challenge entry. Shared helper keeps server-
      // and client-applied state in lockstep.
      encounter: initEncounterEnvelope(triggered, movedPlayer.position),
    };
  }
  return {
    ...triggered,
    phase: 'end',
    challengeSubPhase: undefined,
    lastOutcome: undefined,
    // #334: clear any stale envelope on a non-challenge arrival.
    encounter: undefined,
    // #292/#502: tag end-phase arrival so PlayScreen's auto-advance
    // timer fires (matches `lib/turn-machine.ts` `'move'` arm).
    lastAction: 'move-draw',
  };
}

/**
 * Wrap the `state` in a `TurnSnapshot` and fold a prep-stage `TurnEvent`
 * through `turnReducer`, unpacking the result.
 *
 * Pre-#227 review fix this function synthesized `phase`,
 * `challengeSubPhase`, and (for `react-retry`) a failed `lastOutcome`,
 * because all three lived only on `TurnSnapshot` — not on `GameState`
 * — and the multiplayer wire layer only persisted `GameState`. The
 * synthesis was a security AND correctness bug:
 *
 *   - A malicious authenticated active player could fire `react-retry`
 *     cold (no prior `prep-confirm`) or after a passed challenge, and
 *     the dispatcher's faked `lastOutcome.pass: false` let the
 *     reducer's "can't retry on pass" gate be bypassed.
 *   - The synthesized `challengeSubPhase: 'react'` could mismatch the
 *     real engine state (e.g. `'draw'` post-pass), so a reducer
 *     transition from synthesized 'react' to 'prep' would corrupt
 *     state.
 *
 * The fix: `phase`, `challengeSubPhase`, and `lastOutcome` live on
 * `GameState` directly. The dispatcher reads them from the persisted
 * snapshot — no synthesis. The reducer's phase / sub-phase / pass
 * gates now run against the truth the wire layer carries.
 *
 * Defense in depth: even if a client crafts an action with the wrong
 * `kind`, the reducer's existing sub-phase guards will reject it,
 * because the caller's request kind has to match what `state.phase`
 * and `state.challengeSubPhase` actually are.
 */
function dispatchPrepEvent(state: GameState, rng: Rng, event: TurnEvent): ApplyActionResult {
  const snapshot: TurnSnapshot = { state };
  const result = turnReducer(snapshot, event, rng);
  if (!result.ok) {
    return { ok: false, error: { kind: 'prep', cause: result.reason } };
  }
  return { ok: true, newState: result.value.next.state };
}
