import { describe, expect, it } from 'vitest';
import { authorize } from '../authorize';
import type { ClientAction } from '../room-actions';
import { makePlayer, makeState } from '@/test/fixtures';

const players = [makePlayer({ id: 'p1' }), makePlayer({ id: 'p2' })];
const state = makeState({}, { players, activePlayerId: 'p1' });

const actions: { kind: ClientAction['kind']; build: (id: string) => ClientAction }[] = [
  {
    kind: 'move',
    build: (id) => ({ kind: 'move', playerId: id, pathNumber: 13 }),
  },
  {
    kind: 'prep-add-modifier',
    build: (id) => ({
      kind: 'prep-add-modifier',
      playerId: id,
      modifier: { kind: 'card-burn', arcanum: 5 },
    }),
  },
  {
    kind: 'prep-remove-modifier',
    build: (id) => ({
      kind: 'prep-remove-modifier',
      playerId: id,
      modifier: { kind: 'card-burn', arcanum: 5 },
    }),
  },
  {
    kind: 'prep-confirm',
    build: (id) => ({
      kind: 'prep-confirm',
      playerId: id,
      sefirah: 'gevurah',
    }),
  },
  {
    kind: 'react-retry',
    build: (id) => ({ kind: 'react-retry', playerId: id }),
  },
  {
    kind: 'react-continue',
    build: (id) => ({ kind: 'react-continue', playerId: id }),
  },
  {
    kind: 'accept-setback',
    build: (id) => ({ kind: 'accept-setback', playerId: id, sefirah: 'gevurah' }),
  },
  {
    kind: 'end-turn',
    build: (id) => ({ kind: 'end-turn', playerId: id }),
  },
];

describe('authorize — turn-locked actions', () => {
  for (const { kind, build } of actions) {
    it(`allows the active player to submit "${kind}"`, () => {
      const result = authorize(build('p1'), state, 'p1');
      expect(result.ok).toBe(true);
    });

    it(`rejects a non-active player submitting "${kind}" (wrong-turn)`, () => {
      const result = authorize(build('p2'), state, 'p2');
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason.kind).toBe('not-active-player');
    });
  }
});

describe('authorize — identity binding', () => {
  it('rejects when the action.playerId does not match callerId, even if caller is active', () => {
    // The route already runs an identity check before calling
    // authorize, but authorize is a defense-in-depth pure function
    // that callers can invoke without the route's auth gate.
    const result = authorize({ kind: 'move', playerId: 'p1', pathNumber: 13 }, state, 'p2');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('identity-mismatch');
  });
});

describe('authorize — Kether ritual gates (#350)', () => {
  // Two-player in-ritual fixture: phase 'kether', trial sub-phase,
  // p2 is the current trial player (trialOrder[0]).
  function ketherFixture() {
    const players = [
      makePlayer({
        id: 'p1',
        position: 'kether',
        hand: [3, 4],
        arrivedAtKetherAt: 100,
      }),
      makePlayer({
        id: 'p2',
        position: 'kether',
        hand: [5, 6],
        arrivedAtKetherAt: 200,
      }),
    ];
    return makeState(
      {},
      {
        players,
        activePlayerId: 'p1',
        phase: 'kether',
        ketherRitual: {
          subPhase: 'trial',
          trialOrder: ['p2', 'p1'],
          trialTurnIndex: 0,
          trialChallenges: [
            { sefirahKey: 'chokmah', stat: 'insight', dc: 14, roll: null, passed: null },
            { sefirahKey: 'binah', stat: 'understanding', dc: 14, roll: null, passed: null },
          ],
          trialStagedSparks: [],
          arrivalTimestamps: { p1: 100, p2: 200 },
          stagedClosureSparks: [],
          closureLocked: false,
        },
      },
    );
  }

  describe('kether-trial-resolve', () => {
    it('allows the current trial player to resolve (bypasses active-player gate)', () => {
      const k = ketherFixture();
      const result = authorize({ kind: 'kether-trial-resolve', playerId: 'p2' }, k, 'p2');
      expect(result.ok).toBe(true);
    });

    it('rejects a non-trial-player with not-trial-turn', () => {
      const k = ketherFixture();
      const result = authorize({ kind: 'kether-trial-resolve', playerId: 'p1' }, k, 'p1');
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason.kind).toBe('not-trial-turn');
      if (result.reason.kind !== 'not-trial-turn') return;
      expect(result.reason.expectedPlayerId).toBe('p2');
    });
  });

  describe('kether-trial-stage-spark / kether-trial-unstage-spark', () => {
    it('allows any player to stage or unstage a Spark during trial', () => {
      const k = ketherFixture();
      for (const action of [
        { kind: 'kether-trial-stage-spark', playerId: 'p1', sefirah: 'gevurah' },
        { kind: 'kether-trial-unstage-spark', playerId: 'p1', sefirah: 'gevurah' },
      ] as const) {
        const r = authorize(action, k, 'p1');
        expect(r.ok).toBe(true);
      }
    });
  });

  describe('kether-close-stage-spark / kether-close-unstage-spark / threshold-confirm', () => {
    it('allows any player (identity-bound only) to stage / unstage / confirm', () => {
      const k = ketherFixture();
      for (const action of [
        { kind: 'kether-close-stage-spark', playerId: 'p1', sefirah: 'gevurah' },
        { kind: 'kether-close-unstage-spark', playerId: 'p1', sefirah: 'gevurah' },
        { kind: 'threshold-confirm', playerId: 'p1' },
      ] as const) {
        const r = authorize(action, k, 'p1');
        expect(r.ok).toBe(true);
      }
    });
  });
});
