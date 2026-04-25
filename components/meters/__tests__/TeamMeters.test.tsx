import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { TeamMeters, SHELL_THRESHOLDS } from '../TeamMeters';
import { EMPTY_PILLAR_STREAK } from '@/engine/types';

describe('TeamMeters — rendering', () => {
  it('renders both Illumination and Separation meters with readouts', () => {
    const { container } = render(<TeamMeters illumination={5} separation={3} />);
    expect(
      container.querySelector('[data-meter-readout="illumination"]')?.textContent,
    ).toBe('5 / 15');
    expect(
      container.querySelector('[data-meter-readout="separation"]')?.textContent,
    ).toBe('3 / 15');
  });

  it('renders a Shell-threshold marker for each step (3, 6, 9, 12)', () => {
    const { container } = render(<TeamMeters illumination={0} separation={0} />);
    for (const t of SHELL_THRESHOLDS) {
      expect(
        container.querySelector(`[data-shell-threshold="${t}"]`),
        `threshold marker for ${t}`,
      ).not.toBeNull();
    }
  });

  it('aria-live region announces deltas on value change', () => {
    const { container, rerender } = render(
      <TeamMeters illumination={5} separation={3} />,
    );
    rerender(<TeamMeters illumination={7} separation={3} />);
    const live = container.querySelector('[data-meters-announcement]');
    expect(live?.textContent).toMatch(/Illumination \+2/);
    rerender(<TeamMeters illumination={7} separation={5} />);
    expect(live?.textContent).toMatch(/Separation \+2/);
  });

  it('omits pillar streak when not provided', () => {
    const { container } = render(<TeamMeters illumination={0} separation={0} />);
    expect(container.querySelector('[data-pillar-streak]')).toBeNull();
  });

  it('renders pillar streak with current pillar and count', () => {
    const { container } = render(
      <TeamMeters
        illumination={0}
        separation={0}
        pillarStreak={{ currentPillar: 'mercy', sameCount: 2, alternationCount: 0 }}
      />,
    );
    const streak = container.querySelector('[data-pillar-streak]');
    expect(streak).not.toBeNull();
    expect(streak?.getAttribute('data-streak-kind')).toBe('imbalance');
    expect(streak?.querySelector('[data-pillar-current]')?.textContent).toBe('mercy');
    expect(streak?.querySelector('[data-streak-count]')?.textContent).toBe('2');
  });

  it('streak uses larger of sameCount/alternationCount and labels accordingly', () => {
    const { container } = render(
      <TeamMeters
        illumination={0}
        separation={0}
        pillarStreak={{ currentPillar: 'severity', sameCount: 1, alternationCount: 2 }}
      />,
    );
    const streak = container.querySelector('[data-pillar-streak]');
    expect(streak?.getAttribute('data-streak-kind')).toBe('equilibrium');
    expect(streak?.querySelector('[data-streak-count]')?.textContent).toBe('2');
  });

  it('empty pillar streak labels the kind as "none" (not imbalance) for fresh state', () => {
    const { container } = render(
      <TeamMeters illumination={0} separation={0} pillarStreak={EMPTY_PILLAR_STREAK} />,
    );
    const streak = container.querySelector('[data-pillar-streak]');
    expect(streak).not.toBeNull();
    expect(streak?.querySelector('[data-pillar-current]')?.textContent).toBe('none');
    // 0/0 is neither imbalance nor equilibrium — the engine doesn't
    // count a non-move toward either streak, so the UI must not
    // display either label.
    expect(streak?.getAttribute('data-streak-kind')).toBe('none');
  });
});

describe('TeamMeters — meter math', () => {
  it('value clamps at the loss threshold (15)', () => {
    const { container } = render(<TeamMeters illumination={20} separation={20} />);
    expect(
      container.querySelector('[data-meter-readout="illumination"]')?.textContent,
    ).toBe('20 / 15');
    // The Meter component clamps the visual fill to 100% — verified
    // in its own tests; we just confirm the readout shows the raw
    // value so observers see overflow rather than a silent cap.
  });

  it('accepts a custom max', () => {
    const { container } = render(
      <TeamMeters illumination={10} separation={5} max={25} />,
    );
    expect(
      container.querySelector('[data-meter-readout="illumination"]')?.textContent,
    ).toBe('10 / 25');
  });
});
