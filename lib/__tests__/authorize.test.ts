import { describe, expect, it } from 'vitest';
import { authorize } from '../authorize';
import type { ClientAction } from '../room-actions';
import { makePlayer, makeState } from '@/test/fixtures';

const players = [
  makePlayer({ id: 'p1' }),
  makePlayer({ id: 'p2' }),
];
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
    const result = authorize(
      { kind: 'move', playerId: 'p1', pathNumber: 13 },
      state,
      'p2',
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('identity-mismatch');
  });
});

describe('authorize — Kether ritual gates (#350)', () => {
  // Two-player in-ritual fixture: phase: 'kether', ritual at witness
  // sub-phase, p2 the round-robin opener. p1 is the host (seat 0).
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
      },
    );
  }

  describe('kether-witness-play / kether-witness-pass', () => {
    it('allows the current witness to play (bypasses active-player gate)', () => {
      const k = ketherFixture();
      // Note: state.activePlayerId is p1 (frozen at ritual entry per
      // design § 3.3) but the gate uses the witness pointer instead.
      const result = authorize(
        { kind: 'kether-witness-play', playerId: 'p2', arcanum: 5 },
        k,
        'p2',
      );
      expect(result.ok).toBe(true);
    });

    it('rejects a non-witness with not-witness-turn', () => {
      const k = ketherFixture();
      const result = authorize(
        { kind: 'kether-witness-pass', playerId: 'p1' },
        k,
        'p1',
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason.kind).toBe('not-witness-turn');
      if (result.reason.kind !== 'not-witness-turn') return;
      expect(result.reason.expectedPlayerId).toBe('p2');
    });
  });

  describe('kether-close-stage-spark / kether-close-unstage-spark / threshold-confirm', () => {
    it('allows any player (identity-bound only) to stage / unstage / confirm', () => {
      const k = ketherFixture();
      // p1 is NOT the active witness, but stage/unstage/confirm are
      // open to any player per § 3.3.
      for (const action of [
        { kind: 'kether-close-stage-spark', playerId: 'p1', sefirah: 'gevurah' },
        {
          kind: 'kether-close-unstage-spark',
          playerId: 'p1',
          sefirah: 'gevurah',
        },
        { kind: 'threshold-confirm', playerId: 'p1' },
      ] as const) {
        const r = authorize(action, k, 'p1');
        expect(r.ok).toBe(true);
      }
    });
  });

  describe('kether-host-skip-witness', () => {
    it('allows the host (state.players[0]) to dispatch on behalf of an absent witness', () => {
      const k = ketherFixture();
      const result = authorize(
        {
          kind: 'kether-host-skip-witness',
          playerId: 'p1',
          targetPlayerId: 'p2',
        },
        k,
        'p1',
      );
      expect(result.ok).toBe(true);
    });

    it('rejects a non-host caller with not-host', () => {
      const k = ketherFixture();
      const result = authorize(
        {
          kind: 'kether-host-skip-witness',
          playerId: 'p2',
          targetPlayerId: 'p1',
        },
        k,
        'p2',
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason.kind).toBe('not-host');
      if (result.reason.kind !== 'not-host') return;
      expect(result.reason.hostId).toBe('p1');
    });

    it('rejects when targetPlayerId is not the current witness (§ 7.1 gate b)', () => {
      // Host attempting to skip a non-witness target. The engine's
      // ketherPassCard would also reject (kether-not-your-turn), but
      // the authorize layer must enforce this independently — the
      // design's three-gate rule for host-skip is the authoritative
      // contract. Without this gate, a host can probe witness-identity
      // via 422-vs-403 response shapes.
      const k = ketherFixture();
      // p2 is the current witness; targeting p1 should reject.
      const result = authorize(
        {
          kind: 'kether-host-skip-witness',
          playerId: 'p1',
          targetPlayerId: 'p1',
        },
        k,
        'p1',
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason.kind).toBe('not-witness-turn');
      if (result.reason.kind !== 'not-witness-turn') return;
      expect(result.reason.expectedPlayerId).toBe('p2');
      expect(result.reason.targetPlayerId).toBe('p1');
      expect(result.reason.action).toBe('kether-host-skip-witness');
    });
  });
});
