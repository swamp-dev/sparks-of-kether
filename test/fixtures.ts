import type { StatKey } from '@/data';
import type { GameState, PlayerState, StatSheet } from '@/engine/types';

/** A sensible-default stat sheet so test fixtures don't have to enumerate all ten. */
export const DEFAULT_STATS: StatSheet = {
  unity: 10,
  insight: 10,
  understanding: 10,
  lovingkindness: 10,
  strength: 10,
  harmony: 10,
  passion: 10,
  intellect: 10,
  intuition: 10,
  body: 10,
};

/**
 * Override any subset of stats without restating the rest. Useful for
 * tests that care about one or two specific stats.
 */
export function statSheet(overrides: Partial<Record<StatKey, number>> = {}): StatSheet {
  return { ...DEFAULT_STATS, ...overrides };
}

/**
 * Fresh player with minimum-viable defaults. Everything is overridable;
 * omit to accept the default.
 */
export function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: 'p1',
    name: 'Alex',
    position: 'malkuth',
    hand: [],
    stats: DEFAULT_STATS,
    clearedSefirot: new Set(),
    sparksHeld: new Set(),
    ...overrides,
  };
}

/**
 * Minimal game state with one default player. Pass `players` to override
 * or supply multiple; other fields default to sane zero/empty values.
 */
export function makeState(
  playerOverrides: Partial<PlayerState> = {},
  stateOverrides: Partial<GameState> = {},
): GameState {
  return {
    players: [makePlayer(playerOverrides)],
    discardPile: [],
    illumination: 0,
    separation: 0,
    ...stateOverrides,
  };
}
