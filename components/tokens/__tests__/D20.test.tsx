import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { D20 } from '../D20';

describe('D20', () => {
  it('renders empty die without value', () => {
    const { container } = render(<D20 />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-label')).toBe('d20 die');
    // No central value text when value is undefined.
    const texts = container.querySelectorAll('text');
    expect(texts.length).toBe(0);
  });

  it('renders the rolled value when provided', () => {
    const { container } = render(<D20 value={17} />);
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe('d20 showing 17');
    expect(container.querySelector('text')?.textContent).toBe('17');
  });

  it('respects custom color', () => {
    const { container } = render(<D20 color="#ff0000" />);
    const polygon = container.querySelector('polygon');
    expect(polygon?.getAttribute('stroke')).toBe('#ff0000');
  });

  it('matches snapshot — empty die', () => {
    const { container } = render(<D20 />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot — die showing 20', () => {
    const { container } = render(<D20 value={20} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});

describe('D20 — roll-settle motion (#206)', () => {
  it('does not apply the settle animation when not rolled', () => {
    const { container } = render(<D20 />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('data-rolled')).toBe('false');
    expect(svg?.getAttribute('class') ?? '').not.toMatch(
      /animate-d20-roll-settle/,
    );
  });

  it('applies the settle animation when rolled=true', () => {
    const { container } = render(<D20 value={17} rolled />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('data-rolled')).toBe('true');
    const cls = svg?.getAttribute('class') ?? '';
    expect(cls).toMatch(/animate-d20-roll-settle/);
    // Reduced-motion gate so the animation respects user preference.
    expect(cls).toMatch(/motion-reduce:animate-none/);
  });
});
