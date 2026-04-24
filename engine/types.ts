import type { SefirahKey, StatKey } from '@/data';

/**
 * Result discriminated union for fallible engine operations.
 *
 * Engine functions never throw on "expected" failures (invalid move,
 * card not in hand, etc.). They return a `Result` so callers must
 * branch on the outcome. `throw` is reserved for programmer errors
 * (unknown IDs, out-of-range values) — things the type system should
 * have prevented.
 */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: E };

/**
 * A single player's state during a game. Immutable — engine reducers
 * return new `PlayerState` instances rather than mutating in place.
 *
 * Fields added in later tickets (stats, sparks, soul aspect) live in
 * separate type extensions; this module keeps only what the movement
 * engine needs, so those additions don't churn this file.
 */
/** Ten-stat character sheet, one stat per Sefirah. */
export type StatSheet = Readonly<Record<StatKey, number>>;

export interface PlayerState {
  readonly id: string;
  readonly name: string;
  readonly position: SefirahKey;
  /** Major Arcana numbers (0–21) held by the player. */
  readonly hand: readonly number[];
  /**
   * Stats produced by the Sefirot-blessing ritual at setup. Keyed by
   * the corresponding Sefirah's `stat` field in `data/sefirot.ts`.
   */
  readonly stats: StatSheet;
  /**
   * Sefirot this player has personally cleared — one Spark earned per
   * entry. A `ReadonlySet` (not array) because membership checks are
   * O(1) on the hot path, and the game's rules guarantee uniqueness.
   */
  readonly clearedSefirot: ReadonlySet<SefirahKey>;
  /**
   * Sparks held, keyed by the Sefirah that granted them. Spent sparks
   * are removed; Illumination tracking still sees them via the event
   * log (ticket #15).
   */
  readonly sparksHeld: ReadonlySet<SefirahKey>;
}

/**
 * Game-wide state. Engine reducers return new instances; this is
 * never mutated in place.
 *
 * Counters are stored as simple totals; ticket #15 adds event sourcing
 * on top so that pillar-streak tracking and auditability come for free.
 * The shape here is forward-compatible.
 */
export interface GameState {
  readonly players: readonly PlayerState[];
  readonly discardPile: readonly number[];
  /** Team Illumination counter. Raised by Sparks, gifts, cleared Sefirot. */
  readonly illumination: number;
  /** Team Separation counter. Raised by accepted failures, shortcuts. */
  readonly separation: number;
}

// ──────────────── Move-specific failure kinds ────────────────

/**
 * Reasons a move can be rejected. Discriminated so callers can branch
 * exhaustively and render precise UI messages. `kind` is the only
 * required field; `arcanumNumber`/`pathNumber`/`from` give enough
 * context to craft a human message without re-deriving state.
 */
export type MoveRejection =
  | { readonly kind: 'unknown-player'; readonly playerId: string }
  | { readonly kind: 'unknown-path'; readonly pathNumber: number }
  | {
      readonly kind: 'card-not-in-hand';
      readonly arcanumNumber: number;
      readonly pathNumber: number;
    }
  | {
      readonly kind: 'path-does-not-connect';
      readonly from: SefirahKey;
      readonly pathNumber: number;
    };

export type MoveResult = Result<GameState, MoveRejection>;
