import { describe, expect, it } from 'vitest';
import { applyClientAction } from '../room-actions';
import { turnReducer, type PrepModifier } from '../turn-machine';
import { seededRng } from '@/engine/rng';
import { EMPTY_SHELL_STATE } from '@/engine/types';
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

  it('trips the Final Threshold ritual when the last player arrives at Kether (#345)', () => {
    // Two players: p1 already at Kether (with arrivedAtKetherAt set so
    // the trigger uses a real timestamp), p2 still at Tiferet holding
    // arcanum 2 (path 13). p2 plays the move — convergence is met at
    // the post-move state and `padPhaseAfterMove` flips phase to 'kether'.
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
    const state = makeState({}, { players: [p1, p2], phase: 'move', activePlayerId: 'p2' });
    const result = applyClientAction(
      state,
      { kind: 'move', playerId: 'p2', pathNumber: 13 },
      seededRng(1),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newState.phase).toBe('kether');
    expect(result.newState.ketherRitual).toBeDefined();
    expect(result.newState.ketherRitual?.subPhase).toBe('witness');
    // p2 arrived last → p2 opens (its stamp from applyMove is > 100).
    expect(result.newState.ketherRitual?.witnessOrder[0]).toBe('p2');
  });

  it('does NOT trip the ritual on a non-last arrival (#345)', () => {
    // First player arrives at Kether but a teammate is still climbing.
    // Phase lands in 'end' (#502: pre-#502 this was 'draw'; Kether is
    // a no-check arrival so the move case takes the no-challenge
    // branch).
    const p1 = makePlayer({
      id: 'p1',
      position: 'tiferet',
      hand: [2],
    });
    const p2 = makePlayer({
      id: 'p2',
      position: 'tiferet',
      hand: [],
    });
    const state = makeState({}, { players: [p1, p2], phase: 'move', activePlayerId: 'p1' });
    const result = applyClientAction(
      state,
      { kind: 'move', playerId: 'p1', pathNumber: 13 },
      seededRng(1),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newState.phase).toBe('end');
    expect(result.newState.ketherRitual).toBeUndefined();
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
        players: [makePlayer({ id: 'p1', position: 'gevurah', hand: [3, 5] })],
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
    const retry = applyClientAction(state, { kind: 'react-retry', playerId: 'p1' }, seededRng(1));
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
    const retry = applyClientAction(state, { kind: 'react-retry', playerId: 'p1' }, seededRng(1));
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
    const retry = applyClientAction(state, { kind: 'react-retry', playerId: 'p1' }, seededRng(1));
    expect(retry.ok).toBe(true);
    if (!retry.ok) return;
    // Retry preserves pendingModifiers (engine returns input state on
    // fail; the retry path itself doesn't mutate state).
    expect(retry.newState.pendingModifiers.cardBurns).toEqual([9]);
  });
});

describe('applyClientAction — react-continue (#390)', () => {
  // Wire-format round-trip: a multiplayer player who passes a
  // challenge and clicks Continue must be able to advance phase
  // out of `challenge.react`. Pre-#390 the wire format had no
  // `react-continue` arm, so the dispatcher had no path to apply
  // the engine event — pre-#385's "phase frozen at challenge.react"
  // bug would silently re-appear in multiplayer.
  //
  // #502: pre-#502 the post-pass landing phase was `'draw'`. With
  // the start-of-turn refill and the discrete `'draw'` phase gone,
  // react-continue lands in `'end'` directly.
  it('advances phase from challenge.react to end on a passed challenge', () => {
    const player = makePlayer({ id: 'p1', position: 'gevurah', hand: [] });
    const state = makeState({}, { players: [player] });
    const passedState: typeof state = {
      ...state,
      phase: 'challenge',
      challengeSubPhase: 'react',
      lastOutcome: {
        rolled: 18,
        statContribution: 5,
        modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
        total: 23,
        effectiveDC: 16,
        pass: true,
      },
    };
    const result = applyClientAction(
      passedState,
      { kind: 'react-continue', playerId: 'p1' },
      seededRng(1),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newState.phase).toBe('end');
    expect(result.newState.challengeSubPhase).toBeUndefined();
    expect(result.newState.lastOutcome).toBeUndefined();
  });

  it('surfaces the engine rejection shape when fired from a non-challenge phase', () => {
    // Defense in depth — if a buggy multiplayer client fires
    // react-continue from `phase: 'end'`, the engine's existing
    // wrong-phase guard rejects it and the dispatcher surfaces the
    // rejection back through the prep error envelope.
    const player = makePlayer({ id: 'p1', position: 'gevurah' });
    const state = makeState({}, { players: [player] });
    const endState: typeof state = { ...state, phase: 'end' };
    const result = applyClientAction(
      endState,
      { kind: 'react-continue', playerId: 'p1' },
      seededRng(1),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('prep');
    if (result.error.kind !== 'prep') return;
    expect(result.error.cause.kind).toBe('wrong-phase');
  });

  it('rejects with wrong-sub-phase when fired from challenge.prep', () => {
    // Parity with the existing react-retry coverage — a buggy
    // client firing react-continue mid-prep would reach the
    // engine's sub-phase guard. Pin the rejection envelope at
    // the wire layer.
    const player = makePlayer({ id: 'p1', position: 'gevurah' });
    const state = makeState({}, { players: [player] });
    const prepState: typeof state = {
      ...state,
      phase: 'challenge',
      challengeSubPhase: 'prep',
    };
    const result = applyClientAction(
      prepState,
      { kind: 'react-continue', playerId: 'p1' },
      seededRng(1),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('prep');
    if (result.error.kind !== 'prep') return;
    expect(result.error.cause.kind).toBe('wrong-sub-phase');
  });

  it('rejects with react-continue-on-fail when lastOutcome.pass is false', () => {
    // The mirror of react-retry's pass-only test — react-continue
    // is the post-PASS path. A wire dispatch from challenge.react
    // with lastOutcome.pass=false must route through accept-setback
    // instead; the engine's defensive guard rejects it cleanly
    // rather than skipping the Separation tick.
    const player = makePlayer({ id: 'p1', position: 'gevurah' });
    const state = makeState({}, { players: [player] });
    const failedReactState: typeof state = {
      ...state,
      phase: 'challenge',
      challengeSubPhase: 'react',
      lastOutcome: {
        rolled: 4,
        statContribution: 5,
        modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
        total: 9,
        effectiveDC: 16,
        pass: false,
      },
    };
    const result = applyClientAction(
      failedReactState,
      { kind: 'react-continue', playerId: 'p1' },
      seededRng(1),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('prep');
    if (result.error.kind !== 'prep') return;
    expect(result.error.cause.kind).toBe('react-continue-on-fail');
  });
});

describe('applyClientAction — accept-setback', () => {
  it('ticks separation +1 on a regular failure', () => {
    const player = makePlayer({ id: 'p1', position: 'gevurah', hand: [] });
    // Pre-banish 1 shell: a real game at sep=3 would have already
    // activated the first shell, so the maybeActivateShell hook is a no-op.
    const state = makeState(
      {},
      { players: [player], separation: 3, shells: { ...EMPTY_SHELL_STATE, malkuth: 'banished' } },
    );
    const result = applyClientAction(
      state,
      { kind: 'accept-setback', playerId: 'p1', sefirah: 'gevurah' },
      seededRng(1),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newState.separation).toBe(4);
  });

  it('ticks separation +2 and rolls position back to origin on a shortcut failure', () => {
    // #303 retro-review: pin BOTH the Separation delta and the
    // position rollback at the multiplayer-action boundary. Pre-fix
    // the test only asserted Separation, so a regression in
    // `acceptSetback`'s position rollback could silently slip past
    // the multiplayer action layer.
    //
    // Path 25 (Tiferet ↔ Yesod) is a real central-pillar shortcut.
    // Player arrived at Tiferet via path 25 (origin = Yesod).
    // Failing the Tiferet challenge with shortcut: true must:
    //   - tick Separation +2 (per design/mechanics.md § Shortcuts)
    //   - roll position back to Yesod (the other endpoint of path 25)
    const player = makePlayer({
      id: 'p1',
      position: 'tiferet',
      hand: [],
      lastArrivalPathNumber: 25,
    });
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
    // Position rolled back to Yesod (the other endpoint of path 25).
    expect(result.newState.players[0]?.position).toBe('yesod');
    // lastArrivalPathNumber cleared so a subsequent challenge at the
    // origin doesn't re-read the old path's pillarsCrossed.
    expect(result.newState.players[0]?.lastArrivalPathNumber).toBeUndefined();
  });
});

describe('applyClientAction — end-turn', () => {
  it('advances activePlayerId to the next seat', () => {
    const players = [makePlayer({ id: 'p1' }), makePlayer({ id: 'p2' })];
    // #522: `end-turn` requires phase === 'end' OR
    // (phase === 'move' && meditatedThisTurn === true). The default
    // `makeState` phase is `'move'` with no meditation, which would
    // now be rejected — pin the legitimate seat-rotation path on
    // phase 'end'.
    const state = makeState({}, { players, activePlayerId: 'p1', phase: 'end' });
    const result = applyClientAction(state, { kind: 'end-turn', playerId: 'p1' }, seededRng(1));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newState.activePlayerId).toBe('p2');
  });

  it('allows end-turn from phase "move" when meditatedThisTurn is true (#522 / #503)', () => {
    // #503 affordance: a player who meditated may end the turn directly
    // even from `'move'` (Meditate is a complete turn-action). The
    // dispatcher must mirror the reducer's allowEndTurn rule.
    const players = [makePlayer({ id: 'p1' }), makePlayer({ id: 'p2' })];
    const state = makeState(
      {},
      {
        players,
        activePlayerId: 'p1',
        phase: 'move',
        meditatedThisTurn: true,
      },
    );
    const result = applyClientAction(state, { kind: 'end-turn', playerId: 'p1' }, seededRng(1));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newState.activePlayerId).toBe('p2');
  });

  it('rejects end-turn from phase "move" when meditatedThisTurn is not set (#522)', () => {
    // #522: a fresh-`'move'` player who hasn't meditated must not be
    // able to skip their turn through the events route. `turnReducer`
    // gates this at `lib/turn-machine.ts:1423`; the dispatcher arm
    // mirrors the same gate ahead of the cap check, so an HTTP-level
    // bypass (cheating client / racing tabs / future code path)
    // surfaces a `wrong-phase` rejection instead of silently rotating
    // the seat.
    const players = [makePlayer({ id: 'p1' }), makePlayer({ id: 'p2' })];
    const state = makeState({}, { players, activePlayerId: 'p1', phase: 'move' });
    const result = applyClientAction(state, { kind: 'end-turn', playerId: 'p1' }, seededRng(1));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('end-turn');
    if (result.error.kind !== 'end-turn') return;
    expect(result.error.cause.kind).toBe('wrong-phase');
    expect(result.error.cause.expected).toBe('end');
    expect(result.error.cause.actual).toBe('move');
    // Seat must NOT have rotated.
    expect(state.activePlayerId).toBe('p1');
  });

  // Note: this gate is intentionally narrow — it fires ONLY for the
  // `'move'` + no-meditate case from #522, which is the specific
  // skip-turn bypass the ticket targets. The reducer's full
  // `allowEndTurn` rule also rejects `'challenge'` and `'kether'`
  // dispatcher end-turns, but those are out of scope for this
  // ticket: a future tightening would be a separate tech-debt
  // pass that also revisits the playthrough scenario harness's
  // trailing-`endTurn` calls (which currently fire after the
  // Kether ritual and are no-ops in real production gameplay).
});

describe('applyClientAction — meditate', () => {
  it('draws MEDITATE_DRAW (2) cards, stays in move phase, sets meditatedThisTurn (#503)', () => {
    // #503: post-#503 the multiplayer dispatcher mirrors the engine
    // reducer's new contract — phase stays at `'move'` so the player
    // may still play a card, and `meditatedThisTurn` is set to enforce
    // the once-per-turn cap. Server- and client-applied state must
    // agree on these fields or the multiplayer flow desyncs.
    const player = makePlayer({ id: 'p1', hand: [1, 2] });
    const state = makeState({}, { players: [player], deck: [10, 11, 12, 13], discardPile: [] });
    const result = applyClientAction(state, { kind: 'meditate', playerId: 'p1' }, seededRng(1));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newState.players[0]?.hand).toEqual([1, 2, 10, 11]);
    expect(result.newState.deck).toEqual([12, 13]);
    expect(result.newState.phase).toBe('move');
    expect(result.newState.meditatedThisTurn).toBe(true);
  });

  it('rejects a second meditate the same turn with already-meditated (#503)', () => {
    // #503: once-per-turn cap on Meditate. The engine-side flag
    // (`meditatedThisTurn`) is the authoritative gate; the dispatcher
    // refuses with a precise rejection so the wire layer surfaces the
    // reason instead of pretending the action succeeded.
    const player = makePlayer({ id: 'p1', hand: [1, 2] });
    const state = makeState(
      {},
      {
        players: [player],
        deck: [10, 11, 12, 13],
        discardPile: [],
        meditatedThisTurn: true,
      },
    );
    const result = applyClientAction(state, { kind: 'meditate', playerId: 'p1' }, seededRng(1));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('meditate');
    if (result.error.kind !== 'meditate') return;
    expect(result.error.cause).toBe('already-meditated');
  });

  it('succeeds at HAND_CAP=5 — draws over the cap; cap check defers to end-turn (#503)', () => {
    // #291: meditate ALWAYS draws MEDITATE_DRAW (even past HAND_CAP).
    // Pre-#291 the dispatcher rejected with `hand-full`, softlocking
    // players who hit the cap with no usable paths.
    //
    // #503: pendingDiscard is NOT set immediately on Meditate. The
    // cap check fires when the player tries to End the turn instead.
    // This lets a Meditate-then-Move flow that drops back under cap
    // proceed without any prompt.
    const player = makePlayer({ id: 'p1', hand: [1, 2, 3, 4, 5] });
    const state = makeState({}, { players: [player], deck: [10, 11], discardPile: [] });
    const result = applyClientAction(state, { kind: 'meditate', playerId: 'p1' }, seededRng(1));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newState.players[0]?.hand).toEqual([1, 2, 3, 4, 5, 10, 11]);
    expect(result.newState.pendingDiscard).toBeUndefined();
    // #503: at-cap meditate must also stay in `'move'` and set the
    // once-per-turn flag (mirrors the happy-path test above). Without
    // these assertions a regression that flipped the at-cap branch to
    // `phase: 'end'` would silently pass.
    expect(result.newState.phase).toBe('move');
    expect(result.newState.meditatedThisTurn).toBe(true);
  });

  it('end-turn after over-cap meditate sets pendingDiscard and refuses to advance (#503)', () => {
    // #503: the cap check belongs on `end-turn`, not on `meditate`.
    // Mirrors the engine reducer arm; server- and client-applied state
    // must agree on when the discard prompt fires.
    const p1 = makePlayer({ id: 'p1', hand: [1, 2, 3, 4, 5] });
    const p2 = makePlayer({ id: 'p2', hand: [] });
    const state = makeState(
      {},
      { players: [p1, p2], activePlayerId: 'p1', deck: [10, 11], discardPile: [] },
    );
    const meditated = applyClientAction(state, { kind: 'meditate', playerId: 'p1' }, seededRng(1));
    expect(meditated.ok).toBe(true);
    if (!meditated.ok) return;
    const ended = applyClientAction(
      meditated.newState,
      { kind: 'end-turn', playerId: 'p1' },
      seededRng(1),
    );
    expect(ended.ok).toBe(true);
    if (!ended.ok) return;
    expect(ended.newState.pendingDiscard).toEqual({
      count: 2,
      requiredBy: 'end-of-turn',
    });
    expect(ended.newState.activePlayerId).toBe('p1');
  });

  it('rejects with unknown-player when the playerId is not in state.players', () => {
    // Defense in depth — the route's `authorize` gate already rejects
    // unknown players before reaching the dispatcher, but a direct
    // caller (scenario builder, future CLI) needs an explicit signal
    // rather than a silent 200.
    const player = makePlayer({ id: 'p1', hand: [1, 2] });
    const state = makeState({}, { players: [player], deck: [10, 11] });
    const result = applyClientAction(state, { kind: 'meditate', playerId: 'ghost' }, seededRng(1));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('meditate');
    if (result.error.kind !== 'meditate') return;
    expect(result.error.cause).toBe('unknown-player');
  });

  it('recycles a non-empty discard pile when the deck empties mid-meditate', () => {
    const player = makePlayer({ id: 'p1', hand: [1, 2] });
    const state = makeState({}, { players: [player], deck: [10], discardPile: [20, 21, 22] });
    const result = applyClientAction(state, { kind: 'meditate', playerId: 'p1' }, seededRng(7));
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

describe('applyClientAction — kether wire-format (#350)', () => {
  // ────────── helpers ──────────

  /**
   * Two-player ritual fixture: both at Kether, p2 the active witness
   * (p2 has a later arrivedAtKetherAt → opens the round-robin).
   * Hand sizes set so each has at least 2 cards to play with.
   */
  function makeTwoPlayerRitual() {
    const p1 = makePlayer({
      id: 'p1',
      position: 'kether',
      hand: [3, 4],
      arrivedAtKetherAt: 100,
    });
    const p2 = makePlayer({
      id: 'p2',
      position: 'kether',
      hand: [5, 6],
      arrivedAtKetherAt: 200,
    });
    // Use the helper that mirrors the production wire — apply the
    // last move via applyClientAction so phase / ritual are set up
    // by the same code path. But for a unit test we can build the
    // state directly: maybeTriggerKetherRitual is idempotent and we
    // just want a valid in-ritual state.
    let state = makeState({}, { players: [p1, p2], phase: 'move', activePlayerId: 'p2' });
    // Easiest: synthesize the ritual state by going through one move.
    // p2 moves to kether-from-kether is a no-op — instead we set up
    // the state manually mirroring what initKetherRitual produces.
    state = {
      ...state,
      phase: 'kether',
      ketherRitual: {
        subPhase: 'witness',
        witnessOrder: ['p2', 'p1'],
        witnessTurnIndex: 0,
        personalQueueLengths: { p1: 2, p2: 2 },
        passCounts: { p1: 0, p2: 0 },
        witnessLog: [],
        arrivalTimestamps: { p1: 100, p2: 200 },
        stagedClosureSparks: [],
        closureLocked: false,
      },
    };
    return state;
  }

  describe('serverArrivedAtKether override', () => {
    it('uses serverArrivedAtKether when present so witnessOrder is server-deterministic', () => {
      // p1 already at Kether stamped 100 (server-side), p2 climbing.
      // p2's wire arrives with serverArrivedAtKether=50 — earlier than
      // p1's stamp. The wire layer must override the default
      // Date.now()-fed clock so applyMove records 50, not "now". The
      // ritual then opens with p1 (later stamp) as the first witness
      // even though p2 was the literal-last move.
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
      const state = makeState({}, { players: [p1, p2], phase: 'move', activePlayerId: 'p2' });
      const result = applyClientAction(
        state,
        {
          kind: 'move',
          playerId: 'p2',
          pathNumber: 13,
          serverArrivedAtKether: 50, // earlier than p1's 100
        },
        seededRng(1),
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.newState.phase).toBe('kether');
      // p1 (stamp 100) > p2 (server-overridden stamp 50) → p1 opens.
      expect(result.newState.ketherRitual?.witnessOrder[0]).toBe('p1');
      // p2's stamp on the state IS the server-supplied value.
      const p2After = result.newState.players.find((p) => p.id === 'p2');
      expect(p2After?.arrivedAtKetherAt).toBe(50);
    });

    it('falls back to engine-clock stamping when serverArrivedAtKether is omitted', () => {
      // Hot-seat / dev path — no server timestamp on the action. The
      // engine's default Date.now()-fed clock writes whatever the
      // current ms is; we can't pin the exact value but we can pin
      // that the field is set.
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
      const state = makeState({}, { players: [p1, p2], phase: 'move', activePlayerId: 'p2' });
      const before = Date.now();
      const result = applyClientAction(
        state,
        { kind: 'move', playerId: 'p2', pathNumber: 13 },
        seededRng(1),
      );
      const after = Date.now();
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const p2After = result.newState.players.find((p) => p.id === 'p2');
      expect(p2After?.arrivedAtKetherAt).toBeGreaterThanOrEqual(before);
      expect(p2After?.arrivedAtKetherAt).toBeLessThanOrEqual(after);
    });
  });

  describe('kether-witness-play', () => {
    it('plays the card and advances the witness pointer', () => {
      const state = makeTwoPlayerRitual();
      const result = applyClientAction(
        state,
        { kind: 'kether-witness-play', playerId: 'p2', arcanum: 5 },
        seededRng(1),
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.newState.ketherRitual?.witnessLog).toEqual([
        { kind: 'played', playerId: 'p2', arcanum: 5 },
      ]);
      expect(result.newState.ketherRitual?.witnessTurnIndex).toBe(1);
      expect(result.newState.players.find((p) => p.id === 'p2')?.hand).toEqual([6]);
    });

    it('rejects with kether cause when the engine rejects', () => {
      const state = makeTwoPlayerRitual();
      // p1 attempts to play out-of-turn; engine returns kether-not-your-turn.
      const result = applyClientAction(
        state,
        { kind: 'kether-witness-play', playerId: 'p1', arcanum: 3 },
        seededRng(1),
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe('kether');
      if (result.error.kind !== 'kether') return;
      expect(result.error.cause.kind).toBe('kether-not-your-turn');
    });
  });

  describe('kether-witness-pass', () => {
    it('passes (+1 separation) and advances pointer', () => {
      const state = makeTwoPlayerRitual();
      const result = applyClientAction(
        state,
        { kind: 'kether-witness-pass', playerId: 'p2' },
        seededRng(1),
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.newState.separation).toBe(1);
      expect(result.newState.ketherRitual?.passCounts.p2).toBe(1);
      expect(result.newState.ketherRitual?.witnessLog).toEqual([
        { kind: 'passed', playerId: 'p2' },
      ]);
    });

    it('rejects pass-cap-exceeded with kether cause', () => {
      const base = makeTwoPlayerRitual();
      // 2-card queue → cap is 1. Pre-set p2 already at the cap.
      const ritual = base.ketherRitual;
      if (!ritual) throw new Error('fixture invariant');
      const state: typeof base = {
        ...base,
        ketherRitual: {
          ...ritual,
          passCounts: { ...ritual.passCounts, p2: 1 },
        },
      };
      const result = applyClientAction(
        state,
        { kind: 'kether-witness-pass', playerId: 'p2' },
        seededRng(1),
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe('kether');
      if (result.error.kind !== 'kether') return;
      expect(result.error.cause.kind).toBe('kether-pass-cap-exceeded');
    });
  });

  describe('kether-close-stage-spark / kether-close-unstage-spark', () => {
    it('stages a held Spark when in close sub-phase', () => {
      const base = makeTwoPlayerRitual();
      const p1WithSpark = base.players.find((p) => p.id === 'p1');
      if (!p1WithSpark) throw new Error('fixture');
      const p1Updated: typeof p1WithSpark = {
        ...p1WithSpark,
        sparksHeld: new Set(['gevurah'] as const),
      };
      const ritual = base.ketherRitual;
      if (!ritual) throw new Error('fixture');
      const state: typeof base = {
        ...base,
        players: base.players.map((p) => (p.id === 'p1' ? p1Updated : p)),
        ketherRitual: { ...ritual, subPhase: 'close' },
      };
      const result = applyClientAction(
        state,
        { kind: 'kether-close-stage-spark', playerId: 'p1', sefirah: 'gevurah' },
        seededRng(1),
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.newState.ketherRitual?.stagedClosureSparks).toEqual([
        { playerId: 'p1', sefirah: 'gevurah' },
      ]);
    });

    it('unstaging is symmetric and clears the staged entry', () => {
      const base = makeTwoPlayerRitual();
      const ritual = base.ketherRitual;
      if (!ritual) throw new Error('fixture');
      const state: typeof base = {
        ...base,
        ketherRitual: {
          ...ritual,
          subPhase: 'close',
          stagedClosureSparks: [{ playerId: 'p1', sefirah: 'gevurah' }],
        },
      };
      const result = applyClientAction(
        state,
        { kind: 'kether-close-unstage-spark', playerId: 'p1', sefirah: 'gevurah' },
        seededRng(1),
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.newState.ketherRitual?.stagedClosureSparks).toEqual([]);
    });

    it('rejects stage when locked (post-confirm — kether-closure-locked)', () => {
      const base = makeTwoPlayerRitual();
      const ritual = base.ketherRitual;
      if (!ritual) throw new Error('fixture');
      const state: typeof base = {
        ...base,
        ketherRitual: {
          ...ritual,
          subPhase: 'close',
          closureLocked: true,
        },
      };
      const result = applyClientAction(
        state,
        { kind: 'kether-close-stage-spark', playerId: 'p1', sefirah: 'gevurah' },
        seededRng(1),
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe('kether');
      if (result.error.kind !== 'kether') return;
      expect(result.error.cause.kind).toBe('kether-closure-locked');
    });
  });

  describe('threshold-confirm', () => {
    it('locks the ritual and exits to phase: end', () => {
      const base = makeTwoPlayerRitual();
      const ritual = base.ketherRitual;
      if (!ritual) throw new Error('fixture');
      const state: typeof base = {
        ...base,
        illumination: 6,
        separation: 0,
        ketherRitual: { ...ritual, subPhase: 'close' },
      };
      const result = applyClientAction(
        state,
        { kind: 'threshold-confirm', playerId: 'p1' },
        seededRng(1),
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.newState.phase).toBe('end');
      expect(result.newState.ketherRitual?.closureLocked).toBe(true);
    });

    it('a second confirm rejects with kether-already-confirmed', () => {
      const base = makeTwoPlayerRitual();
      const ritual = base.ketherRitual;
      if (!ritual) throw new Error('fixture');
      const state: typeof base = {
        ...base,
        ketherRitual: {
          ...ritual,
          subPhase: 'close',
          closureLocked: true,
        },
      };
      const result = applyClientAction(
        state,
        { kind: 'threshold-confirm', playerId: 'p1' },
        seededRng(1),
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe('kether');
      if (result.error.kind !== 'kether') return;
      expect(result.error.cause.kind).toBe('kether-already-confirmed');
    });
  });

  describe('kether-host-skip-witness', () => {
    it('forces a pass on behalf of the absent witness', () => {
      const state = makeTwoPlayerRitual();
      // p1 is the host (state.players[0]); p2 is the active witness.
      const result = applyClientAction(
        state,
        {
          kind: 'kether-host-skip-witness',
          playerId: 'p1',
          targetPlayerId: 'p2',
        },
        seededRng(1),
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      // Forced pass: +1 separation, p2's pass count incremented.
      expect(result.newState.separation).toBe(1);
      expect(result.newState.ketherRitual?.passCounts.p2).toBe(1);
      expect(result.newState.ketherRitual?.witnessLog).toEqual([
        { kind: 'passed', playerId: 'p2' },
      ]);
    });

    it('falls back to a forced lowest-arcanum play when the absent witness is at their pass cap', () => {
      // Per § 7.1: disconnection cannot evade the per-player pass cap.
      // When the cap would be exceeded, the dispatcher force-plays
      // the absent player's lowest-arcanum card.
      const base = makeTwoPlayerRitual();
      const ritual = base.ketherRitual;
      if (!ritual) throw new Error('fixture');
      const state: typeof base = {
        ...base,
        ketherRitual: {
          ...ritual,
          // 2-card queue → cap is 1; pre-set p2 already at the cap.
          passCounts: { ...ritual.passCounts, p2: 1 },
        },
      };
      const result = applyClientAction(
        state,
        {
          kind: 'kether-host-skip-witness',
          playerId: 'p1',
          targetPlayerId: 'p2',
        },
        seededRng(1),
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      // Forced play of p2's lowest arcanum (5 of {5,6}) — separation
      // does NOT increment (play, not pass), and pass counts are
      // unchanged.
      expect(result.newState.separation).toBe(0);
      expect(result.newState.ketherRitual?.witnessLog).toEqual([
        { kind: 'played', playerId: 'p2', arcanum: 5 },
      ]);
      expect(result.newState.players.find((p) => p.id === 'p2')?.hand).toEqual([6]);
    });
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
    const result = applyClientAction(state, { kind: 'end-turn', playerId: 'p1' }, seededRng(1));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newState.activePlayerId).toBe('p1');
    expect(result.newState.pendingDiscard?.count).toBe(2);
  });
});
