import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { EncounterScreen } from '../EncounterScreen';
import type { ChallengeContext } from '@/lib/challenge-types';
import { useTurn } from '@/lib/use-turn';
import { seededRng } from '@/engine/rng';
import { makeFullGame } from '@/test/fixtures';
import { EMPTY_PENDING_MODIFIERS, type GameState } from '@/engine/types';

/**
 * Regression tests for the Tiferet requires-burn gate.
 *
 * Bug: the engine's `prep-confirm` handler returns
 * `{ ok: false, reason: { kind: 'tiferet-requires-burn' } }` when the player
 * tries to roll at Tiferet without staging any card burns (and still has
 * cards in hand). The UI did not implement this gate — clicking Roll at an
 * Apollo encounter produced no visible feedback. Players saw the button
 * appear to "do nothing."
 *
 * Fix: compute `tiferetRequiresBurn` in EncounterScreen (parallel to
 * `gevurahRequiresBurn`) and disable the Roll button with an inline hint.
 */

const tiferetContext: ChallengeContext = {
  sefirah: 'tiferet',
  stat: 10,
  statLabel: 'harmony',
  availableCardBurns: 2,
  availableSparkBurns: 1,
};

function makeTiferetChallengeState(overrides: { readonly handSize?: number } = {}): GameState {
  const handSize = overrides.handSize ?? 2;
  const base = makeFullGame({ playerCount: 2, seed: 1 });
  const activeIdx = base.players.findIndex((p) => p.id === base.activePlayerId);
  const hand = Array.from({ length: handSize }, (_, i) => i) as readonly number[];
  const players = base.players.map((p, idx) =>
    idx === activeIdx
      ? {
          ...p,
          position: 'tiferet' as const,
          hand,
          sparksHeld: new Set(['chesed']) as ReadonlySet<'chesed'>,
          stats: { ...p.stats, harmony: 10 },
        }
      : p,
  );
  return {
    ...base,
    players,
    phase: 'challenge',
    challengeSubPhase: 'prep',
    pendingModifiers: EMPTY_PENDING_MODIFIERS,
    lastOutcome: undefined,
    encounter: { sefirah: 'tiferet', seed: 42, retryCount: 0 },
  };
}

function renderTiferetEncounter(opts: {
  readonly handSize?: number;
  readonly mode?: 'hot-seat' | 'multiplayer';
  readonly onResolved?: () => void;
}) {
  const mode = opts.mode ?? 'hot-seat';
  const handSize = opts.handSize ?? 2;
  const state = makeTiferetChallengeState({ handSize });
  const context: ChallengeContext = { ...tiferetContext, availableCardBurns: handSize };
  const rng = seededRng(1);
  const { result, rerender: rerenderHook } = renderHook(() =>
    useTurn({ initialState: state, rng }),
  );
  const player = state.players.find((p) => p.id === state.activePlayerId);
  if (!player) throw new Error('test setup: active player missing');

  const Wrapper = (): JSX.Element => {
    if (mode === 'multiplayer') {
      return (
        <EncounterScreen
          context={context}
          rng={rng}
          mode="multiplayer"
          turn={result.current}
          onResolved={opts.onResolved ?? vi.fn()}
          player={player}
        />
      );
    }
    return (
      <EncounterScreen
        context={context}
        rng={rng}
        mode="hot-seat"
        turn={result.current}
        onResolved={opts.onResolved ?? vi.fn()}
        player={player}
      />
    );
  };

  const view = render(<Wrapper />);
  return {
    view,
    turnHook: result,
    rerender: () => {
      rerenderHook();
      view.rerender(<Wrapper />);
    },
  };
}

describe('EncounterScreen — Tiferet requires-burn gate', () => {
  it('disables the Roll button at Tiferet when no card burns staged and player has cards', () => {
    renderTiferetEncounter({ handSize: 2 });

    const rollBtn = screen.getByRole('button', { name: /^Roll$/ });
    expect(rollBtn).toBeDisabled();
  });

  it('shows an explanatory hint when the Tiferet gate is active', () => {
    renderTiferetEncounter({ handSize: 2 });

    expect(document.querySelector('[data-requires-burn]')).not.toBeNull();
  });

  it('enables Roll after staging at least one card burn', () => {
    renderTiferetEncounter({ handSize: 2 });

    expect(screen.getByRole('button', { name: /^Roll$/ })).toBeDisabled();

    const incBtn = document.querySelector(
      '[data-stepper="cardBurns"] button:last-of-type',
    ) as HTMLButtonElement;
    act(() => {
      fireEvent.click(incBtn);
    });

    expect(screen.getByRole('button', { name: /^Roll$/ })).not.toBeDisabled();
    expect(document.querySelector('[data-requires-burn]')).toBeNull();
  });

  it('does NOT gate Roll when the player has an empty hand (empty-hand waiver)', () => {
    renderTiferetEncounter({ handSize: 0 });

    expect(screen.getByRole('button', { name: /^Roll$/ })).not.toBeDisabled();
    expect(document.querySelector('[data-requires-burn]')).toBeNull();
  });

  it('gates Roll in multiplayer mode at Tiferet just as it does in hot-seat', () => {
    renderTiferetEncounter({ handSize: 2, mode: 'multiplayer' });

    expect(screen.getByRole('button', { name: /^Roll$/ })).toBeDisabled();
    expect(document.querySelector('[data-requires-burn]')).not.toBeNull();
  });

  it('does not block Roll when pendingModifiers already carries burns from a prior retry', () => {
    const base = makeTiferetChallengeState({ handSize: 2 });
    const stateWithPriorBurn: GameState = {
      ...base,
      pendingModifiers: {
        ...EMPTY_PENDING_MODIFIERS,
        cardBurns: [0],
      },
    };
    const rng = seededRng(1);
    const { result } = renderHook(() => useTurn({ initialState: stateWithPriorBurn, rng }));
    const player = stateWithPriorBurn.players.find(
      (p) => p.id === stateWithPriorBurn.activePlayerId,
    );
    if (!player) throw new Error('test setup: active player missing');

    render(
      <EncounterScreen
        context={tiferetContext}
        rng={rng}
        mode="hot-seat"
        turn={result.current}
        onResolved={vi.fn()}
        player={player}
      />,
    );

    expect(screen.getByRole('button', { name: /^Roll$/ })).not.toBeDisabled();
    expect(document.querySelector('[data-requires-burn]')).toBeNull();
  });
});
