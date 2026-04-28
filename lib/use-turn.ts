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
import type { GameState, MoveRejection, Result } from '@/engine/types';
import {
  HAND_CAP as MACHINE_HAND_CAP,
  STARTING_HAND_SIZE as MACHINE_STARTING_HAND_SIZE,
  turnReducer,
  type TurnPhase,
  type TurnSnapshot,
} from './turn-machine';

/**
 * Turn-loop state machine driver. Thin React adapter over the pure
 * `turnReducer` in `./turn-machine.ts`. The reducer owns phase logic
 * and engine reducer calls; this file owns the React state.
 *
 * See `./turn-machine.ts` for the phase contract and event semantics.
 */

export type { TurnPhase } from './turn-machine';
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
  readonly isActive: (playerId: string) => boolean;
  readonly move: (pathNumber: number) => Result<GameState, MoveRejection>;
  readonly meditate: () => GameState;
  readonly submitChallenge: (
    sefirah: SefirahKey,
    modifiers: CheckModifiers,
    /**
     * UI-supplied pre-rolled outcome. Passed through to the reducer
     * which forwards to `resolveChallenge`; the engine uses it
     * instead of rolling again so the outcome the player saw IS the
     * outcome applied to state.
     */
    outcome?: CheckOutcome,
  ) => Result<ChallengeSuccess, ChallengeRejection>;
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
    state: opts.initialState,
    phase: 'move',
  }));

  const { state, phase } = snapshot;

  const activePlayerIndex = state.players.findIndex(
    (p) => p.id === state.activePlayerId,
  );

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

  const submitChallenge = useCallback(
    (
      sefirah: SefirahKey,
      modifiers: CheckModifiers,
      outcome?: CheckOutcome,
    ): Result<ChallengeSuccess, ChallengeRejection> => {
      const result = turnReducer(
        snapshot,
        {
          kind: 'submit-challenge',
          sefirah,
          modifiers,
          ...(outcome !== undefined ? { outcome } : {}),
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
      // submit-challenge (see turn-machine.ts:submit-challenge case);
      // if it's ever missing the snapshot is in a half-applied state
      // we shouldn't commit to React. Reviewer caught the original
      // ordering on #106.
      const challenge = result.value.meta?.challenge;
      if (!challenge) {
        return { ok: false, reason: SYNTHETIC_CHALLENGE_REJECTION };
      }
      setSnapshot(result.value.next);
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
      isActive,
      move,
      meditate,
      submitChallenge,
      acceptChallengeSetback,
      draw,
      endTurn,
      setState: replaceState,
    }),
    [
      state,
      activePlayerIndex,
      phase,
      isActive,
      move,
      meditate,
      submitChallenge,
      acceptChallengeSetback,
      draw,
      endTurn,
      replaceState,
    ],
  );
}
