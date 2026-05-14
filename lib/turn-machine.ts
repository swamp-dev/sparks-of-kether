import { isPathShortcut, sefirahByKey } from '@/data';
import type { Pillar, SefirahKey } from '@/data';
import { applyMove } from '@/engine/movement';
import { isKetherHeld, maybeTriggerKetherRitual } from '@/engine/kether';
import {
  acceptSetback,
  resolveChallenge,
  type ChallengeRejection,
  type ChallengeSuccess,
  type CheckModifiers,
} from '@/engine/checks';
import { seededRng, type Rng } from '@/engine/rng';
import {
  drawNCards,
  drawToHand,
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
 *   move      — player can `move` (apply path) or `meditate`. After
 *               `meditate` the player remains in `'move'` (#503) so
 *               they may still play a card; the once-per-turn cap is
 *               enforced by `state.meditatedThisTurn`.
 *   challenge — entered after `move` lands on an uncleared `'check'`
 *               Sefirah. Internally cycles three sub-phases:
 *                 prep    — player stages modifiers (card-burn, spark-burn,
 *                           assist-request) into `state.pendingModifiers`.
 *                 resolve — kernel call: `prep-confirm` event invokes
 *                           `engine/checks.ts:resolveChallenge`.
 *                 react   — post-roll outcome visible. On pass the
 *                           player fires `react-continue` to land in
 *                           `'end'`; on fail the player chooses
 *                           `react-retry` (loops back to prep,
 *                           preserving cumulative card-burns) or
 *                           `accept-setback` (Separation +1, phase →
 *                           `'end'`).
 *               See `design/encounter-prep-phase.md` for the full split.
 *   end       — advance to next player; phase resets to `move`. The
 *               start-of-turn refill toward `STARTING_HAND_SIZE`
 *               (capped at `HAND_CAP`) fires inside the `end-turn`
 *               handler — the next active player begins their turn
 *               with a fresh hand. Pre-#502 a discrete `'draw'` phase
 *               sat between `move`/`challenge` and `end`; that phase
 *               was removed when the refill moved to start-of-turn.
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
 *
 * #334 (`design/per-sefirah-mechanics.md` § 2.7) extended this union
 * with four per-Sefirah variants — `name-card` (Hod), `gift-card`
 * (Chesed), `declare-desire` (Netzach), `dream-guess` (Yesod). The
 * reducer accepts and removes them via the same shape; the actual
 * mechanic logic (Word-Match scoring, gift transfer, desire
 * stat-bonus, dream comparison) is downstream surface that ships in
 * separate per-Sefirah tickets. Per § 2.7 "Consumption note", the
 * `name-card` and `dream-guess` variants are consumed at
 * `prep-confirm` regardless of pass/fail — distinct from card-burn
 * which is cumulative on retry; this ticket lands the clear-on-
 * confirm semantic for all four new variants.
 */
export type PrepModifier =
  | { readonly kind: 'card-burn'; readonly arcanum: number }
  | {
      readonly kind: 'spark-burn';
      readonly sefirah: SefirahKey;
      readonly sourcePlayerId: string;
    }
  | { readonly kind: 'assist-request'; readonly allyId: string }
  | {
      /** Hod Word-Match (§ 3.1). Equality field for remove: `arcanum`. */
      readonly kind: 'name-card';
      readonly arcanum: number;
    }
  | {
      /**
       * Chesed Overflow (§ 3.3). Equality fields for remove:
       * `arcanum` AND `recipientId` (a player can stage two gifts of
       * the same arcanum to different recipients).
       */
      readonly kind: 'gift-card';
      readonly arcanum: number;
      readonly recipientId: string;
    }
  | {
      /**
       * Netzach Declared Desire (§ 3.5). Equality field for remove:
       * `sefirah`. Permanent run-wide vow (one per run); the
       * downstream Netzach ticket writes it to `PlayerState`.
       */
      readonly kind: 'declare-desire';
      readonly sefirah: SefirahKey;
    }
  | {
      /**
       * Yesod Dream-Peek (§ 3.6). Equality field for remove: `pillar`.
       * Compared against `state.encounter.dreamPillar` at confirm time
       * by the downstream Yesod ticket.
       */
      readonly kind: 'dream-guess';
      readonly pillar: Pillar;
    };

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
    }
  | { readonly kind: 'react-retry' }
  | {
      /**
       * #385: pass-path counterpart to `accept-setback`. From the
       * `react` sub-phase with `lastOutcome.pass === true`, advance
       * phase → `'end'` and clear all challenge machinery
       * (`pendingModifiers`, `challengeSubPhase`, `lastOutcome`,
       * `encounter`). The fail path uses `accept-setback` (which
       * additionally ticks Separation and rolls back position on a
       * shortcut); the pass path has no extra cost — the win was
       * recorded at `prep-confirm` (Sefirah cleared, +1 Illumination).
       *
       * Pre-#385 the engine had no event for this case: PlayScreen's
       * Continue handler returned without dispatching, so the snapshot
       * stayed at `phase='challenge', challengeSubPhase='react'`
       * indefinitely while the modal unmounted on the
       * `clearedSefirot` short-circuit. This event is the fix.
       *
       * Pre-#502 this transitioned to `'draw'`; with the start-of-turn
       * refill the discrete `'draw'` phase no longer exists, so the
       * pass-path lands in `'end'` directly.
       */
      readonly kind: 'react-continue';
    }
  | {
      readonly kind: 'accept-setback';
      readonly sefirah: SefirahKey;
      readonly shortcut?: boolean;
    }
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
  | {
      /**
       * #489 — design § 3.5 edge case "Player declares Malkuth: blocked
       * at `prep-add-modifier` (Malkuth has no encounter, no Spark to
       * want)." The stage-time guard fires before the cap check so the
       * player can re-stage a valid target without burning their
       * one-per-encounter declaration slot.
       */
      readonly kind: 'invalid-desire-target';
      readonly sefirah: SefirahKey;
    }
  | {
      /**
       * #487 — design § 3.2: at Gevurah, `prep-confirm` requires the
       * active player to have staged at least one card-burn — "the
       * sacrifice is the staging itself." The gate waives only when the
       * player's hand is empty (`hand.length === 0`), in which case the
       * confirm proceeds with no burn. Otherwise the confirm is blocked
       * with this rejection; the UI surfaces it inline ("Stage at least
       * one burn to continue") and the player either stages a burn or
       * (rarely) accepts setback.
       */
      readonly kind: 'gevurah-requires-burn';
    }
  | {
      /**
       * #486 — design § 3.3 edge case: when the Shell of Chesed
       * (Hoarding) is `active`, gift-card modifiers are blocked at
       * `prep-add-modifier` for the duration of the Shell's one-round
       * window. The Shell's job is to deny the Chesed gesture; the
       * gate fires regardless of which Sefirah the encounter is at,
       * because the Shell's effect applies to "no card gifts, in any
       * direction" globally.
       */
      readonly kind: 'chesed-shell-blocks-gift';
    }
  | {
      /**
       * #491 — design § 3.7: at Binah, ally assists are blocked at
       * `prep-add-modifier`. "Demeter sits alone. So do you." The
       * gate fires when `state.encounter?.sefirah === 'binah'` AND
       * the modifier is an `assist-request`. Spark-burns and card-
       * burns remain allowed at Binah — the prohibition is narrow
       * to ally assists specifically.
       */
      readonly kind: 'binah-no-assists';
    }
  | { readonly kind: 'card-not-in-hand'; readonly arcanum: number }
  | {
      readonly kind: 'spark-not-held';
      readonly sefirah: SefirahKey;
      readonly sourcePlayerId: string;
    }
  | { readonly kind: 'react-retry-on-pass' }
  | {
      /**
       * #503: a `meditate` event fired while `state.meditatedThisTurn`
       * is already true. Meditate is capped at one per turn; the UI
       * disables the Meditate button when the flag is set, so a
       * dispatch reaching the reducer despite the cap is either a
       * stale client or a wire-format bypass. The reducer rejects
       * cleanly so callers can render a precise UI message.
       */
      readonly kind: 'already-meditated';
    }
  | {
      /**
       * #385: `react-continue` was dispatched on a non-pass `lastOutcome`.
       * Callers should route fail outcomes through `accept-setback`
       * (which ticks Separation and handles shortcut rollback). This
       * is also the rejection when `lastOutcome` is undefined — a
       * defensive guard against a misordered dispatch.
       */
      readonly kind: 'react-continue-on-fail';
    }
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
 * Deterministic 32-bit hash of a string — DJB2 variant, the same
 * "easy and good enough" hash used in countless game-state fingerprint
 * routines. Used by `initEncounterEnvelope` (#334;
 * `design/per-sefirah-mechanics.md` § 2.6 (b)) to derive a stable
 * per-encounter seed from a digest of public GameState fields.
 *
 * Not cryptographic — we only need it to be deterministic and well-
 * distributed. The active player can't precompute downstream uses
 * (Yesod dream pillar, Hod deception misreport) because the inputs
 * (illumination / separation tally at arrival, player roster) aren't
 * known at arbitrary distance from the encounter; replay-determinism
 * holds because the same game history hashes to the same digest.
 */
function djb2Hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 33) + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/**
 * Build the per-encounter envelope at `move` → `challenge` entry
 * (#334; `design/per-sefirah-mechanics.md` § 2.6 (b)). Inputs are
 * stable GameState fields available at arrival — player roster,
 * active-player id, the arrival Sefirah, and the team Illumination /
 * Separation tally — so replay reproduces the seed and the active
 * player can't precompute it from distance.
 *
 * Exported because `lib/room-actions.ts` mirrors the reducer's `move`
 * arm for multiplayer state-sync and must produce the same envelope
 * shape — sharing the helper keeps the two paths in lockstep.
 *
 * Per-mechanic fields:
 *   - `dreamPillar` (#354 / § 3.6) — derived here when `sefirah` is
 *     'yesod'. Other Sefirot leave it undefined.
 *   - `chokmahPriorAttempts`, `netzachPriorFails`, `deceptionMisreport`
 *     — filled in by their respective downstream per-Sefirah tickets;
 *     this initializer leaves them undefined.
 */
export function initEncounterEnvelope(
  state: GameState,
  sefirah: SefirahKey,
): NonNullable<GameState['encounter']> {
  // Public, stable inputs only. Don't include rng-derived or
  // per-player-private state — those would either break replay
  // determinism or leak hidden information.
  const digest = [
    state.players.length,
    state.players.map((p) => p.id).join('|'),
    state.activePlayerId,
    state.illumination,
    state.separation,
    sefirah,
  ].join(':');
  const seed = djb2Hash(digest);
  const base: NonNullable<GameState['encounter']> = {
    sefirah,
    seed,
    retryCount: 0,
  };
  // #354 / § 3.6: at Yesod, derive the dream-pillar from the envelope
  // seed (retryCount is 0 at init; on react-retry the reducer re-derives
  // from `seed + retryCount`). Other Sefirot leave dreamPillar undefined.
  if (sefirah === 'yesod') {
    return { ...base, dreamPillar: deriveDreamPillar(seed, 0) };
  }
  return base;
}

/**
 * The three pillars in canonical order. Indexed into by
 * `deriveDreamPillar`'s seeded `int(0, 2)` so the picker is
 * deterministic and well-distributed across pillars.
 */
const DREAM_PILLARS = ['mercy', 'severity', 'balance'] as const satisfies readonly Pillar[];

/**
 * Derive the Yesod Dream-Peek `dreamPillar` from the encounter's seed
 * plus `retryCount`. Per `design/per-sefirah-mechanics.md` § 3.6:
 * `seedRng(state.encounter.seed + state.encounter.retryCount).pickOne(
 * ['mercy', 'severity', 'balance'])`. The current `Rng` interface lacks
 * a `pickOne` helper, so we use `int(0, 2)` and index into the canonical
 * pillar array — equivalent because Mulberry32 is well-distributed and
 * `int(min, max)` is uniform on the inclusive range.
 *
 * Pure: same `(seed, retryCount)` always returns the same pillar.
 * Replay-deterministic — necessary for multiplayer state-sync.
 */
function deriveDreamPillar(seed: number, retryCount: number): Pillar {
  const idx = seededRng(seed + retryCount).int(0, DREAM_PILLARS.length - 1);
  // Picker output is bounded; the non-null assertion is safe because
  // `int(0, 2)` is in [0, 2] and DREAM_PILLARS has length 3. We use
  // a defensive lookup rather than `!` so a refactor that shrinks the
  // array doesn't silently produce `undefined`.
  const pillar = DREAM_PILLARS[idx];
  if (pillar === undefined) {
    throw new Error(
      `deriveDreamPillar: picker idx ${idx} out of range for DREAM_PILLARS (length ${DREAM_PILLARS.length})`,
    );
  }
  return pillar;
}

/**
 * Bump `retryCount` by 1 and re-derive any per-mechanic fields that
 * depend on the retry counter. Today only Yesod's `dreamPillar` is
 * re-derived (#354 / § 3.6 rule 2); future mechanics that key off
 * `retryCount` (Chokmah `chokmahPriorAttempts`, Netzach
 * `netzachPriorFails`) would extend this helper.
 *
 * Pure: returns a new envelope; input is unchanged.
 */
function withRetryBumpedEnvelope(
  envelope: NonNullable<GameState['encounter']>,
  modifierCountAtConfirm = 0,
): NonNullable<GameState['encounter']> {
  const nextRetryCount = envelope.retryCount + 1;
  if (envelope.sefirah === 'yesod') {
    return {
      ...envelope,
      retryCount: nextRetryCount,
      dreamPillar: deriveDreamPillar(envelope.seed, nextRetryCount),
    };
  }
  // #490 / design § 3.8 — Chokmah Act Before Thought: bump
  // chokmahPriorAttempts by max(1, modifierCountAtConfirm). The
  // floor ensures every retry advances the counter (even a 0-
  // modifier flash failure counts as one prior strike); the
  // modifierCount carryover encodes "you stacked 3 and failed —
  // the next attempt sees that 3-count in the tilt."
  if (envelope.sefirah === 'chokmah') {
    return {
      ...envelope,
      retryCount: nextRetryCount,
      chokmahPriorAttempts:
        (envelope.chokmahPriorAttempts ?? 0) + Math.max(1, modifierCountAtConfirm),
    };
  }
  return { ...envelope, retryCount: nextRetryCount };
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
 * #486 — Apply Chesed gift transfers at `prep-confirm`. For each
 * staged `gift-card` modifier, move the named arcanum from the active
 * player's hand to the recipient's hand. If the recipient is at
 * `HAND_CAP`, discard their lowest-arcanum card first to make room
 * (the v1 known-griefing-surface from design § 3.3 — a proper
 * recipient-confirm wire action is a follow-up).
 *
 * Pure. No-op (same reference) when `gifts` is empty.
 *
 * Failure mode: if the active player doesn't hold the named arcanum
 * (caller misuse), that specific gift is silently dropped from the
 * transfer pass — defense-in-depth, since `translatePendingModifiers`
 * already validates and the reducer's stage-time path requires the
 * card to be in hand. If the recipient doesn't exist (race / state
 * desync), the same drop semantics — the active player keeps the
 * card.
 */
function applyChesedGiftTransfers(
  state: GameState,
  activeId: string,
  gifts: readonly { readonly arcanum: number; readonly recipientId: string }[],
): GameState {
  if (gifts.length === 0) return state;
  let players = state.players;
  let discardPile = state.discardPile;
  for (const gift of gifts) {
    const active = players.find((p) => p.id === activeId);
    const recipient = players.find((p) => p.id === gift.recipientId);
    if (!active || !recipient) continue;
    const idx = active.hand.indexOf(gift.arcanum);
    if (idx < 0) continue;
    const activeHand = [...active.hand];
    activeHand.splice(idx, 1);
    let recipientHand = [...recipient.hand];
    if (recipientHand.length >= HAND_CAP) {
      // Auto-discard the lowest-arcanum card to make room (v1 corner).
      let lowestIdx = 0;
      for (let i = 1; i < recipientHand.length; i++) {
        const candidate = recipientHand[i];
        const current = recipientHand[lowestIdx];
        if (candidate !== undefined && current !== undefined && candidate < current) {
          lowestIdx = i;
        }
      }
      const discarded = recipientHand[lowestIdx];
      if (discarded !== undefined) {
        recipientHand = [
          ...recipientHand.slice(0, lowestIdx),
          ...recipientHand.slice(lowestIdx + 1),
        ];
        discardPile = [...discardPile, discarded];
      }
    }
    recipientHand = [...recipientHand, gift.arcanum];
    players = players.map((p) => {
      if (p.id === activeId) return { ...p, hand: activeHand };
      if (p.id === gift.recipientId) return { ...p, hand: recipientHand };
      return p;
    });
  }
  return { ...state, players, discardPile };
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
      const movedState = result.value;
      // #345: detect convergence (every player at Kether) and trip the
      // Final Threshold ritual. The helper is idempotent: a no-op if
      // the trigger predicate is unmet, so we always pipe the post-
      // move state through it. When the trigger fires the post-state
      // carries `phase: 'kether'` and a populated `ketherRitual` —
      // skip the regular phase-decision below and return directly.
      const newState = maybeTriggerKetherRitual(movedState);
      if (newState.phase === 'kether') {
        return { ok: true, value: { next: { state: newState } } };
      }
      const movedPlayer = newState.players.find((p) => p.id === player.id);
      // #447: a Kether arrival that didn't complete convergence puts
      // the moving seat into the pre-ritual hold (`isKetherHeld`).
      // Their hand is frozen; no challenge / draw applies; and the
      // hot-seat auto-advance hook in PlayScreen only fires on
      // `phase: 'end'`, so the cadence-driven endTurn never runs.
      // Without this branch the active seat sticks on the held
      // player and the held screen renders with no path forward.
      // Route the arrival through `endTurnReducer` immediately so
      // the next still-climbing player gets their turn. The reducer
      // skips held seats internally (#335), so wrap-around on
      // 3+ player tables is handled.
      if (movedPlayer !== undefined && isKetherHeld(newState, movedPlayer.id)) {
        const turned = endTurnReducer(newState);
        // Defensive: `endTurnReducer` returns the input state
        // unchanged when `state.pendingDiscard.count > 0`. That can't
        // happen at `phase: 'move'` today — `meditate` is the only
        // writer of `pendingDiscard` and it transitions to `phase: 'end'`
        // — but if a future ticket adds a `pendingDiscard` path at
        // `phase: 'move'`, returning the unchanged state here would
        // re-introduce the soft-lock this fix exists to prevent. Throw
        // loudly so the corruption surfaces at the offending ticket
        // instead of becoming an invisible regression.
        if (turned === newState) {
          throw new Error(
            '#447: endTurnReducer refused to advance during Kether auto-rotate (pendingDiscard at phase: move?)',
          );
        }
        // Phase reset to 'move' for the next still-climbing player.
        // `challengeSubPhase` and `lastOutcome` are already undefined
        // at `phase: 'move'` entry (the move handler's phase guard
        // ensures that), so the explicit clears are defensive — they
        // guarantee the next seat starts clean even if a future
        // change leaves stale challenge state on the input. `encounter`
        // is cleared for the same reason (matches the existing
        // `end-turn` case at line 1395).
        const stateAfter: GameState = {
          ...turned,
          phase: 'move',
          challengeSubPhase: undefined,
          lastOutcome: undefined,
          encounter: undefined,
        };
        return { ok: true, value: { next: { state: stateAfter } } };
      }
      // Decide the next phase: if the arrival is an uncleared
      // standard-check Sefirah, enter `challenge`; otherwise jump
      // straight to `'end'` (Malkuth's no-check, Kether's collective,
      // and already-cleared Sefirot all skip the challenge phase).
      // Pre-#502 the no-challenge branch transitioned to `'draw'`; the
      // start-of-turn refill change folded that step into `end-turn`.
      let nextPhase: TurnPhase = 'end';
      if (movedPlayer) {
        const arrival = sefirahByKey(movedPlayer.position);
        const alreadyCleared = movedPlayer.clearedSefirot.has(
          movedPlayer.position,
        );
        if (arrival.challenge.kind === 'check' && !alreadyCleared) {
          nextPhase = 'challenge';
        }
      }
      if (nextPhase === 'challenge' && movedPlayer) {
        // Entering challenge: clear any stale prep state from a
        // prior encounter and seed the prep sub-phase. #334
        // (`design/per-sefirah-mechanics.md` § 2.6 (b)): also
        // initialize the per-encounter envelope on `state.encounter`
        // — sefirah from arrival, deterministic seed from public
        // GameState fields, retryCount = 0. Surface only; the per-
        // mechanic fields (dreamPillar, chokmahPriorAttempts, etc.)
        // are filled in by downstream per-Sefirah tickets.
        const cleanState: GameState = {
          ...newState,
          pendingModifiers: EMPTY_PENDING_MODIFIERS,
          phase: 'challenge',
          challengeSubPhase: 'prep',
          lastOutcome: undefined,
          encounter: initEncounterEnvelope(newState, movedPlayer.position),
        };
        return { ok: true, value: { next: { state: cleanState } } };
      }
      // Non-challenge arrival (already-cleared / no-check): the
      // encounter envelope must be cleared — a stale envelope cannot
      // leak across the seat boundary. #502: tag `lastAction` so the
      // PlayScreen auto-advance timer fires (the canonical #131
      // cadence). Pre-#502 the same tag was set in the now-deleted
      // `'draw'` case; with that case gone, the move case sets it
      // directly when it transitions to `'end'`.
      const nextState: GameState = {
        ...newState,
        phase: nextPhase,
        challengeSubPhase: undefined,
        lastOutcome: undefined,
        encounter: undefined,
        lastAction: nextPhase === 'end' ? 'move-draw' : undefined,
      };
      return { ok: true, value: { next: { state: nextState } } };
    }

    case 'meditate': {
      if (phase !== 'move') {
        return { ok: false, reason: { kind: 'wrong-phase', expected: 'move', actual: phase } };
      }
      // #503: Meditate is capped at one per turn. The flag is reset
      // by `engine/turn.ts:endTurn` on seat rotation. The UI disables
      // the Meditate button when the flag is true; this guard is the
      // engine-side enforcement (defense in depth against stale
      // clients and wire-format bypasses).
      if (state.meditatedThisTurn === true) {
        return { ok: false, reason: { kind: 'already-meditated' } };
      }
      // Meditate draws MEDITATE_DRAW (#291: always — no hand-full
      // rejection). The over-cap reconciliation lives on `end-turn`
      // (post-#503), NOT here: meditating from 5 to 7 cards and then
      // playing a Move card (dropping back to 6) must not trigger any
      // discard prompt. The check fires only when the player attempts
      // to End the turn with > HAND_CAP cards still in hand.
      //
      // #503: Meditate stays in `'move'` (pre-#503 it transitioned to
      // `'end'`) so the player may still play a card the same turn.
      // The freshly drawn cards are usable immediately — closing the
      // "drew in desperation but cannot use" gap that motivated the
      // change. The once-per-turn cap (`meditatedThisTurn`) stops
      // Meditate from strictly dominating Move.
      const drewState = drawNCards(state, player.id, MEDITATE_DRAW, HAND_CAP, rng, {
        overCap: true,
      });
      const nextState: GameState = {
        ...drewState,
        phase: 'move',
        meditatedThisTurn: true,
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
          // #491 — design § 3.7: at Binah, ally assists are blocked.
          // "Demeter sits alone." Fires BEFORE the cap check so the
          // rejection surfaces the actual reason. The prohibition is
          // narrow to ally assists; card-burns and spark-burns
          // remain allowed at Binah (own-resource consumption is
          // distinct from delegating effort to allies).
          if (state.encounter?.sefirah === 'binah') {
            return {
              ok: false,
              reason: { kind: 'binah-no-assists' },
            };
          }
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
        // #334 — `design/per-sefirah-mechanics.md` § 2.7 surface.
        // Stage-time validation here is mostly permissive: the surface
        // accepts these variants by shape, and the per-Sefirah downstream
        // tickets (Hod / Chesed / Netzach / Yesod) layer their own
        // semantic guards (e.g. "name-card requires active player on
        // Hod", "gift-card recipient must be a different player at
        // Chesed"). Spec-stated caps — § 3.1 for `name-card` (per
        // encounter), § 3.5 for `declare-desire` (per run), § 3.6 for
        // `dream-guess` (per encounter) — are enforced here so the
        // `prep-cap-exceeded` contract surfaces the rejection to the UI;
        // `gift-card` is intentionally multi-allowed.
        case 'name-card':
          // § 3.1: max one name-card per encounter; the reducer rejects
          // a second add. The player can `prep-remove-modifier` and
          // re-stage with a different arcanum before confirm.
          if (pending.nameCards.length >= 1) {
            return {
              ok: false,
              reason: { kind: 'prep-cap-exceeded', cap: 1 },
            };
          }
          nextPending = {
            ...pending,
            nameCards: [...pending.nameCards, event.modifier.arcanum],
          };
          break;
        case 'gift-card':
          // #486 — design § 3.3: Shell of Chesed (Hoarding) blocks
          // gift-card staging for the duration of the Shell's one-
          // round window. "no card gifts, in any direction." The
          // Shell's effect is global (any Sefirah, any gift); the
          // gate checks `state.shells.chesed === 'active'` directly.
          if (state.shells.chesed === 'active') {
            return {
              ok: false,
              reason: { kind: 'chesed-shell-blocks-gift' },
            };
          }
          nextPending = {
            ...pending,
            giftCards: [
              ...pending.giftCards,
              {
                arcanum: event.modifier.arcanum,
                recipientId: event.modifier.recipientId,
              },
            ],
          };
          break;
        case 'declare-desire':
          // § 3.5 edge case: "Player declares Malkuth: blocked at
          // `prep-add-modifier`" — Malkuth has no encounter and no
          // Spark to want; staging it would have written a permanent-
          // but-useless declaredDesire on the player record at confirm,
          // burning their one-per-game declaration. Check this BEFORE
          // the cap so the rejection surfaces the actual reason.
          if (event.modifier.sefirah === 'malkuth') {
            return {
              ok: false,
              reason: { kind: 'invalid-desire-target', sefirah: 'malkuth' },
            };
          }
          // § 3.5 (§ 2.7 surface table row): "Max one per run, locks."
          // The pre-confirm cap mirrors § 3.1 (name-card) and § 3.6
          // (dream-guess). The post-confirm lock is enforced separately
          // via `activePlayer.declaredDesire` (permanent, never cleared);
          // this guard only governs stage-time stacking. The player can
          // `prep-remove-modifier` and re-stage a different sefirah
          // before confirm.
          if (pending.declareDesires.length >= 1) {
            return {
              ok: false,
              reason: { kind: 'prep-cap-exceeded', cap: 1 },
            };
          }
          nextPending = {
            ...pending,
            declareDesires: [...pending.declareDesires, event.modifier.sefirah],
          };
          break;
        case 'dream-guess':
          // § 3.6: max one dream-guess per encounter; the reducer
          // rejects a second add. The player can `prep-remove-modifier`
          // and re-stage with a different pillar before confirm.
          if (pending.dreamGuesses.length >= 1) {
            return {
              ok: false,
              reason: { kind: 'prep-cap-exceeded', cap: 1 },
            };
          }
          nextPending = {
            ...pending,
            dreamGuesses: [...pending.dreamGuesses, event.modifier.pillar],
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
        // #334: equality semantics per `design/per-sefirah-mechanics.md`
        // § 2.7 table. First-match removal mirrors the existing card-
        // burn / spark-burn / assist-request arms — silent no-op when
        // the modifier isn't staged.
        case 'name-card': {
          const idx = pending.nameCards.findIndex((a) => a === target.arcanum);
          if (idx >= 0) {
            nextPending = {
              ...pending,
              nameCards: [
                ...pending.nameCards.slice(0, idx),
                ...pending.nameCards.slice(idx + 1),
              ],
            };
          }
          break;
        }
        case 'gift-card': {
          // Equality: `arcanum` AND `recipientId` (per § 2.7 — same
          // arcanum can be staged to two different recipients, each
          // removable independently).
          const idx = pending.giftCards.findIndex(
            (g) =>
              g.arcanum === target.arcanum &&
              g.recipientId === target.recipientId,
          );
          if (idx >= 0) {
            nextPending = {
              ...pending,
              giftCards: [
                ...pending.giftCards.slice(0, idx),
                ...pending.giftCards.slice(idx + 1),
              ],
            };
          }
          break;
        }
        case 'declare-desire': {
          const idx = pending.declareDesires.findIndex(
            (s) => s === target.sefirah,
          );
          if (idx >= 0) {
            nextPending = {
              ...pending,
              declareDesires: [
                ...pending.declareDesires.slice(0, idx),
                ...pending.declareDesires.slice(idx + 1),
              ],
            };
          }
          break;
        }
        case 'dream-guess': {
          const idx = pending.dreamGuesses.findIndex(
            (p) => p === target.pillar,
          );
          if (idx >= 0) {
            nextPending = {
              ...pending,
              dreamGuesses: [
                ...pending.dreamGuesses.slice(0, idx),
                ...pending.dreamGuesses.slice(idx + 1),
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
      // #487 — design § 3.2: Gevurah requires at least one staged
      // card-burn to confirm. The empty-hand waiver lets the player
      // confirm anyway (sacrifice is the *staging* itself, not an
      // absolute requirement); a player with cards in hand has to
      // burn at least one. Fires BEFORE `translatePendingModifiers`
      // so the rejection surfaces fast without doing unrelated work.
      if (
        state.encounter?.sefirah === 'gevurah' &&
        player.hand.length > 0 &&
        state.pendingModifiers.cardBurns.length === 0
      ) {
        return { ok: false, reason: { kind: 'gevurah-requires-burn' } };
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
      // #286 Path B: derive `shortcutPenalty` from the player's last
      // arrival path. A central-pillar shortcut (paths 13 / 25 / 32 —
      // `pillarsCrossed === ['balance', 'balance']`) sets the +3 DC
      // penalty. Pre-#286 this was forwarded from the modal as an
      // event-level override (`event.shortcutPenalty`); now both
      // hot-seat and multiplayer reach the same answer by reading
      // `lastArrivalPathNumber` from state. `applyMove` stamps that
      // field on every move (#275). When unset (fresh game / pre-move
      // state / synthesised test fixture), `isPathShortcut` returns
      // `false`, matching the prior translate-default of `false`.
      const shortcutPenalty =
        player.lastArrivalPathNumber !== undefined &&
        isPathShortcut(player.lastArrivalPathNumber);
      if (shortcutPenalty) {
        modifiers = { ...modifiers, shortcutPenalty: true };
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
      // #334 — `design/per-sefirah-mechanics.md` § 2.7 "Consumption
      // note": the four new per-Sefirah variants (`name-card`,
      // `gift-card`, `declare-desire`, `dream-guess`) are consumed at
      // `prep-confirm` regardless of pass/fail. This differs from
      // `cardBurns` / `sparkBurns` / `assistRequests` which persist on
      // failure for the cumulative-on-retry semantic (chassis § 6).
      // Clear the new four here so a subsequent `react-retry` lands
      // in prep with them empty; the player must re-stage any
      // name/gift/declare/dream entries fresh. The cumulative-on-
      // retry stacks are left alone on the fail branch, mirroring the
      // pre-#334 semantic.
      const consumedClearedNew: GameState = {
        ...consumed,
        pendingModifiers: {
          ...consumed.pendingModifiers,
          nameCards: [],
          giftCards: [],
          declareDesires: [],
          dreamGuesses: [],
        },
      };
      // #489 / `design/per-sefirah-mechanics.md` § 3.5 — Netzach
      // Declared Desire write-through. When a `declare-desire` was
      // staged AND the encounter is at Netzach AND this player has
      // not already declared, the vow lands on `player.declaredDesire`
      // (permanent for the rest of the run). Subsequent declarations
      // at later Netzach re-encounters are dropped here — the first
      // declaration locks, per the design's "Player declares twice
      // across the run: blocked. The first declaration locks." The
      // drop surfaces through `meta.dropped` so the chassis can render
      // the "Already declared: X" copy. Reads from
      // `state.pendingModifiers.declareDesires` (the pre-consume
      // snapshot — `consumeBurns` doesn't touch `pendingModifiers`, so
      // the staged sefirah is still here at this point) so the value
      // is available even though `consumedClearedNew` clears it below.
      const stagedDesire = state.pendingModifiers.declareDesires[0];
      const writeDesire =
        stagedDesire !== undefined &&
        state.encounter?.sefirah === 'netzach' &&
        player.declaredDesire === undefined;
      const dropDesire =
        stagedDesire !== undefined &&
        state.encounter?.sefirah === 'netzach' &&
        player.declaredDesire !== undefined;
      const droppedWithDesire: readonly PrepModifier[] =
        dropDesire && stagedDesire !== undefined
          ? [...dropped, { kind: 'declare-desire', sefirah: stagedDesire }]
          : dropped;
      const consumedWithDesire: GameState = writeDesire
        ? {
            ...consumedClearedNew,
            players: consumedClearedNew.players.map((p) =>
              p.id === player.id ? { ...p, declaredDesire: stagedDesire } : p,
            ),
          }
        : consumedClearedNew;
      // #486 — Chesed Overflow gift transfers. For each staged
      // `gift-card`, move the arcanum from active to recipient with
      // hand-cap auto-discard (design § 3.3 v1 corner). Reads from
      // `state.pendingModifiers.giftCards` — the pre-consume snapshot,
      // before `consumedClearedNew` cleared the list.
      //
      // Gated on `encounter.sefirah === 'chesed'` even though
      // `giftCards` is structurally usable elsewhere: the helper is
      // named `applyChesedGiftTransfers` and its semantics (auto-
      // discard for hand-capped recipient, no consent affordance) are
      // Chesed-specific per design § 3.3. A future variant that wants
      // gift-card-at-other-Sefirot would need its own consent / cap
      // rules; gating here prevents this helper from silently firing
      // for that future variant. Fires on both pass and fail (gifts
      // transfer at confirm regardless of d20 outcome per § 3.3).
      const consumedWithGifts: GameState =
        state.encounter?.sefirah === 'chesed'
          ? applyChesedGiftTransfers(
              consumedWithDesire,
              player.id,
              state.pendingModifiers.giftCards,
            )
          : consumedWithDesire;
      // On pass: clear ALL pendingModifiers (the encounter resolved
      // successfully — nothing to retry — so the cumulative card /
      // spark / assist stacks fall away too) and clear the encounter
      // envelope (§ 2.6 (b) — the encounter has ended).
      // On fail: preserve cumulative stacks AND the encounter envelope
      // so a subsequent `react-retry` can mutate it (retryCount++,
      // dream-pillar re-seed, etc.) without re-init.
      const baseState: GameState = passed
        ? {
            ...consumedWithGifts,
            pendingModifiers: EMPTY_PENDING_MODIFIERS,
            encounter: undefined,
          }
        : consumedWithGifts;
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
          meta: { challenge: result.value, dropped: droppedWithDesire },
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
      // the fail path of `prep-confirm` left the cumulative stacks
      // (cardBurns / sparkBurns / assistRequests) alone — the kernel
      // returns input state unchanged on fail and the reducer
      // intentionally does NOT clear those. The player stacks new
      // burns on top of the cumulative count from the failed attempt
      // (design § 6: "the failed-roll history visible so the player
      // can stack additional burns on top"). The four #334 variants
      // (name/gift/declare/dream) were already cleared at the failed
      // prep-confirm per § 2.7 "Consumption note" — those must be
      // re-staged fresh.
      //
      // #334 (§ 2.6 (b)): mutate the encounter envelope —
      // `retryCount` increments by 1 so any per-mechanic re-derivation
      // (Yesod `dreamPillar` re-seed, Chokmah `chokmahPriorAttempts`,
      // Netzach `netzachPriorFails`) the downstream tickets layer in
      // can read the canonical retry count from a single field.
      //
      // #354 / § 3.6 rule 2 (C4 fix): at Yesod, re-derive `dreamPillar`
      // from `seed + (retryCount + 1)` so a missed first-attempt pillar
      // can't carry over to the retry. The new pillar is generally
      // different from the first attempt's; combined with the hide-on-
      // miss event shape (rule 1, in engine/checks.ts), this closes the
      // retry-exploit cheat path. The reseed is deterministic
      // (replay reproduces) but unknowable to the player at retry-stage
      // time because retryCount-at-arrival isn't known in advance.
      //
      // `lastOutcome` is cleared so a second `react-retry` before a
      // new resolve will be rejected by the sub-phase guard above
      // (challengeSubPhase is now 'prep') AND, defensively, by the
      // lastOutcome === undefined branch of the gate.
      // #490 — for the Chokmah counter bump, compute the failed
      // attempt's modifier count from the persisted pendingModifiers.
      // Chassis preserves cardBurns + sparkBurns + assistRequests
      // across react-retry; the four per-Sefirah variants
      // (name/gift/declare/dream) were already cleared at the failed
      // prep-confirm per § 2.7. The Chokmah count counts only the
      // three standard arrays per design § 3.8 explicit list.
      const modifierCountAtConfirm =
        state.pendingModifiers.cardBurns.length +
        state.pendingModifiers.sparkBurns.length +
        state.pendingModifiers.assistRequests.length;
      const stateAfter: GameState = {
        ...state,
        phase: 'challenge',
        challengeSubPhase: 'prep',
        lastOutcome: undefined,
        encounter:
          state.encounter !== undefined
            ? withRetryBumpedEnvelope(state.encounter, modifierCountAtConfirm)
            : undefined,
      };
      return { ok: true, value: { next: { state: stateAfter } } };
    }

    case 'react-continue': {
      // #385: pass-path teardown of the challenge cycle. Mirrors
      // `accept-setback`'s state shape but skips the Separation tick
      // and the position rollback (the win was rewarded at
      // `prep-confirm`; nothing more to do here). The phase
      // transition itself is the whole point — pre-#385 the engine
      // had no handler so the snapshot froze at challenge/react.
      if (phase !== 'challenge') {
        return {
          ok: false,
          reason: { kind: 'wrong-phase', expected: 'challenge', actual: phase },
        };
      }
      if (challengeSubPhase !== 'react') {
        return {
          ok: false,
          reason: {
            kind: 'wrong-sub-phase',
            expected: 'react',
            actual: challengeSubPhase,
          },
        };
      }
      // Defensive: callers must use `accept-setback` for the fail
      // branch. A mis-routed dispatch would otherwise silently skip
      // the Separation tick.
      if (state.lastOutcome === undefined || !state.lastOutcome.pass) {
        return { ok: false, reason: { kind: 'react-continue-on-fail' } };
      }
      // #502: pass-path lands in `'end'` directly (pre-#502 this
      // transitioned to `'draw'`; the start-of-turn refill folded
      // the discrete draw step into `end-turn`). `lastAction` is
      // tagged so PlayScreen's auto-advance timer fires.
      const cleared: GameState = {
        ...state,
        pendingModifiers: EMPTY_PENDING_MODIFIERS,
        phase: 'end',
        challengeSubPhase: undefined,
        lastOutcome: undefined,
        encounter: undefined,
        lastAction: 'move-draw',
      };
      return { ok: true, value: { next: { state: cleared } } };
    }

    case 'accept-setback': {
      if (phase !== 'challenge') {
        return { ok: false, reason: { kind: 'wrong-phase', expected: 'challenge', actual: phase } };
      }
      // #389: symmetry with `react-continue`. The UI only renders
      // the Accept Setback button in the react sub-phase, but the
      // wire format admits a mid-prep dispatch — without this guard
      // a buggy or confused client would skip the encounter resolve
      // entirely (Separation tick + phase transition apply with no
      // roll). Mirror the react-continue guard shape.
      if (challengeSubPhase !== 'react') {
        return {
          ok: false,
          reason: {
            kind: 'wrong-sub-phase',
            expected: 'react',
            actual: challengeSubPhase,
          },
        };
      }
      const next = acceptSetback(state, {
        playerId: player.id,
        sefirah: event.sefirah,
        shortcut: event.shortcut ?? false,
      });
      // Phase leaves 'challenge' → clear prep machinery and the
      // sub-phase / lastOutcome (now on GameState). #334 (§ 2.6 (b)):
      // also clear the encounter envelope — the encounter has ended
      // (failure absorbed) so the next encounter must start with a
      // fresh envelope. #502: lands in `'end'` directly (pre-#502 this
      // transitioned to `'draw'`); `lastAction` is tagged so the
      // auto-advance timer fires.
      const cleared: GameState = {
        ...next,
        pendingModifiers: EMPTY_PENDING_MODIFIERS,
        phase: 'end',
        challengeSubPhase: undefined,
        lastOutcome: undefined,
        encounter: undefined,
        lastAction: 'move-draw',
      };
      return { ok: true, value: { next: { state: cleared } } };
    }

    case 'discard': {
      // #291: shed one over-cap card. The active player must clear
      // pendingDiscard.count before endTurn will advance the seat.
      // No phase guard beyond "active player exists" — the only path
      // that sets pendingDiscard today is meditate-at-cap which (post-
      // #503) lands in `'move'`, and a future ticket could legitimately
      // fire a discard from any phase (e.g. a Yesod ability that prunes
      // a card mid-turn), so the reducer is permissive here. The
      // engine's `discard` is itself defensive (no-op if the card
      // isn't in hand).
      const after = discardReducer(state, player.id, event.arcanum);
      return { ok: true, value: { next: { state: after } } };
    }

    case 'end-turn': {
      // #503: end-turn is permitted from `'move'` when the player has
      // already meditated this turn — Meditate is itself a complete
      // turn-action (the player has drawn cards), so they can end the
      // turn directly even if they choose not to play one of the
      // freshly drawn cards. Without this branch, a player who
      // meditates but finds no usable path is softlocked. Pre-#503
      // Meditate transitioned straight to `'end'`, so this affordance
      // wasn't needed.
      const allowEndTurn =
        phase === 'end' ||
        (phase === 'move' && state.meditatedThisTurn === true);
      if (!allowEndTurn) {
        return { ok: false, reason: { kind: 'wrong-phase', expected: 'end', actual: phase } };
      }
      // #503 (post-meditate cap check): if the active player is over
      // HAND_CAP at end-turn time, set `pendingDiscard` and return
      // *without* rotating the seat. The DiscardPrompt UI fires on
      // `pendingDiscard.count > 0` and the player must shed down to
      // the cap; once each `discard` event drops the count to 0, the
      // next `end-turn` click reaches the seat-rotation path below.
      //
      // The check fires here (not on Meditate) so a Meditate-then-Move
      // flow that drops the player back under cap (e.g. 5 → 7 via
      // Meditate, then play a card → 6) prompts no discard at all.
      // Pre-this-change, Meditate set pendingDiscard immediately;
      // playing a card afterwards left a stale prompt for cards the
      // player no longer needed to shed.
      const activeForCap = activePlayer(state);
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
        return { ok: true, value: { next: { state: stateWithDiscard } } };
      }
      // #291: if pendingDiscard.count > 0 the engine's endTurn refuses
      // to advance the seat (returns input state unchanged). Detect
      // that no-op here and pass the unchanged state through so the
      // UI keeps rendering the DiscardPrompt over the current phase
      // (`'end'` for non-Meditate, `'move'` for the post-#503 Meditate-
      // at-cap path) rather than slipping back to a different one for
      // the same player.
      const turned = endTurnReducer(state);
      if (turned === state) {
        return { ok: true, value: { next: { state: turned } } };
      }
      // #502: start-of-turn refill. The seat has rotated; refill the
      // NEW active player's hand toward STARTING_HAND_SIZE (capped at
      // HAND_CAP) so they begin their turn with fresh cards. Pre-#502
      // this draw lived in a discrete `'draw'` phase that fired at
      // end-of-turn for the *outgoing* player; moving it to start-of-
      // turn closes the gap between the player's evaluation moment
      // and their decision moment. `drawToHand` is a no-op when the
      // hand is already at or above STARTING_HAND_SIZE, so a player
      // who has been gifted up to the cap during the prior turn
      // simply skips the refill.
      const drewForNext = drawToHand(turned, turned.activePlayerId, rng);
      // Defensive: clear `encounter` when crossing the seat boundary.
      // Today the only paths reaching `end` (`move` no-challenge,
      // `accept-setback`, `react-continue` on pass) already null the
      // envelope, so this is an invariant guard rather than a bug fix
      // — if a future code path reaches `end-turn` with a live
      // encounter, leaking it to the next player's `move` is a
      // state-machine violation.
      const stateAfter: GameState = {
        ...drewForNext,
        phase: 'move',
        encounter: undefined,
      };
      return { ok: true, value: { next: { state: stateAfter } } };
    }
  }
}

