/**
 * Pick the legible text colour to overlay on a coloured Sefirah disc.
 *
 * #289 background: each Sefirah's English name is rendered INSIDE its
 * coloured circle, not below it. With ten different fills (white,
 * silver, near-black, royal blue, crimson, gold, forest green, dark
 * orange, medium purple, saddle brown), a single text colour can't
 * clear WCAG AA contrast against all of them. This pure helper picks
 * between two pre-chosen text colours per fill, using the WCAG-style
 * sRGB relative-luminance formula to compute contrast ratios and
 * returning whichever option pairs better.
 *
 * Why not just luminance-threshold at 0.5? Because that doesn't
 * account for the *near-white* vs *near-black* distance from each
 * specific text colour we have in hand. A saturated mid-luminance
 * fill (forest green ≈ 0.19, medium purple ≈ 0.23) can contrast a
 * near-black indigo *more* than an off-white VEIL, despite being
 * "darker than white." Computing both ratios and picking the larger
 * is the WCAG-optimal answer.
 *
 * Output palette:
 * - DARK_TEXT `#0e1320` — near-black with a faint indigo tint that
 *   keys to the project's GROUND token (`#0e0a1f`) without matching
 *   it pixel-for-pixel; the slight contrast lift makes dark text on
 *   light fills feel like ink rather than pure black.
 * - LIGHT_TEXT `#f8f8ff` — matches the project's VEIL token, so
 *   light-text Sefirah labels sit in the same family as path-number
 *   discs, the title bar, and other chrome.
 *
 * Pure: no DOM, no globals. The function is fully covered by
 * `__tests__/contrast-text-colour.test.ts` (per-fill pinning + WCAG
 * AA gate against every Sefirah palette colour).
 */

const DARK_TEXT = '#0e1320';
const LIGHT_TEXT = '#f8f8ff';

export function contrastTextColour(fillHex: string): '#0e1320' | '#f8f8ff' {
  const ratioDark = contrastRatio(fillHex, DARK_TEXT);
  const ratioLight = contrastRatio(fillHex, LIGHT_TEXT);
  return ratioDark >= ratioLight ? DARK_TEXT : LIGHT_TEXT;
}

/**
 * WCAG 2.x contrast ratio between two sRGB colours, expressed as
 * a number ≥ 1. AA requires ≥ 4.5 for normal text, ≥ 3.0 for large.
 */
function contrastRatio(a: string, b: string): number {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * sRGB relative luminance per WCAG 2.x. Channel values are gamma-
 * decoded to linear light, then weighted by photopic sensitivity
 * (R 0.2126, G 0.7152, B 0.0722).
 */
function relLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const lin = (c: number): number => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * Parse a 3- or 6-digit hex string to 0–1 RGB. Tolerates an optional
 * leading `#` and either case. Anything malformed yields `NaN`s,
 * which propagate through `relLuminance` to `NaN` — caller-error
 * cases that the test suite would catch immediately.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '');
  const expanded =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((c) => c + c)
          .join('')
      : cleaned;
  const r = parseInt(expanded.slice(0, 2), 16) / 255;
  const g = parseInt(expanded.slice(2, 4), 16) / 255;
  const b = parseInt(expanded.slice(4, 6), 16) / 255;
  return { r, g, b };
}
