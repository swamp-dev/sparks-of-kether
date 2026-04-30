'use client';
import { useCallback, useMemo, useState } from 'react';
import type { SefirahKey } from '@/data';
import type {
  CheckModifiers,
  CheckOutcome,
  ChallengeRejection,
  ChallengeSuccess,
} from '@/engine/checks';
import type { Rng } from '@/engine/rng';
import type {
  ChallengeSubPhase,
  GameState,
  MoveRejection,
  PendingModifiers,
  Result,
  TurnPhase,
} from '@/engine/types';
import {
  HAND_CAP as MACHINE_HAND_CAP,
  STARTING_HAND_SIZE as MACHINE_STARTING_HAND_SIZE,
  turnReducer,
  type PrepModifier,
  type TurnReducerError,
  type TurnReducerSuccess,
  type TurnSnapshot,
} from './turn-machine';

/**
 * Turn-loop state machine driver. Thin React adapter over the pure
 * `turnReducer` in `./turn-machine.ts`. The reducer owns phase logic
 * and engine reducer calls; this file owns the React state.
 *
 * See `./turn-machine.ts` for the phase contract and event semantics.
 */

export type { TurnPhase } from '@/engine/types';
export const STARTING_HAND_SIZE = MACHINE_STARTING_HAND_SIZE;
export const HAND_CAP = MACHINE_HAND_CAP;

interface UseTurnOptions {
  readonly initialState: GameState;
  readonly rng: Rng;
}

export interface UseTurnReturn {
  readonly state: GameState;
  readonly activePlayerIndex: number;
  readonly phase: TurnPhase;
  /**
   * Active sub-phase under `phase === 'challenge'`. Undefined when
   * the top-level phase is anything else. Drives per-sub-phase UI
   * (prep panel vs. resolve animation vs. react buttons) in the new
   * `EncounterScreen` (#228); for hot-seat / `ChallengeModal` callers
   * who only see the top-level `phase`, this is observable but
   * inert.
   */
  readonly challengeSubPhase: ChallengeSubPhase | undefined;
  /**
   * Modifiers staged in the current challenge's `prep` sub-phase.
   * Lives on `GameState.pendingModifiers`; surfaced here for
   * convenience so the UI layer doesn't have to peek through
   * `state` to render the staging panel. Undefined when phase is
   * not `'challenge'`.
   */
  readonly pendingModifiers: PendingModifiers | undefined;
  readonly isActive: (playerId: string) => boolean;
  readonly move: (pathNumber: number) => Result<GameState, MoveRejection>;
  readonly meditate: () => GameState;
  /**
   * Hot-seat one-click wrapper. Internally synthesises real
   * `prep-add-modifier` events for each staged card (taken from
   * the head of the active player's hand) and Spark (taken from
   * the active player's `sparksHeld`), then `prep-confirm`s with
   * `directAssistStats` so the modal-supplied assist values reach
   * the engine unchanged.
   *
   * Multiplayer / `EncounterScreen` (#228) does NOT call this —
   * it dispatches `prepAddModifier` per modifier for real-time
   * visibility on the wire, then `prepConfirm` to roll. Keeping
   * `submitChallenge` as a public method preserves the
   * `PlayScreen` / `ChallengeModal` integration verbatim while
   * the multiplayer path uses the per-step methods.
   */
  readonly submitChallenge: (
    sefirah: SefirahKey,
    modifiers: CheckModifiers,
    /**
     * UI-supplied pre-rolled outcome. Forwarded through
     * `prep-confirm` to `resolveChallenge`; the engine uses it
     * instead of rolling again so the outcome the player saw IS
     * the outcome applied to state.
     */
    outcome?: CheckOutcome,
  ) => Result<ChallengeSuccess, ChallengeRejection>;
  /**
   * Stage a single modifier on the in-progress challenge. The
   * modifier's presupposition (card in hand, Spark held, ally
   * co-located) is NOT validated until `prepConfirm` — the player
   * can over-stage and the reducer drops invalid entries with a
   * `meta.dropped` listing.
   *
   * Returns the structured `TurnReducerResult` directly so callers
   * can branch on `wrong-sub-phase` (caller invoked outside prep) or
   * `prep-cap-exceeded` (assist-request count would exceed
   * `MAX_ASSIST_REQUESTS`) and surface them in the UI.
   */
  readonly prepAddModifier: (
    modifier: PrepModifier,
  ) => Result<TurnReducerSuccess, TurnReducerError>;
  /**
   * Remove a previously-staged modifier. Match is by value-equality
   * on every field (so two staged copies of `{kind: 'card-burn',
   * arcanum: 7}` removes one). Silently no-ops if no match.
   */
  readonly prepRemoveModifier: (
    modifier: PrepModifier,
  ) => Result<TurnReducerSuccess, TurnReducerError>;
  /**
   * Confirm the staged modifiers and roll. The reducer translates
   * `pendingModifiers` into `CheckModifiers` (dropping invalid
   * entries) and calls `engine/checks.ts:resolveChallenge`.
   * Returns the legacy-shape `Result<ChallengeSuccess,
   * ChallengeRejection>` so the call-site contract matches the
   * pre-E1 `submitChallenge`.
   */
  readonly prepConfirm: (
    sefirah: SefirahKey,
    outcome?: CheckOutcome,
  ) => Result<ChallengeSuccess, ChallengeRejection>;
  /**
   * From the `react` sub-phase, loop back to `prep` to stage
   * another card / spark and re-roll. Rejected (`react-retry-on-pass`)
   * if the last roll passed — re-rolling a pass would let the
   * player consume burns to win something they already won.
   */
  readonly reactRetry: () => Result<TurnReducerSuccess, TurnReducerError>;
  /**
   * Apply the engine's failure-acceptance cost (Separation +1, or
   * +2 on shortcut arrivals) and advance the phase to 'draw'
   * atomically. Wraps the reducer's `accept-setback` event.
   */
  readonly acceptChallengeSetback: (input: {
    readonly sefirah: SefirahKey;
    readonly shortcut?: boolean;
  }) => GameState;
  readonly draw: () => GameState;
  /**
   * #291: shed one over-cap card from the active player's hand.
   * Drives the DiscardPrompt UI: each click on a hand card fires
   * `discard(arcanum)`, which decrements `state.pendingDiscard.count`
   * and clears the field once count reaches 0. The engine's
   * `endTurn` then unblocks and the seat advances.
   */
  readonly discard: (arcanum: number) => GameState;
  readonly endTurn: () => void;
  /** Force a state replacement — used when an external action mutates state out-of-band. */
  readonly setState: (s: GameState) => void;
}

/**
 * Synthetic move-rejection used when the hook rejects an event for a
 * non-engine reason (wrong phase, no active player). The original
 * pre-#106 hook returned this exact shape on phase-guard failures;
 * preserved here so the public `Result<GameState, MoveRejection>`
 * contract is unchanged. `playerId: ''` is intentionally blank — the
 * rejection isn't about a real player, it's a backward-compat shim
 * over a `wrong-phase` reducer error. A future ticket can widen the
 * caller-facing rejection type to surface the real reason cleanly.
 */
const SYNTHETIC_MOVE_REJECTION: MoveRejection = {
  kind: 'unknown-player',
  playerId: '',
};

/** Synthetic challenge-rejection — same backward-compat shim, parallel API. */
const SYNTHETIC_CHALLENGE_REJECTION: ChallengeRejection = {
  kind: 'unknown-player',
  playerId: '',
};

export function useTurn(opts: UseTurnOptions): UseTurnReturn {
  const [snapshot, setSnapshot] = useState<TurnSnapshot>(() => ({
    // GameState now carries `phase` directly (post-#227 review fix);
    // `initializeGame` defaults it to 'move'. Tests / callers that
    // construct an `initialState` without going through `initializeGame`
    // are responsible for setting `phase` themselves — `makeState`
    // does so by default.
    state: opts.initialState,
  }));

  const { state } = snapshot;
  const { phase } = state;

  const activePlayerIndex = state.players.findIndex(
    (p) => p.id === state.activePlayerId,
  );

  const challengeSubPhase: ChallengeSubPhase | undefined =
    state.phase === 'challenge' ? state.challengeSubPhase : undefined;
  const pendingModifiers: PendingModifiers | undefined =
    state.phase === 'challenge' ? state.pendingModifiers : undefined;

  const isActive = useCallback(
    (playerId: string) => state.activePlayerId === playerId,
    [state.activePlayerId],
  );

  const move = useCallback(
    (pathNumber: number): Result<GameState, MoveRejection> => {
      const result = turnReducer(snapshot, { kind: 'move', pathNumber }, opts.rng);
      if (!result.ok) {
        if (result.reason.kind === 'move-rejected') {
          return { ok: false, reason: result.reason.cause };
        }
        return { ok: false, reason: SYNTHETIC_MOVE_REJECTION };
      }
      setSnapshot(result.value.next);
      return { ok: true, value: result.value.next.state };
    },
    [snapshot, opts.rng],
  );

  const meditate = useCallback((): GameState => {
    const result = turnReducer(snapshot, { kind: 'meditate' }, opts.rng);
    if (!result.ok) return state;
    setSnapshot(result.value.next);
    return result.value.next.state;
  }, [snapshot, state, opts.rng]);

  const prepAddModifier = useCallback(
    (
      modifier: PrepModifier,
    ): Result<TurnReducerSuccess, TurnReducerError> => {
      const result = turnReducer(
        snapshot,
        { kind: 'prep-add-modifier', modifier },
        opts.rng,
      );
      if (!result.ok) return result;
      setSnapshot(result.value.next);
      return result;
    },
    [snapshot, opts.rng],
  );

  const prepRemoveModifier = useCallback(
    (
      modifier: PrepModifier,
    ): Result<TurnReducerSuccess, TurnReducerError> => {
      const result = turnReducer(
        snapshot,
        { kind: 'prep-remove-modifier', modifier },
        opts.rng,
      );
      if (!result.ok) return result;
      setSnapshot(result.value.next);
      return result;
    },
    [snapshot, opts.rng],
  );

  /**
   * Internal `prep-confirm` dispatcher. Both `prepConfirm` (public
   * per-step method) and `submitChallenge` (hot-seat wrapper) flow
   * through here so the snapshot-commit-and-meta-validation
   * invariants stay in one place. `directAssistStats` is supplied
   * only by the wrapper.
   */
  const dispatchPrepConfirm = useCallback(
    (
      sefirah: SefirahKey,
      outcome: CheckOutcome | undefined,
      directAssistStats: readonly number[] | undefined,
    ): Result<ChallengeSuccess, ChallengeRejection> => {
      const result = turnReducer(
        snapshot,
        {
          kind: 'prep-confirm',
          sefirah,
          ...(outcome !== undefined ? { outcome } : {}),
          ...(directAssistStats !== undefined ? { directAssistStats } : {}),
        },
        opts.rng,
      );
      if (!result.ok) {
        if (result.reason.kind === 'challenge-rejected') {
          return { ok: false, reason: result.reason.cause };
        }
        return { ok: false, reason: SYNTHETIC_CHALLENGE_REJECTION };
      }
      // Validate the meta payload BEFORE committing snapshot. The
      // reducer's contract guarantees `meta.challenge` on a successful
      // prep-confirm (see turn-machine.ts:prep-confirm case); if it's
      // ever missing the snapshot is in a half-applied state we
      // shouldn't commit to React. Mirrors the pre-#229 ordering.
      const challenge = result.value.meta?.challenge;
      if (!challenge) {
        return { ok: false, reason: SYNTHETIC_CHALLENGE_REJECTION };
      }
      setSnapshot(result.value.next);
      return { ok: true, value: challenge };
    },
    [snapshot, opts.rng],
  );

  const prepConfirm = useCallback(
    (
      sefirah: SefirahKey,
      outcome?: CheckOutcome,
    ): Result<ChallengeSuccess, ChallengeRejection> =>
      dispatchPrepConfirm(sefirah, outcome, undefined),
    [dispatchPrepConfirm],
  );

  const reactRetry = useCallback(
    (): Result<TurnReducerSuccess, TurnReducerError> => {
      const result = turnReducer(snapshot, { kind: 'react-retry' }, opts.rng);
      if (!result.ok) return result;
      setSnapshot(result.value.next);
      return result;
    },
    [snapshot, opts.rng],
  );

  /**
   * Hot-seat one-click wrapper. The modal hands us pre-built
   * `CheckModifiers` (assist stats already in number form, card
   * burns and spark burns as counts). We synthesise real
   * `prep-add-modifier` events for each card-burn (taking the head
   * of the active player's hand) and each spark-burn (taking the
   * head of the active player's `sparksHeld`), then `prep-confirm`
   * with `directAssistStats` so the modal-supplied assist
   * contributions reach the engine without re-translation.
   *
   * The card / spark synthesis order is deterministic: first N
   * arcana from the player's hand for card-burns, first N sparks
   * (insertion order of the `Set`) for spark-burns. Callers that
   * want a specific arcanum or spark to be staged should use the
   * per-step methods.
   *
   * If any staging step fails (e.g. `wrong-sub-phase` because the
   * caller invoked outside `prep`), the wrapper returns a
   * synthetic challenge-rejection to preserve the legacy contract.
   */
  const submitChallenge = useCallback(
    (
      sefirah: SefirahKey,
      modifiers: CheckModifiers,
      outcome?: CheckOutcome,
    ): Result<ChallengeSuccess, ChallengeRejection> => {
      // Optimistically mutate a local snapshot through each
      // staging step. Only commit to React if the whole chain
      // succeeds. This avoids a half-staged commit if (e.g.)
      // a card-burn synthesis bumps into a sub-phase guard mid-way.
      let working: TurnSnapshot = snapshot;

      const player = working.state.players.find(
        (p) => p.id === working.state.activePlayerId,
      );
      if (!player) {
        return { ok: false, reason: SYNTHETIC_CHALLENGE_REJECTION };
      }

      // Synthesize card-burn events from the head of the player's
      // hand. The reducer validates each card is in hand at
      // `prep-confirm`, so picking from the actual hand
      // guarantees no `meta.dropped` surprises here.
      const cardBurns = Math.min(modifiers.cardBurns, player.hand.length);
      for (let i = 0; i < cardBurns; i++) {
        const arcanum = player.hand[i];
        if (arcanum === undefined) break;
        const stepResult = turnReducer(
          working,
          {
            kind: 'prep-add-modifier',
            modifier: { kind: 'card-burn', arcanum },
          },
          opts.rng,
        );
        if (!stepResult.ok) {
          return { ok: false, reason: SYNTHETIC_CHALLENGE_REJECTION };
        }
        working = stepResult.value.next;
      }

      // Synthesize spark-burn events from the player's sparksHeld
      // (insertion order). Each spark is a (sefirah, sourcePlayerId)
      // pair; sourcePlayerId is the active player for a self-burn.
      // Hot-seat doesn't have ally-offered Sparks (no out-of-band
      // negotiation in single-machine play), so all sparks come
      // from the active player.
      const heldSparks = Array.from(player.sparksHeld);
      const sparkBurns = Math.min(modifiers.sparkBurns, heldSparks.length);
      for (let i = 0; i < sparkBurns; i++) {
        const sparkSefirah = heldSparks[i];
        if (sparkSefirah === undefined) break;
        const stepResult = turnReducer(
          working,
          {
            kind: 'prep-add-modifier',
            modifier: {
              kind: 'spark-burn',
              sefirah: sparkSefirah,
              sourcePlayerId: player.id,
            },
          },
          opts.rng,
        );
        if (!stepResult.ok) {
          return { ok: false, reason: SYNTHETIC_CHALLENGE_REJECTION };
        }
        working = stepResult.value.next;
      }

      // Confirm — using `directAssistStats` so the modal's
      // pre-translated assist numbers feed straight through to
      // `resolveChallenge`, plus the optional pre-rolled outcome.
      // #286: `shortcutPenalty` is no longer forwarded — the reducer
      // derives it from the active player's `lastArrivalPathNumber`
      // at confirm time, so hot-seat and multiplayer reach the same
      // answer without a wrapper-side hint. The `modifiers.shortcutPenalty`
      // bit the modal builds is still used by the UI (DC summary line)
      // but no longer needs to round-trip through the engine event.
      const confirmResult = turnReducer(
        working,
        {
          kind: 'prep-confirm',
          sefirah,
          ...(outcome !== undefined ? { outcome } : {}),
          ...(modifiers.assistStats.length > 0
            ? { directAssistStats: modifiers.assistStats }
            : {}),
        },
        opts.rng,
      );
      if (!confirmResult.ok) {
        if (confirmResult.reason.kind === 'challenge-rejected') {
          return { ok: false, reason: confirmResult.reason.cause };
        }
        return { ok: false, reason: SYNTHETIC_CHALLENGE_REJECTION };
      }
      const challenge = confirmResult.value.meta?.challenge;
      if (!challenge) {
        return { ok: false, reason: SYNTHETIC_CHALLENGE_REJECTION };
      }
      // All staging + confirm succeeded — commit the final
      // snapshot. (We deliberately don't commit per-step so a
      // mid-chain failure leaves React state untouched — same
      // atomicity the deprecated `submit-challenge` arm provided.)
      setSnapshot(confirmResult.value.next);
      return { ok: true, value: challenge };
    },
    [snapshot, opts.rng],
  );

  const acceptChallengeSetback = useCallback(
    (input: { readonly sefirah: SefirahKey; readonly shortcut?: boolean }): GameState => {
      const result = turnReducer(
        snapshot,
        {
          kind: 'accept-setback',
          sefirah: input.sefirah,
          ...(input.shortcut !== undefined ? { shortcut: input.shortcut } : {}),
        },
        opts.rng,
      );
      if (!result.ok) return state;
      setSnapshot(result.value.next);
      return result.value.next.state;
    },
    [snapshot, state, opts.rng],
  );

  const draw = useCallback((): GameState => {
    const result = turnReducer(snapshot, { kind: 'draw' }, opts.rng);
    if (!result.ok) return state;
    setSnapshot(result.value.next);
    return result.value.next.state;
  }, [snapshot, state, opts.rng]);

  const discard = useCallback(
    (arcanum: number): GameState => {
      const result = turnReducer(
        snapshot,
        { kind: 'discard', arcanum },
        opts.rng,
      );
      if (!result.ok) return state;
      setSnapshot(result.value.next);
      return result.value.next.state;
    },
    [snapshot, state, opts.rng],
  );

  const endTurn = useCallback((): void => {
    const result = turnReducer(snapshot, { kind: 'end-turn' }, opts.rng);
    if (!result.ok) return;
    setSnapshot(result.value.next);
  }, [snapshot, opts.rng]);

  const replaceState = useCallback(
    (s: GameState): void => {
      const result = turnReducer(
        snapshot,
        { kind: 'replace-state', state: s },
        opts.rng,
      );
      if (!result.ok) return;
      setSnapshot(result.value.next);
    },
    [snapshot, opts.rng],
  );

  return useMemo(
    () => ({
      state,
      activePlayerIndex,
      phase,
      challengeSubPhase,
      pendingModifiers,
      isActive,
      move,
      meditate,
      submitChallenge,
      prepAddModifier,
      prepRemoveModifier,
      prepConfirm,
      reactRetry,
      acceptChallengeSetback,
      draw,
      discard,
      endTurn,
      setState: replaceState,
    }),
    [
      state,
      activePlayerIndex,
      phase,
      challengeSubPhase,
      pendingModifiers,
      isActive,
      move,
      meditate,
      submitChallenge,
      prepAddModifier,
      prepRemoveModifier,
      prepConfirm,
      reactRetry,
      acceptChallengeSetback,
      draw,
      discard,
      endTurn,
      replaceState,
    ],
  );
}
