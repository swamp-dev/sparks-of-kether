import { arcana, soulAspectByKey } from '@/data';
import type { SoulAspectKey, StatKey } from '@/data';
import type { Rng } from './rng';
import {
  EMPTY_ABILITY_FLAGS,
  EMPTY_PILLAR_STREAK,
  EMPTY_SHELL_STATE,
} from './types';
import type { GameState, PlayerState, StatSheet } from './types';

/**
 * Per-player setup input — what the lobby has gathered before dealing.
 * Stats come from the Sefirot-blessing ritual (#27); soulAspect from
 * the Soul Aspect picker (#28). The +2 bonus for the Soul Aspect is
 * NOT yet folded into `stats` — `initializeGame` applies it.
 */
export interface PlayerSetup {
  readonly id: string;
  readonly name: string;
  readonly soulAspect: SoulAspectKey;
  readonly stats: StatSheet;
}

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
 * Bonus stat per Soul Aspect. Mirrors `data/soul-aspects.ts`'s
 * `bonusStat` field; resolved at deal time so the resulting
 * `PlayerState.stats` already reflects the +2 the player rolls with.
 */
function applySoulAspectBonus(
  stats: StatSheet,
  bonusStat: StatKey,
): StatSheet {
  return { ...stats, [bonusStat]: stats[bonusStat] + 2 };
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
    // Pull the bonus stat from the data layer's throwing lookup
    // instead of accepting a pre-computed map — that way an unknown
    // soul-aspect key fails loudly rather than silently NaN-ing the
    // resulting stat.
    const bonusStat = soulAspectByKey(p.soulAspect).bonusStat;
    const stats = applySoulAspectBonus(p.stats, bonusStat);
    return {
      id: p.id,
      name: p.name,
      position: 'malkuth',
      hand,
      stats,
      clearedSefirot: new Set(),
      sparksHeld: new Set(),
      pendingAbilities: EMPTY_ABILITY_FLAGS,
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
