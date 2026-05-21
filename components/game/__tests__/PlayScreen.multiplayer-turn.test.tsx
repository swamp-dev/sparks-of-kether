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
  // netzach has kind:'check' so it avoids the console noise the malkuth
  // (kind:'no-check') position generates from the stat-check guard.
  const p1 = makePlayer({ id: 'p1', name: 'Alex', hand: [10, 11], position: 'netzach' });
  const p2 = makePlayer({ id: 'p2', name: 'Bea', hand: [20, 21], position: 'netzach' });
  return makeState({}, { players: [p1, p2], activePlayerId: 'p1', phase: 'end' });
}

function buildChallengePhaseState(): GameState {
  // p1 (active) at yesod — a Sefirah with a stat check (kind:'check', dc:12)
  // so challengeContext would be non-null for the active player. The non-active
  // player must not see EncounterScreen despite the active player's challenge.
  const p1 = makePlayer({ id: 'p1', name: 'Alex', hand: [10, 11], position: 'yesod' });
  const p2 = makePlayer({ id: 'p2', name: 'Bea', hand: [20, 21], position: 'netzach' });
  return makeState(
    {},
    { players: [p1, p2], activePlayerId: 'p1', phase: 'challenge', challengeSubPhase: 'prep' },
  );
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

  it("non-active player's Meditate button is disabled", () => {
    const initial = buildTwoPlayerState(); // phase: 'move', p1 active
    render(<PlayScreen initialState={initial} rng={seededRng(1)} currentPlayerId="p2" />);
    const meditateBtn = document.querySelector<HTMLButtonElement>('[data-action="meditate"]');
    expect(meditateBtn).not.toBeNull();
    expect(meditateBtn?.disabled).toBe(true);
  });

  it('non-active player does not see EncounterScreen in challenge phase', () => {
    // isMyTurn=false → showChallenge=false → challengeContext=null → no overlay.
    // p1 is at yesod (kind:'check') so the active player WOULD see EncounterScreen,
    // making this test catch regressions where isMyTurn is dropped from showChallenge.
    const initial = buildChallengePhaseState();
    render(<PlayScreen initialState={initial} rng={seededRng(1)} currentPlayerId="p2" />);
    expect(document.querySelector('[data-encounter-screen]')).toBeNull();
  });

  it('active player sees EncounterScreen in challenge phase', () => {
    // Positive-case pair for the test above. Renders with currentPlayerId="p1"
    // (the active player at yesod) and asserts the overlay IS present — so the
    // suite fails if EncounterScreen is broken for everyone, not just for p2.
    const initial = buildChallengePhaseState();
    render(<PlayScreen initialState={initial} rng={seededRng(1)} currentPlayerId="p1" />);
    expect(document.querySelector('[data-encounter-screen]')).not.toBeNull();
  });
});
