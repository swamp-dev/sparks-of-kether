import { describe, expect, it } from 'vitest';
import { endTurn } from '../turn';
import { makePlayer, makeState } from '@/test/fixtures';

describe('endTurn', () => {
  it('advances the active player to the next seat', () => {
    const players = [
      makePlayer({ id: 'p1' }),
      makePlayer({ id: 'p2' }),
      makePlayer({ id: 'p3' }),
    ];
    const state = makeState({}, { players, activePlayerId: 'p1' });
    expect(endTurn(state).activePlayerId).toBe('p2');
  });

  it('wraps from the last seat back to the first', () => {
    const players = [
      makePlayer({ id: 'p1' }),
      makePlayer({ id: 'p2' }),
      makePlayer({ id: 'p3' }),
    ];
    const state = makeState({}, { players, activePlayerId: 'p3' });
    expect(endTurn(state).activePlayerId).toBe('p1');
  });

  it('is a no-op for a single-player state (wraps back to self)', () => {
    const state = makeState({ id: 'solo' });
    expect(endTurn(state).activePlayerId).toBe('solo');
  });

  it('preserves all other state fields untouched', () => {
    const players = [makePlayer({ id: 'p1' }), makePlayer({ id: 'p2' })];
    const state = makeState(
      {},
      {
        players,
        activePlayerId: 'p1',
        illumination: 4,
        separation: 2,
        deck: [1, 2, 3],
      },
    );
    const next = endTurn(state);
    expect(next.illumination).toBe(4);
    expect(next.separation).toBe(2);
    expect(next.deck).toEqual([1, 2, 3]);
    expect(next.players).toBe(state.players);
  });

  it('throws if the active id is not in the player list (corruption guard)', () => {
    const players = [makePlayer({ id: 'p1' })];
    const state = makeState({}, { players, activePlayerId: 'unknown' });
    expect(() => endTurn(state)).toThrow(/active player/i);
  });
});
