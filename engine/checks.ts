import { sefirahByKey } from '@/data';
import type { SefirahKey } from '@/data';
import type { Rng } from './rng';
import type { GameState, PlayerState, Result } from './types';

// ──────────────── Modifier constants ────────────────

/** Per-card-burn bonus added to the total. See `design/mechanics.md` § Stat checks. */
export const CARD_BURN_BONUS = 3;

/** Per-spark-burn bonus. More potent than cards; use sparingly. */
export const SPARK_BURN_BONUS = 5;

/** Central-pillar (shortcut) arrival bumps the effective DC this much. */
export const SHORTCUT_DC_PENALTY = 3;

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
}

export interface CheckOutcome {
  readonly rolled: number;
  readonly statContribution: number;
  readonly modifierBreakdown: {
    readonly assist: number;
    readonly cardBurn: number;
    readonly sparkBurn: number;
  };
  readonly total: number;
  readonly effectiveDC: number;
  readonly pass: boolean;
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
 * What a successful `resolveChallenge` invocation returns.
 *
 * **IMPORTANT:** `ok: true` means "the challenge was resolved" (the
 * roll completed without structural error), NOT "the player passed."
 * Always inspect `outcome.pass` before treating a resolution as
 * success. On `outcome.pass === false`, `newState === input.state`
 * (same reference) — the reducer returns input state unchanged on
 * failure so the caller can choose retry vs. `acceptSetback`.
 */
export interface ChallengeSuccess {
  readonly newState: GameState;
  readonly outcome: CheckOutcome;
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
  const total = rolled + stat + assist + cardBurn + sparkBurn;
  const effectiveDC = modifiers.shortcutPenalty ? dc + SHORTCUT_DC_PENALTY : dc;

  return {
    rolled,
    statContribution: stat,
    modifierBreakdown: { assist, cardBurn, sparkBurn },
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
 * returned UNCHANGED so the caller can choose: either burn another
 * card/spark and retry, or call `acceptSetback` to absorb the
 * Separation penalty and back off.
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
  const outcome = rollCheck({
    stat,
    dc: sefirahRecord.challenge.dc,
    modifiers,
    rng,
  });

  if (!outcome.pass) {
    return { ok: true, value: { newState: state, outcome } };
  }

  const updatedPlayer: PlayerState = {
    ...player,
    clearedSefirot: new Set(player.clearedSefirot).add(sefirah),
    sparksHeld: new Set(player.sparksHeld).add(sefirah),
  };

  const newState: GameState = {
    ...state,
    players: state.players.map((p) => (p.id === playerId ? updatedPlayer : p)),
    illumination: state.illumination + 1,
  };

  return { ok: true, value: { newState, outcome } };
}

// ──────────────── acceptSetback ────────────────

export interface SetbackOptions {
  /**
   * True if the failure was on a shortcut-path challenge (central
   * pillar arrival at Yesod/Tiferet/Kether). Per `design/mechanics.md`,
   * shortcut failures raise Separation by 2 instead of 1.
   */
  readonly shortcut?: boolean;
}

/**
 * Absorb the cost of a failed challenge the player chose not to retry.
 * Raises team Separation by 1 (or by 2 for shortcut failures). Position
 * rollback (being pushed back one Sefirah) happens at the movement
 * layer, not here — this reducer owns the counter bump only.
 */
export function acceptSetback(state: GameState, opts: SetbackOptions = {}): GameState {
  const delta = opts.shortcut ? 2 : 1;
  return { ...state, separation: state.separation + delta };
}
