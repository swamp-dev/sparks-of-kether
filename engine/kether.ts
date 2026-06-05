import type { SefirahKey, StatKey } from '@/data';
import { REQUIRED_ILLUMINATION_MARGIN, SEPARATION_LOSS_THRESHOLD } from './endgame';
import { rollCheck, SPARK_BURN_BONUS } from './checks';
import type { Rng } from './rng';
import type {
  GameState,
  KetherRitualState,
  KetherStagedSpark,
  KetherTrialChallenge,
  PlayerState,
  Result,
} from './types';
import { applyEvents } from './counters';
import type { GameEvent } from './events';

// Re-export so callers (tests, K2 wire layer) import everything
// ritual-related from one module.
export type {
  KetherRitualState,
  KetherStagedSpark,
  KetherTrialChallenge,
  KetherSubPhase,
} from './types';

/**
 * Reasons a Kether reducer arm rejects an action. Discriminated so K2
 * (multiplayer authorize gate) and the UI can branch exhaustively.
 */
export type KetherRejection =
  | { readonly kind: 'kether-wrong-phase' }
  | { readonly kind: 'kether-no-ritual' }
  | { readonly kind: 'kether-wrong-sub-phase' }
  | { readonly kind: 'kether-not-your-turn'; readonly expected: string | null }
  | {
      readonly kind: 'kether-spark-not-held';
      readonly playerId: string;
      readonly sefirah: SefirahKey;
    }
  | { readonly kind: 'kether-not-staged'; readonly sefirah: SefirahKey }
  | { readonly kind: 'kether-already-staged'; readonly sefirah: SefirahKey }
  | { readonly kind: 'kether-closure-locked' }
  | { readonly kind: 'kether-already-confirmed' }
  | { readonly kind: 'kether-not-all-at-kether' }
  | { readonly kind: 'kether-unknown-player'; readonly playerId: string };

// ──────────────── Trial deck constants ────────────────

/**
 * Canonical stat assignment for the cooperative gauntlet. One challenge
 * per player in player-count order; for N players the first N entries
 * are used. Each maps a Sefirah to the stat it tests. Ordered from the
 * highest active Sefirah downward so the "hardest" stat domains open
 * the trial.
 */
const TRIAL_SEFIROT: ReadonlyArray<{ readonly sefirahKey: SefirahKey; readonly stat: StatKey }> = [
  { sefirahKey: 'chokmah', stat: 'insight' },
  { sefirahKey: 'binah', stat: 'understanding' },
  { sefirahKey: 'chesed', stat: 'lovingkindness' },
  { sefirahKey: 'gevurah', stat: 'strength' },
  { sefirahKey: 'tiferet', stat: 'harmony' },
  { sefirahKey: 'netzach', stat: 'passion' },
  { sefirahKey: 'hod', stat: 'intellect' },
  { sefirahKey: 'yesod', stat: 'intuition' },
];

/**
 * Base DC for a trial challenge when the illumination gap is already met.
 * The DC rises when the team is behind (see `trialDcFor`).
 */
const TRIAL_BASE_DC = 14;

/**
 * Compute the DC for a single trial challenge.
 * DC = TRIAL_BASE_DC + max(0, ceil((separation - illumination + margin) / 2))
 *
 * When the team already has the margin, difficulty_bonus = 0 → DC = 14.
 * The harder the gap, the higher the DC. Each challenge uses the same
 * DC — the gauntlet is uniform difficulty.
 */
function trialDcFor(illumination: number, separation: number): number {
  const gap = separation - illumination + REQUIRED_ILLUMINATION_MARGIN;
  const bonus = gap > 0 ? Math.ceil(gap / 2) : 0;
  return TRIAL_BASE_DC + bonus;
}

// ──────────────── Pre-ritual hold predicate ────────────────

/**
 * Pre-ritual hold predicate. A player is "Kether-held" when they have
 * arrived at Kether but the ritual has not started — the rest of the
 * team is still climbing. Held seats are skipped in turn rotation.
 */
export function isKetherHeld(state: GameState, playerId: string): boolean {
  if (state.phase === 'kether') return false;
  const player = state.players.find((p) => p.id === playerId);
  if (player === undefined) return false;
  return player.position === 'kether';
}

// ──────────────── Trial query ────────────────

/**
 * Pure query helper for the K2 multiplayer authorize gate. Returns the
 * player whose turn it is in the cooperative gauntlet, or `null` outside
 * the trial sub-phase.
 */
export function currentTrialPlayerId(state: GameState): string | null {
  const ritual = state.ketherRitual;
  if (state.phase !== 'kether' || ritual === undefined) return null;
  if (ritual.subPhase !== 'trial') return null;
  const id = ritual.trialOrder[ritual.trialTurnIndex];
  return id ?? null;
}

// ──────────────── Ritual initialization ────────────────

/**
 * Initialize the Final Threshold ritual on a state where every player
 * has arrived at Kether. Builds the cooperative gauntlet (one challenge
 * per player, DC derived from the current illumination gap) and
 * transitions directly to `subPhase: 'trial'`.
 */
export function initKetherRitual(
  state: GameState,
  arrivalTimestamps: Readonly<Record<string, number>>,
): Result<GameState, KetherRejection> {
  if (!state.players.every((p) => p.position === 'kether')) {
    return { ok: false, reason: { kind: 'kether-not-all-at-kether' } };
  }

  // Determine trial order: last-arrived first, ascending-lex tie-break.
  const trialOrder = [...state.players]
    .map((p) => p.id)
    .sort((a, b) => {
      const ta = arrivalTimestamps[a] ?? 0;
      const tb = arrivalTimestamps[b] ?? 0;
      if (ta !== tb) return tb - ta;
      return a < b ? -1 : a > b ? 1 : 0;
    });

  // Build one challenge per player, selecting from TRIAL_SEFIROT in order.
  const dc = trialDcFor(state.illumination, state.separation);
  const trialChallenges: KetherTrialChallenge[] = trialOrder.map((_, idx) => {
    const entry = TRIAL_SEFIROT[idx % TRIAL_SEFIROT.length];
    // entry is always defined because TRIAL_SEFIROT has 8 entries and
    // player count is at most 6 — the modulo is a defensive fallback.
    return {
      sefirahKey: entry?.sefirahKey ?? 'chokmah',
      stat: entry?.stat ?? 'insight',
      dc,
      roll: null,
      passed: null,
    };
  });

  const ritual: KetherRitualState = {
    subPhase: 'trial',
    trialOrder,
    trialTurnIndex: 0,
    trialChallenges,
    trialStagedSparks: [],
    arrivalTimestamps: { ...arrivalTimestamps },
    stagedClosureSparks: [],
    closureLocked: false,
  };

  return { ok: true, value: { ...state, phase: 'kether', ketherRitual: ritual } };
}

/**
 * Idempotently trigger the Final Threshold ritual when every player has
 * arrived at Kether. Called by post-`applyMove` hooks. Returns the input
 * state by reference when the trigger condition is not met or the ritual
 * is already running.
 */
export function maybeTriggerKetherRitual(state: GameState): GameState {
  if (state.phase === 'kether') return state;
  if (!state.players.every((p) => p.position === 'kether')) return state;

  const arrivalTimestamps: Record<string, number> = {};
  for (const player of state.players) {
    arrivalTimestamps[player.id] = player.arrivedAtKetherAt ?? 0;
  }

  const result = initKetherRitual(state, arrivalTimestamps);
  if (!result.ok) return state;
  return result.value;
}

// ──────────────── Trial reducer arms ────────────────

/**
 * Stage a held Spark from the player's hand for the current trial
 * challenge. Sparks are not consumed until `kether-trial-resolve`
 * fires. Only valid during the `trial` sub-phase.
 */
export function ketherTrialStageSpark(
  state: GameState,
  args: { readonly playerId: string; readonly sefirah: SefirahKey },
): Result<GameState, KetherRejection> {
  if (state.phase !== 'kether') {
    return { ok: false, reason: { kind: 'kether-wrong-phase' } };
  }
  const ritual = state.ketherRitual;
  if (ritual === undefined) {
    return { ok: false, reason: { kind: 'kether-no-ritual' } };
  }
  if (ritual.closureLocked) {
    return { ok: false, reason: { kind: 'kether-closure-locked' } };
  }
  if (ritual.subPhase !== 'trial') {
    return { ok: false, reason: { kind: 'kether-wrong-sub-phase' } };
  }
  const player = state.players.find((p) => p.id === args.playerId);
  if (player === undefined) {
    return { ok: false, reason: { kind: 'kether-unknown-player', playerId: args.playerId } };
  }
  if (!player.sparksHeld.has(args.sefirah)) {
    return {
      ok: false,
      reason: { kind: 'kether-spark-not-held', playerId: args.playerId, sefirah: args.sefirah },
    };
  }
  const alreadyStaged = ritual.trialStagedSparks.some(
    (s) => s.playerId === args.playerId && s.sefirah === args.sefirah,
  );
  if (alreadyStaged) {
    return { ok: false, reason: { kind: 'kether-already-staged', sefirah: args.sefirah } };
  }
  const newRitual: KetherRitualState = {
    ...ritual,
    trialStagedSparks: [
      ...ritual.trialStagedSparks,
      { playerId: args.playerId, sefirah: args.sefirah },
    ],
  };
  return { ok: true, value: { ...state, ketherRitual: newRitual } };
}

/**
 * Un-stage a previously-staged Spark from the trial. Symmetrical with
 * `ketherTrialStageSpark`.
 */
export function ketherTrialUnstageSpark(
  state: GameState,
  args: { readonly playerId: string; readonly sefirah: SefirahKey },
): Result<GameState, KetherRejection> {
  if (state.phase !== 'kether') {
    return { ok: false, reason: { kind: 'kether-wrong-phase' } };
  }
  const ritual = state.ketherRitual;
  if (ritual === undefined) {
    return { ok: false, reason: { kind: 'kether-no-ritual' } };
  }
  if (ritual.closureLocked) {
    return { ok: false, reason: { kind: 'kether-closure-locked' } };
  }
  if (ritual.subPhase !== 'trial') {
    return { ok: false, reason: { kind: 'kether-wrong-sub-phase' } };
  }
  const idx = ritual.trialStagedSparks.findIndex(
    (s) => s.playerId === args.playerId && s.sefirah === args.sefirah,
  );
  if (idx === -1) {
    return { ok: false, reason: { kind: 'kether-not-staged', sefirah: args.sefirah } };
  }
  const newStaged = [
    ...ritual.trialStagedSparks.slice(0, idx),
    ...ritual.trialStagedSparks.slice(idx + 1),
  ];
  return {
    ok: true,
    value: { ...state, ketherRitual: { ...ritual, trialStagedSparks: newStaged } },
  };
}

/**
 * Resolve the current player's trial challenge. Rolls d20 + stat vs DC,
 * consuming any staged Sparks as bonuses. On pass: +1 Illumination.
 * Advances the trial pointer; transitions to `'close'` when all
 * challenges are resolved.
 */
export function ketherTrialResolve(
  state: GameState,
  args: { readonly playerId: string; readonly rng: Rng },
): Result<GameState, KetherRejection> {
  if (state.phase !== 'kether') {
    return { ok: false, reason: { kind: 'kether-wrong-phase' } };
  }
  const ritual = state.ketherRitual;
  if (ritual === undefined) {
    return { ok: false, reason: { kind: 'kether-no-ritual' } };
  }
  if (ritual.subPhase !== 'trial') {
    return { ok: false, reason: { kind: 'kether-wrong-sub-phase' } };
  }
  const expected = currentTrialPlayerId(state);
  if (args.playerId !== expected) {
    return { ok: false, reason: { kind: 'kether-not-your-turn', expected } };
  }
  const player = state.players.find((p) => p.id === args.playerId);
  if (player === undefined) {
    return { ok: false, reason: { kind: 'kether-unknown-player', playerId: args.playerId } };
  }

  const challenge = ritual.trialChallenges[ritual.trialTurnIndex];
  if (challenge === undefined) {
    // Defensive: trialTurnIndex out of bounds. Transition to close.
    return {
      ok: true,
      value: { ...state, ketherRitual: { ...ritual, subPhase: 'close' } },
    };
  }

  // Validate and consume staged Sparks.
  const events: GameEvent[] = [];
  let workingState = state;
  let sparkBurnCount = 0;
  for (const staged of ritual.trialStagedSparks) {
    const actor = workingState.players.find((p) => p.id === staged.playerId);
    if (actor === undefined || !actor.sparksHeld.has(staged.sefirah)) continue;
    const newSparksHeld = new Set(actor.sparksHeld);
    newSparksHeld.delete(staged.sefirah);
    const newActor: PlayerState = { ...actor, sparksHeld: newSparksHeld };
    workingState = {
      ...workingState,
      players: workingState.players.map((p) => (p.id === newActor.id ? newActor : p)),
      spentSparks: [
        ...workingState.spentSparks,
        { playerId: staged.playerId, sefirah: staged.sefirah },
      ],
    };
    events.push({ kind: 'spark-spent', playerId: staged.playerId, sefirah: staged.sefirah });
    sparkBurnCount++;
  }
  // Apply spark-spent events so each Spark grants its +1 Illumination bonus
  // via the standard event machinery (counters.ts:applyEvents). Missing this
  // call was a critical bug: players burned Sparks during the trial but the
  // Illumination credit never landed.
  workingState = applyEvents(workingState, events);

  // Look up the player's stat for this challenge (use the post-consume player).
  const resolvedPlayer = workingState.players.find((p) => p.id === args.playerId);
  const statValue = resolvedPlayer?.stats[challenge.stat] ?? 0;

  // Roll d20 + stat vs DC.
  const outcome = rollCheck({
    stat: statValue,
    dc: challenge.dc,
    modifiers: {
      assistStats: [],
      cardBurns: 0,
      sparkBurns: sparkBurnCount,
      shortcutPenalty: false,
    },
    rng: args.rng,
  });

  // Apply pass bonus: +1 Illumination.
  if (outcome.pass) {
    workingState = { ...workingState, illumination: workingState.illumination + 1 };
  }

  // Update the challenge record.
  const updatedChallenge: KetherTrialChallenge = {
    ...challenge,
    roll: outcome.rolled,
    passed: outcome.pass,
  };
  const updatedChallenges = ritual.trialChallenges.map((c, idx) =>
    idx === ritual.trialTurnIndex ? updatedChallenge : c,
  );

  // Advance the trial turn index; transition to 'close' when all done.
  const nextIndex = ritual.trialTurnIndex + 1;
  const allResolved = nextIndex >= ritual.trialChallenges.length;
  const updatedRitual: KetherRitualState = {
    ...ritual,
    trialChallenges: updatedChallenges,
    trialStagedSparks: [],
    trialTurnIndex: nextIndex,
    subPhase: allResolved ? 'close' : 'trial',
  };

  return { ok: true, value: { ...workingState, ketherRitual: updatedRitual } };
}

// ──────────────── Closure window reducer arms ────────────────

/**
 * Stage a held Spark for the closure window. Sparks are not consumed
 * until `threshold-confirm` lands — pre-confirm, players can stage and
 * un-stage freely. Once `closureLocked` is true, staging is rejected.
 */
export function ketherStageSpark(
  state: GameState,
  args: { readonly playerId: string; readonly sefirah: SefirahKey },
): Result<GameState, KetherRejection> {
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
    return { ok: false, reason: { kind: 'kether-unknown-player', playerId: args.playerId } };
  }
  if (!player.sparksHeld.has(args.sefirah)) {
    return {
      ok: false,
      reason: { kind: 'kether-spark-not-held', playerId: args.playerId, sefirah: args.sefirah },
    };
  }
  const alreadyStaged = ritual.stagedClosureSparks.some(
    (s) => s.playerId === args.playerId && s.sefirah === args.sefirah,
  );
  if (alreadyStaged) {
    return { ok: false, reason: { kind: 'kether-already-staged', sefirah: args.sefirah } };
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
 * Un-stage a previously-staged closure Spark. Symmetrical with
 * `ketherStageSpark`; rejected after closure has been locked.
 */
export function ketherUnstageSpark(
  state: GameState,
  args: { readonly playerId: string; readonly sefirah: SefirahKey },
): Result<GameState, KetherRejection> {
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
    return { ok: false, reason: { kind: 'kether-not-staged', sefirah: args.sefirah } };
  }
  const newStaged = [
    ...ritual.stagedClosureSparks.slice(0, idx),
    ...ritual.stagedClosureSparks.slice(idx + 1),
  ];
  return {
    ok: true,
    value: { ...state, ketherRitual: { ...ritual, stagedClosureSparks: newStaged } },
  };
}

// ──────────────── Confirm closure ────────────────

/** Meta returned from a successful `ketherConfirmClosure`. */
export interface KetherConfirmMeta {
  readonly droppedSparks: readonly KetherStagedSpark[];
}

export type KetherConfirmResult =
  | { readonly ok: true; readonly value: GameState; readonly meta: KetherConfirmMeta }
  | { readonly ok: false; readonly reason: KetherRejection };

/**
 * First-confirm-wins. Consumes all staged closure Sparks (each +1
 * Illumination via `spark-spent`), evaluates the gap, transitions
 * `phase: 'kether' → 'end'`. The post-state's `EndgameStatus` (read by
 * `checkEndgame`) carries the actual `'won'` / `'lost'` signal.
 *
 * Drops staged Sparks the player no longer holds (defensive against
 * parallel-burn races) and returns the dropped list in `meta`.
 */
export function ketherConfirmClosure(
  state: GameState,
  _args: { readonly playerId: string },
): KetherConfirmResult {
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

  // Filter staged sparks — drop any the player no longer holds.
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

  // Consume each valid Spark (+1 Illumination via spark-spent event).
  const events: GameEvent[] = [];
  for (const burn of validSparks) {
    const player = workingState.players.find((p) => p.id === burn.playerId);
    if (player === undefined) continue;
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
    events.push({ kind: 'spark-spent', playerId: burn.playerId, sefirah: burn.sefirah });
  }

  workingState = applyEvents(workingState, events);

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

  return { ok: true, value: finalState, meta: { droppedSparks } };
}
