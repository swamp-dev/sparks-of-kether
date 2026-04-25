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
  /**
   * Per-player ability flags that Spark expenditures set. Consumed by
   * subsystems in later tickets (turn orchestration, challenge
   * resolution). Each flag counts remaining uses or arms a one-shot.
   */
  readonly pendingAbilities: PlayerAbilityFlags;
}

/**
 * Flags set by Spark expenditures; read by later engine subsystems.
 * Counters (`flashExtraMoves`, `separationShields`) decrement as used;
 * one-shot booleans (`harmonyArmed`, `acceptanceArmed`,
 * `courageRetryAvailable`) flip back to false on consumption.
 */
export interface PlayerAbilityFlags {
  /** Remaining free second-moves in this round (Chokmah — Flash). */
  readonly flashExtraMoves: number;
  /** Remaining "ignore this Separation increase" shields (Malkuth — Grounding). */
  readonly separationShields: number;
  /** True if Tiferet — Harmony is armed for the next challenge. */
  readonly harmonyArmed: boolean;
  /** True if Binah — Acceptance is armed to fire when any ally fails. */
  readonly acceptanceArmed: boolean;
  /** True if Netzach — Courage is available for a single reroll. */
  readonly courageRetryAvailable: boolean;
}

/** Canonical zeroed ability-flag shape for initializing players. */
export const EMPTY_ABILITY_FLAGS: PlayerAbilityFlags = {
  flashExtraMoves: 0,
  separationShields: 0,
  harmonyArmed: false,
  acceptanceArmed: false,
  courageRetryAvailable: false,
};

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
  /** Face-down draw pile. Top of the deck is index 0. */
  readonly deck: readonly number[];
  readonly discardPile: readonly number[];
  /** Team Illumination counter. Raised by Sparks, gifts, cleared Sefirot. */
  readonly illumination: number;
  /** Team Separation counter. Raised by accepted failures, shortcuts. */
  readonly separation: number;
  /**
   * Arcanum numbers publicly revealed (e.g. by a Hod Spark). Distinct
   * from "hand visibility" which is Sefirah-zone-based; this set is
   * explicitly outed cards.
   */
  readonly revealedCards: ReadonlySet<number>;
  /**
   * Counter of Shell-effect / Separation-trigger cancellations banked
   * by Gevurah Sparks; decremented when a Shell awakens or a
   * Separation trigger would fire.
   */
  readonly shellCancellationsAvailable: number;
  /**
   * Record of all spent Sparks — one entry per use. Read by Illumination
   * tracking (each spent Spark still contributes) and for replay logs.
   */
  readonly spentSparks: readonly SpentSpark[];
}

/** Permanent record of a single Spark expenditure. */
export interface SpentSpark {
  readonly playerId: string;
  readonly sefirah: SefirahKey;
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
