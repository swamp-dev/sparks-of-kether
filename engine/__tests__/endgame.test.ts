import { describe, expect, it } from 'vitest';
import {
  checkEndgame,
  canReachKether,
  resolveFinalThreshold,
  REQUIRED_ILLUMINATION_MARGIN,
  SEPARATION_LOSS_THRESHOLD,
} from '../endgame';
import { makePlayer, makeState } from '@/test/fixtures';
import type { GameState } from '../types';

// ──────────────── checkEndgame ────────────────

describe('checkEndgame — ongoing', () => {
  it('returns ongoing for a fresh game', () => {
    // Fresh deck still has cards; team has not begun — not stranded.
    const result = checkEndgame(makeState({}, { deck: [0, 1, 2] }));
    expect(result.status).toBe('ongoing');
  });

  it('returns ongoing for a mid-game state with separation under threshold and players still ascending', () => {
    // Card 2 = High Priestess = path 13 (Tiferet ↔ Kether).
    const state = makeState(
      { position: 'tiferet', hand: [2] },
      { illumination: 3, separation: 5 },
    );
    expect(checkEndgame(state).status).toBe('ongoing');
  });
});

describe('checkEndgame — loss', () => {
  it('returns lost when separation reaches the threshold', () => {
    const state = makeState({}, { separation: SEPARATION_LOSS_THRESHOLD });
    const result = checkEndgame(state);
    expect(result.status).toBe('lost');
    expect(result.reason).toBe('separation-overflow');
  });

  it('returns lost when separation exceeds the threshold', () => {
    const state = makeState({}, { separation: SEPARATION_LOSS_THRESHOLD + 5 });
    const result = checkEndgame(state);
    expect(result.status).toBe('lost');
  });

  it('returns lost when the team is stranded (no card-path to Kether)', () => {
    // Player at Malkuth, no cards anywhere. Cannot ever reach Kether.
    const state = makeState({ position: 'malkuth', hand: [] }, { deck: [], discardPile: [] });
    const result = checkEndgame(state);
    expect(result.status).toBe('lost');
    expect(result.reason).toBe('stranded');
  });
});

describe('checkEndgame — win', () => {
  it('returns won when all at Kether AND illumination ≥ separation + margin', () => {
    const state = makeState(
      { position: 'kether' },
      {
        illumination: REQUIRED_ILLUMINATION_MARGIN,
        separation: 0,
        deck: [0],
      },
    );
    expect(checkEndgame(state).status).toBe('won');
  });

  it('still ongoing when at Kether but illumination gap not yet met', () => {
    const state = makeState(
      { position: 'kether' },
      {
        illumination: 2,
        separation: 0,
        deck: [0],
      },
    );
    expect(checkEndgame(state).status).toBe('ongoing');
  });

  it('still ongoing when illumination is high but at least one player is below Kether', () => {
    const lagger = makePlayer({ id: 'p2', position: 'tiferet', hand: [13] });
    const ahead = makePlayer({ id: 'p1', position: 'kether', hand: [] });
    const state = makeState(
      {},
      {
        players: [ahead, lagger],
        illumination: 20,
        separation: 0,
      },
    );
    expect(checkEndgame(state).status).toBe('ongoing');
  });
});

// ──────────────── canReachKether ────────────────

describe('canReachKether', () => {
  it('returns true for a player already at Kether', () => {
    expect(canReachKether(makeState({ position: 'kether' }), 'kether')).toBe(true);
  });

  it('returns true via a single Kether-card held in hand', () => {
    // Path 13 = Tiferet ↔ Kether, arcanum 2 (High Priestess).
    const state = makeState({ position: 'tiferet', hand: [2] });
    expect(canReachKether(state, 'tiferet')).toBe(true);
  });

  it('returns true via a multi-step traversal using team cards', () => {
    // Player at Malkuth. Cards anywhere on the team:
    //   arcanum 21 (The World) → path 32 → Yesod ↔ Malkuth
    //   arcanum 14 (Temperance) → path 25 → Tiferet ↔ Yesod
    //   arcanum 2 (High Priestess) → path 13 → Kether ↔ Tiferet
    // BFS should find the chain Malkuth → Yesod → Tiferet → Kether.
    const state = makeState(
      { position: 'malkuth', hand: [21, 14, 2] },
    );
    expect(canReachKether(state, 'malkuth')).toBe(true);
  });

  it('returns true when a needed card is in another player\'s hand', () => {
    // Cards are pooled team-wide for reachability — gifting fills any gap.
    const p1 = makePlayer({ id: 'p1', position: 'malkuth', hand: [21] });
    const p2 = makePlayer({ id: 'p2', position: 'kether', hand: [14, 2] });
    const state = makeState({}, { players: [p1, p2] });
    expect(canReachKether(state, 'malkuth')).toBe(true);
  });

  it('returns true when a needed card is in the deck or discard', () => {
    const state = makeState(
      { position: 'malkuth', hand: [] },
      { deck: [21], discardPile: [14, 2] },
    );
    expect(canReachKether(state, 'malkuth')).toBe(true);
  });

  it('returns false when the team has no cards anywhere', () => {
    const state = makeState({ position: 'malkuth', hand: [] }, { deck: [], discardPile: [] });
    expect(canReachKether(state, 'malkuth')).toBe(false);
  });

  it("returns false when none of Kether's three approach cards are anywhere", () => {
    // Player at Tiferet. Tons of cards, but none of arcana 0/1/2 (Fool/Magician/HP).
    const state = makeState(
      { position: 'tiferet', hand: [3, 4, 5, 6, 7] },
      { deck: [8, 9, 10], discardPile: [11, 12] },
    );
    expect(canReachKether(state, 'tiferet')).toBe(false);
  });
});

// ──────────────── resolveFinalThreshold ────────────────

describe('resolveFinalThreshold', () => {
  it('rejects if any player is not at Kether', () => {
    const p1 = makePlayer({ id: 'p1', position: 'kether', hand: [] });
    const p2 = makePlayer({ id: 'p2', position: 'tiferet', hand: [] });
    const state = makeState({}, { players: [p1, p2], illumination: 10, separation: 0 });
    const result = resolveFinalThreshold({ state, cardPlays: [], sparkBurns: [] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('not-all-at-kether');
  });

  it('rejects when separation has already overflowed (game already lost)', () => {
    // Without this guard, resolveFinalThreshold could declare a win on
    // a state that checkEndgame considers lost (overflow precedes win).
    const state = makeState(
      { position: 'kether' },
      { illumination: REQUIRED_ILLUMINATION_MARGIN + SEPARATION_LOSS_THRESHOLD, separation: SEPARATION_LOSS_THRESHOLD },
    );
    const result = resolveFinalThreshold({ state, cardPlays: [], sparkBurns: [] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('game-already-lost');
  });

  it('wins when illumination already exceeds margin, no plays or burns needed', () => {
    const state = makeState(
      { position: 'kether' },
      { illumination: REQUIRED_ILLUMINATION_MARGIN + 2, separation: 0 },
    );
    const result = resolveFinalThreshold({ state, cardPlays: [], sparkBurns: [] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('won');
  });

  it('discards each played card (no path travel at Kether)', () => {
    const state = makeState(
      { position: 'kether', hand: [3, 7] },
      { illumination: REQUIRED_ILLUMINATION_MARGIN, separation: 0 },
    );
    const result = resolveFinalThreshold({
      state,
      cardPlays: [
        { playerId: 'p1', arcanumNumber: 3 },
        { playerId: 'p1', arcanumNumber: 7 },
      ],
      sparkBurns: [],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.state.players[0]?.hand).toEqual([]);
    expect(result.value.state.discardPile).toEqual([3, 7]);
  });

  it('rejects card play when player does not hold the card', () => {
    const state = makeState(
      { position: 'kether', hand: [3] },
      { illumination: REQUIRED_ILLUMINATION_MARGIN, separation: 0 },
    );
    const result = resolveFinalThreshold({
      state,
      cardPlays: [{ playerId: 'p1', arcanumNumber: 99 }],
      sparkBurns: [],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('card-not-held');
  });

  it('burns sparks 1-for-1 to close the illumination gap (each burn = +1 Illumination)', () => {
    // Need 2 more illumination. Burn 2 sparks.
    const state = makeState(
      {
        position: 'kether',
        sparksHeld: new Set(['yesod', 'hod']),
      },
      { illumination: REQUIRED_ILLUMINATION_MARGIN - 2, separation: 0 },
    );
    const result = resolveFinalThreshold({
      state,
      cardPlays: [],
      sparkBurns: [
        { playerId: 'p1', sefirah: 'yesod' },
        { playerId: 'p1', sefirah: 'hod' },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('won');
    // Each spark burn is +1 illumination (via the spark-spent event).
    expect(result.value.state.illumination).toBe(REQUIRED_ILLUMINATION_MARGIN);
  });

  it('returns gap-not-closed when sparks run out before illumination matches', () => {
    // Need 3 more illumination but only 1 spark held.
    const state = makeState(
      {
        position: 'kether',
        sparksHeld: new Set(['yesod']),
      },
      { illumination: REQUIRED_ILLUMINATION_MARGIN - 3, separation: 0 },
    );
    const result = resolveFinalThreshold({
      state,
      cardPlays: [],
      sparkBurns: [{ playerId: 'p1', sefirah: 'yesod' }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('lost');
    expect(result.value.reason).toBe('illumination-gap');
  });

  it('rejects spark burn when player does not hold that spark', () => {
    const state = makeState(
      { position: 'kether', sparksHeld: new Set() },
      { illumination: REQUIRED_ILLUMINATION_MARGIN, separation: 0 },
    );
    const result = resolveFinalThreshold({
      state,
      cardPlays: [],
      sparkBurns: [{ playerId: 'p1', sefirah: 'yesod' }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('spark-not-held');
  });
});
