import { describe, expect, it } from 'vitest';
import {
  sefirahFraming,
  sefirahFramingPlaceholder,
} from '../framing';
import { pickFraming } from '../../greco-roman/framing';
import { avatarNames } from '../avatar-names';
import { seededRng } from '@/engine/rng';
import type { EncounterAvatarKey, ZodiacSignKey } from '../../../types';

const AVATAR_KEYS: readonly EncounterAvatarKey[] = [
  'chokmah',
  'binah',
  'chesed',
  'gevurah',
  'tiferet',
  'netzach',
  'hod',
  'yesod',
];

const SIGN_KEYS: readonly ZodiacSignKey[] = [
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

/**
 * Egyptian framing-matrix smoke test (#555).
 *
 *   8 encounter avatars × 12 signs × 3 variants = 288 strings.
 *
 * Mirrors the greco-roman framing test (#478):
 *
 *   - Structural completeness: 8 × 12 ≥ 3 variants per cell.
 *   - Non-empty strings.
 *   - No duplicates within a cell.
 *   - pickFraming determinism (uses the matrix-as-parameter picker
 *     from `pantheons/greco-roman/framing.ts` — shared across
 *     pantheons since A4 / #550).
 *   - Voice anchors per deity (loose contains-at-least-one-token
 *     check — confirms voice register without over-constraining).
 *   - Placeholder line per avatar, naming the deity for sign-less
 *     renders.
 *
 * Voice anchors follow `reference/pantheons/egyptian.md` (#551).
 */
describe('Egyptian framing matrix (#555)', () => {
  describe('matrix shape', () => {
    it('has an entry for each of the 8 challenge avatars', () => {
      for (const avatar of AVATAR_KEYS) {
        expect(sefirahFraming[avatar]).toBeDefined();
      }
      expect(Object.keys(sefirahFraming).sort()).toEqual([...AVATAR_KEYS].sort());
    });

    it('has 12 sign entries per avatar (Aries through Pisces)', () => {
      for (const avatar of AVATAR_KEYS) {
        for (const sign of SIGN_KEYS) {
          expect(sefirahFraming[avatar][sign]).toBeDefined();
        }
        expect(Object.keys(sefirahFraming[avatar]).sort()).toEqual(
          [...SIGN_KEYS].sort(),
        );
      }
    });

    it('has at least 3 variants per (avatar, sign) cell — acceptance criterion', () => {
      for (const avatar of AVATAR_KEYS) {
        for (const sign of SIGN_KEYS) {
          const variants = sefirahFraming[avatar][sign];
          expect(
            variants.length,
            `cell ${avatar}/${sign} has ${variants.length} variants (expected ≥3)`,
          ).toBeGreaterThanOrEqual(3);
        }
      }
    });

    it('every variant is a non-empty string', () => {
      for (const avatar of AVATAR_KEYS) {
        for (const sign of SIGN_KEYS) {
          for (const variant of sefirahFraming[avatar][sign]) {
            expect(variant).toBeTypeOf('string');
            expect(variant.length).toBeGreaterThan(0);
          }
        }
      }
    });

    it('variants within a cell are distinct (no copy-paste drift)', () => {
      for (const avatar of AVATAR_KEYS) {
        for (const sign of SIGN_KEYS) {
          const variants = sefirahFraming[avatar][sign];
          const unique = new Set(variants);
          expect(
            unique.size,
            `cell ${avatar}/${sign} has duplicate variants`,
          ).toBe(variants.length);
        }
      }
    });
  });

  describe('pickFraming (shared picker, matrix-as-parameter)', () => {
    it('returns a variant from the requested cell', () => {
      const rng = seededRng(1);
      const line = pickFraming(sefirahFraming, 'hod', 'gemini', rng);
      expect(sefirahFraming['hod']['gemini']).toContain(line);
    });

    it('is deterministic given the same seed', () => {
      const rng1 = seededRng(42);
      const rng2 = seededRng(42);
      const line1 = pickFraming(sefirahFraming, 'yesod', 'pisces', rng1);
      const line2 = pickFraming(sefirahFraming, 'yesod', 'pisces', rng2);
      expect(line1).toBe(line2);
    });

    it('produces different variants across different seeds (sanity)', () => {
      const seen = new Set<string>();
      for (let seed = 1; seed <= 100; seed += 1) {
        seen.add(pickFraming(sefirahFraming, 'chesed', 'leo', seededRng(seed)));
        if (seen.size > 1) break;
      }
      expect(seen.size).toBeGreaterThan(1);
    });
  });

  describe('voice consistency (sampling)', () => {
    // Cheap canary checks against `reference/pantheons/egyptian.md`
    // § 2 voice specs. Each picks one deity whose voice is most
    // distinctive and asserts a token characteristic of that voice
    // appears across at least half the cells.

    it('Thoth (Hod) lines lean on ink / reed / page / scribe / wedjat (per §2)', () => {
      const all = SIGN_KEYS.flatMap((s) => sefirahFraming['hod'][s]);
      const pattern = /\b(ink|reed|page|tablet|scribe|wedjat|line|mark|arcanum|card|word)\b/i;
      const hits = all.filter((l) => pattern.test(l));
      expect(hits.length).toBeGreaterThan(all.length / 2);
    });

    it('Isis (Binah) lines carry threshold / knot / carry / river / mother (per §2)', () => {
      const all = SIGN_KEYS.flatMap((s) => sefirahFraming['binah'][s]);
      const pattern = /\b(threshold|knot|carry|carrying|river|mother|gate|bear)\b/i;
      const hits = all.filter((l) => pattern.test(l));
      expect(hits.length).toBeGreaterThan(all.length / 2);
    });

    it('Horus (Gevurah) lines are martial / claim / line / pay / case (per §2)', () => {
      const all = SIGN_KEYS.flatMap((s) => sefirahFraming['gevurah'][s]);
      const pattern = /\b(falcon|claim|line|cost|pay|burn|case|court|verdict|wrong)\b/i;
      const hits = all.filter((l) => pattern.test(l));
      expect(hits.length).toBeGreaterThan(all.length / 2);
    });

    it('Amun (Chokmah) lines carry hidden / breath / wind / pylon / mask (per §2)', () => {
      const all = SIGN_KEYS.flatMap((s) => sefirahFraming['chokmah'][s]);
      const pattern = /\b(hidden|breath|wind|pylon|mask|silent|silence)\b/i;
      const hits = all.filter((l) => pattern.test(l));
      expect(hits.length).toBeGreaterThan(all.length / 2);
    });
  });

  describe('placeholder fallback', () => {
    it('exports one placeholder line per challenge avatar', () => {
      for (const avatar of AVATAR_KEYS) {
        expect(sefirahFramingPlaceholder[avatar]).toBeTypeOf('string');
        expect(sefirahFramingPlaceholder[avatar].length).toBeGreaterThan(0);
      }
    });

    it('placeholder line names the avatar (sanity for sign-less render)', () => {
      for (const avatar of AVATAR_KEYS) {
        const placeholder = sefirahFramingPlaceholder[avatar];
        const expectedName = avatarNames[avatar].primary;
        expect(
          placeholder,
          `placeholder for ${avatar} should mention "${expectedName}"`,
        ).toContain(expectedName);
      }
    });
  });
});
