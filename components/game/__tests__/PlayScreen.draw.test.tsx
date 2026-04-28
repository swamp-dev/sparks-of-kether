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

    // soulAspect lives on the engine-level player; for fixture
    // games the choices are already baked in. We re-derive here
    // by mirroring `makeFullGame`'s default-aspect order.
    const aspects = ['chesed', 'gevurah', 'tiferet', 'hod'] as const;
    const soulAspectByPlayer: Record<string, typeof aspects[number]> = {};
    for (const [idx, p] of initial.players.entries()) {
      const aspect = aspects[idx % aspects.length];
      if (aspect) soulAspectByPlayer[p.id] = aspect;
    }
    const rng = seededRng(2);

    render(
      <PlayScreen
        initialState={initial}
        soulAspectByPlayer={soulAspectByPlayer}
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
