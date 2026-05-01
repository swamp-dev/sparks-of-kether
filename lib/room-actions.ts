import { sefirahByKey } from '@/data';
import type { SefirahKey } from '@/data';
import { applyMove } from '@/engine/movement';
import { acceptSetback } from '@/engine/checks';
import type { CheckOutcome } from '@/engine/types';
import { drawNCards, MEDITATE_DRAW } from '@/engine/draws';
import type { Rng } from '@/engine/rng';
import { HAND_CAP } from '@/engine/setup';
import { discard, endTurn } from '@/engine/turn';
import {
  EMPTY_PENDING_MODIFIERS,
  type GameState,
  type MoveRejection,
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
    };

export type ApplyActionRejection =
  | { readonly kind: 'move'; readonly cause: MoveRejection }
  | { readonly kind: 'prep'; readonly cause: TurnReducerError }
  | { readonly kind: 'challenge'; readonly cause: string }
  | { readonly kind: 'meditate'; readonly cause: 'unknown-player' }
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
      // (with stale prep state cleared), anything else lands in 'draw'.
      const result = applyMove(state, action.playerId, action.pathNumber);
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
    case 'accept-setback': {
      const next = acceptSetback(state, {
        playerId: action.playerId,
        sefirah: action.sefirah,
        shortcut: action.shortcut ?? false,
      });
      // Mirror the reducer's `accept-setback` teardown so the post-
      // setback snapshot has the right phase machinery. This is what
      // closes the "react-retry on a passed challenge" exploit's
      // alternate path: after a failed challenge an active player
      // who calls `accept-setback` should land in 'draw' with no
      // sub-phase — and a subsequent `react-retry` will be rejected
      // by `turnReducer`'s sub-phase guard.
      const newState: GameState = {
        ...next,
        pendingModifiers: EMPTY_PENDING_MODIFIERS,
        phase: 'draw',
        challengeSubPhase: undefined,
        lastOutcome: undefined,
        // #334: mirror the reducer — encounter envelope clears on
        // accept-setback (the encounter has ended).
        encounter: undefined,
      };
      return { ok: true, newState };
    }
    case 'meditate': {
      // Mirrors the meditate path in `lib/turn-machine.ts` so server-
      // and client-applied state agree.
      //
      // #291: meditate ALWAYS draws MEDITATE_DRAW (no hand-full
      // rejection). The over-cap excess is reconciled at end-of-turn
      // via state.pendingDiscard.
      //
      // The unknown-player guard remains: production callers go
      // through `authorize` first, so this is a programming error or
      // a bypass — surfacing it cleanly costs nothing and matches the
      // `MoveRejection.unknown-player` precedent.
      const player = state.players.find((p) => p.id === action.playerId);
      if (!player) {
        return {
          ok: false,
          error: { kind: 'meditate', cause: 'unknown-player' },
        };
      }
      const drewState = drawNCards(
        state,
        action.playerId,
        MEDITATE_DRAW,
        HAND_CAP,
        rng,
        { overCap: true },
      );
      const drewPlayer = drewState.players.find((p) => p.id === action.playerId);
      const overCap = Math.max(0, (drewPlayer?.hand.length ?? 0) - HAND_CAP);
      // Meditate is a complete turn-action: phase advances to 'end'
      // (matches `turnReducer`'s meditate case). #292: stamp
      // `lastAction: 'meditate'` for parity with the hot-seat reducer
      // so server- and client-applied state agree on the discriminator
      // PlayScreen's auto-advance timer reads.
      const newState: GameState = {
        ...drewState,
        phase: 'end',
        pendingDiscard:
          overCap > 0
            ? { count: overCap, requiredBy: 'end-of-turn' }
            : undefined,
        lastAction: 'meditate',
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
      const turned = endTurn(state);
      // #291: detect the engine's no-advance signal (engine returns
      // input state when pendingDiscard.count > 0). Pass through
      // unchanged so the multiplayer wire layer does NOT record a
      // phantom seat advance — the active player still owes a trim.
      if (turned === state) {
        return { ok: true, newState: turned };
      }
      // Mirror the reducer: end-turn rotates seat AND resets phase
      // to 'move' for the new active player. Also clear `encounter`
      // defensively — the invariant is that no live encounter envelope
      // crosses the seat boundary; this guard makes the invariant
      // explicit (matches `lib/turn-machine.ts` `end-turn` arm).
      const newState: GameState = {
        ...turned,
        phase: 'move',
        encounter: undefined,
      };
      return { ok: true, newState };
    }
  }
}

/**
 * Compute the post-`move` phase machinery that mirrors the reducer's
 * `'move'` case: arrival on an uncleared standard-check Sefirah →
 * `phase: 'challenge'`, `challengeSubPhase: 'prep'`, prep stack
 * cleared. Any other arrival → `phase: 'draw'`. Stale `lastOutcome`
 * is always cleared on a fresh move (a new turn cannot inherit the
 * prior turn's failed-roll record).
 */
function padPhaseAfterMove(state: GameState, playerId: string): GameState {
  const movedPlayer = state.players.find((p) => p.id === playerId);
  if (!movedPlayer) {
    return {
      ...state,
      phase: 'draw',
      challengeSubPhase: undefined,
      lastOutcome: undefined,
      // #334: keep encounter undefined on the malformed-snapshot
      // path; matches the reducer's behaviour.
      encounter: undefined,
    };
  }
  const arrival = sefirahByKey(movedPlayer.position);
  const alreadyCleared = movedPlayer.clearedSefirot.has(movedPlayer.position);
  if (arrival.challenge.kind === 'check' && !alreadyCleared) {
    return {
      ...state,
      pendingModifiers: EMPTY_PENDING_MODIFIERS,
      phase: 'challenge',
      challengeSubPhase: 'prep',
      lastOutcome: undefined,
      // #334: mirror the reducer — initialize the per-encounter
      // envelope at challenge entry. Shared helper keeps server-
      // and client-applied state in lockstep.
      encounter: initEncounterEnvelope(state, movedPlayer.position),
    };
  }
  return {
    ...state,
    phase: 'draw',
    challengeSubPhase: undefined,
    lastOutcome: undefined,
    // #334: clear any stale envelope on a non-challenge arrival.
    encounter: undefined,
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
function dispatchPrepEvent(
  state: GameState,
  rng: Rng,
  event: TurnEvent,
): ApplyActionResult {
  const snapshot: TurnSnapshot = { state };
  const result = turnReducer(snapshot, event, rng);
  if (!result.ok) {
    return { ok: false, error: { kind: 'prep', cause: result.reason } };
  }
  return { ok: true, newState: result.value.next.state };
}
