import type { Pillar, SefirahKey, StatKey, ZodiacSignKey } from '@/data';

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
    /**
     * Per-Sefirah flat bonus contribution (#334). Optional so legacy
     * callers — and any post-roll consumers that don't render this
     * line — keep type-checking without changes. Populated by the
     * resolver only when the input `flatBonus > 0`; downstream
     * per-Sefirah tickets (Hod +5, Yesod +5, Gevurah / Netzach /
     * Chokmah +2) read it to render the "+5 (dream match)" style
     * roll-result explanation.
     */
    readonly flatBonus?: number;
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
 *   kether    — Final Threshold collective ritual (#335;
 *               `design/final-threshold.md`). See `ketherRitual` for
 *               the in-ritual state and `KetherSubPhase` for the inner
 *               gather → witness → close cycle. The phase exits to
 *               `'end'` once `threshold-confirm` lands; the
 *               `EndgameStatus` returned by `checkEndgame` post-confirm
 *               carries the actual `'won'` / `'lost'` signal.
 */
export type TurnPhase = 'move' | 'challenge' | 'draw' | 'end' | 'kether';

/**
 * Active sub-phase WITHIN the Final Threshold ritual (#335;
 * `design/final-threshold.md` § 3.2). Defined when (and only when)
 * `phase === 'kether'`.
 *
 *   gather   — team has converged; hands revealed, Sparks pooled,
 *              `witnessOrder` and `personalQueueLengths` frozen.
 *              Transient — the reducer immediately moves to `'witness'`
 *              once gather init completes. NOT a durable sub-state in
 *              K1: `initKetherRitual` writes `subPhase: 'witness'`
 *              directly. The literal exists in the type for spec-
 *              alignment with `design/final-threshold.md` § 3.2 so a
 *              future ticket can introduce a discrete gather pause
 *              (e.g. for a "ready up" UI step) without re-widening
 *              the union.
 *   witness  — round-robin contribution. Each turn one player plays or
 *              passes one card. The reducer transitions to `'close'`
 *              when every queue has emptied.
 *   close    — closure window. Players stage held Sparks; the first
 *              `threshold-confirm` consumes the staged set, evaluates
 *              the gap, sets `EndgameStatus`, and exits `phase` to
 *              `'end'`.
 *
 * Cleared (`undefined`) outside `phase === 'kether'`.
 */
export type KetherSubPhase = 'gather' | 'witness' | 'close';

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
  /**
   * Per-encounter scratch state for the per-Sefirah mechanic twists
   * (#334; `design/per-sefirah-mechanics.md` § 2.6 (b)). Defined when
   * (and only when) a challenge encounter is active — initialized at
   * `move` → `challenge` entry, cleared at `accept-setback` /
   * passing `prep-confirm`. See `EncounterEnvelope` for shape.
   *
   * Lives on `GameState` (not `TurnSnapshot`) for the same reason as
   * `phase` and `lastOutcome`: the multiplayer wire-format dispatcher
   * must read truth from the persisted snapshot, not synthesize.
   *
   * Surface only (#334). The eight per-Sefirah mechanic tickets that
   * read / write the per-mechanic fields (Yesod `dreamPillar`, Chokmah
   * `chokmahPriorAttempts`, etc.) ship downstream. The lifecycle
   * (init / mutate / clear) is owned here.
   */
  readonly encounter?: EncounterEnvelope | undefined;
  /**
   * Per-ritual scratch state for the Final Threshold collective
   * encounter (#335; `design/final-threshold.md` § 5.1). Defined when
   * (and only when) `phase === 'kether'` — initialized on ritual entry
   * by `initKetherRitual` (`engine/kether.ts`) and cleared when
   * `threshold-confirm` exits the phase to `'end'`. `closureLocked`
   * persists on the post-ritual state so a late-arriving stale action
   * still routes through a deterministic rejection.
   *
   * Lives on `GameState` (not `TurnSnapshot`) for the same reason as
   * `phase` and `pendingModifiers`: the multiplayer wire-format
   * dispatcher must read truth from the persisted snapshot, not
   * synthesize.
   */
  readonly ketherRitual?: KetherRitualState | undefined;
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
 * sub-phase. See `design/encounter-prep-phase.md` § 4 and the
 * per-Sefirah extensions in `design/per-sefirah-mechanics.md` § 2.7.
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
  /**
   * Hod Word-Match (`design/per-sefirah-mechanics.md` § 3.1). Arcanum
   * numbers staged via `name-card`. Consumed at `prep-confirm`
   * regardless of match or miss (§ 2.7 "Consumption note") — distinct
   * from card-burn which is cumulative on retry.
   *
   * #334 surface ticket: this list is staged and cleared at confirm.
   * The match-vs-miss scoring (Hod Word-Match `flatBonus += 5`) ships
   * as a separate downstream ticket that consumes this surface.
   */
  readonly nameCards: readonly number[];
  /**
   * Chesed Overflow (`design/per-sefirah-mechanics.md` § 3.3). Cards
   * the active player has staged to gift to an ally. Multiple gifts
   * per encounter are allowed (one per `gift-card` modifier). Consumed
   * at `prep-confirm`.
   *
   * #334 surface ticket: list is staged and cleared at confirm. The
   * gift-transfer side effect (move arcanum from active player's hand
   * to recipient's hand) ships as a downstream ticket.
   */
  readonly giftCards: readonly {
    readonly arcanum: number;
    readonly recipientId: string;
  }[];
  /**
   * Netzach Declared Desire (`design/per-sefirah-mechanics.md` § 3.5).
   * Sefirah keys staged via `declare-desire`. The desire is declared
   * at `prep-confirm` — this is a one-shot run-wide vow that the
   * downstream ticket writes to a `PlayerState.declaredDesire` field.
   *
   * #334 surface ticket: list is staged and cleared at confirm. The
   * permanence (write to `PlayerState`) ships as a downstream ticket.
   */
  readonly declareDesires: readonly SefirahKey[];
  /**
   * Yesod Dream-Peek (`design/per-sefirah-mechanics.md` § 3.6).
   * Pillars staged via `dream-guess`. Consumed at `prep-confirm`
   * regardless of match or miss (§ 2.7 "Consumption note") — distinct
   * from card-burn which is cumulative on retry.
   *
   * #334 surface ticket: list is staged and cleared at confirm. The
   * match-against-`encounter.dreamPillar` scoring (Yesod Dream-Peek
   * `flatBonus += 5`) ships as a separate downstream ticket.
   */
  readonly dreamGuesses: readonly Pillar[];
}

/** Canonical empty `PendingModifiers` for new games / between challenges. */
export const EMPTY_PENDING_MODIFIERS: PendingModifiers = {
  cardBurns: [],
  sparkBurns: [],
  assistRequests: [],
  nameCards: [],
  giftCards: [],
  declareDesires: [],
  dreamGuesses: [],
};

/**
 * Per-encounter scratch space surfaced on `GameState.encounter` for
 * the duration of one challenge cycle (#334;
 * `design/per-sefirah-mechanics.md` § 2.6 (b)).
 *
 * Lifecycle:
 *   - **Init** at the entry to `phase: 'challenge'` (the start of prep
 *     after `move` lands on an uncleared `'check'` Sefirah). `sefirah`
 *     comes from the active player's arrival; `seed` is hashed from
 *     stable game-state fields so replay reproduces the encounter;
 *     `retryCount` starts at 0.
 *   - **Mutate** at `react-retry`: `retryCount` increments by 1. Per-
 *     mechanic re-derivation (Yesod's `dreamPillar` re-roll, Chokmah's
 *     `chokmahPriorAttempts++`) is layered on top by the downstream
 *     per-Sefirah tickets; `retryCount` is the canonical counter.
 *   - **Clear** when the encounter ends — pass at `prep-confirm` or
 *     `accept-setback`. Both move the encounter out of the prep cycle
 *     so the next encounter starts with a fresh envelope.
 *
 * Surface only (#334). Each per-Sefirah ticket layers its scratch
 * fields in here (Yesod `dreamPillar` + `retryCount`-driven re-seed,
 * Chokmah `chokmahPriorAttempts`, Netzach `netzachPriorFails`, Hod
 * `deceptionMisreport` under Shell). Adding a future twist that needs
 * scratch state extends THIS envelope, not `PendingModifiers`.
 */
export interface EncounterEnvelope {
  /** The Sefirah currently being challenged. */
  readonly sefirah: SefirahKey;
  /**
   * Per-encounter RNG seed for any deterministic per-encounter
   * derivation (Yesod Dream-Peek pillar, Hod deception misreport).
   * Set at envelope init from a hash of stable GameState fields.
   * The active player can't precompute it because the inputs (player
   * roster, illumination/separation tally at arrival) aren't known
   * at arbitrary distance from the encounter.
   */
  readonly seed: number;
  /**
   * Counts react-retry cycles inside this encounter. Starts at 0 at
   * envelope init; the reducer increments by 1 on each `react-retry`.
   * Used by mechanics that need to re-derive per-retry (e.g. Yesod
   * Dream-Peek re-seeds `dreamPillar` so a missed guess can't be
   * reused on the retry).
   */
  readonly retryCount: number;
  /**
   * Yesod Dream-Peek (§ 3.6). The dream pillar derived from `seed`
   * + `retryCount` at envelope init / retry. Optional because only
   * Yesod sets it; the downstream Yesod ticket fills this in.
   */
  readonly dreamPillar?: Pillar;
  /**
   * Chokmah (§ 3.8). Prior modifier-count carryover for the count
   * tilt. Optional because only Chokmah uses it; the downstream
   * Chokmah ticket increments this on react-retry.
   */
  readonly chokmahPriorAttempts?: number;
  /**
   * Netzach (§ 3.5). Counts failed resolves within this encounter.
   * Used by the retry-within-same-encounter DC +1 rule for undeclared
   * players (C6 fix). Optional; the downstream Netzach ticket fills
   * this in.
   */
  readonly netzachPriorFails?: number;
  /**
   * Hod (§ 3.1). The misreported arcanum the engine compares the
   * player's guess against when Shell of Hod is active. Sampled once
   * at envelope init from `seed`; absent when Shell of Hod isn't
   * active. Optional; the downstream Hod ticket fills this in.
   */
  readonly deceptionMisreport?: number;
}

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

// ──────────────── Final Threshold ritual ────────────────

/**
 * One step in the Kether witness round-robin (#335;
 * `design/final-threshold.md` § 5.1). Discriminated by an explicit
 * `kind` literal — `'played'` carries the contributed `arcanum`,
 * `'passed'` records the refusal. The discriminant matches the design
 * doc's specified shape verbatim so K2 (multiplayer wire) and K3
 * (`FinalThresholdScreen` UI) can pattern-match exhaustively without
 * relying on a structural `passed: true` test.
 */
export type KetherWitnessLogEntry =
  | { readonly kind: 'played'; readonly playerId: string; readonly arcanum: number }
  | { readonly kind: 'passed'; readonly playerId: string };

/**
 * One Spark staged for the closure window (`design/final-threshold.md`
 * § 5.1). Modifiers are visible-to-all but not consumed until
 * `threshold-confirm`; un-stage is symmetrical.
 */
export interface KetherStagedSpark {
  readonly playerId: string;
  readonly sefirah: SefirahKey;
}

/**
 * Per-ritual scratch state for the Final Threshold (#335;
 * `design/final-threshold.md` § 5.1). Lives on `GameState` (not
 * `TurnSnapshot`) for the same reason as `phase` and
 * `pendingModifiers`: the multiplayer Realtime channel needs all
 * players to see the ritual state, which means it must persist on
 * the snapshot row. `undefined` outside `phase === 'kether'`; the
 * reducer initializes this on entry to the ritual and clears it when
 * the phase exits.
 */
export interface KetherRitualState {
  /** Where in gather → witness → close the ritual is. */
  readonly subPhase: KetherSubPhase;
  /**
   * Player IDs in round-robin order, last-arrived first per § 2.2's
   * deterministic rule. Frozen at gather time and never mutated.
   */
  readonly witnessOrder: readonly string[];
  /**
   * Index into `witnessOrder` of whose turn it currently is. Advances
   * on each `kether-play-card` / `kether-pass-card`, skipping empty
   * queues per § 5.3. Frozen when `subPhase === 'close'`.
   */
  readonly witnessTurnIndex: number;
  /**
   * Hand size per player at gather time, frozen on entry. Used to
   * compute the per-player pass cap (`⌈n / 2⌉`) per § 2.3 — the cap
   * is from the original hand size, not the running hand.
   */
  readonly personalQueueLengths: Readonly<Record<string, number>>;
  /** Pass count per player so far in this ritual. Checked vs the cap. */
  readonly passCounts: Readonly<Record<string, number>>;
  /**
   * Per-step narration log; one entry per witness step. Plays carry
   * `kind: 'played'` + `arcanum`; passes carry `kind: 'passed'`. The
   * free-form sentence text is the UI's concern (the engine just
   * records the step).
   */
  readonly witnessLog: readonly KetherWitnessLogEntry[];
  /**
   * Recorded arrival timestamps used to derive `witnessOrder`. ms
   * since epoch (Realtime server-side timestamp in multiplayer; engine
   * call-time `Date.now()` in hot-seat). Stored for replay/audit.
   */
  readonly arrivalTimestamps: Readonly<Record<string, number>>;
  /**
   * Sparks staged for the closure window (post-witness only). Order
   * preserved so the UI's "your stage" panel renders deterministically.
   */
  readonly stagedClosureSparks: readonly KetherStagedSpark[];
  /**
   * Set true by the first `threshold-confirm` so subsequent
   * `kether-stage-spark` / `kether-unstage-spark` / `threshold-confirm`
   * actions are rejected (§ 2.4 first-confirm-wins). Persists on the
   * post-ritual state (the phase has exited to `'end'`) so a stale
   * client can read why their action was rejected.
   */
  readonly closureLocked: boolean;
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
