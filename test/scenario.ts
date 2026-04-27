import type { SefirahKey } from '@/data';
import type { CheckModifiers, CheckOutcome } from '@/engine/checks';
import type { Rng } from '@/engine/rng';
import { seededRng } from '@/engine/rng';
import type { GameState } from '@/engine/types';
import {
  applyClientAction,
  type ClientAction,
} from '@/lib/room-actions';

/**
 * Scenario builder — fluent helper for tests that need to drive a
 * sequence of `ClientAction`s through `applyClientAction` and assert
 * on the final state.
 *
 * Uses the same dispatcher the multiplayer events route uses, so
 * scenario tests exercise the production code path: any divergence
 * between the engine's reducers and the route surface fails here.
 *
 * Usage:
 *   const final = scenario(initialState)
 *     .move('p1', 13)
 *     .submitChallenge('p1', 'tiferet', mods, outcome)
 *     .endTurn('p1')
 *     .run();
 *   expect(final.activePlayerId).toBe('p2');
 *
 * On rejection, throws `ScenarioFailedError` with the failing step
 * index, the action that was rejected, the engine's rejection reason,
 * and the state at the moment of rejection.
 */

export class ScenarioFailedError extends Error {
  /**
   * Snapshot of the state at the moment of rejection. This is a
   * `structuredClone` of the engine's state — NOT a live reference —
   * so a caller introspecting `e.stateAtFailure` cannot accidentally
   * mutate the engine's working state. Sets/Maps in `GameState` are
   * cloned correctly by `structuredClone`.
   */
  public readonly stateAtFailure: GameState;

  constructor(
    public readonly stepIndex: number,
    public readonly action: ClientAction,
    public readonly rejection: unknown,
    stateAtFailure: GameState,
  ) {
    super(
      `scenario step ${stepIndex} failed: ${action.kind} → ${JSON.stringify(rejection)}`,
    );
    this.name = 'ScenarioFailedError';
    this.stateAtFailure = structuredClone(stateAtFailure);
  }
}

export interface ScenarioBuilder {
  readonly move: (playerId: string, pathNumber: number) => ScenarioBuilder;
  readonly submitChallenge: (
    playerId: string,
    sefirah: SefirahKey,
    modifiers: CheckModifiers,
    outcome?: CheckOutcome,
  ) => ScenarioBuilder;
  readonly acceptSetback: (
    playerId: string,
    sefirah: SefirahKey,
    shortcut?: boolean,
  ) => ScenarioBuilder;
  readonly endTurn: (playerId: string) => ScenarioBuilder;
  readonly action: (a: ClientAction) => ScenarioBuilder;
  /** Execute the queued actions and return the final state. */
  readonly run: () => GameState;
  /** Like `run`, but uses the supplied RNG instead of a default seeded one. */
  readonly runWith: (rng: Rng) => GameState;
}

/**
 * Build a scenario starting from `initialState`. Each chained method
 * appends a `ClientAction`; `.run()` folds them through
 * `applyClientAction` in order and returns the final state.
 *
 * `.run()` uses a deterministic seeded RNG (seed 0) so scenarios are
 * repeatable. `.runWith(rng)` lets a test inject a different RNG.
 *
 * Caveat: every call to `.run()` constructs a fresh RNG at seed 0,
 * so any scenario that relies on RNG rolls (e.g. `submitChallenge`
 * without an explicit `outcome`) will produce the same outcome every
 * time. That is good for repeatability but bad for branch coverage —
 * a single seed exercises one path through the random surface. Use
 * `.runWith(seededRng(n))` with varied seeds for property-style
 * coverage, or pass an explicit `outcome` on each challenge to make
 * the test deterministic on intent rather than RNG.
 */
export function scenario(initialState: GameState): ScenarioBuilder {
  const queue: ClientAction[] = [];

  const builder: ScenarioBuilder = {
    move(playerId, pathNumber) {
      queue.push({ kind: 'move', playerId, pathNumber });
      return builder;
    },
    submitChallenge(playerId, sefirah, modifiers, outcome) {
      queue.push({
        kind: 'submit-challenge',
        playerId,
        sefirah,
        modifiers,
        ...(outcome !== undefined ? { outcome } : {}),
      });
      return builder;
    },
    acceptSetback(playerId, sefirah, shortcut) {
      queue.push({
        kind: 'accept-setback',
        playerId,
        sefirah,
        ...(shortcut !== undefined ? { shortcut } : {}),
      });
      return builder;
    },
    endTurn(playerId) {
      queue.push({ kind: 'end-turn', playerId });
      return builder;
    },
    action(a) {
      queue.push(a);
      return builder;
    },
    run() {
      return builder.runWith(seededRng(0));
    },
    runWith(rng) {
      let state = initialState;
      for (let i = 0; i < queue.length; i++) {
        const action = queue[i]!;
        const result = applyClientAction(state, action, rng);
        if (!result.ok) {
          throw new ScenarioFailedError(i, action, result.error, state);
        }
        state = result.newState;
      }
      return state;
    },
  };

  return builder;
}
