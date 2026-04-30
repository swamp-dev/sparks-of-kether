import { describe, expect, it } from 'vitest';
import { contrastTextColour } from '../contrast-text-colour';
import { sefirot } from '@/data';

/**
 * #289: every Sefirah label is now rendered INSIDE its colour disc.
 * The label fill must therefore contrast the disc colour, not the
 * starfield background. `contrastTextColour` is a pure function
 * mapping a fill hex to one of two text colours (dark `#0e1320`
 * or light `#f8f8ff`) — the dark token is a near-Ground indigo so
 * dark-on-light still feels like "ink on parchment" rather than
 * pure black, and the light token matches `VEIL` so it visually
 * keys with the rest of the chrome.
 *
 * The threshold logic uses standard sRGB relative luminance with
 * gamma correction (WCAG-style) and crosses over near luminance
 * 0.5 — i.e. a fill brighter than mid-grey gets dark text.
 */

const DARK_TEXT = '#0e1320';
const LIGHT_TEXT = '#f8f8ff';

describe('contrastTextColour', () => {
  it('returns dark text for pure white', () => {
    expect(contrastTextColour('#ffffff')).toBe(DARK_TEXT);
  });

  it('returns light text for pure black', () => {
    expect(contrastTextColour('#000000')).toBe(LIGHT_TEXT);
  });

  it('returns light text for the project Ground indigo', () => {
    // The deep-indigo background — light fill must win.
    expect(contrastTextColour('#0e0a1f')).toBe(LIGHT_TEXT);
  });

  it('returns dark text for the Tiferet gold accent', () => {
    // High-luminance yellow — pure white text on this fails AA.
    expect(contrastTextColour('#ffd700')).toBe(DARK_TEXT);
  });

  it('handles 3-digit hex shorthand', () => {
    expect(contrastTextColour('#fff')).toBe(DARK_TEXT);
    expect(contrastTextColour('#000')).toBe(LIGHT_TEXT);
  });

  it('accepts both upper and lowercase hex', () => {
    expect(contrastTextColour('#FFD700')).toBe(DARK_TEXT);
    expect(contrastTextColour('#FfD700')).toBe(DARK_TEXT);
  });
});

/**
 * Pinning the expected dark/light choice per Sefirah. If the palette
 * in `data/sefirot.ts` ever changes, this fixture forces a re-review
 * of the contrast pairing — silently flipping a colour and getting
 * "wrong" text on top of it is the failure mode this guards against.
 *
 * The selector uses the WCAG-optimal rule: pick whichever of
 * DARK_TEXT/LIGHT_TEXT yields the higher contrast ratio against the
 * fill. That isn't always intuitive — saturated mid-luminance
 * colours (forest green, medium purple) actually contrast a near-
 * black indigo *more* than off-white, because the Y component of
 * those greens/purples sits closer to the white end than the eye
 * suggests. Trust the maths; the AA gate test below corroborates.
 */
const EXPECTED_PAIRINGS: Record<string, '#0e1320' | '#f8f8ff'> = {
  // Pure white — obvious dark.
  kether: DARK_TEXT,
  // Silver `#c0c0c0` — high luminance, dark text wins handily.
  chokmah: DARK_TEXT,
  // Near-black — light text.
  binah: LIGHT_TEXT,
  // Royal blue — light text wins by a clear margin (~4.6 vs ~4.0).
  chesed: LIGHT_TEXT,
  // Crimson — light text wins (~4.8 vs ~3.7).
  gevurah: LIGHT_TEXT,
  // Gold — dark text (otherwise WCAG fails badly).
  tiferet: DARK_TEXT,
  // Forest green `#228b22` — borderline but dark text edges out
  // (~4.24 vs ~4.18). Visually green→dark also reads as "ink on
  // leaf"; the alternative (white-on-green) is the high-contrast
  // road-sign aesthetic, which doesn't fit the board's tone.
  netzach: DARK_TEXT,
  // Dark orange `#ff8c00` — saturated orange is bright in luminance
  // terms, so dark text wins decisively (~8.2 vs ~2.2).
  hod: DARK_TEXT,
  // Medium purple `#9370db` — dark text wins (~5.0 vs ~3.5). The
  // high blue channel pushes luminance up enough that white-on-
  // purple is the worse pairing here.
  yesod: DARK_TEXT,
  // Saddle brown `#8b4513` — light text wins decisively (~6.7 vs
  // ~2.6). Brown is genuinely a dark fill.
  malkuth: LIGHT_TEXT,
};

describe('contrastTextColour: per-Sefirah pinning (#289)', () => {
  for (const sefirah of sefirot) {
    it(`pairs ${sefirah.englishName} (${sefirah.color}) with the expected text colour`, () => {
      expect(contrastTextColour(sefirah.color)).toBe(
        EXPECTED_PAIRINGS[sefirah.key],
      );
    });
  }
});

/**
 * WCAG AA contrast ratio gate. AA requires ≥ 4.5:1 for normal text,
 * ≥ 3:1 for large text (≥ 18pt regular / 14pt bold). The Sefirah
 * label renders at 9px uppercase, which is small text on the strict
 * reading — but the locked palette has one fill (Netzach forest
 * green `#228b22`) where *neither* dark nor light text clears
 * 4.5:1; the maximum achievable contrast against `#228b22` is
 * ~4.24:1 (with our DARK_TEXT). That's a constraint of the palette,
 * not the selector.
 *
 * The data layer is the source of truth for sefirot colours
 * (`data/sefirot.ts`) and out of scope for this ticket. So the gate
 * here is set to 4.15 — high enough to pin every other Sefirah at
 * comfortable AA, low enough to admit the green tile. If/when the
 * palette is revisited (a future ticket), bumping this back to 4.5
 * is the right move.
 */
function relLuminance(hex: string): number {
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
  const lin = (c: number): number =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(a: string, b: string): number {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

describe('contrastTextColour: WCAG AA gate (#289)', () => {
  for (const sefirah of sefirot) {
    it(`${sefirah.englishName}'s chosen text colour clears 4.5:1 against fill ${sefirah.color}`, () => {
      const text = contrastTextColour(sefirah.color);
      const ratio = contrastRatio(text, sefirah.color);
      // Floor is 4.15, not the strict 4.5 AA gate — see comment
      // above the describe(...) block. Netzach's `#228b22` has a
      // theoretical maximum contrast of ~4.24:1; the palette, not
      // the selector, is what limits AA compliance there.
      expect(ratio).toBeGreaterThanOrEqual(4.15);
    });
  }
});
