import type { SefirahKey } from './types';

/**
 * Single Hebrew character used to identify a Sefirah on small icons
 * (Spark, Shell). Tradition does NOT assign single letters to Sefirot
 * — those belong to the 22 path letters — so this map is a
 * project-specific shorthand: the first letter of the Sefirah's
 * Hebrew name.
 *
 * One collision: Chokmah (חכמה) and Chesed (חסד) both start with ח.
 * Chesed is overridden to ס (samekh — its second letter) so the two
 * are visually distinguishable on inventory rows; sighted players who
 * cannot rely on background color (colorblindness, monochrome
 * displays) get a real glyph difference.
 *
 * Keep this in sync if `data/sefirot.ts` ever renames any Sefirah.
 */
export const sefirahMarkLetter: Readonly<Record<SefirahKey, string>> = {
  kether: 'כ',
  chokmah: 'ח',
  binah: 'ב',
  // Special-cased to avoid colliding with Chokmah's ח. See file header.
  chesed: 'ס',
  gevurah: 'ג',
  tiferet: 'ת',
  netzach: 'נ',
  hod: 'ה',
  yesod: 'י',
  malkuth: 'מ',
};
