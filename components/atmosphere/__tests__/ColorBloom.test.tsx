import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ColorBloom } from '../ColorBloom';

describe('ColorBloom', () => {
  it('renders a fixed-position click-through layer marked decorative', () => {
    const { container } = render(<ColorBloom color="#ffd700" />);
    const layer = container.querySelector('[data-atmosphere="color-bloom"]');
    expect(layer).not.toBeNull();
    const className = layer?.getAttribute('class') ?? '';
    expect(className).toMatch(/\bfixed\b/);
    expect(className).toMatch(/\bpointer-events-none\b/);
    expect(className).toMatch(/-z-10\b/);
    expect(layer?.getAttribute('aria-hidden')).toBe('true');
  });

  it('builds a radial gradient that mentions the colour and the position', () => {
    const { container } = render(<ColorBloom color="#ffd700" position="top-right" />);
    const layer = container.querySelector('[data-atmosphere="color-bloom"]');
    const style = layer?.getAttribute('data-bloom-css') ?? '';
    expect(style).toMatch(/radial-gradient/);
    expect(style).toMatch(/#ffd700/);
    // top-right anchor → 85% 15%
    expect(style).toMatch(/85% 15%/);
    expect(layer?.getAttribute('data-bloom-position')).toBe('top-right');
  });

  it('intensity controls the inner-stop alpha', () => {
    const dim = render(<ColorBloom color="#ffd700" intensity={0.1} />).container;
    const bright = render(<ColorBloom color="#ffd700" intensity={0.4} />).container;
    const dimStyle =
      dim.querySelector('[data-atmosphere="color-bloom"]')?.getAttribute('data-bloom-css') ?? '';
    const brightStyle =
      bright.querySelector('[data-atmosphere="color-bloom"]')?.getAttribute('data-bloom-css') ?? '';
    // intensity 0.1 → 10.0% mix; intensity 0.4 → 40.0% mix.
    expect(dimStyle).toMatch(/#ffd700 10\.0%/);
    expect(brightStyle).toMatch(/#ffd700 40\.0%/);
  });

  it('default position is `bottom`', () => {
    const { container } = render(<ColorBloom color="#9370db" />);
    const layer = container.querySelector('[data-atmosphere="color-bloom"]');
    expect(layer?.getAttribute('data-bloom-position')).toBe('bottom');
  });
});
