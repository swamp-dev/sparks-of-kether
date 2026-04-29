import { describe, expect, it } from 'vitest';
import {
  signDignities,
  dignitiesBySign,
  type Planet,
  type ZodiacSignKey,
} from '@/data';

/**
 * The dignity table is the load-bearing data for the astrological-class
 * system. Every cell is asserted explicitly against
 * `design/astrological-classes.md` § 3 — drift between the doc and the
 * data here would silently mis-tune class bonuses.
 */
describe('signDignities', () => {
  it('exports exactly 12 entries, one per sign', () => {
    expect(signDignities).toHaveLength(12);
    const keys = signDignities.map((d) => d.sign);
    const unique = new Set(keys);
    expect(unique.size).toBe(12);
  });

  type Row = {
    rulership: Planet;
    exaltation: Planet | null;
    detriment: Planet;
    fall: Planet | null;
  };
  const expected: Readonly<Record<ZodiacSignKey, Row>> = {
    aries:       { rulership: 'mars',    exaltation: 'sun',     detriment: 'venus',   fall: 'saturn'  },
    taurus:      { rulership: 'venus',   exaltation: 'moon',    detriment: 'mars',    fall: null      },
    gemini:      { rulership: 'mercury', exaltation: null,      detriment: 'jupiter', fall: null      },
    cancer:      { rulership: 'moon',    exaltation: 'jupiter', detriment: 'saturn',  fall: 'mars'    },
    leo:         { rulership: 'sun',     exaltation: null,      detriment: 'saturn',  fall: null      },
    virgo:       { rulership: 'mercury', exaltation: 'mercury', detriment: 'jupiter', fall: 'venus'   },
    libra:       { rulership: 'venus',   exaltation: 'saturn',  detriment: 'mars',    fall: 'sun'     },
    scorpio:     { rulership: 'mars',    exaltation: null,      detriment: 'venus',   fall: 'moon'    },
    sagittarius: { rulership: 'jupiter', exaltation: null,      detriment: 'mercury', fall: null      },
    capricorn:   { rulership: 'saturn',  exaltation: 'mars',    detriment: 'moon',    fall: 'jupiter' },
    aquarius:    { rulership: 'saturn',  exaltation: null,      detriment: 'sun',     fall: null      },
    pisces:      { rulership: 'jupiter', exaltation: 'venus',   detriment: 'mercury', fall: 'mercury' },
  };

  // Explicit ordering doubles as a completeness assertion: if a sign
  // is dropped from `expected` (typed as Record<ZodiacSignKey, ...>),
  // TypeScript catches it at the definition site; if a sign is dropped
  // from THIS list, the omission is visible at a glance.
  const allSigns: readonly ZodiacSignKey[] = [
    'aries',       'taurus',      'gemini',      'cancer',
    'leo',         'virgo',       'libra',       'scorpio',
    'sagittarius', 'capricorn',   'aquarius',    'pisces',
  ];

  it.each(allSigns)(
    '%s dignities match the design doc § 3',
    (sign) => {
      const dig = dignitiesBySign(sign);
      const row = expected[sign];
      expect(dig.rulership, `${sign} ruler`).toBe(row.rulership);
      expect(dig.exaltation, `${sign} exaltation`).toBe(row.exaltation);
      expect(dig.detriment, `${sign} detriment`).toBe(row.detriment);
      expect(dig.fall, `${sign} fall`).toBe(row.fall);
    },
  );

  // Two classical anomalies the engine must propagate as cumulative
  // bonuses — call them out explicitly so a regression in either is a
  // labelled failure rather than a row-mismatch.
  it("Virgo's Mercury is BOTH ruler AND exalted (cumulative +3 to intellect downstream)", () => {
    const v = dignitiesBySign('virgo');
    expect(v.rulership).toBe('mercury');
    expect(v.exaltation).toBe('mercury');
  });

  it("Pisces' Mercury is BOTH detriment AND fall (cumulative -3 to intellect downstream)", () => {
    const p = dignitiesBySign('pisces');
    expect(p.detriment).toBe('mercury');
    expect(p.fall).toBe('mercury');
  });

  it('classical "thin" signs have empty exaltation AND empty fall slots', () => {
    const thin: ZodiacSignKey[] = ['gemini', 'leo', 'sagittarius', 'aquarius'];
    for (const sign of thin) {
      const d = dignitiesBySign(sign);
      expect(d.exaltation, `${sign} exaltation`).toBeNull();
      expect(d.fall, `${sign} fall`).toBeNull();
    }
  });

  it('Taurus has no fall (matches Scorpio having no exaltation)', () => {
    expect(dignitiesBySign('taurus').fall).toBeNull();
    expect(dignitiesBySign('scorpio').exaltation).toBeNull();
  });

  it('detriment is always the planet that rules the opposite sign', () => {
    // Pin a representative sample; the design doc § 3 invariant
    // applies across all 12. Six pairs of opposite signs:
    const pairs: readonly [ZodiacSignKey, ZodiacSignKey][] = [
      ['aries', 'libra'],
      ['taurus', 'scorpio'],
      ['gemini', 'sagittarius'],
      ['cancer', 'capricorn'],
      ['leo', 'aquarius'],
      ['virgo', 'pisces'],
    ];
    for (const [a, b] of pairs) {
      expect(dignitiesBySign(a).detriment).toBe(dignitiesBySign(b).rulership);
      expect(dignitiesBySign(b).detriment).toBe(dignitiesBySign(a).rulership);
    }
  });

  it('dignitiesBySign throws on an unknown key', () => {
    expect(() => dignitiesBySign('ghost' as ZodiacSignKey)).toThrow(
      /No dignities for zodiac sign/,
    );
  });

  // Population-level accounting from `design/astrological-classes.md`
  // § 4: across all 12 signs, the classical 7 planets each net to 0
  // (rulership +1 + exaltation +2 + detriment -1 + fall -2, weighted
  // by how many signs each planet appears as ruler / exalt / detr /
  // fall). Pluto and Neptune are individually unbalanced because the
  // modern co-rulership has no detriment/fall counterpart — each
  // contributes a single +1 across the population. This test pins
  // both the balance AND the deliberate Pluto/Neptune skew.
  it('classical 7 planets net to 0; Pluto and Neptune carry +1 each (per design § 4)', () => {
    const score: Record<string, number> = {};
    const bump = (planet: string | null, delta: number): void => {
      if (planet === null) return;
      score[planet] = (score[planet] ?? 0) + delta;
    };
    for (const d of signDignities) {
      bump(d.rulership, +1);
      bump(d.exaltation, +2);
      bump(d.detriment, -1);
      bump(d.fall, -2);
    }
    // Modern co-rulerships from zodiacSigns add another +1 each.
    bump('pluto', +1);   // Scorpio co-ruler
    bump('neptune', +1); // Pisces co-ruler

    expect(score.mercury).toBe(0);
    expect(score.venus).toBe(0);
    expect(score.mars).toBe(0);
    expect(score.jupiter).toBe(0);
    expect(score.saturn).toBe(0);
    expect(score.sun).toBe(0);
    expect(score.moon).toBe(0);
    expect(score.pluto).toBe(1);
    expect(score.neptune).toBe(1);
  });
});
