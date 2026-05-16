import { describe, expect, it } from 'vitest';
import { zodiacBonus } from '../zodiac-bonus';
import type { StatKey, ZodiacSignKey } from '@/data';

/**
 * Tests for the per-sign stat deltas. The shape of each row is
 * pinned against `design/astrological-classes.md` § 4. A regression
 * to either the dignity table (`data/dignities.ts`) or the planet ↔
 * Sefirah ↔ stat chain (`data/sefirot.ts`) surfaces here as a
 * labelled per-sign mismatch.
 *
 * Stats not listed in a row default to absent (zodiacBonus returns
 * `Partial<StatSheet>`; absent === 0 to the caller in T5).
 */

type Bonus = Partial<Record<StatKey, number>>;

const expected: Readonly<Record<ZodiacSignKey, Bonus>> = {
  // Aries: ruler Mars (+1 strength), exalt Sun (+2 harmony),
  // detr Venus (-1 passion), fall Saturn (-2 understanding).
  aries: { strength: 1, harmony: 2, passion: -1, understanding: -2 },
  // Taurus: ruler Venus (+1 passion), exalt Moon (+2 intuition),
  // detr Mars (-1 strength), no fall.
  taurus: { passion: 1, intuition: 2, strength: -1 },
  // Gemini: ruler Mercury (+1 intellect), detr Jupiter (-1 lovingkindness).
  gemini: { intellect: 1, lovingkindness: -1 },
  // Cancer: ruler Moon (+1 intuition), exalt Jupiter (+2 lovingkindness),
  // detr Saturn (-1 understanding), fall Mars (-2 strength).
  cancer: { intuition: 1, lovingkindness: 2, understanding: -1, strength: -2 },
  // Leo: ruler Sun (+1 harmony), detr Saturn (-1 understanding).
  leo: { harmony: 1, understanding: -1 },
  // Virgo: Mercury BOTH ruler AND exalt → +3 intellect (cumulative).
  // detr Jupiter (-1 lovingkindness), fall Venus (-2 passion).
  virgo: { intellect: 3, lovingkindness: -1, passion: -2 },
  // Libra: ruler Venus (+1 passion), exalt Saturn (+2 understanding),
  // detr Mars (-1 strength), fall Sun (-2 harmony).
  libra: { passion: 1, understanding: 2, strength: -1, harmony: -2 },
  // Scorpio: ruler Mars (+1 strength), co-ruler Pluto (+1 unity),
  // detr Venus (-1 passion), fall Moon (-2 intuition).
  scorpio: { strength: 1, unity: 1, passion: -1, intuition: -2 },
  // Sagittarius: ruler Jupiter (+1 lovingkindness), detr Mercury (-1 intellect).
  sagittarius: { lovingkindness: 1, intellect: -1 },
  // Capricorn: ruler Saturn (+1 understanding), exalt Mars (+2 strength),
  // detr Moon (-1 intuition), fall Jupiter (-2 lovingkindness).
  capricorn: { understanding: 1, strength: 2, intuition: -1, lovingkindness: -2 },
  // Aquarius: ruler Saturn (+1 understanding), detr Sun (-1 harmony).
  aquarius: { understanding: 1, harmony: -1 },
  // Pisces: ruler Jupiter (+1 lovingkindness), co-ruler Neptune (+1 insight),
  // exalt Venus (+2 passion), detr Mercury (-1 intellect),
  // fall Mercury (-2 intellect) → -3 intellect (cumulative double-affliction).
  pisces: { lovingkindness: 1, insight: 1, passion: 2, intellect: -3 },
};

const allSigns: readonly ZodiacSignKey[] = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
];

describe('zodiacBonus', () => {
  it.each(allSigns)('%s deltas match design § 4', (sign) => {
    expect(zodiacBonus(sign)).toEqual(expected[sign]);
  });

  // Spot-checks called out in the design doc as load-bearing extremes.
  it("Virgo's intellect +3 is cumulative ruler+exaltation Mercury", () => {
    expect(zodiacBonus('virgo').intellect).toBe(3);
  });

  it("Pisces' intellect -3 is cumulative detriment+fall Mercury", () => {
    expect(zodiacBonus('pisces').intellect).toBe(-3);
  });

  it("Scorpio's unity +1 comes from the Pluto modern co-ruler", () => {
    expect(zodiacBonus('scorpio').unity).toBe(1);
  });

  it("Pisces' insight +1 comes from the Neptune modern co-ruler", () => {
    expect(zodiacBonus('pisces').insight).toBe(1);
  });

  it('body is never modified by any sign — Earth has no zodiacal dignities', () => {
    for (const sign of allSigns) {
      const bonus = zodiacBonus(sign);
      expect(bonus.body, `body should be absent for ${sign}`).toBeUndefined();
    }
  });

  it('purity: same input → same output, no shared state', () => {
    const a = zodiacBonus('cancer');
    const b = zodiacBonus('cancer');
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});
