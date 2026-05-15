import { describe, expect, it } from 'vitest';
import { attributionColor, signGlowColor } from '../attribution-colors';
import type { ZodiacSignKey } from '../types';

/**
 * #445: `signGlowColor` brightens the two zodiac signs whose card-
 * surface hex is too dark to produce a perceptible glow at the
 * canonical `0.50 / 0.30 / 0.16` alpha stack on the indigo `bg-void`
 * substrate. Mirrors the per-Sefirah glow recipe pattern that already
 * substitutes for Binah (#4b0082) and Malkuth (#b87333) in
 * `tailwind.config.ts § boxShadow` for the same readability reason.
 *
 * Card surfaces (chips, attribution swatches) continue to use
 * `attributionColor` → `SIGN_COLORS` directly. Only the glow-emit
 * site routes through `signGlowColor`. The two functions therefore
 * disagree only on Scorpio + Capricorn, and only at glow-time.
 */

describe('signGlowColor (#445)', () => {
  it('substitutes a brighter hex for Scorpio (raw maroon is too dark on bg-void)', () => {
    expect(signGlowColor('scorpio')).toBe('#a04374');
  });

  it('substitutes a brighter hex for Capricorn (raw slate is too dark on bg-void)', () => {
    expect(signGlowColor('capricorn')).toBe('#5a7a9c');
  });

  it.each<ZodiacSignKey>([
    'aries',
    'taurus',
    'gemini',
    'cancer',
    'leo',
    'virgo',
    'libra',
    'sagittarius',
    'aquarius',
    'pisces',
  ])('passes through the raw SIGN_COLORS hex for %s', (sign) => {
    // Pass-through: glow uses the same hex as the card surface.
    expect(signGlowColor(sign)).toBe(attributionColor({ kind: 'sign', value: sign }));
  });

  it('returns a strict #rrggbb shape for every sign', () => {
    const signs: readonly ZodiacSignKey[] = [
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
    for (const sign of signs) {
      expect(signGlowColor(sign), `glow colour for ${sign}`).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('attributionColor — card-surface hex unchanged after #445', () => {
  // Defends the "card surfaces still render the original SIGN_COLORS
  // hex" AC. If a future refactor accidentally routes card-surface
  // attributionColor calls through signGlowColor, Scorpio's chip would
  // suddenly read pink and these tests would fail.
  it('still returns the dark maroon for Scorpio card surfaces', () => {
    expect(attributionColor({ kind: 'sign', value: 'scorpio' })).toBe('#5e2a4a');
  });

  it('still returns the dark slate for Capricorn card surfaces', () => {
    expect(attributionColor({ kind: 'sign', value: 'capricorn' })).toBe('#2a3a4a');
  });
});
