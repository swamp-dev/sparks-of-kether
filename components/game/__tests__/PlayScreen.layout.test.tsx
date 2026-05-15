import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { PlayScreen } from '../PlayScreen';
import { makeFullGame } from '@/test/fixtures';
import { seededRng } from '@/engine/rng';

/**
 * #411: structural assertions for the fit-on-screen layout.
 *
 * The behavioural AC ("Tree + hand + HUD visible at 1280×800 without
 * scroll") is verified end-to-end via `e2e/screenshots.review.spec.ts`
 * — the `play-mid-game-desktop.png` capture is exactly 1280×800. These
 * unit tests pin the structural contract so a future refactor that
 * silently drops the lg+ aspect/height clamps or reverts the aside
 * compaction trips here before the visual regression catches it.
 *
 * Mobile is explicitly out of scope for #411 — the queued #466 owns
 * the mobile tab pattern. The base classes (gap-6 / p-6 / p-4) must
 * remain on every relevant element so mobile renders identically.
 */

function renderPlay() {
  const state = makeFullGame({ playerCount: 2, seed: 1 });
  return render(<PlayScreen initialState={state} rng={seededRng(1)} />);
}

describe('PlayScreen — fit-on-screen layout (#411)', () => {
  it('wraps the Tree in a height-clamped container at lg+ that preserves the 400/620 aspect', () => {
    const { container } = renderPlay();
    const tree = container.querySelector('[data-tree-root]');
    expect(tree, 'tree root present').not.toBeNull();
    // Outer wrapper introduced in #411 carries the lg+ aspect-ratio
    // + viewport-derived height so the Tree fits inside 1280×800.
    // Load-bearing assumption: TreeBoard's root element is
    // `[data-tree-root]` and its `parentElement` is the #411
    // wrapper. If TreeBoard's structure ever changes (e.g. fragment
    // unwrap, an intermediate element) this lookup needs updating
    // — surface as an explicit failure here rather than letting
    // the empty class string pass three vacuously-failing matches.
    const wrapper = tree?.parentElement;
    expect(wrapper?.tagName.toLowerCase(), 'tree wrapper should be a div sibling').toBe('div');
    const cls = wrapper?.getAttribute('class') ?? '';
    expect(cls).toMatch(/lg:aspect-\[400\/620\]/);
    expect(cls).toMatch(/lg:h-\[calc\(100vh-\d+px\)\]/);
    expect(cls).toMatch(/lg:max-h-\[\d+px\]/);
    // Mobile gets a wider container post-#636 (max-w-2xl) to make the
    // Tree feel bigger on tablet-class widths; lg+ still derives its
    // size from the aspect-ratio + viewport-derived height.
    expect(cls).toMatch(/\bmax-w-2xl\b/);
  });

  it('compacts the right-column aside at lg+ while preserving mobile spacing', () => {
    const { container } = renderPlay();
    const aside = container.querySelector('aside[aria-label="Game status"]');
    expect(aside).not.toBeNull();
    const cls = aside?.getAttribute('class') ?? '';
    // Base `gap-6` keeps the mobile rhythm; `lg:gap-3` reclaims the
    // ~24 px of aside height that was pushing the doc past 800 px.
    expect(cls).toMatch(/\bgap-6\b/);
    expect(cls).toMatch(/lg:gap-3/);

    // Each panel inside the aside drops from p-4 → p-3 at lg+.
    // Four panels expected: DiscardPile (#507; mounted at the top of
    // the aside), StatSheet (conditional on activePlayer being non-
    // null — `makeFullGame({ playerCount: 2 })` always satisfies
    // that), TeamMeters, ShellPanel.
    const panels = aside?.querySelectorAll(':scope > div') ?? [];
    expect(panels.length).toBe(4);
    panels.forEach((panel) => {
      const panelCls = panel.getAttribute('class') ?? '';
      expect(panelCls).toMatch(/\bp-4\b/);
      expect(panelCls).toMatch(/lg:p-3/);
    });
  });

  it('compacts the main grid padding + gap at lg+ and narrows the sidebar to 320 px', () => {
    const { container } = renderPlay();
    const main = container.querySelector('[data-play-screen]');
    expect(main).not.toBeNull();
    const cls = main?.getAttribute('class') ?? '';
    // Mobile `gap-6 p-6` preserved.
    expect(cls).toMatch(/\bgap-6\b/);
    expect(cls).toMatch(/\bp-6\b/);
    // lg+ tightens chrome and narrows sidebar from 400 → 320 px.
    expect(cls).toMatch(/lg:gap-4/);
    expect(cls).toMatch(/lg:p-4/);
    expect(cls).toMatch(/lg:grid-cols-\[1fr_320px\]/);
  });
});
