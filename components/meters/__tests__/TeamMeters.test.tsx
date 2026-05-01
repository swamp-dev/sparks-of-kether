import { describe, expect, it, vi } from 'vitest';
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

describe('TeamMeters — bar dimensions and centering', () => {
  it('Illumination bar is at least 40 px wide (Tailwind w-12 = 48 px)', () => {
    const { container } = render(<TeamMeters illumination={5} separation={3} />);
    const bar = container.querySelector('[data-meter-bar="illumination"]');
    expect(bar).not.toBeNull();
    expect(bar?.getAttribute('class') ?? '').toMatch(/\bw-12\b/);
  });

  it('Separation bar is at least 40 px wide (Tailwind w-12 = 48 px)', () => {
    const { container } = render(<TeamMeters illumination={5} separation={3} />);
    const bar = container.querySelector('[data-meter-bar="separation"]');
    expect(bar).not.toBeNull();
    expect(bar?.getAttribute('class') ?? '').toMatch(/\bw-12\b/);
  });

  it('the meters row centres its content (justify-center)', () => {
    const { container } = render(<TeamMeters illumination={5} separation={3} />);
    const row = container.querySelector('[data-meters-row]');
    expect(row).not.toBeNull();
    expect(row?.getAttribute('class') ?? '').toMatch(/\bjustify-center\b/);
  });
});

describe('TeamMeters — pillar streak as three columns', () => {
  it('renders one column per pillar (mercy / severity / balance)', () => {
    const { container } = render(
      <TeamMeters
        illumination={0}
        separation={0}
        pillarStreak={{ currentPillar: 'mercy', sameCount: 2, alternationCount: 0 }}
      />,
    );
    expect(container.querySelector('[data-pillar-column="mercy"]')).not.toBeNull();
    expect(container.querySelector('[data-pillar-column="severity"]')).not.toBeNull();
    expect(container.querySelector('[data-pillar-column="balance"]')).not.toBeNull();
  });

  it("the current pillar's column carries the streak fill ratio", () => {
    const { container } = render(
      <TeamMeters
        illumination={0}
        separation={0}
        pillarStreak={{ currentPillar: 'severity', sameCount: 2, alternationCount: 0 }}
      />,
    );
    const severity = container.querySelector('[data-pillar-column="severity"]');
    expect(severity?.getAttribute('data-active')).toBe('true');
    // Streak count 2 of 3 → 66.66% fill.
    expect(severity?.getAttribute('data-fill-ratio')).toBe('0.67');
    const mercy = container.querySelector('[data-pillar-column="mercy"]');
    expect(mercy?.getAttribute('data-active')).toBe('false');
    expect(mercy?.getAttribute('data-fill-ratio')).toBe('0.00');
  });

  it('a fresh streak (0/0, no current pillar) leaves all three columns inactive', () => {
    const { container } = render(
      <TeamMeters illumination={0} separation={0} pillarStreak={EMPTY_PILLAR_STREAK} />,
    );
    for (const p of ['mercy', 'severity', 'balance'] as const) {
      const col = container.querySelector(`[data-pillar-column="${p}"]`);
      expect(col?.getAttribute('data-active')).toBe('false');
      expect(col?.getAttribute('data-fill-ratio')).toBe('0.00');
    }
  });
});

describe('TeamMeters — sound hooks (silent today, wired for #321)', () => {
  it('forwards onIlluminationIncrease to the IlluminationMeter', () => {
    const onIllum = vi.fn();
    const { rerender } = render(
      <TeamMeters
        illumination={3}
        separation={0}
        onIlluminationIncrease={onIllum}
      />,
    );
    expect(onIllum).not.toHaveBeenCalled();
    rerender(
      <TeamMeters
        illumination={5}
        separation={0}
        onIlluminationIncrease={onIllum}
      />,
    );
    expect(onIllum).toHaveBeenCalledTimes(1);
    expect(onIllum).toHaveBeenCalledWith(2);
  });

  it('forwards onSeparationIncrease to the SeparationMeter on tick from 0→1', () => {
    const onSep = vi.fn();
    const { rerender } = render(
      <TeamMeters illumination={0} separation={0} onSeparationIncrease={onSep} />,
    );
    expect(onSep).not.toHaveBeenCalled();
    rerender(
      <TeamMeters illumination={0} separation={1} onSeparationIncrease={onSep} />,
    );
    expect(onSep).toHaveBeenCalledTimes(1);
    expect(onSep).toHaveBeenCalledWith(1);
  });

  it('does not fire either hook on a downward change', () => {
    const onIllum = vi.fn();
    const onSep = vi.fn();
    const { rerender } = render(
      <TeamMeters
        illumination={5}
        separation={5}
        onIlluminationIncrease={onIllum}
        onSeparationIncrease={onSep}
      />,
    );
    rerender(
      <TeamMeters
        illumination={3}
        separation={3}
        onIlluminationIncrease={onIllum}
        onSeparationIncrease={onSep}
      />,
    );
    expect(onIllum).not.toHaveBeenCalled();
    expect(onSep).not.toHaveBeenCalled();
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
