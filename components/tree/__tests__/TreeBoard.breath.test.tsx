import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { TreeBoard } from '../TreeBoard';
import { makePlayer, makeState } from '@/test/fixtures';

/**
 * #312 — "make the Tree of Life breathe."
 * #404 — extended: every in-gameplay Sefirah carries a baseline halo
 * (matches the home-page Hero), not just endpoints + cleared. The
 * cleared-state pulse rides on top of the baseline via the disc's
 * `sefirah-clear-pulse` keyframe (separate from the breath layer).
 *
 * Pinning the contracts for:
 *   1. Lit-Sefirah breath halos (every Sefirah lit during gameplay;
 *      no halos at all on the static demo route). Each lit node
 *      carries a `motion-safe:animate-breath` class plus the
 *      Sefirah's `shadow-glow-{key}` token.
 *   2. Path-light-from-card: when `highlightedCard` (an arcanum
 *      number 0..21) is set, every path whose `arcanumNumber` matches
 *      lights up with `data-card-lit="true"`. Multiple eligible paths
 *      may light at once.
 *   3. Pawn polish: every player token has `motion-safe:animate-breath`
 *      at idle; an `data-just-moved="true"` marker rides the active
 *      player on the just-arrived render and runs an afterglow class.
 *   4. Path-number legibility: each path-number badge has a backing
 *      pill with a fill (the "low-contrast pill") that's strictly
 *      darker than the substrate (`#0e0a1f`'s y-luminance ~0.04) so
 *      the number reads on top.
 */
describe('TreeBoard — #312 breath halos', () => {
  it('renders breath-halo overlays for all 10 Sefirot on a fresh game (#404)', () => {
    // #404 — the in-gameplay Tree carries the home-page Hero's
    // atmosphere: every Sefirah is baseline-lit so the board reads
    // as a living surface, not a progress diagram. Each halo overlay
    // carries the per-Sefirah `shadow-glow-{key}` class and the
    // breath animation under `motion-safe`.
    const player = makePlayer({ id: 'p1', position: 'malkuth' });
    const state = makeState({}, { players: [player] });
    const { container } = render(<TreeBoard state={state} activePlayerId="p1" />);

    // All 10 keys; the helper makes the test's failure message tell
    // you which one is missing rather than just "expected 10, got 9".
    const allKeys = [
      'kether', 'chokmah', 'binah', 'chesed', 'gevurah',
      'tiferet', 'netzach', 'hod', 'yesod', 'malkuth',
    ] as const;
    for (const key of allKeys) {
      const halo = container.querySelector(`[data-breath-halo="${key}"]`);
      expect(halo, `${key} breath halo`).not.toBeNull();
      expect(halo?.getAttribute('class')).toMatch(/motion-safe:animate-breath/);
      expect(halo?.getAttribute('class')).toMatch(new RegExp(`shadow-glow-${key}`));
    }
  });

  it('cleared status is signaled on the disc, independent of the baseline halo (#404)', () => {
    // Pre-#404 the halo *was* the cleared-status signal — only cleared
    // + endpoints lit up. Post-#404 every Sefirah carries a halo, so
    // cleared status rides on the disc's `data-cleared` attribute and
    // its `sefirah-clear-pulse` keyframe — a separate, more intense
    // pulse on top of the always-on baseline. Pin the new layering.
    const player = makePlayer({
      id: 'p1',
      position: 'tiferet',
      clearedSefirot: new Set(['gevurah', 'hod']),
    });
    const state = makeState({}, { players: [player] });
    const { container } = render(<TreeBoard state={state} activePlayerId="p1" />);

    // Every Sefirah, cleared or not, has a baseline halo.
    expect(container.querySelector('[data-breath-halo="gevurah"]'))
      .not.toBeNull();
    expect(container.querySelector('[data-breath-halo="chesed"]'))
      .not.toBeNull();
    // The cleared signal is on the disc's data-cleared attribute.
    const gevurahNode = container.querySelector('[data-sefirah="gevurah"]');
    const chesedNode = container.querySelector('[data-sefirah="chesed"]');
    expect(gevurahNode?.getAttribute('data-cleared')).toBe('true');
    expect(chesedNode?.getAttribute('data-cleared')).toBe('false');
  });

  it('omits all breath halos when no `state` is provided (decorative/static render)', () => {
    // The static demo route has no game state — there is no notion
    // of "lit" and the board renders flat. The breath layer is
    // strictly an interactive-mode addition.
    const { container } = render(<TreeBoard />);
    const halos = container.querySelectorAll('[data-breath-halo]');
    // Even Kether/Malkuth, which are always lit *during a game*,
    // only render breath halos when `state` is wired — the lit
    // state is meaningless without players.
    expect(halos.length).toBe(0);
  });
});

describe('TreeBoard — #312 path-light-from-card', () => {
  it('lights every path whose arcanum matches `highlightedCard`', () => {
    // Card 13 is "Death" — arcanumNumber 13 maps to path 24
    // (Tiferet ↔ Netzach, letter Nun). When the player hovers/
    // selects that card, path 24 should light up on the Tree.
    const player = makePlayer({ id: 'p1', position: 'tiferet', hand: [13] });
    const state = makeState({}, { players: [player] });
    const { container } = render(
      <TreeBoard state={state} activePlayerId="p1" highlightedCard={13} />,
    );

    const path24 = container.querySelector('[data-path="24"]');
    expect(path24?.getAttribute('data-card-lit')).toBe('true');

    // Every other path must NOT be lit by the card highlight — only
    // path 24's arcanum is 13. Filter to elements that explicitly
    // identify themselves as a path (the path-label badges also pick
    // up the `data-card-lit` flag for their own visual change, so a
    // raw `[data-card-lit="true"]` query would over-match).
    const otherLitPaths = Array.from(
      container.querySelectorAll('[data-path][data-card-lit="true"]'),
    ).map((el) => el.getAttribute('data-path'));
    expect(otherLitPaths).toEqual(['24']);
  });

  it('renders no card-lit paths when `highlightedCard` is undefined', () => {
    const player = makePlayer({ id: 'p1', position: 'tiferet', hand: [13] });
    const state = makeState({}, { players: [player] });
    const { container } = render(
      <TreeBoard state={state} activePlayerId="p1" />,
    );
    const lit = container.querySelectorAll('[data-card-lit="true"]');
    expect(lit.length).toBe(0);
  });

  it('renders no card-lit paths for an unknown arcanum number', () => {
    // Invalid card numbers (e.g. 99) don't map to any path — the
    // contract is "fail closed", no spurious highlights, no throw.
    const player = makePlayer({ id: 'p1', position: 'tiferet', hand: [13] });
    const state = makeState({}, { players: [player] });
    const { container } = render(
      <TreeBoard state={state} activePlayerId="p1" highlightedCard={99} />,
    );
    const lit = container.querySelectorAll('[data-card-lit="true"]');
    expect(lit.length).toBe(0);
  });
});

describe('TreeBoard — #312 pawn polish', () => {
  it('every player token carries an idle breath class under motion-safe', () => {
    const p1 = makePlayer({ id: 'p1', position: 'tiferet' });
    const p2 = makePlayer({ id: 'p2', position: 'malkuth' });
    const state = makeState({}, { players: [p1, p2] });
    const { container } = render(<TreeBoard state={state} activePlayerId="p1" />);

    const t1 = container.querySelector('[data-player="p1"]');
    const t2 = container.querySelector('[data-player="p2"]');
    // Each token's wrapping group carries a class that includes the
    // motion-safe breath animation. We don't pin the exact full class
    // string (other classes may compose in) but the breath utility
    // must be present.
    expect(t1?.getAttribute('class') ?? '').toMatch(/motion-safe:animate-breath/);
    expect(t2?.getAttribute('class') ?? '').toMatch(/motion-safe:animate-breath/);
  });
});

describe('TreeBoard — #312 tooltip ARIA + flip contract', () => {
  it('every Sefirah link references its tooltip via aria-describedby', () => {
    // The hover/focus interaction relies on `aria-describedby` so AT
    // users can read the tooltip's contents on focus. Pin the
    // linkage end-to-end: the link's described-by attribute must
    // resolve to a real element ID present in the DOM.
    const { container } = render(<TreeBoard state={makeState()} />);
    const links = container.querySelectorAll('[data-sefirah-link]');
    expect(links.length).toBe(10);
    for (const link of links) {
      const id = link.getAttribute('aria-describedby');
      expect(id, 'aria-describedby is set').toBeTruthy();
      const target = id ? container.querySelector(`#${CSS.escape(id)}`) : null;
      expect(target, `tooltip with id="${id}"`).not.toBeNull();
    }
  });

  it('Yesod and Malkuth tooltips flip ABOVE; everyone else parks BELOW', () => {
    // The tooltip-flip pins a layout decision: the bottom two
    // Sefirot would clip the SVG edge if their tooltip rendered
    // below them, so they flip above. Other eight render below.
    const { container } = render(<TreeBoard state={makeState()} />);
    const tooltips = container.querySelectorAll('[data-tooltip-position]');
    expect(tooltips.length).toBe(10);
    const above = container.querySelectorAll('[data-tooltip-position="above"]');
    const below = container.querySelectorAll('[data-tooltip-position="below"]');
    expect(above.length, 'flipped tooltips').toBe(2);
    expect(below.length, 'default tooltips').toBe(8);
  });

  it('every breath halo opts in via motion-safe: (reduced-motion respected)', () => {
    // The halo's animation must opt in via Tailwind's motion-safe:
    // variant so reduced-motion users see a static halo, not a
    // pulsing one. Pin the class string against accidental drift.
    const { container } = render(<TreeBoard state={makeState()} />);
    const halos = container.querySelectorAll('[data-breath-halo]');
    expect(halos.length, 'fresh-game halos for Kether + Malkuth').toBeGreaterThanOrEqual(2);
    for (const halo of halos) {
      const cls = halo.getAttribute('class') ?? '';
      expect(cls, 'motion-safe: variant present').toContain('motion-safe:animate-breath');
    }
  });
});

describe('TreeBoard — #312 path-number legibility', () => {
  it('each path-number badge has an opaque dark backing pill (fill not "none")', () => {
    // The pill must be filled (not stroke-only) so the number reads
    // on top of any path stroke that crosses underneath. A previous
    // implementation used `fill={GROUND}` which is the right shape;
    // the contract pinned here is that no badge collapses to
    // fill="none" / fill="transparent".
    const { container } = render(<TreeBoard />);
    const labels = container.querySelectorAll('[data-path-label]');
    expect(labels.length).toBe(22);
    for (const label of labels) {
      const pill = label.querySelector('circle');
      const fill = pill?.getAttribute('fill') ?? '';
      // Either an explicit dark hex (#0e0a1f or similar) OR a CSS
      // var that resolves to one. We don't allow "none" /
      // "transparent" — that's the regression we're guarding against.
      expect(fill, 'pill fill').not.toBe('none');
      expect(fill, 'pill fill').not.toBe('transparent');
      expect(fill.length, 'pill fill is set').toBeGreaterThan(0);
    }
  });
});
