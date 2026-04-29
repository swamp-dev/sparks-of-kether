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
    fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
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
      fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    }
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
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
        fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
      }
      fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
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
  it('Next button is absent until the Roll has been clicked', () => {
    render(<BlessingRitual rng={seededRng(1)} onComplete={vi.fn()} />);
    // Before rolling, no Next button.
    expect(screen.queryByRole('button', { name: /^Next$/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
    // After rolling, Roll is gone, Next is present.
    expect(screen.queryByRole('button', { name: /Roll 3d6/i })).toBeNull();
    expect(screen.getByRole('button', { name: /^Next$/i })).toBeInTheDocument();
  });

  // #250: the prior "Receive this blessing" CTA was dead weight — there
  // is no real alternative once the dice land — so it was renamed to a
  // simpler "Next" advance. This test guards against regression: the
  // word "Receive" must not appear on any button at any of the 10
  // steps, pre-roll or post-roll. Loop matters: a regression that
  // adds "Receive" back conditionally (e.g. only on a particular
  // Sefirah) must trip this assertion.
  it('does not render a "Receive" CTA at any of the 10 steps (#250)', () => {
    render(<BlessingRitual rng={seededRng(1)} onComplete={vi.fn()} />);
    for (const s of sefirot) {
      expect(
        screen.queryByRole('button', { name: /Receive/i }),
        `pre-roll at ${s.key}`,
      ).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
      expect(
        screen.queryByRole('button', { name: /Receive/i }),
        `post-roll at ${s.key}`,
      ).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    }
  });

  // #250 sanity: the per-step state machine has exactly two states
  // (awaiting / rolled). The "received" intermediate state was removed
  // — it was never reachable in code anyway, but the type left it
  // available, which is misleading documentation.
  it('data-status attribute is only "awaiting" or "rolled" mid-ceremony (#250)', () => {
    const { container } = render(
      <BlessingRitual rng={seededRng(1)} onComplete={vi.fn()} />,
    );
    const root = container.querySelector('[data-blessing-ritual]');
    expect(root?.getAttribute('data-status')).toBe('awaiting');
    fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
    expect(root?.getAttribute('data-status')).toBe('rolled');
    fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    // After Next, we're at the next step's `awaiting` — never linger
    // in a 'received' state.
    expect(root?.getAttribute('data-status')).toBe('awaiting');
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
  it('does NOT fire onComplete after the 10th roll until Continue is clicked (#215)', () => {
    // #215: pre-fix, onComplete fired from a useEffect synchronously
    // when stepIndex crossed sefirot.length. The parent unmounted
    // BlessingRitual before the Summary screen was visible. The fix
    // gates onComplete behind an explicit Continue click on the
    // Summary screen so the user sees their stats.
    const onComplete = vi.fn();
    render(<BlessingRitual rng={seededRng(1)} onComplete={onComplete} />);
    for (const _ of sefirot) {
      fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
      fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    }
    expect(onComplete).not.toHaveBeenCalled();
    // Summary is visible.
    expect(
      screen.queryByRole('button', { name: /Continue/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does not fire onComplete mid-flow', () => {
    const onComplete = vi.fn();
    render(<BlessingRitual rng={seededRng(1)} onComplete={onComplete} />);
    // Halfway through.
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
      fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    }
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('Skip path also requires a Continue click before onComplete (#215)', () => {
    const onComplete = vi.fn();
    render(<BlessingRitual rng={seededRng(7)} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole('button', { name: /Skip/i }));
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

describe('BlessingRitual — summary', () => {
  it('renders a summary row for each of the 10 stats — visible before Continue (#215)', () => {
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
      fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    }
    // The summary is on screen WITHOUT onComplete having fired —
    // pre-#215 the parent unmounted us before the user saw it.
    expect(
      container.querySelector('[data-blessing-ritual][data-status="complete"]'),
    ).not.toBeNull();
    expect(result).toBeNull();
    // Each stat row is rendered with a value before Continue —
    // proving the Summary's content is present even without
    // onComplete having fired.
    for (const stat of STAT_KEYS) {
      const cell = container.querySelector(`[data-summary-value="${stat}"]`);
      expect(cell, `summary value for ${stat}`).not.toBeNull();
      expect(Number(cell?.textContent)).toBeGreaterThanOrEqual(3);
      expect(Number(cell?.textContent)).toBeLessThanOrEqual(18);
    }
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
    // After Continue, onComplete has fired with the same stats the
    // Summary displayed.
    if (!result) throw new Error('onComplete did not fire on Continue');
    for (const stat of STAT_KEYS) {
      const cell = container.querySelector(`[data-summary-value="${stat}"]`);
      expect(cell, `post-continue summary value for ${stat}`).not.toBeNull();
      expect(Number(cell?.textContent)).toBe(result[stat]);
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
    // #215: explicit Continue gate before onComplete.
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
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
    // Roll + advance the first two Sefirot manually.
    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
      fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    }
    // Skip from the third step onward.
    fireEvent.click(screen.getByRole('button', { name: /Skip/i }));
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
    // All 10 still present in the result.
    for (const stat of STAT_KEYS) {
      expect(result?.[stat]).toBeGreaterThanOrEqual(3);
      expect(result?.[stat]).toBeLessThanOrEqual(18);
    }
  });
});

describe('BlessingRitual — scene polish (#156)', () => {
  it('renders a Sefirah hero badge keyed to the active Sefirah', () => {
    const { container } = render(
      <BlessingRitual rng={seededRng(1)} onComplete={vi.fn()} />,
    );
    const hero = container.querySelector('[data-sefirah-hero]');
    expect(hero).not.toBeNull();
    expect(hero?.getAttribute('data-sefirah')).toBe('kether');
    // Background colour mirrors the data-table colour for Kether.
    expect((hero as HTMLElement).style.backgroundColor).toBeTruthy();
  });

  it('hero badge is at least the 80 px ticket threshold (Tailwind h-24 = 96 px)', () => {
    const { container } = render(
      <BlessingRitual rng={seededRng(1)} onComplete={vi.fn()} />,
    );
    const hero = container.querySelector('[data-sefirah-hero]');
    const className = hero?.getAttribute('class') ?? '';
    expect(className).toMatch(/\bh-24\b/);
    expect(className).toMatch(/\bw-24\b/);
  });

  it('the running ledger lists all 10 Sefirot with state per row', () => {
    const { container } = render(
      <BlessingRitual rng={seededRng(1)} onComplete={vi.fn()} />,
    );
    const rows = container.querySelectorAll('[data-ledger-row]');
    expect(rows.length).toBe(10);
    // At step 0, Kether is active; the rest are pending.
    const kether = container.querySelector('[data-ledger-row="kether"]');
    expect(kether?.getAttribute('data-ledger-state')).toBe('active');
    const malkuth = container.querySelector('[data-ledger-row="malkuth"]');
    expect(malkuth?.getAttribute('data-ledger-state')).toBe('pending');
  });

  it('blessed Sefirot show their rolled value in the ledger; pending show "—"', () => {
    const { container } = render(
      <BlessingRitual rng={seededRng(1)} onComplete={vi.fn()} />,
    );
    // Roll Kether and advance — the row should now report a value.
    fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    const ketherValue = container.querySelector('[data-ledger-value="unity"]');
    expect(ketherValue?.textContent).toMatch(/^\d+$/);
    const malkuthValue = container.querySelector('[data-ledger-value="body"]');
    expect(malkuthValue?.textContent).toBe('—');
  });

  it('renders the ambient ritual scene keyed to the active Sefirah', () => {
    const { container } = render(
      <BlessingRitual rng={seededRng(1)} onComplete={vi.fn()} />,
    );
    const scene = container.querySelector('[data-ritual-scene]');
    expect(scene).not.toBeNull();
    expect(scene?.getAttribute('data-active-sefirah')).toBe('kether');
  });
});
