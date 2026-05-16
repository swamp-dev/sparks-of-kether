import { describe, expect, it } from 'vitest';

import { sefirahVerdicts } from '../verdicts';
import { sefirahVerdicts as grecoRomanVerdicts } from '../../greco-roman/verdicts';
import type { ChallengeOutcome } from '../../types';
import type { EncounterAvatarKey, ZodiacSignKey } from '../../../types';

/**
 * Egyptian verdict-matrix smoke test (#553).
 *
 * After PR 2 lands, all 8 encounter avatars are Egyptian-authored —
 * no greco-roman fallback cells remain in `sefirahVerdicts`. The
 * tests below pin:
 *
 *   - Structural completeness: every (avatar, sign, outcome) cell
 *     has exactly 3 variants on every avatar.
 *   - Word-count: every variant ≤ 25 words.
 *   - No-duplicates within a cell.
 *   - Voice anchors per deity (loose contains-at-least-one-token
 *     check — confirms the voice register without over-constraining
 *     the authoring).
 *   - No-fallback-identity: every avatar's matrix is distinct from
 *     the greco-roman counterpart (since the Egyptian voice is
 *     authored, the references should not match).
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

const wordCount = (s: string): number =>
  s
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

describe('Egyptian verdict matrix — fully Egyptian-authored (#553)', () => {
  it('covers every encounter avatar', () => {
    expect(Object.keys(sefirahVerdicts).sort()).toEqual([...ENCOUNTER_AVATARS].sort());
  });

  describe('structural completeness — every cell has 3 variants', () => {
    for (const avatar of ENCOUNTER_AVATARS) {
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

  describe('word count ≤ 25 — every line', () => {
    for (const avatar of ENCOUNTER_AVATARS) {
      it(`${avatar} — every line is at most 25 words`, () => {
        for (const sign of ZODIAC_SIGNS) {
          for (const outcome of OUTCOMES) {
            for (const v of sefirahVerdicts[avatar][sign][outcome]) {
              const wc = wordCount(v);
              expect(wc, `${avatar}/${sign}/${outcome} (${wc} words): ${v}`).toBeLessThanOrEqual(
                25,
              );
            }
          }
        }
      });
    }
  });

  describe('no duplicate variants within a cell', () => {
    for (const avatar of ENCOUNTER_AVATARS) {
      it(`${avatar} — variants within each (sign, outcome) cell are distinct`, () => {
        for (const sign of ZODIAC_SIGNS) {
          for (const outcome of OUTCOMES) {
            const variants = sefirahVerdicts[avatar][sign][outcome];
            const unique = new Set(variants);
            expect(unique.size, `${avatar}/${sign}/${outcome}`).toBe(variants.length);
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
      expect(all).toMatch(/falcon|line|claim|wrong|case|court|verdict|inheritance|trial/);
    });

    it('Osiris (tiferet) — Weighing-of-the-Heart imagery present', () => {
      const all = collectAllLines('tiferet').join(' ');
      expect(all).toMatch(/feather|scale|heart|weigh|underworld|throne of the dead|dead/);
    });

    it('Hathor (netzach) — embodied-want imagery present', () => {
      const all = collectAllLines('netzach').join(' ');
      expect(all).toMatch(/cup|cow|milk|music|drink|thirst|body|want/);
    });

    it('Amun (chokmah) — hidden/breath/pylon imagery present', () => {
      const all = collectAllLines('chokmah').join(' ');
      expect(all).toMatch(/hidden|breath|wind|pylon|mask|silence|silent/);
    });

    it('Isis (binah) — threshold/knot/carry imagery present', () => {
      const all = collectAllLines('binah').join(' ');
      expect(all).toMatch(/threshold|knot|carry|river|cosmic mother|loss|sorrow|bear/);
    });

    it('Thoth (hod) — ink/reed/page imagery present', () => {
      const all = collectAllLines('hod').join(' ');
      expect(all).toMatch(/ink|reed|page|tablet|line|scribe|wedjat|verdict/);
    });

    it('Khonsu (yesod) — moon/dream/crossing imagery present', () => {
      const all = collectAllLines('yesod').join(' ');
      expect(all).toMatch(/moon|dream|tide|crossing|night|traveller|path/);
    });
  });

  describe('Egyptian matrix is distinct from greco-roman across all keys (#553 PR 2)', () => {
    // After PR 2 lands, every avatar has its own Egyptian-authored
    // cells — `sefirahVerdicts[k]` should not be the same object
    // reference as `grecoRomanVerdicts[k]` for any avatar.
    for (const k of ENCOUNTER_AVATARS) {
      it(`${k} — Egyptian and greco-roman entries are distinct objects`, () => {
        expect(sefirahVerdicts[k]).not.toBe(grecoRomanVerdicts[k]);
      });
    }
  });
});
