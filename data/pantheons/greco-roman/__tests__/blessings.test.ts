import { describe, expect, it } from 'vitest';
import { pickBlessing, sefirahBlessings } from '../blessings';
import { seededRng } from '@/engine/rng';
import type { SefirahKey, ZodiacSignKey } from '@/data';

/**
 * Pin the per-Sefirah blessing matrix shape (#253 / T2 of #251). The
 * matrix is `[sefirah][sign] -> [3 variants]`, no outcome axis (a
 * blessing has no pass/fail). The matrix content itself is locked in
 * `design/sefirah-blessings.md` (T1 / #252).
 *
 *   10 sefirot × 12 signs × 3 variants = 360 cells.
 *
 * Drift catchers below: the per-cell length-3 + non-empty checks catch
 * silent string-shuffle, the total-cell-count assertion catches whole-
 * sefirah / whole-sign omissions, and the verbatim string-pins on
 * anchor cells catch typo drift on the most load-bearing lines.
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

describe('sefirahBlessings', () => {
  it('covers all 10 Sefirot', () => {
    expect(Object.keys(sefirahBlessings).sort()).toEqual([...ALL_SEFIROT].sort());
  });

  it('matrix flattens to exactly 360 variants (10 × 12 × 3)', () => {
    let total = 0;
    for (const sefirah of ALL_SEFIROT) {
      for (const sign of ALL_SIGNS) {
        total += sefirahBlessings[sefirah][sign].length;
      }
    }
    expect(total).toBe(360);
  });

  for (const sefirah of ALL_SEFIROT) {
    describe(`${sefirah} sub-matrix`, () => {
      it('covers all 12 zodiac signs', () => {
        expect(Object.keys(sefirahBlessings[sefirah]).sort()).toEqual([...ALL_SIGNS].sort());
      });

      for (const sign of ALL_SIGNS) {
        it(`${sign} cell: exactly 3 non-empty, non-placeholder variants`, () => {
          const variants = sefirahBlessings[sefirah][sign];
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

describe('sefirahBlessings — verbatim string-pins (typo drift catchers)', () => {
  // Pin one anchor cell per Sefirah, sourced verbatim from
  // `design/sefirah-blessings.md`. If a string changes here, the
  // design doc must change in the same commit (or vice versa).

  it('Kether § Aries v1 — anchor opener after literary review', () => {
    expect(sefirahBlessings.kether.aries[0]).toBe(
      'The dawn waits with one match unstruck. You — first ignition — counted in the lighting.',
    );
  });

  it('Kether § Pisces v2 — post-#379 polish (no "comes by feel" doubling)', () => {
    expect(sefirahBlessings.kether.pisces[1]).toBe(
      'The Crown gathers what comes by feel. You — who reach meaning before words — counted in our cohering before arrival.',
    );
  });

  it('Chokmah § Pisces v1 — Athena ruler-tier opener (post-review warm)', () => {
    expect(sefirahBlessings.chokmah.pisces[0]).toBe(
      'Yes — strategy lives where you already see. The depth is the sight. Cleanly recognized.',
    );
  });

  it('Binah § Capricorn v2 — Demeter ruler-tier maternal weight', () => {
    expect(sefirahBlessings.binah.capricorn[1]).toBe(
      'Your weight is form already. The mountain will answer you. I have waited in you a long time.',
    );
  });

  it('Chesed § Pisces v1 — Zeus ruler-tier overflow (no edge between)', () => {
    expect(sefirahBlessings.chesed.pisces[0]).toBe(
      'Yours, child. The cup overflows into you and you into the cup. No edge between.',
    );
  });

  it('Gevurah § Scorpio v2 — Ares ruler-tier comrade beat', () => {
    expect(sefirahBlessings.gevurah.scorpio[1]).toBe(
      'Bound chaos. Same discipline. Brother. Keep the position.',
    );
  });

  it('Tiferet § Leo v1 — Apollo ruler-tier solar lyre', () => {
    expect(sefirahBlessings.tiferet.leo[0]).toBe(
      'The lyre is yours. The whole sky tunes to your chord. Play it.',
    );
  });

  it('Netzach § Pisces v1 — Aphrodite exalted-tier oldest voice', () => {
    expect(sefirahBlessings.netzach.pisces[0]).toBe(
      "Yes. You dissolve into want like water finds its shape. I know this voice — it's the oldest one.",
    );
  });

  it('Hod § Gemini v1 — Hermes ruler-tier (warmed post-review)', () => {
    expect(sefirahBlessings.hod.gemini[0]).toBe(
      'Twin-tongued, road-born — you finish my sentence before I do. Trade, gladly.',
    );
  });

  it('Yesod § Cancer v2 — Selene ruler-tier (post-review correct epithet)', () => {
    expect(sefirahBlessings.yesod.cancer[1]).toBe(
      'Bright-tressed, I find you sleeping; the answers were already yours. I only lit them. Returns.',
    );
  });

  it('Malkuth § Pisces v2 — Hestia warmth-only meeting water', () => {
    expect(sefirahBlessings.malkuth.pisces[1]).toBe(
      'The hearth meets water without ending. Sit. The warmth goes where you go.',
    );
  });
});

describe('pickBlessing', () => {
  it('returns one of the 3 variants for a given (sefirah, sign)', () => {
    const variants = sefirahBlessings.hod.gemini;
    const rng = seededRng(42);
    for (let i = 0; i < 50; i++) {
      const picked = pickBlessing(sefirahBlessings, 'hod', 'gemini', rng);
      expect(variants).toContain(picked);
    }
  });

  it('selects deterministically given a seeded Rng', () => {
    const rngA = seededRng(123);
    const rngB = seededRng(123);
    expect(pickBlessing(sefirahBlessings, 'tiferet', 'leo', rngA)).toBe(
      pickBlessing(sefirahBlessings, 'tiferet', 'leo', rngB),
    );
  });

  it('does not throw on a valid cell (the empty-variants guard is unreachable through the typed matrix)', () => {
    // The `pickBlessing` body has a defensive `throw` for empty
    // variant arrays, but the typed matrix forbids constructing one
    // through normal call paths. This test confirms the happy path
    // is truly throw-free; the throw itself is documented contract,
    // not exercised behaviour.
    const rng = seededRng(0);
    expect(() => pickBlessing(sefirahBlessings, 'hod', 'aries', rng)).not.toThrow();
  });
});
