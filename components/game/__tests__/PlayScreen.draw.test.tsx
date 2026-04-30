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

    render(<PlayScreen initialState={initial} rng={rng} />);

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

describe('PlayScreen — Meditate at HAND_CAP renders DiscardPrompt (#291)', () => {
  // #291: pre-fix the Meditate button was disabled at HAND_CAP, which
  // softlocked players with no usable paths. New contract: Meditate
  // is always enabled; clicking it draws past the cap and renders a
  // DiscardPrompt for the over-cap excess.
  it('enables Meditate at HAND_CAP and renders DiscardPrompt after click', () => {
    const state = makeFullGame({ playerCount: 2, seed: 1 });
    const activeIdx = state.players.findIndex(
      (p) => p.id === state.activePlayerId,
    );
    const cappedPlayers = state.players.map((p, idx) =>
      idx === activeIdx ? { ...p, hand: [0, 1, 2, 3, 4, 5] } : p,
    );
    const initial = { ...state, players: cappedPlayers };
    const rng = seededRng(2);

    render(<PlayScreen initialState={initial} rng={rng} />);

    const meditateBtn = screen.getByRole('button', { name: /meditate/i });
    expect(meditateBtn).not.toBeDisabled();

    act(() => {
      fireEvent.click(meditateBtn);
    });

    // After the click the player has 8 cards (over HAND_CAP=6 by 2)
    // and the DiscardPrompt is on screen telling them to shed 2.
    const slots = document.querySelectorAll('[data-hand] [data-card-slot]');
    expect(slots.length).toBe(8);
    const prompt = document.querySelector('[data-discard-prompt]');
    expect(prompt).not.toBeNull();
    expect(prompt?.textContent ?? '').toMatch(/2/);
  });
});

describe('PlayScreen — full hand visibility (#290)', () => {
  // #290: a player whose hand is at HAND_CAP=6 (e.g. just meditated
  // from a hand of 4) must see all 6 cards rendered in the fan.
  // The earlier bug clipped the visible count at 4.
  it('renders all 6 card slots when the active player holds HAND_CAP cards', () => {
    const state = makeFullGame({ playerCount: 2, seed: 1 });
    const activeIdx = state.players.findIndex(
      (p) => p.id === state.activePlayerId,
    );
    const cappedPlayers = state.players.map((p, idx) =>
      idx === activeIdx ? { ...p, hand: [0, 2, 5, 13, 18, 21] } : p,
    );
    const initial = { ...state, players: cappedPlayers };
    const rng = seededRng(2);

    render(<PlayScreen initialState={initial} rng={rng} />);

    const slots = document.querySelectorAll('[data-hand] [data-card-slot]');
    expect(slots.length).toBe(6);
  });

  it('reveals all newly-drawn cards after Meditate from a 4-card hand', () => {
    // Reproduces the user-visible regression: STARTING_HAND_SIZE is
    // 4, Meditate draws +2 (to 6 = HAND_CAP). Newly-drawn cards must
    // appear in the DOM, not be silently clipped at the previous count.
    const state = makeFullGame({ playerCount: 2, seed: 1 });
    const activeIdx = state.players.findIndex(
      (p) => p.id === state.activePlayerId,
    );
    const fourCardPlayers = state.players.map((p, idx) =>
      idx === activeIdx ? { ...p, hand: p.hand.slice(0, 4) } : p,
    );
    const initial = { ...state, players: fourCardPlayers };
    const rng = seededRng(2);

    render(<PlayScreen initialState={initial} rng={rng} />);

    // Pre-meditate: 4 cards.
    let slots = document.querySelectorAll('[data-hand] [data-card-slot]');
    expect(slots.length).toBe(4);

    const meditateBtn = screen.getByRole('button', { name: /meditate/i });
    act(() => {
      fireEvent.click(meditateBtn);
    });

    // Post-meditate: all 6 must be in the DOM.
    slots = document.querySelectorAll('[data-hand] [data-card-slot]');
    expect(slots.length).toBe(6);
  });
});
