import type { ZodiacSignKey } from '@/data';
import type { PlayerSetup } from '@/engine/setup';
import type { StatSheet } from '@/engine/types';
import type { PlayerRow, RoomRow } from './supabase';

/**
 * Default stats every player gets at game start. Per
 * `design/mechanics.md` § Stat sheet, players normally roll their
 * Sefirot blessings to build a custom sheet — but the multiplayer
 * blessing UI doesn't exist yet, so for now everyone starts with
 * 10 in every stat. The picked zodiac sign's dignity deltas still
 * apply on top via `engine/setup.initializeGame`'s class-bonus step.
 * Per-Sefirah blessings are a follow-up ticket.
 */
const DEFAULT_MP_STATS: StatSheet = {
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

export type StartGameError =
  | { readonly kind: 'not-host' }
  | {
      readonly kind: 'not-lobby';
      readonly currentState: RoomRow['state'];
    }
  | { readonly kind: 'too-few-players'; readonly count: number }
  | { readonly kind: 'too-many-players'; readonly count: number }
  | {
      readonly kind: 'missing-zodiac-sign';
      readonly playerIds: readonly string[];
    }
  | {
      readonly kind: 'duplicate-zodiac-signs';
      readonly signs: readonly ZodiacSignKey[];
    };

export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export interface ValidateAndBuildSetupInput {
  readonly room: RoomRow;
  readonly players: readonly PlayerRow[];
  readonly callerId: string;
}

export interface ValidatedSetup {
  readonly setups: readonly PlayerSetup[];
}

/**
 * Pure: turn a `(room, players, callerId)` triple into the input the
 * engine's `initializeGame` expects, or a structured error.
 *
 * Rules (in order):
 *   1. Caller must be the room's host.
 *   2. Room must be in `lobby` state (not playing/finished).
 *   3. Player count must be 2..4 (matches `deckCountFor`).
 *   4. Every player must have a zodiac_sign set.
 *   5. Zodiac signs must be unique across players (design rule).
 *
 * Returns players in seat order so seat 0 is the active starting
 * player — consistent with `initializeGame`'s `players[0].id`
 * default for `activePlayerId`.
 */
export function validateAndBuildSetup(
  input: ValidateAndBuildSetupInput,
): Result<ValidatedSetup, StartGameError> {
  const { room, players, callerId } = input;

  if (callerId !== room.host_id) {
    return { ok: false, error: { kind: 'not-host' } };
  }
  if (room.state !== 'lobby') {
    return {
      ok: false,
      error: { kind: 'not-lobby', currentState: room.state },
    };
  }
  if (players.length < 2) {
    return {
      ok: false,
      error: { kind: 'too-few-players', count: players.length },
    };
  }
  if (players.length > 4) {
    return {
      ok: false,
      error: { kind: 'too-many-players', count: players.length },
    };
  }

  const sorted = [...players].sort((a, b) => a.seat - b.seat);

  const missing = sorted.filter((p) => p.zodiac_sign === null).map((p) => p.id);
  if (missing.length > 0) {
    return {
      ok: false,
      error: { kind: 'missing-zodiac-sign', playerIds: missing },
    };
  }

  // Every player has zodiac_sign non-null at this point. Cast is
  // safe — the filter above caught the nulls.
  const signs = sorted.map((p) => p.zodiac_sign as ZodiacSignKey);
  const signSet = new Set(signs);
  if (signSet.size !== signs.length) {
    return {
      ok: false,
      error: { kind: 'duplicate-zodiac-signs', signs },
    };
  }

  const setups: PlayerSetup[] = sorted.map((p) => ({
    id: p.id,
    name: p.nickname,
    // Cast is safe — we filtered out null signs above.
    zodiacSign: p.zodiac_sign as ZodiacSignKey,
    stats: DEFAULT_MP_STATS,
  }));

  return { ok: true, value: { setups } };
}
