import type { SoulAspectKey } from '@/data';
import type { PlayerSetup } from '@/engine/setup';
import type { StatSheet } from '@/engine/types';
import type { PlayerRow, RoomRow } from './supabase';

/**
 * Default stats every player gets at game start. Per
 * `design/mechanics.md` § Stat sheet, players normally roll their
 * Sefirot blessings to build a custom sheet — but the multiplayer
 * blessing UI doesn't exist yet, so for now everyone starts with
 * 10 in every stat. The Soul Aspect's +2 bonus still applies on top
 * via `engine/setup.initializeGame`'s class-bonus step (which also
 * applies any picked zodiac sign's deltas, post-#234). Per-Sefirah
 * blessings are a follow-up ticket.
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
      readonly kind: 'missing-soul-aspect';
      readonly playerIds: readonly string[];
    }
  | {
      readonly kind: 'duplicate-soul-aspects';
      readonly aspects: readonly SoulAspectKey[];
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
 *   4. Every player must have a soul_aspect set.
 *   5. Soul Aspects must be unique across players (design rule).
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

  const missing = sorted
    .filter((p) => p.soul_aspect === null)
    .map((p) => p.id);
  if (missing.length > 0) {
    return {
      ok: false,
      error: { kind: 'missing-soul-aspect', playerIds: missing },
    };
  }

  // Every player has soul_aspect non-null at this point. Cast is
  // safe — the filter above caught the nulls.
  const aspects = sorted.map((p) => p.soul_aspect as SoulAspectKey);
  const aspectSet = new Set(aspects);
  if (aspectSet.size !== aspects.length) {
    return {
      ok: false,
      error: { kind: 'duplicate-soul-aspects', aspects },
    };
  }

  const setups: PlayerSetup[] = sorted.map((p) => ({
    id: p.id,
    name: p.nickname,
    // Cast is safe — we filtered out null aspects above.
    soulAspect: p.soul_aspect as SoulAspectKey,
    stats: DEFAULT_MP_STATS,
  }));

  return { ok: true, value: { setups } };
}
