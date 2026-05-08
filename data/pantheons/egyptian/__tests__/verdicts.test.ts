import { describe, expect, it } from 'vitest';

import { sefirahVerdicts } from '../verdicts';
import { sefirahVerdicts as grecoRomanVerdicts } from '../../greco-roman/verdicts';
import type { ChallengeOutcome } from '../../types';
import type { EncounterAvatarKey, ZodiacSignKey } from '../../../types';

/**
 * Egyptian verdict-matrix smoke test (#553 PR 1, solar quartet).
 *
 * Pins:
 *   - Structural completeness: every (avatar, sign, outcome) cell
 *     has exactly 3 variants on the four Egyptian-authored deities.
 *   - Word-count: every variant ≤ 25 words on Egyptian-authored
 *     deities (the greco-roman fallback cells are exempt — they
 *     belong to a different pantheon's voice and pre-existed).
 *   - No-duplicates within a cell.
 *   - Voice anchors per deity (loose contains-at-least-one-token
 *     check — confirms the voice register without over-constraining
 *     the authoring).
 *   - Fallback identity: the four contemplative-cluster keys
 *     reference the greco-roman matrix verbatim until PR 2 ships.
 */

const ENCOUNTER_AVATARS: readonly EncounterAvatarKey[] = [
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
  'pisces',
  'aquarius',
];

const OUTCOMES: readonly ChallengeOutcome[] = ['pass', 'fail'];

const EGYPTIAN_AUTHORED: ReadonlyArray<EncounterAvatarKey> = [
  'chesed', // Ra
  'gevurah', // Horus
  'tiferet', // Osiris
  'netzach', // Hathor
];

const FALLBACK_KEYS: ReadonlyArray<EncounterAvatarKey> = [
  'chokmah', // → greco-roman Athena until PR 2
  'binah', // → greco-roman Demeter until PR 2
  'hod', // → greco-roman Hermes until PR 2
  'yesod', // → greco-roman Selene until PR 2
];

const wordCount = (s: string): number =>
  s.trim().split(/\s+/).filter((w) => w.length > 0).length;

describe('Egyptian verdict matrix — solar quartet (#553 PR 1)', () => {
  it('covers every encounter avatar', () => {
    expect(Object.keys(sefirahVerdicts).sort()).toEqual(
      [...ENCOUNTER_AVATARS].sort(),
    );
  });

  describe('structural completeness — Egyptian-authored cells', () => {
    for (const avatar of EGYPTIAN_AUTHORED) {
      describe(avatar, () => {
        for (const sign of ZODIAC_SIGNS) {
          for (const outcome of OUTCOMES) {
            it(`${sign}/${outcome} has exactly 3 variants`, () => {
              const variants = sefirahVerdicts[avatar][sign][outcome];
              expect(variants.length).toBe(3);
              for (const v of variants) {
                expect(v.length).toBeGreaterThan(0);
              }
            });
          }
        }
      });
    }
  });

  describe('word count ≤ 25 — Egyptian-authored cells', () => {
    for (const avatar of EGYPTIAN_AUTHORED) {
      it(`${avatar} — every line is at most 25 words`, () => {
        for (const sign of ZODIAC_SIGNS) {
          for (const outcome of OUTCOMES) {
            for (const v of sefirahVerdicts[avatar][sign][outcome]) {
              const wc = wordCount(v);
              expect(
                wc,
                `${avatar}/${sign}/${outcome} (${wc} words): ${v}`,
              ).toBeLessThanOrEqual(25);
            }
          }
        }
      });
    }
  });

  describe('no duplicate variants within a cell — Egyptian-authored', () => {
    for (const avatar of EGYPTIAN_AUTHORED) {
      it(`${avatar} — variants within each (sign, outcome) cell are distinct`, () => {
        for (const sign of ZODIAC_SIGNS) {
          for (const outcome of OUTCOMES) {
            const variants = sefirahVerdicts[avatar][sign][outcome];
            const unique = new Set(variants);
            expect(
              unique.size,
              `${avatar}/${sign}/${outcome}`,
            ).toBe(variants.length);
          }
        }
      });
    }
  });

  describe('voice anchors — at least one cell per deity carries the locked imagery', () => {
    // Loose check — searches across every line in the deity's matrix
    // for any of the canonical-imagery tokens from #551 § 2. Catches
    // the regression where someone replaces a deity's voice without
    // realising the imagery anchor moved with it. Not exhaustive;
    // a stylistic proofread (the #294-pattern pass) handles deeper
    // voice consistency.

    const collectAllLines = (avatar: EncounterAvatarKey): string[] => {
      const lines: string[] = [];
      for (const sign of ZODIAC_SIGNS) {
        for (const outcome of OUTCOMES) {
          for (const v of sefirahVerdicts[avatar][sign][outcome]) {
            lines.push(v.toLowerCase());
          }
        }
      }
      return lines;
    };

    it('Ra (chesed) — solar/throne imagery present', () => {
      const all = collectAllLines('chesed').join(' ');
      expect(all).toMatch(/sun|sky|throne|kingdom|crown|noon|light/);
    });

    it('Horus (gevurah) — falcon/legal-claim imagery present', () => {
      const all = collectAllLines('gevurah').join(' ');
      expect(all).toMatch(
        /falcon|line|claim|wrong|case|court|verdict|inheritance|trial/,
      );
    });

    it('Osiris (tiferet) — Weighing-of-the-Heart imagery present', () => {
      const all = collectAllLines('tiferet').join(' ');
      expect(all).toMatch(
        /feather|scale|heart|weigh|underworld|throne of the dead|dead/,
      );
    });

    it('Hathor (netzach) — embodied-want imagery present', () => {
      const all = collectAllLines('netzach').join(' ');
      expect(all).toMatch(/cup|cow|milk|music|drink|thirst|body|want/);
    });
  });

  describe('greco-roman fallback for the contemplative cluster (PR 2 boundary)', () => {
    for (const k of FALLBACK_KEYS) {
      it(`${k} — references the greco-roman matrix verbatim until PR 2 ships`, () => {
        expect(sefirahVerdicts[k]).toBe(grecoRomanVerdicts[k]);
      });
    }
  });
});
