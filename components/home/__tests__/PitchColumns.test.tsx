import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { PitchColumns } from '../PitchColumns';

/**
 * PitchColumns — three-column "What is this?" block (#313). Static
 * decoration with a programmatic name (`aria-labelledby`) for AT
 * users.
 */

describe('PitchColumns', () => {
  it('renders all three columns: cooperative, symbolic, short', () => {
    const { container } = render(<PitchColumns />);
    expect(container.querySelector('[data-pitch-column="cooperative"]')).not.toBeNull();
    expect(container.querySelector('[data-pitch-column="symbolic"]')).not.toBeNull();
    expect(container.querySelector('[data-pitch-column="short"]')).not.toBeNull();
  });

  it('exposes a programmatic section heading for AT users', () => {
    const { container } = render(<PitchColumns />);
    const section = container.querySelector('[data-home-pitch]');
    expect(section).not.toBeNull();
    expect(section?.getAttribute('aria-labelledby')).toBe('home-pitch-heading');
    const heading = container.querySelector('#home-pitch-heading');
    expect(heading).not.toBeNull();
    // The heading is `sr-only` — present in the DOM for AT, hidden
    // visually so the columns themselves carry the visible weight.
    expect(heading?.getAttribute('class') ?? '').toMatch(/sr-only/);
  });

  it('all decorative SVG glyphs are aria-hidden', () => {
    const { container } = render(<PitchColumns />);
    const svgs = container.querySelectorAll('svg');
    svgs.forEach((svg) => {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    });
  });
});
