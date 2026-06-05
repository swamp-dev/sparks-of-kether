import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PlayScreen, AUTO_ADVANCE_DELAY_MS } from '../PlayScreen';
import { makeFullGame } from '@/test/fixtures';
import { seededRng } from '@/engine/rng';

/**
 * #287: After playing a path into a cleared Sefirah (end phase), the
 * player may meditate once before ending their turn.
 *
 * Tests:
 * - Meditate button is visible and enabled in 'end' phase
 * - Clicking Meditate draws 2 cards and disables the button
 * - The `data-meditate-callout` message is phase-appropriate
 * - The auto-advance timer is suppressed (covered in autoAdvance tests)
 */

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

function renderAndMoveToEnd() {
  const state = makeEndPhaseViaPathState();
  const { container } = render(<PlayScreen initialState={state} rng={seededRng(2)} />);

  // Play card 21 on path 32 (Malkuth → Yesod already cleared → 'end').
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

  return container;
}

describe('PlayScreen — Meditate from end phase (#287)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('Meditate button is visible and enabled after a move (#298)', () => {
    // #298: a no-challenge move stays in 'move' phase. Meditate is still
    // available (once per turn) — the player may meditate before or after
    // any number of moves.
    const container = renderAndMoveToEnd();
    expect(container.querySelector('[data-play-screen]')?.getAttribute('data-phase')).toBe('move');

    const meditateBtn = screen.getByRole('button', { name: /^meditate$/i });
    expect(meditateBtn).toBeInTheDocument();
    expect(meditateBtn).not.toBeDisabled();
  });

  it('Meditate button is disabled after meditating in end phase', () => {
    const container = renderAndMoveToEnd();

    act(() => {
      fireEvent.click(container.querySelector('[data-action="meditate"]') as HTMLButtonElement);
    });
    act(() => {
      fireEvent.click(
        container.querySelector('[data-meditate-confirm-confirm]') as HTMLButtonElement,
      );
    });

    const meditateBtn = screen.getByRole('button', { name: /^meditate$/i });
    expect(meditateBtn).toBeDisabled();
  });

  it('shows the move-phase meditate callout after meditating (#298)', () => {
    const container = renderAndMoveToEnd();

    act(() => {
      fireEvent.click(container.querySelector('[data-action="meditate"]') as HTMLButtonElement);
    });
    act(() => {
      fireEvent.click(
        container.querySelector('[data-meditate-confirm-confirm]') as HTMLButtonElement,
      );
    });

    const callout = container.querySelector('[data-meditate-callout]');
    expect(callout).not.toBeNull();
    // #298: after a move, phase is 'move' — the callout text is the
    // 'move'-phase variant (may still play a card, or end turn).
    expect(callout?.textContent).toMatch(/End your turn/);
  });

  it('Meditate button is disabled after move if already meditated (#298)', () => {
    // If the player meditated in 'move' then played a path to a cleared sefirah,
    // meditatedThisTurn is true in the resulting 'move' phase — button disabled.
    const base = makeFullGame({ playerCount: 2, seed: 1 });
    const activeIdx = base.players.findIndex((p) => p.id === base.activePlayerId);
    const players = base.players.map((p, idx) =>
      idx === activeIdx
        ? {
            ...p,
            position: 'malkuth' as const,
            hand: [21, 0, 1],
            clearedSefirot: new Set([...p.clearedSefirot, 'yesod' as const]),
          }
        : p,
    );
    const state = { ...base, players };
    const { container } = render(<PlayScreen initialState={state} rng={seededRng(2)} />);

    // Meditate in 'move' first.
    act(() => {
      fireEvent.click(container.querySelector('[data-action="meditate"]') as HTMLButtonElement);
    });
    act(() => {
      fireEvent.click(
        container.querySelector('[data-meditate-confirm-confirm]') as HTMLButtonElement,
      );
    });
    expect(container.querySelector('[data-play-screen]')?.getAttribute('data-phase')).toBe('move');

    // Now play card 21 on path 32 to land in 'end'.
    // After meditate in move, the player needs to pick a card from their (now larger) hand.
    // Card 21 is still in hand (meditate doesn't consume it).
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

    // #298: phase stays 'move' after the no-challenge path play.
    expect(container.querySelector('[data-play-screen]')?.getAttribute('data-phase')).toBe('move');

    // Meditate button should be disabled because meditatedThisTurn was set before the move.
    const meditateBtn = screen.getByRole('button', { name: /^meditate$/i });
    expect(meditateBtn).toBeDisabled();

    // No auto-advance from 'move' — player must click End Turn.
    const initialActive = container
      .querySelector('[data-play-screen]')
      ?.getAttribute('data-active-player');
    act(() => {
      vi.advanceTimersByTime(AUTO_ADVANCE_DELAY_MS * 3);
    });
    // Seat has NOT rotated (no auto-advance from 'move').
    expect(container.querySelector('[data-play-screen]')?.getAttribute('data-active-player')).toBe(
      initialActive,
    );
    // End Turn works: movedThisTurn=true so the button is present.
    const endBtn = container.querySelector<HTMLButtonElement>('[data-action="end-turn"]');
    expect(endBtn).not.toBeNull();
    act(() => {
      fireEvent.click(endBtn as HTMLButtonElement);
    });
    expect(
      container.querySelector('[data-play-screen]')?.getAttribute('data-active-player'),
    ).not.toBe(initialActive);
  });
});
