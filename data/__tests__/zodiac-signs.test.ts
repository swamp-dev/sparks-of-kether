import { describe, expect, it } from 'vitest';
import {
  sefirot,
  statForPlanet,
  zodiacSigns,
  zodiacSignByKey,
  type Planet,
  type ZodiacSign,
  type ZodiacSignKey,
} from '@/data';

describe('zodiacSigns', () => {
  it('exports exactly 12 signs in zodiacal order (Aries → Pisces)', () => {
    expect(zodiacSigns).toHaveLength(12);
    const expectedOrder: readonly ZodiacSignKey[] = [
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
    expect(zodiacSigns.map((s) => s.key)).toEqual(expectedOrder);
  });

  it('each sign has a non-empty glyph and display name', () => {
    for (const sign of zodiacSigns) {
      expect(sign.glyph.length).toBeGreaterThan(0);
      expect(sign.name.length).toBeGreaterThan(0);
      // Glyph is a single Unicode codepoint (♈ etc).
      expect([...sign.glyph]).toHaveLength(1);
    }
  });

  it('rulers match the locked design — `design/astrological-classes.md` § 5', () => {
    const expectedRulers: Readonly<Record<ZodiacSignKey, Planet>> = {
      aries: 'mars',
      taurus: 'venus',
      gemini: 'mercury',
      cancer: 'moon',
      leo: 'sun',
      virgo: 'mercury',
      libra: 'venus',
      scorpio: 'mars',
      sagittarius: 'jupiter',
      capricorn: 'saturn',
      aquarius: 'saturn',
      pisces: 'jupiter',
    };
    for (const sign of zodiacSigns) {
      expect(sign.ruler, `ruler for ${sign.key}`).toBe(expectedRulers[sign.key]);
    }
  });

  it('co-rulers are present only for Scorpio (Pluto) and Pisces (Neptune)', () => {
    const withCoRuler: Record<string, Planet | undefined> = {};
    for (const sign of zodiacSigns) {
      withCoRuler[sign.key] = sign.coRuler;
    }
    expect(withCoRuler.scorpio).toBe('pluto');
    expect(withCoRuler.pisces).toBe('neptune');
    // No other sign carries a co-ruler.
    const others = zodiacSigns.filter(
      (s) => s.key !== 'scorpio' && s.key !== 'pisces',
    );
    for (const sign of others) {
      expect(sign.coRuler, `${sign.key} should not have a co-ruler`).toBeUndefined();
    }
  });

  it('elements: 3 fire, 3 earth, 3 air, 3 water', () => {
    const counts: Record<ZodiacSign['element'], number> = {
      fire: 0,
      earth: 0,
      air: 0,
      water: 0,
    };
    for (const sign of zodiacSigns) {
      counts[sign.element] += 1;
    }
    expect(counts).toEqual({ fire: 3, earth: 3, air: 3, water: 3 });
  });

  it('modalities: 4 cardinal, 4 fixed, 4 mutable', () => {
    const counts: Record<ZodiacSign['modality'], number> = {
      cardinal: 0,
      fixed: 0,
      mutable: 0,
    };
    for (const sign of zodiacSigns) {
      counts[sign.modality] += 1;
    }
    expect(counts).toEqual({ cardinal: 4, fixed: 4, mutable: 4 });
  });

  it('zodiacSignByKey returns the right record', () => {
    expect(zodiacSignByKey('aries').name).toBe('Aries');
    expect(zodiacSignByKey('pisces').coRuler).toBe('neptune');
  });

  it('zodiacSignByKey throws on an unknown key', () => {
    expect(() => zodiacSignByKey('ghost' as ZodiacSignKey)).toThrow(
      /Unknown zodiac sign key/,
    );
  });
});

describe('statForPlanet', () => {
  // Pinning the planet → stat mapping directly so a future regression
  // in either `data/sefirot.ts` (renamed planetKey) or `data/types.ts`
  // (StatKey rename) surfaces here as a labelled failure rather than
  // as a per-sign delta mismatch downstream in the engine tests.
  const expected: Readonly<Record<Planet, string>> = {
    saturn: 'understanding',
    jupiter: 'lovingkindness',
    mars: 'strength',
    sun: 'harmony',
    venus: 'passion',
    mercury: 'intellect',
    moon: 'intuition',
    pluto: 'unity',
    neptune: 'insight',
  };

  it.each(Object.entries(expected) as [Planet, string][])(
    'statForPlanet(%s) returns %s',
    (planet, stat) => {
      expect(statForPlanet(planet)).toBe(stat);
    },
  );

  it('the mapping is derived from sefirot.ts (no embedded duplication)', () => {
    // Cross-check: every Sefirah with a planetKey contributes its
    // (planetKey → stat) pair to the lookup. If sefirot.ts is the
    // sole source of truth, this assertion holds.
    for (const s of sefirot) {
      if (s.planetKey) {
        expect(statForPlanet(s.planetKey)).toBe(s.stat);
      }
    }
  });

  it('Malkuth has no planetKey (Earth is excluded from Planet by design)', () => {
    const malkuth = sefirot.find((s) => s.key === 'malkuth');
    expect(malkuth?.planetKey).toBeUndefined();
  });

  it('throws on an unknown planet key', () => {
    expect(() => statForPlanet('chronos' as Planet)).toThrow(
      /No stat for planet/,
    );
  });
});
