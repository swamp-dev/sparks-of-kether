import { sefirahByKey, tryPathByNumber, zodiacSignByKey } from '@/data';
import type { Pillar, SefirahKey } from '@/data';
import { pathByArcanum } from '@/data';
import { applyEvent } from './counters';
import type { Rng } from './rng';
import { soulDoorDcDelta } from './soul-door-bonus';
import type { CheckOutcome, GameState, PlayerState, Result } from './types';

// Re-exported so existing callers keep importing `CheckOutcome` from
// `engine/checks` unchanged. The interface lives in `engine/types.ts`
// to break the circular import that would arise if `GameState`
// referenced `CheckOutcome` (the #227 review fix put `lastOutcome`
// onto `GameState`).
export type { CheckOutcome };

// ──────────────── Modifier constants ────────────────

/** Per-card-burn bonus added to the total. See `design/mechanics.md` § Stat checks. */
export const CARD_BURN_BONUS = 3;

/** Per-spark-burn bonus. More potent than cards; use sparingly. */
export const SPARK_BURN_BONUS = 5;

/** Central-pillar (shortcut) arrival bumps the effective DC this much. */
export const SHORTCUT_DC_PENALTY = 3;

/**
 * Hod Word-Match (#353; `design/per-sefirah-mechanics.md` § 3.1) match
 * bonus. Locked at +5 — parity with a Spark-burn, "language well-aimed
 * is the Hermetic Spark." Folded into `CheckModifiers.flatBonus` at
 * resolve time when the player's staged `name-card` arcanum equals the
 * deck top (or, under Shell of Hod, equals
 * `state.encounter.deceptionMisreport`).
 */
export const HOD_WORD_MATCH_BONUS = 5;

/**
 * Yesod Dream-Peek (#354; `design/per-sefirah-mechanics.md` § 3.6) match
 * bonus. Locked at +5 — same magnitude as Hod Word-Match, even though
 * the baseline hit rate (1/3 vs 1/22) is far higher. The asymmetry is
 * intentional per design § 3.1 "Hit-rate disparity vs Yesod (M3)":
 * Yesod is intuition-graded (a coin-flip-like reach that rewards
 * trusting the dream), Hod is precision-graded (fluent-Hermetic memory
 * pays out at the same +5). Folded into `CheckModifiers.flatBonus` at
 * resolve time when the player's staged `dream-guess` pillar equals
 * `state.encounter.dreamPillar`.
 */
export const YESOD_DREAM_PEEK_BONUS = 5;

/**
 * Tiferet Two-Pillar Balance (#488; `design/per-sefirah-mechanics.md`
 * § 3.4) balanced-burn tilt. Applied DC-side: a balanced sacrifice (≥ 2
 * burns whose `pillarsCrossed` union covers both Mercy and Severity)
 * eases the check by -2. Composes additively with `shortcutPenalty` and
 * `soulDoorDelta` (S6 composition order). Locked at -2 — symmetric with
 * the lopsided penalty so the spread between "integrated" and "one-sided"
 * sacrifice is a clean 4-DC swing.
 */
export const TIFERET_BALANCE_TILT = -2;

/**
 * Tiferet Two-Pillar Balance (#488) lopsided-burn tilt. Applied DC-side:
 * ≥ 2 burns whose `pillarsCrossed` union covers only one of {Mercy,
 * Severity} (or only Balance) — "lopsided sacrifice" — raises the bar by
 * +2. 0 or 1 burns is "silent stillness," no tilt either way.
 */
export const TIFERET_LOPSIDED_TILT = 2;

/**
 * Netzach Declared Desire (#489; `design/per-sefirah-mechanics.md`
 * § 3.5) sign-conditional bonus. Locked at +2. Applied as a roll-side
 * `flatBonus` at `resolveChallenge` when the encounter is at Netzach
 * AND the active player has `declaredDesire !== undefined` AND their
 * `zodiacSign` is water (Cancer / Scorpio / Pisces) or Venus-ruled
 * (Taurus / Libra) — the five signs whose archetypal voice already
 * runs on want and feeling. The other seven signs declare and get the
 * `pendingStatBuff` but no roll bonus on the Netzach check itself.
 */
export const NETZACH_DECLARED_DESIRE_BONUS = 2;

/**
 * Netzach Declared Desire (#489) retry-DC tilt. Locked at +1. Applied
 * DC-side at `resolveChallenge` when the encounter is at Netzach AND
 * `state.encounter.netzachPriorFails > 0` AND the active player has
 * `declaredDesire === undefined`. "Aphrodite tightens on the second
 * strike when nothing was named" — the design's C6 fix replaces the
 * structurally-unreachable "next visit" trigger with the same-encounter
 * react-retry trigger.
 */
export const NETZACH_RETRY_DC_TILT = 1;

/**
 * Gevurah Sacred Sacrifice (#487; `design/per-sefirah-mechanics.md`
 * § 3.2) dearest-card bonus. Locked at +2. Applied as a roll-side
 * `flatBonus` at `resolveChallenge` when the encounter is at Gevurah
 * AND the active player has staged a card-burn whose arcanum equals
 * `Math.max(...activePlayer.hand)` (the dearest card by raw rank,
 * computed before any burn-card removal). Stacks with the standard +3
 * `cardBurn` already counted by `cardBurns`, so a dearest burn nets
 * +5 on the roll — parity with a Spark-burn, "the highest-cost
 * sacrifice gets the highest-cost reward."
 *
 * The mechanic's tuning intent (design § 3.2 S8) is that strength ~10
 * + dearest tilt + d20 on DC 15 auto-passes on roll 0+: Gevurah's
 * tension is in the *choice* to burn the rank-highest card, not in
 * the dice. The reducer-side `gevurah-requires-burn` gate (see
 * `lib/turn-machine.ts` `prep-confirm`) makes the choice unavoidable
 * unless the player's hand is empty.
 */
export const GEVURAH_DEAREST_BONUS = 2;

// ──────────────── Public types ────────────────

export interface CheckModifiers {
  /**
   * Stat values contributed by allies at the same Sefirah. Each is
   * halved (floored) and summed into the total.
   */
  readonly assistStats: readonly number[];
  /** Number of cards burned — each adds `CARD_BURN_BONUS`. */
  readonly cardBurns: number;
  /** Number of sparks burned — each adds `SPARK_BURN_BONUS`. */
  readonly sparkBurns: number;
  /** True if this check is happening on a central-pillar shortcut arrival. */
  readonly shortcutPenalty: boolean;
  /**
   * Soul Door DC adjustment (#244). Operates on the DC side, like
   * `shortcutPenalty` but in the opposite direction — a negative
   * delta lowers the bar. Stacks with shortcut penalty additively.
   * `resolveChallenge` auto-injects this from `(player.zodiacSign,
   * sefirah)` when omitted, so engine-only callers get the right
   * behaviour for free; UI callers can supply it explicitly so the
   * pre-roll animation matches the engine's effective DC.
   * Magnitude locked at -2 in `design/soul-doors.md` § 7 D1.
   */
  readonly soulDoorDelta?: number;
  /**
   * Per-Sefirah twist bonus (#334; `design/per-sefirah-mechanics.md`
   * § 2.6 (a)). A single roll-side flat number that the eight
   * per-Sefirah mechanics fold into a check at `prep-confirm` time:
   *
   *   - Hod Word-Match (match): `flatBonus += 5`.
   *   - Yesod Dream-Peek (match): `flatBonus += 5`.
   *   - Gevurah Sacred Sacrifice (per matching dearest burn, on top of
   *     the standard +3 already counted by `cardBurns`): `flatBonus += 2`.
   *   - Netzach Declared Desire (water + Venus-ruled signs on
   *     declaration): `flatBonus += 2`.
   *   - Chokmah fire-sign 0-modifier flash: `flatBonus += 2`.
   *
   * Optional / default 0 so call sites that pre-date the per-Sefirah
   * work keep producing identical totals. The resolver folds it into
   * `total` alongside assist / cardBurn / sparkBurn — purely on the
   * roll side; the DC side is owned by `shortcutPenalty` and
   * `soulDoorDelta`. This ticket lands the surface only; the per-
   * Sefirah consumers ship as separate downstream tickets.
   */
  readonly flatBonus?: number;
  /**
   * Tiferet Two-Pillar Balance tilt (#488;
   * `design/per-sefirah-mechanics.md` § 3.4). Applied DC-side, additive
   * with `shortcutPenalty` and `soulDoorDelta` per S6 composition order:
   *
   *   `effectiveDC = baseDC + shortcutPenalty + soulDoorDelta + tiferetTilt`
   *
   * Auto-folded by `resolveChallenge` from the player's staged
   * `pendingModifiers.cardBurns` when `sefirah === 'tiferet'` — callers
   * do not set this directly except in tests or to mirror the engine's
   * effective DC in pre-roll UI. `evaluateTiferetBalance` is the single
   * source of truth for the computation; UI code should consult that
   * helper rather than re-deriving the rule.
   */
  readonly tiferetTilt?: number;
  /**
   * Netzach Declared Desire retry-DC tilt (#489;
   * `design/per-sefirah-mechanics.md` § 3.5 C6 fix). Applied DC-side,
   * additive with `shortcutPenalty`, `soulDoorDelta`, and `tiferetTilt`
   * per S6 composition order. Auto-folded by `resolveChallenge` from
   * `(state.encounter.netzachPriorFails, activePlayer.declaredDesire)`
   * when `sefirah === 'netzach'`. UI callers that pre-compute outcome
   * must compute and supply this themselves (mirrors the
   * `#488 contract` on Tiferet — see `ResolveChallengeInput.outcome`).
   */
  readonly netzachRetryTilt?: number;
}

export type ChallengeRejection =
  | { readonly kind: 'unknown-player'; readonly playerId: string }
  | {
      /**
       * The Sefirah's challenge is `no-check` (Malkuth) or `collective`
       * (Kether). `resolveChallenge` only handles standard d20 checks;
       * Kether's Final Threshold lives in the endgame module.
       */
      readonly kind: 'no-standard-check';
      readonly sefirah: SefirahKey;
    }
  | { readonly kind: 'already-cleared'; readonly sefirah: SefirahKey };

/**
 * Hod Word-Match resolve-time event (#353;
 * `design/per-sefirah-mechanics.md` § 3.1). Emitted by `resolveChallenge`
 * when the encounter is at Hod and the active player has staged a
 * `name-card` modifier. The pass variant carries the matched arcanum
 * (the player's named guess equalled the engine-side comparison value);
 * the miss variant carries ONLY the named arcanum and deliberately
 * omits the actual deck-top so a `react-retry` has no information
 * advantage over the first attempt (C4 fix rule 1).
 *
 * Consumed by the chassis layer (`lib/turn-machine.ts`'s
 * `prep-confirm`) and downstream UI for the prep-result banner. The
 * engine itself does not write to counters from this event — the
 * Word-Match outcome is a roll-side bonus folded into `flatBonus`,
 * not a separate counter delta.
 */
export type HodWordMatchEvent =
  | { readonly kind: 'hod-word-match-pass'; readonly named: number }
  | { readonly kind: 'hod-word-match-miss'; readonly named: number };

/**
 * Yesod Dream-Peek resolve-time event (#354;
 * `design/per-sefirah-mechanics.md` § 3.6). Emitted by `resolveChallenge`
 * when the encounter is at Yesod and the active player has staged a
 * `dream-guess` modifier. The pass variant carries the matched pillar
 * (the player's named guess equalled `state.encounter.dreamPillar`); the
 * miss variant carries ONLY the named (guessed) pillar and deliberately
 * omits the actual `dreamPillar` so a `react-retry` has no information
 * advantage over the first attempt (C4 fix rule 1, design § 3.6).
 *
 * The C4 fix on Yesod is two-pronged: (1) hide the actual on miss
 * (this event shape), and (2) re-seed `dreamPillar` on `react-retry`
 * (handled by the reducer in `lib/turn-machine.ts`). Either rule alone
 * is insufficient — naive retry semantics with a leaked answer would
 * give a guaranteed +5; a re-seed without the hidden answer would
 * still leak the *first* attempt's pillar to spectators in hot-seat
 * play even though the second attempt's pillar is fresh.
 *
 * Consumed by the chassis layer (`lib/turn-machine.ts`'s `prep-confirm`)
 * and downstream UI for the prep-result banner. The engine itself does
 * not write to counters from this event — the Dream-Peek outcome is a
 * roll-side bonus folded into `flatBonus`, not a separate counter delta.
 */
export type YesodDreamPeekEvent =
  | { readonly kind: 'yesod-dream-peek-pass'; readonly pillar: Pillar }
  | { readonly kind: 'yesod-dream-peek-miss'; readonly named: Pillar };

/**
 * Tiferet Two-Pillar Balance resolve-time event (#488;
 * `design/per-sefirah-mechanics.md` § 3.4). Emitted by `resolveChallenge`
 * on every Tiferet resolve (pass OR fail) — the mechanic shifts the DC
 * regardless of outcome, and the chassis renders the prep-result banner
 * either way. Single variant carries the computed tilt, the set of
 * pillars touched across all staged card-burns, and the burn count.
 *
 * `tilt` values are pinned to the design constants
 * `TIFERET_BALANCE_TILT` (-2), `TIFERET_LOPSIDED_TILT` (+2), or 0.
 * `pillarsTouched` is the deduplicated set-union of every staged burn's
 * `pillarsCrossed` pair (emitted as an array for JSON-stable
 * serialization; consumers that need set semantics rewrap).
 * `burnCount` mirrors `pendingModifiers.cardBurns.length` at resolve
 * time — useful for the "stage 2+ burns" banner-copy branch.
 */
export interface TiferetBalanceEvent {
  readonly kind: 'tiferet-balance';
  readonly tilt: number;
  readonly pillarsTouched: readonly Pillar[];
  readonly burnCount: number;
}

/**
 * Netzach Declared Desire resolve-time event (#489;
 * `design/per-sefirah-mechanics.md` § 3.5). Emitted by `resolveChallenge`
 * on every Netzach resolve so the chassis can render the prep-result
 * banner with the right copy:
 *
 *   - `kind: 'netzach-declared-bonus'` — declared AND sign-eligible
 *     (water or Venus-ruled); +2 flatBonus folded in.
 *   - `kind: 'netzach-declared-no-bonus'` — declared but sign isn't
 *     eligible; banner notes the declaration without the bonus.
 *   - `kind: 'netzach-undeclared'` — no declaration; the banner can
 *     surface the retry-DC if priorFails > 0.
 *
 * `declared` is the Sefirah the player named (when present);
 * `retryDcTilt` is the magnitude added DC-side (0 or
 * `NETZACH_RETRY_DC_TILT`). The event NEVER carries the sign-bonus
 * magnitude — that lives in `outcome.modifierBreakdown.flatBonus` and
 * downstream consumers can read it there.
 */
export type NetzachDeclaredDesireEvent =
  | {
      readonly kind: 'netzach-declared-bonus';
      readonly declared: SefirahKey;
      readonly retryDcTilt: 0;
    }
  | {
      readonly kind: 'netzach-declared-no-bonus';
      readonly declared: SefirahKey;
      readonly retryDcTilt: 0;
    }
  | {
      readonly kind: 'netzach-undeclared';
      readonly retryDcTilt: number;
    };

/**
 * What a successful `resolveChallenge` invocation returns.
 *
 * **IMPORTANT:** `ok: true` means "the challenge was resolved" (the
 * roll completed without structural error), NOT "the player passed."
 * Always inspect `outcome.pass` before treating a resolution as
 * success. On `outcome.pass === false`, `newState === input.state`
 * (same reference) — the reducer returns input state unchanged on
 * failure so the caller can choose retry vs. `acceptSetback`.
 *
 * **Exception (#353).** When a Hod Word-Match `name-card` is consumed
 * during this resolve, `newState` differs from the input even on the
 * fail branch — the consumed name-card is removed from
 * `state.pendingModifiers.nameCards` so a subsequent `react-retry`
 * starts with an empty staging slot (the player must re-stage with a
 * fresh `prep-add-modifier`). This is the C4 fix rule 2 in design
 * § 3.1 — the consume-on-resolve guarantee.
 *
 * **Exception (#354).** Same shape applies to a Yesod Dream-Peek
 * `dream-guess` consumed during this resolve — `newState` differs from
 * the input even on the fail branch because the consumed dream-guess
 * is cleared from `state.pendingModifiers.dreamGuesses`. C4 fix rule 1
 * (consume-on-resolve) for Yesod, design § 3.6 / § 2.7 "Consumption note".
 */
export interface ChallengeSuccess {
  readonly newState: GameState;
  readonly outcome: CheckOutcome;
  /**
   * Present only when this resolve consumed a Hod `name-card` modifier
   * (`state.pendingModifiers.nameCards.length > 0` AND `sefirah ===
   * 'hod'` at resolve time). The chassis layer reads this to render
   * the prep-result banner and to broadcast the public miss reveal.
   */
  readonly hodWordMatch?: HodWordMatchEvent;
  /**
   * Present only when this resolve consumed a Yesod `dream-guess`
   * modifier (`state.pendingModifiers.dreamGuesses.length > 0` AND
   * `sefirah === 'yesod'` at resolve time AND
   * `state.encounter.dreamPillar` was populated). The chassis layer
   * reads this to render the prep-result banner. Per design § 3.6,
   * the miss event omits the actual pillar so spectators / retry
   * gain no information advantage; only the pass event carries the
   * matched pillar.
   */
  readonly yesodDreamPeek?: YesodDreamPeekEvent;
  /**
   * Present on every Tiferet resolve (`sefirah === 'tiferet'`). The
   * Two-Pillar Balance mechanic shifts the DC on both pass and fail
   * branches, so the event always fires — the chassis renders the prep-
   * result banner regardless of outcome. Carries the DC tilt, the
   * pillars touched across all staged burns, and the burn count for
   * the "stage 2+ burns" banner-copy fallback.
   */
  readonly tiferetBalance?: TiferetBalanceEvent;
  /**
   * Present on every Netzach resolve (`sefirah === 'netzach'`). The
   * Declared Desire mechanic surfaces three branches (declared+bonus,
   * declared+no-bonus, undeclared) so the chassis can render the
   * prep-result banner with the right copy. The event NEVER carries
   * the sign-bonus magnitude — that lives in
   * `outcome.modifierBreakdown.flatBonus`.
   */
  readonly netzachDeclaredDesire?: NetzachDeclaredDesireEvent;
}

// ──────────────── rollCheck (pure math) ────────────────

export interface RollCheckInput {
  readonly stat: number;
  readonly dc: number;
  readonly modifiers: CheckModifiers;
  readonly rng: Rng;
}

/**
 * Pure d20 + stat vs. DC roll with stacking modifiers. No state
 * mutation. `rng` is passed in so tests can seed a deterministic
 * sequence.
 */
export function rollCheck(input: RollCheckInput): CheckOutcome {
  const { stat, dc, modifiers, rng } = input;
  const rolled = rng.d20();

  const assist = modifiers.assistStats.reduce((sum, s) => sum + Math.floor(s / 2), 0);
  const cardBurn = modifiers.cardBurns * CARD_BURN_BONUS;
  const sparkBurn = modifiers.sparkBurns * SPARK_BURN_BONUS;
  // #334: per-Sefirah flat bonus (§ 2.6 (a)). Default 0 keeps legacy
  // call-sites producing identical totals. Roll-side, not DC-side —
  // a regression that misroutes this to `effectiveDC` shifts the bar
  // instead of the score (covered by the "flatBonus is roll-side, not
  // DC-side" test in checks.test.ts).
  const flatBonus = modifiers.flatBonus ?? 0;
  const total = rolled + stat + assist + cardBurn + sparkBurn + flatBonus;
  // Effective DC composes two DC-side adjustments: the central-pillar
  // shortcut penalty (+3) and the Soul Door delta (typically -2).
  // They stack additively — Sagittarius on the shortcut at Yesod
  // (a Door for that class) faces baseDC + 3 - 2 = baseDC + 1.
  const shortcutAdjustment = modifiers.shortcutPenalty ? SHORTCUT_DC_PENALTY : 0;
  const soulDoorAdjustment = modifiers.soulDoorDelta ?? 0;
  // #488: Tiferet Two-Pillar Balance tilt (design § 3.4 S6 composition).
  // Additive with shortcut + Soul Door; a regression that multiplies or
  // replaces would surface in the "composition: shortcut + soul door +
  // tiferet tilt stack" test in checks.test.ts.
  const tiferetAdjustment = modifiers.tiferetTilt ?? 0;
  // #489: Netzach Declared Desire retry-DC tilt (design § 3.5 C6).
  // Additive with shortcut + Soul Door + Tiferet per S6.
  const netzachAdjustment = modifiers.netzachRetryTilt ?? 0;
  const effectiveDC =
    dc +
    shortcutAdjustment +
    soulDoorAdjustment +
    tiferetAdjustment +
    netzachAdjustment;

  return {
    rolled,
    statContribution: stat,
    // `flatBonus` only included in the breakdown when nonzero — keeps
    // legacy outcomes byte-identical and means renderers can rely on
    // `breakdown.flatBonus !== undefined` as a shipped-this-roll signal.
    modifierBreakdown: {
      assist,
      cardBurn,
      sparkBurn,
      ...(flatBonus > 0 ? { flatBonus } : {}),
    },
    total,
    effectiveDC,
    pass: total >= effectiveDC,
  };
}

// ──────────────── resolveChallenge ────────────────

export interface ResolveChallengeInput {
  readonly state: GameState;
  readonly playerId: string;
  readonly sefirah: SefirahKey;
  readonly modifiers: CheckModifiers;
  readonly rng: Rng;
  /**
   * UI-supplied pre-rolled outcome. When the challenge modal animates
   * the d20 it consumes one value from `rng` to produce a
   * `CheckOutcome`. Passing it back here keeps the engine's state
   * mutation in sync with what the player saw — without this, a
   * second `rollCheck` call would consume the next rng value and
   * produce a different result, so the engine and the UI would
   * disagree.
   *
   * Optional so engine-only call sites (tests, future bots) can keep
   * the existing roll-here behavior unchanged.
   *
   * **#244 contract.** When `outcome` is supplied, the engine does
   * NOT auto-inject the Soul Door delta from `(player.zodiacSign,
   * sefirah)`. The caller is responsible for having computed
   * `outcome.effectiveDC` with the Door delta already folded in
   * (e.g. by passing the right `soulDoorDelta` into `rollCheck` when
   * producing the pre-roll outcome). The auto-inject only runs on
   * the engine path (`outcome` absent), where the resolver controls
   * the modifier construction. UI callers that ignore this will see
   * the player's roll evaluated against the un-discounted DC.
   *
   * **#488 contract.** Same obligation applies to the Tiferet
   * `tiferetTilt`. When `sefirah === 'tiferet'` AND `outcome` is
   * supplied, the caller is responsible for having computed
   * `outcome.effectiveDC` with the Tiferet tilt already folded in —
   * call `evaluateTiferetBalance(state)` and pass the returned
   * `tilt` as `modifiers.tiferetTilt` into `rollCheck` when producing
   * the pre-roll outcome. The resolver's auto-fold of `tiferetTilt`
   * only runs on the engine path (`outcome` absent); a UI caller that
   * skips this will see the player's roll evaluated against the un-
   * tilted DC even though the chassis will broadcast a
   * `tiferetBalance` event claiming otherwise.
   */
  readonly outcome?: CheckOutcome;
}

/**
 * Attempt a Sefirah's challenge.
 *
 * On success — the player's relevant stat + rolled d20 + mods meets the
 * effective DC — the Sefirah is marked cleared for that player, the
 * player gains the corresponding Spark, and team Illumination ticks up
 * by one. Returns `{newState, outcome}`.
 *
 * On failure — the outcome indicates pass=false — the state is
 * returned unchanged (`newState === state`, same reference) so the
 * caller can choose: either burn another card/spark and retry, or
 * call `acceptSetback` to absorb the Separation penalty and back off.
 *
 * **Hod Word-Match exception (#353).** When the encounter is at Hod
 * and the active player has a `name-card` staged in
 * `state.pendingModifiers.nameCards`, the resolver folds the +5
 * `flatBonus` (`HOD_WORD_MATCH_BONUS`) into the modifiers when the
 * named arcanum matches the comparison source (deck top, or
 * `state.encounter.deceptionMisreport` under Shell of Hod). The staged
 * name-card is consumed from `state.pendingModifiers.nameCards`
 * REGARDLESS of pass/fail — the C4 retry-exploit fix (design § 3.1).
 * In this case `newState !== state` even on a failed roll. A
 * `hodWordMatch` event flows out on `ChallengeSuccess` so the chassis
 * can render the prep-result banner.
 *
 * **Yesod Dream-Peek exception (#354).** When the encounter is at Yesod
 * and the active player has a `dream-guess` staged in
 * `state.pendingModifiers.dreamGuesses`, the resolver folds the +5
 * `flatBonus` (`YESOD_DREAM_PEEK_BONUS`) into the modifiers when the
 * named pillar equals `state.encounter.dreamPillar`. The staged
 * dream-guess is consumed from `state.pendingModifiers.dreamGuesses`
 * REGARDLESS of pass/fail — the C4 fix rule 1 (design § 3.6 + § 2.7
 * "Consumption note"). In this case `newState !== state` even on a
 * failed roll. A `yesodDreamPeek` event flows out on `ChallengeSuccess`
 * so the chassis can render the prep-result banner. Per design § 3.6
 * the miss event carries ONLY the player's guessed pillar — the
 * actual `dreamPillar` is hidden so spectators / a subsequent retry
 * gain no information advantage. The retry's freshness is additionally
 * guaranteed by the reducer re-seeding `dreamPillar` on `react-retry`
 * (rule 2 in the reducer at `lib/turn-machine.ts`).
 *
 * Only handles Sefirot whose `challenge.kind` is `'check'`. Malkuth
 * (no-check) and Kether (collective Final Threshold) get a rejection;
 * the endgame module owns Kether's flow.
 */
export function resolveChallenge(
  input: ResolveChallengeInput,
): Result<ChallengeSuccess, ChallengeRejection> {
  const { state, playerId, sefirah, modifiers, rng } = input;

  const player = state.players.find((p) => p.id === playerId);
  if (!player) {
    return { ok: false, reason: { kind: 'unknown-player', playerId } };
  }

  const sefirahRecord = sefirahByKey(sefirah);
  if (sefirahRecord.challenge.kind !== 'check') {
    return { ok: false, reason: { kind: 'no-standard-check', sefirah } };
  }

  if (player.clearedSefirot.has(sefirah)) {
    return { ok: false, reason: { kind: 'already-cleared', sefirah } };
  }

  const stat = player.stats[sefirahRecord.stat];
  // #244: auto-inject Soul Door delta from the player's class when
  // the caller hasn't supplied one. UI callers (ChallengeModal) set
  // their own so the pre-roll animation matches the engine's DC; the
  // explicit-override branch (modifiers.soulDoorDelta !== undefined)
  // honours that. Since #237 (T8) zodiacSign is always present, so
  // the auto-inject always produces a real delta (0 if the sefirah
  // isn't a Door for this class).
  let resolvedModifiers: CheckModifiers =
    modifiers.soulDoorDelta !== undefined
      ? modifiers
      : {
          ...modifiers,
          soulDoorDelta: soulDoorDcDelta(player.zodiacSign, sefirah),
        };

  // #353 / `design/per-sefirah-mechanics.md` § 3.1 — Hod Word-Match.
  // Inspect the staged name-card (only one per encounter; § 2.7) and
  // fold the +5 match bonus into `flatBonus` BEFORE the roll. The
  // resulting event flows out via `ChallengeSuccess.hodWordMatch` so
  // the chassis can broadcast the prep-result banner. See the comment
  // on `evaluateHodWordMatch` for the comparison-source contract.
  const hod = sefirah === 'hod' ? evaluateHodWordMatch(state) : undefined;
  if (hod !== undefined) {
    resolvedModifiers = {
      ...resolvedModifiers,
      flatBonus: (resolvedModifiers.flatBonus ?? 0) + hod.bonus,
    };
  }

  // #354 / `design/per-sefirah-mechanics.md` § 3.6 — Yesod Dream-Peek.
  // Mirrors the Hod arm above but compares the staged `dream-guess`
  // pillar against the envelope's `dreamPillar` (1-of-3 instead of
  // 1-of-22). Match → +5 to `flatBonus`. The miss event omits the
  // actual pillar (C4 fix rule 1); the per-retry re-seed of
  // `dreamPillar` (handled in the `react-retry` reducer in
  // `lib/turn-machine.ts`) is C4 fix rule 2. The two together close
  // the retry-exploit cheat path.
  const yesod = sefirah === 'yesod' ? evaluateYesodDreamPeek(state) : undefined;
  if (yesod !== undefined) {
    resolvedModifiers = {
      ...resolvedModifiers,
      flatBonus: (resolvedModifiers.flatBonus ?? 0) + yesod.bonus,
    };
  }

  // #488 / `design/per-sefirah-mechanics.md` § 3.4 — Tiferet Two-Pillar
  // Balance. Unlike Hod/Yesod (roll-side +5), Tiferet tilts the DC by
  // ±2 based on the pillar set-union of staged card-burns. The event
  // emits on every Tiferet resolve (pass or fail) so the chassis can
  // render the banner regardless of outcome.
  const tiferet = sefirah === 'tiferet' ? evaluateTiferetBalance(state) : undefined;
  if (tiferet !== undefined) {
    resolvedModifiers = {
      ...resolvedModifiers,
      tiferetTilt: (resolvedModifiers.tiferetTilt ?? 0) + tiferet.tilt,
    };
  }

  // #489 / `design/per-sefirah-mechanics.md` § 3.5 — Netzach Declared
  // Desire. Two effects: a roll-side +2 flatBonus when the player has
  // declared AND their sign is water/Venus-ruled; a DC-side +1 retry
  // tilt when they have NOT declared AND `netzachPriorFails > 0`.
  // The event emits on every Netzach resolve so the chassis can render
  // the prep-result banner regardless of outcome.
  const netzach = sefirah === 'netzach' ? evaluateNetzachDeclaredDesire(state, player) : undefined;
  if (netzach !== undefined) {
    if (netzach.bonus > 0) {
      resolvedModifiers = {
        ...resolvedModifiers,
        flatBonus: (resolvedModifiers.flatBonus ?? 0) + netzach.bonus,
      };
    }
    if (netzach.retryTilt > 0) {
      resolvedModifiers = {
        ...resolvedModifiers,
        netzachRetryTilt:
          (resolvedModifiers.netzachRetryTilt ?? 0) + netzach.retryTilt,
      };
    }
  }

  // #487 / `design/per-sefirah-mechanics.md` § 3.2 — Gevurah Sacred
  // Sacrifice dearest-card tilt. If the active player has staged a
  // card-burn whose arcanum equals the dearest card in their current
  // hand (Math.max), fold +2 into flatBonus. Stacks with the standard
  // +3 cardBurn (already counted by `cardBurns`) so a dearest burn
  // nets +5. The reducer-side `gevurah-requires-burn` gate
  // (lib/turn-machine.ts:prep-confirm) ensures at least one burn is
  // staged when the player's hand is non-empty; this engine arm only
  // determines whether that burn was the dearest one.
  const gevurahBonus =
    sefirah === 'gevurah' ? evaluateGevurahDearestBonus(state, player) : 0;
  if (gevurahBonus > 0) {
    resolvedModifiers = {
      ...resolvedModifiers,
      flatBonus: (resolvedModifiers.flatBonus ?? 0) + gevurahBonus,
    };
  }

  // #489 — pendingStatBuff consumption. The Netzach buff is set on the
  // active player when they pass Netzach with a declaration; it applies
  // to the next stat-check this turn whose sefirah matches the buff's
  // declared sefirah. Apply BEFORE the roll so the stat input reflects
  // the bump, and clear the buff regardless of outcome (one-shot).
  const buffApplies =
    player.pendingStatBuff !== undefined &&
    player.pendingStatBuff.sefirah === sefirah;
  const buffedStat = buffApplies
    ? stat + (player.pendingStatBuff?.amount ?? 0)
    : stat;

  const outcome =
    input.outcome ??
    rollCheck({
      stat: buffedStat,
      dc: sefirahRecord.challenge.dc,
      modifiers: resolvedModifiers,
      rng,
    });

  // #353 — consume the Hod name-card REGARDLESS of pass/fail (design
  // § 3.1 C4 rule 2 / § 2.7 "Consumption note"). The consume fires on
  // any Hod resolve where a name-card was staged — including the
  // both-piles-empty drop branch where `evaluateHodWordMatch` returns
  // undefined and no event is emitted. On fail this means
  // `newState !== state` — the only path in `resolveChallenge` where
  // that's true on a failed roll. Existing tests that assert "fail
  // returns same reference" use non-Hod Sefirot so they remain green.
  const hadNameCard =
    sefirah === 'hod' && state.pendingModifiers.nameCards.length > 0;
  const stateAfterHodConsume = hadNameCard ? consumeHodNameCard(state) : state;

  // #354 — consume the Yesod dream-guess REGARDLESS of pass/fail (design
  // § 3.6 + § 2.7 "Consumption note"). Mirrors the Hod consume above —
  // fires whenever a dream-guess was staged at a Yesod resolve, including
  // the malformed-envelope drop branch where `evaluateYesodDreamPeek`
  // returns undefined.
  const hadDreamGuess =
    sefirah === 'yesod' && state.pendingModifiers.dreamGuesses.length > 0;
  const stateAfterYesodConsume = hadDreamGuess
    ? consumeYesodDreamGuess(stateAfterHodConsume)
    : stateAfterHodConsume;

  // #489 — consume the pendingStatBuff REGARDLESS of pass/fail (design
  // § 3.5: "consumed by the next stat-check this turn. After consumption
  // it expires."). Only consumed when it applied — a buff for a
  // different sefirah passes through untouched and waits for the
  // matching attempt.
  const stateAfterBuffConsume = buffApplies
    ? clearPendingStatBuff(stateAfterYesodConsume, playerId)
    : stateAfterYesodConsume;

  // #489 — increment `netzachPriorFails` on a failed Netzach resolve
  // (design § 3.5 C6 fix). Only fires when the encounter envelope is
  // present and at Netzach; defensive against a Netzach resolve called
  // without an envelope (test fixtures, future bots).
  const shouldBumpNetzachPriorFails =
    !outcome.pass &&
    sefirah === 'netzach' &&
    state.encounter?.sefirah === 'netzach';
  const stateAfterNetzachFailBump = shouldBumpNetzachPriorFails
    ? bumpNetzachPriorFails(stateAfterBuffConsume)
    : stateAfterBuffConsume;

  if (!outcome.pass) {
    return {
      ok: true,
      value: {
        newState: stateAfterNetzachFailBump,
        outcome,
        ...(hod !== undefined ? { hodWordMatch: hod.event } : {}),
        ...(yesod !== undefined ? { yesodDreamPeek: yesod.event } : {}),
        ...(tiferet !== undefined ? { tiferetBalance: tiferet.event } : {}),
        ...(netzach !== undefined ? { netzachDeclaredDesire: netzach.event } : {}),
      },
    };
  }

  // #489 — Netzach pass with a `declaredDesire` set: write the
  // `pendingStatBuff` to the active player for their next stat-check
  // this turn. +1 for cross-Sefirah declarations; +2 if the player
  // declared Netzach itself (congruence rewarded per design § 3.5).
  // Fires AFTER the Spark + cleared-set update so the freshly-cleared
  // Netzach Spark and the buff land on the same player record.
  const desire = player.declaredDesire;
  const shouldSetBuff = sefirah === 'netzach' && desire !== undefined;
  const buffAmount = desire === 'netzach' ? 2 : 1;
  // Build the player base, then layer the buff. `exactOptionalPropertyTypes:
  // true` rejects `pendingStatBuff: undefined`, so we omit the key when
  // there's nothing to set. The pass-at-Netzach-with-declaration case is
  // the only path that sets a new buff; the consume case has already
  // run at `stateAfterBuffConsume` and stripped the key for matching
  // buffs.
  const { pendingStatBuff: _existingBuff, ...playerBaseNoBuff } = player;
  const updatedPlayer: PlayerState = {
    ...playerBaseNoBuff,
    clearedSefirot: new Set(player.clearedSefirot).add(sefirah),
    sparksHeld: new Set(player.sparksHeld).add(sefirah),
    ...(shouldSetBuff && desire !== undefined
      ? { pendingStatBuff: { sefirah: desire, amount: buffAmount } }
      : !buffApplies && player.pendingStatBuff !== undefined
        ? { pendingStatBuff: player.pendingStatBuff }
        : {}),
  };

  const stateWithCleared: GameState = {
    ...stateAfterNetzachFailBump,
    players: stateAfterNetzachFailBump.players.map((p) =>
      p.id === playerId ? updatedPlayer : p,
    ),
  };
  // Each counter bump goes through applyEvent — single source of truth.
  // Spark earned for the challenger; one assist-contributed event per
  // assistant (design/mechanics.md: "the assistant gets the +1, not
  // the challenger").
  let newState = applyEvent(stateWithCleared, {
    kind: 'spark-earned',
    playerId,
    sefirah,
  });
  for (const _stat of modifiers.assistStats) {
    newState = applyEvent(newState, {
      kind: 'assist-contributed',
      challengerId: playerId,
      sefirah,
    });
  }

  return {
    ok: true,
    value: {
      newState,
      outcome,
      ...(hod !== undefined ? { hodWordMatch: hod.event } : {}),
      ...(yesod !== undefined ? { yesodDreamPeek: yesod.event } : {}),
      ...(tiferet !== undefined ? { tiferetBalance: tiferet.event } : {}),
      ...(netzach !== undefined ? { netzachDeclaredDesire: netzach.event } : {}),
    },
  };
}

// ──────────────── Hod Word-Match helpers (#353) ────────────────

/**
 * Evaluate a staged Hod `name-card` against the current encounter
 * comparison-source. Returns `undefined` when the player hasn't staged
 * a name-card (the mechanic is opt-in; `design/per-sefirah-mechanics.md`
 * § 3.1).
 *
 * Comparison-source rules (design § 3.1 + C5):
 *   - Default: top of the draw pile (`state.deck[0]`).
 *   - When Shell of Hod (Deception) is active: the Shell-supplied lie
 *     at `state.encounter.deceptionMisreport`. Word-Match becomes a
 *     noise check; the engine respects the Shell rather than skipping
 *     it. The misreport is sampled once at envelope init from the
 *     encounter `seed`; its presence on the envelope is the engine's
 *     signal that the Shell is active for this encounter.
 *
 * Edge case (design § 3.1 "Empty draw pile at prep-confirm"): when the
 * deck is empty AND no `deceptionMisreport` is set, the comparison has
 * no source — the design's "drop the modifier" branch (both piles empty,
 * game-end state). Returning `undefined` here means no event is emitted
 * and no bonus is added; the caller still consumes the name-card per
 * C4 rule 2. Treating this as a "miss" would be a category error — the
 * UI would render "your guess didn't match," but no comparison happened.
 *
 * The chassis layer is responsible for reshuffling the discard before
 * the engine sees an empty deck in the normal flow; reaching this branch
 * means both piles are empty (true game-end state), which is the design's
 * "drop" case.
 */
function evaluateHodWordMatch(
  state: GameState,
): { readonly bonus: number; readonly event: HodWordMatchEvent } | undefined {
  const named = state.pendingModifiers.nameCards[0];
  if (named === undefined) return undefined;

  // Shell of Hod takes precedence over the deck top when present —
  // see design § 3.1 C5. The misreport is only sampled into the
  // envelope when the Shell is active, so its presence is sufficient
  // signal (no separate `shells` lookup needed at this layer).
  const comparisonSource =
    state.encounter?.deceptionMisreport !== undefined
      ? state.encounter.deceptionMisreport
      : state.deck[0];

  if (comparisonSource === undefined) {
    // Both piles empty (game-end state): drop the modifier silently.
    // No event, no bonus — but the caller still consumes the name-card.
    return undefined;
  }

  const matched = named === comparisonSource;
  return {
    bonus: matched ? HOD_WORD_MATCH_BONUS : 0,
    event: matched
      ? { kind: 'hod-word-match-pass', named }
      : { kind: 'hod-word-match-miss', named },
  };
}

/**
 * Remove the staged Hod `name-card` from `state.pendingModifiers` —
 * single-shot per encounter (design § 2.7). Pure: returns a new
 * `GameState`; input is unchanged. Called from `resolveChallenge`
 * regardless of pass/fail to satisfy the C4 retry-exploit fix
 * (rule 2 in design § 3.1).
 */
function consumeHodNameCard(state: GameState): GameState {
  if (state.pendingModifiers.nameCards.length === 0) return state;
  return {
    ...state,
    pendingModifiers: {
      ...state.pendingModifiers,
      nameCards: [],
    },
  };
}

// ──────────────── Yesod Dream-Peek helpers (#354) ────────────────

/**
 * Evaluate a staged Yesod `dream-guess` against the current encounter's
 * `dreamPillar`. Returns `undefined` when the player hasn't staged a
 * dream-guess (the mechanic is opt-in; `design/per-sefirah-mechanics.md`
 * § 3.6).
 *
 * Comparison-source rule (design § 3.6): the engine compares the staged
 * pillar against `state.encounter.dreamPillar`. The pillar is set once
 * at envelope init (the moment Yesod is reached) and re-derived on
 * `react-retry` (so a missed first attempt cannot inform the second)
 * — both are the reducer's job in `lib/turn-machine.ts`. The engine
 * here only reads the field.
 *
 * Drop branch (analogous to Hod's empty-deck case in § 3.1): if the
 * envelope arrived without `dreamPillar` populated — a malformed
 * snapshot, externally-injected state, or a transitional state during
 * refactor — there is no comparison source. Returning `undefined` here
 * means no event is emitted and no bonus is added; the caller still
 * consumes the dream-guess per the C4 consumption rule. Treating this
 * as a "miss" would render "your guess didn't match" in the UI even
 * though no comparison happened, which is a category error. In normal
 * play this branch is unreachable — the reducer populates `dreamPillar`
 * at envelope init when sefirah is 'yesod'.
 */
function evaluateYesodDreamPeek(
  state: GameState,
): { readonly bonus: number; readonly event: YesodDreamPeekEvent } | undefined {
  const named = state.pendingModifiers.dreamGuesses[0];
  if (named === undefined) return undefined;

  const dreamPillar = state.encounter?.dreamPillar;
  if (dreamPillar === undefined) {
    // Malformed envelope (drop branch): no comparison source, no event,
    // no bonus — but the caller still consumes the dream-guess.
    return undefined;
  }

  const matched = named === dreamPillar;
  return {
    bonus: matched ? YESOD_DREAM_PEEK_BONUS : 0,
    event: matched
      ? { kind: 'yesod-dream-peek-pass', pillar: dreamPillar }
      : { kind: 'yesod-dream-peek-miss', named },
  };
}

/**
 * Remove the staged Yesod `dream-guess` from `state.pendingModifiers` —
 * single-shot per encounter (design § 2.7). Pure: returns a new
 * `GameState`; input is unchanged. Called from `resolveChallenge`
 * regardless of pass/fail to satisfy the C4 retry-exploit fix rule 1
 * (consume-on-resolve; design § 3.6).
 */
function consumeYesodDreamGuess(state: GameState): GameState {
  if (state.pendingModifiers.dreamGuesses.length === 0) return state;
  return {
    ...state,
    pendingModifiers: {
      ...state.pendingModifiers,
      dreamGuesses: [],
    },
  };
}

// ──────────────── acceptSetback ────────────────

export interface SetbackInput {
  readonly playerId: string;
  readonly sefirah: SefirahKey;
  /**
   * True if the failure was on a shortcut-path challenge (central
   * pillar arrival at Yesod/Tiferet/Kether). Per `design/mechanics.md`,
   * shortcut failures raise Separation by 2 instead of 1.
   */
  readonly shortcut?: boolean;
}

/**
 * Absorb the cost of a failed challenge the player chose not to retry.
 *
 * Two effects are folded into a single state update:
 *
 *   1. Counter tick — emits a `check-failed-accepted` event so the
 *      Separation bump (+1, or +2 on shortcut failures) goes through
 *      `applyEvent`. Counter rules stay in `events.ts`.
 *   2. Position rollback (#280) — on a shortcut failure
 *      (`shortcut === true`) the player is pushed back one Sefirah,
 *      per `design/mechanics.md` § Shortcuts. The origin Sefirah is
 *      the other endpoint of the path the player just travelled, read
 *      from `player.lastArrivalPathNumber` (set by `applyMove` in #275).
 *      Cleared after the rollback so a subsequent challenge at the
 *      origin doesn't silently re-read as a shortcut from the old
 *      path's perspective.
 *
 * The rollback is deliberately NOT routed through `applyMove`. A
 * forced setback push must not consume a card from hand, push to
 * the discard pile, or trigger move-downward / pillar-streak side
 * effects — those are properties of a player-driven, card-played
 * arrival.
 *
 * Defensive: if `shortcut` is true but `lastArrivalPathNumber` is
 * absent (transitional snapshot, externally-injected state), the
 * position is left unchanged. The +2 Separation tick still applies.
 */
export function acceptSetback(state: GameState, input: SetbackInput): GameState {
  const shortcut = input.shortcut ?? false;
  const afterCounterTick = applyEvent(state, {
    kind: 'check-failed-accepted',
    playerId: input.playerId,
    sefirah: input.sefirah,
    shortcut,
  });

  if (!shortcut) {
    return afterCounterTick;
  }

  return rollbackPosition(afterCounterTick, input.playerId);
}

/**
 * Push a player back to the Sefirah they came from, deriving the
 * origin from `player.lastArrivalPathNumber` and clearing that field.
 * Other players are untouched. Returns the input state unchanged when
 * the target player is missing or has no recorded arrival path —
 * callers (`acceptSetback`) treat the position-update as best-effort
 * so the +2 Separation tick still lands on a malformed snapshot.
 *
 * **#303 retro-review fix.** This helper does NOT trust the caller's
 * `shortcut` flag — it independently verifies the recorded arrival
 * path's `pillarsCrossed` is `['balance', 'balance']` (the central-
 * pillar shortcut signature) before moving the player. Without that
 * check, a buggy/malicious multiplayer client could pass
 * `{ kind: 'accept-setback', shortcut: true }` after arriving via a
 * non-shortcut path (e.g. path 27 Netzach↔Hod) and get silently
 * teleported. The +2 Separation tick from `acceptSetback` still
 * fires on a no-op — the player chose to accept setback per
 * `design/mechanics.md` § Shortcuts; only the position change is
 * gated on the path actually being a shortcut.
 */
function rollbackPosition(state: GameState, playerId: string): GameState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return state;

  const arrivalPathNumber = player.lastArrivalPathNumber;
  if (arrivalPathNumber === undefined) return state;

  const path = tryPathByNumber(arrivalPathNumber);
  if (!path) return state;

  // Defense-in-depth (#303 retro): independently verify the path is a
  // central-pillar shortcut before honouring the rollback. A non-
  // shortcut path here means the caller's `shortcut` flag was wrong
  // (client bug, malicious payload, or transitional snapshot). No-op
  // the position change; the Separation tick already happened upstream.
  if (
    path.pillarsCrossed[0] !== 'balance' ||
    path.pillarsCrossed[1] !== 'balance'
  ) {
    return state;
  }

  // The origin is the OTHER endpoint of the path. Path is bidirectional
  // and `from`/`to` follow traditional top-down numbering, but the
  // player could have travelled either direction. If the recorded
  // arrival path doesn't actually touch the player's current position
  // (a corrupted/injected state — `applyMove` always lands on an
  // endpoint), no-op the position change rather than guess.
  let origin: SefirahKey;
  if (path.from === player.position) {
    origin = path.to;
  } else if (path.to === player.position) {
    origin = path.from;
  } else {
    return state;
  }

  const updatedPlayer: PlayerState = {
    ...player,
    position: origin,
    // Clear: the rollback is not a player-driven arrival, so the
    // next challenge at `origin` should NOT consult this field for
    // shortcut derivation. Future moves will re-set it via applyMove.
    lastArrivalPathNumber: undefined,
  };

  return {
    ...state,
    players: state.players.map((p) => (p.id === playerId ? updatedPlayer : p)),
  };
}

// ──────────────── Tiferet Two-Pillar Balance helpers (#488) ────────────────

/**
 * Evaluate the Tiferet Two-Pillar Balance tilt against the player's
 * currently-staged card-burns (`state.pendingModifiers.cardBurns`).
 *
 * Returns the DC tilt, the deduplicated pillar set-union touched by the
 * staged burns, and the resolve-time event the chassis renders to the
 * banner. Always returns a record — the gate on
 * `sefirah === 'tiferet'` lives at the call site. Trusts that staged
 * arcana are valid (0–21); upstream `prep-add-modifier` already
 * validates against the player's hand at staging time, so a malformed
 * arcanum here would have failed earlier.
 *
 * **Rule (design § 3.4):**
 *   - 0 or 1 burns: tilt 0 (rule explicitly requires ≥ 2 burns regardless
 *     of one-card span — single horizontal-rung burn is "silent stillness").
 *   - ≥ 2 burns AND set-union covers both Mercy AND Severity:
 *     tilt `TIFERET_BALANCE_TILT` (-2, the heart integrates light and
 *     shadow).
 *   - ≥ 2 burns otherwise (one pole only, or only Balance):
 *     tilt `TIFERET_LOPSIDED_TILT` (+2, lopsided sacrifice).
 *
 * The single source of truth for the rule. UI callers that want to
 * render a live tilt preview before `prep-confirm` should call this
 * (or share the helper via `lib/`) rather than re-deriving the rule.
 *
 * `pillarsTouched` ordering follows insertion-order of the underlying
 * `Set`: each burn's `pillarsCrossed` pair is visited left-to-right,
 * first-seen-wins. Tests that care about identity use
 * `new Set(...)` to ignore ordering; serialized as an array for stable
 * JSON for the multiplayer-broadcast event.
 */
export function evaluateTiferetBalance(state: GameState): {
  readonly tilt: number;
  readonly event: TiferetBalanceEvent;
} {
  const burns = state.pendingModifiers.cardBurns;
  const burnCount = burns.length;

  const touched = new Set<Pillar>();
  for (const arcanum of burns) {
    const path = pathByArcanum(arcanum);
    touched.add(path.pillarsCrossed[0]);
    touched.add(path.pillarsCrossed[1]);
  }
  const pillarsTouched = [...touched];

  let tilt = 0;
  if (burnCount >= 2) {
    const spansBothPoles = touched.has('mercy') && touched.has('severity');
    tilt = spansBothPoles ? TIFERET_BALANCE_TILT : TIFERET_LOPSIDED_TILT;
  }

  return {
    tilt,
    event: {
      kind: 'tiferet-balance',
      tilt,
      pillarsTouched,
      burnCount,
    },
  };
}

// ──────────────── Netzach Declared Desire helpers (#489) ────────────────

/**
 * Evaluate the Netzach Declared Desire effects against the active
 * player and the current encounter envelope. Returns the roll-side
 * `bonus` (0 or `NETZACH_DECLARED_DESIRE_BONUS`), the DC-side
 * `retryTilt` (0 or `NETZACH_RETRY_DC_TILT`), and the resolve-time
 * event the chassis renders to the prep-result banner.
 *
 * **Rule (design § 3.5):**
 *   - **bonus (+2 flatBonus):** active player has `declaredDesire`
 *     set AND their `zodiacSign` is water (Cancer/Scorpio/Pisces) or
 *     Venus-ruled (Taurus/Libra). Five of twelve signs total — the
 *     archetypes whose voice already runs on want and feeling.
 *   - **retryTilt (+1 DC):** active player has NOT declared AND
 *     `state.encounter.netzachPriorFails > 0`. The C6 fix replaces the
 *     structurally-unreachable "next visit" trigger with the same-
 *     encounter react-retry trigger ("Aphrodite tightens").
 *
 * The two effects are mutually exclusive — a declared player gets the
 * sign bonus (or not, depending on sign) but never the retry tilt;
 * an undeclared player gets the retry tilt (when priorFails > 0) but
 * never the sign bonus. The event's three variants reflect this.
 */
function evaluateNetzachDeclaredDesire(
  state: GameState,
  player: PlayerState,
): {
  readonly bonus: number;
  readonly retryTilt: number;
  readonly event: NetzachDeclaredDesireEvent;
} {
  const declared = player.declaredDesire;
  if (declared !== undefined) {
    const signEligible = isNetzachBonusSign(player.zodiacSign);
    const bonus = signEligible ? NETZACH_DECLARED_DESIRE_BONUS : 0;
    return {
      bonus,
      retryTilt: 0,
      event: signEligible
        ? { kind: 'netzach-declared-bonus', declared, retryDcTilt: 0 }
        : { kind: 'netzach-declared-no-bonus', declared, retryDcTilt: 0 },
    };
  }
  const priorFails = state.encounter?.netzachPriorFails ?? 0;
  const retryTilt = priorFails > 0 ? NETZACH_RETRY_DC_TILT : 0;
  return {
    bonus: 0,
    retryTilt,
    event: { kind: 'netzach-undeclared', retryDcTilt: retryTilt },
  };
}

/**
 * `true` iff the zodiac sign is one of the five Netzach-bonus-eligible
 * signs: water (Cancer/Scorpio/Pisces) or Venus-ruled (Taurus/Libra).
 * Reads the canonical `ZodiacSign` record so a future change to a
 * sign's element/ruler in `data/zodiac-signs.ts` flows through
 * automatically.
 */
function isNetzachBonusSign(sign: PlayerState['zodiacSign']): boolean {
  const z = zodiacSignByKey(sign);
  return z.element === 'water' || z.ruler === 'venus';
}

/**
 * Increment `state.encounter.netzachPriorFails` by 1. Called on a
 * failed Netzach resolve (#489 design § 3.5 C6). The caller checks the
 * envelope is present and at Netzach before invoking; this helper
 * trusts that invariant.
 */
function bumpNetzachPriorFails(state: GameState): GameState {
  const envelope = state.encounter;
  if (envelope === undefined) return state;
  return {
    ...state,
    encounter: {
      ...envelope,
      netzachPriorFails: (envelope.netzachPriorFails ?? 0) + 1,
    },
  };
}

/**
 * Clear `pendingStatBuff` on the named player. Returns the input state
 * unchanged when the player isn't in `state.players` (defensive — the
 * caller resolves the player from `state.players.find` upstream so
 * this branch is structurally unreachable today).
 */
function clearPendingStatBuff(state: GameState, playerId: string): GameState {
  return {
    ...state,
    players: state.players.map((p) => {
      if (p.id !== playerId) return p;
      // `exactOptionalPropertyTypes: true` rejects `pendingStatBuff:
      // undefined` — omit the key entirely via destructure-and-rest.
      const { pendingStatBuff: _, ...rest } = p;
      return rest;
    }),
  };
}

// ──────────────── Gevurah Sacred Sacrifice helpers (#487) ────────────────

/**
 * Evaluate the Gevurah Sacred Sacrifice dearest-card bonus against the
 * active player's staged card-burns and current hand. Returns the
 * total flat bonus (0 or `GEVURAH_DEAREST_BONUS` per matching burn).
 *
 * **Rule (design § 3.2):** dearest = `Math.max(...player.hand)` (the
 * raw rank-highest card the player currently holds). For each staged
 * burn whose arcanum equals the dearest, +2. In practice burns are
 * one-per-arcanum (each card is unique in the standard deck) so the
 * bonus fires at most once, but the "per matching" framing is faithful
 * to the design wording — a future variant that allows duplicate
 * burns would scale.
 *
 * **Empty hand:** returns 0. `Math.max()` over an empty array returns
 * `-Infinity` which would NEVER match a real arcanum (0-21), but we
 * short-circuit explicitly to keep the intent obvious. The reducer-
 * side gate waives at empty hand so this branch is reached only when
 * a future caller bypasses the reducer (test fixtures, bots).
 *
 * **Retry semantics:** the design specifies the dearest re-evaluates
 * "against the new hand state (the previously-burned card is gone),
 * so the new highest-rank card becomes the new dearest. The boundary
 * is each prep, not the encounter as a whole." This falls out naturally
 * from `player.hand` reflecting only cards currently held — burns
 * consumed in prior failed prep-confirms are no longer in the hand.
 *
 * **No resolve-time event.** Unlike Hod/Yesod/Tiferet/Netzach which
 * each emit a named `ChallengeSuccess.<mechanic>` field for the chassis
 * to read, Gevurah ships nothing. Downstream UI distinguishes a Gevurah
 * dearest-burn from any other +2 flatBonus by gating on
 * `sefirah === 'gevurah' && outcome.modifierBreakdown.flatBonus > 0`.
 * Asymmetry is intentional — Gevurah's mechanic doesn't carry any
 * payload beyond "the dearest fired," which the breakdown already
 * surfaces.
 */
function evaluateGevurahDearestBonus(
  state: GameState,
  player: PlayerState,
): number {
  if (player.hand.length === 0) return 0;
  const dearest = Math.max(...player.hand);
  const matches = state.pendingModifiers.cardBurns.filter(
    (a) => a === dearest,
  ).length;
  return matches * GEVURAH_DEAREST_BONUS;
}
