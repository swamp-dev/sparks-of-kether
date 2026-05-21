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
 * Regression tests for the Gevurah requires-burn gate.
 *
 * Bug: the engine's `prep-confirm` handler returns
 * `{ ok: false, reason: { kind: 'gevurah-requires-burn' } }` when the player
 * tries to roll at Gevurah without staging any card burns (and still has
 * cards in hand). `doRoll` in EncounterScreen ignores this rejection —
 * the Roll click produces no visible feedback. Players see the button
 * appear to "do nothing."
 *
 * The framing text ("pay the cost first") is a hint, but the UI does not
 * enforce the constraint visually. Fix: compute the gate in EncounterScreen
 * using `turn.state.encounter?.sefirah === 'gevurah'` (mirrors the engine
 * check exactly) and disable the Roll button with an inline explanatory hint.
 *
 * Existing EncounterScreen tests are unaffected because they construct
 * challenge states without setting `encounter` — `turn.state.encounter`
 * is `undefined` there, so the gate evaluates to false.
 */

const gevurahContext: ChallengeContext = {
  sefirah: 'gevurah',
  stat: 6,
  statLabel: 'strength',
  availableCardBurns: 2,
  availableSparkBurns: 1,
};

/**
 * Build a GameState at Gevurah in challenge/prep WITH a properly-set
 * `encounter` envelope — the key difference from `makeChallengeState()`
 * in the existing test file. The engine's `gevurah-requires-burn` gate
 * reads `state.encounter?.sefirah === 'gevurah'`; without this field the
 * gate never fires and the bug isn't exercised.
 */
function makeGevurahChallengeState(overrides: { readonly handSize?: number } = {}): GameState {
  const handSize = overrides.handSize ?? 2;
  const base = makeFullGame({ playerCount: 2, seed: 1 });
  const activeIdx = base.players.findIndex((p) => p.id === base.activePlayerId);
  const hand = Array.from({ length: handSize }, (_, i) => i) as readonly number[];
  const players = base.players.map((p, idx) =>
    idx === activeIdx
      ? {
          ...p,
          position: 'gevurah' as const,
          hand,
          sparksHeld: new Set(['chesed']) as ReadonlySet<'chesed'>,
          stats: { ...p.stats, strength: 6 },
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
    // The engine's gate reads this field — it must be set.
    encounter: { sefirah: 'gevurah', seed: 42, retryCount: 0 },
  };
}

function renderGevurahEncounter(opts: {
  readonly handSize?: number;
  readonly mode?: 'hot-seat' | 'multiplayer';
  readonly onResolved?: () => void;
}) {
  const mode = opts.mode ?? 'hot-seat';
  const handSize = opts.handSize ?? 2;
  const state = makeGevurahChallengeState({ handSize });
  // Context must reflect the actual hand size so `maxCardBurns` (and therefore
  // `gevurahRequiresBurn`) mirrors what `buildChallengeContext` would produce
  // in the real game.
  const context: ChallengeContext = { ...gevurahContext, availableCardBurns: handSize };
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

describe('EncounterScreen — Gevurah requires-burn gate', () => {
  it('disables the Roll button at Gevurah when no card burns staged and player has cards', () => {
    renderGevurahEncounter({ handSize: 2 });

    const rollBtn = screen.getByRole('button', { name: /^Roll$/ });
    expect(rollBtn).toBeDisabled();
  });

  it('shows an explanatory hint when the Gevurah gate is active', () => {
    renderGevurahEncounter({ handSize: 2 });

    expect(document.querySelector('[data-gevurah-burn-required]')).not.toBeNull();
  });

  it('enables Roll after staging at least one card burn', () => {
    renderGevurahEncounter({ handSize: 2 });

    // Before staging: Roll is disabled.
    expect(screen.getByRole('button', { name: /^Roll$/ })).toBeDisabled();

    // Stage one card burn via the stepper.
    const incBtn = document.querySelector(
      '[data-stepper="cardBurns"] button:last-of-type',
    ) as HTMLButtonElement;
    act(() => {
      fireEvent.click(incBtn);
    });

    // After staging: Roll is enabled and the hint disappears.
    expect(screen.getByRole('button', { name: /^Roll$/ })).not.toBeDisabled();
    expect(document.querySelector('[data-gevurah-burn-required]')).toBeNull();
  });

  it('does NOT gate Roll when the player has an empty hand (empty-hand waiver)', () => {
    // Engine waiver: `player.hand.length > 0` is part of the gate condition.
    // An empty-handed player can roll without burns.
    renderGevurahEncounter({ handSize: 0 });

    expect(screen.getByRole('button', { name: /^Roll$/ })).not.toBeDisabled();
    expect(document.querySelector('[data-gevurah-burn-required]')).toBeNull();
  });

  it('gates Roll in multiplayer mode at Gevurah just as it does in hot-seat', () => {
    renderGevurahEncounter({ handSize: 2, mode: 'multiplayer' });

    expect(screen.getByRole('button', { name: /^Roll$/ })).toBeDisabled();
    expect(document.querySelector('[data-gevurah-burn-required]')).not.toBeNull();
  });

  it('does NOT gate Roll at a non-Gevurah sefirah even with no burns staged', () => {
    // At Hod (for example), rolling without burns is allowed.
    const base = makeFullGame({ playerCount: 2, seed: 1 });
    const activeIdx = base.players.findIndex((p) => p.id === base.activePlayerId);
    const players = base.players.map((p, idx) =>
      idx === activeIdx ? { ...p, position: 'hod' as const, hand: [0, 1] as readonly number[] } : p,
    );
    const hodState: GameState = {
      ...base,
      players,
      phase: 'challenge',
      challengeSubPhase: 'prep',
      pendingModifiers: EMPTY_PENDING_MODIFIERS,
      lastOutcome: undefined,
      encounter: { sefirah: 'hod', seed: 99, retryCount: 0 },
    };
    const hodContext: ChallengeContext = {
      sefirah: 'hod',
      stat: 10,
      statLabel: 'intellect',
      availableCardBurns: 2,
      availableSparkBurns: 0,
    };
    const rng = seededRng(1);
    const { result } = renderHook(() => useTurn({ initialState: hodState, rng }));
    const player = hodState.players.find((p) => p.id === hodState.activePlayerId);
    render(
      <EncounterScreen
        context={hodContext}
        rng={rng}
        mode="hot-seat"
        turn={result.current}
        onResolved={vi.fn()}
        {...(player ? { player } : {})}
      />,
    );

    expect(screen.getByRole('button', { name: /^Roll$/ })).not.toBeDisabled();
    expect(document.querySelector('[data-gevurah-burn-required]')).toBeNull();
  });

  it('does not block Roll when pendingModifiers already carries burns from a prior retry', () => {
    // After a failed roll at Gevurah, the engine preserves pendingModifiers.cardBurns
    // for the retry. On the next prep entry, cumulativeCardBurns > 0 so the gate
    // must NOT fire — the player already paid. Simulate by seeding the state with
    // cardBurns already populated, which is what the engine leaves after a retry.
    const base = makeGevurahChallengeState({ handSize: 2 });
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
        context={gevurahContext}
        rng={rng}
        mode="hot-seat"
        turn={result.current}
        onResolved={vi.fn()}
        player={player}
      />,
    );

    // Engine already has 1 burn → cumulativeCardBurns = 1 → gate is off.
    expect(screen.getByRole('button', { name: /^Roll$/ })).not.toBeDisabled();
    expect(document.querySelector('[data-gevurah-burn-required]')).toBeNull();
  });
});
