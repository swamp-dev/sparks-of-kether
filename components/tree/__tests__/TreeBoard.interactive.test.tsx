import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { TreeBoard } from '../TreeBoard';
import { makePlayer, makeState } from '@/test/fixtures';

/**
 * Interactive-mode tests for the TreeBoard. The static-render tests in
 * `TreeBoard.test.tsx` cover the no-prop case; this file covers what
 * happens when `state`, `activePlayerId`, and `onPathClick` are wired.
 */
describe('TreeBoard — interactive', () => {
  it('highlights only paths the active player can travel', () => {
    // Player at Tiferet holding cards 2 (path 13: tiferet↔kether)
    // and 13 (path 24: tiferet↔netzach). Holding card 0 (path 11)
    // is irrelevant because the player is not at Kether or Chokmah.
    const player = makePlayer({
      id: 'p1',
      position: 'tiferet',
      hand: [2, 13, 0],
    });
    const state = makeState({}, { players: [player] });
    const { container } = render(
      <TreeBoard state={state} activePlayerId="p1" onPathClick={vi.fn()} />,
    );

    const validPaths = ['13', '24'];
    for (const num of validPaths) {
      expect(container.querySelector(`[data-path="${num}"]`)?.getAttribute('data-valid')).toBe(
        'true',
      );
    }
    // Path 11 (Kether ↔ Chokmah) is NOT touchable from Tiferet.
    expect(container.querySelector('[data-path="11"]')?.getAttribute('data-valid')).toBe('false');
  });

  it('fires onPathClick with the path number when a highlighted path is clicked', () => {
    const onPathClick = vi.fn();
    const player = makePlayer({
      id: 'p1',
      position: 'tiferet',
      hand: [2],
    });
    const state = makeState({}, { players: [player] });
    const { container } = render(
      <TreeBoard state={state} activePlayerId="p1" onPathClick={onPathClick} />,
    );

    const path13 = container.querySelector('[data-path="13"]');
    expect(path13).not.toBeNull();
    if (path13) fireEvent.click(path13);
    expect(onPathClick).toHaveBeenCalledExactlyOnceWith(13);
  });

  it('does not fire onPathClick when an invalid path is clicked', () => {
    const onPathClick = vi.fn();
    const player = makePlayer({
      id: 'p1',
      position: 'tiferet',
      hand: [2],
    });
    const state = makeState({}, { players: [player] });
    const { container } = render(
      <TreeBoard state={state} activePlayerId="p1" onPathClick={onPathClick} />,
    );

    // Path 11 is far from Tiferet — invalid.
    const path11 = container.querySelector('[data-path="11"]');
    if (path11) fireEvent.click(path11);
    expect(onPathClick).not.toHaveBeenCalled();
  });

  // #129: when `movesEnabled` is false (e.g. phase has moved past
  // `'move'` in the orchestrator), no paths render as valid even
  // when the player has the right cards. The playtest finding was
  // that paths still LOOKED clickable after the player moved, leaving
  // them unsure what to do next.
  it('renders no paths as valid when movesEnabled=false', () => {
    const player = makePlayer({
      id: 'p1',
      position: 'tiferet',
      hand: [2, 13, 0],
    });
    const state = makeState({}, { players: [player] });
    const { container } = render(
      <TreeBoard state={state} activePlayerId="p1" onPathClick={vi.fn()} movesEnabled={false} />,
    );
    const allPathEdges = container.querySelectorAll('[data-path]');
    for (const edge of allPathEdges) {
      expect(edge.getAttribute('data-valid')).toBe('false');
    }
  });

  it('does not fire onPathClick when movesEnabled=false', () => {
    const onPathClick = vi.fn();
    const player = makePlayer({
      id: 'p1',
      position: 'tiferet',
      hand: [2],
    });
    const state = makeState({}, { players: [player] });
    const { container } = render(
      <TreeBoard
        state={state}
        activePlayerId="p1"
        onPathClick={onPathClick}
        movesEnabled={false}
      />,
    );
    const path13 = container.querySelector('[data-path="13"]');
    if (path13) fireEvent.click(path13);
    expect(onPathClick).not.toHaveBeenCalled();
  });

  it('fires onPathClick on Enter / Space keypress for keyboard accessibility', () => {
    const onPathClick = vi.fn();
    const player = makePlayer({
      id: 'p1',
      position: 'tiferet',
      hand: [2],
    });
    const state = makeState({}, { players: [player] });
    const { container } = render(
      <TreeBoard state={state} activePlayerId="p1" onPathClick={onPathClick} />,
    );

    const path13 = container.querySelector('[data-path="13"]');
    expect(path13).not.toBeNull();
    if (path13) {
      fireEvent.keyDown(path13, { key: 'Enter' });
      fireEvent.keyDown(path13, { key: ' ' });
    }
    expect(onPathClick).toHaveBeenCalledTimes(2);
  });

  it('highlights valid paths even without onPathClick (read-only signal)', () => {
    // Read-only mode: caller wants to show the player their options
    // without committing to a click handler yet. Highlighting must
    // still render so the affordance is visible.
    const player = makePlayer({
      id: 'p1',
      position: 'tiferet',
      hand: [2],
    });
    const state = makeState({}, { players: [player] });
    const { container } = render(<TreeBoard state={state} activePlayerId="p1" />);
    const path13 = container.querySelector('[data-path="13"]');
    expect(path13?.getAttribute('data-valid')).toBe('true');
    // But not a button — there's nowhere to send the click.
    expect(path13?.getAttribute('role')).toBe('img');
  });

  it('produces no highlights when activePlayerId is stale / unknown', () => {
    // Real-time games can briefly hold a state that lags the active-
    // player id. The board must not crash; highlights simply vanish.
    const player = makePlayer({
      id: 'p1',
      position: 'tiferet',
      hand: [2],
    });
    const state = makeState({}, { players: [player] });
    const { container } = render(
      <TreeBoard state={state} activePlayerId="ghost-id" onPathClick={vi.fn()} />,
    );
    const valid = container.querySelectorAll('[data-valid="true"]');
    expect(valid.length).toBe(0);
  });

  it('renders no highlights when state is provided without activePlayerId (read-only)', () => {
    const player = makePlayer({
      id: 'p1',
      position: 'tiferet',
      hand: [2],
    });
    const state = makeState({}, { players: [player] });
    const { container } = render(<TreeBoard state={state} />);

    // Player tokens still render…
    expect(container.querySelector('[data-player="p1"]')).not.toBeNull();
    // …but no path is marked valid, so nothing is clickable.
    const validPaths = container.querySelectorAll('[data-valid="true"]');
    expect(validPaths.length).toBe(0);
  });

  it("renders a player token on each player's current Sefirah", () => {
    const p1 = makePlayer({ id: 'p1', name: 'Andy', position: 'tiferet' });
    const p2 = makePlayer({ id: 'p2', name: 'Bea', position: 'malkuth' });
    const state = makeState({}, { players: [p1, p2] });
    const { container } = render(<TreeBoard state={state} activePlayerId="p1" />);

    const t1 = container.querySelector('[data-player="p1"]');
    const t2 = container.querySelector('[data-player="p2"]');
    expect(t1).not.toBeNull();
    expect(t2).not.toBeNull();
    // Active player's token is marked active so the active-ring renders.
    expect(t1?.getAttribute('data-active')).toBe('true');
    expect(t2?.getAttribute('data-active')).toBe('false');
    // Aria-labels include the Sefirah name for screen-reader navigation.
    expect(t1?.getAttribute('aria-label')).toMatch(/Andy at Beauty \(active turn\)/);
    expect(t2?.getAttribute('aria-label')).toMatch(/Bea at Kingdom/);
  });

  it('stacks tokens horizontally with the row centered on the node', () => {
    // Malkuth's node sits at x=200 in the layout. Two tokens spaced
    // by 22px (TOKEN_RADIUS*2 + 2) center around 200 — one at 189, one
    // at 211. This locks the token math down so a regression in the
    // offset formula surfaces immediately.
    const p1 = makePlayer({ id: 'p1', name: 'A', position: 'malkuth' });
    const p2 = makePlayer({ id: 'p2', name: 'B', position: 'malkuth' });
    const state = makeState({}, { players: [p1, p2] });
    const { container } = render(<TreeBoard state={state} />);

    const cx1 = container
      .querySelector('[data-player="p1"] circle:not([fill="none"])')
      ?.getAttribute('cx');
    const cx2 = container
      .querySelector('[data-player="p2"] circle:not([fill="none"])')
      ?.getAttribute('cx');
    expect(cx1).toBe('189');
    expect(cx2).toBe('211');
  });

  it('paths are non-interactive when onPathClick is not provided', () => {
    const player = makePlayer({
      id: 'p1',
      position: 'tiferet',
      hand: [2],
    });
    const state = makeState({}, { players: [player] });
    const { container } = render(<TreeBoard state={state} activePlayerId="p1" />);

    // Without a click handler, paths must not advertise themselves as
    // buttons (the ARIA contract: role=button implies activation
    // should produce an outcome).
    const path13 = container.querySelector('[data-path="13"]');
    expect(path13?.getAttribute('role')).toBe('img');
    expect(path13?.getAttribute('tabindex')).toBeNull();
  });
});

describe('TreeBoard — path hit-target widening (#130)', () => {
  // Playtest finding: path edges (especially Yesod↔Malkuth) are too
  // thin to click reliably. Each path now renders an invisible
  // wide-stroke hit-line on top of the visible line; that's the
  // element receiving clicks. Visible stroke is unchanged.
  it('renders an invisible hit-line for every path', () => {
    const { container } = render(<TreeBoard />);
    const hitLines = container.querySelectorAll('[data-path-hit]');
    // 22 paths × 1 hit-line each.
    expect(hitLines.length).toBe(22);
    for (const line of hitLines) {
      // The hit-line is invisible (transparent stroke) but interactive.
      expect(line.getAttribute('stroke')).toBe('transparent');
      const sw = Number(line.getAttribute('stroke-width'));
      // ≥ 24 is the desktop minimum (WCAG mobile is 44; we widen
      // toward 44 but the SVG is responsive so the visible width
      // depends on viewBox ↔ rendered-px mapping).
      expect(sw).toBeGreaterThanOrEqual(24);
    }
  });

  it('clicking the hit-line for a valid path fires onPathClick', () => {
    const onPathClick = vi.fn();
    const player = makePlayer({
      id: 'p1',
      position: 'tiferet',
      hand: [2],
    });
    const state = makeState({}, { players: [player] });
    const { container } = render(
      <TreeBoard state={state} activePlayerId="p1" onPathClick={onPathClick} />,
    );
    const hit13 = container.querySelector('[data-path-hit="13"]');
    expect(hit13).not.toBeNull();
    if (hit13) fireEvent.click(hit13);
    expect(onPathClick).toHaveBeenCalledExactlyOnceWith(13);
  });

  // #213: short paths between adjacent Sefirot (notably Yesod ↔
  // Malkuth on the central pillar) had hit-lines that ran from one
  // node center to the other. Because each Sefirah node is a circle
  // of radius NODE_RADIUS=28 painted on top of the path layer, the
  // hit-line was almost entirely inside the two end-nodes, which
  // stole every click. The fix: trim each hit-line endpoint inward
  // by NODE_RADIUS so the interactive zone lives strictly in the
  // gap between nodes.
  //
  // #288: path 32 is now special-cased and un-trimmed (see the
  // ">=30 viewBox units" test above). The general trim contract is
  // pinned by the path-25 case here and the path-13 case in the
  // "trim is applied to every path" test below.
  it('hit-line endpoints are trimmed by NODE_RADIUS so they live between the nodes (#213)', () => {
    // Path 25 is the central-pillar Tiferet ↔ Yesod path.
    // Tiferet sits at (200, 340); Yesod at (200, 490). NODE_RADIUS
    // is 28, so the trimmed hit-line should run between y=368 and
    // y=462 — strictly in the 94-unit gap between the nodes (the
    // direction depends on the path's `from`/`to` ordering, which
    // is data-defined; the test is direction-agnostic).
    const { container } = render(<TreeBoard />);
    const hit25 = container.querySelector('[data-path-hit="25"]');
    expect(hit25).not.toBeNull();
    const y1 = Number(hit25?.getAttribute('y1'));
    const y2 = Number(hit25?.getAttribute('y2'));
    const x1 = Number(hit25?.getAttribute('x1'));
    const x2 = Number(hit25?.getAttribute('x2'));
    expect(x1).toBeCloseTo(200, 0);
    expect(x2).toBeCloseTo(200, 0);
    expect(Math.min(y1, y2)).toBeCloseTo(368, 0);
    expect(Math.max(y1, y2)).toBeCloseTo(462, 0);
  });

  // #288: even with the #213 trim fix intact, path 32 (Yesod ↔
  // Malkuth) is intrinsically short — its endpoints are 70 viewBox
  // units apart, so subtracting two NODE_RADIUS=28 trims leaves only
  // 14 units of clickable hit-line. That's well below WCAG 2.5.5's
  // tap-target minimum at typical render scales. The fix: special-
  // case path 32's hit overlay so it spans the full Yesod-to-Malkuth
  // distance (the visible path remains trimmed for cleanliness, and
  // SVG paint order keeps node clicks landing on the nodes).
  it('path 32 (Malkuth↔Yesod) has a tappable hit area at least 30 viewBox units tall', () => {
    const { container } = render(<TreeBoard />);
    const hit32 = container.querySelector('[data-path-hit="32"]');
    expect(hit32).not.toBeNull();
    const y1 = Number(hit32?.getAttribute('y1'));
    const y2 = Number(hit32?.getAttribute('y2'));
    // Path 32 runs vertically along the central pillar; its primary
    // axis is y. The fix un-trims the hit overlay so it spans the
    // full Yesod-to-Malkuth distance (70 viewBox units). Pin tightly
    // to that — a partial-trim regression (e.g. trim of 20 → 30 units)
    // would still pass a loose `>= 30` threshold but fail this.
    expect(Math.abs(y2 - y1)).toBeCloseTo(70, 0);
  });

  it('hit-line uses linecap=butt so the rounded end-cap does not extend back into the node (#213)', () => {
    // Round caps would push half the cap radius (PATH_HIT_WIDTH/2 =
    // 14 units) past the trimmed endpoint, partially re-overlapping
    // the node. butt caps end exactly at the trimmed coordinates.
    // We set the attribute explicitly (rather than relying on SVG's
    // default-of-butt) so the regression-pin reads at a glance.
    const { container } = render(<TreeBoard />);
    const hitLines = container.querySelectorAll('[data-path-hit]');
    for (const line of hitLines) {
      expect(line.getAttribute('stroke-linecap')).toBe('butt');
    }
  });

  it('hit-line endpoint trim is applied to every path (not just path 32)', () => {
    // Sanity-check the trim formula on a non-central-pillar path.
    // Path 13 connects Kether (200, 60) and Tiferet (200, 340).
    // Untrimmed length is 280; with NODE_RADIUS=28 trimmed off
    // each end the hit-line should be exactly 224 long. Both
    // endpoints sit at x=200 (central pillar).
    const { container } = render(<TreeBoard />);
    const hit13 = container.querySelector('[data-path-hit="13"]');
    expect(hit13).not.toBeNull();
    const y1 = Number(hit13?.getAttribute('y1'));
    const y2 = Number(hit13?.getAttribute('y2'));
    expect(Math.abs(y2 - y1)).toBeCloseTo(224, 0);
    expect(Number(hit13?.getAttribute('x1'))).toBeCloseTo(200, 0);
    expect(Number(hit13?.getAttribute('x2'))).toBeCloseTo(200, 0);
  });

  it('path-labels layer is absent (#505) so no badge can intercept hit-line clicks', () => {
    // The path-labels group itself was removed in #505 — the layer
    // no longer exists, so the prior `pointer-events="none"` contract
    // is moot. Pin the absence so a regression doesn't reintroduce
    // badges that overlap path centerlines and absorb clicks meant
    // for the hit-lines (paths 13/14/19/25/27/29/32 in particular).
    const { container } = render(<TreeBoard />);
    expect(container.querySelector('[data-layer="path-labels"]')).toBeNull();
    expect(container.querySelectorAll('[data-path-label]').length).toBe(0);
  });
});

describe('TreeBoard — sefirah-clear animation (#37)', () => {
  it('marks cleared Sefirot with data-cleared="true" + animation class', () => {
    const player = makePlayer({
      id: 'p1',
      clearedSefirot: new Set(['gevurah']),
    });
    const state = makeState({}, { players: [player] });
    const { container } = render(<TreeBoard state={state} activePlayerId="p1" />);
    const cleared = container.querySelector('[data-sefirah="gevurah"]');
    expect(cleared?.getAttribute('data-cleared')).toBe('true');
    const circle = cleared?.querySelector('circle');
    expect(circle?.getAttribute('class')).toMatch(/animate-sefirah-clear-pulse/);
    expect(circle?.getAttribute('class')).toMatch(/motion-reduce:animate-none/);
  });

  it('non-cleared Sefirot have data-cleared="false" and no animation class', () => {
    const player = makePlayer({
      id: 'p1',
      clearedSefirot: new Set(['gevurah']),
    });
    const state = makeState({}, { players: [player] });
    const { container } = render(<TreeBoard state={state} activePlayerId="p1" />);
    const uncleared = container.querySelector('[data-sefirah="hod"]');
    expect(uncleared?.getAttribute('data-cleared')).toBe('false');
    const circle = uncleared?.querySelector('circle');
    expect(circle?.getAttribute('class')).not.toMatch(/animate-sefirah-clear-pulse/);
  });

  it('static render (no state) leaves all Sefirot data-cleared="false"', () => {
    const { container } = render(<TreeBoard />);
    const all = container.querySelectorAll('[data-sefirah]');
    for (const node of all) {
      expect(node.getAttribute('data-cleared')).toBe('false');
    }
  });
});
