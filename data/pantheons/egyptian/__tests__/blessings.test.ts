import { describe, expect, it } from 'vitest';

import { sefirahBlessings } from '../blessings';
import { sefirahBlessings as grecoRomanBlessings } from '../../greco-roman/blessings';
import type { SefirahKey, ZodiacSignKey } from '../../../types';

/**
 * Egyptian blessing-matrix smoke test (#554).
 *
 *   10 sefirot × 12 signs × 3 variants = 360 cells.
 *
 * Mirrors the verdict-matrix test (#553). Pins:
 *
 *   - Structural completeness — every (sefirah, sign) cell has
 *     exactly 3 non-empty variants, no placeholders.
 *   - Word-count — every variant ≤ 25 words (greco-roman max is 21;
 *     this ceiling matches the verdict-matrix cap and keeps the same
 *     UI envelope).
 *   - No duplicates within a cell.
 *   - Voice anchors per deity (loose contains-at-least-one-token
 *     check — confirms the voice register without over-constraining
 *     the authoring).
 *   - AC #4: Kether collective voice and Malkuth Bastet-as-companion
 *     register are distinct from the 8 encounter deities — verified
 *     by their own voice anchors (collective Kether uses
 *     "gathering"/"company"/"dawn"; Malkuth/Bastet uses
 *     "hearth"/"threshold"/"lamp"/"cat").
 *   - Egyptian matrix is distinct from greco-roman across all keys.
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

const wordCount = (s: string): number =>
  s.trim().split(/\s+/).filter((w) => w.length > 0).length;

describe('Egyptian blessing matrix (#554)', () => {
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

  describe('structural completeness — every cell has 3 non-empty, non-placeholder variants', () => {
    for (const sefirah of ALL_SEFIROT) {
      describe(sefirah, () => {
        it('covers all 12 zodiac signs', () => {
          expect(Object.keys(sefirahBlessings[sefirah]).sort()).toEqual(
            [...ALL_SIGNS].sort(),
          );
        });

        for (const sign of ALL_SIGNS) {
          it(`${sign} cell: exactly 3 non-empty, non-placeholder variants`, () => {
            const variants = sefirahBlessings[sefirah][sign];
            expect(variants).toHaveLength(3);
            for (const v of variants) {
              expect(v.length).toBeGreaterThan(0);
              expect(v.toLowerCase()).not.toMatch(
                /\btodo\b|\bfixme\b|\bxxx\b|\bplaceholder\b|\blorem\b/,
              );
            }
          });
        }
      });
    }
  });

  describe('word count ≤ 25 — every line', () => {
    for (const sefirah of ALL_SEFIROT) {
      it(`${sefirah} — every line is at most 25 words`, () => {
        for (const sign of ALL_SIGNS) {
          for (const v of sefirahBlessings[sefirah][sign]) {
            const wc = wordCount(v);
            expect(
              wc,
              `${sefirah}/${sign} (${wc} words): ${v}`,
            ).toBeLessThanOrEqual(25);
          }
        }
      });
    }
  });

  describe('no duplicate variants within a cell', () => {
    for (const sefirah of ALL_SEFIROT) {
      it(`${sefirah} — variants within each (sign) cell are distinct`, () => {
        for (const sign of ALL_SIGNS) {
          const variants = sefirahBlessings[sefirah][sign];
          const unique = new Set(variants);
          expect(unique.size, `${sefirah}/${sign}`).toBe(variants.length);
        }
      });
    }
  });

  describe('voice anchors — at least one cell per sefirah carries the locked imagery', () => {
    // Loose check — searches across every line in the sefirah's matrix
    // for any of the canonical-imagery tokens from #551 § 2. Catches
    // the regression where someone replaces a deity's voice without
    // realising the imagery anchor moved with it. Not exhaustive;
    // a stylistic proofread (the #294-pattern pass) handles deeper
    // voice consistency.

    const collectAllLines = (sefirah: SefirahKey): string[] => {
      const lines: string[] = [];
      for (const sign of ALL_SIGNS) {
        for (const v of sefirahBlessings[sefirah][sign]) {
          lines.push(v.toLowerCase());
        }
      }
      return lines;
    };

    it('Kether — collective unmanifest voice (gathering / company / dawn)', () => {
      const all = collectAllLines('kether').join(' ');
      expect(all).toMatch(/gathering|company|dawn|threshold|unformed|before/);
    });

    it('Amun (chokmah) — hidden / breath / pylon imagery present', () => {
      const all = collectAllLines('chokmah').join(' ');
      expect(all).toMatch(/hidden|breath|wind|pylon|mask|silent|silence/);
    });

    it('Isis (binah) — threshold / knot / carry imagery present', () => {
      const all = collectAllLines('binah').join(' ');
      expect(all).toMatch(/threshold|knot|carry|river|cosmic mother|bear/);
    });

    it('Ra (chesed) — solar / throne imagery present', () => {
      const all = collectAllLines('chesed').join(' ');
      expect(all).toMatch(/sun|sky|throne|kingdom|noon|crown|light/);
    });

    it('Horus (gevurah) — falcon / claim / line imagery present', () => {
      const all = collectAllLines('gevurah').join(' ');
      expect(all).toMatch(/falcon|line|claim|wrong|case|court|verdict/);
    });

    it('Osiris (tiferet) — feather / scale / heart / weigh imagery present', () => {
      const all = collectAllLines('tiferet').join(' ');
      expect(all).toMatch(/feather|scale|heart|weigh|underworld|throne of the dead/);
    });

    it('Hathor (netzach) — cup / cow / milk / music / drink imagery present', () => {
      const all = collectAllLines('netzach').join(' ');
      expect(all).toMatch(/cup|cow|milk|music|drink|thirst|body|want/);
    });

    it('Thoth (hod) — ink / reed / page / tablet imagery present', () => {
      const all = collectAllLines('hod').join(' ');
      expect(all).toMatch(/ink|reed|page|tablet|line|scribe|wedjat/);
    });

    it('Khonsu (yesod) — moon / dream / tide / crossing imagery present', () => {
      const all = collectAllLines('yesod').join(' ');
      expect(all).toMatch(/moon|dream|tide|crossing|night|traveller|path/);
    });

    it('Bastet (malkuth) — hearth / threshold / lamp / cat imagery present', () => {
      const all = collectAllLines('malkuth').join(' ');
      expect(all).toMatch(/hearth|threshold|lamp|home|cat|bastet|doorstep/);
    });
  });

  describe('AC #4: Kether and Malkuth voices distinct from the 8 encounter deities', () => {
    // Kether speaks in a collective unmanifest voice (no single deity);
    // Malkuth uses Bastet-as-companion (hearth register, parallel to
    // Hestia in greco-roman). Neither should leak the named encounter
    // deities into their blessings.
    // 'ra' is intentionally omitted — it's a common short syllable in
    // English ("draw", "raise", "fragrance") and would false-positive.
    // The other deity names are unambiguous substrings.
    const encounterDeityNames = [
      'amun',
      'isis',
      'horus',
      'osiris',
      'hathor',
      'thoth',
      'khonsu',
    ];

    it('Kether blessings never name a specific encounter deity', () => {
      for (const sign of ALL_SIGNS) {
        for (const v of sefirahBlessings.kether[sign]) {
          for (const deity of encounterDeityNames) {
            expect(
              v.toLowerCase().includes(deity),
              `kether/${sign} mentions "${deity}": ${v}`,
            ).toBe(false);
          }
        }
      }
    });

    it('Malkuth (Bastet) blessings never name another encounter deity', () => {
      for (const sign of ALL_SIGNS) {
        for (const v of sefirahBlessings.malkuth[sign]) {
          for (const deity of encounterDeityNames) {
            expect(
              v.toLowerCase().includes(deity),
              `malkuth/${sign} mentions "${deity}": ${v}`,
            ).toBe(false);
          }
        }
      }
    });
  });

  describe('Egyptian matrix is distinct from greco-roman across all keys', () => {
    // Every sefirah's blessing sub-matrix is its own object (not a
    // reference to the greco-roman counterpart) — catches accidental
    // fallback regressions.
    for (const k of ALL_SEFIROT) {
      it(`${k} — Egyptian and greco-roman entries are distinct objects`, () => {
        expect(sefirahBlessings[k]).not.toBe(grecoRomanBlessings[k]);
      });
    }
  });
});
