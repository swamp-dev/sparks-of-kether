import { describe, expect, it } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { PlayScreen } from '../PlayScreen';
import { makePlayer, makeState } from '@/test/fixtures';
import { seededRng } from '@/engine/rng';
import type { GameState } from '@/engine/types';

/**
 * Multiplayer turn-gating: each client knows its own player ID
 * (`currentPlayerId` prop). The non-active player must:
 *   1. See their own hand, not the active player's.
 *   2. Have all interactive elements disabled (no card select, no buttons).
 *
 * The active player and hot-seat mode must behave as before.
 */

function buildTwoPlayerState(): GameState {
  const p1 = makePlayer({ id: 'p1', name: 'Alex', hand: [10, 11], position: 'malkuth' });
  const p2 = makePlayer({ id: 'p2', name: 'Bea', hand: [20, 21], position: 'malkuth' });
  return makeState({}, { players: [p1, p2], activePlayerId: 'p1', phase: 'move' });
}

function buildEndPhaseState(): GameState {
  const p1 = makePlayer({ id: 'p1', name: 'Alex', hand: [10, 11], position: 'malkuth' });
  const p2 = makePlayer({ id: 'p2', name: 'Bea', hand: [20, 21], position: 'malkuth' });
  return makeState({}, { players: [p1, p2], activePlayerId: 'p1', phase: 'end' });
}

describe('PlayScreen — multiplayer turn gating', () => {
  it("non-active player sees their own hand, not the active player's", () => {
    const initial = buildTwoPlayerState();
    render(<PlayScreen initialState={initial} rng={seededRng(1)} currentPlayerId="p2" />);

    // p2's cards must be present in the hand
    expect(document.querySelector('[data-arcanum="20"]')).not.toBeNull();
    expect(document.querySelector('[data-arcanum="21"]')).not.toBeNull();

    // p1's cards must NOT appear — p2 is not the active player and
    // is viewing their own hand, not the turn-holder's
    expect(document.querySelector('[data-arcanum="10"]')).toBeNull();
    expect(document.querySelector('[data-arcanum="11"]')).toBeNull();
  });

  it("non-active player's cards are aria-disabled (read-only hand)", () => {
    const initial = buildTwoPlayerState();
    render(<PlayScreen initialState={initial} rng={seededRng(1)} currentPlayerId="p2" />);

    // When onCardSelect is not wired, interactive=false → aria-disabled="true"
    const card20 = document.querySelector('[data-arcanum="20"]');
    expect(card20).not.toBeNull();
    expect(card20?.getAttribute('aria-disabled')).toBe('true');
  });

  it("non-active player's cards do not change selected state when clicked", () => {
    const initial = buildTwoPlayerState();
    render(<PlayScreen initialState={initial} rng={seededRng(1)} currentPlayerId="p2" />);

    const card20 = document.querySelector<HTMLElement>('[data-arcanum="20"]');
    expect(card20).not.toBeNull();
    if (card20 === null) return;
    expect(card20.getAttribute('data-selected')).toBe('false');

    act(() => {
      fireEvent.click(card20);
    });

    // Click should have no effect — no onCardSelect wired
    expect(card20.getAttribute('data-selected')).toBe('false');
  });

  it("non-active player's End Turn button is disabled", () => {
    const initial = buildEndPhaseState();
    render(<PlayScreen initialState={initial} rng={seededRng(1)} currentPlayerId="p2" />);

    const endBtn = document.querySelector<HTMLButtonElement>('[data-action="end-turn"]');
    expect(endBtn).not.toBeNull();
    expect(endBtn?.disabled).toBe(true);
  });

  it('active player (p1) sees their own hand', () => {
    const initial = buildTwoPlayerState();
    render(<PlayScreen initialState={initial} rng={seededRng(1)} currentPlayerId="p1" />);

    // p1's cards must be visible
    expect(document.querySelector('[data-arcanum="10"]')).not.toBeNull();
    expect(document.querySelector('[data-arcanum="11"]')).not.toBeNull();

    // p2's cards must NOT appear — the hand shows p1's cards on p1's turn
    expect(document.querySelector('[data-arcanum="20"]')).toBeNull();
    expect(document.querySelector('[data-arcanum="21"]')).toBeNull();
  });

  it("active player's cards are interactive (not aria-disabled)", () => {
    const initial = buildTwoPlayerState();
    render(<PlayScreen initialState={initial} rng={seededRng(1)} currentPlayerId="p1" />);

    const card10 = document.querySelector('[data-arcanum="10"]');
    expect(card10).not.toBeNull();
    // aria-disabled should be false/absent when the card is interactive
    expect(card10?.getAttribute('aria-disabled')).not.toBe('true');
  });

  it("active player's End Turn button is enabled (phase=end)", () => {
    const initial = buildEndPhaseState();
    render(<PlayScreen initialState={initial} rng={seededRng(1)} currentPlayerId="p1" />);

    const endBtn = document.querySelector<HTMLButtonElement>('[data-action="end-turn"]');
    expect(endBtn).not.toBeNull();
    expect(endBtn?.disabled).toBe(false);
  });

  it("hot-seat mode (no currentPlayerId) shows active player's hand", () => {
    const initial = buildTwoPlayerState();
    render(<PlayScreen initialState={initial} rng={seededRng(1)} />);

    // Hot-seat: p1 is active, show p1's hand (existing behavior preserved)
    expect(document.querySelector('[data-arcanum="10"]')).not.toBeNull();
    expect(document.querySelector('[data-arcanum="11"]')).not.toBeNull();
  });

  it('hot-seat mode cards are interactive', () => {
    const initial = buildTwoPlayerState();
    render(<PlayScreen initialState={initial} rng={seededRng(1)} />);

    const card10 = document.querySelector('[data-arcanum="10"]');
    expect(card10).not.toBeNull();
    expect(card10?.getAttribute('aria-disabled')).not.toBe('true');
  });
});
