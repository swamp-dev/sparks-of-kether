import type { StatKey, ZodiacSignKey } from '@/data';
import type { GameState, PlayerState, StatSheet } from '@/engine/types';
import {
  EMPTY_ABILITY_FLAGS,
  EMPTY_PENDING_MODIFIERS,
  EMPTY_PILLAR_STREAK,
  EMPTY_SHELL_STATE,
} from '@/engine/types';
import { initializeGame, type PlayerSetup } from '@/engine/setup';
import { seededRng } from '@/engine/rng';
import type { RoomRow } from '@/lib/supabase';

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
 *
 * `zodiacSign` defaults to `'aries'` since #237 made it required on
 * PlayerState — pick something neutral for fixtures that don't care
 * about the class. Tests that want to exercise specific dignity or
 * Soul Door behaviour should override.
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
    zodiacSign: 'aries',
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
    pendingModifiers: EMPTY_PENDING_MODIFIERS,
    // Phase machinery on GameState (post-#227 review fix). Defaults
    // mirror `engine/setup.initializeGame`. Tests that want to drive
    // phase / sub-phase / lastOutcome explicitly pass them in
    // `stateOverrides`.
    phase: 'move',
    challengeSubPhase: undefined,
    lastOutcome: undefined,
    ...stateOverrides,
  };
}

/**
 * Default zodiac signs assigned in seat order when callers of
 * `makeFullGame` don't specify their own. Length matches the MVP
 * cap (4 players); seats beyond that aren't allowed by
 * `engine/setup.deckCountFor`. The picks are net-neutral or mildly
 * positive in the dignity table so tests don't get surprise stat
 * shifts: Aries (net 0), Leo (net 0), Libra (net 0), Cancer (net 0).
 */
const DEFAULT_ZODIAC_SIGN_ORDER: readonly ZodiacSignKey[] = ['aries', 'leo', 'libra', 'cancer'];

export interface MakeRoomOverrides {
  readonly id?: string;
  readonly code?: string;
  readonly host_id?: string;
  readonly state?: RoomRow['state'];
  readonly created_at?: string;
  readonly started_at?: string | null;
  readonly finished_at?: string | null;
  readonly paused_at?: string | null;
}

/**
 * RoomRow factory mirroring the schema in `supabase/migrations/0001_init.sql`.
 * Defaults: `state: 'lobby'`, `host_id: 'host-uid'`, deterministic `code`
 * generated from a counter so two `makeRoom()` calls produce different
 * codes within a test file. Override any field via the param.
 */
let _roomCodeCounter = 0;
function nextDefaultCode(): string {
  _roomCodeCounter = (_roomCodeCounter + 1) % 1_000_000;
  // 6 chars, [A-Z0-9], deterministic per counter — matches the
  // shape `lib/room-code.ts` produces in production but is stable
  // for tests.
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let n = _roomCodeCounter + 1; // 1-based so the first code isn't all 'A'
  let code = '';
  for (let i = 0; i < 6; i++) {
    code = alphabet[n % alphabet.length] + code;
    n = Math.floor(n / alphabet.length);
  }
  return code;
}

export function makeRoom(overrides: MakeRoomOverrides = {}): RoomRow {
  return {
    id: overrides.id ?? 'room-uuid',
    code: overrides.code ?? nextDefaultCode(),
    host_id: overrides.host_id ?? 'host-uid',
    state: overrides.state ?? 'lobby',
    created_at: overrides.created_at ?? '2026-04-27T00:00:00Z',
    started_at: overrides.started_at ?? null,
    finished_at: overrides.finished_at ?? null,
    paused_at: overrides.paused_at ?? null,
  };
}

export interface MakeFullGameInput {
  readonly playerCount: 2 | 3 | 4;
  /**
   * Zodiac signs to assign in seat order. Must equal `playerCount`
   * length and contain unique entries. Defaults to the first
   * `playerCount` of `DEFAULT_ZODIAC_SIGN_ORDER`.
   */
  readonly zodiacSigns?: readonly ZodiacSignKey[];
  /** RNG seed for deterministic deck shuffling. */
  readonly seed: number;
}

/**
 * Wrapper around `engine/setup.initializeGame` that produces a fully-
 * dealt `GameState` with deterministic RNG. Useful for tests that
 * need a real starting position (deck shuffled, hands dealt, zodiac
 * dignity deltas applied) rather than the empty zero-state from
 * `makeState`.
 *
 * Player IDs are seat-indexed (`p1`, `p2`, ...). Seat 0 is `p1` and
 * is the starting active player per `initializeGame`'s convention.
 * Stats default to `DEFAULT_STATS` for every player; the zodiac
 * dignity bonuses apply on top.
 *
 * Throws on `playerCount` outside 2..4 — same range as
 * `engine/setup.deckCountFor`.
 */
export function makeFullGame(input: MakeFullGameInput): GameState {
  const { playerCount, seed } = input;
  if (playerCount < 2 || playerCount > 4) {
    // initializeGame would also throw, but with a less-friendly
    // message about "deck count" instead of "player count."
    throw new Error(`makeFullGame: playerCount must be 2, 3, or 4 — got ${playerCount}`);
  }
  const signs = input.zodiacSigns ?? DEFAULT_ZODIAC_SIGN_ORDER.slice(0, playerCount);
  if (signs.length !== playerCount) {
    throw new Error(
      `makeFullGame: zodiacSigns length ${signs.length} does not match playerCount ${playerCount}`,
    );
  }
  if (new Set(signs).size !== signs.length) {
    throw new Error(`makeFullGame: zodiacSigns must be unique across players`);
  }
  const setups: PlayerSetup[] = signs.map((sign, idx) => ({
    id: `p${idx + 1}`,
    name: `Player ${idx + 1}`,
    zodiacSign: sign,
    stats: DEFAULT_STATS,
  }));
  return initializeGame({ players: setups, rng: seededRng(seed) });
}
