import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pantheons } from '@/data/pantheons';
import type { EncounterAvatarKey } from '@/data/types';

/**
 * Pin the portrait asset contract (complements AvatarPortrait.test.tsx):
 *
 *   - Every encounter avatar (the 8 Sefirot with commissioned portraits)
 *     has both `small.webp` and `large.webp` in `public/portraits/<char>/`.
 *
 * When `imageFailed` flips to `true` in the browser it swaps silently
 * to the Hebrew-letter fallback with only a `console.warn`. This test
 * is the automated gate that catches a missing file before it ships.
 */

const PROJECT_ROOT = resolve(__dirname, '..', '..', '..', '..');
const ENCOUNTER_AVATAR_KEYS: readonly EncounterAvatarKey[] = [
  'chokmah',
  'binah',
  'chesed',
  'gevurah',
  'tiferet',
  'netzach',
  'hod',
  'yesod',
];

function portraitPath(character: string, size: 'small' | 'large'): string {
  return resolve(PROJECT_ROOT, 'public', 'portraits', character, `${size}.webp`);
}

// TODO(#556): When Phase B ships the Egyptian pantheon portraits, loop over all
// PantheonId values (not just 'greco-roman') so missing Egyptian assets are caught.
describe('portrait assets', () => {
  it('every encounter avatar has large.webp in public/portraits/<character>/', () => {
    const missing: string[] = [];
    const avatarNames = pantheons['greco-roman'].avatarNames;
    for (const sefirah of ENCOUNTER_AVATAR_KEYS) {
      const character = avatarNames[sefirah].primary.toLowerCase();
      const path = portraitPath(character, 'large');
      if (!existsSync(path)) {
        missing.push(`${sefirah} (${character}) → /portraits/${character}/large.webp`);
      }
    }
    expect(missing, `Missing portrait assets:\n  ${missing.join('\n  ')}`).toEqual([]);
  });

  it('every encounter avatar has small.webp in public/portraits/<character>/', () => {
    const missing: string[] = [];
    const avatarNames = pantheons['greco-roman'].avatarNames;
    for (const sefirah of ENCOUNTER_AVATAR_KEYS) {
      const character = avatarNames[sefirah].primary.toLowerCase();
      const path = portraitPath(character, 'small');
      if (!existsSync(path)) {
        missing.push(`${sefirah} (${character}) → /portraits/${character}/small.webp`);
      }
    }
    expect(missing, `Missing portrait assets:\n  ${missing.join('\n  ')}`).toEqual([]);
  });
});
