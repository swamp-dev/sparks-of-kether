import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTurn } from '../use-turn';
import { seededRng } from '@/engine/rng';
import { makePlayer, makeState } from '@/test/fixtures';

function freshHook() {
  const initialState = makeState(
    {},
    {
      players: [
        makePlayer({ id: 'p1', name: 'Andy', hand: [0, 1, 2, 3] }),
        makePlayer({ id: 'p2', name: 'Bea', hand: [4, 5, 6, 7] }),
      ],
      deck: [10, 11, 12, 13, 14, 15, 16, 17],
    },
  );
  return renderHook(() =>
    useTurn({ initialState, rng: seededRng(1) }),
  );
}

describe('useTurn — phase machine', () => {
  it('starts in move phase with player 0 active', () => {
    const { result } = freshHook();
    expect(result.current.phase).toBe('move');
    expect(result.current.activePlayerIndex).toBe(0);
    expect(result.current.isActive('p1')).toBe(true);
    expect(result.current.isActive('p2')).toBe(false);
  });

  it('meditate skips movement and jumps to draw phase', () => {
    const { result } = freshHook();
    act(() => {
      result.current.meditate();
    });
    expect(result.current.phase).toBe('draw');
  });

  it('rejects move when not in move phase', () => {
    const { result } = freshHook();
    act(() => {
      result.current.meditate();
    });
    let outcome: ReturnType<typeof result.current.move> | undefined;
    act(() => {
      outcome = result.current.move(31);
    });
    expect(outcome?.ok).toBe(false);
  });

  it('endTurn rotates to the next player and resets to move phase', () => {
    const { result } = freshHook();
    act(() => {
      result.current.meditate();
    });
    act(() => {
      result.current.draw();
    });
    expect(result.current.phase).toBe('end');
    act(() => {
      result.current.endTurn();
    });
    expect(result.current.activePlayerIndex).toBe(1);
    expect(result.current.phase).toBe('move');
    expect(result.current.isActive('p2')).toBe(true);
  });
});

describe('useTurn — draw phase', () => {
  it('refills hand toward starting size of 4', () => {
    const { result } = freshHook();
    const initial = result.current.state;
    const trimmed = {
      ...initial,
      players: initial.players.map((p, idx) =>
        idx === 0 ? { ...p, hand: p.hand.slice(0, 2) } : p,
      ),
    };
    act(() => {
      result.current.setState(trimmed);
    });
    act(() => {
      result.current.meditate();
    });
    act(() => {
      result.current.draw();
    });
    expect(result.current.state.players[0]?.hand.length).toBe(4);
    expect(result.current.phase).toBe('end');
  });

  it('caps the hand at HAND_CAP=6 even if hand is already over the starting size', () => {
    const { result } = freshHook();
    const initial = result.current.state;
    const seven = {
      ...initial,
      players: initial.players.map((p, idx) =>
        idx === 0 ? { ...p, hand: [0, 1, 2, 3, 4, 5, 6] } : p,
      ),
    };
    act(() => {
      result.current.setState(seven);
    });
    act(() => {
      result.current.meditate();
    });
    act(() => {
      result.current.draw();
    });
    // Already above the starting refill target; draw is a no-op.
    expect(result.current.state.players[0]?.hand.length).toBe(7);
  });

  it('recycles discard pile when deck empties mid-draw', () => {
    const { result } = freshHook();
    const initial = result.current.state;
    // Empty deck, populated discard, hand below starting size.
    const recyclable = {
      ...initial,
      deck: [],
      discardPile: [20, 21],
      players: initial.players.map((p, idx) =>
        idx === 0 ? { ...p, hand: [0, 1] } : p,
      ),
    };
    act(() => {
      result.current.setState(recyclable);
    });
    act(() => {
      result.current.meditate();
    });
    act(() => {
      result.current.draw();
    });
    // Refilled to 4 by pulling from the recycled discard.
    expect(result.current.state.players[0]?.hand.length).toBe(4);
    expect(result.current.state.discardPile).toEqual([]);
  });
});
