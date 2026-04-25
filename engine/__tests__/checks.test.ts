import { describe, expect, it } from 'vitest';
import { seededRng } from '../rng';
import {
  rollCheck,
  resolveChallenge,
  acceptSetback,
  CARD_BURN_BONUS,
  SPARK_BURN_BONUS,
  SHORTCUT_DC_PENALTY,
  type CheckModifiers,
} from '../checks';
import { makePlayer, makeState, statSheet } from '@/test/fixtures';
import type { GameState } from '../types';

// ──────────────── rollCheck (pure math) ────────────────

describe('rollCheck', () => {
  const blank: CheckModifiers = {
    assistStats: [],
    cardBurns: 0,
    sparkBurns: 0,
    shortcutPenalty: false,
  };

  it('passes when rolled + stat meets the DC exactly', () => {
    // Seeded to roll 8; stat 8 → total 16, DC 16 → pass (≥, not >).
    const rng = { d20: () => 8, int: () => 8 };
    const outcome = rollCheck({ stat: 8, dc: 16, modifiers: blank, rng });
    expect(outcome.rolled).toBe(8);
    expect(outcome.total).toBe(16);
    expect(outcome.pass).toBe(true);
  });

  it('fails when rolled + stat misses the DC by 1', () => {
    const rng = { d20: () => 7, int: () => 7 };
    const outcome = rollCheck({ stat: 8, dc: 16, modifiers: blank, rng });
    expect(outcome.total).toBe(15);
    expect(outcome.pass).toBe(false);
  });

  it('adds half of each assisting ally stat, floored', () => {
    const rng = { d20: () => 5, int: () => 5 };
    // Stat 10 + roll 5 = 15. Allies with 6 and 7 → +3 + +3 = +6.
    // Total = 21 ≥ DC 20 → pass.
    const outcome = rollCheck({
      stat: 10,
      dc: 20,
      modifiers: { ...blank, assistStats: [6, 7] },
      rng,
    });
    expect(outcome.modifierBreakdown.assist).toBe(6);
    expect(outcome.total).toBe(21);
    expect(outcome.pass).toBe(true);
  });

  it('stacks card burns — each adds +3', () => {
    const rng = { d20: () => 5, int: () => 5 };
    // Stat 5 + roll 5 + 2 burns (+6) = 16. DC 15 → pass.
    const outcome = rollCheck({
      stat: 5,
      dc: 15,
      modifiers: { ...blank, cardBurns: 2 },
      rng,
    });
    expect(outcome.modifierBreakdown.cardBurn).toBe(2 * CARD_BURN_BONUS);
    expect(outcome.total).toBe(16);
    expect(outcome.pass).toBe(true);
  });

  it('stacks spark burns — each adds +5', () => {
    const rng = { d20: () => 4, int: () => 4 };
    // Stat 1 + roll 4 + 2 sparks (+10) = 15. DC 15 → pass.
    const outcome = rollCheck({
      stat: 1,
      dc: 15,
      modifiers: { ...blank, sparkBurns: 2 },
      rng,
    });
    expect(outcome.modifierBreakdown.sparkBurn).toBe(2 * SPARK_BURN_BONUS);
    expect(outcome.total).toBe(15);
    expect(outcome.pass).toBe(true);
  });

  it('applies the shortcut-path penalty as +DC (not a modifier subtraction)', () => {
    const rng = { d20: () => 10, int: () => 10 };
    // Stat 10 + roll 10 = 20. Base DC 16 → pass. With penalty, effective
    // DC = 19 → still pass.
    const noPenalty = rollCheck({ stat: 10, dc: 16, modifiers: blank, rng });
    const withPenalty = rollCheck({
      stat: 10,
      dc: 16,
      modifiers: { ...blank, shortcutPenalty: true },
      rng,
    });
    expect(noPenalty.effectiveDC).toBe(16);
    expect(withPenalty.effectiveDC).toBe(16 + SHORTCUT_DC_PENALTY);
    expect(withPenalty.pass).toBe(true); // Stat+roll 20 still beats 19.
  });

  it('same seed produces identical outcomes', () => {
    const rng1 = seededRng(42);
    const rng2 = seededRng(42);
    const out1 = rollCheck({ stat: 10, dc: 15, modifiers: blank, rng: rng1 });
    const out2 = rollCheck({ stat: 10, dc: 15, modifiers: blank, rng: rng2 });
    expect(out1).toEqual(out2);
  });

  it('different seeds diverge within a few calls', () => {
    const rng1 = seededRng(1);
    const rng2 = seededRng(2);
    const rolls1 = [rng1.d20(), rng1.d20(), rng1.d20()];
    const rolls2 = [rng2.d20(), rng2.d20(), rng2.d20()];
    expect(rolls1).not.toEqual(rolls2);
  });
});

// ──────────────── resolveChallenge (state mutation) ────────────────

describe('resolveChallenge', () => {
  function stateAtSefirah(position: 'yesod' | 'hod' | 'netzach' | 'tiferet'): GameState {
    // Default hand empty; all stats 10; one player.
    return makeState({ position });
  }

  it('rejects unknown player', () => {
    const state = stateAtSefirah('yesod');
    const result = resolveChallenge({
      state,
      playerId: 'missing',
      sefirah: 'yesod',
      modifiers: { assistStats: [], cardBurns: 0, sparkBurns: 0, shortcutPenalty: false },
      rng: seededRng(1),
    });
    expect(result).toEqual({ ok: false, reason: { kind: 'unknown-player', playerId: 'missing' } });
  });

  it('rejects a Sefirah whose challenge kind is not `check` (Malkuth)', () => {
    const state = makeState({ position: 'malkuth' });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'malkuth',
      modifiers: { assistStats: [], cardBurns: 0, sparkBurns: 0, shortcutPenalty: false },
      rng: seededRng(1),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('no-standard-check');
  });

  it('rejects a Sefirah whose challenge kind is not `check` (Kether collective)', () => {
    const state = makeState({ position: 'kether' });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'kether',
      modifiers: { assistStats: [], cardBurns: 0, sparkBurns: 0, shortcutPenalty: false },
      rng: seededRng(1),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('no-standard-check');
  });

  it('rejects re-attempting an already-cleared Sefirah for this player', () => {
    const state = makeState({
      position: 'yesod',
      clearedSefirot: new Set(['yesod']),
    });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'yesod',
      modifiers: { assistStats: [], cardBurns: 0, sparkBurns: 0, shortcutPenalty: false },
      rng: seededRng(1),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('already-cleared');
  });

  it('on success: marks Sefirah cleared, awards Spark, +1 Illumination, state unchanged otherwise', () => {
    // Yesod DC = 10, Intuition stat 20 + any roll ≥ 0 will pass.
    const state = makeState({
      position: 'yesod',
      stats: statSheet({ intuition: 20 }),
    });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'yesod',
      modifiers: { assistStats: [], cardBurns: 0, sparkBurns: 0, shortcutPenalty: false },
      rng: seededRng(1),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { newState, outcome } = result.value;
    expect(outcome.pass).toBe(true);

    const player = newState.players[0];
    expect(player?.clearedSefirot).toEqual(new Set(['yesod']));
    expect(player?.sparksHeld).toEqual(new Set(['yesod']));
    expect(newState.illumination).toBe(1);
    expect(newState.separation).toBe(0);
  });

  it('on failure: returns the outcome but does NOT mutate counters / clearedSefirot', () => {
    // Intuition 1 + any d20 roll ≤ 9 + no mods fails DC 10.
    const state = makeState({
      position: 'yesod',
      stats: statSheet({ intuition: 1 }),
    });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'yesod',
      modifiers: { assistStats: [], cardBurns: 0, sparkBurns: 0, shortcutPenalty: false },
      // Seed tuned to ensure we roll ≤ 8.
      rng: { d20: () => 3, int: () => 3 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { newState, outcome } = result.value;
    expect(outcome.pass).toBe(false);
    expect(newState).toBe(state); // same reference — unchanged state on failure
    const player = newState.players[0];
    expect(player?.clearedSefirot.size).toBe(0);
    expect(player?.sparksHeld.size).toBe(0);
    expect(newState.illumination).toBe(0);
    expect(newState.separation).toBe(0);
  });

  it('honours the shortcut-penalty modifier on challenge resolution', () => {
    // Yesod base DC = 10. With shortcut penalty, effective 13.
    // Intuition 5 + roll 7 = 12 < 13 → fail. Without penalty: 12 ≥ 10 → pass.
    const state = makeState({
      position: 'yesod',
      stats: statSheet({ intuition: 5 }),
    });
    const noPenalty = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'yesod',
      modifiers: { assistStats: [], cardBurns: 0, sparkBurns: 0, shortcutPenalty: false },
      rng: { d20: () => 7, int: () => 7 },
    });
    const withPenalty = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'yesod',
      modifiers: { assistStats: [], cardBurns: 0, sparkBurns: 0, shortcutPenalty: true },
      rng: { d20: () => 7, int: () => 7 },
    });

    expect(noPenalty.ok && noPenalty.value.outcome.pass).toBe(true);
    expect(withPenalty.ok && withPenalty.value.outcome.pass).toBe(false);
  });
});

// ──────────────── acceptSetback ────────────────

describe('acceptSetback', () => {
  it('increments separation by 1 and returns new state', () => {
    const state = makeState({ position: 'yesod' });
    const next = acceptSetback(state, { playerId: 'p1', sefirah: 'yesod' });
    expect(next.separation).toBe(1);
    expect(next).not.toBe(state); // fresh object
  });

  it('does not touch player state or other counters', () => {
    const state = makeState({ position: 'yesod', clearedSefirot: new Set(['hod']) });
    const next = acceptSetback(state, { playerId: 'p1', sefirah: 'yesod' });
    expect(next.illumination).toBe(0);
    expect(next.players[0]).toEqual(state.players[0]);
  });

  it('raises separation by 2 for shortcut-path failures', () => {
    // design/mechanics.md: shortcut failures are +2 Separation,
    // not +1. The caller flags the shortcut context; the reducer
    // reads it.
    const state = makeState({ position: 'yesod' });
    const next = acceptSetback(state, { playerId: 'p1', sefirah: 'yesod', shortcut: true });
    expect(next.separation).toBe(2);
  });
});
