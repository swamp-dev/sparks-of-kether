import { describe, expect, it } from 'vitest';
import { pickFraming, sefirahFraming, sefirahFramingPlaceholder } from '../framing';
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
 * Unit tests for the trial-framing copy matrix (#478). Mirrors the
 * shape and contract of `sefirah-verdicts.test.ts` so the framing
 * picker carries the same determinism + coverage guarantees the
 * verdict picker has had since #277.
 *
 * Coverage tests pin the **structural** acceptance criterion (every
 * cell ≥ 3 variants) so a future copy revision can't silently drop
 * a variant. Voice-consistency is a sampling check — not exhaustive,
 * but enough to catch a wholesale tone swap. Full voice review of
 * each cell against `design/avatars.md` § 2 + § 3 is part of the
 * code-reviewer's pass on this PR.
 */
describe('sefirah-framing', () => {
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
        expect(Object.keys(sefirahFraming[avatar]).sort()).toEqual([...SIGN_KEYS].sort());
      }
    });

    it('has at least 3 variants per (avatar, sign) cell — acceptance criterion', () => {
      // Per #478 acceptance: "Each non-Malkuth-non-Kether Sefirah has
      // 12 signs × ≥3 framing variants." That's 8 × 12 × 3 = 288
      // strings minimum; the test fails loud if any cell drops below.
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
      // The generation prompt asks for "different rhythm, image,
      // angle" per variant. A duplicate inside one cell is the cheap
      // canary that the authoring went sloppy.
      for (const avatar of AVATAR_KEYS) {
        for (const sign of SIGN_KEYS) {
          const variants = sefirahFraming[avatar][sign];
          const unique = new Set(variants);
          expect(unique.size, `cell ${avatar}/${sign} has duplicate variants`).toBe(
            variants.length,
          );
        }
      }
    });
  });

  describe('pickFraming', () => {
    it('returns a variant from the requested cell', () => {
      const rng = seededRng(1);
      const line = pickFraming(sefirahFraming, 'hod', 'gemini', rng);
      expect(sefirahFraming['hod']['gemini']).toContain(line);
    });

    it('is deterministic given the same seed', () => {
      const rng1 = seededRng(42);
      const rng2 = seededRng(42);
      // Same seed + same call sequence → same line.
      const line1 = pickFraming(sefirahFraming, 'yesod', 'pisces', rng1);
      const line2 = pickFraming(sefirahFraming, 'yesod', 'pisces', rng2);
      expect(line1).toBe(line2);
    });

    it('produces different variants across different seeds (sanity)', () => {
      // 3 variants — at least two seeds in [1, 100] should land on
      // different cells. Property-style probe, not exhaustive.
      const seen = new Set<string>();
      for (let seed = 1; seed <= 100; seed += 1) {
        seen.add(pickFraming(sefirahFraming, 'chesed', 'leo', seededRng(seed)));
        if (seen.size > 1) break;
      }
      expect(seen.size).toBeGreaterThan(1);
    });

    it('throws if the avatar key is unrecognised', () => {
      // Defensive: matches `pickVerdict`'s loud-fail policy. The
      // engine's `EncounterAvatarKey` narrow union prevents this at
      // compile time; the throw guards a forced cast or data drift.
      const rng = seededRng(1);
      expect(() =>
        pickFraming(sefirahFraming, 'not-a-sefirah' as EncounterAvatarKey, 'aries', rng),
      ).toThrow();
    });

    it('throws if the sign key is unrecognised', () => {
      // Sign-axis symmetry with the bad-avatar test above (#497).
      // `pickFraming`'s explicit `variants === undefined` guard fires
      // for an unknown sign on a valid sefirah; the `ZodiacSignKey`
      // narrow union prevents this at compile time, and the throw
      // guards a forced cast or data drift.
      const rng = seededRng(1);
      expect(() =>
        pickFraming(sefirahFraming, 'hod', 'not-a-sign' as ZodiacSignKey, rng),
      ).toThrow();
    });
  });

  describe('voice consistency (sampling)', () => {
    // Cheap canary checks against `design/avatars.md` § 2 voice specs.
    // Each picks one cell whose voice is most distinctive and asserts
    // a token characteristic of that voice appears across at least
    // one of the variants. Not a substitute for a human voice review;
    // calibration only.

    it('Hermes (Hod) lines lean on language / wordplay / wit (per § 2)', () => {
      // "language-loving, sly, playful precision" — at least half the
      // Hermes cells should mention words/language/riddle/answer/wit.
      // Threshold tightened from >25% to >50% (#498) so a real voice
      // drift trips the canary earlier without becoming brittle.
      const allHermes = SIGN_KEYS.flatMap((s) => sefirahFraming['hod'][s]);
      const wordPattern =
        /\b(word|words|name|riddle|answer|tongue|language|speak|cousin|game|wit|message)\b/i;
      const hits = allHermes.filter((l) => wordPattern.test(l));
      expect(hits.length).toBeGreaterThan(allHermes.length / 2);
    });

    it('Demeter (Binah) lines carry weight / sorrow / earth (per § 2)', () => {
      // Same >50% threshold as the Hermes canary (#498) — half the
      // matrix should reflect the avatar's voice keywords.
      const allDemeter = SIGN_KEYS.flatMap((s) => sefirahFraming['binah'][s]);
      const weightPattern =
        /\b(earth|grief|weigh|loss|silent|silence|patience|patient|grain|seed|harvest|sorrow|memory|remember)\b/i;
      const hits = allDemeter.filter((l) => weightPattern.test(l));
      expect(hits.length).toBeGreaterThan(allDemeter.length / 2);
    });

    it('Ares (Gevurah) lines are martial / curt / cost-named (per § 2)', () => {
      // Same >50% threshold as the Hermes canary (#498) — half the
      // matrix should reflect the avatar's voice keywords.
      const allAres = SIGN_KEYS.flatMap((s) => sefirahFraming['gevurah'][s]);
      const martialPattern =
        /\b(strength|cost|pay|burn|war|blade|sword|shield|wound|battle|enemy|stand|fight)\b/i;
      const hits = allAres.filter((l) => martialPattern.test(l));
      expect(hits.length).toBeGreaterThan(allAres.length / 2);
    });
  });

  describe('placeholder fallback', () => {
    // Sign-less callers (demo / tests without a player sign) fall
    // back to the deterministic placeholder map — same shape as
    // `pickPlayerResponse` for the verdict matrix in #277.
    it('exports one placeholder line per challenge avatar', () => {
      for (const avatar of AVATAR_KEYS) {
        expect(sefirahFramingPlaceholder[avatar]).toBeTypeOf('string');
        expect(sefirahFramingPlaceholder[avatar].length).toBeGreaterThan(0);
      }
    });

    it('placeholder line names the avatar (sanity for sign-less render)', () => {
      // Cheap canary — placeholder lines should mention the avatar
      // by name so a sign-less render still reads like the avatar
      // is speaking.
      for (const avatar of AVATAR_KEYS) {
        const placeholder = sefirahFramingPlaceholder[avatar];
        const expectedName = avatarNames[avatar].primary;
        expect(placeholder, `placeholder for ${avatar} should mention "${expectedName}"`).toContain(
          expectedName,
        );
      }
    });
  });
});
