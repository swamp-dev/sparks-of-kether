import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { IlluminationMeter } from '../IlluminationMeter';

describe('IlluminationMeter — rendering', () => {
  it('renders with role="meter" and aria-valuenow / aria-valuemax', () => {
    const { container } = render(<IlluminationMeter value={5} max={15} />);
    const meter = container.querySelector('[role="meter"]');
    expect(meter).not.toBeNull();
    expect(meter?.getAttribute('aria-valuenow')).toBe('5');
    expect(meter?.getAttribute('aria-valuemin')).toBe('0');
    expect(meter?.getAttribute('aria-valuemax')).toBe('15');
    expect(meter?.getAttribute('aria-label')).toContain('Illumination');
    expect(meter?.getAttribute('aria-label')).toContain('5');
  });

  it('clamps the visual fill to [0, 100%] regardless of value', () => {
    const cases = [
      { value: -3, max: 10, expectedRatio: 0 },
      { value: 5, max: 10, expectedRatio: 50 },
      { value: 25, max: 10, expectedRatio: 100 },
    ];
    for (const { value, max, expectedRatio } of cases) {
      const { container, unmount } = render(<IlluminationMeter value={value} max={max} />);
      const fill = container.querySelector('[data-meter-fill]') as HTMLElement | null;
      expect(fill, `value=${value} max=${max}`).not.toBeNull();
      expect(parseFloat(fill?.style.height ?? '')).toBeCloseTo(expectedRatio, 1);
      unmount();
    }
  });

  it('throws when max is not positive', () => {
    expect(() => render(<IlluminationMeter value={0} max={0} />)).toThrow();
  });

  it('renders the caustic shimmer overlay (motion-safe breath)', () => {
    const { container } = render(<IlluminationMeter value={5} max={15} />);
    const shimmer = container.querySelector('[data-illumination-shimmer]');
    expect(shimmer).not.toBeNull();
    // motion-safe variant is what makes reduced-motion users skip the
    // breath cycle. The class string must include `motion-safe:`.
    expect(shimmer?.className ?? '').toMatch(/motion-safe:animate-breath/);
  });

  it('renders the tiferet halo with shadow-glow-tiferet', () => {
    const { container } = render(<IlluminationMeter value={5} max={15} />);
    const halo = container.querySelector('[data-illumination-halo]');
    expect(halo).not.toBeNull();
    expect(halo?.className ?? '').toMatch(/shadow-glow-tiferet/);
  });
});

describe('IlluminationMeter — change hook', () => {
  it('fires onIlluminationIncrease with the delta on upward prop change', () => {
    const onInc = vi.fn();
    const { rerender } = render(
      <IlluminationMeter value={3} max={15} onIlluminationIncrease={onInc} />,
    );
    // Initial mount: no delta, no fire.
    expect(onInc).not.toHaveBeenCalled();

    rerender(<IlluminationMeter value={5} max={15} onIlluminationIncrease={onInc} />);
    expect(onInc).toHaveBeenCalledTimes(1);
    expect(onInc).toHaveBeenCalledWith(2);
  });

  it('does not fire on downward or equal changes', () => {
    const onInc = vi.fn();
    const { rerender } = render(
      <IlluminationMeter value={5} max={15} onIlluminationIncrease={onInc} />,
    );
    rerender(<IlluminationMeter value={3} max={15} onIlluminationIncrease={onInc} />);
    rerender(<IlluminationMeter value={3} max={15} onIlluminationIncrease={onInc} />);
    expect(onInc).not.toHaveBeenCalled();
  });

  it('halo opacity scales with fill ratio', () => {
    const { container, rerender } = render(<IlluminationMeter value={0} max={15} />);
    const halo = container.querySelector('[data-illumination-halo]') as HTMLElement;
    expect(parseFloat(halo.style.opacity)).toBeCloseTo(0, 2);

    rerender(<IlluminationMeter value={15} max={15} />);
    expect(parseFloat(halo.style.opacity)).toBeCloseTo(1, 2);
  });
});
