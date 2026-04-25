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
      expect(
        container.querySelector(`[data-path="${num}"]`)?.getAttribute('data-valid'),
      ).toBe('true');
    }
    // Path 11 (Kether ↔ Chokmah) is NOT touchable from Tiferet.
    expect(
      container.querySelector('[data-path="11"]')?.getAttribute('data-valid'),
    ).toBe('false');
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
    const { container } = render(
      <TreeBoard state={state} activePlayerId="p1" />,
    );
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

  it('renders a player token on each player\'s current Sefirah', () => {
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
