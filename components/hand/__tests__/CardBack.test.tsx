import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { CardBack } from '../CardBack';

describe('CardBack', () => {
  it('renders an SVG with role="img" and a default aria-label', () => {
    const { container } = render(<CardBack />);
    const svg = container.querySelector('[data-card="back"]');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toMatch(/face-down/i);
  });

  it('accepts an aria-label override', () => {
    const { container } = render(<CardBack ariaLabel="Andy's card, hidden" />);
    expect(
      container.querySelector('[data-card="back"]')?.getAttribute('aria-label'),
    ).toBe("Andy's card, hidden");
  });

  it('passes className through to the SVG', () => {
    const { container } = render(<CardBack className="w-24 h-auto" />);
    const svg = container.querySelector('[data-card="back"]');
    expect(svg?.getAttribute('class') ?? '').toMatch(/w-24/);
  });

  it('uses the canonical 200×320 viewBox so it slots into hand layouts', () => {
    const { container } = render(<CardBack />);
    const svg = container.querySelector('[data-card="back"]');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 200 320');
  });

  it('renders the hexagram seal as two overlaid triangles', () => {
    const { container } = render(<CardBack />);
    expect(
      container.querySelector('[data-cardback-element="hexagram-up"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-cardback-element="hexagram-down"]'),
    ).not.toBeNull();
  });

  it('renders four corner flourishes', () => {
    const { container } = render(<CardBack />);
    const flourishes = container.querySelectorAll(
      '[data-cardback-element="corner-flourish"]',
    );
    expect(flourishes.length).toBe(4);
  });

  it('renders the four Tetragrammaton letters (Yod-Heh-Vav-Heh) at cardinal points', () => {
    const { container } = render(<CardBack />);
    const letters = Array.from(
      container.querySelectorAll('[data-tetragrammaton-letter]'),
    ).map((el) => el.getAttribute('data-tetragrammaton-letter'));
    // Yod-Heh-Vav-Heh — the canonical four letters.
    expect(letters).toEqual(['י', 'ה', 'ו', 'ה']);
  });

  it('per-instance pattern/gradient ids — two backs in the same DOM do not collide', () => {
    const { container } = render(
      <div>
        <CardBack />
        <CardBack />
      </div>,
    );
    const gradients = container.querySelectorAll('linearGradient');
    expect(gradients.length).toBe(2);
    const ids = Array.from(gradients).map((g) => g.getAttribute('id'));
    expect(new Set(ids).size).toBe(2);
  });
});
