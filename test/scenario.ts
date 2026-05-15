import type { SefirahKey } from '@/data';
import type { CheckModifiers, CheckOutcome } from '@/engine/checks';
import type { Rng } from '@/engine/rng';
import { seededRng } from '@/engine/rng';
import type { GameState } from '@/engine/types';
import { applyClientAction, type ClientAction } from '@/lib/room-actions';

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
    super(`scenario step ${stepIndex} failed: ${action.kind} → ${JSON.stringify(rejection)}`);
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
 * Internal queue entry — either a `ClientAction` ready to dispatch,
 * or a *translator* that needs the live state to expand into one or
 * more `ClientAction`s. Translators exist because
 * `submitChallenge(...)` accepts `CheckModifiers` (counts of cards /
 * sparks to burn) but the wire format requires per-modifier events
 * (specific arcanum / specific sefirah). The actual cards / sparks
 * to burn are picked from the active player's hand and `sparksHeld`
 * at dispatch time, since prior steps in the same scenario can
 * reshape both.
 */
type ScenarioStep =
  | { readonly kind: 'action'; readonly action: ClientAction }
  | {
      readonly kind: 'translator';
      readonly translate: (state: GameState) => readonly ClientAction[];
    };

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
  const queue: ScenarioStep[] = [];

  const builder: ScenarioBuilder = {
    move(playerId, pathNumber) {
      queue.push({
        kind: 'action',
        action: { kind: 'move', playerId, pathNumber },
      });
      return builder;
    },
    submitChallenge(playerId, sefirah, modifiers, outcome) {
      // The wire format dropped `submit-challenge` when #227 (E2)
      // wired the prep-stage `ClientAction` kinds end-to-end. This
      // builder method preserves its external signature by translating
      // `CheckModifiers` (counts) into the equivalent chain of
      // `prep-add-modifier` events (specific arcana / specific
      // sefirot) followed by a `prep-confirm`.
      //
      // The translation runs at *dispatch time* (`runWith`) — not at
      // chain time — because earlier steps in the same scenario can
      // reshape `player.hand` and `player.sparksHeld`, and we want
      // the burns to come off the live state.
      //
      // Caveat — `assistStats: readonly number[]` cannot be translated.
      // The wire format models assists as `{ kind: 'assist-request';
      // allyId }` (an ally id, not a stat number) so faking one from
      // a bare `number` would require manufacturing an ally. Pre-#227
      // review fix this method silently dropped non-empty `assistStats`,
      // which let a test pass with a misconfigured assist count and
      // assert against the wrong post-state. Throw loudly instead.
      if (modifiers.assistStats.length > 0) {
        throw new Error(
          'scenario.submitChallenge: assistStats are not supported via the ' +
            'scenario builder wire format. Stage assist-request modifiers ' +
            "explicitly via .action({ kind: 'prep-add-modifier', modifier: { kind: 'assist-request', allyId } })" +
            ' before calling .submitChallenge(...).',
        );
      }
      //
      // `shortcutPenalty` is also dropped from the wire-format chain:
      // E1's `prep-confirm` reducer recomputes it from
      // `state.lastShortcutArrival`, and the dispatcher does not let
      // the caller force it on the wire.
      queue.push({
        kind: 'translator',
        translate: (state) =>
          translateSubmitChallenge(state, playerId, sefirah, modifiers, outcome),
      });
      return builder;
    },
    acceptSetback(playerId, sefirah, shortcut) {
      queue.push({
        kind: 'action',
        action: {
          kind: 'accept-setback',
          playerId,
          sefirah,
          ...(shortcut !== undefined ? { shortcut } : {}),
        },
      });
      return builder;
    },
    endTurn(playerId) {
      queue.push({
        kind: 'action',
        action: { kind: 'end-turn', playerId },
      });
      return builder;
    },
    action(a) {
      queue.push({ kind: 'action', action: a });
      return builder;
    },
    run() {
      return builder.runWith(seededRng(0));
    },
    runWith(rng) {
      let state = initialState;
      let stepIndex = 0;
      for (const step of queue) {
        const actions: readonly ClientAction[] =
          step.kind === 'action' ? [step.action] : step.translate(state);
        for (const action of actions) {
          const result = applyClientAction(state, action, rng);
          if (!result.ok) {
            throw new ScenarioFailedError(stepIndex, action, result.error, state);
          }
          state = result.newState;
          stepIndex += 1;
        }
      }
      return state;
    },
  };

  return builder;
}

/**
 * Translate a legacy-shape `submitChallenge(...)` call into the
 * wire-format chain of prep-stage `ClientAction`s. Reads
 * `state.players[playerId].hand` for `cardBurns` and `.sparksHeld`
 * for `sparkBurns`, picking the first N entries in iteration order.
 * Iteration order is deterministic for `Set` (insertion order) which
 * is enough for the existing tests.
 *
 * Throws if the player isn't in `state` — the dispatcher would
 * surface this as `unknown-player` later, but raising here gives a
 * better stack trace tied to the scenario step that misconfigured.
 */
function translateSubmitChallenge(
  state: GameState,
  playerId: string,
  sefirah: SefirahKey,
  modifiers: CheckModifiers,
  outcome: CheckOutcome | undefined,
): readonly ClientAction[] {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error(`scenario.submitChallenge: player '${playerId}' not in state.players`);
  }
  const actions: ClientAction[] = [];
  for (let i = 0; i < modifiers.cardBurns; i++) {
    const arcanum = player.hand[i];
    if (arcanum === undefined) {
      throw new Error(
        `scenario.submitChallenge: player '${playerId}' has only ${player.hand.length} card(s) in hand but cardBurns=${modifiers.cardBurns}`,
      );
    }
    actions.push({
      kind: 'prep-add-modifier',
      playerId,
      modifier: { kind: 'card-burn', arcanum },
    });
  }
  if (modifiers.sparkBurns > 0) {
    const heldSparks = Array.from(player.sparksHeld);
    if (heldSparks.length < modifiers.sparkBurns) {
      throw new Error(
        `scenario.submitChallenge: player '${playerId}' holds only ${heldSparks.length} spark(s) but sparkBurns=${modifiers.sparkBurns}`,
      );
    }
    for (let i = 0; i < modifiers.sparkBurns; i++) {
      actions.push({
        kind: 'prep-add-modifier',
        playerId,
        modifier: {
          kind: 'spark-burn',
          sefirah: heldSparks[i]!,
          sourcePlayerId: playerId,
        },
      });
    }
  }
  actions.push({
    kind: 'prep-confirm',
    playerId,
    sefirah,
    ...(outcome !== undefined ? { outcome } : {}),
  });
  return actions;
}
