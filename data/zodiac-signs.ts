import type { ZodiacSign } from './types';

/**
 * The 12 zodiac signs in zodiacal order (Aries through Pisces).
 * Source: `design/astrological-classes.md` § 5 (per-sign sketches).
 *
 * `element` includes 'earth' for the three earth signs (Taurus, Virgo,
 * Capricorn) — the project's `Element` type covers only fire / water /
 * air (the Sepher Yetzirah Mother letters), so the `ZodiacSign.element`
 * type widens it to `Element | 'earth'`. This is intentional: the four
 * classical elements live in the zodiac, even though only three appear
 * in the path attributions.
 *
 * `coRuler` is set only for Scorpio (Pluto, modern) and Pisces
 * (Neptune, modern). The classical 7-planet roster is preserved for
 * the other ten signs.
 */
export const zodiacSigns: readonly ZodiacSign[] = [
  {
    key: 'aries',
    name: 'Aries',
    glyph: '♈',
    element: 'fire',
    modality: 'cardinal',
    ruler: 'mars',
  },
  {
    key: 'taurus',
    name: 'Taurus',
    glyph: '♉',
    element: 'earth',
    modality: 'fixed',
    ruler: 'venus',
  },
  {
    key: 'gemini',
    name: 'Gemini',
    glyph: '♊',
    element: 'air',
    modality: 'mutable',
    ruler: 'mercury',
  },
  {
    key: 'cancer',
    name: 'Cancer',
    glyph: '♋',
    element: 'water',
    modality: 'cardinal',
    ruler: 'moon',
  },
  {
    key: 'leo',
    name: 'Leo',
    glyph: '♌',
    element: 'fire',
    modality: 'fixed',
    ruler: 'sun',
  },
  {
    key: 'virgo',
    name: 'Virgo',
    glyph: '♍',
    element: 'earth',
    modality: 'mutable',
    ruler: 'mercury',
  },
  {
    key: 'libra',
    name: 'Libra',
    glyph: '♎',
    element: 'air',
    modality: 'cardinal',
    ruler: 'venus',
  },
  {
    key: 'scorpio',
    name: 'Scorpio',
    glyph: '♏',
    element: 'water',
    modality: 'fixed',
    ruler: 'mars',
    coRuler: 'pluto',
  },
  {
    key: 'sagittarius',
    name: 'Sagittarius',
    glyph: '♐',
    element: 'fire',
    modality: 'mutable',
    ruler: 'jupiter',
  },
  {
    key: 'capricorn',
    name: 'Capricorn',
    glyph: '♑',
    element: 'earth',
    modality: 'cardinal',
    ruler: 'saturn',
  },
  {
    key: 'aquarius',
    name: 'Aquarius',
    glyph: '♒',
    element: 'air',
    modality: 'fixed',
    ruler: 'saturn',
  },
  {
    key: 'pisces',
    name: 'Pisces',
    glyph: '♓',
    element: 'water',
    modality: 'mutable',
    ruler: 'jupiter',
    coRuler: 'neptune',
  },
];
