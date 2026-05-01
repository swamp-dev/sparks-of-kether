import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Constellation } from '../Constellation';
import { ZODIAC_CONSTELLATIONS } from '@/data/zodiac-constellations';
import { zodiacSigns } from '@/data';

/**
 * Constellation — a faint per-sign line-art SVG drawn from real-ish
 * star coordinates in `data/zodiac-constellations.ts`. Per #314: it
 * is purely decorative (`aria-hidden="true"`), supports `motion-safe:`
 * twinkle (no JS branch — Tailwind variant), and renders one circle
 * per star plus connecting lines for the canonical asterism.
 */

describe('Constellation', () => {
  it('renders an svg with the expected data-constellation attr per sign', () => {
    for (const sign of zodiacSigns) {
      const { container } = render(<Constellation sign={sign.key} />);
      const svg = container.querySelector('svg');
      expect(svg, `svg for ${sign.key}`).not.toBeNull();
      expect(svg?.getAttribute('data-constellation')).toBe(sign.key);
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('draws one circle per canonical star in the asterism', () => {
    for (const sign of zodiacSigns) {
      const { container } = render(<Constellation sign={sign.key} />);
      const stars = container.querySelectorAll('circle[data-star]');
      const expected = ZODIAC_CONSTELLATIONS[sign.key].stars.length;
      expect(stars.length, `${sign.key} stars`).toBe(expected);
    }
  });

  it('draws connecting lines for the asterism edges', () => {
    // Aries asterism: 3 stars, 2 edges (a simple bent line).
    const { container } = render(<Constellation sign="aries" />);
    const lines = container.querySelectorAll('line[data-edge]');
    const expectedEdges = ZODIAC_CONSTELLATIONS.aries.edges.length;
    expect(lines.length).toBe(expectedEdges);
  });
});
