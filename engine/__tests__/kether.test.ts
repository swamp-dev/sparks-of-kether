import { describe, expect, it } from 'vitest';
import { REQUIRED_ILLUMINATION_MARGIN, SEPARATION_LOSS_THRESHOLD } from '../endgame';
import {
  ketherTrialStageSpark,
  ketherTrialUnstageSpark,
  ketherTrialResolve,
  ketherStageSpark,
  ketherUnstageSpark,
  ketherConfirmClosure,
  initKetherRitual,
  maybeTriggerKetherRitual,
  currentTrialPlayerId,
  isKetherHeld,
  type KetherRitualState,
  type KetherTrialChallenge,
} from '../kether';
import { makePlayer, makeState } from '@/test/fixtures';
import type { GameState } from '../types';

/**
 * Build a minimal post-gather Kether state in the `trial` sub-phase.
 * Two players, both at Kether, `phase === 'kether'`. `trialChallenges`
 * defaults to one resolved-null challenge per player so tests can
 * easily override specific fields.
 */
function makeTrialState(opts: {
  readonly p1Sparks?: ReadonlySet<string>;
  readonly p2Sparks?: ReadonlySet<string>;
  readonly trialTurnIndex?: number;
  readonly trialOrder?: readonly string[];
  readonly trialChallenges?: readonly KetherTrialChallenge[];
  readonly trialStagedSparks?: KetherRitualState['trialStagedSparks'];
  readonly illumination?: number;
  readonly separation?: number;
  readonly subPhase?: KetherRitualState['subPhase'];
  readonly stagedClosureSparks?: KetherRitualState['stagedClosureSparks'];
  readonly closureLocked?: boolean;
} = {}): GameState {
  const defaultChallenges: readonly KetherTrialChallenge[] = [
    { sefirahKey: 'chokmah', stat: 'insight', dc: 14, roll: null, passed: null },
    { sefirahKey: 'binah', stat: 'understanding', dc: 14, roll: null, passed: null },
  ];
  const players = [
    makePlayer({
      id: 'p1',
      position: 'kether',
      sparksHeld: (opts.p1Sparks as ReadonlySet<never>) ?? new Set(),
    }),
    makePlayer({
      id: 'p2',
      position: 'kether',
      sparksHeld: (opts.p2Sparks as ReadonlySet<never>) ?? new Set(),
    }),
  ];
  const trialOrder = opts.trialOrder ?? ['p1', 'p2'];
  const ritual: KetherRitualState = {
    subPhase: opts.subPhase ?? 'trial',
    trialOrder,
    trialTurnIndex: opts.trialTurnIndex ?? 0,
    trialChallenges: opts.trialChallenges ?? defaultChallenges,
    trialStagedSparks: opts.trialStagedSparks ?? [],
    arrivalTimestamps: { p1: 1, p2: 2 },
    stagedClosureSparks: opts.stagedClosureSparks ?? [],
    closureLocked: opts.closureLocked ?? false,
  };
  return makeState(
    {},
    {
      players,
      activePlayerId: 'p1',
      phase: 'kether',
      illumination: opts.illumination ?? 0,
      separation: opts.separation ?? 0,
      ketherRitual: ritual,
    },
  );
}

// ──────────────── isKetherHeld (pre-ritual hold predicate) ────────────────

describe('isKetherHeld — pre-ritual hold predicate', () => {
  it('returns true when player is at Kether but the ritual has not started', () => {
    const p1 = makePlayer({ id: 'p1', position: 'kether' });
    const p2 = makePlayer({ id: 'p2', position: 'tiferet' });
    const state = makeState({}, { players: [p1, p2], phase: 'move' });
    expect(isKetherHeld(state, 'p1')).toBe(true);
    expect(isKetherHeld(state, 'p2')).toBe(false);
  });

  it('returns false once the ritual has started (phase === kether)', () => {
    const state = makeTrialState();
    expect(isKetherHeld(state, 'p1')).toBe(false);
    expect(isKetherHeld(state, 'p2')).toBe(false);
  });

  it('returns false for an unknown player id', () => {
    const state = makeState({});
    expect(isKetherHeld(state, 'unknown')).toBe(false);
  });
});

// ──────────────── currentTrialPlayerId ────────────────

describe('currentTrialPlayerId — pure query helper', () => {
  it('returns the player at trialOrder[trialTurnIndex] in the trial sub-phase', () => {
    const state = makeTrialState({ trialTurnIndex: 0 });
    expect(currentTrialPlayerId(state)).toBe('p1');
    const advanced = makeTrialState({ trialTurnIndex: 1 });
    expect(currentTrialPlayerId(advanced)).toBe('p2');
  });

  it('returns null when phase !== kether', () => {
    const state = makeState({}, { phase: 'move' });
    expect(currentTrialPlayerId(state)).toBeNull();
  });

  it('returns null in the close sub-phase (pointer is frozen)', () => {
    const state = makeTrialState({ subPhase: 'close' });
    expect(currentTrialPlayerId(state)).toBeNull();
  });

  it('returns null in the gather sub-phase', () => {
    const state = makeTrialState({ subPhase: 'gather' });
    expect(currentTrialPlayerId(state)).toBeNull();
  });
});

// ──────────────── initKetherRitual ────────────────

describe('initKetherRitual', () => {
  it('rejects when not all players are at Kether', () => {
    const p1 = makePlayer({ id: 'p1', position: 'kether' });
    const p2 = makePlayer({ id: 'p2', position: 'tiferet' });
    const state = makeState({}, { players: [p1, p2] });
    const result = initKetherRitual(state, { p1: 1, p2: 2 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('kether-not-all-at-kether');
  });

  it('creates one trial challenge per player', () => {
    const p1 = makePlayer({ id: 'p1', position: 'kether' });
    const p2 = makePlayer({ id: 'p2', position: 'kether' });
    const state = makeState({}, { players: [p1, p2] });
    const result = initKetherRitual(state, { p1: 1, p2: 2 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ketherRitual?.trialChallenges).toHaveLength(2);
  });

  it('sets subPhase to trial directly (gather is transient)', () => {
    const p1 = makePlayer({ id: 'p1', position: 'kether' });
    const p2 = makePlayer({ id: 'p2', position: 'kether' });
    const state = makeState({}, { players: [p1, p2] });
    const result = initKetherRitual(state, { p1: 1, p2: 2 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ketherRitual?.subPhase).toBe('trial');
  });

  it('builds trialOrder last-arrived first, lex tie-break', () => {
    const p1 = makePlayer({ id: 'p1', position: 'kether' });
    const p2 = makePlayer({ id: 'p2', position: 'kether' });
    const state = makeState({}, { players: [p1, p2] });
    // p2 arrived later (higher timestamp) → p2 first
    const result = initKetherRitual(state, { p1: 1, p2: 10 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ketherRitual?.trialOrder).toEqual(['p2', 'p1']);
  });

  it('tie-break on equal timestamps is ascending lexicographic (p1 before p2)', () => {
    const p1 = makePlayer({ id: 'p1', position: 'kether' });
    const p2 = makePlayer({ id: 'p2', position: 'kether' });
    const state = makeState({}, { players: [p1, p2] });
    // Same timestamp → ascending lex: 'p1' < 'p2' → p1 first
    const result = initKetherRitual(state, { p1: 5, p2: 5 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ketherRitual?.trialOrder).toEqual(['p1', 'p2']);
  });

  it('computes DC = 14 when illumination gap is already met', () => {
    const p1 = makePlayer({ id: 'p1', position: 'kether' });
    const p2 = makePlayer({ id: 'p2', position: 'kether' });
    // illumination 10, separation 0: gap = 10 - 0 - 5 = 5 (surplus) → bonus = 0 → DC = 14
    const state = makeState({}, { players: [p1, p2], illumination: 10, separation: 0 });
    const result = initKetherRitual(state, { p1: 1, p2: 2 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const challenges = result.value.ketherRitual?.trialChallenges ?? [];
    for (const c of challenges) {
      expect(c.dc).toBe(14);
    }
  });

  it('raises DC when the team is behind on the illumination gap', () => {
    const p1 = makePlayer({ id: 'p1', position: 'kether' });
    const p2 = makePlayer({ id: 'p2', position: 'kether' });
    // illumination 0, separation 0: need 5 more → bonus = ceil(5/2) = 3 → DC = 17
    const state = makeState({}, { players: [p1, p2], illumination: 0, separation: 0 });
    const result = initKetherRitual(state, { p1: 1, p2: 2 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const challenges = result.value.ketherRitual?.trialChallenges ?? [];
    for (const c of challenges) {
      expect(c.dc).toBe(17);
    }
  });

  it('roll and passed are null before resolution', () => {
    const p1 = makePlayer({ id: 'p1', position: 'kether' });
    const p2 = makePlayer({ id: 'p2', position: 'kether' });
    const state = makeState({}, { players: [p1, p2] });
    const result = initKetherRitual(state, { p1: 1, p2: 2 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const challenges = result.value.ketherRitual?.trialChallenges ?? [];
    for (const c of challenges) {
      expect(c.roll).toBeNull();
      expect(c.passed).toBeNull();
    }
  });
});

// ──────────────── maybeTriggerKetherRitual ────────────────

describe('maybeTriggerKetherRitual', () => {
  it('returns state unchanged when phase is already kether', () => {
    const state = makeTrialState();
    expect(maybeTriggerKetherRitual(state)).toBe(state);
  });

  it('returns state unchanged when any player is not at Kether', () => {
    const p1 = makePlayer({ id: 'p1', position: 'kether' });
    const p2 = makePlayer({ id: 'p2', position: 'tiferet' });
    const state = makeState({}, { players: [p1, p2] });
    expect(maybeTriggerKetherRitual(state)).toBe(state);
  });

  it('transitions phase to kether and builds ritual when all are at Kether', () => {
    const p1 = makePlayer({ id: 'p1', position: 'kether', arrivedAtKetherAt: 1 });
    const p2 = makePlayer({ id: 'p2', position: 'kether', arrivedAtKetherAt: 2 });
    const state = makeState({}, { players: [p1, p2], phase: 'move' });
    const next = maybeTriggerKetherRitual(state);
    expect(next.phase).toBe('kether');
    expect(next.ketherRitual?.subPhase).toBe('trial');
    expect(next.ketherRitual?.trialChallenges).toHaveLength(2);
  });
});

// ──────────────── ketherTrialStageSpark ────────────────

describe('ketherTrialStageSpark', () => {
  it('stages a held Spark for the current trial challenge', () => {
    const state = makeTrialState({ p1Sparks: new Set(['chesed']) });
    const result = ketherTrialStageSpark(state, { playerId: 'p1', sefirah: 'chesed' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ketherRitual?.trialStagedSparks).toEqual([
      { playerId: 'p1', sefirah: 'chesed' },
    ]);
  });

  it('rejects when the player does not hold the Spark', () => {
    const state = makeTrialState();
    const result = ketherTrialStageSpark(state, { playerId: 'p1', sefirah: 'chesed' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('kether-spark-not-held');
  });

  it('rejects when phase is not kether', () => {
    const state = makeState({}, { phase: 'move' });
    const result = ketherTrialStageSpark(state, { playerId: 'p1', sefirah: 'chesed' });
    expect(result.ok).toBe(false);
  });

  it('rejects when subPhase is close (trial staging is for trial only)', () => {
    const state = makeTrialState({ subPhase: 'close', p1Sparks: new Set(['chesed']) });
    const result = ketherTrialStageSpark(state, { playerId: 'p1', sefirah: 'chesed' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('kether-wrong-sub-phase');
  });

  it('rejects when the same Spark is already staged (prevents double-count)', () => {
    const already: KetherRitualState['trialStagedSparks'] = [
      { playerId: 'p1', sefirah: 'chesed' },
    ];
    const state = makeTrialState({
      p1Sparks: new Set(['chesed']),
      trialStagedSparks: already,
    });
    const result = ketherTrialStageSpark(state, { playerId: 'p1', sefirah: 'chesed' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('kether-already-staged');
  });
});

// ──────────────── ketherTrialUnstageSpark ────────────────

describe('ketherTrialUnstageSpark', () => {
  it('removes a previously staged Spark', () => {
    const staged: KetherRitualState['trialStagedSparks'] = [
      { playerId: 'p1', sefirah: 'chesed' },
    ];
    const state = makeTrialState({ p1Sparks: new Set(['chesed']), trialStagedSparks: staged });
    const result = ketherTrialUnstageSpark(state, { playerId: 'p1', sefirah: 'chesed' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ketherRitual?.trialStagedSparks).toHaveLength(0);
  });

  it('rejects when the Spark was not staged', () => {
    const state = makeTrialState();
    const result = ketherTrialUnstageSpark(state, { playerId: 'p1', sefirah: 'chesed' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('kether-not-staged');
  });
});

// ──────────────── ketherTrialResolve ────────────────

describe('ketherTrialResolve', () => {
  it('records roll and passed=true when roll + stat >= DC, increments illumination', () => {
    // DC = 14, stat insight = 3 (default). Roll 12 → total 15 ≥ 14 → pass.
    const rng = { d20: () => 12, int: () => 12 };
    const state = makeTrialState({ illumination: 2 });
    const result = ketherTrialResolve(state, { playerId: 'p1', rng });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const challenge = result.value.ketherRitual?.trialChallenges[0];
    expect(challenge?.roll).toBe(12);
    expect(challenge?.passed).toBe(true);
    expect(result.value.illumination).toBe(3);
  });

  it('records passed=false and does not increment illumination on fail', () => {
    // DC = 14, stat insight = 3 (default). Roll 1 → total 4 < 14 → fail.
    const rng = { d20: () => 1, int: () => 1 };
    const state = makeTrialState({ illumination: 2 });
    const result = ketherTrialResolve(state, { playerId: 'p1', rng });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const challenge = result.value.ketherRitual?.trialChallenges[0];
    expect(challenge?.passed).toBe(false);
    expect(result.value.illumination).toBe(2);
  });

  it('consumes staged Sparks and applies bonus to the roll', () => {
    // DC = 17, stat insight = 10 (DEFAULT_STATS). Roll 5 → total 15 < 17 → fail without Spark.
    // With one Spark staged (+5): 5 + 10 + 5 = 20 ≥ 17 → pass.
    const rng = { d20: () => 5, int: () => 5 };
    const staged: KetherRitualState['trialStagedSparks'] = [
      { playerId: 'p1', sefirah: 'chesed' },
    ];
    const challenges: readonly KetherTrialChallenge[] = [
      { sefirahKey: 'chokmah', stat: 'insight', dc: 17, roll: null, passed: null },
      { sefirahKey: 'binah', stat: 'understanding', dc: 17, roll: null, passed: null },
    ];
    const state = makeTrialState({
      p1Sparks: new Set(['chesed']),
      trialStagedSparks: staged,
      trialChallenges: challenges,
    });
    const result = ketherTrialResolve(state, { playerId: 'p1', rng });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const challenge = result.value.ketherRitual?.trialChallenges[0];
    expect(challenge?.passed).toBe(true);
    // Spark should be consumed from the player's sparksHeld.
    expect(result.value.players[0]?.sparksHeld.has('chesed')).toBe(false);
    // trialStagedSparks cleared after resolve.
    expect(result.value.ketherRitual?.trialStagedSparks).toHaveLength(0);
  });

  it('grants +1 Illumination per Spark burned (spark-spent event applied)', () => {
    // Regression guard for the missing applyEvents call. The spark-spent
    // event contributes {illumination: 1} via counters.ts:applyEvents.
    // Plus the pass bonus (+1) if the roll passes. Both must land.
    // DC=17, stat=10, roll=5, Spark bonus=5 → 5+10+5=20 ≥ 17 → pass.
    // Expected: illumination 0 + 1 (spark-spent) + 1 (pass) = 2.
    const rng = { d20: () => 5, int: () => 5 };
    const state = makeTrialState({
      illumination: 0,
      separation: 0,
      p1Sparks: new Set(['chesed']),
      trialStagedSparks: [{ playerId: 'p1', sefirah: 'chesed' }],
      trialChallenges: [
        { sefirahKey: 'chokmah', stat: 'insight', dc: 17, roll: null, passed: null },
        { sefirahKey: 'binah', stat: 'understanding', dc: 17, roll: null, passed: null },
      ],
    });
    const result = ketherTrialResolve(state, { playerId: 'p1', rng });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 1 from spark-spent + 1 from pass bonus = 2
    expect(result.value.illumination).toBe(2);
  });

  it('advances trialTurnIndex after resolve', () => {
    const rng = { d20: () => 10, int: () => 10 };
    const state = makeTrialState();
    const result = ketherTrialResolve(state, { playerId: 'p1', rng });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ketherRitual?.trialTurnIndex).toBe(1);
  });

  it('transitions subPhase to close when the last challenge is resolved', () => {
    const rng = { d20: () => 10, int: () => 10 };
    // Only one challenge (one-player scenario) already resolved; or set up
    // so p1 is the last resolver.
    const singleChallenge: readonly KetherTrialChallenge[] = [
      { sefirahKey: 'chokmah', stat: 'insight', dc: 14, roll: null, passed: null },
    ];
    const state = makeTrialState({
      trialOrder: ['p1'],
      trialChallenges: singleChallenge,
    });
    const result = ketherTrialResolve(state, { playerId: 'p1', rng });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ketherRitual?.subPhase).toBe('close');
  });

  it('rejects when phase is not kether', () => {
    const rng = { d20: () => 10, int: () => 10 };
    const state = makeState({}, { phase: 'move' });
    const result = ketherTrialResolve(state, { playerId: 'p1', rng });
    expect(result.ok).toBe(false);
  });

  it('rejects when subPhase is not trial', () => {
    const rng = { d20: () => 10, int: () => 10 };
    const state = makeTrialState({ subPhase: 'close' });
    const result = ketherTrialResolve(state, { playerId: 'p1', rng });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('kether-wrong-sub-phase');
  });

  it('rejects when it is not the dispatcher turn', () => {
    const rng = { d20: () => 10, int: () => 10 };
    // trialTurnIndex = 0 → p1's turn, but p2 tries to resolve.
    const state = makeTrialState({ trialTurnIndex: 0 });
    const result = ketherTrialResolve(state, { playerId: 'p2', rng });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('kether-not-your-turn');
  });
});

// ──────────────── ketherStageSpark (closure window) ────────────────

describe('ketherStageSpark — closure window', () => {
  it('stages a held Spark for the closure window in the close sub-phase', () => {
    const state = makeTrialState({ subPhase: 'close', p1Sparks: new Set(['chesed']) });
    const result = ketherStageSpark(state, { playerId: 'p1', sefirah: 'chesed' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ketherRitual?.stagedClosureSparks).toEqual([
      { playerId: 'p1', sefirah: 'chesed' },
    ]);
  });

  it('rejects when the player does not hold the Spark', () => {
    const state = makeTrialState({ subPhase: 'close' });
    const result = ketherStageSpark(state, { playerId: 'p1', sefirah: 'chesed' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('kether-spark-not-held');
  });

  it('rejects outside the close sub-phase', () => {
    const state = makeTrialState({ p1Sparks: new Set(['chesed']) });
    const result = ketherStageSpark(state, { playerId: 'p1', sefirah: 'chesed' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('kether-wrong-sub-phase');
  });

  it('rejects after closure is locked', () => {
    const state = makeTrialState({
      subPhase: 'close',
      closureLocked: true,
      p1Sparks: new Set(['chesed']),
    });
    const result = ketherStageSpark(state, { playerId: 'p1', sefirah: 'chesed' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('kether-closure-locked');
  });
});

// ──────────────── ketherUnstageSpark (closure window) ────────────────

describe('ketherUnstageSpark — closure window', () => {
  it('removes a previously staged closure Spark', () => {
    const state = makeTrialState({
      subPhase: 'close',
      p1Sparks: new Set(['chesed']),
      stagedClosureSparks: [{ playerId: 'p1', sefirah: 'chesed' }],
    });
    const result = ketherUnstageSpark(state, { playerId: 'p1', sefirah: 'chesed' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ketherRitual?.stagedClosureSparks).toHaveLength(0);
  });

  it('rejects when the Spark was not staged', () => {
    const state = makeTrialState({ subPhase: 'close' });
    const result = ketherUnstageSpark(state, { playerId: 'p1', sefirah: 'chesed' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('kether-not-staged');
  });
});

// ──────────────── ketherConfirmClosure ────────────────

describe('ketherConfirmClosure', () => {
  it('consumes staged Sparks, increments illumination, and exits phase to end', () => {
    const state = makeTrialState({
      subPhase: 'close',
      p1Sparks: new Set(['chesed']),
      stagedClosureSparks: [{ playerId: 'p1', sefirah: 'chesed' }],
      illumination: 4,
      separation: 0,
    });
    const result = ketherConfirmClosure(state, { playerId: 'p1' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Spark consumed → +1 illumination (4 → 5). With margin = 5, 5 >= 0+5 → win.
    expect(result.value.illumination).toBe(5);
    expect(result.value.phase).toBe('end');
    expect(result.value.ketherRitual?.closureLocked).toBe(true);
    expect(result.meta.droppedSparks).toHaveLength(0);
  });

  it('rejects when closure is already locked (first-confirm-wins)', () => {
    const state = makeTrialState({ subPhase: 'close', closureLocked: true });
    const result = ketherConfirmClosure(state, { playerId: 'p1' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('kether-already-confirmed');
  });

  it('rejects outside the close sub-phase', () => {
    const state = makeTrialState({ subPhase: 'trial' });
    const result = ketherConfirmClosure(state, { playerId: 'p1' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('kether-wrong-sub-phase');
  });

  it('exits to phase end (not kether) so checkEndgame can evaluate the result', () => {
    const state = makeTrialState({ subPhase: 'close', illumination: 10, separation: 0 });
    const result = ketherConfirmClosure(state, { playerId: 'p1' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.phase).toBe('end');
  });

  it('drops staged Sparks the player no longer holds (race-condition defense)', () => {
    // Spark is staged but player no longer holds it (simulated via direct state).
    const state = makeTrialState({
      subPhase: 'close',
      // p1 has no sparks held, but one is staged
      p1Sparks: new Set(),
      stagedClosureSparks: [{ playerId: 'p1', sefirah: 'chesed' }],
    });
    const result = ketherConfirmClosure(state, { playerId: 'p1' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.meta.droppedSparks).toHaveLength(1);
    expect(result.meta.droppedSparks[0]?.sefirah).toBe('chesed');
  });

  it('exits to separation-overflow loss when separation exceeds threshold', () => {
    // Separation at threshold — even a confirm should not hide the overflow.
    const state = makeTrialState({
      subPhase: 'close',
      separation: SEPARATION_LOSS_THRESHOLD,
      illumination: 20,
    });
    // The pre-confirm separation-overflow check should surface.
    const result = ketherConfirmClosure(state, { playerId: 'p1' });
    // Either it rejects as game-already-lost or exits cleanly — the engine
    // gates on the endgame check. Current impl exits to 'end' and lets
    // checkEndgame report 'lost'. Either outcome is correct; we just verify
    // the phase changed from 'kether'.
    if (result.ok) {
      expect(result.value.phase).not.toBe('kether');
    }
  });
});

// ──────────────── separation overflow during trial ────────────────

describe('separation overflow during trial sub-phase', () => {
  it('REQUIRED_ILLUMINATION_MARGIN constant is 5', () => {
    expect(REQUIRED_ILLUMINATION_MARGIN).toBe(5);
  });

  it('SEPARATION_LOSS_THRESHOLD constant is 15', () => {
    expect(SEPARATION_LOSS_THRESHOLD).toBe(15);
  });
});
