import { arcana, soulAspectByKey } from '@/data';
import type { SoulAspectKey, StatKey, ZodiacSignKey } from '@/data';
import type { Rng } from './rng';
import {
  EMPTY_ABILITY_FLAGS,
  EMPTY_PILLAR_STREAK,
  EMPTY_SHELL_STATE,
} from './types';
import type { GameState, PlayerState, StatSheet } from './types';
import { zodiacBonus } from './zodiac-bonus';

/**
 * Per-player setup input — what the lobby has gathered before dealing.
 * Stats come from the Sefirot-blessing ritual (#27); soulAspect from
 * the Soul Aspect picker (#28); zodiacSign from the new astrological-
 * class picker (Epic #212). Class bonuses are NOT yet folded into
 * `stats` — `initializeGame` applies them and clamps to [1, 18].
 *
 * `zodiacSign` is optional during the #212 transition: callers that
 * haven't yet wired the picker (hot-seat, multiplayer-flow tests, the
 * legacy lobby) keep their existing Soul-Aspect-only behaviour. T7
 * (#236) wires the orchestration; T8 (#237) makes it required and
 * removes Soul Aspects.
 */
export interface PlayerSetup {
  readonly id: string;
  readonly name: string;
  readonly soulAspect: SoulAspectKey;
  readonly zodiacSign?: ZodiacSignKey;
  readonly stats: StatSheet;
}

/**
 * Stat clamp range. Per `design/astrological-classes.md` § 6 D5:
 * "Sign bonus is applied additively to the rolled 3d6 stat at game
 * start, capped to a floor of 1 and ceiling of 18 (matching 3d6's
 * natural range)." Applied to the *combined* class-bonus result so
 * Soul Aspect + Zodiac stack additively before clamping.
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
 * Apply class bonuses (Soul Aspect +2 to its bonus stat, plus zodiac
 * deltas if a sign is picked) additively to the rolled stats and
 * clamp each stat to [STAT_FLOOR, STAT_CEILING].
 *
 * The clamp is applied to the *combined* result, not each bonus
 * individually — so a 17 rolled stat gaining +2 (Soul Aspect) +3
 * (Virgo Mercury double-count) ends at 18, not at 17 + 5 = 22.
 *
 * **Behaviour change vs pre-#234**: the old `applySoulAspectBonus`
 * did not clamp, so a player who rolled 17 for their Soul Aspect's
 * bonus stat could end up at 19. That latent over-cap is now
 * clamped to 18 — design D5 pins the 1–18 range.
 */
function applyClassBonuses(
  stats: StatSheet,
  soulAspect: SoulAspectKey,
  zodiacSign: ZodiacSignKey | undefined,
): StatSheet {
  const aspectBonusStat = soulAspectByKey(soulAspect).bonusStat;
  const zodiacDeltas: Partial<StatSheet> =
    zodiacSign !== undefined ? zodiacBonus(zodiacSign) : {};
  const out: Partial<Record<StatKey, number>> = {};
  for (const stat of Object.keys(stats) as StatKey[]) {
    const aspectAdd = stat === aspectBonusStat ? 2 : 0;
    const zodiacAdd = zodiacDeltas[stat] ?? 0;
    const raw = stats[stat] + aspectAdd + zodiacAdd;
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
      throw new Error(
        `shuffle: index out of bounds (i=${i}, j=${j}, length=${arr.length})`,
      );
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
 *   3. Place every player at Malkuth, apply the Soul Aspect's +2
 *      bonus, initialize counter / shell / streak fields to empty.
 *
 * Note: Yesod's "start one below Malkuth" weakness from
 * `data/soul-aspects.ts` is flavor for now — the engine doesn't model
 * a sub-Malkuth waypoint. When that ticket lands, this function is
 * the natural place to special-case the Yesod player's `position`.
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
    // Apply Soul Aspect +2 + zodiac deltas (if any), clamp to [1, 18].
    // Lookup helpers throw on unknown keys, so a bad soulAspect or
    // zodiacSign fails loudly rather than silently NaN-ing the result.
    const stats = applyClassBonuses(p.stats, p.soulAspect, p.zodiacSign);
    return {
      id: p.id,
      name: p.name,
      position: 'malkuth',
      hand,
      stats,
      clearedSefirot: new Set(),
      sparksHeld: new Set(),
      pendingAbilities: EMPTY_ABILITY_FLAGS,
      // #244: persist the zodiac sign so the challenge resolver can
      // compute Soul Door DC reductions on every check, not just at
      // setup. Optional during the #212 transition (see PlayerState).
      ...(p.zodiacSign !== undefined && { zodiacSign: p.zodiacSign }),
    };
  });

  const dealtCount = playerStates.length * STARTING_HAND_SIZE;
  const drawPile = shuffled.slice(dealtCount);

  // Seat 0 acts first; `endTurn` advances seat order. The lobby
  // already orders `players` by seat before calling here.
  const firstPlayer = playerStates[0];
  if (!firstPlayer) {
    throw new Error(
      'initializeGame: cannot initialize a game with zero players',
    );
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
  };
}
