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
import { discard as discardReducer, endTurn as endTurnReducer } from '@/engine/turn';
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
      /**
       * Hot-seat compatibility hatch (#229 / E4). When set, the
       * reducer ignores any `assistRequests` staged in
       * `state.pendingModifiers` and feeds these full ally stat
       * values straight into `CheckModifiers.assistStats`. The engine
       * halves (floors) and sums them as usual.
       *
       * Why: the hot-seat `submitChallenge` wrapper in `useTurn`
       * receives a pre-built `CheckModifiers.assistStats: number[]`
       * from `ChallengeModal`, which has lost the originating ally
       * IDs by the time it reaches the wrapper. Synthesizing fake
       * `assist-request` events would re-translate via player stats
       * and (in the absence of ally IDs) could not reproduce the
       * exact numbers the modal showed the player. This override
       * preserves the modal-as-source-of-truth invariant.
       *
       * Multiplayer / `EncounterScreen` (E3) uses staged
       * `assist-request`s and MUST NOT pass this field — staged
       * assists are the multiplayer-coordination affordance.
       */
      readonly directAssistStats?: readonly number[];
      /**
       * Hot-seat-only override. The hot-seat wrapper (`useTurn.submitChallenge`)
       * receives `shortcutPenalty` from the modal but cannot stage it through
       * a `prep-add-modifier` event — `pendingModifiers` has no shortcut-state
       * field. Multiplayer / `EncounterScreen` callers MUST NOT pass this; the
       * shortcut-state lives elsewhere on `GameState` and (TBD) will be derived
       * by the reducer when the prep-stage UI grows a "I took a shortcut" affordance.
       */
      readonly shortcutPenalty?: boolean;
    }
  | { readonly kind: 'react-retry' }
  | {
      readonly kind: 'accept-setback';
      readonly sefirah: SefirahKey;
      readonly shortcut?: boolean;
    }
  | { readonly kind: 'draw' }
  | {
      /**
       * #291: shed one card from the active player's hand. Sent by
       * the UI's DiscardPrompt when the active player has just
       * meditated over `HAND_CAP` and now owes a trim. The reducer
       * routes through `engine/turn.ts:discard`, which decrements
       * `state.pendingDiscard.count` and clears the field when count
       * reaches 0. Phase stays `'end'` — the player is still in the
       * end of their turn; only their hand needs reconciling.
       */
      readonly kind: 'discard';
      readonly arcanum: number;
    }
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
  | { readonly kind: 'card-not-in-hand'; readonly arcanum: number }
  | {
      readonly kind: 'spark-not-held';
      readonly sefirah: SefirahKey;
      readonly sourcePlayerId: string;
    }
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
 * AND determine which arcana / sparks to consume from the challenger's
 * hand / sparksHeld at confirm time (#281). Validation that the
 * staged item is still available is done up-front; assists may be
 * dropped if the ally has moved off-Sefirah.
 *
 * Cumulative-on-retry semantic (#281). On a failed prep-confirm the
 * staged burns persist into the next prep — the player sees "3 cards
 * burned, +9 modifier" and decides whether to stack more. Those
 * already-consumed cards are no longer in `challenger.hand`, but they
 * still count toward the `CheckModifiers.cardBurns` total because
 * design § 6 says retry burns are cumulative. They are NOT re-consumed
 * (caller filters the consume-list to in-hand entries only) and NOT
 * surfaced as `dropped` (an absence-from-hand at confirm time means
 * the engine already paid for that burn on a prior failed roll, not
 * that the player is bluffing). The same logic applies to sparks.
 *
 * Surviving assist-requests are translated into the ally's stat keyed
 * to the challenged Sefirah; the engine then halves (rounded down)
 * when summing.
 *
 * Returns the `CheckModifiers`, the assist drops (the only drop kind
 * we still surface), and ordered lists of arcana / sparks for the
 * `prep-confirm` reducer case to consume from state.
 */
function translatePendingModifiers(
  state: GameState,
  challenger: GameState['players'][number],
  sefirah: SefirahKey,
): {
  readonly modifiers: CheckModifiers;
  readonly dropped: readonly PrepModifier[];
  /** Arcana to remove from `challenger.hand` and append to `discardPile`. */
  readonly cardsToConsume: readonly number[];
  /** Sparks to remove from each source player's `sparksHeld`. */
  readonly sparksToConsume: readonly {
    readonly sefirah: SefirahKey;
    readonly sourcePlayerId: string;
  }[];
} {
  const pending = state.pendingModifiers;
  const sefirahRecord = sefirahByKey(sefirah);
  const dropped: PrepModifier[] = [];

  // card-burn: cumulative count credited (length of staged list); only
  // entries still in hand are queued for consumption. Track which
  // arcanum-numbers have already "consumed" a hand slot so two staged
  // copies of the same card don't both consume when the player only
  // has one in hand.
  const cardBurns = pending.cardBurns.length;
  const cardsToConsume: number[] = [];
  const handByArcanum = new Map<number, number>();
  for (const card of challenger.hand) {
    handByArcanum.set(card, (handByArcanum.get(card) ?? 0) + 1);
  }
  for (const arcanum of pending.cardBurns) {
    const remaining = handByArcanum.get(arcanum) ?? 0;
    if (remaining > 0) {
      cardsToConsume.push(arcanum);
      handByArcanum.set(arcanum, remaining - 1);
    }
    // else: previously consumed by a prior failed prep-confirm. Still
    // counts toward `cardBurns` (cumulative), not consumed again, not
    // surfaced as `dropped`. See JSDoc above.
  }

  // spark-burn: same shape as card-burn (cumulative count, consume
  // only those still held). Track per-source ledger so two staged
  // copies of the same (sefirah, sourcePlayerId) don't both consume
  // when the source only holds the spark once.
  const sparkBurns = pending.sparkBurns.length;
  const sparksToConsume: { readonly sefirah: SefirahKey; readonly sourcePlayerId: string }[] = [];
  const sparkLedger = new Map<string, Set<SefirahKey>>();
  for (const burn of pending.sparkBurns) {
    let held = sparkLedger.get(burn.sourcePlayerId);
    if (held === undefined) {
      const source = state.players.find((p) => p.id === burn.sourcePlayerId);
      held = new Set(source?.sparksHeld ?? []);
      sparkLedger.set(burn.sourcePlayerId, held);
    }
    if (held.has(burn.sefirah)) {
      sparksToConsume.push({ sefirah: burn.sefirah, sourcePlayerId: burn.sourcePlayerId });
      held.delete(burn.sefirah);
    }
    // else: previously consumed (retry semantic, mirrors cards above).
  }

  // assist-request: ally must still be alive (currently always — no
  // death yet) and stand at the same Sefirah as the challenger.
  // Translate to ½ ally stat (the engine floors when summing).
  // Drops are still surfaced — assist drops have no consumption side
  // effect to confuse and "ally walked off" is a real UX-relevant
  // event ("your assist went away because Bea moved").
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
  return { modifiers, dropped, cardsToConsume, sparksToConsume };
}

/**
 * Apply the consumption side of a `prep-confirm` (#281). Removes the
 * named arcana from the challenger's `hand` (one arcanum per match,
 * earliest occurrence first) and appends them to `discardPile`.
 * Removes the named sparks from each source player's `sparksHeld`.
 *
 * Pure — returns a new `GameState`. Never mutates input. If the
 * to-consume lists are empty, returns `state` unchanged (same
 * reference) so callers don't pay for a no-op rebuild.
 */
function consumeBurns(
  state: GameState,
  challengerId: string,
  cardsToConsume: readonly number[],
  sparksToConsume: readonly { readonly sefirah: SefirahKey; readonly sourcePlayerId: string }[],
): GameState {
  if (cardsToConsume.length === 0 && sparksToConsume.length === 0) {
    return state;
  }

  // Card consumption: remove from challenger.hand, append to
  // discardPile. Multi-pass over the same hand because we may need
  // to remove multiple arcana — splicing one at a time keeps the
  // "earliest occurrence" semantic for repeated arcana.
  let updatedPlayers = state.players;
  let updatedDiscard = state.discardPile;
  if (cardsToConsume.length > 0) {
    const challenger = updatedPlayers.find((p) => p.id === challengerId);
    if (challenger) {
      const newHand = [...challenger.hand];
      for (const arcanum of cardsToConsume) {
        const idx = newHand.indexOf(arcanum);
        if (idx >= 0) newHand.splice(idx, 1);
      }
      updatedPlayers = updatedPlayers.map((p) =>
        p.id === challengerId ? { ...p, hand: newHand } : p,
      );
      updatedDiscard = [...updatedDiscard, ...cardsToConsume];
    }
  }

  // Spark consumption: remove from sparksHeld; append to spentSparks.
  // Mirrors the endgame spark-spent flow (engine/endgame.ts) so
  // Illumination tracking (cleared+spent counts) remains consistent.
  // Note we do NOT emit a `spark-spent` event for the +1 Illumination
  // delta — challenge spark burns are a stat-check spend, not a Final
  // Threshold spend, and design/mechanics.md doesn't credit them with
  // an Illumination tick. (The challenge already grants +1 on pass via
  // `spark-earned`; double-crediting via `spark-spent` would be wrong.)
  let updatedSpentSparks = state.spentSparks;
  if (sparksToConsume.length > 0) {
    for (const burn of sparksToConsume) {
      const source = updatedPlayers.find((p) => p.id === burn.sourcePlayerId);
      if (!source) continue;
      const newSparksHeld = new Set(source.sparksHeld);
      newSparksHeld.delete(burn.sefirah);
      updatedPlayers = updatedPlayers.map((p) =>
        p.id === burn.sourcePlayerId ? { ...p, sparksHeld: newSparksHeld } : p,
      );
      updatedSpentSparks = [
        ...updatedSpentSparks,
        { playerId: burn.sourcePlayerId, sefirah: burn.sefirah },
      ];
    }
  }

  return {
    ...state,
    players: updatedPlayers,
    discardPile: updatedDiscard,
    spentSparks: updatedSpentSparks,
  };
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
      // Meditate is a complete turn-action that draws 2 cards — see
      // `design/mechanics.md` § Drawing & gift handling. Skips the
      // 'draw' phase entirely: with no card played, there's nothing
      // to replenish. Surfaced by the 2026-04-27 hot-seat playtest
      // (#128) — players hit Meditate, landed in 'draw' phase, hit
      // Draw, and saw no change because `drawToHand` only refilled
      // toward STARTING_HAND_SIZE which they already had.
      //
      // #291: meditate ALWAYS draws MEDITATE_DRAW (no hand-full
      // rejection). When the post-draw hand is over HAND_CAP, the
      // reducer sets `pendingDiscard` to the over-cap excess; the
      // engine's `endTurn` then refuses to advance the seat until
      // the active player has shed those cards via `discard` events.
      // This is the fix for the Meditate-at-cap softlock: the player
      // who has no usable paths can now Meditate for new cards and
      // pay the cost as an end-of-turn trim.
      const drewState = drawNCards(state, player.id, MEDITATE_DRAW, HAND_CAP, rng, {
        overCap: true,
      });
      const drewPlayer = drewState.players.find((p) => p.id === player.id);
      const overCap = Math.max(0, (drewPlayer?.hand.length ?? 0) - HAND_CAP);
      const nextState: GameState = {
        ...drewState,
        phase: 'end',
        pendingDiscard:
          overCap > 0
            ? { count: overCap, requiredBy: 'end-of-turn' }
            : undefined,
        // #292: stamp the end-phase entry so PlayScreen's auto-advance
        // timer can suppress for Meditate (player needs time to read
        // the cards they just drew) while still firing for Move + Draw.
        lastAction: 'meditate',
      };
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
        case 'card-burn': {
          // #281 trust boundary: the staged arcanum must be in the
          // active player's hand right now AND not over-staged. The
          // confirm-time path treats absent-from-hand entries as
          // "previously consumed by a failed roll" (cumulative retry
          // semantic), which is correct for cards that were validated
          // when first staged. Without this stage-time check, a
          // fabricated arcanum (never in hand) would slip through the
          // retry inference and silently inflate the d20 modifier.
          const arcanum = event.modifier.arcanum;
          const heldCount = player.hand.filter((c) => c === arcanum).length;
          const alreadyStaged = pending.cardBurns.filter(
            (c) => c === arcanum,
          ).length;
          if (alreadyStaged >= heldCount) {
            return {
              ok: false,
              reason: { kind: 'card-not-in-hand', arcanum },
            };
          }
          nextPending = {
            ...pending,
            cardBurns: [...pending.cardBurns, arcanum],
          };
          break;
        }
        case 'spark-burn': {
          // #281 trust boundary: same shape as card-burn. The (sefirah,
          // sourcePlayerId) slot is binary (held or not), so "already
          // staged" is enough to reject — no second copy can be
          // legitimately added.
          const { sefirah: spkSefirah, sourcePlayerId } = event.modifier;
          const source = state.players.find((p) => p.id === sourcePlayerId);
          const sourceHolds = source?.sparksHeld.has(spkSefirah) ?? false;
          const alreadyStaged = pending.sparkBurns.some(
            (b) =>
              b.sourcePlayerId === sourcePlayerId && b.sefirah === spkSefirah,
          );
          if (!sourceHolds || alreadyStaged) {
            return {
              ok: false,
              reason: {
                kind: 'spark-not-held',
                sefirah: spkSefirah,
                sourcePlayerId,
              },
            };
          }
          nextPending = {
            ...pending,
            sparkBurns: [
              ...pending.sparkBurns,
              { sefirah: spkSefirah, sourcePlayerId },
            ],
          };
          break;
        }
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
      const {
        modifiers: translated,
        dropped,
        cardsToConsume,
        sparksToConsume,
      } = translatePendingModifiers(state, player, event.sefirah);
      // Hot-seat override (#229 / E4). When `directAssistStats` is
      // supplied, replace the translated assistStats wholesale —
      // staged `assist-request`s are silently dropped from the
      // assist contribution. See the JSDoc on the `prep-confirm`
      // event variant for the full rationale.
      let modifiers: CheckModifiers =
        event.directAssistStats !== undefined
          ? { ...translated, assistStats: event.directAssistStats }
          : translated;
      // Hot-seat override (#229 / E4). The wrapper learns
      // `shortcutPenalty` from the modal but `pendingModifiers` has no
      // field to stage it on, so the only way to get it through is an
      // event-level override. Multiplayer must not pass this; it will
      // be derived from `GameState` once the prep-stage UI grows a
      // "I took a shortcut" affordance.
      if (event.shortcutPenalty !== undefined) {
        modifiers = { ...modifiers, shortcutPenalty: event.shortcutPenalty };
      }
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
      // #281: consume the staged cards / sparks. Sunk-cost — burns are
      // paid whether the roll passes or fails (design § "Card burn":
      // "the card goes to discard"). Consume on top of the engine's
      // resolved state so pass-side mutations (Sefirah cleared,
      // sparksHeld += new spark) compose with the consumption (hand
      // shrinks by the burned arcana). On a retry-and-confirm, the
      // already-consumed cards are NOT in `cardsToConsume`
      // (translatePendingModifiers filters to in-hand entries).
      const consumed = consumeBurns(
        result.value.newState,
        player.id,
        cardsToConsume,
        sparksToConsume,
      );
      const baseState = passed
        ? { ...consumed, pendingModifiers: EMPTY_PENDING_MODIFIERS }
        : consumed;
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
      const stateAfter: GameState = {
        ...drewState,
        phase: 'end',
        // #292: tag the Move + Draw arrival in 'end' so PlayScreen's
        // auto-advance timer fires (the canonical #131 cadence). The
        // sibling Meditate case stamps `'meditate'` instead, which the
        // UI gates the timer on.
        lastAction: 'move-draw',
      };
      return { ok: true, value: { next: { state: stateAfter } } };
    }

    case 'discard': {
      // #291: shed one over-cap card. The active player must clear
      // pendingDiscard.count before endTurn will advance the seat.
      // No phase guard beyond "active player exists" — the only path
      // that sets pendingDiscard today is meditate-at-cap which lands
      // in `'end'`, but a future ticket could legitimately fire a
      // discard mid-turn (e.g. a Yesod ability that prunes a card),
      // so the reducer is permissive here. The engine's `discard`
      // is itself defensive (no-op if the card isn't in hand).
      const after = discardReducer(state, player.id, event.arcanum);
      return { ok: true, value: { next: { state: after } } };
    }

    case 'end-turn': {
      if (phase !== 'end') {
        return { ok: false, reason: { kind: 'wrong-phase', expected: 'end', actual: phase } };
      }
      // #291: if pendingDiscard.count > 0 the engine's endTurn refuses
      // to advance the seat (returns input state unchanged). Detect
      // that no-op here and fold the unchanged-state into a
      // `phase: 'end'` snapshot so the UI keeps rendering the
      // DiscardPrompt over an `end` phase rather than slipping back
      // to `move` for the same player.
      const turned = endTurnReducer(state);
      if (turned === state) {
        return { ok: true, value: { next: { state: turned } } };
      }
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
