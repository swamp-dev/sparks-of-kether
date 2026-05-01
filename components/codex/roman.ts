/**
 * Tiny Roman-numeral formatter for the 0–21 Major Arcana range.
 * Handcrafted lookup beats a generic conversion routine because we
 * only ever format 22 values; the lookup is faster and the table is
 * editable if a future ticket changes the convention.
 */

const ROMAN: readonly string[] = [
  '0',
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
  'XIII',
  'XIV',
  'XV',
  'XVI',
  'XVII',
  'XVIII',
  'XIX',
  'XX',
  'XXI',
];

export function toRoman(n: number): string {
  return ROMAN[n] ?? String(n);
}
