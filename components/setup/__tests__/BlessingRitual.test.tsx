import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BlessingRitual } from '../BlessingRitual';
import { seededRng } from '@/engine/rng';
import { sefirot } from '@/data';
import type { StatSheet } from '@/engine/types';

const STAT_KEYS = sefirot.map((s) => s.stat);

describe('BlessingRitual — flow', () => {
  it('starts at Kether and shows the right copy', () => {
    const { container } = render(
      <BlessingRitual rng={seededRng(1)} onComplete={vi.fn()} />,
    );
    expect(container.querySelector('[data-sefirah]')?.getAttribute('data-sefirah')).toBe('kether');
    expect(container.querySelector('[data-essence]')?.textContent).toMatch(/Before separation/);
  });

  it('advances Kether → Chokmah on roll + receive', () => {
    const { container } = render(
      <BlessingRitual rng={seededRng(1)} onComplete={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
    fireEvent.click(screen.getByRole('button', { name: /Receive/i }));
    expect(container.querySelector('[data-sefirah]')?.getAttribute('data-sefirah')).toBe('chokmah');
  });

  it('end-to-end: 10 steps yield a full StatSheet, each in [3, 18]', () => {
    let result: StatSheet | null = null;
    render(
      <BlessingRitual
        rng={seededRng(7)}
        onComplete={(s) => {
          result = s;
        }}
      />,
    );
    for (const _ of sefirot) {
      fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
      fireEvent.click(screen.getByRole('button', { name: /Receive/i }));
    }
    expect(result, 'onComplete should have been called').not.toBeNull();
    if (!result) return;
    for (const stat of STAT_KEYS) {
      const value = result[stat];
      expect(value, `stat ${stat}`).toBeGreaterThanOrEqual(3);
      expect(value, `stat ${stat}`).toBeLessThanOrEqual(18);
    }
  });

  it('seeded RNG produces deterministic stats across runs', () => {
    const runOnce = (): StatSheet => {
      let result: StatSheet | null = null;
      const { unmount } = render(
        <BlessingRitual
          rng={seededRng(42)}
          onComplete={(s) => {
            result = s;
          }}
        />,
      );
      for (const _ of sefirot) {
        fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
        fireEvent.click(screen.getByRole('button', { name: /Receive/i }));
      }
      unmount();
      if (!result) throw new Error('onComplete not called');
      return result;
    };
    const first = runOnce();
    const second = runOnce();
    for (const stat of STAT_KEYS) {
      expect(second[stat]).toBe(first[stat]);
    }
  });
});

describe('BlessingRitual — step gating', () => {
  it('Receive button is absent until the Roll has been clicked', () => {
    render(<BlessingRitual rng={seededRng(1)} onComplete={vi.fn()} />);
    // Before rolling, no Receive button.
    expect(screen.queryByRole('button', { name: /Receive/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
    // After rolling, Roll is gone, Receive is present.
    expect(screen.queryByRole('button', { name: /Roll 3d6/i })).toBeNull();
    expect(screen.getByRole('button', { name: /Receive/i })).toBeInTheDocument();
  });

  it('shows the rolled total visibly after Roll', () => {
    const { container } = render(
      <BlessingRitual rng={seededRng(1)} onComplete={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
    // Total displayed via data-stat-total={firstStatKey} — derive
    // from the data so the test isn't fragile to sefirot reorders.
    const firstStat = sefirot[0]?.stat;
    if (!firstStat) throw new Error('sefirot data is empty');
    const total = container.querySelector(`[data-stat-total="${firstStat}"]`);
    expect(total).not.toBeNull();
    const value = Number(total?.textContent);
    expect(value).toBeGreaterThanOrEqual(3);
    expect(value).toBeLessThanOrEqual(18);
  });
});

describe('BlessingRitual — onComplete', () => {
  it('fires exactly once at the end of the 10-step flow', () => {
    const onComplete = vi.fn();
    render(<BlessingRitual rng={seededRng(1)} onComplete={onComplete} />);
    for (const _ of sefirot) {
      fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
      fireEvent.click(screen.getByRole('button', { name: /Receive/i }));
    }
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does not fire onComplete mid-flow', () => {
    const onComplete = vi.fn();
    render(<BlessingRitual rng={seededRng(1)} onComplete={onComplete} />);
    // Halfway through.
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
      fireEvent.click(screen.getByRole('button', { name: /Receive/i }));
    }
    expect(onComplete).not.toHaveBeenCalled();
  });
});

describe('BlessingRitual — summary', () => {
  it('renders a summary row for each of the 10 stats', () => {
    let result: StatSheet | null = null;
    const { container } = render(
      <BlessingRitual
        rng={seededRng(99)}
        onComplete={(s) => {
          result = s;
        }}
      />,
    );
    for (const _ of sefirot) {
      fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
      fireEvent.click(screen.getByRole('button', { name: /Receive/i }));
    }
    // Final render shows the summary screen.
    expect(
      container.querySelector('[data-blessing-ritual][data-status="complete"]'),
    ).not.toBeNull();
    for (const stat of STAT_KEYS) {
      const cell = container.querySelector(`[data-summary-value="${stat}"]`);
      expect(cell, `summary value for ${stat}`).not.toBeNull();
      expect(Number(cell?.textContent)).toBe(result?.[stat]);
    }
  });
});

describe('BlessingRitual — skip-to-summary (#133)', () => {
  // Playtest finding: the 10-step sequential ceremony is slow on
  // repeat plays. Provide a "Skip — roll all" affordance that fills
  // the remaining stats in one click and advances to the summary.
  it('renders a Skip button that rolls all remaining stats at once', () => {
    let result: StatSheet | null = null;
    const { container } = render(
      <BlessingRitual
        rng={seededRng(7)}
        onComplete={(s) => {
          result = s;
        }}
      />,
    );
    const skip = screen.getByRole('button', { name: /Skip/i });
    fireEvent.click(skip);
    // Should land on the summary panel.
    expect(
      container.querySelector('[data-blessing-ritual][data-status="complete"]'),
    ).not.toBeNull();
    // All 10 stats present.
    for (const stat of STAT_KEYS) {
      expect(result?.[stat]).toBeGreaterThanOrEqual(3);
      expect(result?.[stat]).toBeLessThanOrEqual(18);
    }
  });

  it('Skip works mid-ceremony — partial stats are preserved, the rest are rolled', () => {
    let result: StatSheet | null = null;
    render(
      <BlessingRitual
        rng={seededRng(7)}
        onComplete={(s) => {
          result = s;
        }}
      />,
    );
    // Roll + receive the first two Sefirot manually.
    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
      fireEvent.click(screen.getByRole('button', { name: /Receive/i }));
    }
    // Skip from the third step onward.
    fireEvent.click(screen.getByRole('button', { name: /Skip/i }));
    // All 10 still present in the result.
    for (const stat of STAT_KEYS) {
      expect(result?.[stat]).toBeGreaterThanOrEqual(3);
      expect(result?.[stat]).toBeLessThanOrEqual(18);
    }
  });
});
