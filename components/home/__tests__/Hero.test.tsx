import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Hero } from '../Hero';

/**
 * Hero — visual decorator only. Aria-hidden, decorative, no
 * interaction. Tests pin the visual contract: ten Sefirah nodes,
 * the 22 path lines, the breathing halo overlay, and the
 * responsive height step from mobile → tablet → desktop.
 *
 * Behavioural / interactive assertions (keyboard, ARIA) are not
 * meaningful for this component — the home page itself names the
 * game in copy and the Hero is intentionally a presentation layer
 * underneath. See `home.test.tsx` for the page-level assertions.
 */

describe('Hero', () => {
  it('renders an SVG marked decorative', () => {
    const { container } = render(<Hero />);
    const wrapper = container.querySelector('[data-home-hero]');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute('aria-hidden')).toBe('true');
    expect(wrapper?.querySelector('svg')).not.toBeNull();
  });

  it('draws all 10 Sefirot — one node disc per Sefirah', () => {
    const { container } = render(<Hero />);
    // Pin the SVG node layer specifically (the `[data-node]` group)
    // so the count survives future tuning of the surrounding
    // decorative discs (halos, Tiferet ring, etc.).
    const nodes = container.querySelectorAll('[data-node]');
    expect(nodes.length).toBe(10);
  });

  it('draws 22 connecting paths', () => {
    const { container } = render(<Hero />);
    // Scope to the path layer — halo and node layers may
    // legitimately add other line/circle elements over time.
    const lines = container.querySelectorAll('[data-layer="paths"] line');
    expect(lines.length).toBe(22);
  });

  it('renders breathing halo overlays — one per Sefirah', () => {
    const { container } = render(<Hero />);
    const halos = container.querySelectorAll('[data-halo-overlay]');
    expect(halos.length).toBe(10);
    // Every halo runs the breath animation under `motion-safe:` so
    // reduced-motion users never see the cycling. The Tailwind class
    // serialisation is stable: the `motion-safe:animate-breath`
    // utility renders verbatim into the className string.
    halos.forEach((halo) => {
      expect(halo.getAttribute('class') ?? '').toMatch(/motion-safe:animate-breath/);
    });
  });

  it('is pointer-events-none so it cannot intercept clicks', () => {
    const { container } = render(<Hero />);
    const wrapper = container.querySelector('[data-home-hero]');
    expect(wrapper?.getAttribute('class') ?? '').toMatch(/pointer-events-none/);
  });

  it('responsive height: ~42vh on mobile, ~58vh on tablet, ~70vh on desktop', () => {
    const { container } = render(<Hero />);
    const svg = container.querySelector('svg');
    const className = svg?.getAttribute('class') ?? '';
    // Mobile gets h-[42vh], sm: bumps to h-[58vh], md: bumps to h-[70vh].
    // The hero is the page's primary visual at every breakpoint.
    expect(className).toMatch(/h-\[42vh\]/);
    expect(className).toMatch(/sm:h-\[58vh\]/);
    expect(className).toMatch(/md:h-\[70vh\]/);
  });

  it('Tiferet is rendered larger than the other nodes (centrepiece)', () => {
    const { container } = render(<Hero />);
    const tiferet = container.querySelector('[data-node="tiferet"]');
    const malkuth = container.querySelector('[data-node="malkuth"]');
    expect(tiferet).not.toBeNull();
    expect(malkuth).not.toBeNull();
    const tiferetR = Number(tiferet?.getAttribute('r') ?? 0);
    const malkuthR = Number(malkuth?.getAttribute('r') ?? 0);
    expect(tiferetR).toBeGreaterThan(malkuthR);
  });
});
