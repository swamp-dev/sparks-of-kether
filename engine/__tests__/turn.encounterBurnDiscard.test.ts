import { describe, expect, it } from 'vitest';
import { encounterBurnDiscard } from '../turn';
import { makePlayer, makeState } from '@/test/fixtures';

describe('encounterBurnDiscard', () => {
  it('removes the specified card from the active player hand', () => {
    const player = makePlayer({ id: 'p1', hand: [0, 1, 2] });
    const state = makeState({}, { players: [player], activePlayerId: 'p1', discardPile: [] });
    const next = encounterBurnDiscard(state, 'p1', 1);
    expect(next.players[0]!.hand).toEqual([0, 2]);
  });

  it('adds the discarded card to the discard pile', () => {
    const player = makePlayer({ id: 'p1', hand: [5, 10, 15] });
    const state = makeState({}, { players: [player], activePlayerId: 'p1', discardPile: [3] });
    const next = encounterBurnDiscard(state, 'p1', 10);
    expect(next.discardPile).toEqual([3, 10]);
  });

  it('removes only the first occurrence when the card appears twice', () => {
    const player = makePlayer({ id: 'p1', hand: [7, 7, 14] });
    const state = makeState({}, { players: [player], activePlayerId: 'p1', discardPile: [] });
    const next = encounterBurnDiscard(state, 'p1', 7);
    expect(next.players[0]!.hand).toEqual([7, 14]);
    expect(next.discardPile).toEqual([7]);
  });

  it('is a no-op when the card is not in the player hand', () => {
    const player = makePlayer({ id: 'p1', hand: [0, 1] });
    const state = makeState({}, { players: [player], activePlayerId: 'p1', discardPile: [] });
    const next = encounterBurnDiscard(state, 'p1', 99);
    expect(next).toBe(state);
  });

  it('is a no-op when the player id is not found', () => {
    const player = makePlayer({ id: 'p1', hand: [0, 1] });
    const state = makeState({}, { players: [player], activePlayerId: 'p1', discardPile: [] });
    const next = encounterBurnDiscard(state, 'unknown', 0);
    expect(next).toBe(state);
  });

  it('leaves all other state fields unchanged', () => {
    const players = [makePlayer({ id: 'p1', hand: [3, 5] }), makePlayer({ id: 'p2', hand: [8] })];
    const state = makeState(
      {},
      {
        players,
        activePlayerId: 'p1',
        discardPile: [1],
        illumination: 7,
        separation: 2,
        deck: [10, 11],
      },
    );
    const next = encounterBurnDiscard(state, 'p1', 3);
    expect(next.illumination).toBe(7);
    expect(next.separation).toBe(2);
    expect(next.deck).toEqual([10, 11]);
    expect(next.activePlayerId).toBe('p1');
    // p2 is untouched
    expect(next.players[1]).toBe(players[1]);
  });

  it('does not mutate the original state', () => {
    const player = makePlayer({ id: 'p1', hand: [0, 1, 2] });
    const state = makeState({}, { players: [player], activePlayerId: 'p1', discardPile: [] });
    encounterBurnDiscard(state, 'p1', 1);
    expect(state.players[0]!.hand).toEqual([0, 1, 2]);
    expect(state.discardPile).toEqual([]);
  });
});
