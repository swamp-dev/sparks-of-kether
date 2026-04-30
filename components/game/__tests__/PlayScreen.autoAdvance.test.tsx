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

  it('auto-advances to the next player after the end-phase delay (Move + Draw)', () => {
    // Move + Draw is the canonical flow that auto-advances per #131 —
    // the player has already seen the move land and the draw resolve,
    // so the timer flips the seat without further input.
    //
    // #292: Meditate-into-end is a separate case which deliberately does
    // NOT auto-advance (see the "does NOT auto-advance after Meditate"
    // test below); the discriminator is `state.lastAction`.
    const base = makeFullGame({ playerCount: 2, seed: 1 });
    const activeIdx = base.players.findIndex(
      (p) => p.id === base.activePlayerId,
    );
    // Pre-clear yesod for the active player so move via path 32
    // (Malkuth↔Yesod, "The World"/arcanum 21) skips challenge phase
    // and lands directly in 'draw'. Card 21 in hand to play the path.
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
    const { container } = render(
      <PlayScreen initialState={state} rng={seededRng(2)} />,
    );

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
    const path32 = container.querySelector(
      '[data-path="32"]',
    ) as SVGElement;
    act(() => {
      fireEvent.click(path32);
    });
    expect(main?.getAttribute('data-phase')).toBe('draw');

    // Click Draw → 'end' phase.
    const drawBtn = container.querySelector(
      '[data-action="draw"]',
    ) as HTMLButtonElement;
    act(() => {
      fireEvent.click(drawBtn);
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

  it('does NOT auto-advance after Meditate; End Turn button stays visible until clicked (#292)', () => {
    // #292: revisits the #131 auto-advance. Meditate draws cards and
    // lands directly in `'end'` — auto-advancing flips the active
    // player before the meditator can see the cards they just drew.
    // The fix: the reducer stamps `lastAction = 'meditate'` and the
    // auto-advance `useEffect` skips this case. The Move + Draw path
    // (lastAction === 'move-draw') still auto-advances per #131.
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
    expect(main?.getAttribute('data-phase')).toBe('end');

    // Advance past the auto-advance window. Active player should NOT
    // have rotated.
    act(() => {
      vi.advanceTimersByTime(AUTO_ADVANCE_DELAY_MS * 3);
    });
    expect(main?.getAttribute('data-active-player')).toBe(initialActive);
    expect(main?.getAttribute('data-phase')).toBe('end');

    // The End Turn button is still visible and clickable.
    const endBtn = container.querySelector(
      '[data-action="end-turn"]',
    ) as HTMLButtonElement;
    expect(endBtn).toBeTruthy();
    act(() => {
      fireEvent.click(endBtn);
    });
    // Now the seat advances.
    expect(main?.getAttribute('data-active-player')).not.toBe(initialActive);
  });

  it('clicking End Turn manually cancels the pending auto-advance (no double-fire)', () => {
    // Use Move + Draw to reach 'end' (auto-advancing flow). #292
    // changes Meditate so it does NOT arm the timer; this test
    // remains about the cancellation of the timer that DOES arm.
    const base = makeFullGame({ playerCount: 2, seed: 1 });
    const activeIdx = base.players.findIndex(
      (p) => p.id === base.activePlayerId,
    );
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
    const { container } = render(
      <PlayScreen initialState={state} rng={seededRng(2)} />,
    );

    const main = container.querySelector('[data-play-screen]');
    const initialActive = main?.getAttribute('data-active-player');

    const cardBtn = container.querySelector(
      '[data-card-slot][data-arcanum="21"]',
    ) as HTMLButtonElement;
    act(() => {
      fireEvent.click(cardBtn);
    });
    const path32 = container.querySelector(
      '[data-path="32"]',
    ) as SVGElement;
    act(() => {
      fireEvent.click(path32);
    });
    const drawBtn = container.querySelector(
      '[data-action="draw"]',
    ) as HTMLButtonElement;
    act(() => {
      fireEvent.click(drawBtn);
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
