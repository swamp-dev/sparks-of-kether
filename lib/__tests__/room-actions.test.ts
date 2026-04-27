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
