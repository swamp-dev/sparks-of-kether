import { describe, expect, it } from 'vitest';
import { deckCountFor, initializeGame, STARTING_HAND_SIZE } from '../setup';
import { seededRng } from '../rng';
import type { PlayerSetup } from '../setup';
import type { ZodiacSignKey } from '@/data';
import { DEFAULT_STATS } from '@/test/fixtures';

function setup(count: number): PlayerSetup[] {
  // Net-neutral or mildly positive picks per fixture convention so
  // tests don't get surprise stat shifts on default setups.
  const signs: ZodiacSignKey[] = ['aries', 'leo', 'libra', 'cancer'];
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    zodiacSign: signs[i] ?? 'aries',
    stats: DEFAULT_STATS,
  }));
}

describe('deckCountFor', () => {
  it('returns 1 for 2 players, 2 for 3 or 4 players', () => {
    expect(deckCountFor(2)).toBe(1);
    expect(deckCountFor(3)).toBe(2);
    expect(deckCountFor(4)).toBe(2);
  });

  it('throws on out-of-range counts', () => {
    expect(() => deckCountFor(1)).toThrow();
    expect(() => deckCountFor(5)).toThrow();
    expect(() => deckCountFor(0)).toThrow();
  });
});

describe('initializeGame — hand sizes', () => {
  it.each([
    [2, 1, 22],
    [3, 2, 44],
    [4, 2, 44],
  ])(
    '%i players → %i deck(s) → %i total cards in circulation',
    (count, decks, totalCards) => {
      const state = initializeGame({
        players: setup(count),
        rng: seededRng(1),
      });
      // Every player has the starting hand size.
      for (const p of state.players) {
        expect(p.hand.length).toBe(STARTING_HAND_SIZE);
      }
      // Sum of in-hand + draw = total cards.
      const inHands = state.players.length * STARTING_HAND_SIZE;
      expect(state.deck.length + inHands).toBe(totalCards);
      expect(state.deck.length).toBe(totalCards - inHands);
      // Sanity: number of decks scales as expected.
      expect(decks).toBe(deckCountFor(count));
    },
  );
});

describe('initializeGame — starting state', () => {
  it('places every player at Malkuth', () => {
    const state = initializeGame({
      players: setup(3),
      rng: seededRng(1),
    });
    for (const p of state.players) {
      expect(p.position).toBe('malkuth');
    }
  });

  it('initializes counters to zero and empty collections', () => {
    const state = initializeGame({
      players: setup(2),
      rng: seededRng(1),
    });
    expect(state.illumination).toBe(0);
    expect(state.separation).toBe(0);
    expect(state.discardPile).toEqual([]);
    expect(state.spentSparks).toEqual([]);
    expect(state.shellCancellationsAvailable).toBe(0);
    expect(state.shellsDeflected).toBe(0);
    expect(state.pillarStreak.currentPillar).toBeNull();
    expect(state.pillarStreak.sameCount).toBe(0);
    for (const p of state.players) {
      expect(p.clearedSefirot.size).toBe(0);
      expect(p.sparksHeld.size).toBe(0);
    }
  });
});

describe('initializeGame — zodiac sign bonuses (#234)', () => {
  // Filler player so each call satisfies the 2-4 player minimum.
  const filler: PlayerSetup = {
    id: 'filler',
    name: 'F',
    zodiacSign: 'leo',
    stats: DEFAULT_STATS,
  };

  it('applies the zodiac bonus additively to the rolled stats when zodiacSign is set', () => {
    // Virgo: ruler + exalt Mercury → +3 intellect; -1 lovingkindness;
    // -2 passion.
    const state = initializeGame({
      players: [
        {
          id: 'p1',
          name: 'A',
          zodiacSign: 'virgo',
          stats: {
            ...DEFAULT_STATS,
            intellect: 10,
            lovingkindness: 10,
            passion: 10,
            harmony: 10,
          },
        },
        filler,
      ],
      rng: seededRng(1),
    });
    expect(state.players[0]?.stats.intellect).toBe(13); // 10 + 3
    expect(state.players[0]?.stats.lovingkindness).toBe(9); // 10 - 1
    expect(state.players[0]?.stats.passion).toBe(8); // 10 - 2
    expect(state.players[0]?.stats.body).toBe(DEFAULT_STATS.body); // unchanged
  });

  it('clamps the resulting stat to the [1, 18] range (D5 — additive, capped 1–18)', () => {
    // Virgo + intellect 16 + 3 → 19 → CAP 18.
    // Pisces + intellect 3 + (-3) → 0 → FLOOR 1.
    const state = initializeGame({
      players: [
        {
          id: 'high',
          name: 'High',
          zodiacSign: 'virgo',
          stats: { ...DEFAULT_STATS, intellect: 16 },
        },
        {
          id: 'low',
          name: 'Low',
          zodiacSign: 'pisces',
          stats: { ...DEFAULT_STATS, intellect: 3 },
        },
      ],
      rng: seededRng(1),
    });
    expect(state.players[0]?.stats.intellect).toBe(18);
    expect(state.players[1]?.stats.intellect).toBe(1);
  });

  it('Scorpio Pluto co-ruler grants +1 unity (Kether-stat that was previously class-neutral)', () => {
    const state = initializeGame({
      players: [
        {
          id: 'p1',
          name: 'A',
          zodiacSign: 'scorpio',
          stats: { ...DEFAULT_STATS, unity: 10 },
        },
        filler,
      ],
      rng: seededRng(1),
    });
    expect(state.players[0]?.stats.unity).toBe(11);
  });

  it('Pisces Neptune co-ruler grants +1 insight', () => {
    const state = initializeGame({
      players: [
        {
          id: 'p1',
          name: 'A',
          zodiacSign: 'pisces',
          stats: { ...DEFAULT_STATS, insight: 10 },
        },
        filler,
      ],
      rng: seededRng(1),
    });
    expect(state.players[0]?.stats.insight).toBe(11);
  });
});

describe('initializeGame — zodiacSign persisted to PlayerState (#244)', () => {
  // Soul Doors (Epic #240) are class-passive — they apply on every
  // challenge, not just at setup. The class therefore has to live on
  // PlayerState, not just PlayerSetup. This block pins the
  // pass-through: whatever the lobby supplied, the engine state
  // remembers.

  const fillerB: PlayerSetup = {
    id: 'p2',
    name: 'B',
    zodiacSign: 'leo',
    stats: DEFAULT_STATS,
  };

  it('copies zodiacSign from PlayerSetup to PlayerState', () => {
    const state = initializeGame({
      players: [
        {
          id: 'p1',
          name: 'A',
          zodiacSign: 'pisces',
          stats: DEFAULT_STATS,
        },
        { ...fillerB, zodiacSign: 'aries' },
      ],
      rng: seededRng(1),
    });
    expect(state.players[0]?.zodiacSign).toBe('pisces');
    expect(state.players[1]?.zodiacSign).toBe('aries');
  });
});

describe('initializeGame — determinism', () => {
  it('same seed produces same deal', () => {
    const a = initializeGame({
      players: setup(3),
      rng: seededRng(42),
    });
    const b = initializeGame({
      players: setup(3),
      rng: seededRng(42),
    });
    expect(a.players.map((p) => p.hand)).toEqual(b.players.map((p) => p.hand));
    expect(a.deck).toEqual(b.deck);
  });

  it('throws on out-of-range player count (1 player)', () => {
    expect(() =>
      initializeGame({
        players: setup(1),
        rng: seededRng(1),
      }),
    ).toThrow('Unsupported player count: 1 (must be 2..4)');
  });

  it('throws on empty player list (0 players)', () => {
    // The empty-players input is gated by `deckCountFor(0)` at the
    // top of `initializeGame` — that throw fires before the
    // downstream `firstPlayer` guard would. The guard remains as
    // defense-in-depth in case `deckCountFor`'s range is ever
    // widened. This test pins the public-API behavior so a future
    // change that allowed `deckCountFor(0)` would surface here
    // before the guard's message reached production.
    //
    // Full-string match (not substring) so a suffix change in the
    // error message does not silently invalidate the assertion.
    expect(() =>
      initializeGame({
        players: setup(0),
        rng: seededRng(1),
      }),
    ).toThrow('Unsupported player count: 0 (must be 2..4)');
  });

  it('throws on out-of-range player count (5 players)', () => {
    // Companion to the 1-player and 0-player cases: pin the upper
    // bound so a regression that loosened `deckCountFor` is caught.
    expect(() =>
      initializeGame({
        players: setup(5),
        rng: seededRng(1),
      }),
    ).toThrow('Unsupported player count: 5 (must be 2..4)');
  });
});
