import type { StatKey } from '@/data';
import type { GameState, PlayerState, StatSheet } from '@/engine/types';
import { EMPTY_ABILITY_FLAGS, EMPTY_PILLAR_STREAK, EMPTY_SHELL_STATE } from '@/engine/types';

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
    pendingAbilities: EMPTY_ABILITY_FLAGS,
    ...overrides,
  };
}

/**
 * Minimal game state with one default player. Pass `stateOverrides.players`
 * for multi-seat tests; other fields default to sane zero/empty values.
 *
 * `activePlayerId` defaults to the first player's id so existing
 * single-player tests keep working without enumerating it. Override via
 * `stateOverrides.activePlayerId` to test multi-seat turn rotation.
 */
export function makeState(
  playerOverrides: Partial<PlayerState> = {},
  stateOverrides: Partial<GameState> = {},
): GameState {
  const players = stateOverrides.players ?? [makePlayer(playerOverrides)];
  const firstPlayer = players[0];
  if (!firstPlayer) {
    throw new Error('makeState: at least one player is required');
  }
  return {
    players,
    activePlayerId: firstPlayer.id,
    deck: [],
    discardPile: [],
    illumination: 0,
    separation: 0,
    revealedCards: new Set(),
    shellCancellationsAvailable: 0,
    spentSparks: [],
    shells: EMPTY_SHELL_STATE,
    shellsDeflected: 0,
    pillarStreak: EMPTY_PILLAR_STREAK,
    ...stateOverrides,
  };
}
