import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { PlayerToken } from '../PlayerToken';

describe('PlayerToken', () => {
  it.each([1, 2, 3, 4] as const)('renders variant %i with a distinct color', (v) => {
    const { container } = render(<PlayerToken variant={v} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('data-variant')).toBe(String(v));
    const circle = svg?.querySelector('circle');
    expect(circle?.getAttribute('fill')).not.toBe('');
  });

  it('renders the zodiac glyph when a sign is provided', () => {
    const { container } = render(<PlayerToken variant={1} zodiacSign="aries" />);
    expect(container.querySelector('text')?.textContent).toBe('♈');
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toContain('Aries');
  });

  it('falls back to the variant index when no sign is passed', () => {
    const { container } = render(<PlayerToken variant={3} />);
    expect(container.querySelector('text')?.textContent).toBe('3');
  });

  it('renders correct glyphs for all 12 signs on variant 1', () => {
    const cases = [
      ['aries', '♈'],
      ['taurus', '♉'],
      ['gemini', '♊'],
      ['cancer', '♋'],
      ['leo', '♌'],
      ['virgo', '♍'],
      ['libra', '♎'],
      ['scorpio', '♏'],
      ['sagittarius', '♐'],
      ['capricorn', '♑'],
      ['aquarius', '♒'],
      ['pisces', '♓'],
    ] as const;
    for (const [sign, glyph] of cases) {
      const { container } = render(<PlayerToken variant={1} zodiacSign={sign} />);
      expect(container.querySelector('text')?.textContent).toBe(glyph);
    }
  });

  it('produces 4 distinct fill colors across all variants', () => {
    const fills = ([1, 2, 3, 4] as const).map((v) => {
      const { container } = render(<PlayerToken variant={v} />);
      return container.querySelector('circle')?.getAttribute('fill');
    });
    expect(new Set(fills).size).toBe(4);
  });

  it.each([1, 2, 3, 4] as const)('matches snapshot for variant %i', (v) => {
    const { container } = render(<PlayerToken variant={v} zodiacSign="leo" />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
