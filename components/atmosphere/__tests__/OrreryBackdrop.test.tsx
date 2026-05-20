import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { OrreryBackdrop } from '../OrreryBackdrop';

describe('OrreryBackdrop', () => {
  it('renders a decorative, click-through viewport-fixed layer', () => {
    const { container } = render(<OrreryBackdrop />);
    const wrapper = container.querySelector('[data-atmosphere="orrery-backdrop"]');
    expect(wrapper).not.toBeNull();
    const cls = wrapper?.getAttribute('class') ?? '';
    expect(cls).toMatch(/\bfixed\b/);
    expect(cls).toMatch(/\binset-0\b/);
    expect(cls).toMatch(/\bpointer-events-none\b/);
    // Orrery sits between Substrate (-z-20) and Starfield (-z-10) so the
    // atmosphere layers occupy distinct z-tiers (no DOM-order tie).
    expect(cls).toMatch(/-z-\[15\]/);
    expect(wrapper?.getAttribute('aria-hidden')).toBe('true');
  });

  it('anchors the orrery to the viewport bottom-left via xMinYMax slice', () => {
    const { container } = render(<OrreryBackdrop />);
    const svg = container.querySelector('[data-atmosphere="orrery-backdrop"] svg');
    expect(svg?.getAttribute('preserveAspectRatio')).toBe('xMinYMax slice');
  });

  it('renders a central sun with layered glow halos', () => {
    const { container } = render(<OrreryBackdrop />);
    expect(container.querySelector('[data-sun]')).not.toBeNull();
    expect(container.querySelectorAll('[data-sun-glow]').length).toBeGreaterThanOrEqual(2);
  });

  it('renders six orbits, each with its own ring + planet', () => {
    const { container } = render(<OrreryBackdrop />);
    expect(container.querySelectorAll('[data-orbit]')).toHaveLength(6);
    expect(container.querySelectorAll('[data-ring]')).toHaveLength(6);
    expect(container.querySelectorAll('[data-planet]')).toHaveLength(6);
  });

  it('rotation animations are gated on motion-safe: (respects reduced motion)', () => {
    const { container } = render(<OrreryBackdrop />);
    const orbits = container.querySelectorAll('[data-orbit]');
    for (let i = 1; i <= 6; i += 1) {
      const orbit = container.querySelector(`[data-orbit="${i}"]`);
      expect(orbit?.getAttribute('class') ?? '').toMatch(
        new RegExp(`motion-safe:animate-orrery-orbit-${i}\\b`),
      );
    }
    expect(orbits).toHaveLength(6);
  });

  it('the outermost planet (Saturn) carries a decorative ring', () => {
    const { container } = render(<OrreryBackdrop />);
    const saturnRing = container.querySelector('[data-planet-ring="6"]');
    expect(saturnRing).not.toBeNull();
    expect(saturnRing?.tagName.toLowerCase()).toBe('ellipse');
  });

  it('forwards className to the root element without double-spaces or leading/trailing spaces', () => {
    const { container } = render(<OrreryBackdrop className="my-test-class" />);
    const cls = (container.firstChild as Element).getAttribute('class') ?? '';
    expect(cls).not.toMatch(/\s{2}/);
    expect(cls).not.toMatch(/^\s|\s$/);
    expect(cls).toContain('my-test-class');
  });
});
