import { describe, expect, it } from 'vitest';
import { dignityRelationship, quoteForBlessing, type DignityRelationship } from '../sefirah-quote';
import { sefirahBlessings } from '@/data/pantheons/greco-roman/blessings';
import { seededRng } from '../rng';
import type { SefirahKey, ZodiacSignKey } from '@/data';

/**
 * Pure engine helpers for the Sefirah Voices Epic (#251) — T3 / #254.
 *
 * `dignityRelationship(sefirah, sign)` resolves the 5-tier tone bucket
 * (`ruler / exaltation / neutral / detriment / fall`) given the
 * Sefirah's planetary key and the sign's classical dignities + modern
 * co-rulers. Locked tier rules from the design doc:
 *
 *   - Earth/Malkuth → always `neutral` (no planetKey).
 *   - When a sign is BOTH ruler and exalted for the same planet,
 *     `ruler` wins ("pick best at best pole").
 *     Locked example: Virgo at Hod (Mercury) → `ruler`.
 *   - When a sign is BOTH detriment and fall for the same planet,
 *     `fall` wins ("pick worst at worst pole").
 *     Locked example: Pisces at Hod (Mercury) → `fall`.
 *   - Modern co-rulership (Pluto → Scorpio, Neptune → Pisces) counts
 *     as `ruler` for the Sefirah whose planetKey matches.
 *     Locked examples: Scorpio at Kether → `ruler`, Pisces at
 *     Chokmah → `ruler`.
 *
 * `quoteForBlessing(sefirahBlessings, sefirah, sign, rng)` is a wrapper over
 * `pickBlessing` for naming continuity with the design doc and any
 * future engine selection logic.
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

const VALID_TIERS: readonly DignityRelationship[] = [
  'ruler',
  'exaltation',
  'neutral',
  'detriment',
  'fall',
];

describe('dignityRelationship', () => {
  it('returns one of the 5 valid tiers for every (sefirah, sign) cell', () => {
    // Parametric coverage of all 10 × 12 = 120 cells, per the ticket.
    for (const sefirah of ALL_SEFIROT) {
      for (const sign of ALL_SIGNS) {
        const tier = dignityRelationship(sefirah, sign);
        expect(VALID_TIERS).toContain(tier);
      }
    }
  });

  // ──────────────── locked edge cases ────────────────

  it('Malkuth × any sign → neutral (Earth has no planetKey)', () => {
    for (const sign of ALL_SIGNS) {
      expect(dignityRelationship('malkuth', sign)).toBe('neutral');
    }
  });

  it('Virgo at Hod → ruler (Mercury rules+exalted; pick best at best pole)', () => {
    expect(dignityRelationship('hod', 'virgo')).toBe('ruler');
  });

  it('Pisces at Hod → fall (Mercury detriment+fall; pick worst at worst pole)', () => {
    expect(dignityRelationship('hod', 'pisces')).toBe('fall');
  });

  it('Kether × any sign → neutral (collective voice is dignity-agnostic by design)', () => {
    // Per design/final-threshold.md § 1, Kether's avatar is the team
    // itself; T1 (#252) authored all 12 Kether cells in the collective
    // future-promise tone with the `neutral` tier tag. The engine
    // matches that authoring contract — even though Kether's planetKey
    // is Pluto and Pluto co-rules Scorpio (used by zodiac-bonus.ts
    // for stat bonuses, but NOT here for blessing tone).
    for (const sign of ALL_SIGNS) {
      expect(dignityRelationship('kether', sign)).toBe('neutral');
    }
  });

  it('Pisces at Chokmah → ruler (Neptune co-rules Pisces; modern rulership counts at non-Kether Sefirot)', () => {
    expect(dignityRelationship('chokmah', 'pisces')).toBe('ruler');
  });

  // ──────────────── per-Sefirah spot checks ────────────────

  it('Aries at Gevurah → ruler (Mars rules Aries)', () => {
    expect(dignityRelationship('gevurah', 'aries')).toBe('ruler');
  });

  it('Aries at Tiferet → exaltation (Sun exalted in Aries)', () => {
    expect(dignityRelationship('tiferet', 'aries')).toBe('exaltation');
  });

  it('Aries at Netzach → detriment (Venus detriment in Aries)', () => {
    expect(dignityRelationship('netzach', 'aries')).toBe('detriment');
  });

  it('Aries at Binah → fall (Saturn fall in Aries)', () => {
    expect(dignityRelationship('binah', 'aries')).toBe('fall');
  });

  it('Cancer at Yesod → ruler (Moon rules Cancer)', () => {
    expect(dignityRelationship('yesod', 'cancer')).toBe('ruler');
  });

  it('Cancer at Chesed → exaltation (Jupiter exalted in Cancer)', () => {
    expect(dignityRelationship('chesed', 'cancer')).toBe('exaltation');
  });

  it('Capricorn at Gevurah → exaltation (Mars exalted in Capricorn)', () => {
    expect(dignityRelationship('gevurah', 'capricorn')).toBe('exaltation');
  });

  it('Capricorn at Binah → ruler (Saturn rules Capricorn)', () => {
    expect(dignityRelationship('binah', 'capricorn')).toBe('ruler');
  });

  it('Aquarius at Binah → ruler (Saturn rules Aquarius — traditional)', () => {
    expect(dignityRelationship('binah', 'aquarius')).toBe('ruler');
  });

  it('Aquarius at Tiferet → detriment (Sun detriment in Aquarius)', () => {
    expect(dignityRelationship('tiferet', 'aquarius')).toBe('detriment');
  });

  it('Libra at Tiferet → fall (Sun fall in Libra)', () => {
    expect(dignityRelationship('tiferet', 'libra')).toBe('fall');
  });

  it('Libra at Netzach → ruler (Venus rules Libra)', () => {
    expect(dignityRelationship('netzach', 'libra')).toBe('ruler');
  });

  it('Sagittarius at Chesed → ruler (Jupiter rules Sagittarius)', () => {
    expect(dignityRelationship('chesed', 'sagittarius')).toBe('ruler');
  });

  it('Sagittarius at Hod → detriment (Mercury detriment in Sagittarius)', () => {
    expect(dignityRelationship('hod', 'sagittarius')).toBe('detriment');
  });

  it('Taurus at Yesod → exaltation (Moon exalted in Taurus)', () => {
    expect(dignityRelationship('yesod', 'taurus')).toBe('exaltation');
  });

  it('Scorpio at Yesod → fall (Moon fall in Scorpio)', () => {
    expect(dignityRelationship('yesod', 'scorpio')).toBe('fall');
  });

  // ──────────────── neutral cells (no planetary tie) ────────────────

  it('Aries at Hod → neutral (Mercury has no Aries dignity)', () => {
    expect(dignityRelationship('hod', 'aries')).toBe('neutral');
  });

  it('Capricorn at Tiferet → neutral (Sun has no Capricorn dignity)', () => {
    expect(dignityRelationship('tiferet', 'capricorn')).toBe('neutral');
  });
});

describe('quoteForBlessing', () => {
  it('returns a non-empty string for every (sefirah, sign) pair', () => {
    // Acceptance criterion: 120 cells, each yields a real quote.
    for (const sefirah of ALL_SEFIROT) {
      for (const sign of ALL_SIGNS) {
        const rng = seededRng(0);
        const quote = quoteForBlessing(sefirahBlessings, sefirah, sign, rng);
        expect(quote.length).toBeGreaterThan(0);
      }
    }
  });

  it('returns one of the 3 authored variants from the matrix', () => {
    const variants = sefirahBlessings.hod.gemini;
    const rng = seededRng(7);
    for (let i = 0; i < 30; i++) {
      const picked = quoteForBlessing(sefirahBlessings, 'hod', 'gemini', rng);
      expect(variants).toContain(picked);
    }
  });

  it('is deterministic given a seeded Rng', () => {
    const rngA = seededRng(42);
    const rngB = seededRng(42);
    expect(quoteForBlessing(sefirahBlessings, 'netzach', 'pisces', rngA)).toBe(
      quoteForBlessing(sefirahBlessings, 'netzach', 'pisces', rngB),
    );
  });
});
