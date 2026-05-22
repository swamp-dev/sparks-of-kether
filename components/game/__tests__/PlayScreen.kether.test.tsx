import { describe, expect, it } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { PlayScreen } from '../PlayScreen';
import { initKetherRitual } from '@/engine/kether';
import { seededRng } from '@/engine/rng';
import { makePlayer, makeState } from '@/test/fixtures';
import type { GameState } from '@/engine/types';

/**
 * #562 — hot-seat chorus seat follows trial pointer.
 *
 * Pre-fix, `PlayScreen` mounted `FinalThresholdScreen` with
 * `player={players[activePlayerIndex]}`, but the trial gauntlet
 * rotates `state.ketherRitual.trialTurnIndex` independently. When
 * the first trial player is anyone other than the active player, the
 * screen rendered for the wrong seat — the active trial player saw no
 * Roll button and the rendered seat saw "Waiting for …" with no way
 * to advance.
 */

function buildKetherTrialState(): GameState {
  const player1 = makePlayer({
    id: 'p1',
    name: 'Alex',
    position: 'kether',
    hand: [],
    zodiacSign: 'aries',
  });
  const player2 = makePlayer({
    id: 'p2',
    name: 'Bea',
    position: 'kether',
    hand: [],
    zodiacSign: 'leo',
  });
  const baseState = makeState(
    {},
    {
      players: [player1, player2],
      activePlayerId: 'p1',
    },
  );
  // p2 arrives last (descending timestamp → p2 first in trial order).
  const initResult = initKetherRitual(baseState, { p1: 100, p2: 200 });
  if (!initResult.ok) {
    throw new Error(
      `buildKetherTrialState: initKetherRitual rejected — ${initResult.reason.kind}`,
    );
  }
  return initResult.value;
}

describe('PlayScreen — hot-seat chorus seat follows trial pointer (#562)', () => {
  it('renders the FinalThresholdScreen for the current trial player, not the activePlayer', () => {
    // p2 is first trial player (last-arrived); activePlayerId is p1.
    // Pre-fix this rendered for p1 with no Roll button — frozen.
    const initial = buildKetherTrialState();
    render(<PlayScreen initialState={initial} rng={seededRng(1)} />);

    const status = document.querySelector('[data-trial-status]');
    expect(status?.textContent).toMatch(/Your turn/i);

    // Only the current trial player sees a Roll button.
    expect(document.querySelector('[data-action="kether-trial-resolve"]')).not.toBeNull();
  });

  it('rotates the rendered seat after a resolve so the next trial player can act', () => {
    // p2 resolves → trial pointer moves to p1 → the screen must now
    // render for p1 so they can also resolve.
    const initial = buildKetherTrialState();
    render(<PlayScreen initialState={initial} rng={seededRng(1)} />);

    const resolveBtn = document.querySelector(
      '[data-action="kether-trial-resolve"]',
    ) as HTMLButtonElement | null;
    expect(resolveBtn).not.toBeNull();
    if (!resolveBtn) return;
    act(() => {
      fireEvent.click(resolveBtn);
    });

    // After p2 resolves, the trial pointer is at p1. The rendered
    // seat must follow — p1 should now see a Roll button.
    const status = document.querySelector('[data-trial-status]');
    expect(status?.textContent).toMatch(/Your turn/i);
    expect(document.querySelector('[data-action="kether-trial-resolve"]')).not.toBeNull();
  });
});
