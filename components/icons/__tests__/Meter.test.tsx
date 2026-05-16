import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Meter } from '../Meter';

describe('Meter', () => {
  it('renders with role="meter" and reports current value via aria-valuenow', () => {
    const { container } = render(<Meter value={5} max={15} color="#ffd700" label="Illumination" />);
    const meter = container.querySelector('[role="meter"]');
    expect(meter).not.toBeNull();
    expect(meter?.getAttribute('aria-valuenow')).toBe('5');
    expect(meter?.getAttribute('aria-valuemin')).toBe('0');
    expect(meter?.getAttribute('aria-valuemax')).toBe('15');
    expect(meter?.getAttribute('aria-label')).toContain('Illumination');
    expect(meter?.getAttribute('aria-label')).toContain('5');
    expect(meter?.getAttribute('aria-label')).toContain('15');
  });

  it('clamps the visual fill to [0, 100%] regardless of value/max relation', () => {
    // JSDOM's CSSOM normalizes percentage strings (drops trailing
    // zeros), so test the parsed numeric ratio rather than the raw
    // string.
    const cases = [
      { value: -3, max: 10, expectedRatio: 0 },
      { value: 5, max: 10, expectedRatio: 50 },
      { value: 10, max: 10, expectedRatio: 100 },
      { value: 25, max: 10, expectedRatio: 100 },
    ];
    for (const { value, max, expectedRatio } of cases) {
      const { container, unmount } = render(
        <Meter value={value} max={max} color="#ffd700" label="Test" />,
      );
      const fill = container.querySelector('[data-meter-fill]') as HTMLElement | null;
      expect(fill, `value=${value} max=${max}`).not.toBeNull();
      const heightStr = fill?.style.height ?? '';
      expect(parseFloat(heightStr)).toBeCloseTo(expectedRatio, 1);
      unmount();
    }
  });

  it('switches axis based on orientation', () => {
    const v = render(<Meter value={5} max={10} color="#ffd700" label="V" orientation="vertical" />);
    expect(v.container.querySelector('[role="meter"]')?.getAttribute('data-orientation')).toBe(
      'vertical',
    );

    const h = render(
      <Meter value={5} max={10} color="#ffd700" label="H" orientation="horizontal" />,
    );
    expect(h.container.querySelector('[role="meter"]')?.getAttribute('data-orientation')).toBe(
      'horizontal',
    );
    const fill = h.container.querySelector('[data-meter-fill]') as HTMLElement | null;
    expect(parseFloat(fill?.style.width ?? '')).toBeCloseTo(50, 1);
  });

  it('throws when max is non-positive (programmer error)', () => {
    const original = console.error;
    console.error = (..._args: unknown[]): void => undefined;
    try {
      expect(() => render(<Meter value={1} max={0} color="#ffd700" label="X" />)).toThrow(
        /max must be > 0/,
      );
    } finally {
      console.error = original;
    }
  });

  it('aria-valuenow and label clamp to [0, max] so visual and AT agree', () => {
    const { container } = render(<Meter value={25} max={10} color="#ffd700" label="Separation" />);
    const meter = container.querySelector('[role="meter"]');
    // Visual is clamped to 100%; AT must report the clamped value too,
    // not the raw 25 — otherwise screen-reader users hear "25 of 10"
    // while the bar shows full.
    expect(meter?.getAttribute('aria-valuenow')).toBe('10');
    expect(meter?.getAttribute('aria-label')).toContain('10 of 10');
  });

  it('applies a CSS transition on the fill axis (smooth deltas)', () => {
    // The "animates smoothly" acceptance criterion: a CSS transition
    // must be set on the fill axis so value changes interpolate.
    const v = render(<Meter value={5} max={10} color="#ffd700" label="V" orientation="vertical" />);
    const vFill = v.container.querySelector('[data-meter-fill]') as HTMLElement | null;
    expect(vFill?.style.transition).toContain('height');

    const h = render(
      <Meter value={5} max={10} color="#ffd700" label="H" orientation="horizontal" />,
    );
    const hFill = h.container.querySelector('[data-meter-fill]') as HTMLElement | null;
    expect(hFill?.style.transition).toContain('width');
  });

  it('matches snapshot for a half-full Illumination meter', () => {
    const { container } = render(<Meter value={5} max={10} color="#ffd700" label="Illumination" />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
