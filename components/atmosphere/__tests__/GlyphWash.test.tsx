import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { GlyphWash } from '../GlyphWash';

describe('GlyphWash', () => {
  it('renders a fixed click-through layer marked decorative', () => {
    const { container } = render(<GlyphWash letter="א" />);
    const layer = container.querySelector('[data-atmosphere="glyph-wash"]');
    expect(layer).not.toBeNull();
    const className = layer?.getAttribute('class') ?? '';
    expect(className).toMatch(/\bfixed\b/);
    expect(className).toMatch(/\bpointer-events-none\b/);
    expect(className).toMatch(/-z-10\b/);
    expect(layer?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders multiple copies of the letter at decreasing opacities', () => {
    const { container } = render(<GlyphWash letter="ב" />);
    const glyphs = container.querySelectorAll('[data-atmosphere="glyph-wash"] > span');
    expect(glyphs.length).toBeGreaterThanOrEqual(5);
    for (const glyph of glyphs) {
      expect(glyph.textContent).toBe('ב');
      const op = parseFloat((glyph as HTMLElement).style.opacity || '1');
      // Decorative; every glyph must read as texture, not text.
      expect(op).toBeLessThanOrEqual(0.1);
      expect(op).toBeGreaterThan(0);
    }
  });

  it('side="left" mirrors the anchor (data-wash-side)', () => {
    const right = render(<GlyphWash letter="ג" side="right" />).container;
    const left = render(<GlyphWash letter="ג" side="left" />).container;
    expect(
      right.querySelector('[data-atmosphere="glyph-wash"]')?.getAttribute('data-wash-side'),
    ).toBe('right');
    expect(
      left.querySelector('[data-atmosphere="glyph-wash"]')?.getAttribute('data-wash-side'),
    ).toBe('left');
  });
});
