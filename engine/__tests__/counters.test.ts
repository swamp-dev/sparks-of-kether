import { describe, expect, it } from 'vitest';
import { applyEvent, applyEvents, recordPillarMove, STREAK_THRESHOLD } from '../counters';
import { makeState } from '@/test/fixtures';
import type { GameEvent } from '../events';
import type { PillarStreakState } from '../types';
import { EMPTY_PILLAR_STREAK } from '../types';

// ──────────────── applyEvent / applyEvents ────────────────

describe('applyEvent — counter deltas per event', () => {
  it('spark-earned: +1 Illumination, 0 Separation', () => {
    const state = makeState();
    const next = applyEvent(state, { kind: 'spark-earned', playerId: 'p1', sefirah: 'yesod' });
    expect(next.illumination).toBe(1);
    expect(next.separation).toBe(0);
  });

  it('spark-spent: still +1 Illumination (spent Sparks remain illuminated)', () => {
    const state = makeState();
    const next = applyEvent(state, { kind: 'spark-spent', playerId: 'p1', sefirah: 'chesed' });
    expect(next.illumination).toBe(1);
  });

  it('card-gifted: +1 Illumination', () => {
    const state = makeState();
    const next = applyEvent(state, {
      kind: 'card-gifted',
      fromPlayerId: 'p1',
      toPlayerId: 'p2',
      arcanumNumber: 5,
    });
    expect(next.illumination).toBe(1);
  });

  it('check-failed-accepted (regular): +1 Separation', () => {
    const state = makeState();
    const next = applyEvent(state, {
      kind: 'check-failed-accepted',
      playerId: 'p1',
      sefirah: 'yesod',
      shortcut: false,
    });
    expect(next.separation).toBe(1);
  });

  it('check-failed-accepted (shortcut): +2 Separation', () => {
    const state = makeState();
    const next = applyEvent(state, {
      kind: 'check-failed-accepted',
      playerId: 'p1',
      sefirah: 'tiferet',
      shortcut: true,
    });
    expect(next.separation).toBe(2);
  });

  it('pillar-streak-imbalance: +1 Separation', () => {
    const state = makeState();
    const next = applyEvent(state, { kind: 'pillar-streak-imbalance', pillar: 'mercy' });
    expect(next.separation).toBe(1);
  });

  it('pillar-streak-equilibrium: +1 Illumination', () => {
    const state = makeState();
    const next = applyEvent(state, { kind: 'pillar-streak-equilibrium' });
    expect(next.illumination).toBe(1);
  });

  it('shell-activated: +2 Separation', () => {
    const state = makeState();
    const next = applyEvent(state, { kind: 'shell-activated', sefirah: 'malkuth' });
    expect(next.separation).toBe(2);
  });

  it('gift-refused: +1 Separation', () => {
    const state = makeState();
    const next = applyEvent(state, { kind: 'gift-refused', playerId: 'p1' });
    expect(next.separation).toBe(1);
  });
});

describe('applyEvents — folding', () => {
  it('folds an empty list to the same state reference', () => {
    const state = makeState();
    expect(applyEvents(state, [])).toBe(state);
  });

  it('folds a sequence in order', () => {
    const events: readonly GameEvent[] = [
      { kind: 'spark-earned', playerId: 'p1', sefirah: 'yesod' },
      { kind: 'card-gifted', fromPlayerId: 'p1', toPlayerId: 'p2', arcanumNumber: 5 },
      { kind: 'check-failed-accepted', playerId: 'p1', sefirah: 'hod', shortcut: false },
    ];
    const next = applyEvents(makeState(), events);
    expect(next.illumination).toBe(2); // 1 spark-earned + 1 gift
    expect(next.separation).toBe(1); // 1 fail
  });

  it('Illumination is monotonic non-decreasing across any sequence of events', () => {
    // Stretch: any event sequence — Illumination should never decrease.
    const events: readonly GameEvent[] = [
      { kind: 'spark-earned', playerId: 'p1', sefirah: 'yesod' },
      { kind: 'check-failed-accepted', playerId: 'p1', sefirah: 'hod', shortcut: false },
      { kind: 'spark-spent', playerId: 'p1', sefirah: 'yesod' },
      { kind: 'shell-activated', sefirah: 'malkuth' },
      { kind: 'pillar-streak-equilibrium' },
    ];
    let state = makeState();
    let prev = state.illumination;
    for (const e of events) {
      state = applyEvent(state, e);
      expect(state.illumination).toBeGreaterThanOrEqual(prev);
      prev = state.illumination;
    }
  });
});

// ──────────────── recordPillarMove ────────────────

describe('recordPillarMove — pillar streak detection', () => {
  it('Balance moves are neutral — no change to streak, no events', () => {
    const result = recordPillarMove(EMPTY_PILLAR_STREAK, 'balance');
    expect(result.streak).toEqual(EMPTY_PILLAR_STREAK);
    expect(result.events).toEqual([]);
  });

  it('first non-Balance move starts the streak', () => {
    const result = recordPillarMove(EMPTY_PILLAR_STREAK, 'mercy');
    expect(result.streak).toEqual({
      currentPillar: 'mercy',
      sameCount: 1,
      alternationCount: 1,
    });
    expect(result.events).toEqual([]);
  });

  it('three consecutive Mercy moves emit pillar-streak-imbalance', () => {
    let streak: PillarStreakState = EMPTY_PILLAR_STREAK;
    const collected: string[] = [];
    for (let i = 0; i < STREAK_THRESHOLD; i += 1) {
      const r = recordPillarMove(streak, 'mercy');
      streak = r.streak;
      collected.push(...r.events.map((e) => e.kind));
    }
    expect(collected).toEqual(['pillar-streak-imbalance']);
  });

  it('alternating Mercy → Severity → Mercy emits pillar-streak-equilibrium', () => {
    let streak: PillarStreakState = EMPTY_PILLAR_STREAK;
    const collected: string[] = [];
    for (const p of ['mercy', 'severity', 'mercy'] as const) {
      const r = recordPillarMove(streak, p);
      streak = r.streak;
      collected.push(...r.events.map((e) => e.kind));
    }
    expect(collected).toEqual(['pillar-streak-equilibrium']);
  });

  it('Balance moves between non-Balance moves do NOT reset or build the streak', () => {
    let streak: PillarStreakState = EMPTY_PILLAR_STREAK;
    const sequence = ['mercy', 'balance', 'mercy', 'balance', 'mercy'] as const;
    const collected: string[] = [];
    for (const p of sequence) {
      const r = recordPillarMove(streak, p);
      streak = r.streak;
      collected.push(...r.events.map((e) => e.kind));
    }
    // Three Mercy moves with Balance between them should still trip imbalance.
    expect(collected).toEqual(['pillar-streak-imbalance']);
  });

  it('reaching imbalance resets sameCount; further Mercy moves rebuild from 1', () => {
    let streak: PillarStreakState = EMPTY_PILLAR_STREAK;
    for (let i = 0; i < 3; i += 1) streak = recordPillarMove(streak, 'mercy').streak;
    // After 3 Mercy moves, sameCount reset.
    expect(streak.sameCount).toBe(0);
    const r = recordPillarMove(streak, 'mercy');
    // Next Mercy move counts as 1 (not 4). It's the same pillar, so it
    // increments sameCount only.
    expect(r.streak.sameCount).toBe(1);
  });

  it('switching pillar resets sameCount to 1 and bumps alternationCount', () => {
    let streak: PillarStreakState = EMPTY_PILLAR_STREAK;
    streak = recordPillarMove(streak, 'mercy').streak;
    streak = recordPillarMove(streak, 'mercy').streak;
    // After two same-pillar moves: alternationCount has been reset to 0.
    // Switching to severity then bumps it from 0 → 1.
    const r = recordPillarMove(streak, 'severity');
    expect(r.streak.currentPillar).toBe('severity');
    expect(r.streak.sameCount).toBe(1);
    expect(r.streak.alternationCount).toBe(1);
  });

  it('emitted imbalance event names the pillar that triggered it', () => {
    let streak: PillarStreakState = EMPTY_PILLAR_STREAK;
    streak = recordPillarMove(streak, 'severity').streak;
    streak = recordPillarMove(streak, 'severity').streak;
    const r = recordPillarMove(streak, 'severity');
    expect(r.events).toEqual([{ kind: 'pillar-streak-imbalance', pillar: 'severity' }]);
  });
});

// ──────────────── New event variants from #15 ────────────────

describe('applyEvent — additional event variants', () => {
  it('assist-contributed: +1 Illumination', () => {
    const next = applyEvent(makeState(), {
      kind: 'assist-contributed',
      challengerId: 'p1',
      sefirah: 'yesod',
    });
    expect(next.illumination).toBe(1);
    expect(next.separation).toBe(0);
  });

  it('move-downward: +1 Illumination', () => {
    const next = applyEvent(makeState(), {
      kind: 'move-downward',
      playerId: 'p1',
      pathNumber: 32,
    });
    expect(next.illumination).toBe(1);
    expect(next.separation).toBe(0);
  });
});
