import { describe, expect, it } from 'vitest';
import type { GameState } from '@/engine/types';
import { makeRoom, makeFullGame } from '../fixtures';
import { scenario, ScenarioFailedError } from '../scenario';

describe('makeRoom', () => {
  it('returns a RoomRow with sensible lobby defaults', () => {
    const room = makeRoom();
    expect(room.state).toBe('lobby');
    expect(room.host_id).toBe('host-uid');
    expect(room.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(room.started_at).toBeNull();
    expect(room.finished_at).toBeNull();
  });

  it('honors overrides', () => {
    const room = makeRoom({
      code: 'ZZZZZZ',
      state: 'playing',
      host_id: 'someone-else',
      started_at: '2026-04-27T00:00:00Z',
    });
    expect(room.code).toBe('ZZZZZZ');
    expect(room.state).toBe('playing');
    expect(room.host_id).toBe('someone-else');
    expect(room.started_at).toBe('2026-04-27T00:00:00Z');
  });
});

describe('makeFullGame', () => {
  it('builds a fully-dealt 2-player GameState with seat 0 active', () => {
    const state = makeFullGame({ playerCount: 2, seed: 42 });
    expect(state.players).toHaveLength(2);
    // Every player at malkuth, dealt the standard hand size.
    for (const p of state.players) {
      expect(p.position).toBe('malkuth');
      expect(p.hand).toHaveLength(4);
    }
    expect(state.activePlayerId).toBe(state.players[0]?.id);
    // Counters start at zero.
    expect(state.illumination).toBe(0);
    expect(state.separation).toBe(0);
    // Zodiac signs unique by default.
    const signs = state.players.map((p) => p.zodiacSign);
    expect(new Set(signs).size).toBe(state.players.length);
  });

  it('is deterministic for the same seed', () => {
    const a = makeFullGame({ playerCount: 4, seed: 7 });
    const b = makeFullGame({ playerCount: 4, seed: 7 });
    // Deck order, hand contents, all derived state must match.
    expect(a.deck).toEqual(b.deck);
    expect(a.players.map((p) => p.hand)).toEqual(b.players.map((p) => p.hand));
  });

  it('produces different state for different seeds', () => {
    const a = makeFullGame({ playerCount: 2, seed: 1 });
    const b = makeFullGame({ playerCount: 2, seed: 999_999 });
    // One of these should differ — deck shuffling is the surface.
    expect(a.deck).not.toEqual(b.deck);
  });

  it('honors a custom zodiacSigns ordering', () => {
    const state = makeFullGame({
      playerCount: 2,
      seed: 1,
      zodiacSigns: ['aries', 'leo'],
    });
    // The seat-by-seat zodiacSign pass-through is the simplest signal
    // that the mapping landed in the expected seat order; the dignity
    // bonuses are exercised in `engine/__tests__/setup.test.ts`.
    expect(state.players[0]?.zodiacSign).toBe('aries');
    expect(state.players[1]?.zodiacSign).toBe('leo');
  });

  it('rejects out-of-range player counts (1 or 5+)', () => {
    // Cast through `unknown` because the TypeScript signature
    // narrows to 2 | 3 | 4. The runtime guard is the actual gate
    // we want to assert; pretend a caller has bypassed the type.
    const bad = (n: number) =>
      ({ playerCount: n, seed: 0 }) as unknown as Parameters<typeof makeFullGame>[0];
    expect(() => makeFullGame(bad(1))).toThrow();
    expect(() => makeFullGame(bad(5))).toThrow();
  });
});

describe('scenario', () => {
  it('chains valid actions and returns the final state', () => {
    // 2-player game; player 0 ends their turn → activePlayerId
    // rotates to player 1.
    // #522: `applyClientAction` now refuses end-turn from a fresh-
    // 'move' player who hasn't meditated. Override the seed phase to
    // 'end' so this scenario reflects a legitimate end-of-turn state
    // ready to rotate the seat.
    const base = makeFullGame({ playerCount: 2, seed: 11 });
    const initial: GameState = { ...base, phase: 'end' };
    const p0 = initial.players[0]!.id;
    const p1 = initial.players[1]!.id;
    const final = scenario(initial).endTurn(p0).run();
    expect(final.activePlayerId).toBe(p1);
  });

  it('throws ScenarioFailedError on a rejected step with full context', () => {
    // Out-of-turn end-turn — applyClientAction returns ok:true (the
    // engine reducer is permissive) but a non-active end-turn
    // *would* be rejected by `lib/authorize`. The scenario builder
    // surfaces engine-level rejection only; at the room-action
    // layer move with an unowned card is the canonical reject case.
    const initial = makeFullGame({ playerCount: 2, seed: 11 });
    const p0 = initial.players[0]!.id;
    // Path 1 is Malkuth ↔ Yesod via "The Fool" (arcanum 0). The
    // player likely does not hold card 0; if they do, swap to a
    // path number unlikely to be in their hand. We pick path 99
    // which is invalid by definition (paths run 11–32).
    expect(() => scenario(initial).move(p0, 99).run()).toThrow(ScenarioFailedError);
  });

  it('snapshots stateAtFailure (the snapshot is decoupled from the live state object)', () => {
    // Reviewer flagged on #97: stateAtFailure was a live reference; a
    // caller could mutate it and corrupt the engine's working state.
    // The fix is structuredClone in the constructor.
    //
    // To prove the invariant we need a handle on the *live* state
    // object stored as stateAtFailure. We get one by running a
    // scenario that successfully ends a turn first (producing a
    // new state via the engine reducer), then feeding that returned
    // state into a new scenario whose first step fails. The failing
    // scenario's stateAtFailure should be a CLONE of the handle we
    // already have — so mutating the clone must not change the
    // original.
    // #522: end-turn requires phase 'end' (or 'move' + meditatedThisTurn).
    // Seed phase 'end' so the end-turn step reflects a legitimate
    // post-action state; the test's actual subject is the
    // structuredClone invariant on stateAtFailure, not the phase.
    const base = makeFullGame({ playerCount: 2, seed: 11 });
    const initial: GameState = { ...base, phase: 'end' };
    const p0 = initial.players[0]!.id;
    const after = scenario(initial).endTurn(p0).run();
    // `after` is a fresh state produced by the engine reducer. If
    // structuredClone is missing in the error constructor, this
    // exact object would be aliased as err.stateAtFailure.
    expect(after).not.toBe(initial); // sanity: engine returned a new object
    try {
      // Path 99 is invalid → scenario rejects on the first step,
      // throwing with stateAtFailure capturing `after`.
      scenario(after).move(p0, 99).run();
      throw new Error('expected scenario to fail');
    } catch (err) {
      if (!(err instanceof ScenarioFailedError)) throw err;
      // The clone has the same value as `after`...
      expect(err.stateAtFailure.activePlayerId).toBe(after.activePlayerId);
      // ...but is a different object. Cast through `unknown` to
      // bypass readonly and prove the field is independent.
      (err.stateAtFailure as unknown as { separation: number }).separation = 9999;
      // Without structuredClone, this would now also be 9999.
      expect(after.separation).not.toBe(9999);
    }
  });

  it('exposes the rejection error kind on failure', () => {
    const initial = makeFullGame({ playerCount: 2, seed: 11 });
    const p0 = initial.players[0]!.id;
    try {
      scenario(initial).move(p0, 99).run();
    } catch (err) {
      expect(err).toBeInstanceOf(ScenarioFailedError);
      const e = err as ScenarioFailedError;
      // Step index identifies which action failed (zero-based).
      expect(e.stepIndex).toBe(0);
      expect(e.action.kind).toBe('move');
    }
  });
});
