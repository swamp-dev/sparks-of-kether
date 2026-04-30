import type { SefirahKey, StatKey, ZodiacSignKey } from '@/data';

/**
 * Result of a single d20 challenge resolution. Lives in `engine/types.ts`
 * (not `engine/checks.ts`) so `GameState.lastOutcome` can carry it
 * without forcing a circular import. The full check-modifier inputs
 * (`CheckModifiers`, `ChallengeSuccess`, etc.) still live in
 * `engine/checks.ts` — only the post-roll outcome moved here.
 */
export interface CheckOutcome {
  readonly rolled: number;
  readonly statContribution: number;
  readonly modifierBreakdown: {
    readonly assist: number;
    readonly cardBurn: number;
    readonly sparkBurn: number;
  };
  readonly total: number;
  readonly effectiveDC: number;
  readonly pass: boolean;
}

/**
 * Top-level turn phase. Lives on `GameState` (not `TurnSnapshot`) so
 * the multiplayer wire layer round-trips it through the persisted
 * snapshot row — the dispatcher in `lib/room-actions.ts` reads the
 * truth from state directly instead of synthesizing a value, which
 * is what allowed the pre-#227-fix `react-retry` exploit (a malicious
 * active player could fire `react-retry` cold by sending an action
 * the dispatcher would happily fold against a fake snapshot).
 *
 *   move      — player can `move` (apply path) or `meditate`.
 *   challenge — entered after `move` lands on an uncleared `'check'`
 *               Sefirah. See `challengeSubPhase` for the inner cycle.
 *   draw      — refill toward `STARTING_HAND_SIZE`, capped at HAND_CAP.
 *   end       — advance to next player; phase resets to `move`.
 */
export type TurnPhase = 'move' | 'challenge' | 'draw' | 'end';

/**
 * Active sub-phase WITHIN a challenge encounter. Defined when (and only
 * when) `phase === 'challenge'`. Cycles `prep → resolve → react`;
 * cleared (set to `undefined`) when the reducer transitions phase out
 * of `'challenge'`.
 *
 * `'resolve'` is the kernel call itself — the post-kernel snapshot is
 * `'react'` — so `'resolve'` rarely appears as a steady-state value
 * outside the reducer's own tick.
 *
 * Lives on `GameState` (not `TurnSnapshot`) for the same reason as
 * `phase`: the multiplayer dispatcher must read truth, not synthesize.
 */
export type ChallengeSubPhase = 'prep' | 'resolve' | 'react';

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
 * Fields added in later tickets (stats, sparks, zodiac sign) live in
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
  /**
   * Zodiac-sign class (Epic #212). Required since #237 (T8) — the
   * Soul Aspect transition is complete and every player flow now
   * funnels through the zodiac picker. Soul Doors (Epic #240) read
   * this on every challenge to compute the per-Door DC discount.
   */
  readonly zodiacSign: ZodiacSignKey;
  /**
   * Path number (11..32) the player last travelled to arrive at
   * `position`. `undefined` for fresh players who have not yet moved.
   * Read by the challenge UI to derive whether the arrival was via a
   * central-pillar shortcut (`pillarsCrossed === ['balance', 'balance']`)
   * — the shortcut state drives both the +3 DC penalty during the
   * challenge and the +2 Separation tick on accept-setback (vs. the
   * +1 tick on a non-shortcut failure).
   *
   * Optional/additive: existing snapshots without this field survive
   * deserialisation via the `?` and the `shortcut`-derivation default
   * of `false`. The PR adding this field (E3 review) does not
   * back-fill old DB rows; the field comes into being on the next
   * `applyMove` after a snapshot loads.
   */
  readonly lastArrivalPathNumber?: number | undefined;
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
  /**
   * Whose turn it is. Server-authoritative — the events route uses
   * this to authorize incoming actions by comparing the caller's
   * `auth.uid()` against it. Advances on `end-turn` events.
   * `initializeGame` defaults to `players[0].id`.
   */
  readonly activePlayerId: string;
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
  /**
   * Lifecycle status of every Shell. Default for a new game is all
   * `dormant`; `EMPTY_SHELL_STATE` is the canonical starter.
   */
  readonly shells: ShellStateMap;
  /**
   * Count of Shell-activation thresholds the team has *deflected* via
   * Gevurah cancellations. The Shell never wakes — distinct from a
   * banishment, which is the post-active end state. Stored separately
   * from the `shells` map so a deflected Shell can still wake later
   * if another threshold fires.
   */
  readonly shellsDeflected: number;
  /**
   * Team-wide pillar-streak tracker. Mercy/Severity moves build streaks
   * in two directions (sameness and alternation); reaching a threshold
   * (3) emits the corresponding event. Balance moves are neutral.
   */
  readonly pillarStreak: PillarStreakState;
  /**
   * Modifiers staged during a challenge's `prep` sub-phase but not yet
   * locked in. Empty whenever no challenge is active and during the
   * `resolve`/`react` arc of the next challenge — cleared when phase
   * leaves `'challenge'`. Lives on `GameState` (not `TurnSnapshot`)
   * so it round-trips through the multiplayer Realtime channel:
   * allies see staged modifiers in real time, which is the
   * coordination win in `design/encounter-prep-phase.md` § 1.
   *
   * No validation, no consumption during prep — cards stay in hand,
   * Sparks stay held, ally state untouched. Validation and consumption
   * happen at `prep-confirm` (see `lib/turn-machine.ts`).
   */
  readonly pendingModifiers: PendingModifiers;
  /**
   * Top-level turn phase. Promoted onto `GameState` (from the prior
   * `TurnSnapshot`-only home) by the #227 review fix so the
   * multiplayer dispatcher reads truth from the persisted snapshot
   * row instead of synthesizing a value. The pre-fix dispatcher
   * synthesized `phase: 'challenge'` plus a fake `lastOutcome` for
   * every prep-stage action, which let a malicious active player
   * fire `react-retry` cold (no prior `prep-confirm`) or after a
   * passed challenge — the engine's "can't retry on pass" gate was
   * being bypassed by the synthesized failed `lastOutcome`.
   *
   * Maintained by the reducer in lockstep with the snapshot's view
   * (`TurnSnapshot.phase` simply reads this field).
   *
   * Default for a freshly-initialized game is `'move'`
   * (see `engine/setup.ts:initializeGame`).
   */
  readonly phase: TurnPhase;
  /**
   * Active sub-phase within a challenge encounter. Defined iff
   * `phase === 'challenge'`. Lives on `GameState` (not `TurnSnapshot`)
   * for the same reason as `phase`: the wire-format dispatcher must
   * read truth, not synthesize.
   */
  readonly challengeSubPhase?: ChallengeSubPhase | undefined;
  /**
   * Outcome of the most recent challenge resolution while in
   * `'react'` sub-phase. Used by `react-retry` to gate retry on a
   * failed roll only — the success path can't retry. Cleared on
   * retry / on phase leaving `'challenge'`. Lives on `GameState`
   * (not `TurnSnapshot`) so the wire layer can persist the truth
   * the engine needs to evaluate the gate, instead of the
   * dispatcher synthesizing a value.
   */
  readonly lastOutcome?: CheckOutcome | undefined;
  /**
   * Pending hand-size reconciliation owed by the current active
   * player (#291). Set when Meditate pulls cards over `HAND_CAP`
   * (the only over-cap path today); cleared when the player has
   * discarded `count` cards via the `discard` event. The engine's
   * `endTurn` reducer refuses to advance while this is set with
   * `count > 0`, so the player cannot escape a Meditate-over-cap
   * turn without trimming back to the cap.
   *
   * Lives on `GameState` (not `PlayerState`) because at most one
   * player at a time can be over-cap (the active player who just
   * meditated) — pinning it to the active seat avoids the
   * book-keeping cost of a per-player field that would be
   * `undefined` for every other seat.
   *
   * `requiredBy: 'end-of-turn'` is the only kind today; the field
   * exists so a future ticket could add a different reconciliation
   * trigger (e.g. a Spark that forces an immediate prune) without
   * overloading the same shape.
   */
  readonly pendingDiscard?: PendingDiscard | undefined;
  /**
   * Discriminator for the most recent action that landed the active
   * player in `phase: 'end'` (#292). Read by the UI's auto-advance
   * timer (`PlayScreen.tsx`) to distinguish:
   *
   *   - `'move-draw'` — Move + Draw arrival. The player has already
   *     seen the move land and the draw resolve; the timer flips
   *     the seat after `AUTO_ADVANCE_DELAY_MS`. (#131 cadence.)
   *   - `'meditate'`  — Meditate arrival. The player just drew up to
   *     two new cards and needs time to look at them before the seat
   *     rotates. The timer is suppressed; End Turn must be clicked
   *     manually.
   *
   * Cleared by `endTurn` when the seat rotates so the next player
   * starts with `undefined`. `undefined` outside `'end'` phase too —
   * the field only carries signal at end-of-turn.
   *
   * Lives on `GameState` (not on `PlayerState` or `TurnSnapshot`) so
   * the multiplayer wire layer round-trips it through the persisted
   * snapshot. A spectator client viewing the active player's
   * end-of-turn screen sees the same gating signal the active client
   * uses to decide whether to render an animated "drew N cards" hint.
   */
  readonly lastAction?: 'move-draw' | 'meditate' | undefined;
}

/**
 * One outstanding hand-size reconciliation. Today only emitted by
 * `meditate` when the player is at or above `HAND_CAP`; the active
 * player must shed `count` cards before the engine will let them
 * end their turn. See `GameState.pendingDiscard` for full context.
 */
export interface PendingDiscard {
  readonly count: number;
  readonly requiredBy: 'end-of-turn';
}

/**
 * Modifiers declared but not yet committed during a challenge's prep
 * sub-phase. See `design/encounter-prep-phase.md` § 4.
 */
export interface PendingModifiers {
  /** Arcanum numbers staged for card-burn. */
  readonly cardBurns: readonly number[];
  /**
   * Sparks staged for spark-burn. `sourcePlayerId` is the player whose
   * Spark will be consumed at confirm — usually the active player, but
   * an ally can offer a Spark by agreeing out of band, then the active
   * player stages it on their behalf.
   */
  readonly sparkBurns: readonly {
    readonly sefirah: SefirahKey;
    readonly sourcePlayerId: string;
  }[];
  /** Ally playerIds staged to assist. Capped at 2 per challenge. */
  readonly assistRequests: readonly string[];
}

/** Canonical empty `PendingModifiers` for new games / between challenges. */
export const EMPTY_PENDING_MODIFIERS: PendingModifiers = {
  cardBurns: [],
  sparkBurns: [],
  assistRequests: [],
};

/**
 * Pillar-streak position. Two counters move in parallel:
 *   - `sameCount` rises on consecutive non-Balance moves on the same
 *     pillar; at 3 → imbalance event (+1 Separation).
 *   - `alternationCount` rises on consecutive Mercy↔Severity crossings;
 *     at 3 → equilibrium event (+1 Illumination).
 * Balance moves do nothing — they neither advance nor reset either.
 */
export interface PillarStreakState {
  /** Last non-Balance pillar moved on; `null` until the first such move. */
  readonly currentPillar: 'mercy' | 'severity' | null;
  readonly sameCount: number;
  readonly alternationCount: number;
}

/** Canonical zeroed pillar-streak shape for new games. */
export const EMPTY_PILLAR_STREAK: PillarStreakState = {
  currentPillar: null,
  sameCount: 0,
  alternationCount: 0,
};

/** Permanent record of a single Spark expenditure. */
export interface SpentSpark {
  readonly playerId: string;
  readonly sefirah: SefirahKey;
}

// ──────────────── Shells ────────────────

/**
 * Lifecycle of a Shell:
 *   `dormant`  — default; Shell is asleep, no effect on the game.
 *   `active`   — Shell awakened; its inversion-of-Sefirah pressure is
 *                in force until banished.
 *   `banished` — Shell defeated; cannot wake again this game.
 *
 * Once banished, a Shell stays banished — there's no path back to
 * dormant or active. Names are descriptive only ("Shell of X");
 * traditional Qliphothic intelligences are NEVER named in code or UI.
 */
export type ShellStatus = 'dormant' | 'active' | 'banished';

/** Map of every Sefirah's Shell status. Default is all `dormant`. */
export type ShellStateMap = Readonly<Record<SefirahKey, ShellStatus>>;

/** Canonical "everything dormant" starter for new games. */
export const EMPTY_SHELL_STATE: ShellStateMap = {
  kether: 'dormant',
  chokmah: 'dormant',
  binah: 'dormant',
  chesed: 'dormant',
  gevurah: 'dormant',
  tiferet: 'dormant',
  netzach: 'dormant',
  hod: 'dormant',
  yesod: 'dormant',
  malkuth: 'dormant',
};

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
