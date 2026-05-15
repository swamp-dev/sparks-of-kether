import { arcana } from '@/data';
import type { StatKey, ZodiacSignKey } from '@/data';
import type { Rng } from './rng';
import {
  EMPTY_ABILITY_FLAGS,
  EMPTY_PENDING_MODIFIERS,
  EMPTY_PILLAR_STREAK,
  EMPTY_SHELL_STATE,
} from './types';
import type { GameState, PlayerState, StatSheet } from './types';
import { zodiacBonus } from './zodiac-bonus';

/**
 * Per-player setup input — what the lobby has gathered before dealing.
 * Stats come from the Sefirot-blessing ritual (#27); zodiacSign from
 * the astrological-class picker (Epic #212). Class bonuses are NOT
 * yet folded into `stats` — `initializeGame` applies them and clamps
 * to [1, 18].
 *
 * Soul Aspects (`soulAspect: SoulAspectKey`) were removed in #237 (T8)
 * after the Zodiac picker (#236 T7) became the sole class-selection
 * UI. The dignity-derived per-stat deltas now carry the full class-
 * bonus weight; no Soul-Aspect +2 stack on top.
 */
export interface PlayerSetup {
  readonly id: string;
  readonly name: string;
  readonly zodiacSign: ZodiacSignKey;
  readonly stats: StatSheet;
}

/**
 * Stat clamp range. Per `design/astrological-classes.md` § 6 D5:
 * "Sign bonus is applied additively to the rolled 3d6 stat at game
 * start, capped to a floor of 1 and ceiling of 18 (matching 3d6's
 * natural range)." Applied to the *combined* class-bonus result.
 */
const STAT_FLOOR = 1;
const STAT_CEILING = 18;

/**
 * Hand size dealt at game start. Per `design/mechanics.md` § Starting
 * hand: every player starts with 4 cards regardless of count. The
 * hand-size cap of 6 leaves a 2-card buffer for early gifts and
 * draws.
 */
export const STARTING_HAND_SIZE = 4;

/**
 * Hand-size hard cap. Per `design/mechanics.md` § Drawing & gift
 * handling: "Hand-size cap is 6; starting at 4 leaves a 2-card buffer
 * for early gifts and draws before the cap starts to bite."
 *
 * Enforced at gift / spark-ability sites (Chesed-Grace rejects with
 * `gift-rejected-cap-full`; Kether-Unity skips at-cap players). The
 * end-of-turn replenish target is `STARTING_HAND_SIZE`, which is
 * already below the cap so no clamp is needed there.
 */
export const HAND_CAP = 6;

/**
 * Number of full Major-Arcana decks (22 cards each) shuffled into
 * the draw pile. Per `design/mechanics.md`:
 *   - 2 players → 1 deck (22 cards)
 *   - 3 or 4 players → 2 decks (44 cards)
 *
 * Throws on out-of-range player counts; this is a programmer error
 * (the lobby should reject 1- or 5+-player rooms before calling).
 */
export function deckCountFor(playerCount: number): 1 | 2 {
  if (playerCount === 2) return 1;
  if (playerCount === 3 || playerCount === 4) return 2;
  throw new Error(`Unsupported player count: ${playerCount} (must be 2..4)`);
}

/**
 * Apply zodiac dignity deltas additively to the rolled stats and
 * clamp each stat to [STAT_FLOOR, STAT_CEILING] per design D5.
 *
 * The clamp is applied to the *combined* result, not each bonus
 * individually — so a 17 rolled stat gaining +3 (Virgo Mercury
 * double-count) ends at 18, not at 17 + 3 = 20.
 *
 * Pre-#237 this also applied a Soul Aspect +2 bonus on top; that
 * stack was removed when Soul Aspects were retired (Epic #212 T8).
 */
function applyClassBonuses(stats: StatSheet, zodiacSign: ZodiacSignKey): StatSheet {
  const zodiacDeltas = zodiacBonus(zodiacSign);
  const out: Partial<Record<StatKey, number>> = {};
  for (const stat of Object.keys(stats) as StatKey[]) {
    const zodiacAdd = zodiacDeltas[stat] ?? 0;
    const raw = stats[stat] + zodiacAdd;
    out[stat] = Math.max(STAT_FLOOR, Math.min(STAT_CEILING, raw));
  }
  return out as StatSheet;
}

/**
 * Fisher–Yates in-place shuffle, driven by the seeded `Rng` so tests
 * are deterministic. Returns a new array; the input is not mutated.
 *
 * `arr[i]` and `arr[j]` are provably in-bounds — `i` runs from
 * `arr.length-1` down to 1, `j = rng.int(0, i)` is bounded by `i`.
 * The `assertDefined` calls satisfy `noUncheckedIndexedAccess` and
 * surface a real bug (e.g. an `Rng.int` that returns out-of-range)
 * loudly rather than silently leaving cards unshuffled.
 */
function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    const a = arr[i];
    const b = arr[j];
    if (a === undefined || b === undefined) {
      throw new Error(`shuffle: index out of bounds (i=${i}, j=${j}, length=${arr.length})`);
    }
    arr[i] = b;
    arr[j] = a;
  }
  return arr;
}

export interface InitializeGameInput {
  readonly players: readonly PlayerSetup[];
  readonly rng: Rng;
}

/**
 * Build a fresh `GameState` from the lobby's gathered setup data.
 *
 * Steps:
 *   1. Build the draw pile by shuffling N copies of the 22 Major
 *      Arcana (N from `deckCountFor(playerCount)`).
 *   2. Deal `STARTING_HAND_SIZE` cards to each player from the top.
 *   3. Place every player at Malkuth, apply the zodiac dignity
 *      deltas, initialize counter / shell / streak fields to empty.
 */
export function initializeGame(input: InitializeGameInput): GameState {
  const { players, rng } = input;
  // `deckCountFor` is the authoritative player-count gate — it
  // throws on out-of-range; we let that throw propagate rather than
  // duplicating the check.
  const decks = deckCountFor(players.length);
  // Build the deck: N copies of arcana numbers 0..21.
  const fullDeck: number[] = [];
  for (let d = 0; d < decks; d++) {
    for (const a of arcana) fullDeck.push(a.number);
  }
  const shuffled = shuffle(fullDeck, rng);

  const playerStates: PlayerState[] = players.map((p, idx) => {
    const start = idx * STARTING_HAND_SIZE;
    const hand = shuffled.slice(start, start + STARTING_HAND_SIZE);
    // Apply zodiac dignity deltas, clamp to [1, 18]. Lookup helpers
    // throw on unknown keys, so a bad zodiacSign fails loudly rather
    // than silently NaN-ing the result.
    const stats = applyClassBonuses(p.stats, p.zodiacSign);
    return {
      id: p.id,
      name: p.name,
      position: 'malkuth',
      hand,
      stats,
      clearedSefirot: new Set(),
      sparksHeld: new Set(),
      pendingAbilities: EMPTY_ABILITY_FLAGS,
      // Soul Doors (Epic #240) read this on every challenge to
      // compute the per-Door DC discount. Required since #237 (T8).
      zodiacSign: p.zodiacSign,
    };
  });

  const dealtCount = playerStates.length * STARTING_HAND_SIZE;
  const drawPile = shuffled.slice(dealtCount);

  // Seat 0 acts first; `endTurn` advances seat order. The lobby
  // already orders `players` by seat before calling here.
  const firstPlayer = playerStates[0];
  if (!firstPlayer) {
    throw new Error('initializeGame: cannot initialize a game with zero players');
  }

  return {
    players: playerStates,
    activePlayerId: firstPlayer.id,
    deck: drawPile,
    discardPile: [],
    illumination: 0,
    separation: 0,
    revealedCards: new Set(),
    shellCancellationsAvailable: 0,
    spentSparks: [],
    shells: EMPTY_SHELL_STATE,
    shellsDeflected: 0,
    pillarStreak: EMPTY_PILLAR_STREAK,
    pendingModifiers: EMPTY_PENDING_MODIFIERS,
    // Phase machinery now lives on `GameState` (post-#227 review
    // fix). New games start in 'move' with no challenge sub-phase
    // and no prior outcome.
    phase: 'move',
    challengeSubPhase: undefined,
    lastOutcome: undefined,
    // #503: per-turn Meditate cap flag. Initialized false; set true
    // by the `meditate` reducer; cleared by `endTurn` on seat rotation.
    meditatedThisTurn: false,
    // #17: Shell of Yesod (Illusion) and Shell of Chokmah (Paralysis)
    // fields. Both are absent at game start — additive/optional fields.
  };
}
