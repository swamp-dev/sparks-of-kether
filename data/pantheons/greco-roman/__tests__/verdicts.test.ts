import { describe, expect, it } from 'vitest';
import {
  pickPlayerResponse,
  pickVerdict,
  sefirahPlayerResponses,
  sefirahVerdicts,
  type ChallengeOutcome,
} from '../verdicts';
import { avatarNames } from '../avatar-names';
import { seededRng } from '@/engine/rng';
import type { EncounterAvatarKey } from '../../../types';
import type { ZodiacSignKey } from '@/data';

/**
 * Pin the per-Sefirah avatar matrix shape (#277). Each (sefirah,
 * sign, outcome) cell must have at least one variant, and the
 * design-doc-locked count is 3. The loop covers all 8 challenge
 * Sefirot × 12 signs × 2 outcomes = 192 cells.
 */

const ENCOUNTER_SEFIROT: readonly EncounterAvatarKey[] = [
  'chokmah',
  'binah',
  'chesed',
  'gevurah',
  'tiferet',
  'netzach',
  'hod',
  'yesod',
];

const ZODIAC_SIGNS: readonly ZodiacSignKey[] = [
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

const OUTCOMES: readonly ChallengeOutcome[] = ['pass', 'fail'];

describe('sefirahVerdicts', () => {
  it('covers exactly the 8 challenge Sefirot (Hermes through Selene)', () => {
    expect(Object.keys(sefirahVerdicts).sort()).toEqual([...ENCOUNTER_SEFIROT].sort());
  });

  it('does not include Kether (collective Final Threshold, deferred to #285)', () => {
    expect(sefirahVerdicts).not.toHaveProperty('kether');
  });

  it('does not include Malkuth (Hestia is companion, not encounter)', () => {
    expect(sefirahVerdicts).not.toHaveProperty('malkuth');
  });

  it('every (sefirah, sign) cell has both pass and fail arrays', () => {
    for (const sefirah of ENCOUNTER_SEFIROT) {
      for (const sign of ZODIAC_SIGNS) {
        const cell = sefirahVerdicts[sefirah][sign];
        expect(cell, `${sefirah} / ${sign}`).toBeDefined();
        expect(Array.isArray(cell.pass), `${sefirah} / ${sign} / pass`).toBe(true);
        expect(Array.isArray(cell.fail), `${sefirah} / ${sign} / fail`).toBe(true);
      }
    }
  });

  it('every (sefirah, sign, outcome) cell has 3 variants', () => {
    for (const sefirah of ENCOUNTER_SEFIROT) {
      for (const sign of ZODIAC_SIGNS) {
        for (const outcome of OUTCOMES) {
          const variants = sefirahVerdicts[sefirah][sign][outcome];
          expect(variants.length, `${sefirah} / ${sign} / ${outcome}`).toBe(3);
        }
      }
    }
  });

  it('every variant is a non-empty string', () => {
    for (const sefirah of ENCOUNTER_SEFIROT) {
      for (const sign of ZODIAC_SIGNS) {
        for (const outcome of OUTCOMES) {
          const variants = sefirahVerdicts[sefirah][sign][outcome];
          for (const variant of variants) {
            expect(typeof variant, `${sefirah} / ${sign} / ${outcome}`).toBe('string');
            expect(variant.length, `${sefirah} / ${sign} / ${outcome}`).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});

describe('sefirahPlayerResponses', () => {
  it('covers exactly the 8 challenge Sefirot', () => {
    expect(Object.keys(sefirahPlayerResponses).sort()).toEqual([...ENCOUNTER_SEFIROT].sort());
  });

  it('every (sefirah, sign) cell has 3 variants', () => {
    for (const sefirah of ENCOUNTER_SEFIROT) {
      for (const sign of ZODIAC_SIGNS) {
        const variants = sefirahPlayerResponses[sefirah][sign];
        expect(variants.length, `${sefirah} / ${sign}`).toBe(3);
      }
    }
  });

  it('every player-response variant is a non-empty string', () => {
    for (const sefirah of ENCOUNTER_SEFIROT) {
      for (const sign of ZODIAC_SIGNS) {
        const variants = sefirahPlayerResponses[sefirah][sign];
        for (const variant of variants) {
          expect(typeof variant, `${sefirah} / ${sign}`).toBe('string');
          expect(variant.length, `${sefirah} / ${sign}`).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('avatarNames', () => {
  it('covers exactly the 8 challenge Sefirot', () => {
    expect(Object.keys(avatarNames).sort()).toEqual([...ENCOUNTER_SEFIROT].sort());
  });

  it('each entry has a non-empty primary name and (Greco-Roman) secondary name', () => {
    // Greco-Roman pins both — every avatar has a Greek primary name
    // and a Roman secondary name. Other pantheons (e.g. Egyptian)
    // may omit `secondary` per the `AvatarName` type's optionality.
    for (const sefirah of ENCOUNTER_SEFIROT) {
      const name = avatarNames[sefirah];
      expect(name.primary.length, `${sefirah} primary`).toBeGreaterThan(0);
      expect(name.secondary?.length ?? 0, `${sefirah} secondary`).toBeGreaterThan(0);
    }
  });

  it('matches the locked design — `design/avatars.md` § 1', () => {
    expect(avatarNames.hod).toEqual({ primary: 'Hermes', secondary: 'Mercury' });
    expect(avatarNames.binah).toEqual({ primary: 'Demeter', secondary: 'Ceres' });
    expect(avatarNames.chokmah).toEqual({ primary: 'Athena', secondary: 'Minerva' });
    expect(avatarNames.gevurah).toEqual({ primary: 'Ares', secondary: 'Mars' });
    expect(avatarNames.chesed).toEqual({ primary: 'Zeus', secondary: 'Jupiter' });
    expect(avatarNames.tiferet).toEqual({ primary: 'Apollo', secondary: 'Sol' });
    expect(avatarNames.netzach).toEqual({ primary: 'Aphrodite', secondary: 'Venus' });
    expect(avatarNames.yesod).toEqual({ primary: 'Selene', secondary: 'Luna' });
  });
});

describe('pickVerdict', () => {
  it('returns a variant from the cell for the given (sefirah, sign, outcome)', () => {
    const rng = seededRng(1);
    const verdict = pickVerdict(sefirahVerdicts, 'hod', 'aries', 'pass', rng);
    expect(sefirahVerdicts.hod.aries.pass).toContain(verdict);
  });

  it('returns variant 0 when rng selects index 0', () => {
    // Custom rng that always returns the lower bound.
    const lowRng = {
      int: (min: number, _max: number): number => min,
      d20: (): number => 1,
    };
    const verdict = pickVerdict(sefirahVerdicts, 'hod', 'aries', 'pass', lowRng);
    expect(verdict).toBe(sefirahVerdicts.hod.aries.pass[0]);
  });

  it('returns the last variant when rng selects the upper bound', () => {
    const highRng = {
      int: (_min: number, max: number): number => max,
      d20: (): number => 20,
    };
    const verdict = pickVerdict(sefirahVerdicts, 'chesed', 'libra', 'fail', highRng);
    const cell = sefirahVerdicts.chesed.libra.fail;
    expect(verdict).toBe(cell[cell.length - 1]);
  });

  it('throws if the sign key is unrecognised', () => {
    // Loud-fail-on-drift symmetry with `pickFraming`'s sign guard
    // (#497). The `ZodiacSignKey` narrow union prevents this at
    // compile time; the throw guards a forced cast or data drift.
    const rng = seededRng(1);
    expect(() =>
      pickVerdict(sefirahVerdicts, 'hod', 'not-a-sign' as ZodiacSignKey, 'pass', rng),
    ).toThrow();
  });
});

describe('pickPlayerResponse', () => {
  it('returns a variant from the cell for the given (sefirah, sign)', () => {
    const rng = seededRng(1);
    const line = pickPlayerResponse(sefirahPlayerResponses, 'netzach', 'pisces', rng);
    expect(sefirahPlayerResponses.netzach.pisces).toContain(line);
  });

  it('returns variant 0 when rng selects index 0', () => {
    const lowRng = {
      int: (min: number, _max: number): number => min,
      d20: (): number => 1,
    };
    const line = pickPlayerResponse(sefirahPlayerResponses, 'yesod', 'cancer', lowRng);
    expect(line).toBe(sefirahPlayerResponses.yesod.cancer[0]);
  });

  it('returns the last variant when rng selects the upper bound', () => {
    const highRng = {
      int: (_min: number, max: number): number => max,
      d20: (): number => 20,
    };
    const line = pickPlayerResponse(sefirahPlayerResponses, 'binah', 'capricorn', highRng);
    const cell = sefirahPlayerResponses.binah.capricorn;
    expect(line).toBe(cell[cell.length - 1]);
  });
});
