'use client';
import { useCallback, useMemo, useState } from 'react';
import { sefirahByKey } from '@/data';
import type { SefirahKey } from '@/data';
import { applyMove } from '@/engine/movement';
import { acceptSetback, resolveChallenge } from '@/engine/checks';
import type {
  CheckModifiers,
  CheckOutcome,
  ChallengeRejection,
  ChallengeSuccess,
} from '@/engine/checks';
import type { Rng } from '@/engine/rng';
import type { GameState, MoveRejection, Result } from '@/engine/types';

/**
 * Turn-loop state machine driver.
 *
 * Phases per turn:
 *   1. `move`      — active player moves (play arcanum to travel path)
 *                    or meditates (skip movement, draw 2 cards).
 *   2. `challenge` — only entered if the new position is an uncleared
 *                    Sefirah with a `'check'` challenge. Malkuth's
 *                    `'no-check'` and Kether's `'collective'` are
 *                    skipped. Cleared Sefirot are skipped.
 *   3. `draw`      — refill toward 4 cards (capped at 6). If the
 *                    deck is empty, recycle the discard pile.
 *   4. `end`       — advance to next player; phase resets to 'move'.
 *
 * The hook is a thin pure-state machine on top of the engine. It
 * does not own GameState — the orchestrator passes the latest
 * snapshot via `setState`. This keeps the hook composable with
 * server-pushed state in Phase 5 multiplayer.
 *
 * Ownership: only the active player may dispatch `move`, `meditate`,
 * `submitChallenge`, `draw`, `endTurn`. The hook surfaces an
 * `isActive(playerId)` helper so consumers can disable controls.
 */

export type TurnPhase = 'move' | 'challenge' | 'draw' | 'end';

export const STARTING_HAND_SIZE = 4;
export const HAND_CAP = 6;

interface UseTurnOptions {
  readonly initialState: GameState;
  /** Index into `state.players`; defaults to 0. */
  readonly initialActiveIndex?: number;
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
     * UI-supplied pre-rolled outcome. Passed through to
     * `resolveChallenge`; the engine uses it instead of rolling
     * again so the outcome the player saw IS the outcome applied
     * to state.
     */
    outcome?: CheckOutcome,
  ) => Result<ChallengeSuccess, ChallengeRejection>;
  /**
   * Apply the engine's failure-acceptance cost (Separation +1, or
   * +2 on shortcut arrivals) and advance the phase to 'draw'
   * atomically. Replaces the prior pattern of the orchestrator
   * calling `setState(acceptSetback(...))` then `submitChallenge` —
   * those two calls landed in the same React batch, and
   * `submitChallenge`'s internal `setState(unchanged)` overwrote
   * the setback. One atomic action removes that race.
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

export function useTurn(opts: UseTurnOptions): UseTurnReturn {
  const [state, setState] = useState<GameState>(opts.initialState);
  const [activePlayerIndex, setActivePlayerIndex] = useState(
    opts.initialActiveIndex ?? 0,
  );
  const [phase, setPhase] = useState<TurnPhase>('move');

  const isActive = useCallback(
    (playerId: string) =>
      state.players[activePlayerIndex]?.id === playerId,
    [state.players, activePlayerIndex],
  );

  const activePlayer = state.players[activePlayerIndex];

  const move = useCallback(
    (pathNumber: number): Result<GameState, MoveRejection> => {
      if (phase !== 'move' || !activePlayer) {
        return {
          ok: false,
          reason: { kind: 'unknown-player', playerId: activePlayer?.id ?? '' },
        };
      }
      const result = applyMove(state, activePlayer.id, pathNumber);
      if (!result.ok) return result;
      setState(result.value);
      // After moving, decide whether to enter `challenge` or jump to
      // `draw`. We re-read from the new state because `applyMove`
      // updated the player's position.
      const movedPlayer = result.value.players[activePlayerIndex];
      if (!movedPlayer) {
        setPhase('draw');
        return result;
      }
      const arrival = sefirahByKey(movedPlayer.position);
      const alreadyCleared = movedPlayer.clearedSefirot.has(movedPlayer.position);
      if (arrival.challenge.kind === 'check' && !alreadyCleared) {
        setPhase('challenge');
      } else {
        setPhase('draw');
      }
      return result;
    },
    [phase, state, activePlayer, activePlayerIndex],
  );

  const meditate = useCallback((): GameState => {
    if (phase !== 'move' || !activePlayer) return state;
    // Meditate: skip movement, take an extra draw boost. We jump
    // straight to the `draw` phase; the actual extra cards are
    // dispensed there with an inflated target.
    setPhase('draw');
    return state;
  }, [phase, state, activePlayer]);

  const submitChallenge = useCallback(
    (
      sefirah: SefirahKey,
      modifiers: CheckModifiers,
      outcome?: CheckOutcome,
    ): Result<ChallengeSuccess, ChallengeRejection> => {
      if (phase !== 'challenge' || !activePlayer) {
        return {
          ok: false,
          reason: { kind: 'unknown-player', playerId: activePlayer?.id ?? '' },
        };
      }
      const result = resolveChallenge({
        state,
        playerId: activePlayer.id,
        sefirah,
        modifiers,
        rng: opts.rng,
        ...(outcome !== undefined ? { outcome } : {}),
      });
      if (!result.ok) return result;
      setState(result.value.newState);
      // On pass: state changed, advance to draw. On fail: state
      // unchanged; the caller should NOT use submitChallenge for
      // the accept path — use `acceptChallengeSetback` instead so
      // the setback's separation tick lands atomically with the
      // phase advance. Calling submitChallenge after acceptSetback
      // would overwrite the setback in the same React batch.
      setPhase('draw');
      return result;
    },
    [phase, state, activePlayer, opts.rng],
  );

  const acceptChallengeSetbackFn = useCallback(
    (input: { readonly sefirah: SefirahKey; readonly shortcut?: boolean }): GameState => {
      if (phase !== 'challenge' || !activePlayer) return state;
      const next = acceptSetback(state, {
        playerId: activePlayer.id,
        sefirah: input.sefirah,
        shortcut: input.shortcut ?? false,
      });
      setState(next);
      setPhase('draw');
      return next;
    },
    [phase, state, activePlayer],
  );

  const draw = useCallback((): GameState => {
    if (phase !== 'draw' || !activePlayer) return state;
    // Refill to STARTING_HAND_SIZE, capped at HAND_CAP. If draw
    // pile empties mid-fill, recycle the discard pile face-down
    // first.
    let working = state;
    const pIndex = activePlayerIndex;
    let pHand = working.players[pIndex]?.hand ?? [];
    let deck = working.deck;
    let discard = working.discardPile;
    while (pHand.length < STARTING_HAND_SIZE && pHand.length < HAND_CAP) {
      if (deck.length === 0) {
        if (discard.length === 0) break; // truly stranded
        // Recycle: shuffle is irrelevant here for a deterministic
        // single-player flow; engine-level reshuffle would call into
        // a Fisher-Yates with the session Rng. For now, take the
        // discard pile as-is so the tests are deterministic without
        // a coupled shuffle dependency.
        deck = [...discard];
        discard = [];
      }
      const top = deck[0];
      if (top === undefined) break;
      pHand = [...pHand, top];
      deck = deck.slice(1);
    }
    const updatedPlayer = working.players[pIndex];
    if (updatedPlayer) {
      const newPlayers = working.players.map((p, idx) =>
        idx === pIndex ? { ...updatedPlayer, hand: pHand } : p,
      );
      working = {
        ...working,
        players: newPlayers,
        deck,
        discardPile: discard,
      };
    }
    setState(working);
    setPhase('end');
    return working;
  }, [phase, state, activePlayer, activePlayerIndex]);

  const endTurn = useCallback((): void => {
    if (phase !== 'end') return;
    setActivePlayerIndex((i) => (i + 1) % state.players.length);
    setPhase('move');
  }, [phase, state.players.length]);

  const replaceState = useCallback((s: GameState): void => {
    setState(s);
  }, []);

  return useMemo(
    () => ({
      state,
      activePlayerIndex,
      phase,
      isActive,
      move,
      meditate,
      submitChallenge,
      acceptChallengeSetback: acceptChallengeSetbackFn,
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
      acceptChallengeSetbackFn,
      meditate,
      submitChallenge,
      draw,
      endTurn,
      replaceState,
    ],
  );
}
