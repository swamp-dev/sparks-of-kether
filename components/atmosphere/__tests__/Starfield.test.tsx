import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Starfield } from '../Starfield';

describe('Starfield', () => {
  it('renders a fixed-position layer marked decorative and click-through', () => {
    const { container } = render(<Starfield />);
    const layer = container.querySelector('[data-atmosphere="starfield"]');
    expect(layer).not.toBeNull();
    const className = layer?.getAttribute('class') ?? '';
    expect(className).toMatch(/\bfixed\b/);
    expect(className).toMatch(/\binset-0\b/);
    expect(className).toMatch(/\bpointer-events-none\b/);
    expect(layer?.getAttribute('aria-hidden')).toBe('true');
    // Behind page content
    expect(className).toMatch(/-z-10\b/);
  });

  it('produces more stars at higher density', () => {
    const sparse = render(<Starfield density="sparse" />).container;
    const medium = render(<Starfield density="medium" />).container;
    const dense = render(<Starfield density="dense" />).container;
    const count = (root: HTMLElement) =>
      root.querySelectorAll('[data-atmosphere="starfield"] > *').length;
    expect(count(sparse)).toBeLessThan(count(medium));
    expect(count(medium)).toBeLessThan(count(dense));
  });

  it('twinkle is off by default; `data-twinkle` reflects the prop', () => {
    const off = render(<Starfield />).container.querySelector('[data-atmosphere="starfield"]');
    expect(off?.getAttribute('data-twinkle')).toBe('false');
    const on = render(<Starfield twinkle />).container.querySelector(
      '[data-atmosphere="starfield"]',
    );
    expect(on?.getAttribute('data-twinkle')).toBe('true');
  });

  it('twinkle classes are gated on motion-safe: (respects prefers-reduced-motion)', () => {
    // Twinkle on a star uses `motion-safe:animate-atmosphere-twinkle`.
    // The variant prefix means the animation applies only when the
    // user has not opted into reduced motion — no JS guard needed.
    const { container } = render(<Starfield twinkle />);
    const stars = container.querySelectorAll('[data-atmosphere="starfield"] > *');
    expect(stars.length).toBeGreaterThan(0);
    for (const star of stars) {
      expect(star.getAttribute('class') ?? '').toMatch(/motion-safe:animate-atmosphere-twinkle/);
    }
  });

  it('non-twinkle render does NOT carry the twinkle animation class', () => {
    const { container } = render(<Starfield />);
    const stars = container.querySelectorAll('[data-atmosphere="starfield"] > *');
    for (const star of stars) {
      expect(star.getAttribute('class') ?? '').not.toMatch(/animate-atmosphere-twinkle/);
    }
  });
});
