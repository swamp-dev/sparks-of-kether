import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { SeparationMeter, SHELL_THRESHOLDS, DEFAULT_SHELL_HINTS } from '../SeparationMeter';

describe('SeparationMeter — rendering', () => {
  it('renders with role="meter" and aria-valuenow / aria-valuemax', () => {
    const { container } = render(<SeparationMeter value={5} max={15} />);
    const meter = container.querySelector('[role="meter"]');
    expect(meter).not.toBeNull();
    expect(meter?.getAttribute('aria-valuenow')).toBe('5');
    expect(meter?.getAttribute('aria-valuemax')).toBe('15');
    expect(meter?.getAttribute('aria-label')).toContain('Separation');
  });

  it('descends from the top — fill column is anchored at top:0, not bottom:0', () => {
    const { container } = render(<SeparationMeter value={5} max={15} />);
    const fill = container.querySelector('[data-meter-fill]') as HTMLElement;
    // The descending-shadow metaphor: the fill must be top-anchored.
    // Tailwind `top-0` on the class string is the contract.
    expect(fill.className).toMatch(/\btop-0\b/);
    // And NOT bottom-0 — that would be the rising-light metaphor.
    expect(fill.className).not.toMatch(/\bbottom-0\b/);
  });

  it('throws when max is not positive', () => {
    expect(() => render(<SeparationMeter value={0} max={0} />)).toThrow();
  });

  it('renders smoke overlay with motion-safe variants', () => {
    const { container } = render(<SeparationMeter value={5} max={15} />);
    const smoke = container.querySelector('[data-separation-smoke]');
    expect(smoke).not.toBeNull();
    expect(smoke?.className ?? '').toMatch(/motion-safe:animate-breath/);
    // ~10s slow cycle (per ticket "very slow ~10s loop").
    expect(smoke?.className ?? '').toMatch(/\[animation-duration:10000ms\]/);
  });

  it('renders binah-glow halo (depth, not red battery)', () => {
    const { container } = render(<SeparationMeter value={5} max={15} />);
    const halo = container.querySelector('[data-separation-halo]');
    expect(halo).not.toBeNull();
    expect(halo?.className ?? '').toMatch(/shadow-glow-binah/);
  });
});

describe('SeparationMeter — Shell-awakening threshold marks', () => {
  it('renders one threshold marker at each of +3, +6, +9, +12', () => {
    const { container } = render(<SeparationMeter value={0} max={15} />);
    expect(SHELL_THRESHOLDS).toEqual([3, 6, 9, 12]);
    for (const t of SHELL_THRESHOLDS) {
      const marker = container.querySelector(`[data-shell-threshold="${t}"]`);
      expect(marker, `marker at threshold ${t}`).not.toBeNull();
    }
  });

  it('marks `data-shell-reached="true"` when the value passes the threshold', () => {
    const { container } = render(<SeparationMeter value={4} max={15} />);
    const t3 = container.querySelector('[data-shell-threshold="3"]');
    const t6 = container.querySelector('[data-shell-threshold="6"]');
    expect(t3?.getAttribute('data-shell-reached')).toBe('true');
    expect(t6?.getAttribute('data-shell-reached')).toBe('false');
  });

  it('renders a Hebrew letter Shell hint beside each threshold', () => {
    const { container } = render(<SeparationMeter value={0} max={15} />);
    // Default order tracks `pickNextShellTarget` with all-dormant
    // Shells + 0 sparks: Malkuth, Yesod, Hod, Netzach.
    expect(DEFAULT_SHELL_HINTS.map((h) => h.letter)).toEqual(['מ', 'י', 'ה', 'נ']);
    SHELL_THRESHOLDS.forEach((t, i) => {
      const hint = DEFAULT_SHELL_HINTS[i];
      expect(hint, `hint at index ${i}`).toBeDefined();
      const marker = container.querySelector(`[data-shell-threshold="${t}"]`);
      expect(marker, `marker at ${t}`).not.toBeNull();
      // The Hebrew letter sits inside the marker's container.
      expect(marker?.textContent).toContain(hint?.letter);
    });
  });

  it('accepts a custom nextShellHints array (override for dynamic order)', () => {
    const custom = [
      { letter: 'כ', name: 'Fragmentation (Kether)' },
      { letter: 'ח', name: 'Paralysis (Chokmah)' },
      { letter: 'ב', name: 'Despair (Binah)' },
      { letter: 'ח', name: 'Hoarding (Chesed)' },
    ];
    const { container } = render(<SeparationMeter value={0} max={15} nextShellHints={custom} />);
    const t3 = container.querySelector('[data-shell-threshold="3"]');
    expect(t3?.textContent).toContain('כ');
  });

  it('threshold marks render even when value is 0 (instructional weight)', () => {
    // Per ticket: "Threshold markers ... earn the meter visual
    // instructional weight." They must be visible at game start.
    const { container } = render(<SeparationMeter value={0} max={15} />);
    expect(container.querySelectorAll('[data-shell-threshold]').length).toBe(4);
  });
});

describe('SeparationMeter — change hook', () => {
  it('fires onSeparationIncrease with the delta on upward prop change', () => {
    const onInc = vi.fn();
    const { rerender } = render(
      <SeparationMeter value={0} max={15} onSeparationIncrease={onInc} />,
    );
    expect(onInc).not.toHaveBeenCalled();

    // Tick 0 → 1, surface threshold awareness via the hook (the
    // hint rendering itself is asserted above; this test pins the
    // sound-design hook fires).
    rerender(<SeparationMeter value={1} max={15} onSeparationIncrease={onInc} />);
    expect(onInc).toHaveBeenCalledTimes(1);
    expect(onInc).toHaveBeenCalledWith(1);
  });

  it('does not fire on downward or equal changes', () => {
    const onInc = vi.fn();
    const { rerender } = render(
      <SeparationMeter value={5} max={15} onSeparationIncrease={onInc} />,
    );
    rerender(<SeparationMeter value={3} max={15} onSeparationIncrease={onInc} />);
    rerender(<SeparationMeter value={3} max={15} onSeparationIncrease={onInc} />);
    expect(onInc).not.toHaveBeenCalled();
  });
});
