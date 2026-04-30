import { describe, expect, it } from 'vitest';
import { applyClientAction } from '../room-actions';
import { turnReducer, type PrepModifier } from '../turn-machine';
import { seededRng } from '@/engine/rng';
import { makePlayer, makeState } from '@/test/fixtures';

describe('applyClientAction — move', () => {
  it('applies a valid move and returns the new state', () => {
    // Player at Tiferet holding card 2 (path 13: Tiferet ↔ Kether).
    const player = makePlayer({
      id: 'p1',
      position: 'tiferet',
      hand: [2],
    });
    const state = makeState({}, { players: [player] });
    const result = applyClientAction(
      state,
      { kind: 'move', playerId: 'p1', pathNumber: 13 },
      seededRng(1),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newState.players[0]?.position).toBe('kether');
  });

  it('rejects an invalid move with the engine reason', () => {
    const player = makePlayer({ id: 'p1', position: 'malkuth', hand: [] });
    const state = makeState({}, { players: [player] });
    const result = applyClientAction(
      state,
      { kind: 'move', playerId: 'p1', pathNumber: 13 },
      seededRng(1),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('move');
  });
});

describe('applyClientAction — prep-add-modifier', () => {
  it('stages a card-burn into pendingModifiers', () => {
    const player = makePlayer({ id: 'p1', position: 'gevurah', hand: [5] });
    // Post-#227 review fix: `phase` and `challengeSubPhase` are on
    // `GameState`, so the dispatcher's reducer call rejects with
    // `wrong-sub-phase` unless the persisted state is already in the
    // expected sub-phase. The route's `move`-then-`prep-add-modifier`
    // sequence sets the state up for prep naturally; tests that
    // bypass the natural flow have to set phase explicitly.
    const state = makeState(
      {},
      {
        players: [player],
        phase: 'challenge',
        challengeSubPhase: 'prep',
      },
    );
    const result = applyClientAction(
      state,
      {
        kind: 'prep-add-modifier',
        playerId: 'p1',
        modifier: { kind: 'card-burn', arcanum: 5 },
      },
      seededRng(1),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newState.pendingModifiers.cardBurns).toEqual([5]);
  });

  it('matches what turnReducer produces directly for the equivalent event', () => {
    // Pin the dispatcher / reducer parity. If a future refactor in the
    // dispatcher diverges from the reducer's contract, this test
    // catches it before the multiplayer route does.
    const player = makePlayer({ id: 'p1', position: 'gevurah', hand: [7] });
    const state = makeState(
      {},
      {
        players: [player],
        phase: 'challenge',
        challengeSubPhase: 'prep',
      },
    );
    const dispatcherResult = applyClientAction(
      state,
      {
        kind: 'prep-add-modifier',
        playerId: 'p1',
        modifier: { kind: 'card-burn', arcanum: 7 },
      },
      seededRng(1),
    );
    const reducerResult = turnReducer(
      { state },
      { kind: 'prep-add-modifier', modifier: { kind: 'card-burn', arcanum: 7 } },
      seededRng(1),
    );
    expect(dispatcherResult.ok).toBe(true);
    expect(reducerResult.ok).toBe(true);
    if (!dispatcherResult.ok || !reducerResult.ok) return;
    expect(dispatcherResult.newState).toEqual(reducerResult.value.next.state);
  });

  it('rejects an assist-request beyond the cap with prep / wrong-sub-phase or prep-cap-exceeded', () => {
    // Cap is MAX_ASSIST_REQUESTS=2. Three calls — the third must reject.
    let state = makeState(
      {},
      {
        players: [
          makePlayer({ id: 'p1', position: 'gevurah' }),
          makePlayer({ id: 'p2', position: 'gevurah' }),
          makePlayer({ id: 'p3', position: 'gevurah' }),
          makePlayer({ id: 'p4', position: 'gevurah' }),
        ],
        activePlayerId: 'p1',
        phase: 'challenge',
        challengeSubPhase: 'prep',
      },
    );
    for (const allyId of ['p2', 'p3']) {
      const r = applyClientAction(
        state,
        {
          kind: 'prep-add-modifier',
          playerId: 'p1',
          modifier: { kind: 'assist-request', allyId },
        },
        seededRng(1),
      );
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      state = r.newState;
    }
    const overflow = applyClientAction(
      state,
      {
        kind: 'prep-add-modifier',
        playerId: 'p1',
        modifier: { kind: 'assist-request', allyId: 'p4' },
      },
      seededRng(1),
    );
    expect(overflow.ok).toBe(false);
    if (overflow.ok) return;
    expect(overflow.error.kind).toBe('prep');
    if (overflow.error.kind !== 'prep') return;
    expect(overflow.error.cause.kind).toBe('prep-cap-exceeded');
  });
});

describe('applyClientAction — prep-remove-modifier', () => {
  it('removes a previously-staged card-burn from pendingModifiers', () => {
    // Pre-stage two card-burns, remove one.
    let state = makeState(
      {},
      {
        players: [
          makePlayer({ id: 'p1', position: 'gevurah', hand: [3, 5] }),
        ],
        phase: 'challenge',
        challengeSubPhase: 'prep',
      },
    );
    for (const arcanum of [3, 5]) {
      const r = applyClientAction(
        state,
        {
          kind: 'prep-add-modifier',
          playerId: 'p1',
          modifier: { kind: 'card-burn', arcanum },
        },
        seededRng(1),
      );
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      state = r.newState;
    }
    expect(state.pendingModifiers.cardBurns).toEqual([3, 5]);
    const removed = applyClientAction(
      state,
      {
        kind: 'prep-remove-modifier',
        playerId: 'p1',
        modifier: { kind: 'card-burn', arcanum: 3 },
      },
      seededRng(1),
    );
    expect(removed.ok).toBe(true);
    if (!removed.ok) return;
    expect(removed.newState.pendingModifiers.cardBurns).toEqual([5]);
  });

  it('matches what turnReducer produces directly for the equivalent event', () => {
    const player = makePlayer({ id: 'p1', position: 'gevurah', hand: [4] });
    const baseState = makeState(
      {},
      {
        players: [player],
        phase: 'challenge',
        challengeSubPhase: 'prep',
      },
    );
    // Stage one card so there's something to remove.
    const staged = applyClientAction(
      baseState,
      {
        kind: 'prep-add-modifier',
        playerId: 'p1',
        modifier: { kind: 'card-burn', arcanum: 4 },
      },
      seededRng(1),
    );
    expect(staged.ok).toBe(true);
    if (!staged.ok) return;
    const modifier: PrepModifier = { kind: 'card-burn', arcanum: 4 };
    const dispatcherResult = applyClientAction(
      staged.newState,
      {
        kind: 'prep-remove-modifier',
        playerId: 'p1',
        modifier,
      },
      seededRng(1),
    );
    const reducerResult = turnReducer(
      {
        state: {
          ...staged.newState,
          phase: 'challenge',
          challengeSubPhase: 'prep',
        },
      },
      { kind: 'prep-remove-modifier', modifier },
      seededRng(1),
    );
    expect(dispatcherResult.ok).toBe(true);
    expect(reducerResult.ok).toBe(true);
    if (!dispatcherResult.ok || !reducerResult.ok) return;
    expect(dispatcherResult.newState).toEqual(reducerResult.value.next.state);
  });
});

describe('applyClientAction — prep-confirm', () => {
  it('applies pre-rolled outcome (no double roll) and clears pendingModifiers on pass', () => {
    // Player at Gevurah, uncleared, with stat 12.
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
        phase: 'challenge',
        challengeSubPhase: 'prep',
      },
    );
    const result = applyClientAction(
      state,
      {
        kind: 'prep-confirm',
        playerId: 'p1',
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
      seededRng(1),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Pass → Sefirah cleared, Spark earned, pendingModifiers cleared.
    expect(result.newState.players[0]?.clearedSefirot.has('gevurah')).toBe(true);
    expect(result.newState.players[0]?.sparksHeld.has('gevurah')).toBe(true);
    expect(result.newState.pendingModifiers.cardBurns).toEqual([]);
  });

  it('preserves pendingModifiers on a failed roll so react-retry can stack burns', () => {
    let state = makeState(
      {},
      {
        players: [makePlayer({ id: 'p1', position: 'gevurah', hand: [3] })],
        phase: 'challenge',
        challengeSubPhase: 'prep',
      },
    );
    const staged = applyClientAction(
      state,
      {
        kind: 'prep-add-modifier',
        playerId: 'p1',
        modifier: { kind: 'card-burn', arcanum: 3 },
      },
      seededRng(1),
    );
    expect(staged.ok).toBe(true);
    if (!staged.ok) return;
    state = staged.newState;
    const failed = applyClientAction(
      state,
      {
        kind: 'prep-confirm',
        playerId: 'p1',
        sefirah: 'gevurah',
        outcome: {
          rolled: 1,
          statContribution: 10,
          modifierBreakdown: { assist: 0, cardBurn: 3, sparkBurn: 0 },
          total: 14,
          effectiveDC: 16,
          pass: false,
        },
      },
      seededRng(1),
    );
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;
    // Fail leaves cardBurns in place — design § 6 contract.
    expect(failed.newState.pendingModifiers.cardBurns).toEqual([3]);
  });
});

describe('applyClientAction — react-retry — security gate (pre-#227 exploit cover)', () => {
  // Pre-#227 the dispatcher synthesized `lastOutcome: { pass: false }`
  // for every `react-retry` action. A malicious authenticated active
  // player could fire `react-retry` cold (no prior `prep-confirm`)
  // OR after a passed challenge, and the synthesized failed outcome
  // let the engine's "can't retry on pass" gate be bypassed.
  //
  // Post-fix: `state.lastOutcome` is on GameState. The dispatcher
  // reads it directly. Retries against a passed outcome reject with
  // `react-retry-on-pass`. THIS IS THE LOAD-BEARING FIX TEST: if it
  // ever passes against pre-fix code, the exploit is back.
  it('rejects react-retry when state.lastOutcome.pass is true (post-passed-challenge attack vector)', () => {
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
    let state = makeState(
      {},
      {
        players: [player],
        phase: 'challenge',
        challengeSubPhase: 'prep',
      },
    );
    // Drive prep → confirm(pass) so `state.lastOutcome.pass === true`
    // and `state.challengeSubPhase === 'react'`.
    const passed = applyClientAction(
      state,
      {
        kind: 'prep-confirm',
        playerId: 'p1',
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
      seededRng(1),
    );
    expect(passed.ok).toBe(true);
    if (!passed.ok) return;
    state = passed.newState;
    expect(state.lastOutcome?.pass).toBe(true);
    expect(state.challengeSubPhase).toBe('react');

    // Now the active player attempts react-retry. Pre-fix this
    // succeeded (synthesized `lastOutcome.pass: false` bypassed the
    // gate). Post-fix the dispatcher reads `state.lastOutcome.pass`
    // = true and the reducer returns `react-retry-on-pass`.
    const retry = applyClientAction(
      state,
      { kind: 'react-retry', playerId: 'p1' },
      seededRng(1),
    );
    expect(retry.ok).toBe(false);
    if (retry.ok) return;
    expect(retry.error.kind).toBe('prep');
    if (retry.error.kind !== 'prep') return;
    expect(retry.error.cause.kind).toBe('react-retry-on-pass');
  });

  it('rejects react-retry fired cold (state.challengeSubPhase undefined)', () => {
    // Second attack vector: dispatch `react-retry` against a state
    // that's not in the `'react'` sub-phase at all (e.g. `'move'`).
    // Pre-fix the synthesized snapshot put it in `'react'` regardless,
    // so the call would reach the gate. Post-fix the reducer's
    // sub-phase guard rejects directly.
    const player = makePlayer({ id: 'p1', position: 'gevurah' });
    const state = makeState({}, { players: [player] }); // phase: 'move'
    const retry = applyClientAction(
      state,
      { kind: 'react-retry', playerId: 'p1' },
      seededRng(1),
    );
    expect(retry.ok).toBe(false);
    if (retry.ok) return;
    expect(retry.error.kind).toBe('prep');
    if (retry.error.kind !== 'prep') return;
    expect(retry.error.cause.kind).toBe('wrong-sub-phase');
  });
});

describe('applyClientAction — react-retry', () => {
  it('returns success with the (unchanged-by-engine) state on a failed roll', () => {
    // Setup: stage a card and confirm with a forced-fail outcome so
    // the engine state holds a pending card-burn we expect to survive
    // the retry. Post-#227 review fix the dispatcher reads
    // `state.lastOutcome` directly — no synthesis — so the natural
    // prep-confirm(fail) flow leaves the state in 'react' with a
    // failed lastOutcome, and `react-retry` then matches the gate.
    let state = makeState(
      {},
      {
        players: [makePlayer({ id: 'p1', position: 'gevurah', hand: [9] })],
        phase: 'challenge',
        challengeSubPhase: 'prep',
      },
    );
    const staged = applyClientAction(
      state,
      {
        kind: 'prep-add-modifier',
        playerId: 'p1',
        modifier: { kind: 'card-burn', arcanum: 9 },
      },
      seededRng(1),
    );
    expect(staged.ok).toBe(true);
    if (!staged.ok) return;
    state = staged.newState;
    const failed = applyClientAction(
      state,
      {
        kind: 'prep-confirm',
        playerId: 'p1',
        sefirah: 'gevurah',
        outcome: {
          rolled: 1,
          statContribution: 10,
          modifierBreakdown: { assist: 0, cardBurn: 3, sparkBurn: 0 },
          total: 14,
          effectiveDC: 16,
          pass: false,
        },
      },
      seededRng(1),
    );
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;
    state = failed.newState;
    const retry = applyClientAction(
      state,
      { kind: 'react-retry', playerId: 'p1' },
      seededRng(1),
    );
    expect(retry.ok).toBe(true);
    if (!retry.ok) return;
    // Retry preserves pendingModifiers (engine returns input state on
    // fail; the retry path itself doesn't mutate state).
    expect(retry.newState.pendingModifiers.cardBurns).toEqual([9]);
  });
});

describe('applyClientAction — accept-setback', () => {
  it('ticks separation +1 on a regular failure', () => {
    const player = makePlayer({ id: 'p1', position: 'gevurah', hand: [] });
    const state = makeState({}, { players: [player], separation: 3 });
    const result = applyClientAction(
      state,
      { kind: 'accept-setback', playerId: 'p1', sefirah: 'gevurah' },
      seededRng(1),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newState.separation).toBe(4);
  });

  it('ticks separation +2 on a shortcut failure', () => {
    const player = makePlayer({ id: 'p1', position: 'tiferet', hand: [] });
    const state = makeState({}, { players: [player], separation: 0 });
    const result = applyClientAction(
      state,
      {
        kind: 'accept-setback',
        playerId: 'p1',
        sefirah: 'tiferet',
        shortcut: true,
      },
      seededRng(1),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newState.separation).toBe(2);
  });
});

describe('applyClientAction — end-turn', () => {
  it('advances activePlayerId to the next seat', () => {
    const players = [
      makePlayer({ id: 'p1' }),
      makePlayer({ id: 'p2' }),
    ];
    const state = makeState({}, { players, activePlayerId: 'p1' });
    const result = applyClientAction(
      state,
      { kind: 'end-turn', playerId: 'p1' },
      seededRng(1),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newState.activePlayerId).toBe('p2');
  });
});

describe('applyClientAction — meditate', () => {
  it('draws MEDITATE_DRAW (2) cards from the deck and appends them to the player hand', () => {
    const player = makePlayer({ id: 'p1', hand: [1, 2] });
    const state = makeState(
      {},
      { players: [player], deck: [10, 11, 12, 13], discardPile: [] },
    );
    const result = applyClientAction(
      state,
      { kind: 'meditate', playerId: 'p1' },
      seededRng(1),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newState.players[0]?.hand).toEqual([1, 2, 10, 11]);
    expect(result.newState.deck).toEqual([12, 13]);
  });

  it('succeeds at HAND_CAP=6 — draws over the cap and sets pendingDiscard (#291)', () => {
    // #291: pre-fix the dispatcher rejected with `hand-full`, which
    // softlocked players who hit the cap with no usable paths. New
    // contract: meditate ALWAYS draws MEDITATE_DRAW (capping is now
    // an end-of-turn responsibility via state.pendingDiscard).
    const player = makePlayer({ id: 'p1', hand: [1, 2, 3, 4, 5, 6] });
    const state = makeState(
      {},
      { players: [player], deck: [10, 11], discardPile: [] },
    );
    const result = applyClientAction(
      state,
      { kind: 'meditate', playerId: 'p1' },
      seededRng(1),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newState.players[0]?.hand).toEqual([1, 2, 3, 4, 5, 6, 10, 11]);
    expect(result.newState.pendingDiscard).toEqual({
      count: 2,
      requiredBy: 'end-of-turn',
    });
  });

  it('rejects with unknown-player when the playerId is not in state.players', () => {
    // Defense in depth — the route's `authorize` gate already rejects
    // unknown players before reaching the dispatcher, but a direct
    // caller (scenario builder, future CLI) needs an explicit signal
    // rather than a silent 200.
    const player = makePlayer({ id: 'p1', hand: [1, 2] });
    const state = makeState({}, { players: [player], deck: [10, 11] });
    const result = applyClientAction(
      state,
      { kind: 'meditate', playerId: 'ghost' },
      seededRng(1),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('meditate');
    if (result.error.kind !== 'meditate') return;
    expect(result.error.cause).toBe('unknown-player');
  });

  it('recycles a non-empty discard pile when the deck empties mid-meditate', () => {
    const player = makePlayer({ id: 'p1', hand: [1, 2] });
    const state = makeState(
      {},
      { players: [player], deck: [10], discardPile: [20, 21, 22] },
    );
    const result = applyClientAction(
      state,
      { kind: 'meditate', playerId: 'p1' },
      seededRng(7),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Hand grew by exactly 2 (10 from the deck + one from recycled discard).
    expect(result.newState.players[0]?.hand).toHaveLength(4);
    expect(result.newState.discardPile).toHaveLength(0);
  });
});

describe('applyClientAction — discard (#291)', () => {
  // #291: a player who Meditated over HAND_CAP must shed the over-cap
  // excess via `discard` ClientActions before the engine will let
  // their turn end. The dispatcher routes through the engine's
  // `discard` reducer.
  it('removes the named card from hand, decrements pendingDiscard.count', () => {
    const player = makePlayer({
      id: 'p1',
      hand: [1, 2, 3, 4, 5, 6, 10, 11],
    });
    const state = makeState(
      {},
      {
        players: [player],
        activePlayerId: 'p1',
        pendingDiscard: { count: 2, requiredBy: 'end-of-turn' },
        discardPile: [],
        phase: 'end',
      },
    );
    const result = applyClientAction(
      state,
      { kind: 'discard', playerId: 'p1', arcanum: 11 },
      seededRng(1),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newState.players[0]?.hand).toEqual([1, 2, 3, 4, 5, 6, 10]);
    expect(result.newState.discardPile).toEqual([11]);
    expect(result.newState.pendingDiscard?.count).toBe(1);
  });

  it('clears pendingDiscard when the final required card is discarded', () => {
    const player = makePlayer({
      id: 'p1',
      hand: [1, 2, 3, 4, 5, 6, 10],
    });
    const state = makeState(
      {},
      {
        players: [player],
        activePlayerId: 'p1',
        pendingDiscard: { count: 1, requiredBy: 'end-of-turn' },
        phase: 'end',
      },
    );
    const result = applyClientAction(
      state,
      { kind: 'discard', playerId: 'p1', arcanum: 10 },
      seededRng(1),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newState.pendingDiscard).toBeUndefined();
  });
});

describe('applyClientAction — end-turn refuses while pendingDiscard pending (#291)', () => {
  it('does not advance the seat when pendingDiscard.count > 0', () => {
    // #291: the engine refuses to advance; the dispatcher mirrors
    // that refusal so the multiplayer wire layer does not record a
    // phantom seat advance for the next client to apply.
    const players = [
      makePlayer({ id: 'p1', hand: [1, 2, 3, 4, 5, 6, 10, 11] }),
      makePlayer({ id: 'p2' }),
    ];
    const state = makeState(
      {},
      {
        players,
        activePlayerId: 'p1',
        pendingDiscard: { count: 2, requiredBy: 'end-of-turn' },
        phase: 'end',
      },
    );
    const result = applyClientAction(
      state,
      { kind: 'end-turn', playerId: 'p1' },
      seededRng(1),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newState.activePlayerId).toBe('p1');
    expect(result.newState.pendingDiscard?.count).toBe(2);
  });
});
