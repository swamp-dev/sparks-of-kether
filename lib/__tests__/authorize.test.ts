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
    kind: 'submit-challenge',
    build: (id) => ({
      kind: 'submit-challenge',
      playerId: id,
      sefirah: 'gevurah',
      modifiers: { assistStats: [], cardBurns: 0, sparkBurns: 0, shortcutPenalty: false },
    }),
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
