import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PlayScreen } from '../PlayScreen';
import { makeFullGame } from '@/test/fixtures';
import { seededRng } from '@/engine/rng';

/**
 * #128 — playtest report: clicking Meditate then Draw left the hand
 * unchanged. Per design, Meditate now draws 2 cards directly and
 * skips the 'draw' phase. This test pins that contract at the UI
 * level: after a Meditate click, the Hand exposes ≥ 2 more
 * `[data-card-slot]` than before (capped at HAND_CAP).
 *
 * We construct a real `makeFullGame` state and then trim the active
 * player's hand to 2 cards so the +2 from Meditate has room (the
 * cap is 6).
 */

/** Re-derive the soul-aspect-by-id map the way `makeFullGame` does. */
function aspectMap(
  state: ReturnType<typeof makeFullGame>,
): Record<string, 'chesed' | 'gevurah' | 'tiferet' | 'hod'> {
  const aspects = ['chesed', 'gevurah', 'tiferet', 'hod'] as const;
  const map: Record<string, typeof aspects[number]> = {};
  for (const [idx, p] of state.players.entries()) {
    const aspect = aspects[idx % aspects.length];
    if (aspect) map[p.id] = aspect;
  }
  return map;
}

describe('PlayScreen — meditate updates the hand', () => {
  it('renders two more card slots after clicking Meditate', () => {
    const state = makeFullGame({ playerCount: 2, seed: 1 });
    const activeIdx = state.players.findIndex(
      (p) => p.id === state.activePlayerId,
    );
    const trimmedPlayers = state.players.map((p, idx) =>
      idx === activeIdx ? { ...p, hand: p.hand.slice(0, 2) } : p,
    );
    const initial = { ...state, players: trimmedPlayers };
    const rng = seededRng(2);

    render(
      <PlayScreen
        initialState={initial}
        soulAspectByPlayer={aspectMap(state)}
        rng={rng}
      />,
    );

    // Pre-meditate hand: 2 cards.
    let slots = document.querySelectorAll('[data-hand] [data-card-slot]');
    expect(slots.length).toBe(2);

    const meditateBtn = screen.getByRole('button', { name: /meditate/i });
    act(() => {
      fireEvent.click(meditateBtn);
    });

    slots = document.querySelectorAll('[data-hand] [data-card-slot]');
    expect(slots.length).toBe(4);
  });
});

describe('PlayScreen — meditate disabled at HAND_CAP', () => {
  it('disables the Meditate button when the active player holds HAND_CAP cards', () => {
    // #216 root cause: when a player's hand is already at HAND_CAP=6,
    // clicking Meditate silently no-ops because `drawNCards` early-
    // exits. The fix is to gate the click in the UI so the user sees
    // why the action is unavailable.
    const state = makeFullGame({ playerCount: 2, seed: 1 });
    const activeIdx = state.players.findIndex(
      (p) => p.id === state.activePlayerId,
    );
    const cappedPlayers = state.players.map((p, idx) =>
      idx === activeIdx ? { ...p, hand: [0, 1, 2, 3, 4, 5] } : p,
    );
    const initial = { ...state, players: cappedPlayers };
    const rng = seededRng(2);

    render(
      <PlayScreen
        initialState={initial}
        soulAspectByPlayer={aspectMap(state)}
        rng={rng}
      />,
    );

    const meditateBtn = screen.getByRole('button', { name: /meditate/i });
    expect(meditateBtn).toBeDisabled();
    // The button surfaces *why* via aria-label / title so screen-
    // reader and hover users both understand the gating.
    expect(meditateBtn.getAttribute('title')).toMatch(/full|cap/i);

    // Sanity: clicking the disabled button does not grow the hand.
    let slots = document.querySelectorAll('[data-hand] [data-card-slot]');
    const before = slots.length;
    act(() => {
      fireEvent.click(meditateBtn);
    });
    slots = document.querySelectorAll('[data-hand] [data-card-slot]');
    expect(slots.length).toBe(before);
  });
});
