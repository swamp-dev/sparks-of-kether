import { sefirahByKey, tryPathByNumber } from '@/data';
import type { SefirahKey } from '@/data';
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
  // Effective DC composes two DC-side adjustments: the central-pillar
  // shortcut penalty (+3) and the Soul Door delta (typically -2).
  // They stack additively — Sagittarius on the shortcut at Yesod
  // (a Door for that class) faces baseDC + 3 - 2 = baseDC + 1.
  const shortcutAdjustment = modifiers.shortcutPenalty ? SHORTCUT_DC_PENALTY : 0;
  const soulDoorAdjustment = modifiers.soulDoorDelta ?? 0;
  const effectiveDC = dc + shortcutAdjustment + soulDoorAdjustment;

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
  // #244: auto-inject Soul Door delta from the player's class when
  // the caller hasn't supplied one. UI callers (ChallengeModal) set
  // their own so the pre-roll animation matches the engine's DC; the
  // explicit-override branch (modifiers.soulDoorDelta !== undefined)
  // honours that. Since #237 (T8) zodiacSign is always present, so
  // the auto-inject always produces a real delta (0 if the sefirah
  // isn't a Door for this class).
  const resolvedModifiers: CheckModifiers =
    modifiers.soulDoorDelta !== undefined
      ? modifiers
      : {
          ...modifiers,
          soulDoorDelta: soulDoorDcDelta(player.zodiacSign, sefirah),
        };
  const outcome =
    input.outcome ??
    rollCheck({
      stat,
      dc: sefirahRecord.challenge.dc,
      modifiers: resolvedModifiers,
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

  const stateWithCleared: GameState = {
    ...state,
    players: state.players.map((p) => (p.id === playerId ? updatedPlayer : p)),
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

  return { ok: true, value: { newState, outcome } };
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
 */
function rollbackPosition(state: GameState, playerId: string): GameState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return state;

  const arrivalPathNumber = player.lastArrivalPathNumber;
  if (arrivalPathNumber === undefined) return state;

  const path = tryPathByNumber(arrivalPathNumber);
  if (!path) return state;

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
