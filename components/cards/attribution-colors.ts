import type { Attribution, Element, Planet, ZodiacSign } from '@/data';

/**
 * Map each astrological attribution to a single accent color used for
 * the card's bottom band. Choices follow standard Western occult color
 * attributions (Golden Dawn / King Scale, simplified): elements are
 * red/blue/yellow, planets are their Sefirot-aligned colors, signs use
 * the modern zodiacal palette.
 *
 * The palette is intentionally muted (saturated mid-tones, not full
 * primaries) so 22 cards on one screen don't fight each other.
 */

const ELEMENT_COLORS: Readonly<Record<Element, string>> = {
  fire: '#c0392b', // muted red
  water: '#2980b9', // ocean blue
  air: '#d4af37', // pale gold (yellow gets muddy on dark bg)
};

const PLANET_COLORS: Readonly<Record<Planet, string>> = {
  mercury: '#e07b00', // orange (Hod)
  moon: '#9b88c4', // pale violet (Yesod)
  venus: '#3a8f4a', // green (Netzach)
  jupiter: '#4169e1', // royal blue (Chesed)
  mars: '#a82323', // crimson (Gevurah)
  sun: '#d4af37', // gold (Tiferet)
  saturn: '#5c4a78', // indigo (Binah-adjacent)
};

const SIGN_COLORS: Readonly<Record<ZodiacSign, string>> = {
  aries: '#c0392b', // fire — red
  taurus: '#3a8f4a', // earth — green-leaning
  gemini: '#d4af37', // air — gold
  cancer: '#7fa6c2', // water — pale blue
  leo: '#e07b00', // fire — orange
  virgo: '#7a8c5c', // earth — olive
  libra: '#b8a3c2', // air — soft mauve
  scorpio: '#5e2a4a', // water — deep maroon
  sagittarius: '#b86e2a', // fire — burnt orange
  capricorn: '#2a3a4a', // earth — slate
  aquarius: '#5fb8c2', // air — bright teal (distinct from Cancer's pale blue)
  pisces: '#5c7a9c', // water — sea-blue
};

export function attributionColor(attribution: Attribution): string {
  switch (attribution.kind) {
    case 'element':
      return ELEMENT_COLORS[attribution.value];
    case 'planet':
      return PLANET_COLORS[attribution.value];
    case 'sign':
      return SIGN_COLORS[attribution.value];
  }
}

/**
 * Short human-readable label for the attribution (e.g. "Mercury",
 * "Aries", "Fire"). Used in the card footer line and aria-label.
 */
export function attributionLabel(attribution: Attribution): string {
  const v = attribution.value;
  return v.charAt(0).toUpperCase() + v.slice(1);
}
