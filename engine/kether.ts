import type { SefirahKey } from '@/data';
import { applyEvents } from './counters';
import type { GameEvent } from './events';
import { SEPARATION_LOSS_THRESHOLD } from './endgame';
import type {
  GameState,
  KetherRitualState,
  KetherStagedSpark,
  KetherWitnessLogEntry,
  PlayerState,
  Result,
} from './types';

// Re-export the state shapes so callers (tests, K2 wire layer) can
// import everything ritual-related from one module without reaching
// into `engine/types.ts` for surface they'd otherwise have to know
// about.
export type {
  KetherRitualState,
  KetherStagedSpark,
  KetherWitnessLogEntry,
  KetherSubPhase,
} from './types';

/**
 * Reasons a Kether reducer arm rejects an action. Discriminated so K2
 * (multiplayer authorize gate) and the eventual UI can branch
 * exhaustively. Mirrors the `TurnReducerError` shape in
 * `lib/turn-machine.ts` — one `kind`, additional fields per kind.
 */
export type KetherRejection =
  | { readonly kind: 'kether-wrong-phase' }
  | { readonly kind: 'kether-no-ritual' }
  | { readonly kind: 'kether-wrong-sub-phase' }
  | { readonly kind: 'kether-not-your-turn'; readonly expected: string | null }
  | { readonly kind: 'kether-card-not-in-hand'; readonly arcanum: number }
  | { readonly kind: 'kether-empty-queue' }
  | {
      readonly kind: 'kether-pass-cap-exceeded';
      readonly cap: number;
      readonly current: number;
    }
  | {
      readonly kind: 'kether-spark-not-held';
      readonly playerId: string;
      readonly sefirah: SefirahKey;
    }
  | { readonly kind: 'kether-not-staged'; readonly sefirah: SefirahKey }
  | { readonly kind: 'kether-closure-locked' }
  | { readonly kind: 'kether-already-confirmed' }
  | { readonly kind: 'kether-not-all-at-kether' }
  | { readonly kind: 'kether-unknown-player'; readonly playerId: string };

/**
 * Pre-ritual hold predicate (`design/final-threshold.md` § 2.1). A
 * player is "Kether-held" when they have arrived at Kether but the
 * ritual has not started — i.e. the rest of the team is still
 * climbing. Held seats are skipped in turn rotation; their stats and
 * hand are frozen.
 *
 * Pure read of the position/phase pair — no new state field. The
 * hold-state ends the moment `phase === 'kether'` (the ritual
 * itself has begun) or the player moves off Kether (which can't
 * happen in MVP, since arrival at Kether is one-way; left in for
 * forward compatibility with a hypothetical Meditate-back ticket).
 */
export function isKetherHeld(state: GameState, playerId: string): boolean {
  if (state.phase === 'kether') return false;
  const player = state.players.find((p) => p.id === playerId);
  if (player === undefined) return false;
  return player.position === 'kether';
}

/**
 * Pure query helper for the K2 multiplayer authorize gate
 * (`design/final-threshold.md` § 5.3 / S-6 fix). Returns the player
 * whose turn it is in the round-robin, or `null` outside the witness
 * sub-phase.
 *
 * K1 owns the pointer-advance logic (see the helper `advanceWitness`
 * below); K2 reads this query against state to authorize incoming
 * `kether-witness-play` / `kether-witness-pass` actions. Any future
 * change to advance rules is a K1-only change — K2's gate is stable
 * because it consults the same query the reducer consumes.
 */
export function currentWitnessPlayerId(state: GameState): string | null {
  const ritual = state.ketherRitual;
  if (state.phase !== 'kether' || ritual === undefined) return null;
  if (ritual.subPhase !== 'witness') return null;
  const id = ritual.witnessOrder[ritual.witnessTurnIndex];
  return id ?? null;
}

/**
 * Per-player pass cap per § 2.3 — `⌈personalQueueLength / 2⌉`. A
 * 4-card queue caps at 2 passes; a 1-card queue caps at 1 (rounding
 * up; even a single card may be passed). The cap leaves room for
 * genuine "I cannot speak about this card" but blocks unilateral
 * griefing-by-pass.
 */
function passCapFor(ritual: KetherRitualState, playerId: string): number {
  const queueLen = ritual.personalQueueLengths[playerId] ?? 0;
  return Math.ceil(queueLen / 2);
}

/**
 * Hand length lookup helper. Returns 0 for unknown players; the
 * advance-pointer logic uses this to skip empty queues.
 */
function handLengthOf(state: GameState, playerId: string): number {
  const player = state.players.find((p) => p.id === playerId);
  return player?.hand.length ?? 0;
}

/**
 * Advance the witness pointer to the next player whose queue is non-
 * empty, wrapping if needed. Returns `{ subPhase: 'close', ... }` when
 * every queue is empty. Pure: returns a new `KetherRitualState`.
 *
 * Empty-queue skip per § 2.3 — exhausted queues do not cost a pass-
 * tick, just rotate past. When no non-empty queue exists, the
 * witness sub-phase is over.
 */
function advanceWitness(state: GameState, ritual: KetherRitualState): KetherRitualState {
  const order = ritual.witnessOrder;
  const n = order.length;
  if (n === 0) {
    return { ...ritual, subPhase: 'close' };
  }
  for (let step = 1; step <= n; step++) {
    const candidateIdx = (ritual.witnessTurnIndex + step) % n;
    const candidate = order[candidateIdx];
    if (candidate !== undefined && handLengthOf(state, candidate) > 0) {
      return { ...ritual, witnessTurnIndex: candidateIdx };
    }
  }
  // Every queue is empty — close the witness sub-phase. Pointer is
  // frozen at its current value (UI reads `subPhase === 'close'` as
  // the "no more rotation" signal; `currentWitnessPlayerId` returns
  // null in that sub-phase).
  return { ...ritual, subPhase: 'close' };
}

/**
 * Initialize the Final Threshold ritual on a state where every player
 * has arrived at Kether. Called by the wire-format layer (K2) when it
 * detects all-at-Kether after a move. K1 owns the state-shape build;
 * K2 owns the trigger detection (timestamps come from there).
 *
 * `arrivalTimestamps` is a per-player record of when each player's
 * `position` flipped to `'kether'`. The deterministic rule from § 2.2
 * builds `witnessOrder` by descending timestamp (last-arrived first);
 * lex tie-break on `playerId` makes simultaneous arrivals
 * deterministic.
 */
export function initKetherRitual(
  state: GameState,
  arrivalTimestamps: Readonly<Record<string, number>>,
): Result<GameState, KetherRejection> {
  if (!state.players.every((p) => p.position === 'kether')) {
    return { ok: false, reason: { kind: 'kether-not-all-at-kether' } };
  }
  // Order: descending timestamp (last arrived first), lex tie-break.
  const witnessOrder = [...state.players]
    .map((p) => p.id)
    .sort((a, b) => {
      const ta = arrivalTimestamps[a] ?? 0;
      const tb = arrivalTimestamps[b] ?? 0;
      if (ta !== tb) return tb - ta;
      // Lex tie-break: descending order so "p2" precedes "p1".
      return a < b ? 1 : a > b ? -1 : 0;
    });
  const personalQueueLengths: Record<string, number> = {};
  const passCounts: Record<string, number> = {};
  for (const player of state.players) {
    personalQueueLengths[player.id] = player.hand.length;
    passCounts[player.id] = 0;
  }
  const ritual: KetherRitualState = {
    subPhase: 'witness',
    witnessOrder,
    witnessTurnIndex: 0,
    personalQueueLengths,
    passCounts,
    witnessLog: [],
    arrivalTimestamps: { ...arrivalTimestamps },
    stagedClosureSparks: [],
    closureLocked: false,
  };
  return {
    ok: true,
    value: { ...state, phase: 'kether', ketherRitual: ritual },
  };
}

/**
 * Detect convergence and (idempotently) trigger the Final Threshold
 * ritual when every player has arrived at Kether (#345;
 * `design/final-threshold.md` § 2.1). Called by post-`applyMove`
 * hooks in `lib/turn-machine.ts` and `lib/room-actions.ts`.
 *
 * Idempotent contract:
 *   - If `state.phase === 'kether'` already → returns the input
 *     state by reference (the helper never re-initializes a running
 *     ritual; callers can fold this into their move pipeline without
 *     a guard).
 *   - If any player's `position !== 'kether'` → returns the input
 *     state by reference (the trigger condition is not yet met).
 *   - Otherwise → builds `KetherRitualState` per § 5.1 and returns
 *     a new state with `phase: 'kether'`. Witness order is descending
 *     by `PlayerState.arrivedAtKetherAt` (last arrival opens the
 *     ritual per § 2.2 / S-1), with lex tie-break on `playerId` for
 *     simultaneous arrivals.
 *
 * The arrival-timestamp source is `PlayerState.arrivedAtKetherAt`,
 * stamped by `applyMove` on each player's first move into Kether.
 * Hot-seat: stamp comes from the engine clock (`Date.now()` by
 * default; injectable for tests). Multiplayer K2: the wire layer
 * overwrites this field with the Realtime server-side timestamp
 * before this helper runs, so the round-robin reads server truth
 * even when client clocks drift.
 *
 * Players whose `arrivedAtKetherAt` is undefined at trigger time
 * (defensive — the trigger predicate above already requires
 * everyone be at Kether, which means every player should have a
 * stamp; this fallback is for snapshot replay against a pre-#345
 * row that lacks the field) fall through to timestamp 0, then resolve
 * via lex tie-break — deterministic, even if not the timestamp the
 * UI would prefer.
 */
export function maybeTriggerKetherRitual(state: GameState): GameState {
  // Idempotency guard #1: a running ritual is never re-initialized.
  // Distinct from "phase is kether but ritual is undefined" — that
  // state shape is engine corruption and surfaces as a no-op here too,
  // because re-init on a partially-built ritual would silently lose
  // any in-flight witness log / pass counts.
  if (state.phase === 'kether') return state;
  // Trigger predicate: every player at Kether (§ 2.1). Less than 2
  // players can technically pass (a single player at Kether trivially
  // satisfies the all-at-Kether check) — the hot-seat solo coda
  // (§ 2.2 player-count floor) is a downstream concern; this helper
  // just detects convergence per the spec.
  if (!state.players.every((p) => p.position === 'kether')) return state;

  // Build arrivalTimestamps from arrivedAtKetherAt. Missing stamps
  // fall through to 0 — `initKetherRitual`'s lex tie-break makes the
  // ordering deterministic regardless.
  const arrivalTimestamps: Record<string, number> = {};
  for (const player of state.players) {
    arrivalTimestamps[player.id] = player.arrivedAtKetherAt ?? 0;
  }

  const result = initKetherRitual(state, arrivalTimestamps);
  if (!result.ok) {
    // Unreachable: the predicate above guarantees the all-at-Kether
    // precondition `initKetherRitual` enforces. Defense-in-depth — if
    // a future change desynchronises the two checks, returning the
    // input state is the safer default than throwing.
    return state;
  }
  return result.value;
}

/**
 * Active witness plays one card from hand. Per § 2.3:
 *   - Card moves to discard.
 *   - Witness log gains a `{ playerId, arcanum }` entry.
 *   - Witness pointer advances (skipping empty queues, transitioning
 *     to `'close'` when every queue empties).
 *
 * No d20, no DC, no modifiers — playing is the act of contribution.
 * The free-form sentence is the player's; the engine just records
 * the step.
 */
export function ketherPlayCard(
  state: GameState,
  args: { readonly playerId: string; readonly arcanum: number },
): Result<GameState, KetherRejection> {
  if (state.phase !== 'kether') {
    return { ok: false, reason: { kind: 'kether-wrong-phase' } };
  }
  const ritual = state.ketherRitual;
  if (ritual === undefined) {
    return { ok: false, reason: { kind: 'kether-no-ritual' } };
  }
  if (ritual.subPhase !== 'witness') {
    return { ok: false, reason: { kind: 'kether-wrong-sub-phase' } };
  }
  const expected = currentWitnessPlayerId(state);
  if (args.playerId !== expected) {
    return {
      ok: false,
      reason: { kind: 'kether-not-your-turn', expected },
    };
  }
  const player = state.players.find((p) => p.id === args.playerId);
  if (player === undefined) {
    return {
      ok: false,
      reason: { kind: 'kether-unknown-player', playerId: args.playerId },
    };
  }
  const cardIdx = player.hand.indexOf(args.arcanum);
  if (cardIdx === -1) {
    return {
      ok: false,
      reason: { kind: 'kether-card-not-in-hand', arcanum: args.arcanum },
    };
  }
  const newHand = [...player.hand.slice(0, cardIdx), ...player.hand.slice(cardIdx + 1)];
  const newPlayer: PlayerState = { ...player, hand: newHand };
  const stateWithCard: GameState = {
    ...state,
    players: state.players.map((p) => (p.id === newPlayer.id ? newPlayer : p)),
    discardPile: [...state.discardPile, args.arcanum],
  };
  const logEntry: KetherWitnessLogEntry = {
    kind: 'played',
    playerId: args.playerId,
    arcanum: args.arcanum,
  };
  const ritualWithLog: KetherRitualState = {
    ...ritual,
    witnessLog: [...ritual.witnessLog, logEntry],
  };
  const advanced = advanceWitness(stateWithCard, ritualWithLog);
  return {
    ok: true,
    value: { ...stateWithCard, ketherRitual: advanced },
  };
}

/**
 * Active witness passes their turn (refusal-of-circulation cost from
 * `mechanics.md` § Drawing & gift handling, surfacing here because the
 * ritual is itself an act of circulation). Per § 2.3:
 *   - +1 Separation.
 *   - `passCounts[playerId]` increments, capped at `⌈n / 2⌉`.
 *   - Witness log gains a `{ kind: 'passed', playerId }` entry.
 *   - Witness pointer advances.
 *   - If the +1 Separation overflows `SEPARATION_LOSS_THRESHOLD`, the
 *     ritual exits early to `phase: 'end'` (per § 4.4 — separation-
 *     overflow takes precedence over illumination-gap).
 *
 * Passing an empty queue is rejected (`kether-empty-queue`) — empty is
 * exhaustion, not refusal, and the advance logic skips empty seats
 * automatically. Reaching the cap also rejects.
 */
export function ketherPassCard(
  state: GameState,
  args: { readonly playerId: string },
): Result<GameState, KetherRejection> {
  if (state.phase !== 'kether') {
    return { ok: false, reason: { kind: 'kether-wrong-phase' } };
  }
  const ritual = state.ketherRitual;
  if (ritual === undefined) {
    return { ok: false, reason: { kind: 'kether-no-ritual' } };
  }
  if (ritual.subPhase !== 'witness') {
    return { ok: false, reason: { kind: 'kether-wrong-sub-phase' } };
  }
  const expected = currentWitnessPlayerId(state);
  if (args.playerId !== expected) {
    return {
      ok: false,
      reason: { kind: 'kether-not-your-turn', expected },
    };
  }
  const player = state.players.find((p) => p.id === args.playerId);
  if (player === undefined) {
    return {
      ok: false,
      reason: { kind: 'kether-unknown-player', playerId: args.playerId },
    };
  }
  if (player.hand.length === 0) {
    return { ok: false, reason: { kind: 'kether-empty-queue' } };
  }
  const cap = passCapFor(ritual, args.playerId);
  const current = ritual.passCounts[args.playerId] ?? 0;
  if (current >= cap) {
    return {
      ok: false,
      reason: { kind: 'kether-pass-cap-exceeded', cap, current },
    };
  }
  // +1 Separation. We don't go through `applyEvent` here because no
  // event variant maps to "ritual pass" cleanly — the existing
  // `gift-refused` is closest semantically but its scope is the
  // ordinary gift handler. Direct counter mutation is locked to this
  // single site (the reducer); a future ticket can layer an event
  // for replay/audit if the need arises.
  const newSeparation = state.separation + 1;
  const newPassCounts = {
    ...ritual.passCounts,
    [args.playerId]: current + 1,
  };
  const logEntry: KetherWitnessLogEntry = {
    kind: 'passed',
    playerId: args.playerId,
  };
  const ritualWithLog: KetherRitualState = {
    ...ritual,
    passCounts: newPassCounts,
    witnessLog: [...ritual.witnessLog, logEntry],
  };
  const stateAfterPass: GameState = {
    ...state,
    separation: newSeparation,
    ketherRitual: ritualWithLog,
  };
  // § 4.4: separation-overflow takes precedence over the gap branch
  // even mid-ritual. The reducer is the single writer of the end-
  // state during the ritual (per § 3.4); we exit `phase: 'kether'`
  // here so post-state `checkEndgame` returns `'lost'`.
  if (newSeparation >= SEPARATION_LOSS_THRESHOLD) {
    return {
      ok: true,
      value: {
        ...stateAfterPass,
        phase: 'end',
        ketherRitual: { ...ritualWithLog, closureLocked: true },
      },
    };
  }
  // Normal advance.
  const advanced = advanceWitness(stateAfterPass, ritualWithLog);
  return {
    ok: true,
    value: { ...stateAfterPass, ketherRitual: advanced },
  };
}

/**
 * Stage a held Spark for the closure window. Sparks are not consumed
 * until `threshold-confirm` lands — pre-confirm, players can stage
 * and un-stage freely. Once `closureLocked` is true (first confirm
 * has landed), staging is rejected.
 */
export function ketherStageSpark(
  state: GameState,
  args: { readonly playerId: string; readonly sefirah: SefirahKey },
): Result<GameState, KetherRejection> {
  // Closure-locked check first (parallel to `ketherConfirmClosure`'s
  // first-confirm-wins ordering). The locked flag persists past
  // the phase exit, so a stale stage attempt after confirm routes
  // through the more-specific `kether-closure-locked` rejection
  // instead of falling through to `kether-wrong-phase`.
  const ritual = state.ketherRitual;
  if (ritual !== undefined && ritual.closureLocked) {
    return { ok: false, reason: { kind: 'kether-closure-locked' } };
  }
  if (state.phase !== 'kether') {
    return { ok: false, reason: { kind: 'kether-wrong-phase' } };
  }
  if (ritual === undefined) {
    return { ok: false, reason: { kind: 'kether-no-ritual' } };
  }
  if (ritual.subPhase !== 'close') {
    return { ok: false, reason: { kind: 'kether-wrong-sub-phase' } };
  }
  const player = state.players.find((p) => p.id === args.playerId);
  if (player === undefined) {
    return {
      ok: false,
      reason: { kind: 'kether-unknown-player', playerId: args.playerId },
    };
  }
  if (!player.sparksHeld.has(args.sefirah)) {
    return {
      ok: false,
      reason: {
        kind: 'kether-spark-not-held',
        playerId: args.playerId,
        sefirah: args.sefirah,
      },
    };
  }
  const newRitual: KetherRitualState = {
    ...ritual,
    stagedClosureSparks: [
      ...ritual.stagedClosureSparks,
      { playerId: args.playerId, sefirah: args.sefirah },
    ],
  };
  return { ok: true, value: { ...state, ketherRitual: newRitual } };
}

/**
 * Un-stage a previously-staged Spark. Symmetrical with
 * `ketherStageSpark`; rejected after the closure has been locked.
 */
export function ketherUnstageSpark(
  state: GameState,
  args: { readonly playerId: string; readonly sefirah: SefirahKey },
): Result<GameState, KetherRejection> {
  // Closure-locked check first — see `ketherStageSpark` for rationale.
  const ritual = state.ketherRitual;
  if (ritual !== undefined && ritual.closureLocked) {
    return { ok: false, reason: { kind: 'kether-closure-locked' } };
  }
  if (state.phase !== 'kether') {
    return { ok: false, reason: { kind: 'kether-wrong-phase' } };
  }
  if (ritual === undefined) {
    return { ok: false, reason: { kind: 'kether-no-ritual' } };
  }
  if (ritual.subPhase !== 'close') {
    return { ok: false, reason: { kind: 'kether-wrong-sub-phase' } };
  }
  const idx = ritual.stagedClosureSparks.findIndex(
    (s) => s.playerId === args.playerId && s.sefirah === args.sefirah,
  );
  if (idx === -1) {
    return {
      ok: false,
      reason: { kind: 'kether-not-staged', sefirah: args.sefirah },
    };
  }
  const newStaged = [
    ...ritual.stagedClosureSparks.slice(0, idx),
    ...ritual.stagedClosureSparks.slice(idx + 1),
  ];
  const newRitual: KetherRitualState = {
    ...ritual,
    stagedClosureSparks: newStaged,
  };
  return { ok: true, value: { ...state, ketherRitual: newRitual } };
}

/**
 * Meta returned from a successful `ketherConfirmClosure`. Surfaces
 * staged Sparks that were dropped at confirm time (player no longer
 * holds them — defensive against simultaneous-burn races) so the UI
 * can show a "your Spark was no longer available" hint.
 */
export interface KetherConfirmMeta {
  readonly droppedSparks: readonly KetherStagedSpark[];
}

/**
 * Confirm-closure result. Mirrors the `Result<GameState, ...>` shape
 * the rest of the kether reducers return, but adds a `meta` field on
 * the success arm so callers can read the dropped-Sparks audit list
 * without an extra wrapper. The shape is an extension of `Result`,
 * not a deviation from it: `result.ok && result.value` still narrows
 * to a valid post-state.
 */
export type KetherConfirmResult =
  | {
      readonly ok: true;
      readonly value: GameState;
      readonly meta: KetherConfirmMeta;
    }
  | { readonly ok: false; readonly reason: KetherRejection };

/**
 * First-confirm-wins (§ 2.4 / S-7). Consumes all staged Sparks (each
 * +1 Illumination via `spark-spent`), evaluates the gap, transitions
 * `phase: 'kether' → 'end'`. The post-state's `EndgameStatus` (read by
 * `checkEndgame`) carries the actual `'won'` / `'lost'` signal — `'end'`
 * is the terminal flow-of-play phase per § 3.4.
 *
 * Drops staged Sparks the player no longer holds — defensive (parallel
 * to `prep-confirm`'s drop logic in the chassis) — and returns the
 * dropped list in `meta` so the UI can surface "your Spark was no
 * longer available."
 */
export function ketherConfirmClosure(
  state: GameState,
  _args: { readonly playerId: string },
): KetherConfirmResult {
  // First-confirm-wins ordering: check `closureLocked` BEFORE the
  // phase guard. After a successful confirm the phase exits to `'end'`
  // (so a second confirm would otherwise hit `kether-wrong-phase`),
  // but the rejection we want to surface is the more-specific
  // `kether-already-confirmed`. `closureLocked` persists on the
  // post-ritual state precisely so this routing stays deterministic.
  const ritual = state.ketherRitual;
  if (ritual !== undefined && ritual.closureLocked) {
    return { ok: false, reason: { kind: 'kether-already-confirmed' } };
  }
  if (state.phase !== 'kether') {
    return { ok: false, reason: { kind: 'kether-wrong-phase' } };
  }
  if (ritual === undefined) {
    return { ok: false, reason: { kind: 'kether-no-ritual' } };
  }
  if (ritual.subPhase !== 'close') {
    return { ok: false, reason: { kind: 'kether-wrong-sub-phase' } };
  }

  // Filter staged sparks against current ownership — drop unheld.
  const droppedSparks: KetherStagedSpark[] = [];
  const validSparks: KetherStagedSpark[] = [];
  let workingState = state;
  for (const staged of ritual.stagedClosureSparks) {
    const player = workingState.players.find((p) => p.id === staged.playerId);
    if (player === undefined || !player.sparksHeld.has(staged.sefirah)) {
      droppedSparks.push(staged);
      continue;
    }
    validSparks.push(staged);
  }

  // Consume each valid Spark via the `spark-spent` event (each = +1
  // Illumination). Mirrors `resolveFinalThreshold`'s burn loop.
  const events: GameEvent[] = [];
  for (const burn of validSparks) {
    const player = workingState.players.find((p) => p.id === burn.playerId);
    if (player === undefined) continue; // unreachable after filter
    const newSparksHeld = new Set(player.sparksHeld);
    newSparksHeld.delete(burn.sefirah);
    const newPlayer: PlayerState = { ...player, sparksHeld: newSparksHeld };
    workingState = {
      ...workingState,
      players: workingState.players.map((p) => (p.id === newPlayer.id ? newPlayer : p)),
      spentSparks: [
        ...workingState.spentSparks,
        { playerId: burn.playerId, sefirah: burn.sefirah },
      ],
    };
    events.push({
      kind: 'spark-spent',
      playerId: burn.playerId,
      sefirah: burn.sefirah,
    });
  }

  workingState = applyEvents(workingState, events);

  // Lock closure, transition out of `'kether'` to `'end'`. The
  // post-state's `checkEndgame` carries the actual win/lose signal
  // (illumination-gap loss is detected there via the new
  // `'illumination-gap'` reason on `EndgameStatus`).
  const lockedRitual: KetherRitualState = {
    ...ritual,
    stagedClosureSparks: validSparks,
    closureLocked: true,
  };
  const finalState: GameState = {
    ...workingState,
    phase: 'end',
    ketherRitual: lockedRitual,
  };

  // The win/lose computation lives in `checkEndgame` against the
  // post-confirm state — `REQUIRED_ILLUMINATION_MARGIN` and the
  // `'illumination-gap'` reason are read there, not duplicated here.
  // `checkEndgame` is the single source of truth for end-state once
  // the ritual exits `'kether'`.
  return {
    ok: true,
    value: finalState,
    meta: { droppedSparks },
  };
}
