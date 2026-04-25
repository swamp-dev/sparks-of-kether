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

  it('uses the player initial when provided', () => {
    const { container } = render(<PlayerToken variant={1} initial="Andy" />);
    expect(container.querySelector('text')?.textContent).toBe('A');
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toContain('Andy');
  });

  it('falls back to the variant index when no initial is passed', () => {
    const { container } = render(<PlayerToken variant={3} />);
    expect(container.querySelector('text')?.textContent).toBe('3');
  });

  it('produces 4 distinct fill colors across all variants', () => {
    const fills = ([1, 2, 3, 4] as const).map((v) => {
      const { container } = render(<PlayerToken variant={v} />);
      return container.querySelector('circle')?.getAttribute('fill');
    });
    expect(new Set(fills).size).toBe(4);
  });

  it.each([1, 2, 3, 4] as const)('matches snapshot for variant %i', (v) => {
    const { container } = render(<PlayerToken variant={v} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
