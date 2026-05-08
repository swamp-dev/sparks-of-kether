import { describe, expect, it } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { PlayScreen } from '../PlayScreen';
import { initKetherRitual } from '@/engine/kether';
import { seededRng } from '@/engine/rng';
import { makePlayer, makeState } from '@/test/fixtures';
import type { GameState } from '@/engine/types';

/**
 * #562 — hot-seat chorus freeze regression.
 *
 * Pre-fix, `PlayScreen` mounted `FinalThresholdScreen` with
 * `player={players[activePlayerIndex]}`, but the witness round-robin
 * rotates `state.ketherRitual.witnessTurnIndex` independently. When
 * the first witness was anyone other than the active player, the
 * screen rendered for the wrong seat — the active witness saw no
 * Play button and the rendered seat saw "Waiting for …" with no way
 * to advance. Two consecutive witness plays are enough to expose
 * both freeze shapes (initial mismatch and post-rotation mismatch).
 */

function buildKetherWitnessState(): GameState {
  const player1 = makePlayer({
    id: 'p1',
    name: 'Alex',
    position: 'kether',
    hand: [10, 11],
    zodiacSign: 'aries',
  });
  const player2 = makePlayer({
    id: 'p2',
    name: 'Bea',
    position: 'kether',
    hand: [20, 21],
    zodiacSign: 'leo',
  });
  const baseState = makeState(
    {},
    {
      players: [player1, player2],
      activePlayerId: 'p1',
    },
  );
  // p2 arrives last (descending timestamp → p2 first in witness order).
  const initResult = initKetherRitual(baseState, { p1: 100, p2: 200 });
  if (!initResult.ok) {
    throw new Error(
      `buildKetherWitnessState: initKetherRitual rejected — ${initResult.reason.kind}`,
    );
  }
  return initResult.value;
}

describe('PlayScreen — hot-seat chorus seat follows witness pointer (#562)', () => {
  it('renders the FinalThresholdScreen for the current witness, not the activePlayer', () => {
    // p2 is first witness (last-arrived); activePlayerId is p1.
    // Pre-fix this rendered for p1 with no Play button — frozen.
    const initial = buildKetherWitnessState();
    render(<PlayScreen initialState={initial} rng={seededRng(1)} />);

    const status = document.querySelector('[data-witness-status]');
    expect(status?.textContent).toMatch(/Your turn/i);

    // Only the current witness's hand exposes Play buttons. p2 holds
    // arcana 20 and 21; pre-fix the rendered seat (p1) saw no Play
    // buttons at all because `isMyTurn` was false for p1.
    expect(
      document.querySelector('[data-action="kether-witness-play"][data-arcanum="20"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-action="kether-witness-play"][data-arcanum="21"]'),
    ).not.toBeNull();
  });

  it('rotates the rendered seat after a card play so the next witness can act', () => {
    // Two-step rotation: p2 plays 20 → witness pointer moves to p1
    // → the screen must now render for p1 so they can also play.
    const initial = buildKetherWitnessState();
    render(<PlayScreen initialState={initial} rng={seededRng(1)} />);

    const playP2 = document.querySelector(
      '[data-action="kether-witness-play"][data-arcanum="20"]',
    ) as HTMLButtonElement | null;
    expect(playP2).not.toBeNull();
    if (!playP2) return;
    act(() => {
      fireEvent.click(playP2);
    });

    // After p2's play, the witness pointer is at p1. The rendered
    // seat must follow — p1's arcana (10, 11) should now be
    // playable, and p2's already-played card (20) is out of the
    // hand so its Play button is gone regardless.
    const status = document.querySelector('[data-witness-status]');
    expect(status?.textContent).toMatch(/Your turn/i);
    expect(
      document.querySelector('[data-action="kether-witness-play"][data-arcanum="10"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-action="kether-witness-play"][data-arcanum="11"]'),
    ).not.toBeNull();

    // Drive a second play to confirm the rotation continues round-
    // robin (back to p2 for arcanum 21).
    const playP1 = document.querySelector(
      '[data-action="kether-witness-play"][data-arcanum="10"]',
    ) as HTMLButtonElement | null;
    expect(playP1).not.toBeNull();
    if (!playP1) return;
    act(() => {
      fireEvent.click(playP1);
    });

    expect(
      document.querySelector('[data-action="kether-witness-play"][data-arcanum="21"]'),
    ).not.toBeNull();
  });
});
