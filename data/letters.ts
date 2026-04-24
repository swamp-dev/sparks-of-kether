import type { HebrewLetter } from './types';

/**
 * The 22 Hebrew letters, in traditional aleph → tav order.
 * Source: `reference/hebrew-letters.md` master table.
 *
 * Sepher Yetzirah classification:
 *   - 3 Mothers (Aleph, Mem, Shin) attributed to elements.
 *   - 7 Doubles (Beth, Gimel, Daleth, Kaph, Peh, Resh, Tav) to planets.
 *   - 12 Simples (the rest) to zodiac signs, in calendar order starting with He = Aries.
 *
 * **Attribution order:** Golden Dawn / Waite (as in the reference tables),
 * with He = Aries and Tzaddi = Aquarius. Crowley's *Book of Thoth* swaps
 * these two (He = Aquarius, Tzaddi = Aries); if a future ticket adopts
 * the Thoth order, update both this file and `arcana.ts` together.
 */
export const letters: readonly HebrewLetter[] = [
  // Mothers
  {
    key: 'aleph',
    name: 'Aleph',
    glyph: 'א',
    value: 1,
    meaning: 'Ox',
    class: 'mother',
    attribution: { kind: 'element', value: 'air' },
    pathNumber: 11,
  },
  // Doubles
  {
    key: 'beth',
    name: 'Beth',
    glyph: 'ב',
    value: 2,
    meaning: 'House',
    class: 'double',
    attribution: { kind: 'planet', value: 'mercury' },
    pathNumber: 12,
  },
  {
    key: 'gimel',
    name: 'Gimel',
    glyph: 'ג',
    value: 3,
    meaning: 'Camel',
    class: 'double',
    attribution: { kind: 'planet', value: 'moon' },
    pathNumber: 13,
  },
  {
    key: 'daleth',
    name: 'Daleth',
    glyph: 'ד',
    value: 4,
    meaning: 'Door',
    class: 'double',
    attribution: { kind: 'planet', value: 'venus' },
    pathNumber: 14,
  },
  // Simples (zodiac order)
  {
    key: 'he',
    name: 'He',
    glyph: 'ה',
    value: 5,
    meaning: 'Window',
    class: 'simple',
    attribution: { kind: 'sign', value: 'aries' },
    pathNumber: 15,
  },
  {
    key: 'vav',
    name: 'Vav',
    glyph: 'ו',
    value: 6,
    meaning: 'Nail / Hook',
    class: 'simple',
    attribution: { kind: 'sign', value: 'taurus' },
    pathNumber: 16,
  },
  {
    key: 'zayin',
    name: 'Zayin',
    glyph: 'ז',
    value: 7,
    meaning: 'Sword',
    class: 'simple',
    attribution: { kind: 'sign', value: 'gemini' },
    pathNumber: 17,
  },
  {
    key: 'cheth',
    name: 'Cheth',
    glyph: 'ח',
    value: 8,
    meaning: 'Fence',
    class: 'simple',
    attribution: { kind: 'sign', value: 'cancer' },
    pathNumber: 18,
  },
  {
    key: 'teth',
    name: 'Teth',
    glyph: 'ט',
    value: 9,
    meaning: 'Serpent',
    class: 'simple',
    attribution: { kind: 'sign', value: 'leo' },
    pathNumber: 19,
  },
  {
    key: 'yod',
    name: 'Yod',
    glyph: 'י',
    value: 10,
    meaning: 'Hand',
    class: 'simple',
    attribution: { kind: 'sign', value: 'virgo' },
    pathNumber: 20,
  },
  // Double
  {
    key: 'kaph',
    name: 'Kaph',
    glyph: 'כ',
    value: 20,
    meaning: 'Palm',
    class: 'double',
    attribution: { kind: 'planet', value: 'jupiter' },
    pathNumber: 21,
  },
  // Simple
  {
    key: 'lamed',
    name: 'Lamed',
    glyph: 'ל',
    value: 30,
    meaning: 'Ox-goad',
    class: 'simple',
    attribution: { kind: 'sign', value: 'libra' },
    pathNumber: 22,
  },
  // Mother
  {
    key: 'mem',
    name: 'Mem',
    glyph: 'מ',
    value: 40,
    meaning: 'Water',
    class: 'mother',
    attribution: { kind: 'element', value: 'water' },
    pathNumber: 23,
  },
  // Simples
  {
    key: 'nun',
    name: 'Nun',
    glyph: 'נ',
    value: 50,
    meaning: 'Fish',
    class: 'simple',
    attribution: { kind: 'sign', value: 'scorpio' },
    pathNumber: 24,
  },
  {
    key: 'samekh',
    name: 'Samekh',
    glyph: 'ס',
    value: 60,
    meaning: 'Prop / Support',
    class: 'simple',
    attribution: { kind: 'sign', value: 'sagittarius' },
    pathNumber: 25,
  },
  {
    key: 'ayin',
    name: 'Ayin',
    glyph: 'ע',
    value: 70,
    meaning: 'Eye',
    class: 'simple',
    attribution: { kind: 'sign', value: 'capricorn' },
    pathNumber: 26,
  },
  // Double
  {
    key: 'peh',
    name: 'Peh',
    glyph: 'פ',
    value: 80,
    meaning: 'Mouth',
    class: 'double',
    attribution: { kind: 'planet', value: 'mars' },
    pathNumber: 27,
  },
  // Simples
  {
    key: 'tzaddi',
    name: 'Tzaddi',
    glyph: 'צ',
    value: 90,
    meaning: 'Fishhook',
    class: 'simple',
    attribution: { kind: 'sign', value: 'aquarius' },
    pathNumber: 28,
  },
  {
    key: 'qoph',
    name: 'Qoph',
    glyph: 'ק',
    value: 100,
    meaning: 'Back of head',
    class: 'simple',
    attribution: { kind: 'sign', value: 'pisces' },
    pathNumber: 29,
  },
  // Double
  {
    key: 'resh',
    name: 'Resh',
    glyph: 'ר',
    value: 200,
    meaning: 'Head',
    class: 'double',
    attribution: { kind: 'planet', value: 'sun' },
    pathNumber: 30,
  },
  // Mother
  {
    key: 'shin',
    name: 'Shin',
    glyph: 'ש',
    value: 300,
    meaning: 'Tooth',
    class: 'mother',
    attribution: { kind: 'element', value: 'fire' },
    pathNumber: 31,
  },
  // Double
  {
    key: 'tav',
    name: 'Tav',
    glyph: 'ת',
    value: 400,
    meaning: 'Cross / Mark',
    class: 'double',
    attribution: { kind: 'planet', value: 'saturn' },
    pathNumber: 32,
  },
];
