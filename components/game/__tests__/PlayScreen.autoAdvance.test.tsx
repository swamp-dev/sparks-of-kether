import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { PlayScreen, AUTO_ADVANCE_DELAY_MS } from '../PlayScreen';
import { makeFullGame } from '@/test/fixtures';
import { seededRng } from '@/engine/rng';

/**
 * #131: hot-seat cadence — when a turn lands in `'end'` phase the
 * orchestrator auto-advances to the next player after a brief
 * delay. Without this, the player has to click End Turn explicitly
 * which is friction in a single-device hot-seat session.
 *
 * The contract:
 *   1. Phase enters `'end'` (e.g. via meditate or draw).
 *   2. After AUTO_ADVANCE_DELAY_MS, `turn.endTurn()` fires
 *      automatically — `data-active-player` updates to the next
 *      player's id.
 *   3. The auto-advance is cancellable mid-flight (user clicks
 *      End Turn early; the explicit click and the timer don't
 *      both fire).
 *
 * We use `vi.useFakeTimers` so the delay is deterministic.
 */

describe('PlayScreen — auto-advance turn', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('auto-advances to the next player after the end-phase delay', () => {
    const state = makeFullGame({ playerCount: 2, seed: 1 });
    const { container } = render(
      <PlayScreen initialState={state} rng={seededRng(2)} />,
    );

    // Initially the first player is active.
    const main = container.querySelector('[data-play-screen]');
    const initialActive = main?.getAttribute('data-active-player');
    expect(initialActive).toBeTruthy();

    // Meditate to reach the 'end' phase (skips 'draw' per #128).
    const meditate = container.querySelector(
      '[data-action="meditate"]',
    ) as HTMLButtonElement;
    act(() => {
      fireEvent.click(meditate);
    });
    expect(main?.getAttribute('data-phase')).toBe('end');

    // Pre-timer: active player unchanged.
    expect(main?.getAttribute('data-active-player')).toBe(initialActive);

    // Advance the auto-advance timer.
    act(() => {
      vi.advanceTimersByTime(AUTO_ADVANCE_DELAY_MS);
    });
    const newActive = main?.getAttribute('data-active-player');
    expect(newActive).toBeTruthy();
    expect(newActive).not.toBe(initialActive);
  });

  it('clicking End Turn manually cancels the pending auto-advance (no double-fire)', () => {
    const state = makeFullGame({ playerCount: 2, seed: 1 });
    const { container } = render(
      <PlayScreen initialState={state} rng={seededRng(2)} />,
    );

    const main = container.querySelector('[data-play-screen]');
    const initialActive = main?.getAttribute('data-active-player');

    act(() => {
      fireEvent.click(
        container.querySelector('[data-action="meditate"]') as HTMLButtonElement,
      );
    });

    // Click End Turn before the timer fires.
    const endBtn = container.querySelector(
      '[data-action="end-turn"]',
    ) as HTMLButtonElement;
    act(() => {
      fireEvent.click(endBtn);
    });
    const afterClick = main?.getAttribute('data-active-player');
    expect(afterClick).not.toBe(initialActive);

    // Advance past where the timer would have fired. Active should
    // still be the post-click player (no second rotation).
    act(() => {
      vi.advanceTimersByTime(AUTO_ADVANCE_DELAY_MS);
    });
    expect(main?.getAttribute('data-active-player')).toBe(afterClick);
  });
});
