import { describe, expect, it } from 'vitest';
import { applyClientAction } from '../room-actions';
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

describe('applyClientAction — submit-challenge', () => {
  it('applies pre-rolled outcome (no double roll)', () => {
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
    const state = makeState({}, { players: [player] });
    const result = applyClientAction(
      state,
      {
        kind: 'submit-challenge',
        playerId: 'p1',
        sefirah: 'gevurah',
        modifiers: {
          assistStats: [],
          cardBurns: 0,
          sparkBurns: 0,
          shortcutPenalty: false,
        },
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
    // Pass → Sefirah cleared, Spark earned.
    expect(result.newState.players[0]?.clearedSefirot.has('gevurah')).toBe(true);
    expect(result.newState.players[0]?.sparksHeld.has('gevurah')).toBe(true);
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

  it('rejects with hand-full when the player is already at HAND_CAP=6', () => {
    // The dispatcher rejects rather than silently applying a no-op so
    // a direct API caller sees an explicit signal. The route writes a
    // `rejected:meditate` audit row instead of a phantom `meditate`
    // event recording an action that drew zero cards.
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
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('meditate');
    if (result.error.kind !== 'meditate') return;
    expect(result.error.cause).toBe('hand-full');
  });

  it('reports unknown-player BEFORE hand-full — guard order pinned', () => {
    // Round-3 review pin: ensure the dispatcher checks for player
    // existence first. If the guards were reordered (or merged), a
    // ghost playerId could surface as `hand-full` based on someone
    // else's hand state, which is misleading. The state below has
    // ONE real player whose hand is at HAND_CAP; meditating as a
    // ghost must report unknown-player, not hand-full.
    const realFullHand = makePlayer({ id: 'p1', hand: [1, 2, 3, 4, 5, 6] });
    const state = makeState({}, { players: [realFullHand] });
    const result = applyClientAction(
      state,
      { kind: 'meditate', playerId: 'ghost' },
      seededRng(1),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    if (result.error.kind !== 'meditate') return;
    expect(result.error.cause).toBe('unknown-player');
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
