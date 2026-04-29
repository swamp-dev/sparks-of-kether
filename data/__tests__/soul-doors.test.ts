import { describe, expect, it } from 'vitest';
import {
  soulDoorsBySign,
  soulDoorsForSign,
  pathByArcanum,
  arcana,
  type SefirahKey,
  type ZodiacSignKey,
} from '@/data';

/**
 * Soul Doors are the per-class challenge advantage layer (Epic #240).
 * Every cell is asserted explicitly against `design/soul-doors.md` § 3
 * — drift here would silently mis-tune the DC delta application that
 * lands in T3 / T4.
 */
describe('soulDoorsBySign', () => {
  const allSigns: readonly ZodiacSignKey[] = [
    'aries',       'taurus',      'gemini',      'cancer',
    'leo',         'virgo',       'libra',       'scorpio',
    'sagittarius', 'capricorn',   'aquarius',    'pisces',
  ];

  it('keys all 12 zodiac signs, with no extras', () => {
    const keys = Object.keys(soulDoorsBySign).sort();
    expect(keys).toEqual([...allSigns].sort());
  });

  /**
   * The expected table — verbatim from `design/soul-doors.md` § 3.
   * Order within each sign's tuple doesn't matter (the lookup is
   * an `includes` check at use site), but the doc lists endpoints
   * in path order (lower path-number Sefirah first).
   */
  const expected: Readonly<Record<ZodiacSignKey, readonly SefirahKey[]>> = {
    aries:       ['chokmah', 'tiferet'],
    taurus:      ['chokmah', 'chesed'],
    gemini:      ['binah',   'tiferet'],
    cancer:      ['binah',   'gevurah'],
    leo:         ['chesed',  'gevurah'],
    virgo:       ['chesed',  'tiferet'],
    libra:       ['gevurah', 'tiferet'],
    scorpio:     ['tiferet', 'netzach'],
    sagittarius: ['tiferet', 'yesod'],
    capricorn:   ['tiferet', 'hod'],
    aquarius:    ['netzach', 'yesod'],
    pisces:      ['netzach'], // Malkuth has no challenge — single Door
  };

  it.each(allSigns)('%s Doors match the design doc § 3', (sign) => {
    const got = soulDoorsForSign(sign);
    expect([...got].sort(), `${sign} Doors`).toEqual([...expected[sign]].sort());
  });

  it('gives Pisces exactly one Door; every other class has exactly two', () => {
    for (const sign of allSigns) {
      const expectedCount = sign === 'pisces' ? 1 : 2;
      expect(soulDoorsForSign(sign), sign).toHaveLength(expectedCount);
    }
  });

  it('never lists malkuth as a Door (no challenge there)', () => {
    for (const sign of allSigns) {
      expect(soulDoorsForSign(sign), sign).not.toContain('malkuth');
    }
  });

  it('never lists kether as a Door (Final Threshold is collective, D6)', () => {
    for (const sign of allSigns) {
      expect(soulDoorsForSign(sign), sign).not.toContain('kether');
    }
  });

  it('totals exactly 23 open Doors across all classes (11×2 + 1×1)', () => {
    const total = allSigns.reduce(
      (acc, sign) => acc + soulDoorsForSign(sign).length,
      0,
    );
    expect(total).toBe(23);
  });

  /**
   * Cross-reference every Door against the actual path network: the
   * sign's "soul card" is the zodiacal Major Arcanum keyed to that
   * sign (the 12 Simples in `data/arcana.ts`), and that card's path
   * endpoints in `data/paths.ts` define the Door set. If `paths.ts`
   * or `arcana.ts` ever drifts, this test catches the divergence.
   *
   * **This cross-check is only meaningful while `data/soul-doors.ts`
   * is hand-authored.** If the table is ever refactored to be
   * computed from `arcana.ts` + `paths.ts` at module load, this
   * assertion silently becomes a tautology. Keep `soul-doors.ts`
   * declarative.
   */
  it('Doors match the soul card path endpoints from data/paths.ts', () => {
    for (const sign of allSigns) {
      const soulCard = arcana.find(
        (a) => a.attribution.kind === 'sign' && a.attribution.value === sign,
      );
      expect(soulCard, `no soul card for ${sign}`).toBeDefined();
      const path = pathByArcanum(soulCard!.number);
      const pathEndpoints: SefirahKey[] = [path.from, path.to];
      const challengeEndpoints = pathEndpoints.filter(
        (s) => s !== 'malkuth' && s !== 'kether',
      );
      expect(
        [...soulDoorsForSign(sign)].sort(),
        `${sign} via ${soulCard!.name} (path ${path.number})`,
      ).toEqual([...challengeEndpoints].sort());
    }
  });
});

describe('soulDoorsForSign', () => {
  it('returns the exact frozen array from the Record export (no copy)', () => {
    expect(soulDoorsForSign('aries')).toBe(soulDoorsBySign.aries);
    expect(soulDoorsForSign('pisces')).toBe(soulDoorsBySign.pisces);
  });

  it('returns an immutable view (readonly tuple)', () => {
    // Type-level check: assigning to an element should be rejected by
    // TS. At runtime, the array is `Object.freeze`d so a write throws
    // in strict mode (vitest runs strict).
    const doors = soulDoorsForSign('aries');
    expect(() => {
      // @ts-expect-error — readonly array, runtime-frozen
      doors[0] = 'malkuth';
    }).toThrow();
  });
});
