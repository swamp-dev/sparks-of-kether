import { describe, expect, it } from 'vitest';
import { sefirahBlessingsCeremony } from '../sefirah-blessings-ceremony';
import type { SefirahKey, ZodiacSignKey } from '@/data';

/**
 * Pin the ceremony-specific blessing matrix shape (#13 / ceremony-tone
 * copy). Same structural contract as the encounter-voice matrix in
 * `data/pantheons/greco-roman/__tests__/blessings.test.ts`, but the
 * register differs: every cell must read as gift-receiving, not as a
 * gate-challenge verdict.
 *
 *   10 sefirot × 12 signs × 3 variants = 360 cells.
 */

const ALL_SEFIROT: readonly SefirahKey[] = [
  'kether',
  'chokmah',
  'binah',
  'chesed',
  'gevurah',
  'tiferet',
  'netzach',
  'hod',
  'yesod',
  'malkuth',
];

const ALL_SIGNS: readonly ZodiacSignKey[] = [
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

describe('sefirahBlessingsCeremony', () => {
  it('covers all 10 Sefirot', () => {
    expect(Object.keys(sefirahBlessingsCeremony).sort()).toEqual([...ALL_SEFIROT].sort());
  });

  it('matrix flattens to exactly 360 variants (10 × 12 × 3)', () => {
    let total = 0;
    for (const sefirah of ALL_SEFIROT) {
      for (const sign of ALL_SIGNS) {
        total += sefirahBlessingsCeremony[sefirah][sign].length;
      }
    }
    expect(total).toBe(360);
  });

  for (const sefirah of ALL_SEFIROT) {
    describe(`${sefirah} sub-matrix`, () => {
      it('covers all 12 zodiac signs', () => {
        expect(Object.keys(sefirahBlessingsCeremony[sefirah]).sort()).toEqual(
          [...ALL_SIGNS].sort(),
        );
      });

      for (const sign of ALL_SIGNS) {
        it(`${sign} cell: exactly 3 non-empty, non-placeholder variants`, () => {
          const variants = sefirahBlessingsCeremony[sefirah][sign];
          expect(variants).toHaveLength(3);
          for (const variant of variants) {
            expect(variant.length).toBeGreaterThan(0);
            expect(variant.toLowerCase()).not.toMatch(
              /\btodo\b|\bfixme\b|\bxxx\b|\bplaceholder\b|\blorem\b/,
            );
          }
        });
      }
    });
  }
});

describe('sefirahBlessingsCeremony — verbatim string-pins (typo drift catchers)', () => {
  // Anchor one cell per Sefirah so content drift is caught at commit time.

  it('Kether § Aries v1 — collective gift, counted in the whole', () => {
    expect(sefirahBlessingsCeremony.kether.aries[0]).toBe(
      'The first fire is received into the whole. What you ignite, the Crown keeps burning. You are counted.',
    );
  });

  it('Chokmah § Gemini v1 — flash of wisdom branches into pattern', () => {
    expect(sefirahBlessingsCeremony.chokmah.gemini[0]).toBe(
      'The insight branches immediately — one truth that multiplies. Chokmah gives you the web of connections. You receive the pattern whole.',
    );
  });

  it('Binah § Capricorn v1 — your weight is form, the mountain answers', () => {
    expect(sefirahBlessingsCeremony.binah.capricorn[0]).toBe(
      'Your weight is form already. Binah gives Capricorn understanding that mirrors what you are. The mountain will answer. Received.',
    );
  });

  it('Chesed § Leo v1 — radiant abundance, given to give', () => {
    expect(sefirahBlessingsCeremony.chesed.leo[0]).toBe(
      'The gift is radiant and wide. Chesed gives to the generous heart abundantly. You receive more than you can hold — and are meant to give.',
    );
  });

  it('Gevurah § Aries v1 — strength given to the strong', () => {
    expect(sefirahBlessingsCeremony.gevurah.aries[0]).toBe(
      'Gevurah gives its own quality to Aries — strength to the strong. A portion of discipline arrives as fire focused. Yours.',
    );
  });

  it('Tiferet § Leo v1 — beauty and radiance given to the heart', () => {
    expect(sefirahBlessingsCeremony.tiferet.leo[0]).toBe(
      'Tiferet gives the heart its fullest radiance. Beauty arrives as the thing you were already reaching toward. Receive it.',
    );
  });

  it('Netzach § Scorpio v1 — desire already proven, given more', () => {
    expect(sefirahBlessingsCeremony.netzach.scorpio[0]).toBe(
      'Desire arrives from the depths, already tested. Netzach gives Scorpio the passion that survives. The feeling is real. Yours.',
    );
  });

  it('Hod § Gemini v1 — twin-tongued path given in full', () => {
    expect(sefirahBlessingsCeremony.hod.gemini[0]).toBe(
      'Twin-tongued, road-born — the gift is the joy of the path itself. Hod gives Gemini the full intelligence of connection. Yours.',
    );
  });

  it('Yesod § Cancer v1 — moon holds what you love while you sleep', () => {
    expect(sefirahBlessingsCeremony.yesod.cancer[0]).toBe(
      'The moon holds what you love while you sleep. Yesod gives Cancer the dreaming that keeps watch. Returns. Yours.',
    );
  });

  it('Malkuth § Pisces v1 — earth holds the one who flows', () => {
    expect(sefirahBlessingsCeremony.malkuth.pisces[0]).toBe(
      'The earth holds the one who flows. Malkuth gives Pisces the belonging that does not require a boundary. Receive it wherever you are.',
    );
  });
});
