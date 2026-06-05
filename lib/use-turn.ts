'use client';
import { useCallback, useMemo, useState } from 'react';
import type { SefirahKey } from '@/data';
import type {
  CheckModifiers,
  CheckOutcome,
  ChallengeRejection,
  ChallengeSuccess,
} from '@/engine/checks';
import {
  currentTrialPlayerId,
  ketherConfirmClosure,
  ketherTrialStageSpark as engineTrialStageSpark,
  ketherTrialUnstageSpark as engineTrialUnstageSpark,
  ketherTrialResolve as engineTrialResolve,
  ketherStageSpark,
  ketherUnstageSpark,
  type KetherConfirmResult,
  type KetherRejection,
} from '@/engine/kether';
import type { Rng } from '@/engine/rng';
import type {
  ChallengeSubPhase,
  GameState,
  MoveRejection,
  PendingModifiers,
  Result,
  TurnPhase,
} from '@/engine/types';
import type { ClientAction } from './room-actions';
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

/**
 * Wire-dispatch callback for multiplayer mode (K4 / #352). When the
 * caller supplies this, the Kether ritual methods send the matching
 * K2 `ClientAction` over the wire (so other clients see the move via
 * Realtime) AND apply the engine reducer locally for an optimistic
 * update. When the callback is omitted (hot-seat), the ritual methods
 * apply the engine reducer locally without any wire dispatch.
 *
 * The same shape is used by the (out-of-scope-for-K4) future
 * EncounterScreen wire-dispatch refactor; the Kether methods are the
 * first to land with this contract because the multiplayer
 * acceptance criteria for #352 demand it explicitly.
 */
export type DispatchClientAction = (action: ClientAction) => void;

interface UseTurnOptions {
  readonly initialState: GameState;
  readonly rng: Rng;
  /**
   * K4 / #352 — multiplayer wire-dispatch hook for the Kether ritual.
   * Hot-seat callers omit this and the ritual methods apply the engine
   * reducer locally only. Multiplayer callers supply both this AND
   * `selfPlayerId` so the dispatched `ClientAction` carries the
   * authentic actor id (the server will gate it against the bearer
   * token regardless, but the client-side `playerId` field has to
   * match for the round-trip to succeed).
   */
  readonly dispatchClientAction?: DispatchClientAction;
  /**
   * K4 / #352 — caller's player id, used by ritual methods to populate
   * the `playerId` field on dispatched `ClientAction`s. Required when
   * `dispatchClientAction` is provided; ignored otherwise. (Hot-seat
   * uses `currentTrialPlayerId(state)` for trial-resolve and
   * `state.activePlayerId` as the implicit actor for closure-window
   * stage/unstage actions.)
   */
  readonly selfPlayerId?: string;
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
   * #385: pass-path counterpart to `acceptChallengeSetback`. From the
   * `react` sub-phase with `lastOutcome.pass === true`, advance phase
   * to `'end'` and clear all challenge machinery. Wraps the reducer's
   * `react-continue` event. Rejected (`react-continue-on-fail`) if
   * the last roll failed — the fail path must route through
   * `acceptChallengeSetback` for the Separation tick + shortcut
   * rollback.
   */
  readonly reactContinue: () => Result<TurnReducerSuccess, TurnReducerError>;
  /**
   * Apply the engine's failure-acceptance cost (Separation +1, or
   * +2 on shortcut arrivals) and advance the phase to `'end'`
   * atomically. Wraps the reducer's `accept-setback` event.
   */
  readonly acceptChallengeSetback: (input: {
    readonly sefirah: SefirahKey;
    readonly shortcut?: boolean;
  }) => GameState;
  /**
   * #291: shed one over-cap card from the active player's hand.
   * Drives the DiscardPrompt UI: each click on a hand card fires
   * `discard(arcanum)`, which decrements `state.pendingDiscard.count`
   * and clears the field once count reaches 0. The engine's
   * `endTurn` then unblocks and the seat advances.
   */
  readonly discard: (arcanum: number) => GameState;
  /**
   * Encounter-burn forced discard: shed one card from the active
   * player's hand before the die is rolled when they have burned
   * card(s) during encounter prep. The UI (EncounterScreen) gates
   * invocation; the reducer no-ops if the card is not in hand.
   */
  readonly encounterBurnDiscard: (arcanum: number) => GameState;
  /** Gift a card from the active player's hand to an ally. +1 Illumination on accept. */
  readonly giftTurn: (
    arcanum: number,
    recipientId: string,
  ) => Result<TurnReducerSuccess, TurnReducerError>;
  /** Accept a gift when recipient is at hand cap by discarding one of their cards first. */
  readonly giftTurnAcceptOverCap: (
    arcanum: number,
    recipientId: string,
    discardArcanum: number,
  ) => Result<TurnReducerSuccess, TurnReducerError>;
  /** Refuse a pending gift. +1 Separation. */
  readonly refuseGiftTurn: (recipientId: string) => Result<TurnReducerSuccess, TurnReducerError>;
  readonly endTurn: () => void;
  /** Force a state replacement — used when an external action mutates state out-of-band. */
  readonly setState: (s: GameState) => void;

  // ────────────────────────────────────────────────────────────────
  // K4 (#352) — Kether ritual adapter (trial redesign).
  //
  // Ritual methods mirror the K2 wire actions one-for-one. Hot-seat
  // callers get the local engine reducer applied directly; multiplayer
  // callers also dispatch the matching `ClientAction` for Realtime.
  // `currentTrialPlayerId` surfaces the engine's round-robin pointer.
  // ────────────────────────────────────────────────────────────────

  /**
   * Whose turn it currently is in the trial gauntlet. Wraps
   * `engine/kether.ts:currentTrialPlayerId`. Returns `null` outside
   * `phase === 'kether'` / `subPhase === 'trial'`.
   */
  readonly currentTrialPlayerId: string | null;

  /**
   * Stage one of `playerId`'s held Sparks for the current trial
   * challenge. The engine validates ownership and sub-phase.
   */
  readonly ketherTrialStageSpark: (
    playerId: string,
    sefirah: SefirahKey,
  ) => Result<GameState, KetherRejection>;

  /**
   * Symmetric un-stage for the trial.
   */
  readonly ketherTrialUnstageSpark: (
    playerId: string,
    sefirah: SefirahKey,
  ) => Result<GameState, KetherRejection>;

  /**
   * Active trial player rolls their challenge. The engine handles
   * d20 + stat + Spark-bonus and advances the turn index. Returns
   * `undefined` if no actor can be determined.
   */
  readonly ketherTrialResolve: () => Result<GameState, KetherRejection> | undefined;

  /**
   * Stage one of `playerId`'s held Sparks for the closure window.
   * Pre-confirm only; the engine rejects once `closureLocked` is true.
   */
  readonly ketherCloseStageSpark: (
    playerId: string,
    sefirah: SefirahKey,
  ) => Result<GameState, KetherRejection>;

  /**
   * Symmetric un-stage for the closure window.
   */
  readonly ketherCloseUnstageSpark: (
    playerId: string,
    sefirah: SefirahKey,
  ) => Result<GameState, KetherRejection>;

  /**
   * Close the spark window (first-confirm-wins). Hot-seat uses
   * `state.activePlayerId` as the implicit actor; multiplayer uses
   * `selfPlayerId`. Subsequent confirms reject with
   * `kether-already-confirmed` at the engine layer.
   */
  readonly thresholdConfirm: () => KetherConfirmResult | undefined;
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

  const activePlayerIndex = state.players.findIndex((p) => p.id === state.activePlayerId);

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

  const meditateDispatch = opts.dispatchClientAction;
  const meditatePlayerId = opts.selfPlayerId;
  const meditate = useCallback((): GameState => {
    const result = turnReducer(snapshot, { kind: 'meditate' }, opts.rng);
    if (!result.ok) return state;
    setSnapshot(result.value.next);
    if (meditateDispatch !== undefined && meditatePlayerId !== undefined) {
      meditateDispatch({ kind: 'meditate', playerId: meditatePlayerId });
    }
    return result.value.next.state;
  }, [snapshot, state, opts.rng, meditateDispatch, meditatePlayerId]);

  const prepAddModifier = useCallback(
    (modifier: PrepModifier): Result<TurnReducerSuccess, TurnReducerError> => {
      const result = turnReducer(snapshot, { kind: 'prep-add-modifier', modifier }, opts.rng);
      if (!result.ok) return result;
      setSnapshot(result.value.next);
      return result;
    },
    [snapshot, opts.rng],
  );

  const prepRemoveModifier = useCallback(
    (modifier: PrepModifier): Result<TurnReducerSuccess, TurnReducerError> => {
      const result = turnReducer(snapshot, { kind: 'prep-remove-modifier', modifier }, opts.rng);
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
    (sefirah: SefirahKey, outcome?: CheckOutcome): Result<ChallengeSuccess, ChallengeRejection> =>
      dispatchPrepConfirm(sefirah, outcome, undefined),
    [dispatchPrepConfirm],
  );

  const reactRetry = useCallback((): Result<TurnReducerSuccess, TurnReducerError> => {
    const result = turnReducer(snapshot, { kind: 'react-retry' }, opts.rng);
    if (!result.ok) return result;
    setSnapshot(result.value.next);
    return result;
  }, [snapshot, opts.rng]);

  // #385: pass-path Continue out of challenge.react. Mirrors
  // `reactRetry`'s shape — same return type, same setSnapshot-on-ok.
  const reactContinue = useCallback((): Result<TurnReducerSuccess, TurnReducerError> => {
    const result = turnReducer(snapshot, { kind: 'react-continue' }, opts.rng);
    if (!result.ok) return result;
    setSnapshot(result.value.next);
    return result;
  }, [snapshot, opts.rng]);

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

      const player = working.state.players.find((p) => p.id === working.state.activePlayerId);
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
          ...(modifiers.assistStats.length > 0 ? { directAssistStats: modifiers.assistStats } : {}),
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

  const discard = useCallback(
    (arcanum: number): GameState => {
      const result = turnReducer(snapshot, { kind: 'discard', arcanum }, opts.rng);
      if (!result.ok) return state;
      setSnapshot(result.value.next);
      return result.value.next.state;
    },
    [snapshot, state, opts.rng],
  );

  const encounterBurnDiscard = useCallback(
    (arcanum: number): GameState => {
      const result = turnReducer(snapshot, { kind: 'encounter-burn-discard', arcanum }, opts.rng);
      if (!result.ok) return state;
      setSnapshot(result.value.next);
      return result.value.next.state;
    },
    [snapshot, state, opts.rng],
  );

  const giftTurn = useCallback(
    (arcanum: number, recipientId: string): Result<TurnReducerSuccess, TurnReducerError> => {
      const result = turnReducer(snapshot, { kind: 'gift-turn', arcanum, recipientId }, opts.rng);
      if (!result.ok) return result;
      setSnapshot(result.value.next);
      return result;
    },
    [snapshot, opts.rng],
  );

  const giftTurnAcceptOverCap = useCallback(
    (
      arcanum: number,
      recipientId: string,
      discardArcanum: number,
    ): Result<TurnReducerSuccess, TurnReducerError> => {
      const result = turnReducer(
        snapshot,
        { kind: 'gift-turn-accept-over-cap', arcanum, recipientId, discardArcanum },
        opts.rng,
      );
      if (!result.ok) return result;
      setSnapshot(result.value.next);
      return result;
    },
    [snapshot, opts.rng],
  );

  const refuseGiftTurn = useCallback(
    (recipientId: string): Result<TurnReducerSuccess, TurnReducerError> => {
      const result = turnReducer(snapshot, { kind: 'refuse-gift-turn', recipientId }, opts.rng);
      if (!result.ok) return result;
      setSnapshot(result.value.next);
      return result;
    },
    [snapshot, opts.rng],
  );

  // Extracted so the deps array references stable per-render bindings
  // rather than the opts object, matching the Kether methods' pattern.
  const endTurnDispatch = opts.dispatchClientAction;
  const endTurnPlayerId = opts.selfPlayerId;

  const endTurn = useCallback((): void => {
    const result = turnReducer(snapshot, { kind: 'end-turn' }, opts.rng);
    if (!result.ok) return;
    setSnapshot(result.value.next);
    if (endTurnDispatch !== undefined && endTurnPlayerId !== undefined) {
      endTurnDispatch({ kind: 'end-turn', playerId: endTurnPlayerId });
    }
  }, [snapshot, opts.rng, endTurnDispatch, endTurnPlayerId]);

  const replaceState = useCallback(
    (s: GameState): void => {
      const result = turnReducer(snapshot, { kind: 'replace-state', state: s }, opts.rng);
      if (!result.ok) return;
      setSnapshot(result.value.next);
    },
    [snapshot, opts.rng],
  );

  // ────────────────────────────────────────────────────────────────
  // K4 (#352) — Kether ritual adapter.
  //
  // Each ritual method has the same general shape: (1) compute the
  // implicit actor (current witness for play/pass, explicit playerId
  // for closure stage/unstage, current active player for confirm),
  // (2) call the engine reducer locally for the optimistic snapshot
  // update, (3) ONLY IF the local apply succeeds, dispatch the
  // matching K2 `ClientAction` for Realtime visibility.
  //
  // Order is local-apply-first-then-dispatch (post-#352 review fix).
  // The earlier draft dispatched first — meaning a stale-closure race
  // (two clients clicking simultaneously) would fire the wire even
  // when the engine would reject locally. Local-first means the wire
  // sees only the actions the local engine accepts; if the server's
  // engine rejects too (same engine, same state), the audit row is
  // still created server-side, but the client never sends an action
  // it knows is invalid.
  //
  // Hot-seat absence of `dispatchClientAction` short-circuits step (3);
  // the local reducer is the sole writer.
  // ────────────────────────────────────────────────────────────────

  const dispatch = opts.dispatchClientAction;
  const selfPlayerId = opts.selfPlayerId;

  // Runtime guard: when `dispatchClientAction` is provided, the caller
  // MUST also provide `selfPlayerId` — together they compose the
  // multiplayer mode. Without `selfPlayerId`, `thresholdConfirm` (and
  // any caller that needs an explicit actor identity) silently no-ops,
  // which is invisible to UI and would only surface as "the close
  // button does nothing" in production. Failing loud at construction
  // time catches a misconfigured options bag immediately.
  if (dispatch !== undefined && selfPlayerId === undefined) {
    throw new Error(
      'useTurn: opts.dispatchClientAction was provided without opts.selfPlayerId. ' +
        'Both fields together compose the multiplayer mode; without selfPlayerId, ' +
        'ritual methods like thresholdConfirm cannot determine the actor and ' +
        'would silently no-op. Pass both, or omit both for hot-seat.',
    );
  }

  const trialPointer = currentTrialPlayerId(state);

  const ketherTrialStageSpark = useCallback(
    (playerId: string, sefirah: SefirahKey): Result<GameState, KetherRejection> => {
      const result = engineTrialStageSpark(state, { playerId, sefirah });
      if (!result.ok) return result;
      setSnapshot({ state: result.value });
      if (dispatch !== undefined) {
        dispatch({ kind: 'kether-trial-stage-spark', playerId, sefirah });
      }
      return result;
    },
    [state, dispatch],
  );

  const ketherTrialUnstageSpark = useCallback(
    (playerId: string, sefirah: SefirahKey): Result<GameState, KetherRejection> => {
      const result = engineTrialUnstageSpark(state, { playerId, sefirah });
      if (!result.ok) return result;
      setSnapshot({ state: result.value });
      if (dispatch !== undefined) {
        dispatch({ kind: 'kether-trial-unstage-spark', playerId, sefirah });
      }
      return result;
    },
    [state, dispatch],
  );

  const ketherTrialResolve = useCallback((): Result<GameState, KetherRejection> | undefined => {
    const trialPlayer = currentTrialPlayerId(state);
    // In multiplayer the self player resolves only when it is their trial turn.
    // Returning `undefined` (not a rejection Result) matches the documented
    // contract: "undefined if no actor can be determined."
    if (dispatch !== undefined) {
      if (selfPlayerId === undefined || selfPlayerId !== trialPlayer) return undefined;
    }
    const actor = dispatch !== undefined ? selfPlayerId : trialPlayer;
    if (actor === undefined || actor === null) return undefined;
    const result = engineTrialResolve(state, { playerId: actor, rng: opts.rng });
    if (!result.ok) return result;
    setSnapshot({ state: result.value });
    if (dispatch !== undefined) {
      dispatch({ kind: 'kether-trial-resolve', playerId: actor });
    }
    return result;
  }, [state, dispatch, selfPlayerId, opts.rng]);

  const ketherCloseStageSpark = useCallback(
    (playerId: string, sefirah: SefirahKey): Result<GameState, KetherRejection> => {
      const result = ketherStageSpark(state, { playerId, sefirah });
      if (!result.ok) return result;
      setSnapshot({ state: result.value });
      if (dispatch !== undefined) {
        dispatch({
          kind: 'kether-close-stage-spark',
          playerId,
          sefirah,
        });
      }
      return result;
    },
    [state, dispatch],
  );

  const ketherCloseUnstageSpark = useCallback(
    (playerId: string, sefirah: SefirahKey): Result<GameState, KetherRejection> => {
      const result = ketherUnstageSpark(state, { playerId, sefirah });
      if (!result.ok) return result;
      setSnapshot({ state: result.value });
      if (dispatch !== undefined) {
        dispatch({
          kind: 'kether-close-unstage-spark',
          playerId,
          sefirah,
        });
      }
      return result;
    },
    [state, dispatch],
  );

  const thresholdConfirm = useCallback((): KetherConfirmResult | undefined => {
    // Implicit actor: multiplayer uses selfPlayerId; hot-seat uses
    // state.activePlayerId (the seat that pressed the confirm
    // button). Either is acceptable to the engine — `ketherConfirmClosure`
    // doesn't enforce a per-actor rule (any player can close, per
    // § 3.3); the playerId field is for audit/logging. The hook-init
    // guard above guarantees that when dispatch is set, selfPlayerId
    // is also set — so `actor` is never `undefined` in multiplayer
    // (the early-return below is hot-seat-only defense for an
    // engine-corrupted state with `activePlayerId` unset).
    const actor = dispatch !== undefined ? selfPlayerId : state.activePlayerId;
    if (actor === undefined) return undefined;
    const result = ketherConfirmClosure(state, { playerId: actor });
    if (!result.ok) return result;
    setSnapshot({ state: result.value });
    if (dispatch !== undefined) {
      dispatch({ kind: 'threshold-confirm', playerId: actor });
    }
    return result;
  }, [state, dispatch, selfPlayerId]);

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
      reactContinue,
      acceptChallengeSetback,
      discard,
      encounterBurnDiscard,
      giftTurn,
      giftTurnAcceptOverCap,
      refuseGiftTurn,
      endTurn,
      setState: replaceState,
      currentTrialPlayerId: trialPointer,
      ketherTrialStageSpark,
      ketherTrialUnstageSpark,
      ketherTrialResolve,
      ketherCloseStageSpark,
      ketherCloseUnstageSpark,
      thresholdConfirm,
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
      reactContinue,
      acceptChallengeSetback,
      discard,
      encounterBurnDiscard,
      giftTurn,
      giftTurnAcceptOverCap,
      refuseGiftTurn,
      endTurn,
      replaceState,
      trialPointer,
      ketherTrialStageSpark,
      ketherTrialUnstageSpark,
      ketherTrialResolve,
      ketherCloseStageSpark,
      ketherCloseUnstageSpark,
      thresholdConfirm,
    ],
  );
}
