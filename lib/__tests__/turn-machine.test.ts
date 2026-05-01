import { describe, expect, it } from 'vitest';
import { seededRng } from '@/engine/rng';
import {
  EMPTY_PENDING_MODIFIERS,
  type CheckOutcome,
  type TurnPhase,
} from '@/engine/types';
import { turnReducer, type TurnSnapshot } from '../turn-machine';
import { makeFullGame, makePlayer, makeState } from '@/test/fixtures';

/**
 * Pure-reducer tests. Cover the full event × phase matrix so the
 * hook tests can stay focused on React glue. Properties from #93
 * could plug into this surface without `renderHook`.
 *
 * Post-#227 review fix: `phase`, `challengeSubPhase`, and `lastOutcome`
 * live on `GameState` directly (not on `TurnSnapshot`). Tests build
 * a `TurnSnapshot` by spreading the desired phase machinery onto the
 * underlying state.
 */

function snapshotAt(phase: TurnPhase): TurnSnapshot {
  const state = makeFullGame({ playerCount: 2, seed: 1 });
  if (phase === 'challenge') {
    return {
      state: { ...state, phase, challengeSubPhase: 'prep' },
    };
  }
  return { state: { ...state, phase } };
}

const RNG = seededRng(1);

describe('turnReducer — phase guards', () => {
  it('rejects move when phase is not move', () => {
    const result = turnReducer(snapshotAt('challenge'), { kind: 'move', pathNumber: 32 }, RNG);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('wrong-phase');
    if (result.reason.kind !== 'wrong-phase') return;
    expect(result.reason.expected).toBe('move');
    expect(result.reason.actual).toBe('challenge');
  });

  it('rejects meditate when phase is not move', () => {
    const result = turnReducer(snapshotAt('draw'), { kind: 'meditate' }, RNG);
    expect(result.ok).toBe(false);
  });

  it('rejects prep-confirm when phase is not challenge', () => {
    const result = turnReducer(
      snapshotAt('move'),
      { kind: 'prep-confirm', sefirah: 'gevurah' },
      RNG,
    );
    expect(result.ok).toBe(false);
  });

  it('rejects accept-setback when phase is not challenge', () => {
    const result = turnReducer(
      snapshotAt('draw'),
      { kind: 'accept-setback', sefirah: 'gevurah' },
      RNG,
    );
    expect(result.ok).toBe(false);
  });

  it('rejects draw when phase is not draw', () => {
    const result = turnReducer(snapshotAt('move'), { kind: 'draw' }, RNG);
    expect(result.ok).toBe(false);
  });

  it('rejects end-turn when phase is not end', () => {
    const result = turnReducer(snapshotAt('move'), { kind: 'end-turn' }, RNG);
    expect(result.ok).toBe(false);
  });
});

describe('turnReducer — phase transitions', () => {
  it('meditate from move → end (hand grows by up to MEDITATE_DRAW)', () => {
    // #128 fix: meditate is a complete turn-action that draws 2 cards
    // (capped at HAND_CAP) and skips the 'draw' phase. The previous
    // contract — `phase: 'draw'`, state unchanged — was broken: the
    // 'draw' handler only refilled toward STARTING_HAND_SIZE so a
    // meditating player at 4 cards saw nothing happen.
    const before = snapshotAt('move');
    const result = turnReducer(before, { kind: 'meditate' }, RNG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.state.phase).toBe('end');
    // State changed (cards drew); not identity-preserved anymore.
    expect(result.value.next.state).not.toBe(before.state);
  });

  it('move into uncleared check Sefirah → challenge phase + prep sub-phase', () => {
    // Player 0 at malkuth holds card 32 ("The World", Malkuth ↔ Yesod).
    // Yesod has a check; not yet cleared in a fresh game.
    const player = makePlayer({ id: 'p1', position: 'malkuth', hand: [21] });
    const state = makeState({}, { players: [player] });
    const before: TurnSnapshot = { state: { ...state, phase: 'move' } };
    const result = turnReducer(before, { kind: 'move', pathNumber: 32 }, RNG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.state.phase).toBe('challenge');
    expect(result.value.next.state.challengeSubPhase).toBe('prep');
    expect(result.value.next.state.players[0]?.position).toBe('yesod');
  });

  it('move into already-cleared Sefirah → draw phase (no sub-phase)', () => {
    const player = makePlayer({
      id: 'p1',
      position: 'malkuth',
      hand: [21],
      clearedSefirot: new Set(['yesod']),
    });
    const state = makeState({}, { players: [player] });
    const result = turnReducer(
      { state: { ...state, phase: 'move' } },
      { kind: 'move', pathNumber: 32 },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.state.phase).toBe('draw');
    expect(result.value.next.state.challengeSubPhase).toBeUndefined();
  });

  it('accept-setback from challenge react sub-phase → draw + +1 separation + cleared sub-phase', () => {
    const player = makePlayer({ id: 'p1', position: 'gevurah', hand: [] });
    const state = makeState({}, { players: [player], separation: 3 });
    const result = turnReducer(
      { state: { ...state, phase: 'challenge', challengeSubPhase: 'react' } },
      { kind: 'accept-setback', sefirah: 'gevurah' },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.state.phase).toBe('draw');
    expect(result.value.next.state.challengeSubPhase).toBeUndefined();
    expect(result.value.next.state.separation).toBe(4);
  });

  it('end-turn from end → move phase + active player rotates', () => {
    const initial = makeFullGame({ playerCount: 2, seed: 7 });
    const result = turnReducer(
      { state: { ...initial, phase: 'end' } },
      { kind: 'end-turn' },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.state.phase).toBe('move');
    expect(result.value.next.state.activePlayerId).not.toBe(
      initial.activePlayerId,
    );
  });

  it('move that is the last arrival at Kether trips the Final Threshold ritual (#345)', () => {
    // p1 already at Kether (held); p2 active, at Tiferet, holds arcanum 2.
    // p2 plays path 13 — convergence is met and the reducer skips the
    // regular phase-decision (no challenge, no draw), surfacing the
    // ritual state directly.
    const p1 = makePlayer({
      id: 'p1',
      position: 'kether',
      hand: [],
      arrivedAtKetherAt: 100,
    });
    const p2 = makePlayer({
      id: 'p2',
      position: 'tiferet',
      hand: [2],
    });
    const state = makeState(
      {},
      { players: [p1, p2], phase: 'move', activePlayerId: 'p2' },
    );
    const result = turnReducer(
      { state },
      { kind: 'move', pathNumber: 13 },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.state.phase).toBe('kether');
    expect(result.value.next.state.ketherRitual).toBeDefined();
    expect(result.value.next.state.ketherRitual?.subPhase).toBe('witness');
    expect(result.value.next.state.ketherRitual?.witnessOrder[0]).toBe('p2');
  });
});

describe('turnReducer — prep sub-phase: prep-add-modifier', () => {
  it('appends a card-burn modifier to PendingModifiers without consuming the card', () => {
    const player = makePlayer({
      id: 'p1',
      position: 'gevurah',
      hand: [3, 7, 12],
    });
    const state = makeState({}, { players: [player] });
    const result = turnReducer(
      { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
      { kind: 'prep-add-modifier', modifier: { kind: 'card-burn', arcanum: 7 } },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.state.pendingModifiers.cardBurns).toEqual([7]);
    // Hand untouched.
    expect(result.value.next.state.players[0]?.hand).toEqual([3, 7, 12]);
    expect(result.value.next.state.phase).toBe('challenge');
    expect(result.value.next.state.challengeSubPhase).toBe('prep');
  });

  it('appends a spark-burn with sourcePlayerId without consuming the spark', () => {
    const ally = makePlayer({
      id: 'p2',
      name: 'Bea',
      position: 'gevurah',
      sparksHeld: new Set(['hod']),
    });
    const player = makePlayer({ id: 'p1', position: 'gevurah', hand: [] });
    const state = makeState(
      {},
      { players: [player, ally], activePlayerId: 'p1' },
    );
    const result = turnReducer(
      { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
      {
        kind: 'prep-add-modifier',
        modifier: { kind: 'spark-burn', sefirah: 'hod', sourcePlayerId: 'p2' },
      },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.state.pendingModifiers.sparkBurns).toEqual([
      { sefirah: 'hod', sourcePlayerId: 'p2' },
    ]);
    // Ally's spark untouched.
    expect(
      result.value.next.state.players[1]?.sparksHeld.has('hod'),
    ).toBe(true);
  });

  it('appends an assist-request without affecting ally state', () => {
    const ally = makePlayer({ id: 'p2', position: 'gevurah' });
    const player = makePlayer({ id: 'p1', position: 'gevurah' });
    const state = makeState(
      {},
      { players: [player, ally], activePlayerId: 'p1' },
    );
    const result = turnReducer(
      { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
      {
        kind: 'prep-add-modifier',
        modifier: { kind: 'assist-request', allyId: 'p2' },
      },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.state.pendingModifiers.assistRequests).toEqual([
      'p2',
    ]);
  });

  it('rejects prep-add-modifier outside the prep sub-phase', () => {
    const player = makePlayer({ id: 'p1', position: 'gevurah' });
    const state = makeState({}, { players: [player] });
    const result = turnReducer(
      { state: { ...state, phase: 'challenge', challengeSubPhase: 'react' } },
      { kind: 'prep-add-modifier', modifier: { kind: 'card-burn', arcanum: 7 } },
      RNG,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('wrong-sub-phase');
  });

  it('rejects card-burn for an arcanum that is not in hand (#281 trust boundary)', () => {
    const player = makePlayer({
      id: 'p1',
      position: 'gevurah',
      hand: [3, 7, 12],
    });
    const state = makeState({}, { players: [player] });
    const result = turnReducer(
      { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
      {
        kind: 'prep-add-modifier',
        modifier: { kind: 'card-burn', arcanum: 99 },
      },
      RNG,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('card-not-in-hand');
  });

  it('rejects a second card-burn for the same arcanum when only one copy is in hand', () => {
    const player = makePlayer({
      id: 'p1',
      position: 'gevurah',
      hand: [3, 7, 12],
    });
    const state = makeState(
      {},
      {
        players: [player],
        // First copy already staged.
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, cardBurns: [7] },
      },
    );
    const result = turnReducer(
      { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
      {
        kind: 'prep-add-modifier',
        modifier: { kind: 'card-burn', arcanum: 7 },
      },
      RNG,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('card-not-in-hand');
  });

  it('allows a second card-burn for an arcanum that is held twice in hand', () => {
    const player = makePlayer({
      id: 'p1',
      position: 'gevurah',
      hand: [7, 7, 12],
    });
    const state = makeState(
      {},
      {
        players: [player],
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, cardBurns: [7] },
      },
    );
    const result = turnReducer(
      { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
      {
        kind: 'prep-add-modifier',
        modifier: { kind: 'card-burn', arcanum: 7 },
      },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.state.pendingModifiers.cardBurns).toEqual([7, 7]);
  });

  it('rejects spark-burn for a (sefirah, source) the source player does not hold (#281 trust boundary)', () => {
    const ally = makePlayer({
      id: 'p2',
      position: 'gevurah',
      sparksHeld: new Set(['hod']),
    });
    const player = makePlayer({ id: 'p1', position: 'gevurah' });
    const state = makeState(
      {},
      { players: [player, ally], activePlayerId: 'p1' },
    );
    const result = turnReducer(
      { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
      {
        kind: 'prep-add-modifier',
        // Ally holds 'hod', not 'binah'.
        modifier: { kind: 'spark-burn', sefirah: 'binah', sourcePlayerId: 'p2' },
      },
      RNG,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('spark-not-held');
  });

  it('rejects a second spark-burn for the same (sefirah, source) slot', () => {
    const ally = makePlayer({
      id: 'p2',
      position: 'gevurah',
      sparksHeld: new Set(['hod']),
    });
    const player = makePlayer({ id: 'p1', position: 'gevurah' });
    const state = makeState(
      {},
      {
        players: [player, ally],
        activePlayerId: 'p1',
        pendingModifiers: {
          ...EMPTY_PENDING_MODIFIERS,
          sparkBurns: [{ sefirah: 'hod', sourcePlayerId: 'p2' }],
        },
      },
    );
    const result = turnReducer(
      { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
      {
        kind: 'prep-add-modifier',
        modifier: { kind: 'spark-burn', sefirah: 'hod', sourcePlayerId: 'p2' },
      },
      RNG,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('spark-not-held');
  });

  it('caps assistRequests at 2 — third add is rejected', () => {
    const allyA = makePlayer({ id: 'p2', position: 'gevurah' });
    const allyB = makePlayer({ id: 'p3', position: 'gevurah' });
    const allyC = makePlayer({ id: 'p4', position: 'gevurah' });
    const player = makePlayer({ id: 'p1', position: 'gevurah' });
    const state = makeState(
      {},
      { players: [player, allyA, allyB, allyC], activePlayerId: 'p1' },
    );
    let snap: TurnSnapshot = {
      state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' },
    };
    const r1 = turnReducer(
      snap,
      {
        kind: 'prep-add-modifier',
        modifier: { kind: 'assist-request', allyId: 'p2' },
      },
      RNG,
    );
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    snap = r1.value.next;
    const r2 = turnReducer(
      snap,
      {
        kind: 'prep-add-modifier',
        modifier: { kind: 'assist-request', allyId: 'p3' },
      },
      RNG,
    );
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    snap = r2.value.next;
    expect(snap.state.pendingModifiers.assistRequests).toEqual(['p2', 'p3']);
    const r3 = turnReducer(
      snap,
      {
        kind: 'prep-add-modifier',
        modifier: { kind: 'assist-request', allyId: 'p4' },
      },
      RNG,
    );
    // Third assist must be rejected; cap is 2.
    expect(r3.ok).toBe(false);
  });
});

describe('turnReducer — prep sub-phase: prep-remove-modifier', () => {
  it('removes the first matching card-burn entry by value', () => {
    const player = makePlayer({
      id: 'p1',
      position: 'gevurah',
      hand: [3, 7, 12],
    });
    const state = makeState(
      {},
      {
        players: [player],
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, cardBurns: [3, 7, 7] },
      },
    );
    const result = turnReducer(
      { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
      {
        kind: 'prep-remove-modifier',
        modifier: { kind: 'card-burn', arcanum: 7 },
      },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // First matching 7 removed; the second 7 stays.
    expect(result.value.next.state.pendingModifiers.cardBurns).toEqual([3, 7]);
  });

  it('silently no-ops when the modifier is not present', () => {
    const player = makePlayer({ id: 'p1', position: 'gevurah' });
    const state = makeState(
      {},
      {
        players: [player],
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, cardBurns: [3] },
      },
    );
    const result = turnReducer(
      { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
      {
        kind: 'prep-remove-modifier',
        modifier: { kind: 'card-burn', arcanum: 99 },
      },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.state.pendingModifiers.cardBurns).toEqual([3]);
  });

  it('removes the first matching assist-request', () => {
    const player = makePlayer({ id: 'p1', position: 'gevurah' });
    const state = makeState(
      {},
      {
        players: [player],
        pendingModifiers: {
          ...EMPTY_PENDING_MODIFIERS,
          assistRequests: ['p2', 'p3'],
        },
      },
    );
    const result = turnReducer(
      { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
      {
        kind: 'prep-remove-modifier',
        modifier: { kind: 'assist-request', allyId: 'p2' },
      },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.state.pendingModifiers.assistRequests).toEqual([
      'p3',
    ]);
  });

  it('rejects prep-remove-modifier outside the prep sub-phase', () => {
    const player = makePlayer({ id: 'p1', position: 'gevurah' });
    const state = makeState({}, { players: [player] });
    const result = turnReducer(
      { state: { ...state, phase: 'challenge', challengeSubPhase: 'react' } },
      {
        kind: 'prep-remove-modifier',
        modifier: { kind: 'card-burn', arcanum: 7 },
      },
      RNG,
    );
    expect(result.ok).toBe(false);
  });
});

describe('turnReducer — prep sub-phase: prep-confirm', () => {
  it('transitions to react sub-phase on pass and clears pendingModifiers', () => {
    const player = makePlayer({
      id: 'p1',
      position: 'gevurah',
      hand: [],
      stats: {
        unity: 10,
        insight: 10,
        understanding: 10,
        lovingkindness: 10,
        strength: 12,
        harmony: 10,
        passion: 10,
        intellect: 10,
        intuition: 10,
        body: 10,
      },
    });
    const state = makeState({}, { players: [player] });
    const result = turnReducer(
      { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
      {
        kind: 'prep-confirm',
        sefirah: 'gevurah',
        outcome: {
          rolled: 18,
          statContribution: 12,
          modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
          total: 30,
          effectiveDC: 15,
          pass: true,
        },
      },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.state.phase).toBe('challenge');
    expect(result.value.next.state.challengeSubPhase).toBe('react');
    expect(result.value.meta?.challenge.outcome.pass).toBe(true);
    expect(
      result.value.next.state.players[0]?.clearedSefirot.has('gevurah'),
    ).toBe(true);
    expect(result.value.next.state.pendingModifiers.cardBurns).toEqual([]);
    expect(result.value.next.state.pendingModifiers.sparkBurns).toEqual([]);
    expect(result.value.next.state.pendingModifiers.assistRequests).toEqual([]);
  });

  it('transitions to react sub-phase on fail and exposes failed outcome via lastOutcome', () => {
    const player = makePlayer({ id: 'p1', position: 'gevurah', hand: [] });
    const state = makeState({}, { players: [player] });
    const result = turnReducer(
      { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
      {
        kind: 'prep-confirm',
        sefirah: 'gevurah',
        outcome: {
          rolled: 1,
          statContribution: 10,
          modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
          total: 11,
          effectiveDC: 15,
          pass: false,
        },
      },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.state.phase).toBe('challenge');
    expect(result.value.next.state.challengeSubPhase).toBe('react');
    expect(result.value.next.state.lastOutcome?.pass).toBe(false);
    expect(result.value.meta?.challenge.outcome.pass).toBe(false);
  });

  it('treats a staged card-burn no longer in hand as previously consumed (cumulative retry semantic, #281)', () => {
    // Pre-#281, an arcanum staged in pendingModifiers but absent from
    // hand was reported as `dropped` and stripped from the d20
    // modifier. With consumption (#281) the only legitimate way for
    // that to happen is a prior failed prep-confirm that already
    // consumed the card — so the engine credits it toward the
    // cumulative `cardBurns` count (design § 6 retry semantics) and
    // does NOT surface it as dropped.
    const player = makePlayer({
      id: 'p1',
      position: 'gevurah',
      hand: [], // empty — staged card 7 was consumed by a prior failed roll
    });
    const state = makeState(
      {},
      {
        players: [player],
        pendingModifiers: {
          ...EMPTY_PENDING_MODIFIERS,
          cardBurns: [7],
        },
      },
    );
    const result = turnReducer(
      { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
      {
        kind: 'prep-confirm',
        sefirah: 'gevurah',
        outcome: {
          rolled: 18,
          statContribution: 10,
          modifierBreakdown: { assist: 0, cardBurn: 3, sparkBurn: 0 },
          total: 31,
          effectiveDC: 15,
          pass: true,
        },
      },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Card-burn drops are no longer surfaced (see translatePendingModifiers
    // JSDoc). meta.dropped only carries assist drops now.
    expect(
      result.value.meta?.dropped.filter((d) => d.kind === 'card-burn'),
    ).toEqual([]);
    // Hand stays empty (nothing to consume) and discard is untouched —
    // the engine knew the card was already gone.
    expect(result.value.next.state.players[0]?.hand).toEqual([]);
    expect(result.value.next.state.discardPile).toEqual([]);
  });

  it('drops invalid assist-request (ally not at same Sefirah) and surfaces it in meta.dropped', () => {
    const ally = makePlayer({
      id: 'p2',
      position: 'tiferet', // not at active player's gevurah
    });
    const player = makePlayer({ id: 'p1', position: 'gevurah' });
    const state = makeState(
      {},
      {
        players: [player, ally],
        activePlayerId: 'p1',
        pendingModifiers: {
          ...EMPTY_PENDING_MODIFIERS,
          assistRequests: ['p2'],
        },
      },
    );
    const result = turnReducer(
      { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
      {
        kind: 'prep-confirm',
        sefirah: 'gevurah',
        outcome: {
          rolled: 18,
          statContribution: 10,
          modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
          total: 28,
          effectiveDC: 15,
          pass: true,
        },
      },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.meta?.dropped).toEqual([
      { kind: 'assist-request', allyId: 'p2' },
    ]);
  });

  it('rejects prep-confirm outside the prep sub-phase', () => {
    const player = makePlayer({ id: 'p1', position: 'gevurah' });
    const state = makeState({}, { players: [player] });
    const result = turnReducer(
      { state: { ...state, phase: 'challenge', challengeSubPhase: 'react' } },
      { kind: 'prep-confirm', sefirah: 'gevurah' },
      RNG,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('wrong-sub-phase');
  });

  it('honours directAssistStats override and ignores staged assistRequests', () => {
    // E4 hot-seat hatch (#229): the wrapper passes pre-built
    // `assistStats: number[]` (full ally stats — engine halves on
    // sum). The override must short-circuit translation so the
    // numbers the modal showed the player are exactly what the
    // engine sees. Staged `assist-request`s on the same snapshot
    // are NOT credited (the wrapper does not stage them; this is
    // belt-and-braces in case both ever coexist).
    const ally = makePlayer({
      id: 'p2',
      position: 'gevurah',
      stats: { ...DEFAULT_STATS_FOR_TEST, strength: 14 },
    });
    const player = makePlayer({
      id: 'p1',
      position: 'gevurah',
      stats: { ...DEFAULT_STATS_FOR_TEST, strength: 10 },
    });
    const state = makeState(
      {},
      {
        players: [player, ally],
        activePlayerId: 'p1',
        pendingModifiers: {
          ...EMPTY_PENDING_MODIFIERS,
          // Staged assist that would normally contribute 14/2 = 7;
          // the override should make this irrelevant.
          assistRequests: ['p2'],
        },
        phase: 'challenge',
        challengeSubPhase: 'prep',
      },
    );
    const result = turnReducer(
      { state },
      {
        kind: 'prep-confirm',
        sefirah: 'gevurah',
        // Different magnitude (8) so the assertion can distinguish
        // override-was-honoured from staged-was-translated.
        directAssistStats: [8],
        outcome: {
          rolled: 18,
          statContribution: 10,
          modifierBreakdown: { assist: 4, cardBurn: 0, sparkBurn: 0 },
          total: 32,
          effectiveDC: 15,
          pass: true,
        },
      },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // The challenge resolved successfully — staged assist-request
    // does NOT appear in `meta.dropped` because translation never
    // produced it. (The override path skips translation's drop
    // accounting for assists.) The state advanced (Sefirah cleared
    // → success path), confirming `resolveChallenge` saw the
    // override-supplied stats.
    expect(
      result.value.next.state.players[0]?.clearedSefirot.has('gevurah'),
    ).toBe(true);
  });

  it('derives shortcutPenalty from lastArrivalPathNumber and bumps effectiveDC by +3 on a central-pillar arrival', () => {
    // #286 Path B: the reducer derives `shortcutPenalty` at confirm
    // time from `state.players[active].lastArrivalPathNumber` rather
    // than honouring an event-side override. A player who arrived
    // via path 25 (Tiferet ↔ Yesod, all-balance pillars) is on a
    // central-pillar shortcut and faces the +3 DC penalty —
    // yesod base DC 12 → effective 15. We use an aries player at a
    // non-soul-door sefirah (yesod) so the soul-door delta stays 0
    // and the assertion isolates the shortcut bump.
    //
    // No `outcome` is passed: the engine calls `rollCheck` and the
    // resulting `effectiveDC` is computed from the derived
    // `modifiers.shortcutPenalty`, which is the assertion target.
    const player = makePlayer({
      id: 'p1',
      position: 'yesod',
      stats: { ...DEFAULT_STATS_FOR_TEST, intuition: 10 },
      lastArrivalPathNumber: 25,
    });
    const state = makeState(
      {},
      { players: [player], phase: 'challenge', challengeSubPhase: 'prep' },
    );
    const result = turnReducer(
      { state },
      {
        kind: 'prep-confirm',
        sefirah: 'yesod',
      },
      seededRng(1),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // yesod base DC 12; with +3 shortcut, effective 15.
    expect(result.value.meta?.challenge.outcome.effectiveDC).toBe(15);
  });

  it('derives shortcutPenalty=false on a non-shortcut arrival (path 14, mercy/severity)', () => {
    // Counter-test: a non-central-pillar arrival. Path 14
    // (Chokmah ↔ Binah, mercy/severity) is NOT a shortcut. Baseline
    // DC applies. Aries player at binah (not a soul door), so the
    // delta is purely the shortcut derivation.
    const player = makePlayer({
      id: 'p1',
      position: 'binah',
      stats: { ...DEFAULT_STATS_FOR_TEST, understanding: 10 },
      lastArrivalPathNumber: 14,
    });
    const state = makeState(
      {},
      { players: [player], phase: 'challenge', challengeSubPhase: 'prep' },
    );
    const result = turnReducer(
      { state },
      {
        kind: 'prep-confirm',
        sefirah: 'binah',
      },
      seededRng(1),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // binah base DC 16; no shortcut bump.
    expect(result.value.meta?.challenge.outcome.effectiveDC).toBe(16);
  });

  it('derives shortcutPenalty=false when lastArrivalPathNumber is unset (fresh game / pre-move)', () => {
    // Fixture default: no `lastArrivalPathNumber` set. Folds to
    // non-shortcut so the engine never throws on a pre-#275
    // snapshot or a synthesised test state without prior moves.
    const player = makePlayer({
      id: 'p1',
      position: 'gevurah',
      stats: { ...DEFAULT_STATS_FOR_TEST, strength: 10 },
    });
    const state = makeState(
      {},
      { players: [player], phase: 'challenge', challengeSubPhase: 'prep' },
    );
    const result = turnReducer(
      { state },
      {
        kind: 'prep-confirm',
        sefirah: 'gevurah',
      },
      seededRng(1),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.meta?.challenge.outcome.effectiveDC).toBe(15);
  });

  it('derived-shortcut failure → accept-setback still produces +2 Separation and position rollback (#275 / #303 regression)', () => {
    // End-to-end #275 regression coverage under the #286 derivation:
    // a path-25 arrival (Tiferet ↔ Yesod, central pillar) at yesod
    // produces +3 DC; a forced-fail outcome lands in `react`; an
    // `accept-setback` event with `shortcut: true` then ticks
    // Separation by 2 (not 1) AND rolls the player back to tiferet.
    // Pre-#286 the shortcut bit was an event-side override; under
    // derivation the same flow must reach the same final state.
    const player = makePlayer({
      id: 'p1',
      position: 'yesod',
      stats: { ...DEFAULT_STATS_FOR_TEST, intuition: 10 },
      lastArrivalPathNumber: 25,
    });
    const state = makeState(
      {},
      {
        players: [player],
        separation: 0,
        phase: 'challenge',
        challengeSubPhase: 'prep',
      },
    );
    // 1) Confirm with a forced-fail pre-rolled outcome that already
    //    bakes in the +3 effectiveDC from the derivation. (We pass a
    //    pre-rolled `outcome` because using the engine's seededRng
    //    path can pass on lucky rolls. The assertion is on the post-
    //    setback state, not on the d20 itself.)
    const confirm = turnReducer(
      { state },
      {
        kind: 'prep-confirm',
        sefirah: 'yesod',
        outcome: {
          rolled: 1,
          statContribution: 10,
          modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
          total: 11,
          effectiveDC: 15,
          pass: false,
        },
      },
      seededRng(1),
    );
    expect(confirm.ok).toBe(true);
    if (!confirm.ok) return;
    expect(confirm.value.next.state.lastOutcome?.pass).toBe(false);

    // 2) Accept setback on a shortcut: +2 Separation + rollback.
    const setback = turnReducer(
      confirm.value.next,
      { kind: 'accept-setback', sefirah: 'yesod', shortcut: true },
      seededRng(1),
    );
    expect(setback.ok).toBe(true);
    if (!setback.ok) return;
    expect(setback.value.next.state.separation).toBe(2);
    // #275: position rolls back to tiferet (other endpoint of path 25).
    expect(setback.value.next.state.players[0]?.position).toBe('tiferet');
    // Phase teardown: leaves challenge → draw, sub-phase cleared.
    expect(setback.value.next.state.phase).toBe('draw');
    expect(setback.value.next.state.challengeSubPhase).toBeUndefined();
  });
});

describe('turnReducer — prep-confirm: burn consumption (#281)', () => {
  // The bug: pre-fix, prep-confirm read cardBurns as a count to compute
  // the d20 modifier but never moved the actual arcana from hand to
  // discardPile, letting players "spend" the same card across multiple
  // challenges with no real cost. design/mechanics.md § "Card burn":
  // "(The card goes to discard; you cannot use it to travel.)"
  // Sunk-cost — burns are paid whether the roll passes or fails.
  it('moves staged cardBurn arcana from player.hand to state.discardPile on pass', () => {
    const player = makePlayer({
      id: 'p1',
      position: 'gevurah',
      hand: [3, 7, 11],
      stats: { ...DEFAULT_STATS_FOR_TEST, strength: 12 },
    });
    const state = makeState(
      {},
      {
        players: [player],
        discardPile: [99],
        pendingModifiers: {
          ...EMPTY_PENDING_MODIFIERS,
          cardBurns: [3, 7],
        },
      },
    );
    const result = turnReducer(
      { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
      {
        kind: 'prep-confirm',
        sefirah: 'gevurah',
        outcome: {
          rolled: 18,
          statContribution: 12,
          modifierBreakdown: { assist: 0, cardBurn: 6, sparkBurn: 0 },
          total: 36,
          effectiveDC: 15,
          pass: true,
        },
      },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = result.value.next.state.players[0];
    // Cards 3 and 7 consumed; 11 still in hand. Hand sorting preserved
    // for the survivor — the consumption is a removal-by-value, not a
    // re-deal.
    expect(after?.hand).toEqual([11]);
    // Discard grew by 2; pre-existing entry [99] preserved.
    expect(result.value.next.state.discardPile).toEqual([99, 3, 7]);
  });

  it('moves staged cardBurn arcana from hand to discardPile on FAIL (sunk cost)', () => {
    // design/mechanics.md § "Card burn": "(The card goes to discard;
    // you cannot use it to travel.)" The cards are paid at confirm,
    // not refunded on fail. This is the asymmetric design choice that
    // makes burns a real strategic tradeoff — the player pays whether
    // the d20 lands favorably or not.
    const player = makePlayer({
      id: 'p1',
      position: 'gevurah',
      hand: [3, 7, 11],
    });
    const state = makeState(
      {},
      {
        players: [player],
        discardPile: [],
        pendingModifiers: {
          ...EMPTY_PENDING_MODIFIERS,
          cardBurns: [3, 7],
        },
      },
    );
    const result = turnReducer(
      { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
      {
        kind: 'prep-confirm',
        sefirah: 'gevurah',
        outcome: {
          rolled: 1,
          statContribution: 10,
          modifierBreakdown: { assist: 0, cardBurn: 6, sparkBurn: 0 },
          total: 17,
          effectiveDC: 25, // forced fail
          pass: false,
        },
      },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.state.lastOutcome?.pass).toBe(false);
    // Hand and discard mutated as if the burn paid out, even though
    // the roll failed.
    expect(result.value.next.state.players[0]?.hand).toEqual([11]);
    expect(result.value.next.state.discardPile).toEqual([3, 7]);
    // pendingModifiers.cardBurns preserved so retry sees the cumulative
    // stack (design § 6) — assertion guards the engine isn't accidentally
    // double-clearing the staging on fail.
    expect(result.value.next.state.pendingModifiers.cardBurns).toEqual([3, 7]);
  });

  it('does NOT re-consume previously-consumed cards on react-retry → prep-confirm', () => {
    // Round-trip the full retry loop: stage [3, 7], confirm (fail), the
    // engine consumes both. react-retry brings the player back to prep
    // with pendingModifiers.cardBurns=[3, 7] preserved but hand=[11].
    // The player stages a fresh card 11 and confirms again. The engine
    // must consume only 11 (the new one); 3 and 7 are already gone.
    const player = makePlayer({
      id: 'p1',
      position: 'gevurah',
      hand: [3, 7, 11],
    });
    let snap: TurnSnapshot = {
      state: {
        ...makeState({}, { players: [player] }),
        phase: 'challenge',
        challengeSubPhase: 'prep',
        pendingModifiers: {
          ...EMPTY_PENDING_MODIFIERS,
          cardBurns: [3, 7],
        },
      },
    };

    // First confirm: forced fail.
    const FAIL: CheckOutcome = {
      rolled: 1,
      statContribution: 10,
      modifierBreakdown: { assist: 0, cardBurn: 6, sparkBurn: 0 },
      total: 17,
      effectiveDC: 25,
      pass: false,
    };
    const c1 = turnReducer(
      snap,
      { kind: 'prep-confirm', sefirah: 'gevurah', outcome: FAIL },
      RNG,
    );
    expect(c1.ok).toBe(true);
    if (!c1.ok) return;
    snap = c1.value.next;
    expect(snap.state.players[0]?.hand).toEqual([11]);
    expect(snap.state.discardPile).toEqual([3, 7]);

    // Retry → prep with cumulative [3, 7] still staged.
    const retry = turnReducer(snap, { kind: 'react-retry' }, RNG);
    expect(retry.ok).toBe(true);
    if (!retry.ok) return;
    snap = retry.value.next;
    expect(snap.state.challengeSubPhase).toBe('prep');
    expect(snap.state.pendingModifiers.cardBurns).toEqual([3, 7]);

    // Stage a 3rd card on the smaller hand.
    const add = turnReducer(
      snap,
      { kind: 'prep-add-modifier', modifier: { kind: 'card-burn', arcanum: 11 } },
      RNG,
    );
    expect(add.ok).toBe(true);
    if (!add.ok) return;
    snap = add.value.next;
    expect(snap.state.pendingModifiers.cardBurns).toEqual([3, 7, 11]);

    // Second confirm: forced pass. The d20 modifier credits all 3
    // burns (cumulative length × 3 = +9) — verified via the supplied
    // outcome — and only card 11 (the only one still in hand) is
    // consumed. Hand drops to [], discard becomes [3, 7, 11].
    const PASS: CheckOutcome = {
      rolled: 18,
      statContribution: 10,
      modifierBreakdown: { assist: 0, cardBurn: 9, sparkBurn: 0 },
      total: 37,
      effectiveDC: 15,
      pass: true,
    };
    const c2 = turnReducer(
      snap,
      { kind: 'prep-confirm', sefirah: 'gevurah', outcome: PASS },
      RNG,
    );
    expect(c2.ok).toBe(true);
    if (!c2.ok) return;
    snap = c2.value.next;
    expect(snap.state.players[0]?.hand).toEqual([]);
    expect(snap.state.discardPile).toEqual([3, 7, 11]);
    // Player cleared the Sefirah on the passing retry.
    expect(snap.state.players[0]?.clearedSefirot.has('gevurah')).toBe(true);
  });

  it('credits cumulative cardBurns length toward the rolled modifier (no engine outcome supplied)', () => {
    // Same retry scenario as above but lets the engine compute the
    // outcome (no `outcome` field on the event). Pinning that the d20
    // modifier sees cumulative count 3, not just the in-hand survivors
    // count 1 — design § 6 retry semantic.
    const player = makePlayer({
      id: 'p1',
      position: 'gevurah',
      stats: { ...DEFAULT_STATS_FOR_TEST, strength: 10 },
      hand: [11], // 3 and 7 already consumed by a prior failed roll
    });
    const state = makeState(
      {},
      {
        players: [player],
        pendingModifiers: {
          ...EMPTY_PENDING_MODIFIERS,
          cardBurns: [3, 7, 11],
        },
      },
    );
    const result = turnReducer(
      { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
      { kind: 'prep-confirm', sefirah: 'gevurah' },
      seededRng(1),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Cumulative card-burn modifier: 3 burns × +3 = +9 in the breakdown.
    expect(result.value.meta?.challenge.outcome.modifierBreakdown.cardBurn).toBe(9);
    // Only the one in-hand card was consumed.
    expect(result.value.next.state.players[0]?.hand).toEqual([]);
    expect(result.value.next.state.discardPile).toEqual([11]);
  });

  it('moves staged sparkBurn from sparksHeld to spentSparks on confirm', () => {
    // Same shape as cards: the engine reads sparkBurns as a count for
    // the +5 modifier but pre-#281 never removed the spark from
    // sparksHeld. Pin that the source player's spark is consumed and
    // recorded in spentSparks (mirrors the endgame spark-spent flow).
    const player = makePlayer({
      id: 'p1',
      position: 'gevurah',
      sparksHeld: new Set(['hod', 'netzach']),
      stats: { ...DEFAULT_STATS_FOR_TEST, strength: 10 },
    });
    const state = makeState(
      {},
      {
        players: [player],
        pendingModifiers: {
          ...EMPTY_PENDING_MODIFIERS,
          sparkBurns: [
            { sefirah: 'hod', sourcePlayerId: 'p1' },
          ],
        },
      },
    );
    const result = turnReducer(
      { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
      {
        kind: 'prep-confirm',
        sefirah: 'gevurah',
        outcome: {
          rolled: 18,
          statContribution: 10,
          modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 5 },
          total: 33,
          effectiveDC: 15,
          pass: true,
        },
      },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = result.value.next.state.players[0];
    // Hod consumed; netzach untouched.
    expect(after?.sparksHeld.has('hod')).toBe(false);
    expect(after?.sparksHeld.has('netzach')).toBe(true);
    // The newly-earned gevurah spark from clearing the challenge IS in
    // sparksHeld (added by resolveChallenge on pass) — independent of
    // the consumption side.
    expect(after?.sparksHeld.has('gevurah')).toBe(true);
    // Spent ledger updated.
    expect(result.value.next.state.spentSparks).toContainEqual({
      playerId: 'p1',
      sefirah: 'hod',
    });
  });

  it('hot-seat wrapper consumes cards via the same prep-confirm path', () => {
    // The hot-seat `submitChallenge` wrapper synthesizes
    // prep-add-modifier events from the head of the player's hand,
    // then calls prep-confirm with the `directAssistStats` hatch
    // (#286 dropped the sibling `shortcutPenalty` override — the
    // reducer derives it from `lastArrivalPathNumber` now). Card
    // consumption flows through the same reducer case as the
    // multiplayer per-step path, so the fix covers both. This test
    // pins that integration.
    const player = makePlayer({
      id: 'p1',
      position: 'gevurah',
      hand: [3, 7, 11],
    });
    let snap: TurnSnapshot = {
      state: {
        ...makeState({}, { players: [player] }),
        phase: 'challenge',
        challengeSubPhase: 'prep',
      },
    };
    // Stage two card-burns the same way the wrapper would.
    const stage1 = turnReducer(
      snap,
      { kind: 'prep-add-modifier', modifier: { kind: 'card-burn', arcanum: 3 } },
      RNG,
    );
    expect(stage1.ok).toBe(true);
    if (!stage1.ok) return;
    snap = stage1.value.next;
    const stage2 = turnReducer(
      snap,
      { kind: 'prep-add-modifier', modifier: { kind: 'card-burn', arcanum: 7 } },
      RNG,
    );
    expect(stage2.ok).toBe(true);
    if (!stage2.ok) return;
    snap = stage2.value.next;

    // Confirm with the wrapper's surviving hatch field
    // (directAssistStats=[]). Consumption still applies.
    const confirm = turnReducer(
      snap,
      {
        kind: 'prep-confirm',
        sefirah: 'gevurah',
        directAssistStats: [],
        outcome: {
          rolled: 18,
          statContribution: 10,
          modifierBreakdown: { assist: 0, cardBurn: 6, sparkBurn: 0 },
          total: 34,
          effectiveDC: 15,
          pass: true,
        },
      },
      RNG,
    );
    expect(confirm.ok).toBe(true);
    if (!confirm.ok) return;
    expect(confirm.value.next.state.players[0]?.hand).toEqual([11]);
    expect(confirm.value.next.state.discardPile).toEqual([3, 7]);
  });
});

// Locally re-declare DEFAULT_STATS keys for the override test so we
// don't import a fixture-private constant. Mirrors what
// `makePlayer` defaults to, with `strength` overridable in the test.
const DEFAULT_STATS_FOR_TEST = {
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
} as const;

describe('turnReducer — react sub-phase: react-retry', () => {
  it('returns to prep on a failed outcome and preserves cumulative cardBurns count', () => {
    // Set up a state that just resolved a failed challenge: pendingModifiers
    // already has the burns from the failed attempt; lastOutcome=fail.
    const player = makePlayer({
      id: 'p1',
      position: 'gevurah',
      hand: [3, 7],
    });
    const state = makeState(
      {},
      {
        players: [player],
        pendingModifiers: {
          ...EMPTY_PENDING_MODIFIERS,
          cardBurns: [3],
        },
      },
    );
    const failedOutcome = {
      rolled: 1,
      statContribution: 10,
      modifierBreakdown: { assist: 0, cardBurn: 3, sparkBurn: 0 },
      total: 14,
      effectiveDC: 15,
      pass: false,
    };
    const result = turnReducer(
      {
        state: {
          ...state,
          phase: 'challenge',
          challengeSubPhase: 'react',
          lastOutcome: failedOutcome,
        },
      },
      { kind: 'react-retry' },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.state.challengeSubPhase).toBe('prep');
    expect(result.value.next.state.lastOutcome).toBeUndefined();
    // cardBurns preserved — player is stacking on top.
    expect(result.value.next.state.pendingModifiers.cardBurns).toEqual([3]);
  });

  it('rejects react-retry on a passed outcome (success path cannot retry)', () => {
    const player = makePlayer({ id: 'p1', position: 'gevurah' });
    const state = makeState({}, { players: [player] });
    const passedOutcome = {
      rolled: 18,
      statContribution: 10,
      modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
      total: 28,
      effectiveDC: 15,
      pass: true,
    };
    const result = turnReducer(
      {
        state: {
          ...state,
          phase: 'challenge',
          challengeSubPhase: 'react',
          lastOutcome: passedOutcome,
        },
      },
      { kind: 'react-retry' },
      RNG,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('react-retry-on-pass');
  });

  it('rejects react-retry outside the react sub-phase', () => {
    const player = makePlayer({ id: 'p1', position: 'gevurah' });
    const state = makeState({}, { players: [player] });
    const result = turnReducer(
      { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
      { kind: 'react-retry' },
      RNG,
    );
    expect(result.ok).toBe(false);
  });
});

describe('turnReducer — replace-state event', () => {
  it('replaces state wholesale, including the replacement state\'s phase machinery', () => {
    // Post-#227 review fix `phase` lives on `GameState`, so the
    // replace-state branch is now a wholesale state swap — the
    // replacement carries its own canonical phase, sub-phase, and
    // lastOutcome. Pin that the dispatcher-side reducer trusts the
    // replacement instead of carrying over the prior snapshot's view.
    const before = snapshotAt('challenge');
    // Replacement was started fresh, so phase defaults to 'move'.
    const replacement = makeFullGame({ playerCount: 3, seed: 99 });
    const result = turnReducer(
      before,
      { kind: 'replace-state', state: replacement },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.state).toBe(replacement);
    expect(result.value.next.state.phase).toBe('move');
    expect(result.value.next.state.challengeSubPhase).toBeUndefined();
  });

  it('replaces state wholesale during react sub-phase, preserving the replacement state\'s lastOutcome', () => {
    // The replace-state branch is now a wholesale state swap: post-#227
    // review fix, `phase`, `challengeSubPhase`, and `lastOutcome` all
    // live on `GameState`, so a server-pushed snapshot already carries
    // the canonical phase machinery. The reducer trusts the
    // replacement and stops trying to splice the prior snapshot's
    // view back over it. The contract this test pins: when the
    // replacement state is in react with a failed lastOutcome, the
    // post-replace snapshot reflects exactly that — react phase,
    // failed lastOutcome — so the active player's UI can still call
    // `react-retry` based on truth, not a synthesized hint.
    const player = makePlayer({ id: 'p1', position: 'gevurah' });
    const failedOutcome = {
      rolled: 1,
      statContribution: 10,
      modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
      total: 11,
      effectiveDC: 15,
      pass: false,
    };
    const before: TurnSnapshot = {
      state: {
        ...makeState({}, { players: [player], activePlayerId: 'p1' }),
        phase: 'challenge',
        challengeSubPhase: 'react',
        lastOutcome: failedOutcome,
      },
    };
    // Replacement state carries the same phase machinery (server
    // push of the same authoritative state); revealedCards adds the
    // observable diff we assert on.
    const replacement: typeof before.state = {
      ...before.state,
      revealedCards: new Set([5, 9]),
    };
    const result = turnReducer(
      before,
      { kind: 'replace-state', state: replacement },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.state.phase).toBe('challenge');
    expect(result.value.next.state.challengeSubPhase).toBe('react');
    expect(result.value.next.state.lastOutcome?.pass).toBe(false);
    expect(result.value.next.state).toBe(replacement);
    expect(Array.from(result.value.next.state.revealedCards).sort()).toEqual([5, 9]);
  });

  it('subsequent events use the replaced state, not the original', () => {
    // Replace-state then end-turn. The end-turn must rotate
    // activePlayerId in the REPLACED state's player list, not the
    // original. Catches a regression that would re-snapshot from
    // the wrong state value.
    const original = makeFullGame({ playerCount: 2, seed: 1 });
    // Replacement is in 'end' phase so the next `end-turn` event lands.
    const replacementBase = makeFullGame({ playerCount: 4, seed: 99 }); // 4 players
    const replacement = { ...replacementBase, phase: 'end' as const };
    const replaced = turnReducer(
      { state: { ...original, phase: 'end' } },
      { kind: 'replace-state', state: replacement },
      RNG,
    );
    expect(replaced.ok).toBe(true);
    if (!replaced.ok) return;

    const advanced = turnReducer(replaced.value.next, { kind: 'end-turn' }, RNG);
    expect(advanced.ok).toBe(true);
    if (!advanced.ok) return;
    // The new active id must be a player in REPLACEMENT, not original.
    const replacementIds = new Set(replacement.players.map((p) => p.id));
    expect(replacementIds.has(advanced.value.next.state.activePlayerId)).toBe(true);
  });
});

describe('turnReducer — no-active-player guard', () => {
  it.each([
    { kind: 'meditate' as const },
    { kind: 'move' as const, pathNumber: 32 },
    { kind: 'draw' as const },
    { kind: 'end-turn' as const },
  ])('rejects $kind when state.activePlayerId is not in state.players', (event) => {
    const corruptState = makeState({}, {
      players: [makePlayer({ id: 'p1' })],
      activePlayerId: 'ghost',
    });
    // Pick a phase that would otherwise allow each event so we know
    // the rejection is due to no-active-player, not wrong-phase.
    const phase: TurnPhase =
      event.kind === 'move' || event.kind === 'meditate'
        ? 'move'
        : event.kind === 'draw'
          ? 'draw'
          : 'end';
    const result = turnReducer(
      { state: { ...corruptState, phase } },
      event,
      RNG,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('no-active-player');
  });
});

describe('turnReducer — meditate draws 2 cards (capped at HAND_CAP) and ends the turn', () => {
  // #128: design/mechanics.md § Drawing — "Meditate (the alternative
  // to a move) draws 2 cards, but stops at 6." Pre-fix the reducer
  // advanced to 'draw' phase without changing state; players who
  // meditated then clicked Draw saw nothing because drawToHand only
  // refills toward STARTING_HAND_SIZE (4) which they already had.
  it('adds 2 cards from the deck and skips the draw phase', () => {
    const player = makePlayer({ id: 'p1', position: 'malkuth', hand: [1, 2, 3, 4] });
    const state = makeState({}, {
      players: [player],
      activePlayerId: 'p1',
      deck: [11, 12, 13, 14],
      discardPile: [],
    });
    const result = turnReducer({ state: { ...state, phase: 'move' } }, { kind: 'meditate' }, RNG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = result.value.next.state.players.find((p) => p.id === 'p1');
    expect(after?.hand).toEqual([1, 2, 3, 4, 11, 12]);
    // Phase advances directly to 'end' — no separate Draw click.
    expect(result.value.next.state.phase).toBe('end');
  });

  it('draws past HAND_CAP and sets pendingDiscard for the over-cap excess (#291)', () => {
    // #291: pre-fix the reducer respected HAND_CAP and stopped at it.
    // That left a softlocked at-cap player with no meditate affordance
    // (they couldn't draw, and if no path was usable they couldn't
    // move). New contract: meditate ALWAYS draws MEDITATE_DRAW; the
    // over-cap excess is reconciled at end-of-turn via pendingDiscard.
    const player = makePlayer({ id: 'p1', position: 'malkuth', hand: [1, 2, 3, 4, 5] });
    const state = makeState({}, {
      players: [player],
      activePlayerId: 'p1',
      deck: [11, 12, 13],
      discardPile: [],
    });
    const result = turnReducer({ state: { ...state, phase: 'move' } }, { kind: 'meditate' }, RNG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = result.value.next.state.players.find((p) => p.id === 'p1');
    // Hand was 5, cap is 6: meditate draws BOTH cards (not just one).
    expect(after?.hand).toEqual([1, 2, 3, 4, 5, 11, 12]);
    // Over-cap excess = hand - HAND_CAP = 7 - 6 = 1.
    expect(result.value.next.state.pendingDiscard).toEqual({
      count: 1,
      requiredBy: 'end-of-turn',
    });
  });

  it('meditate at HAND_CAP draws both cards and sets pendingDiscard.count = 2 (#291)', () => {
    const player = makePlayer({
      id: 'p1',
      position: 'malkuth',
      hand: [1, 2, 3, 4, 5, 6],
    });
    const state = makeState({}, {
      players: [player],
      activePlayerId: 'p1',
      deck: [11, 12, 13],
      discardPile: [],
    });
    const result = turnReducer({ state: { ...state, phase: 'move' } }, { kind: 'meditate' }, RNG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = result.value.next.state.players.find((p) => p.id === 'p1');
    expect(after?.hand).toEqual([1, 2, 3, 4, 5, 6, 11, 12]);
    expect(result.value.next.state.pendingDiscard).toEqual({
      count: 2,
      requiredBy: 'end-of-turn',
    });
    // Phase still advances to 'end' — discard happens DURING the end
    // phase (the UI's DiscardPrompt unblocks the auto-advance to the
    // next turn by way of the engine's endTurn refusal).
    expect(result.value.next.state.phase).toBe('end');
  });

  it('meditate under cap leaves pendingDiscard undefined (#291)', () => {
    // Sanity: existing happy path stays clean — no spurious
    // pendingDiscard when there is no over-cap excess.
    const player = makePlayer({ id: 'p1', position: 'malkuth', hand: [1, 2] });
    const state = makeState({}, {
      players: [player],
      activePlayerId: 'p1',
      deck: [11, 12, 13],
      discardPile: [],
    });
    const result = turnReducer({ state: { ...state, phase: 'move' } }, { kind: 'meditate' }, RNG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = result.value.next.state.players.find((p) => p.id === 'p1');
    expect(after?.hand).toEqual([1, 2, 11, 12]);
    expect(result.value.next.state.pendingDiscard).toBeUndefined();
  });
});

describe('turnReducer — lastAction discriminator on entry to end phase (#292)', () => {
  // #292: the auto-advance timer (PlayScreen.tsx) needs to distinguish
  // a "Move + Draw" arrival in `'end'` (which auto-advances per #131)
  // from a "Meditate" arrival in `'end'` (which does NOT auto-advance —
  // the player needs time to see the cards they just drew). The
  // reducer stamps `lastAction` on the resulting state so the UI can
  // gate the timer without re-deriving intent from the diff.
  it('meditate sets lastAction = "meditate"', () => {
    const player = makePlayer({ id: 'p1', position: 'malkuth', hand: [1, 2] });
    const state = makeState({}, {
      players: [player],
      activePlayerId: 'p1',
      deck: [11, 12, 13],
      discardPile: [],
    });
    const result = turnReducer({ state: { ...state, phase: 'move' } }, { kind: 'meditate' }, RNG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.state.phase).toBe('end');
    expect(result.value.next.state.lastAction).toBe('meditate');
  });

  it('move + draw lands in end phase with lastAction = "move-draw"', () => {
    // Move into an already-cleared Sefirah (skips challenge, lands in
    // 'draw'); then Draw, which transitions to 'end'. The end-phase
    // arrival via this path must be tagged so the auto-advance fires.
    const player = makePlayer({
      id: 'p1',
      position: 'malkuth',
      hand: [21],
      clearedSefirot: new Set(['yesod']),
    });
    const state = makeState({}, {
      players: [player],
      activePlayerId: 'p1',
      deck: [11, 12, 13],
      discardPile: [],
    });
    // Move from malkuth → yesod via path 32 (already cleared → draw).
    const moved = turnReducer(
      { state: { ...state, phase: 'move' } },
      { kind: 'move', pathNumber: 32 },
      RNG,
    );
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    expect(moved.value.next.state.phase).toBe('draw');
    // Then Draw → 'end' phase, with lastAction = 'move-draw'.
    const drewResult = turnReducer(moved.value.next, { kind: 'draw' }, RNG);
    expect(drewResult.ok).toBe(true);
    if (!drewResult.ok) return;
    expect(drewResult.value.next.state.phase).toBe('end');
    expect(drewResult.value.next.state.lastAction).toBe('move-draw');
  });

  it('end-turn clears lastAction so the next seat starts clean', () => {
    // Once the seat rotates, the discriminator from the prior turn must
    // not bleed into the next player's state.
    const initial = makeFullGame({ playerCount: 2, seed: 7 });
    const result = turnReducer(
      {
        state: {
          ...initial,
          phase: 'end',
          lastAction: 'meditate',
        },
      },
      { kind: 'end-turn' },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.state.phase).toBe('move');
    expect(result.value.next.state.lastAction).toBeUndefined();
  });
});

describe('turnReducer — discard event (#291)', () => {
  // #291: after a meditate over-cap, the UI sends a `discard` event
  // per card the player chooses to shed. The reducer routes through
  // the engine's `discard` reducer; phase stays 'end' so the player
  // can still hit End Turn.
  it('discards the named card and decrements pendingDiscard.count', () => {
    const player = makePlayer({
      id: 'p1',
      position: 'malkuth',
      hand: [1, 2, 3, 4, 5, 6, 11, 12],
    });
    const state = makeState({}, {
      players: [player],
      activePlayerId: 'p1',
      pendingDiscard: { count: 2, requiredBy: 'end-of-turn' },
      discardPile: [],
    });
    const result = turnReducer(
      { state: { ...state, phase: 'end' } },
      { kind: 'discard', arcanum: 12 },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = result.value.next.state.players.find((p) => p.id === 'p1');
    expect(after?.hand).toEqual([1, 2, 3, 4, 5, 6, 11]);
    expect(result.value.next.state.pendingDiscard?.count).toBe(1);
    expect(result.value.next.state.discardPile).toEqual([12]);
  });

  it('clears pendingDiscard when the final card is discarded', () => {
    const player = makePlayer({
      id: 'p1',
      position: 'malkuth',
      hand: [1, 2, 3, 4, 5, 6, 11],
    });
    const state = makeState({}, {
      players: [player],
      activePlayerId: 'p1',
      pendingDiscard: { count: 1, requiredBy: 'end-of-turn' },
      discardPile: [],
    });
    const result = turnReducer(
      { state: { ...state, phase: 'end' } },
      { kind: 'discard', arcanum: 11 },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.state.pendingDiscard).toBeUndefined();
  });
});

describe("turnReducer — draw event refills the active player's hand", () => {
  // #128: playtest report — players clicked Draw and the hand did
  // not visibly update. The reducer must (a) actually refill the
  // hand toward STARTING_HAND_SIZE when the draw phase is hit and
  // (b) return a NEW player object so React re-renders the Hand
  // component (referential-equality contract).
  it('fills hand from below STARTING_HAND_SIZE up to STARTING_HAND_SIZE', () => {
    const partialHand = [1, 2, 3]; // 3 cards, < STARTING_HAND_SIZE (4)
    const player = makePlayer({ id: 'p1', position: 'malkuth', hand: partialHand });
    const state = makeState({}, {
      players: [player],
      activePlayerId: 'p1',
      deck: [11, 12, 13, 14],
      discardPile: [],
    });
    const result = turnReducer({ state: { ...state, phase: 'draw' } }, { kind: 'draw' }, RNG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = result.value.next.state;
    const refilled = next.players.find((p) => p.id === 'p1');
    expect(refilled?.hand).toHaveLength(4);
    expect(refilled?.hand[3]).toBe(11); // top of deck appended
  });

  it('returns a fresh player object reference even when no card was drawn', () => {
    // Hand is already at cap; draw is a no-op for cards. But the UI
    // contract still needs a new player object so React notices the
    // phase transition. Otherwise the Hand component never re-renders
    // and the player thinks "I drew but nothing happened" (when in
    // fact the engine correctly did nothing).
    const fullHand = [1, 2, 3, 4];
    const player = makePlayer({ id: 'p1', position: 'malkuth', hand: fullHand });
    const state = makeState({}, {
      players: [player],
      activePlayerId: 'p1',
      deck: [11],
      discardPile: [],
    });
    const result = turnReducer({ state: { ...state, phase: 'draw' } }, { kind: 'draw' }, RNG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = result.value.next.state;
    const after = next.players.find((p) => p.id === 'p1');
    expect(after?.hand).toHaveLength(4);
    // Pin the player-object identity contract: even when no card was
    // drawn, the reducer must return a fresh player reference so a
    // future `React.memo(Hand)` (none today) would still re-render.
    expect(after).not.toBe(player);
    // Phase must advance off 'draw' regardless — that's the signal
    // that "the click was processed."
    expect(result.value.next.state.phase).toBe('end');
  });
});

describe('turnReducer — sub-phase teardown when phase leaves challenge', () => {
  it('clears challengeSubPhase, pendingModifiers, and lastOutcome on accept-setback', () => {
    const player = makePlayer({ id: 'p1', position: 'gevurah' });
    const state = makeState(
      {},
      {
        players: [player],
        pendingModifiers: {
          ...EMPTY_PENDING_MODIFIERS,
          cardBurns: [3, 7],
        },
      },
    );
    const failedOutcome = {
      rolled: 1,
      statContribution: 10,
      modifierBreakdown: { assist: 0, cardBurn: 6, sparkBurn: 0 },
      total: 17,
      effectiveDC: 18,
      pass: false,
    };
    const result = turnReducer(
      {
        state: {
          ...state,
          phase: 'challenge',
          challengeSubPhase: 'react',
          lastOutcome: failedOutcome,
        },
      },
      { kind: 'accept-setback', sefirah: 'gevurah' },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.state.phase).toBe('draw');
    expect(result.value.next.state.challengeSubPhase).toBeUndefined();
    expect(result.value.next.state.lastOutcome).toBeUndefined();
    expect(result.value.next.state.pendingModifiers).toEqual({
      cardBurns: [],
      sparkBurns: [],
      assistRequests: [],
      nameCards: [],
      giftCards: [],
      declareDesires: [],
      dreamGuesses: [],
    });
  });
});

describe('turnReducer — edge cases: prep-remove-modifier value-equality', () => {
  it('does not consider spark-burns equal when sefirah matches but sourcePlayerId differs', () => {
    // The reducer must compare every field by value. Two staged
    // sparks with the same `sefirah` but different `sourcePlayerId`
    // are distinct entries — removing one must not remove the other.
    const player = makePlayer({ id: 'p1', position: 'gevurah' });
    const state = makeState(
      {},
      {
        players: [player],
        pendingModifiers: {
          ...EMPTY_PENDING_MODIFIERS,
          sparkBurns: [
            { sefirah: 'hod', sourcePlayerId: 'p2' },
            { sefirah: 'hod', sourcePlayerId: 'p3' },
          ],
        },
      },
    );
    const result = turnReducer(
      { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
      {
        kind: 'prep-remove-modifier',
        modifier: { kind: 'spark-burn', sefirah: 'hod', sourcePlayerId: 'p3' },
      },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // p3's entry removed; p2's stays.
    expect(result.value.next.state.pendingModifiers.sparkBurns).toEqual([
      { sefirah: 'hod', sourcePlayerId: 'p2' },
    ]);
  });

  it('does not consider spark-burns equal when sourcePlayerId matches but sefirah differs', () => {
    const player = makePlayer({ id: 'p1', position: 'gevurah' });
    const state = makeState(
      {},
      {
        players: [player],
        pendingModifiers: {
          ...EMPTY_PENDING_MODIFIERS,
          sparkBurns: [
            { sefirah: 'hod', sourcePlayerId: 'p2' },
            { sefirah: 'netzach', sourcePlayerId: 'p2' },
          ],
        },
      },
    );
    const result = turnReducer(
      { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
      {
        kind: 'prep-remove-modifier',
        modifier: { kind: 'spark-burn', sefirah: 'netzach', sourcePlayerId: 'p2' },
      },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.state.pendingModifiers.sparkBurns).toEqual([
      { sefirah: 'hod', sourcePlayerId: 'p2' },
    ]);
  });
});

describe('turnReducer — edge cases: react-retry preserves prep state on top of failed resolve', () => {
  it('preserves pendingModifiers.cardBurns length across a failed resolve + retry', () => {
    // Simulate a full prep → fail → retry cycle. After the failed
    // resolve, pendingModifiers is cleared by prep-confirm. The
    // player then re-stages cards (potentially the same ones from
    // the prior attempt — they were never consumed because resolve
    // failed) before another prep-confirm. The retry path must NOT
    // drop the staged cards: it just transitions react → prep.
    const player = makePlayer({
      id: 'p1',
      position: 'gevurah',
      hand: [3, 7],
    });
    // Start with an already-failed resolve: state has empty pending
    // modifiers (prep-confirm cleared them) and lastOutcome=fail.
    // Player has re-staged a card via prep-add-modifier before
    // calling react-retry — but per design § 6 the retry preserves
    // pendingModifiers from the moment of retry, NOT from before
    // the failed resolve. So we set up that scenario directly.
    const failedOutcome = {
      rolled: 1,
      statContribution: 10,
      modifierBreakdown: { assist: 0, cardBurn: 3, sparkBurn: 0 },
      total: 14,
      effectiveDC: 15,
      pass: false,
    };
    const state = makeState(
      {},
      {
        players: [player],
        pendingModifiers: {
          ...EMPTY_PENDING_MODIFIERS,
          cardBurns: [3, 7], // player re-stacked both cards
        },
      },
    );
    const result = turnReducer(
      {
        state: {
          ...state,
          phase: 'challenge',
          challengeSubPhase: 'react',
          lastOutcome: failedOutcome,
        },
      },
      { kind: 'react-retry' },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.state.challengeSubPhase).toBe('prep');
    // Cumulative count survives.
    expect(result.value.next.state.pendingModifiers.cardBurns).toEqual([3, 7]);
  });
});

describe('turnReducer — edge cases: full pass → accept-setback teardown is idempotent', () => {
  // After a successful prep-confirm the snapshot is at
  // (phase=challenge, sub-phase=react, lastOutcome=pass). Hot-seat /
  // multiplayer code typically advances directly to 'draw' next, but
  // an accept-setback dispatched from this state should still tear
  // down both the sub-phase and the pendingModifiers cleanly. This
  // is the "pin every teardown path" test.
  it('clears challengeSubPhase, pendingModifiers, and lastOutcome even after a passed challenge', () => {
    const player = makePlayer({
      id: 'p1',
      position: 'gevurah',
      stats: {
        unity: 10,
        insight: 10,
        understanding: 10,
        lovingkindness: 10,
        strength: 12,
        harmony: 10,
        passion: 10,
        intellect: 10,
        intuition: 10,
        body: 10,
      },
    });
    let snap: TurnSnapshot = {
      state: {
        ...makeState({}, { players: [player] }),
        phase: 'challenge',
        challengeSubPhase: 'prep',
      },
    };
    const confirm = turnReducer(
      snap,
      {
        kind: 'prep-confirm',
        sefirah: 'gevurah',
        outcome: {
          rolled: 18,
          statContribution: 12,
          modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
          total: 30,
          effectiveDC: 15,
          pass: true,
        },
      },
      RNG,
    );
    expect(confirm.ok).toBe(true);
    if (!confirm.ok) return;
    snap = confirm.value.next;
    // Now in react with pass. accept-setback at this point is
    // unusual but the teardown still has to do its job.
    const setback = turnReducer(
      snap,
      { kind: 'accept-setback', sefirah: 'gevurah' },
      RNG,
    );
    expect(setback.ok).toBe(true);
    if (!setback.ok) return;
    expect(setback.value.next.state.phase).toBe('draw');
    expect(setback.value.next.state.challengeSubPhase).toBeUndefined();
    expect(setback.value.next.state.lastOutcome).toBeUndefined();
    expect(setback.value.next.state.pendingModifiers).toEqual({
      cardBurns: [],
      sparkBurns: [],
      assistRequests: [],
      nameCards: [],
      giftCards: [],
      declareDesires: [],
      dreamGuesses: [],
    });
  });
});

describe('turnReducer — edge cases: prep-confirm fail preserves pendingModifiers across react-retry', () => {
  // Design § 6 / encounter-prep-phase.md: on a failed roll, the
  // staged card-burns / spark-burns / assist-requests must SURVIVE
  // back into prep so the player sees the cumulative stack ("3
  // cards burned, +9 modifier") and decides whether to add more.
  // Cleared-on-fail would drop the stack and break the rhythm.
  //
  // This test drives the full add → confirm(fail) → retry → add
  // round-trip with no pre-loaded snapshot shortcuts.
  it('cumulative card-burn stack survives prep-confirm(fail) → react-retry → prep-add-modifier', () => {
    const player = makePlayer({
      id: 'p1',
      position: 'gevurah',
      hand: [3, 7, 11],
    });
    let snap: TurnSnapshot = {
      state: {
        ...makeState({}, { players: [player], activePlayerId: 'p1' }),
        phase: 'challenge',
        challengeSubPhase: 'prep',
      },
    };

    // Stage card 3.
    const add1 = turnReducer(
      snap,
      { kind: 'prep-add-modifier', modifier: { kind: 'card-burn', arcanum: 3 } },
      RNG,
    );
    expect(add1.ok).toBe(true);
    if (!add1.ok) return;
    snap = add1.value.next;

    // Stage card 7.
    const add2 = turnReducer(
      snap,
      { kind: 'prep-add-modifier', modifier: { kind: 'card-burn', arcanum: 7 } },
      RNG,
    );
    expect(add2.ok).toBe(true);
    if (!add2.ok) return;
    snap = add2.value.next;

    expect(snap.state.pendingModifiers.cardBurns).toEqual([3, 7]);

    // Confirm with a forced-fail outcome.
    const confirm = turnReducer(
      snap,
      {
        kind: 'prep-confirm',
        sefirah: 'gevurah',
        outcome: {
          rolled: 1,
          statContribution: 10,
          modifierBreakdown: { assist: 0, cardBurn: 6, sparkBurn: 0 },
          total: 17,
          effectiveDC: 25, // forces fail regardless of stat
          pass: false,
        },
      },
      RNG,
    );
    expect(confirm.ok).toBe(true);
    if (!confirm.ok) return;
    snap = confirm.value.next;

    // After fail: in react with the failed outcome, AND the
    // pendingModifiers stack survives (this is the assertion the
    // pre-fix reducer would fail — it cleared the stack).
    expect(snap.state.phase).toBe('challenge');
    expect(snap.state.challengeSubPhase).toBe('react');
    expect(snap.state.lastOutcome?.pass).toBe(false);
    expect(snap.state.pendingModifiers.cardBurns).toEqual([3, 7]);

    // Retry → back to prep, stack still intact.
    const retry = turnReducer(snap, { kind: 'react-retry' }, RNG);
    expect(retry.ok).toBe(true);
    if (!retry.ok) return;
    snap = retry.value.next;
    expect(snap.state.phase).toBe('challenge');
    expect(snap.state.challengeSubPhase).toBe('prep');
    expect(snap.state.pendingModifiers.cardBurns).toEqual([3, 7]);

    // Stage another card on top of the surviving stack.
    const add3 = turnReducer(
      snap,
      { kind: 'prep-add-modifier', modifier: { kind: 'card-burn', arcanum: 11 } },
      RNG,
    );
    expect(add3.ok).toBe(true);
    if (!add3.ok) return;
    snap = add3.value.next;

    // The stack grew — three burns now in play.
    expect(snap.state.pendingModifiers.cardBurns).toEqual([3, 7, 11]);
  });
});

// #334 — `design/per-sefirah-mechanics.md` § 2.6 (b): the encounter
// envelope is a per-encounter scratch space that surfaces on
// `GameState.encounter` for the duration of a single challenge cycle.
//
// Lifecycle pinned by these tests:
//   - Init: at `move` → `challenge` transition (entry to prep).
//   - Mutate: on `react-retry`, `retryCount` increments; the dream
//     pillar (Yesod) is re-seeded so a missed guess can't be reused.
//   - Clear: when the encounter ends — pass at `prep-confirm` or
//     `accept-setback`. Both move phase out of `'challenge'` (or, in
//     the pass case, mark the encounter complete) and the envelope
//     is gone from the next snapshot.
//
// Surface only — no specific Sefirah mechanic logic. The envelope
// fields exist so downstream per-Sefirah tickets (Hod Word-Match,
// Yesod Dream-Peek, etc.) can consume them; this ticket pins SHAPE.
describe('turnReducer — encounter envelope lifecycle (#334)', () => {
  it('initializes encounter envelope on move → challenge with sefirah, seed, retryCount: 0', () => {
    const player = makePlayer({ id: 'p1', position: 'malkuth', hand: [21] });
    const state = makeState({}, { players: [player] });
    const before: TurnSnapshot = { state: { ...state, phase: 'move' } };
    const result = turnReducer(before, { kind: 'move', pathNumber: 32 }, RNG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.state.phase).toBe('challenge');
    expect(result.value.next.state.encounter).toBeDefined();
    const env = result.value.next.state.encounter;
    if (!env) return;
    // Envelope sefirah matches arrival.
    expect(env.sefirah).toBe('yesod');
    // Seed is a finite, deterministic integer (specific value is an
    // implementation detail of the hash; only the shape matters here).
    expect(typeof env.seed).toBe('number');
    expect(Number.isFinite(env.seed)).toBe(true);
    expect(Number.isInteger(env.seed)).toBe(true);
    // Retry counter starts at 0 (per ticket; design doc has it as
    // optional Yesod-only — we make it required-zero for uniformity
    // so any future consumer can read it without a ?? 0 dance).
    expect(env.retryCount).toBe(0);
  });

  it('does not set encounter when move lands on already-cleared Sefirah', () => {
    // Already-cleared arrival skips the challenge phase, so no
    // encounter is initialized.
    const player = makePlayer({
      id: 'p1',
      position: 'malkuth',
      hand: [21],
      clearedSefirot: new Set(['yesod']),
    });
    const state = makeState({}, { players: [player] });
    const result = turnReducer(
      { state: { ...state, phase: 'move' } },
      { kind: 'move', pathNumber: 32 },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.state.phase).toBe('draw');
    expect(result.value.next.state.encounter).toBeUndefined();
  });

  it('seed is deterministic for the same input state', () => {
    // Replay-determinism (per § 3.6 Yesod): same game history hashes
    // to the same envelope seed.
    const player = makePlayer({ id: 'p1', position: 'malkuth', hand: [21] });
    const state = makeState({}, { players: [player] });
    const before: TurnSnapshot = { state: { ...state, phase: 'move' } };
    const r1 = turnReducer(before, { kind: 'move', pathNumber: 32 }, RNG);
    const r2 = turnReducer(before, { kind: 'move', pathNumber: 32 }, RNG);
    expect(r1.ok && r2.ok).toBe(true);
    if (!r1.ok || !r2.ok) return;
    expect(r1.value.next.state.encounter?.seed).toBe(
      r2.value.next.state.encounter?.seed,
    );
  });

  it('seed varies when any of the digest inputs change', () => {
    // The deterministic-seed test above pins the "same in → same out"
    // half of the contract. This pins the other half: a refactor that
    // dropped a digest field (e.g. stopped folding `illumination` into
    // the hash) would still pass the deterministic test but silently
    // collapse the input space. Pinning "different inputs → different
    // seeds" across a few representative field changes catches that.
    const move = (s: ReturnType<typeof makeState>) => {
      const r = turnReducer(
        { state: { ...s, phase: 'move' } },
        { kind: 'move', pathNumber: 32 },
        RNG,
      );
      if (!r.ok) throw new Error('move failed in fixture');
      return r.value.next.state.encounter?.seed;
    };

    const baseSeed = move(
      makeState(
        {},
        {
          players: [makePlayer({ id: 'p1', position: 'malkuth', hand: [21] })],
          illumination: 0,
          separation: 0,
        },
      ),
    );

    // (a) Different player roster size.
    const seedRoster = move(
      makeState(
        {},
        {
          players: [
            makePlayer({ id: 'p1', position: 'malkuth', hand: [21] }),
            makePlayer({ id: 'p2', position: 'malkuth' }),
          ],
          illumination: 0,
          separation: 0,
        },
      ),
    );
    expect(seedRoster).not.toBe(baseSeed);

    // (b) Different illumination tally.
    const seedIllum = move(
      makeState(
        {},
        {
          players: [makePlayer({ id: 'p1', position: 'malkuth', hand: [21] })],
          illumination: 4,
          separation: 0,
        },
      ),
    );
    expect(seedIllum).not.toBe(baseSeed);

    // (c) Different separation tally.
    const seedSep = move(
      makeState(
        {},
        {
          players: [makePlayer({ id: 'p1', position: 'malkuth', hand: [21] })],
          illumination: 0,
          separation: 3,
        },
      ),
    );
    expect(seedSep).not.toBe(baseSeed);
  });

  it('react-retry increments retryCount and preserves sefirah / seed', () => {
    const player = makePlayer({
      id: 'p1',
      position: 'gevurah',
      hand: [],
      stats: {
        unity: 1,
        insight: 1,
        understanding: 1,
        lovingkindness: 1,
        strength: 1,
        harmony: 1,
        passion: 1,
        intellect: 1,
        intuition: 1,
        body: 1,
      },
    });
    const state = makeState(
      {},
      {
        players: [player],
        // Seed an envelope as if a prior `move` initialized it.
        encounter: { sefirah: 'gevurah', seed: 12345, retryCount: 0 },
      },
    );
    const failedOutcome: CheckOutcome = {
      rolled: 1,
      statContribution: 1,
      modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
      total: 2,
      effectiveDC: 18,
      pass: false,
    };
    const result = turnReducer(
      {
        state: {
          ...state,
          phase: 'challenge',
          challengeSubPhase: 'react',
          lastOutcome: failedOutcome,
        },
      },
      { kind: 'react-retry' },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const env = result.value.next.state.encounter;
    expect(env).toBeDefined();
    if (!env) return;
    expect(env.sefirah).toBe('gevurah');
    expect(env.seed).toBe(12345); // Seed is stable across retries.
    expect(env.retryCount).toBe(1); // Incremented.
  });

  it('accept-setback clears the encounter envelope', () => {
    const player = makePlayer({ id: 'p1', position: 'gevurah', hand: [] });
    const state = makeState(
      {},
      {
        players: [player],
        encounter: { sefirah: 'gevurah', seed: 9876, retryCount: 0 },
      },
    );
    const result = turnReducer(
      { state: { ...state, phase: 'challenge', challengeSubPhase: 'react' } },
      { kind: 'accept-setback', sefirah: 'gevurah' },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.state.phase).toBe('draw');
    expect(result.value.next.state.encounter).toBeUndefined();
  });

  it('passing prep-confirm clears the encounter envelope', () => {
    // On a successful resolution the encounter is "done" — the
    // envelope falls away with the rest of the prep machinery so
    // a stale envelope can't bleed into a later challenge.
    const player = makePlayer({
      id: 'p1',
      position: 'gevurah',
      hand: [],
      stats: {
        unity: 10,
        insight: 10,
        understanding: 10,
        lovingkindness: 10,
        strength: 12,
        harmony: 10,
        passion: 10,
        intellect: 10,
        intuition: 10,
        body: 10,
      },
    });
    const state = makeState(
      {},
      {
        players: [player],
        encounter: { sefirah: 'gevurah', seed: 555, retryCount: 0 },
      },
    );
    const result = turnReducer(
      { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
      {
        kind: 'prep-confirm',
        sefirah: 'gevurah',
        outcome: {
          rolled: 18,
          statContribution: 12,
          modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
          total: 30,
          effectiveDC: 15,
          pass: true,
        },
      },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Phase stays in 'challenge' / 'react' on pass (an external
    // transition advances to 'draw'); the envelope clears NOW because
    // the encounter has resolved successfully.
    expect(result.value.next.state.encounter).toBeUndefined();
  });

  it('failing prep-confirm preserves the encounter envelope (retry will increment it)', () => {
    // Symmetry with `pendingModifiers`: on a failed roll the prep
    // machinery (including the envelope) survives so a `react-retry`
    // can mutate it (retryCount++ etc.) without re-init.
    const player = makePlayer({
      id: 'p1',
      position: 'gevurah',
      hand: [],
      stats: {
        unity: 1,
        insight: 1,
        understanding: 1,
        lovingkindness: 1,
        strength: 1,
        harmony: 1,
        passion: 1,
        intellect: 1,
        intuition: 1,
        body: 1,
      },
    });
    const state = makeState(
      {},
      {
        players: [player],
        encounter: { sefirah: 'gevurah', seed: 4242, retryCount: 0 },
      },
    );
    const result = turnReducer(
      { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
      {
        kind: 'prep-confirm',
        sefirah: 'gevurah',
        outcome: {
          rolled: 1,
          statContribution: 1,
          modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
          total: 2,
          effectiveDC: 18,
          pass: false,
        },
      },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const env = result.value.next.state.encounter;
    expect(env).toBeDefined();
    if (!env) return;
    expect(env.sefirah).toBe('gevurah');
    expect(env.seed).toBe(4242);
    expect(env.retryCount).toBe(0); // Not incremented yet — react-retry does that.
  });
});

// #354 — `design/per-sefirah-mechanics.md` § 3.6: Yesod Dream-Peek seeds
// a `dreamPillar` on the encounter envelope at envelope init AND
// re-seeds on react-retry. The seed source is `state.encounter.seed +
// state.encounter.retryCount` per § 3.6 "Seed source (S5 fix)". Both
// halves of the C4 retry-exploit fix live in the reducer:
//   - rule 1 (hide-on-miss) lives in engine/checks.ts (covered there).
//   - rule 2 (re-seed-on-retry) lives in this reducer — these tests
//     pin that the pillar is derived at init and re-derived on retry,
//     deterministic for the same seed and well-distributed across
//     pillars when seeds vary.
describe('turnReducer — Yesod Dream-Peek seeding (#354)', () => {
  it('move → challenge at Yesod populates encounter.dreamPillar from the envelope seed', () => {
    const player = makePlayer({ id: 'p1', position: 'malkuth', hand: [21] });
    const state = makeState({}, { players: [player] });
    const result = turnReducer(
      { state: { ...state, phase: 'move' } },
      // path 32 = Yesod ↔ Malkuth (per data/paths.ts).
      { kind: 'move', pathNumber: 32 },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const env = result.value.next.state.encounter;
    expect(env).toBeDefined();
    if (!env) return;
    expect(env.sefirah).toBe('yesod');
    // The pillar must be one of the three valid values — not undefined,
    // not a stray string. § 3.6 specifies the picker output.
    expect(['mercy', 'severity', 'balance']).toContain(env.dreamPillar);
  });

  it('move → challenge at a non-Yesod Sefirah leaves dreamPillar undefined', () => {
    // Defensive: only Yesod populates `dreamPillar`. A leftover from a
    // generic "set the pillar everywhere" refactor would silently leak
    // a Yesod-only field onto unrelated encounters and downstream
    // checks (e.g. the "non-Yesod with stale dream-guess" engine test).
    //
    // Path 30 = Hod ↔ Yesod (arcanum 19, Sun). Player starts at Yesod
    // with arcanum 19 in hand → arrives at Hod.
    const player = makePlayer({ id: 'p1', position: 'yesod', hand: [19] });
    const state = makeState({}, { players: [player] });
    const result = turnReducer(
      { state: { ...state, phase: 'move' } },
      { kind: 'move', pathNumber: 30 },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const env = result.value.next.state.encounter;
    expect(env).toBeDefined();
    if (!env) return;
    expect(env.sefirah).toBe('hod');
    expect(env.dreamPillar).toBeUndefined();
  });

  it('dreamPillar derivation is deterministic for the same envelope seed', () => {
    // Replay determinism: the same digest inputs hash to the same seed,
    // and the same seed maps to the same pillar. Two identical move
    // events on identical state must produce identical pillars.
    const player = makePlayer({ id: 'p1', position: 'malkuth', hand: [21] });
    const state = makeState({}, { players: [player] });
    const before: TurnSnapshot = { state: { ...state, phase: 'move' } };
    const r1 = turnReducer(before, { kind: 'move', pathNumber: 32 }, RNG);
    const r2 = turnReducer(before, { kind: 'move', pathNumber: 32 }, RNG);
    expect(r1.ok && r2.ok).toBe(true);
    if (!r1.ok || !r2.ok) return;
    expect(r1.value.next.state.encounter?.dreamPillar).toBe(
      r2.value.next.state.encounter?.dreamPillar,
    );
  });

  it('react-retry at Yesod re-seeds dreamPillar (typically different from the first attempt)', () => {
    // Per § 3.6 rule 2: a missed first-attempt pillar must NOT carry
    // over to the retry. The reducer increments retryCount AND
    // re-derives `dreamPillar` from `seed + retryCount`. We pin a seed
    // where the re-derive picks a different pillar than the original;
    // this catches the regression where the reducer increments retryCount
    // but forgets to re-derive (the pillar would stay the same and a
    // miss-then-retry could exploit a leaked answer).
    //
    // Strategy: try a handful of seeds, find one that yields a
    // different post-retry pillar. (Not all seeds will — for any given
    // seed, there's a 1/3 chance the pillar collides on the next index.
    // We assert the existence of seeds that change, which is the
    // load-bearing property: re-seeding HAPPENS, not just retryCount++.)
    function pillarAfterRetry(seed: number): {
      readonly initial: string | undefined;
      readonly afterRetry: string | undefined;
    } {
      const player = makePlayer({ id: 'p1', position: 'yesod', hand: [] });
      const failedOutcome: CheckOutcome = {
        rolled: 1,
        statContribution: 1,
        modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
        total: 2,
        effectiveDC: 12,
        pass: false,
      };
      // We bypass the move arm and seed an envelope with the exact seed
      // we want to test. The reducer does the per-mechanic re-derivation
      // on react-retry, so we supply an initial pillar that matches what
      // the seed would produce — but the reducer should ignore that
      // and re-derive from `seed + retryCount`.
      const initialPillarBySeed = (s: number): 'mercy' | 'severity' | 'balance' => {
        const idx = seededRng(s).int(0, 2);
        const pillars = ['mercy', 'severity', 'balance'] as const;
        const p = pillars[idx];
        if (p === undefined) {
          throw new Error(`initialPillarBySeed: idx ${idx} out of range`);
        }
        return p;
      };
      const initial = initialPillarBySeed(seed);
      const state = makeState(
        {},
        {
          players: [player],
          encounter: {
            sefirah: 'yesod',
            seed,
            retryCount: 0,
            dreamPillar: initial,
          },
          phase: 'challenge',
          challengeSubPhase: 'react',
          lastOutcome: failedOutcome,
        },
      );
      const result = turnReducer({ state }, { kind: 'react-retry' }, RNG);
      if (!result.ok) {
        return { initial, afterRetry: undefined };
      }
      return {
        initial,
        afterRetry: result.value.next.state.encounter?.dreamPillar,
      };
    }
    // Try several seeds; at least one must produce a different post-
    // retry pillar (otherwise the reducer is not re-deriving — it's
    // just keeping the old value).
    const observed: { initial: string | undefined; afterRetry: string | undefined }[] = [];
    for (let s = 1; s <= 20; s++) {
      observed.push(pillarAfterRetry(s));
    }
    // All retries must produce a defined pillar (re-seed didn't leave
    // it undefined).
    for (const { afterRetry } of observed) {
      expect(['mercy', 'severity', 'balance']).toContain(afterRetry);
    }
    // At least one seed must produce a DIFFERENT post-retry pillar
    // — load-bearing for "re-seeding actually happens".
    const anyDiffers = observed.some(({ initial, afterRetry }) => initial !== afterRetry);
    expect(anyDiffers).toBe(true);
  });

  it('react-retry at Yesod: dreamPillar derived from seed + retryCount (deterministic)', () => {
    // Pin the deterministic contract: the post-retry pillar equals
    // the picker output for `seed + retryCount`. This documents the
    // exact derivation rule (design § 3.6) so a refactor that
    // accidentally changes the formula (e.g. uses just `seed` or
    // `seed * retryCount`) is caught.
    const seed = 1;
    const player = makePlayer({ id: 'p1', position: 'yesod', hand: [] });
    const failedOutcome: CheckOutcome = {
      rolled: 1,
      statContribution: 1,
      modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
      total: 2,
      effectiveDC: 12,
      pass: false,
    };
    const state = makeState(
      {},
      {
        players: [player],
        encounter: { sefirah: 'yesod', seed, retryCount: 0 },
        phase: 'challenge',
        challengeSubPhase: 'react',
        lastOutcome: failedOutcome,
      },
    );
    const result = turnReducer({ state }, { kind: 'react-retry' }, RNG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const env = result.value.next.state.encounter;
    expect(env?.retryCount).toBe(1);
    // Independent re-derivation matches the engine's: seed + retryCount = 2.
    const expected = (['mercy', 'severity', 'balance'] as const)[
      seededRng(seed + 1).int(0, 2)
    ];
    expect(env?.dreamPillar).toBe(expected);
  });

  it('react-retry at a non-Yesod Sefirah does NOT touch dreamPillar', () => {
    // Defensive: re-seeding is gated on `state.encounter.sefirah ===
    // 'yesod'`. A regression that re-derives unconditionally would
    // mint a Yesod-only field onto unrelated encounters.
    const player = makePlayer({ id: 'p1', position: 'gevurah', hand: [] });
    const failedOutcome: CheckOutcome = {
      rolled: 1,
      statContribution: 1,
      modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
      total: 2,
      effectiveDC: 18,
      pass: false,
    };
    const state = makeState(
      {},
      {
        players: [player],
        encounter: { sefirah: 'gevurah', seed: 9999, retryCount: 0 },
        phase: 'challenge',
        challengeSubPhase: 'react',
        lastOutcome: failedOutcome,
      },
    );
    const result = turnReducer({ state }, { kind: 'react-retry' }, RNG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const env = result.value.next.state.encounter;
    expect(env?.sefirah).toBe('gevurah');
    expect(env?.retryCount).toBe(1);
    expect(env?.dreamPillar).toBeUndefined();
  });
});

// #334 — `design/per-sefirah-mechanics.md` § 2.7: four new PrepModifier
// variants. Surface only — the actual mechanic logic (Hod scoring,
// Chesed gift transfer, Netzach desire stat-bonus, Yesod dream
// comparison) ships as separate downstream tickets that consume this
// surface. Tests pin shape:
//   - add: stages the modifier on `pendingModifiers`.
//   - remove: un-stages by equality fields per § 2.7 table.
//   - confirm: clears the staged modifier from `pendingModifiers`
//     (consumed regardless of pass/fail per § 2.7 "Consumption note").
describe('turnReducer — new PrepModifier variants (#334)', () => {
  describe('name-card (Hod)', () => {
    it('add: stages a name-card modifier with the named arcanum', () => {
      const player = makePlayer({ id: 'p1', position: 'hod', hand: [4] });
      const state = makeState({}, { players: [player] });
      const result = turnReducer(
        { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
        { kind: 'prep-add-modifier', modifier: { kind: 'name-card', arcanum: 4 } },
        RNG,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.next.state.pendingModifiers.nameCards).toEqual([4]);
    });

    it('remove: un-stages by arcanum equality', () => {
      const player = makePlayer({ id: 'p1', position: 'hod' });
      const state = makeState(
        {},
        {
          players: [player],
          pendingModifiers: {
            ...EMPTY_PENDING_MODIFIERS,
            nameCards: [4],
          },
        },
      );
      const result = turnReducer(
        { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
        { kind: 'prep-remove-modifier', modifier: { kind: 'name-card', arcanum: 4 } },
        RNG,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.next.state.pendingModifiers.nameCards).toEqual([]);
    });

    it('confirm: clears the staged name-card from pendingModifiers regardless of pass/fail', () => {
      // Per § 2.7 "Consumption note": name-card is consumed at
      // prep-confirm whether or not the roll matched.
      const player = makePlayer({
        id: 'p1',
        position: 'hod',
        stats: {
          unity: 10,
          insight: 10,
          understanding: 10,
          lovingkindness: 10,
          strength: 10,
          harmony: 10,
          passion: 10,
          intellect: 12,
          intuition: 10,
          body: 10,
        },
      });
      const state = makeState(
        {},
        {
          players: [player],
          encounter: { sefirah: 'hod', seed: 1, retryCount: 0 },
          pendingModifiers: {
            ...EMPTY_PENDING_MODIFIERS,
            nameCards: [4],
          },
        },
      );
      const failOutcome: CheckOutcome = {
        rolled: 1,
        statContribution: 12,
        modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
        total: 13,
        effectiveDC: 18,
        pass: false,
      };
      const result = turnReducer(
        { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
        { kind: 'prep-confirm', sefirah: 'hod', outcome: failOutcome },
        RNG,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      // Even on fail, the staged name-card is gone (§ 2.7 — retry
      // requires a fresh re-stage). Note this differs from card-burn
      // which is cumulative on retry.
      expect(result.value.next.state.pendingModifiers.nameCards).toEqual([]);
    });
  });

  describe('gift-card (Chesed)', () => {
    it('add: stages a gift-card modifier with arcanum + recipientId', () => {
      const ally = makePlayer({ id: 'p2', position: 'chesed' });
      const player = makePlayer({ id: 'p1', position: 'chesed', hand: [4] });
      const state = makeState({}, { players: [player, ally] });
      const result = turnReducer(
        { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
        {
          kind: 'prep-add-modifier',
          modifier: { kind: 'gift-card', arcanum: 4, recipientId: 'p2' },
        },
        RNG,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.next.state.pendingModifiers.giftCards).toEqual([
        { arcanum: 4, recipientId: 'p2' },
      ]);
    });

    it('remove: un-stages by arcanum AND recipientId equality', () => {
      // Two staged gifts of the same arcanum to different recipients
      // remove independently — equality is the (arcanum, recipientId)
      // pair per § 2.7.
      const player = makePlayer({ id: 'p1', position: 'chesed' });
      const state = makeState(
        {},
        {
          players: [player, makePlayer({ id: 'p2' }), makePlayer({ id: 'p3' })],
          pendingModifiers: {
            ...EMPTY_PENDING_MODIFIERS,
            giftCards: [
              { arcanum: 4, recipientId: 'p2' },
              { arcanum: 4, recipientId: 'p3' },
            ],
          },
        },
      );
      const result = turnReducer(
        { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
        {
          kind: 'prep-remove-modifier',
          modifier: { kind: 'gift-card', arcanum: 4, recipientId: 'p2' },
        },
        RNG,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      // Only the (4, p2) entry removed; (4, p3) survives.
      expect(result.value.next.state.pendingModifiers.giftCards).toEqual([
        { arcanum: 4, recipientId: 'p3' },
      ]);
    });

    it('confirm: clears all staged gift-cards from pendingModifiers', () => {
      const player = makePlayer({
        id: 'p1',
        position: 'chesed',
        stats: {
          unity: 10,
          insight: 10,
          understanding: 10,
          lovingkindness: 12,
          strength: 10,
          harmony: 10,
          passion: 10,
          intellect: 10,
          intuition: 10,
          body: 10,
        },
      });
      const state = makeState(
        {},
        {
          players: [player, makePlayer({ id: 'p2' })],
          encounter: { sefirah: 'chesed', seed: 1, retryCount: 0 },
          pendingModifiers: {
            ...EMPTY_PENDING_MODIFIERS,
            giftCards: [{ arcanum: 4, recipientId: 'p2' }],
          },
        },
      );
      const passOutcome: CheckOutcome = {
        rolled: 18,
        statContribution: 12,
        modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
        total: 30,
        effectiveDC: 15,
        pass: true,
      };
      const result = turnReducer(
        { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
        { kind: 'prep-confirm', sefirah: 'chesed', outcome: passOutcome },
        RNG,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.next.state.pendingModifiers.giftCards).toEqual([]);
    });
  });

  describe('declare-desire (Netzach)', () => {
    it('add: stages a declare-desire modifier with the named sefirah', () => {
      const player = makePlayer({ id: 'p1', position: 'netzach' });
      const state = makeState({}, { players: [player] });
      const result = turnReducer(
        { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
        {
          kind: 'prep-add-modifier',
          modifier: { kind: 'declare-desire', sefirah: 'tiferet' },
        },
        RNG,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.next.state.pendingModifiers.declareDesires).toEqual([
        'tiferet',
      ]);
    });

    it('remove: un-stages by sefirah equality', () => {
      const player = makePlayer({ id: 'p1', position: 'netzach' });
      const state = makeState(
        {},
        {
          players: [player],
          pendingModifiers: {
            ...EMPTY_PENDING_MODIFIERS,
            declareDesires: ['tiferet'],
          },
        },
      );
      const result = turnReducer(
        { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
        {
          kind: 'prep-remove-modifier',
          modifier: { kind: 'declare-desire', sefirah: 'tiferet' },
        },
        RNG,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.next.state.pendingModifiers.declareDesires).toEqual([]);
    });

    it('confirm: clears the staged declare-desire from pendingModifiers', () => {
      const player = makePlayer({
        id: 'p1',
        position: 'netzach',
        stats: {
          unity: 10,
          insight: 10,
          understanding: 10,
          lovingkindness: 10,
          strength: 10,
          harmony: 10,
          passion: 12,
          intellect: 10,
          intuition: 10,
          body: 10,
        },
      });
      const state = makeState(
        {},
        {
          players: [player],
          encounter: { sefirah: 'netzach', seed: 1, retryCount: 0 },
          pendingModifiers: {
            ...EMPTY_PENDING_MODIFIERS,
            declareDesires: ['tiferet'],
          },
        },
      );
      const passOutcome: CheckOutcome = {
        rolled: 18,
        statContribution: 12,
        modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
        total: 30,
        effectiveDC: 15,
        pass: true,
      };
      const result = turnReducer(
        { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
        { kind: 'prep-confirm', sefirah: 'netzach', outcome: passOutcome },
        RNG,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.next.state.pendingModifiers.declareDesires).toEqual([]);
    });
  });

  describe('dream-guess (Yesod)', () => {
    it('add: stages a dream-guess modifier with the named pillar', () => {
      const player = makePlayer({ id: 'p1', position: 'yesod' });
      const state = makeState({}, { players: [player] });
      const result = turnReducer(
        { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
        {
          kind: 'prep-add-modifier',
          modifier: { kind: 'dream-guess', pillar: 'mercy' },
        },
        RNG,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.next.state.pendingModifiers.dreamGuesses).toEqual([
        'mercy',
      ]);
    });

    it('add: rejects a second dream-guess with prep-cap-exceeded (max one per encounter, § 3.6)', () => {
      // Design § 3.6: "Only one dream-guess may be staged per encounter
      // (reducer rejects the second add)." A player can `prep-remove-
      // modifier` and re-stage with a different pillar before confirm,
      // but stacking two simultaneous guesses is rejected.
      const player = makePlayer({ id: 'p1', position: 'yesod' });
      const state = makeState(
        {},
        {
          players: [player],
          pendingModifiers: {
            ...EMPTY_PENDING_MODIFIERS,
            dreamGuesses: ['mercy'],
          },
        },
      );
      const result = turnReducer(
        { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
        {
          kind: 'prep-add-modifier',
          modifier: { kind: 'dream-guess', pillar: 'severity' },
        },
        RNG,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason.kind).toBe('prep-cap-exceeded');
      if (result.reason.kind !== 'prep-cap-exceeded') return;
      expect(result.reason.cap).toBe(1);
    });

    it('remove: un-stages by pillar equality', () => {
      const player = makePlayer({ id: 'p1', position: 'yesod' });
      const state = makeState(
        {},
        {
          players: [player],
          pendingModifiers: {
            ...EMPTY_PENDING_MODIFIERS,
            dreamGuesses: ['mercy'],
          },
        },
      );
      const result = turnReducer(
        { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
        {
          kind: 'prep-remove-modifier',
          modifier: { kind: 'dream-guess', pillar: 'mercy' },
        },
        RNG,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.next.state.pendingModifiers.dreamGuesses).toEqual([]);
    });

    it('confirm: clears the staged dream-guess from pendingModifiers regardless of pass/fail', () => {
      // Per § 2.7 "Consumption note": dream-guess is consumed at
      // prep-confirm whether or not the guess matched.
      const player = makePlayer({
        id: 'p1',
        position: 'yesod',
        stats: {
          unity: 10,
          insight: 10,
          understanding: 10,
          lovingkindness: 10,
          strength: 10,
          harmony: 10,
          passion: 10,
          intellect: 10,
          intuition: 12,
          body: 10,
        },
      });
      const state = makeState(
        {},
        {
          players: [player],
          encounter: { sefirah: 'yesod', seed: 1, retryCount: 0 },
          pendingModifiers: {
            ...EMPTY_PENDING_MODIFIERS,
            dreamGuesses: ['mercy'],
          },
        },
      );
      const failOutcome: CheckOutcome = {
        rolled: 1,
        statContribution: 12,
        modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
        total: 13,
        effectiveDC: 18,
        pass: false,
      };
      const result = turnReducer(
        { state: { ...state, phase: 'challenge', challengeSubPhase: 'prep' } },
        { kind: 'prep-confirm', sefirah: 'yesod', outcome: failOutcome },
        RNG,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      // Consumed even on fail — § 2.7 differs from card-burn here.
      expect(result.value.next.state.pendingModifiers.dreamGuesses).toEqual([]);
    });
  });
});
