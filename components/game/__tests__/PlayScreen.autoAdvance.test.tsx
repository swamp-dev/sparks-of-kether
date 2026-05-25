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
 *   1. Phase enters `'end'` (e.g. via Move into a no-challenge or
 *      already-cleared Sefirah, or via react-continue / accept-setback).
 *   2. After AUTO_ADVANCE_DELAY_MS, `turn.endTurn()` fires
 *      automatically — `data-active-player` updates to the next
 *      player's id.
 *   3. The auto-advance is cancellable mid-flight (user clicks
 *      End Turn early; the explicit click and the timer don't
 *      both fire).
 *
 * #503: pre-#503 Meditate transitioned to `'end'` and the timer was
 * suppressed. Post-#503 Meditate stays in `'move'` so the suppression
 * gate isn't reachable; landing in `'end'` always means a
 * Move/Challenge has resolved and auto-advance is appropriate.
 *
 * #287: Meditate from `'end'` (after playing a path into a cleared
 * Sefirah) is now allowed. When it fires, `meditatedThisTurn` flips
 * true and the auto-advance timer must be suppressed — the player
 * should click End Turn explicitly.
 *
 * We use `vi.useFakeTimers` so the delay is deterministic.
 */

/** Build a state where the active player can move Malkuth → Yesod (already cleared). */
function makeEndPhaseViaPathState() {
  const base = makeFullGame({ playerCount: 2, seed: 1 });
  const activeIdx = base.players.findIndex((p) => p.id === base.activePlayerId);
  const players = base.players.map((p, idx) =>
    idx === activeIdx
      ? {
          ...p,
          position: 'malkuth' as const,
          hand: [21],
          clearedSefirot: new Set([...p.clearedSefirot, 'yesod' as const]),
        }
      : p,
  );
  return { ...base, players };
}

/** Play card 21 on path 32 (Malkuth ↔ Yesod) to move into the already-cleared Yesod. */
function playPathToYesod(container: HTMLElement): void {
  const cardBtn = container.querySelector(
    '[data-card-slot][data-arcanum="21"]',
  ) as HTMLButtonElement;
  act(() => {
    fireEvent.click(cardBtn);
  });
  const path32 = container.querySelector('[data-path="32"]') as SVGElement;
  act(() => {
    fireEvent.click(path32);
  });
}

describe('PlayScreen — auto-advance turn', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('auto-advances to the next player after the end-phase delay (Move into already-cleared Sefirah)', () => {
    // #502: Move into an already-cleared Sefirah lands directly in
    // `'end'` (pre-#502 it landed in `'draw'` and required a separate
    // Draw click). The auto-advance timer flips the seat after the
    // delay.
    const state = makeEndPhaseViaPathState();
    const { container } = render(<PlayScreen initialState={state} rng={seededRng(2)} />);

    const main = container.querySelector('[data-play-screen]');
    const initialActive = main?.getAttribute('data-active-player');
    expect(initialActive).toBeTruthy();

    playPathToYesod(container);
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

  it('Meditate stays in move; the player can still play a card or click End turn (#503)', () => {
    // #503: Meditate no longer transitions to `'end'`. The player
    // remains in `'move'` so the freshly drawn cards are usable
    // immediately. An End turn affordance is still reachable from
    // `'move'` when `meditatedThisTurn === true` (the player may
    // choose not to play one of the new cards).
    const state = makeFullGame({ playerCount: 2, seed: 1 });
    const { container } = render(<PlayScreen initialState={state} rng={seededRng(2)} />);

    const main = container.querySelector('[data-play-screen]');
    const initialActive = main?.getAttribute('data-active-player');

    act(() => {
      fireEvent.click(container.querySelector('[data-action="meditate"]') as HTMLButtonElement);
    });
    // #24: confirm the dialog before the draw fires.
    act(() => {
      fireEvent.click(
        container.querySelector('[data-meditate-confirm-confirm]') as HTMLButtonElement,
      );
    });
    // Phase stays in move post-Meditate.
    expect(main?.getAttribute('data-phase')).toBe('move');

    // Advance past where the auto-advance window would have been
    // (pre-#503). Active player should NOT have rotated — Meditate
    // doesn't enter `'end'`, so the timer never arms.
    act(() => {
      vi.advanceTimersByTime(AUTO_ADVANCE_DELAY_MS * 3);
    });
    expect(main?.getAttribute('data-active-player')).toBe(initialActive);
    expect(main?.getAttribute('data-phase')).toBe('move');

    // Post-Meditate the End Turn button is reachable from `'move'`.
    const endBtn = container.querySelector('[data-action="end-turn"]') as HTMLButtonElement;
    expect(endBtn).toBeTruthy();
    act(() => {
      fireEvent.click(endBtn);
    });
    // Now the seat advances.
    expect(main?.getAttribute('data-active-player')).not.toBe(initialActive);
  });

  it('end-phase meditate suppresses auto-advance (#287)', () => {
    // After playing a path into a cleared Sefirah (→ 'end'), the player
    // meditates. meditatedThisTurn flips true; the auto-advance timer
    // must not fire — they review cards at their own pace.
    const state = makeEndPhaseViaPathState();
    const { container } = render(<PlayScreen initialState={state} rng={seededRng(2)} />);
    const main = container.querySelector('[data-play-screen]');
    const initialActive = main?.getAttribute('data-active-player');

    playPathToYesod(container);
    expect(main?.getAttribute('data-phase')).toBe('end');

    // Click Meditate and confirm.
    act(() => {
      fireEvent.click(container.querySelector('[data-action="meditate"]') as HTMLButtonElement);
    });
    act(() => {
      fireEvent.click(
        container.querySelector('[data-meditate-confirm-confirm]') as HTMLButtonElement,
      );
    });
    expect(main?.getAttribute('data-phase')).toBe('end');

    // Advance well past the auto-advance window — seat must NOT rotate.
    act(() => {
      vi.advanceTimersByTime(AUTO_ADVANCE_DELAY_MS * 3);
    });
    expect(main?.getAttribute('data-active-player')).toBe(initialActive);
  });

  it('End Turn click after end-phase meditate rotates seat normally (#287)', () => {
    const state = makeEndPhaseViaPathState();
    const { container } = render(<PlayScreen initialState={state} rng={seededRng(2)} />);
    const main = container.querySelector('[data-play-screen]');
    const initialActive = main?.getAttribute('data-active-player');

    playPathToYesod(container);

    // Meditate from end phase.
    act(() => {
      fireEvent.click(container.querySelector('[data-action="meditate"]') as HTMLButtonElement);
    });
    act(() => {
      fireEvent.click(
        container.querySelector('[data-meditate-confirm-confirm]') as HTMLButtonElement,
      );
    });

    // Explicitly click End Turn.
    const endBtn = container.querySelector('[data-action="end-turn"]') as HTMLButtonElement;
    act(() => {
      fireEvent.click(endBtn);
    });

    expect(main?.getAttribute('data-active-player')).not.toBe(initialActive);
  });

  it('clicking End Turn manually cancels the pending auto-advance (no double-fire)', () => {
    // Move into an already-cleared Sefirah lands in `'end'` directly
    // (#502) and arms the auto-advance timer. Clicking End Turn before
    // the timer fires must rotate the seat exactly once.
    const state = makeEndPhaseViaPathState();
    const { container } = render(<PlayScreen initialState={state} rng={seededRng(2)} />);

    const main = container.querySelector('[data-play-screen]');
    const initialActive = main?.getAttribute('data-active-player');

    playPathToYesod(container);
    expect(main?.getAttribute('data-phase')).toBe('end');

    // Click End Turn before the timer fires.
    const endBtn = container.querySelector('[data-action="end-turn"]') as HTMLButtonElement;
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
