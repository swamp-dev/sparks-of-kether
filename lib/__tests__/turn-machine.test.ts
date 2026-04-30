import { describe, expect, it } from 'vitest';
import { seededRng } from '@/engine/rng';
import type { TurnPhase } from '@/engine/types';
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
        pendingModifiers: { cardBurns: [3, 7, 7], sparkBurns: [], assistRequests: [] },
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
        pendingModifiers: { cardBurns: [3], sparkBurns: [], assistRequests: [] },
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
          cardBurns: [],
          sparkBurns: [],
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

  it('drops invalid card-burn (no longer in hand) and surfaces it in meta.dropped', () => {
    const player = makePlayer({
      id: 'p1',
      position: 'gevurah',
      hand: [], // hand empty — staged card 7 is invalid
    });
    const state = makeState(
      {},
      {
        players: [player],
        pendingModifiers: {
          cardBurns: [7],
          sparkBurns: [],
          assistRequests: [],
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
      { kind: 'card-burn', arcanum: 7 },
    ]);
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
          cardBurns: [],
          sparkBurns: [],
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
});

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
          cardBurns: [3],
          sparkBurns: [],
          assistRequests: [],
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

  it('respects HAND_CAP (6) — never draws past it', () => {
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
    // Hand was 5, cap is 6: meditate draws exactly 1 (not 2).
    expect(after?.hand).toEqual([1, 2, 3, 4, 5, 11]);
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
          cardBurns: [3, 7],
          sparkBurns: [],
          assistRequests: [],
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
          cardBurns: [],
          sparkBurns: [
            { sefirah: 'hod', sourcePlayerId: 'p2' },
            { sefirah: 'hod', sourcePlayerId: 'p3' },
          ],
          assistRequests: [],
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
          cardBurns: [],
          sparkBurns: [
            { sefirah: 'hod', sourcePlayerId: 'p2' },
            { sefirah: 'netzach', sourcePlayerId: 'p2' },
          ],
          assistRequests: [],
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
          cardBurns: [3, 7], // player re-stacked both cards
          sparkBurns: [],
          assistRequests: [],
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
