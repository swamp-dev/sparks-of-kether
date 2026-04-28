import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Hero } from '../Hero';

describe('Hero', () => {
  it('renders an SVG marked decorative', () => {
    const { container } = render(<Hero />);
    const wrapper = container.querySelector('[data-home-hero]');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute('aria-hidden')).toBe('true');
    expect(wrapper?.querySelector('svg')).not.toBeNull();
  });

  it('draws all 10 Sefirot dots', () => {
    const { container } = render(<Hero />);
    // 10 sefirot circles + 1 halo circle on tiferet = 11
    const circles = container.querySelectorAll('svg circle');
    expect(circles.length).toBe(11);
  });

  it('draws 22 connecting paths', () => {
    const { container } = render(<Hero />);
    const lines = container.querySelectorAll('svg line');
    expect(lines.length).toBe(22);
  });

  it('is pointer-events-none so it cannot intercept clicks meant for the form', () => {
    const { container } = render(<Hero />);
    const wrapper = container.querySelector('[data-home-hero]');
    expect(wrapper?.getAttribute('class') ?? '').toMatch(/pointer-events-none/);
  });

  it('responsive height: small on mobile, larger on tablet and desktop', () => {
    const { container } = render(<Hero />);
    const svg = container.querySelector('svg');
    const className = svg?.getAttribute('class') ?? '';
    // Mobile gets h-48, sm: bumps to h-56, md: bumps to h-64.
    expect(className).toMatch(/\bh-48\b/);
    expect(className).toMatch(/sm:h-56/);
    expect(className).toMatch(/md:h-64/);
  });
});
