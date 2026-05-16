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
 * suppressed (the meditator needed time to read the cards they just
 * drew). Post-#503 Meditate stays in `'move'` so the suppression
 * gate isn't reachable; landing in `'end'` always means a
 * Move/Challenge has resolved and auto-advance is appropriate.
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

  it('auto-advances to the next player after the end-phase delay (Move into already-cleared Sefirah)', () => {
    // #502: Move into an already-cleared Sefirah lands directly in
    // `'end'` (pre-#502 it landed in `'draw'` and required a separate
    // Draw click). The auto-advance timer flips the seat after the
    // delay.
    const base = makeFullGame({ playerCount: 2, seed: 1 });
    const activeIdx = base.players.findIndex((p) => p.id === base.activePlayerId);
    // Pre-clear yesod for the active player so move via path 32
    // (Malkuth↔Yesod, "The World"/arcanum 21) skips challenge phase
    // and lands directly in 'end'. Card 21 in hand to play the path.
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
    const state = { ...base, players };
    const { container } = render(<PlayScreen initialState={state} rng={seededRng(2)} />);

    const main = container.querySelector('[data-play-screen]');
    const initialActive = main?.getAttribute('data-active-player');
    expect(initialActive).toBeTruthy();

    // Select card 21 then click path 32 to move from Malkuth → Yesod.
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

  it('clicking End Turn manually cancels the pending auto-advance (no double-fire)', () => {
    // Move into an already-cleared Sefirah lands in `'end'` directly
    // (#502) and arms the auto-advance timer. Clicking End Turn before
    // the timer fires must rotate the seat exactly once.
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
    const state = { ...base, players };
    const { container } = render(<PlayScreen initialState={state} rng={seededRng(2)} />);

    const main = container.querySelector('[data-play-screen]');
    const initialActive = main?.getAttribute('data-active-player');

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
