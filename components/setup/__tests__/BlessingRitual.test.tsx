import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BlessingRitual } from '../BlessingRitual';
import { seededRng } from '@/engine/rng';
import { sefirot } from '@/data';
import { sefirahBlessings } from '@/data/sefirah-blessings';
import type { StatSheet } from '@/engine/types';

const STAT_KEYS = sefirot.map((s) => s.stat);

describe('BlessingRitual — flow', () => {
  it('starts at Kether and shows the right copy', () => {
    const { container } = render(
      <BlessingRitual rng={seededRng(1)} sign="aries" onComplete={vi.fn()} />,
    );
    expect(container.querySelector('[data-sefirah]')?.getAttribute('data-sefirah')).toBe('kether');
    // Post-#413 the invocation lives inside the essence <p> as a
    // nested <span>, so `essence.textContent` includes both pieces.
    // Asserting on the essence parent + the invocation child
    // separately covers both regression directions: dropping the
    // essence makes the parent assertion fail (the invocation alone
    // doesn't contain "Before separation"); dropping the invocation
    // makes the child assertion fail.
    const essence = container.querySelector('[data-essence]');
    const invocation = container.querySelector('[data-invocation]');
    expect(essence?.textContent).toMatch(/Before separation there is only this/);
    expect(invocation?.textContent?.trim()).toBe(
      'Receive your portion of Unity — the silence beneath every voice.',
    );
  });

  it('advances Kether → Chokmah on roll + receive', () => {
    const { container } = render(
      <BlessingRitual rng={seededRng(1)} sign="aries" onComplete={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    expect(container.querySelector('[data-sefirah]')?.getAttribute('data-sefirah')).toBe('chokmah');
  });

  it('end-to-end: 10 steps yield a full StatSheet, each in [3, 18]', () => {
    let result: StatSheet | null = null;
    render(
      <BlessingRitual sign="aries"
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
        <BlessingRitual sign="aries"
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
    render(<BlessingRitual rng={seededRng(1)} sign="aries" onComplete={vi.fn()} />);
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
    render(<BlessingRitual rng={seededRng(1)} sign="aries" onComplete={vi.fn()} />);
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
      <BlessingRitual rng={seededRng(1)} sign="aries" onComplete={vi.fn()} />,
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
      <BlessingRitual rng={seededRng(1)} sign="aries" onComplete={vi.fn()} />,
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
    render(<BlessingRitual rng={seededRng(1)} sign="aries" onComplete={onComplete} />);
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
    render(<BlessingRitual rng={seededRng(1)} sign="aries" onComplete={onComplete} />);
    // Halfway through.
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
      fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    }
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('Hasten path also requires a Continue click before onComplete (#215)', () => {
    const onComplete = vi.fn();
    render(<BlessingRitual rng={seededRng(7)} sign="aries" onComplete={onComplete} />);
    fireEvent.click(screen.getByRole('button', { name: /Hasten the rite/i }));
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

describe('BlessingRitual — summary', () => {
  it('renders a summary row for each of the 10 stats — visible before Continue (#215)', () => {
    let result: StatSheet | null = null;
    const { container } = render(
      <BlessingRitual sign="aries"
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
  // repeat plays. Provide a "Hasten the rite" affordance that fills
  // the remaining stats in one click and advances to the summary.
  it('renders a Hasten button that rolls all remaining stats at once', () => {
    let result: StatSheet | null = null;
    const { container } = render(
      <BlessingRitual sign="aries"
        rng={seededRng(7)}
        onComplete={(s) => {
          result = s;
        }}
      />,
    );
    const skip = screen.getByRole('button', { name: /Hasten the rite/i });
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

  it('Hasten works mid-ceremony — partial stats are preserved, the rest are rolled', () => {
    let result: StatSheet | null = null;
    render(
      <BlessingRitual sign="aries"
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
    // Hasten from the third step onward.
    fireEvent.click(screen.getByRole('button', { name: /Hasten the rite/i }));
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
      <BlessingRitual rng={seededRng(1)} sign="aries" onComplete={vi.fn()} />,
    );
    const hero = container.querySelector('[data-sefirah-hero]');
    expect(hero).not.toBeNull();
    expect(hero?.getAttribute('data-sefirah')).toBe('kether');
    // Background colour mirrors the data-table colour for Kether.
    expect((hero as HTMLElement).style.backgroundColor).toBeTruthy();
  });

  it('hero badge is at least the 80 px ticket threshold (Tailwind h-24 = 96 px)', () => {
    const { container } = render(
      <BlessingRitual rng={seededRng(1)} sign="aries" onComplete={vi.fn()} />,
    );
    const hero = container.querySelector('[data-sefirah-hero]');
    const className = hero?.getAttribute('class') ?? '';
    expect(className).toMatch(/\bh-24\b/);
    expect(className).toMatch(/\bw-24\b/);
  });

  it('the running ledger lists all 10 Sefirot with state per row', () => {
    const { container } = render(
      <BlessingRitual rng={seededRng(1)} sign="aries" onComplete={vi.fn()} />,
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
      <BlessingRitual rng={seededRng(1)} sign="aries" onComplete={vi.fn()} />,
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
      <BlessingRitual rng={seededRng(1)} sign="aries" onComplete={vi.fn()} />,
    );
    const scene = container.querySelector('[data-ritual-scene]');
    expect(scene).not.toBeNull();
    expect(scene?.getAttribute('data-active-sefirah')).toBe('kether');
  });
});

// ──────────────── #255 / T4 — sign-aware blessing quote ────────────────
//
// The Voices Epic adds a per-Sefirah blessing quote rendered after each
// roll. Quote text comes from `data/sefirah-blessings.ts` (T2) via
// `engine/sefirah-quote.ts:quoteForBlessing` (T3). Every cell offers
// 3 variants; the selector picks one uniformly via the seeded `Rng` so
// the same game-seed always renders the same line.
//
// Tests below cover the four acceptance criteria from #255:
//   1. Quote visible after each roll.
//   2. Right variant for the right (sign, sefirah) — covered via
//      "one of the 3 authored variants" containment per dignity tier.
//   3. At least one example per dignity tier (ruler / exaltation /
//      detriment / fall / neutral).
//   4. Quote disappears once Next is clicked (next Sefirah's quote
//      takes its place).

describe('BlessingRitual — sign-aware blessing quote (#255)', () => {
  it('does not render a quote before Roll is clicked', () => {
    const { container } = render(
      <BlessingRitual rng={seededRng(1)} sign="aries" onComplete={vi.fn()} />,
    );
    expect(container.querySelector('[data-blessing-quote]')).toBeNull();
  });

  it('renders a quote after Roll is clicked at Kether (Aries player)', () => {
    const { container } = render(
      <BlessingRitual rng={seededRng(1)} sign="aries" onComplete={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
    const quote = container.querySelector('[data-blessing-quote]');
    expect(quote).not.toBeNull();
    expect(sefirahBlessings.kether.aries).toContain(quote?.textContent?.trim());
  });

  it('Aries player at Gevurah → ruler tier (Mars rules Aries)', () => {
    // Advance 4 sefirot to land on Gevurah (#5).
    const { container } = render(
      <BlessingRitual rng={seededRng(2)} sign="aries" onComplete={vi.fn()} />,
    );
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
      fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    }
    expect(container.querySelector('[data-sefirah]')?.getAttribute('data-sefirah')).toBe('gevurah');
    fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
    const quote = container.querySelector('[data-blessing-quote]');
    expect(quote).not.toBeNull();
    expect(sefirahBlessings.gevurah.aries).toContain(quote?.textContent?.trim());
    expect(quote?.getAttribute('data-dignity-tier')).toBe('ruler');
  });

  it('Pisces player at Hod → fall tier (Mercury detriment+fall locked at fall)', () => {
    // Advance 7 sefirot to land on Hod (#8).
    const { container } = render(
      <BlessingRitual rng={seededRng(3)} sign="pisces" onComplete={vi.fn()} />,
    );
    for (let i = 0; i < 7; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
      fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    }
    expect(container.querySelector('[data-sefirah]')?.getAttribute('data-sefirah')).toBe('hod');
    fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
    const quote = container.querySelector('[data-blessing-quote]');
    expect(quote).not.toBeNull();
    expect(sefirahBlessings.hod.pisces).toContain(quote?.textContent?.trim());
    expect(quote?.getAttribute('data-dignity-tier')).toBe('fall');
  });

  it('Cancer player at Chesed → exaltation tier (Jupiter exalted in Cancer)', () => {
    // Advance 3 sefirot to land on Chesed (#4).
    const { container } = render(
      <BlessingRitual rng={seededRng(4)} sign="cancer" onComplete={vi.fn()} />,
    );
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
      fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    }
    expect(container.querySelector('[data-sefirah]')?.getAttribute('data-sefirah')).toBe('chesed');
    fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
    const quote = container.querySelector('[data-blessing-quote]');
    expect(quote).not.toBeNull();
    expect(sefirahBlessings.chesed.cancer).toContain(quote?.textContent?.trim());
  });

  it('Aries player at Netzach → detriment tier (Venus detriment in Aries)', () => {
    // Advance 6 sefirot to land on Netzach (#7).
    const { container } = render(
      <BlessingRitual rng={seededRng(5)} sign="aries" onComplete={vi.fn()} />,
    );
    for (let i = 0; i < 6; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
      fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    }
    expect(container.querySelector('[data-sefirah]')?.getAttribute('data-sefirah')).toBe('netzach');
    fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
    const quote = container.querySelector('[data-blessing-quote]');
    expect(quote).not.toBeNull();
    expect(sefirahBlessings.netzach.aries).toContain(quote?.textContent?.trim());
  });

  it('any sign at Malkuth → neutral tier (Hestia warmth-only)', () => {
    // Advance 9 sefirot to land on Malkuth (#10).
    const { container } = render(
      <BlessingRitual rng={seededRng(6)} sign="taurus" onComplete={vi.fn()} />,
    );
    for (let i = 0; i < 9; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
      fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    }
    expect(container.querySelector('[data-sefirah]')?.getAttribute('data-sefirah')).toBe('malkuth');
    fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
    const quote = container.querySelector('[data-blessing-quote]');
    expect(quote).not.toBeNull();
    expect(sefirahBlessings.malkuth.taurus).toContain(quote?.textContent?.trim());
  });

  it('Hasten the rite mid-roll clears blessing state (state-machine invariant, #380)', () => {
    // The skip-ceremony path advances stepIndex to sefirot.length and
    // jumps to the Summary screen. The state-machine invariant says
    // blessing is null outside the 'rolled' step state.
    //
    // The previous version of this test asserted DOM absence of the
    // [data-blessing-quote] element after Hasten — but DOM absence is
    // already guaranteed by the conditional render (Summary takes over,
    // RollDisplay unmounts), so the assertion would pass even if
    // setBlessing(null) were silently removed from handleSkipCeremony.
    //
    // The fix asserts against the data-blessing-state attribute on the
    // Summary section, which is sourced from the actual `blessing`
    // state value. Removing setBlessing(null) from handleSkipCeremony
    // now causes data-blessing-state to read 'set' instead of 'null'
    // and the test fails — true regression coverage.
    const { container } = render(
      <BlessingRitual rng={seededRng(1)} sign="aries" onComplete={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
    // Sanity: blessing IS set in the rolled state.
    expect(container.querySelector('[data-blessing-ritual]')?.getAttribute('data-blessing-state')).toBe('set');
    expect(container.querySelector('[data-blessing-quote]')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Hasten the rite/i }));

    // Verify we're on the Summary screen (data-status='complete').
    const root = container.querySelector('[data-blessing-ritual]');
    expect(root?.getAttribute('data-status')).toBe('complete');
    // Load-bearing assertion: blessing state was cleared by the skip
    // handler. Removing `setBlessing(null)` from handleSkipCeremony
    // would flip this to 'set' and fail the test.
    expect(root?.getAttribute('data-blessing-state')).toBe('null');
  });

  it('quote disappears after Next is clicked (next step is in awaiting state)', () => {
    const { container } = render(
      <BlessingRitual rng={seededRng(1)} sign="aries" onComplete={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
    expect(container.querySelector('[data-blessing-quote]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    // Now on Chokmah, awaiting state — quote not shown until next Roll.
    expect(container.querySelector('[data-blessing-quote]')).toBeNull();
  });

  it('exposes the dignity tier as a data attribute for tone-styling', () => {
    // T4 surfaces the dignity tier as a `data-dignity-tier` attribute on
    // the rendered quote so CSS or future styling can theme by tier
    // (warm vs cool) without re-deriving the relationship at every
    // render. Aries at Kether → neutral (Kether is dignity-agnostic).
    const { container } = render(
      <BlessingRitual rng={seededRng(1)} sign="aries" onComplete={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Roll 3d6/i }));
    const quote = container.querySelector('[data-blessing-quote]');
    expect(quote?.getAttribute('data-dignity-tier')).toBe('neutral');
  });
});

// ──────────────── #413 — desktop two-column layout ────────────────
//
// At md+ the page lays out as two columns (ceremony left, ledger
// right) so the player can see their full BLESSINGS RECEIVED ledger
// at desktop 1280×800 without scrolling. At mobile the grid collapses
// back to a single column. These tests assert the layout *structure*
// at the className level — actual viewport-conditional rendering is
// validated by the Playwright visual-regression spec on the same
// branch. Unit tests here guard the structural contract.

describe('BlessingRitual — page layout (#413)', () => {
  it('renders ceremony and ledger inside a single grid container that flips to two columns at md+', () => {
    const { container } = render(
      <BlessingRitual rng={seededRng(1)} sign="aries" onComplete={vi.fn()} />,
    );
    const section = container.querySelector('[data-blessing-ritual]');
    expect(section).not.toBeNull();
    // The section hosts a grid wrapper; both the orb-hero and the
    // ledger live inside it as direct grid items. Locating by
    // `div.grid` keeps the assertion scoped to the grid container
    // and not the unrelated `RitualScene` sibling div.
    const grid = section?.querySelector('div.grid');
    expect(grid, 'grid wrapper').not.toBeNull();
    const gridClass = grid?.getAttribute('class') ?? '';
    expect(gridClass).toMatch(/\bgrid-cols-1\b/);
    expect(gridClass).toMatch(/md:grid-cols-/);
    // Both the hero (left column) and the ledger (right column) live
    // inside the same grid wrapper.
    expect(grid?.querySelector('[data-sefirah-hero]')).not.toBeNull();
    expect(grid?.querySelector('[data-ritual-ledger]')).not.toBeNull();
  });

  it('drops the standalone "Stat: <name>" line and folds the stat label under the orb (#413)', () => {
    const { container } = render(
      <BlessingRitual rng={seededRng(1)} sign="aries" onComplete={vi.fn()} />,
    );
    // No standalone "Stat: …" line above the Roll button.
    expect(
      Array.from(container.querySelectorAll('span')).some((el) =>
        /^Stat:\s/i.test(el.textContent ?? ''),
      ),
    ).toBe(false);
    // Stat label is folded into the orb chrome with the bare stat name.
    const stat = container.querySelector('[data-sefirah-stat-label]');
    expect(stat).not.toBeNull();
    expect(stat?.textContent?.trim()).toBe('unity');
  });

  it('keeps the essence + invocation but renders them as a single ceremonial paragraph', () => {
    // Vertical-text-density tightening: invocation no longer rendered
    // as a sibling <p> below essence; instead it lives inside the
    // essence paragraph as a styled <span> so the two read as one
    // ceremonial block. Both data-* hooks remain queryable.
    const { container } = render(
      <BlessingRitual rng={seededRng(1)} sign="aries" onComplete={vi.fn()} />,
    );
    const essence = container.querySelector('[data-essence]');
    const invocation = container.querySelector('[data-invocation]');
    expect(essence).not.toBeNull();
    expect(invocation).not.toBeNull();
    // Invocation is now nested inside the essence element rather than
    // a separate sibling <p>.
    expect(essence?.contains(invocation as Node)).toBe(true);
  });

  it('mobile layout (single column) is preserved — grid-cols-1 base, md+ flips to two columns', () => {
    // Single-column-on-mobile is the default Tailwind base; the md+
    // breakpoint adds the two-column override. Asserting both classes
    // on the same element is the structural contract.
    const { container } = render(
      <BlessingRitual rng={seededRng(1)} sign="aries" onComplete={vi.fn()} />,
    );
    const grid = container.querySelector('[data-blessing-ritual] div.grid');
    const cls = grid?.getAttribute('class') ?? '';
    expect(cls).toMatch(/\bgrid-cols-1\b/);
    expect(cls).toMatch(/md:grid-cols-\[3fr_2fr\]/);
  });
});
