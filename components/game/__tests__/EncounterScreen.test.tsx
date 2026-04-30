import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EncounterScreen } from '../EncounterScreen';
import type { ChallengeContext } from '@/lib/challenge-types';
import { useTurn } from '@/lib/use-turn';
import { seededRng } from '@/engine/rng';
import { makeFullGame, makePlayer } from '@/test/fixtures';
import type { GameState } from '@/engine/types';

/**
 * Tests for EncounterScreen (#228). The component renders three
 * visual sub-states (`prep` / `resolve` / `react`) driven by the
 * engine's `turn.challengeSubPhase`. These tests mount with a real
 * `useTurn` hook so the per-step methods (`prepAddModifier`,
 * `prepConfirm`, `reactRetry`) flow through the engine reducer.
 *
 * The convention — borrowed from the deprecated `ChallengeModal`
 * tests — uses `vi.useFakeTimers` to drive the resolve animation
 * deterministically.
 */

const baseContext: ChallengeContext = {
  sefirah: 'gevurah', // DC 15
  stat: 12,
  statLabel: 'Strength',
  availableAllies: [
    { id: 'ally1', name: 'Bea', stat: 10 },
    { id: 'ally2', name: 'Carla', stat: 8 },
  ],
  availableCardBurns: 3,
  availableSparkBurns: 2,
};

/**
 * Build a `GameState` parked at Gevurah in `'challenge'` phase, in
 * the `'prep'` sub-phase. The active player has a hand of 3 arcana
 * (so card-burn staging has something to consume) and 2 Sparks.
 */
function makeChallengeState(): GameState {
  const base = makeFullGame({ playerCount: 2, seed: 1 });
  const activeIdx = base.players.findIndex(
    (p) => p.id === base.activePlayerId,
  );
  const players = base.players.map((p, idx) =>
    idx === activeIdx
      ? {
          ...p,
          position: 'gevurah' as const,
          hand: [0, 1, 2] as readonly number[],
          sparksHeld: new Set(['chesed', 'tiferet']) as ReadonlySet<
            'chesed' | 'tiferet'
          >,
          // Override the stat so `baseContext.stat` (12) lines up.
          stats: { ...p.stats, strength: 12 },
        }
      : { ...p, position: 'gevurah' as const, stats: { ...p.stats, strength: 10 } },
  );
  return {
    ...base,
    players,
    phase: 'challenge',
    challengeSubPhase: 'prep',
    pendingModifiers: { cardBurns: [], sparkBurns: [], assistRequests: [] },
    lastOutcome: undefined,
  };
}

/**
 * Test wrapper — mounts `useTurn` and `EncounterScreen` together so
 * the component's per-step dispatches flow through a real reducer.
 */
function renderEncounter(opts: {
  readonly mode: 'hot-seat' | 'multiplayer';
  readonly initialState: GameState;
  readonly onResolved?: () => void;
  readonly onCancel?: () => void;
  readonly context?: ChallengeContext;
  readonly seed?: number;
}): {
  readonly turnHook: ReturnType<typeof useTurn>;
  readonly rerender: () => void;
} {
  const rng = seededRng(opts.seed ?? 1);
  const { result, rerender } = renderHook(() =>
    useTurn({ initialState: opts.initialState, rng }),
  );
  const player = opts.initialState.players.find(
    (p) => p.id === opts.initialState.activePlayerId,
  );
  // EncounterScreenProps is a discriminated union on `mode` —
  // multiplayer requires `player`, hot-seat treats it as optional.
  // Branch the JSX so TS narrows correctly without us asserting.
  const Wrapper = (): JSX.Element => {
    if (opts.mode === 'multiplayer') {
      if (!player) {
        throw new Error(
          'renderEncounter (multiplayer): initialState must have an active player',
        );
      }
      return (
        <EncounterScreen
          context={opts.context ?? baseContext}
          rng={rng}
          mode="multiplayer"
          turn={result.current}
          onResolved={opts.onResolved ?? ((): void => undefined)}
          {...(opts.onCancel ? { onCancel: opts.onCancel } : {})}
          player={player}
        />
      );
    }
    return (
      <EncounterScreen
        context={opts.context ?? baseContext}
        rng={rng}
        mode="hot-seat"
        turn={result.current}
        onResolved={opts.onResolved ?? ((): void => undefined)}
        {...(opts.onCancel ? { onCancel: opts.onCancel } : {})}
        {...(player ? { player } : {})}
      />
    );
  };
  const view = render(<Wrapper />);
  return {
    turnHook: result.current,
    rerender: () => {
      rerender();
      view.rerender(<Wrapper />);
    },
  };
}

describe('EncounterScreen — sub-state rendering', () => {
  it('renders prep sub-state when challengeSubPhase is "prep"', () => {
    renderEncounter({
      mode: 'hot-seat',
      initialState: makeChallengeState(),
    });
    const screenEl = document.querySelector('[data-encounter-screen]');
    expect(screenEl?.getAttribute('data-encounter-sub-phase')).toBe('prep');
    expect(document.querySelector('[data-encounter-prep]')).not.toBeNull();
  });

  it('exposes the Roll button in prep', () => {
    renderEncounter({
      mode: 'hot-seat',
      initialState: makeChallengeState(),
    });
    expect(screen.getByRole('button', { name: /^Roll$/ })).toBeInTheDocument();
  });

  it('renders modifier-staging affordances in prep', () => {
    renderEncounter({
      mode: 'hot-seat',
      initialState: makeChallengeState(),
    });
    expect(document.querySelector('[data-stepper="cardBurns"]')).not.toBeNull();
    expect(document.querySelector('[data-stepper="sparkBurns"]')).not.toBeNull();
    expect(document.querySelector('[data-modifier="assist"]')).not.toBeNull();
  });
});

describe('EncounterScreen — multiplayer staging', () => {
  it('clicking "Add card-burn" stepper dispatches prepAddModifier', () => {
    const state = makeChallengeState();
    const rng = seededRng(1);
    const { result } = renderHook(() =>
      useTurn({ initialState: state, rng }),
    );
    const player = state.players.find((p) => p.id === state.activePlayerId);
    if (!player) throw new Error('test setup: active player missing');
    const view = render(
      <EncounterScreen
        context={baseContext}
        rng={rng}
        mode="multiplayer"
        turn={result.current}
        onResolved={vi.fn()}
        player={player}
      />,
    );
    expect(result.current.pendingModifiers?.cardBurns).toEqual([]);
    const incBtn = document.querySelector(
      '[data-stepper="cardBurns"] button:last-of-type',
    ) as HTMLButtonElement;
    act(() => {
      fireEvent.click(incBtn);
    });
    // Reducer should have appended the head-of-hand arcanum (0).
    expect(result.current.pendingModifiers?.cardBurns.length).toBe(1);
    view.unmount();
  });

  it('toggling an ally checkbox dispatches assist-request in multiplayer mode', () => {
    const state = makeChallengeState();
    const rng = seededRng(1);
    const { result } = renderHook(() =>
      useTurn({ initialState: state, rng }),
    );
    const player = state.players.find((p) => p.id === state.activePlayerId);
    if (!player) throw new Error('test setup: active player missing');
    render(
      <EncounterScreen
        context={baseContext}
        rng={rng}
        mode="multiplayer"
        turn={result.current}
        onResolved={vi.fn()}
        player={player}
      />,
    );
    const ally1 = document.querySelector(
      '[data-ally="ally1"] input',
    ) as HTMLInputElement;
    act(() => {
      fireEvent.click(ally1);
    });
    expect(result.current.pendingModifiers?.assistRequests).toContain('ally1');
  });

  it('shows the "ally is offering" indicator only in multiplayer mode', () => {
    const state = makeChallengeState();
    const rng = seededRng(1);
    const { result } = renderHook(() =>
      useTurn({ initialState: state, rng }),
    );
    const player = state.players.find((p) => p.id === state.activePlayerId);
    if (!player) throw new Error('test setup: active player missing');
    render(
      <EncounterScreen
        context={baseContext}
        rng={rng}
        mode="multiplayer"
        turn={result.current}
        onResolved={vi.fn()}
        player={player}
      />,
    );
    const ally1 = document.querySelector(
      '[data-ally="ally1"] input',
    ) as HTMLInputElement;
    act(() => {
      fireEvent.click(ally1);
    });
    expect(document.querySelector('[data-ally-offering]')).not.toBeNull();
  });

  it('does not render "ally is offering" indicator in hot-seat mode', () => {
    renderEncounter({
      mode: 'hot-seat',
      initialState: makeChallengeState(),
    });
    const ally1 = document.querySelector(
      '[data-ally="ally1"] input',
    ) as HTMLInputElement;
    act(() => {
      fireEvent.click(ally1);
    });
    expect(document.querySelector('[data-ally-offering]')).toBeNull();
  });
});

describe('EncounterScreen — resolve sub-state', () => {
  it('renders resolve animation with aria-live="polite" after Roll', () => {
    vi.useFakeTimers();
    try {
      const state = makeChallengeState();
      const rng = seededRng(1);
      const { result, rerender } = renderHook(() =>
        useTurn({ initialState: state, rng }),
      );
      const Wrapper = (): JSX.Element => (
        <EncounterScreen
          context={{ ...baseContext, stat: 18 }}
          rng={rng}
          mode="hot-seat"
          turn={result.current}
          onResolved={vi.fn()}
        />
      );
      const view = render(<Wrapper />);
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /^Roll$/ }));
      });
      rerender();
      view.rerender(<Wrapper />);
      const screenEl = document.querySelector('[data-encounter-screen]');
      expect(screenEl?.getAttribute('data-encounter-sub-phase')).toBe(
        'resolve',
      );
      const status = document.querySelector(
        '[data-encounter-resolve-status]',
      );
      expect(status?.getAttribute('aria-live')).toBe('polite');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('EncounterScreen — react sub-state (pass)', () => {
  it('renders Continue button after a passing roll', () => {
    vi.useFakeTimers();
    try {
      const state = makeChallengeState();
      const rng = seededRng(1);
      const { result, rerender } = renderHook(() =>
        useTurn({ initialState: state, rng }),
      );
      const Wrapper = (): JSX.Element => (
        <EncounterScreen
          // Stat 18 against DC 15 — even d20=1 passes.
          context={{ ...baseContext, stat: 18, availableAllies: [] }}
          rng={rng}
          mode="hot-seat"
          turn={result.current}
          onResolved={vi.fn()}
        />
      );
      const view = render(<Wrapper />);
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /^Roll$/ }));
      });
      act(() => {
        vi.advanceTimersByTime(800);
      });
      rerender();
      view.rerender(<Wrapper />);
      expect(
        screen.getByRole('button', { name: /^Continue$/ }),
      ).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('clicking Continue fires onResolved with pass=true', () => {
    vi.useFakeTimers();
    try {
      const state = makeChallengeState();
      const rng = seededRng(1);
      const onResolved = vi.fn();
      const { result, rerender } = renderHook(() =>
        useTurn({ initialState: state, rng }),
      );
      const Wrapper = (): JSX.Element => (
        <EncounterScreen
          context={{ ...baseContext, stat: 18, availableAllies: [] }}
          rng={rng}
          mode="hot-seat"
          turn={result.current}
          onResolved={onResolved}
        />
      );
      const view = render(<Wrapper />);
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /^Roll$/ }));
      });
      act(() => {
        vi.advanceTimersByTime(800);
      });
      rerender();
      view.rerender(<Wrapper />);
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /^Continue$/ }));
      });
      expect(onResolved).toHaveBeenCalledTimes(1);
      const arg = onResolved.mock.calls[0]?.[0];
      expect(arg?.pass).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('EncounterScreen — react sub-state (fail)', () => {
  it('renders Retry and Accept setback buttons after a failed roll', () => {
    vi.useFakeTimers();
    try {
      const state = makeChallengeState();
      const rng = seededRng(1);
      const { result, rerender } = renderHook(() =>
        useTurn({ initialState: state, rng }),
      );
      const Wrapper = (): JSX.Element => (
        <EncounterScreen
          // Stat 1 vs DC 15 — guaranteed fail.
          context={{ ...baseContext, stat: 1, availableAllies: [] }}
          rng={rng}
          mode="hot-seat"
          turn={result.current}
          onResolved={vi.fn()}
        />
      );
      const view = render(<Wrapper />);
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /^Roll$/ }));
      });
      act(() => {
        vi.advanceTimersByTime(800);
      });
      rerender();
      view.rerender(<Wrapper />);
      expect(
        document.querySelector('[data-fail-choice="retry"]'),
      ).not.toBeNull();
      expect(
        document.querySelector('[data-fail-choice="accept"]'),
      ).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('clicking Retry dispatches reactRetry and returns to prep sub-state', () => {
    vi.useFakeTimers();
    try {
      const state = makeChallengeState();
      const rng = seededRng(1);
      const onResolved = vi.fn();
      const { result, rerender } = renderHook(() =>
        useTurn({ initialState: state, rng }),
      );
      const player = state.players.find(
        (p) => p.id === state.activePlayerId,
      );
      const Wrapper = (): JSX.Element => (
        <EncounterScreen
          context={{ ...baseContext, stat: 1, availableAllies: [] }}
          rng={rng}
          mode="hot-seat"
          turn={result.current}
          onResolved={onResolved}
          {...(player ? { player } : {})}
        />
      );
      const view = render(<Wrapper />);
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /^Roll$/ }));
      });
      act(() => {
        vi.advanceTimersByTime(800);
      });
      rerender();
      view.rerender(<Wrapper />);
      act(() => {
        fireEvent.click(
          document.querySelector(
            '[data-fail-choice="retry"]',
          ) as HTMLButtonElement,
        );
      });
      // After retry, engine sub-phase loops back to 'prep'.
      expect(result.current.challengeSubPhase).toBe('prep');
      // onResolved is NOT fired on retry — encounter stays open.
      expect(onResolved).not.toHaveBeenCalled();
      rerender();
      view.rerender(<Wrapper />);
      const screenEl = document.querySelector('[data-encounter-screen]');
      expect(screenEl?.getAttribute('data-encounter-sub-phase')).toBe('prep');
    } finally {
      vi.useRealTimers();
    }
  });

  it('clicking Accept setback fires onResolved with choice="accept"', () => {
    vi.useFakeTimers();
    try {
      const state = makeChallengeState();
      const rng = seededRng(1);
      const onResolved = vi.fn();
      const { result, rerender } = renderHook(() =>
        useTurn({ initialState: state, rng }),
      );
      const Wrapper = (): JSX.Element => (
        <EncounterScreen
          context={{ ...baseContext, stat: 1, availableAllies: [] }}
          rng={rng}
          mode="hot-seat"
          turn={result.current}
          onResolved={onResolved}
        />
      );
      const view = render(<Wrapper />);
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /^Roll$/ }));
      });
      act(() => {
        vi.advanceTimersByTime(800);
      });
      rerender();
      view.rerender(<Wrapper />);
      act(() => {
        fireEvent.click(
          document.querySelector(
            '[data-fail-choice="accept"]',
          ) as HTMLButtonElement,
        );
      });
      expect(onResolved).toHaveBeenCalledTimes(1);
      const arg = onResolved.mock.calls[0]?.[0];
      expect(arg?.pass).toBe(false);
      expect(arg?.choice).toBe('accept');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('EncounterScreen — accessibility', () => {
  it('uses role=dialog with aria-labelledby pointing at the title', () => {
    renderEncounter({
      mode: 'hot-seat',
      initialState: makeChallengeState(),
    });
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    const titleId = dialog?.getAttribute('aria-labelledby');
    expect(titleId).toBeTruthy();
    if (titleId) {
      expect(document.getElementById(titleId)).not.toBeNull();
    }
  });

  it('Roll button is reachable as a real <button>', () => {
    renderEncounter({
      mode: 'hot-seat',
      initialState: makeChallengeState(),
    });
    const roll = screen.getByRole('button', { name: /^Roll$/ });
    expect(roll.tagName.toLowerCase()).toBe('button');
    expect(roll.getAttribute('type')).toBe('button');
  });
});

describe('EncounterScreen — keyboard tab order (#283)', () => {
  /**
   * Pin the keyboard reachability of the panel-defining buttons:
   * prep's Roll, react-pass's Continue, react-fail's Retry / Accept
   * setback. Native `<button>` inherits this from the platform, but
   * a future refactor that swaps any of these for `<div onClick>`
   * would silently break keyboard users — and axe alone won't catch
   * a `<div role="button">` without a tabindex either, depending on
   * how it's structured. This test pins the contract.
   *
   * We assert two things per button:
   *   - it lives inside the encounter screen (so `Tab` from elsewhere
   *     in the dialog reaches it as the document walks the tree);
   *   - it is a real `<button>` element (so `Enter` / `Space` activate
   *     it without us wiring custom keyboard handlers).
   *
   * `tabIndex` on a real `<button>` defaults to 0 and is implicit; the
   * regression we're guarding against would surface as either a non-
   * button tag or an explicit `tabIndex={-1}` that pulls it out of
   * the tab cycle. We assert both directly.
   */
  function getInteractiveOrder(root: ParentNode): readonly HTMLElement[] {
    // Mirror the browser's tab order for native interactives: walk the
    // DOM in document order, keep elements that are interactive by
    // default and not explicitly removed via tabindex=-1 / disabled.
    const candidates = Array.from(
      root.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href]'),
    );
    return candidates.filter((el) => {
      if (el.hasAttribute('disabled')) return false;
      const ti = el.getAttribute('tabindex');
      if (ti !== null && Number(ti) < 0) return false;
      return true;
    });
  }

  it('prep sub-state: Roll button is a real <button>, in document order, in the tab cycle', () => {
    renderEncounter({
      mode: 'hot-seat',
      initialState: makeChallengeState(),
    });
    const screenEl = document.querySelector(
      '[data-encounter-screen]',
    ) as HTMLElement | null;
    expect(screenEl).not.toBeNull();
    if (screenEl === null) return;
    const order = getInteractiveOrder(screenEl);
    const roll = screen.getByRole('button', { name: /^Roll$/ });
    // Roll is a real <button> (not a <div onClick>). This is the
    // regression the ticket explicitly calls out.
    expect(roll.tagName.toLowerCase()).toBe('button');
    // tabindex not negative (default 0 is fine; explicit non-negative
    // is fine; -1 would pull Roll out of the tab cycle).
    const ti = roll.getAttribute('tabindex');
    if (ti !== null) {
      expect(Number(ti)).toBeGreaterThanOrEqual(0);
    }
    // Roll appears in document order alongside the other interactive
    // affordances (steppers, ally checkboxes). The exact index depends
    // on the prep panel's contents, but Roll must be present.
    expect(order).toContain(roll);
  });

  it('react sub-state (pass): Continue button is a real <button> in the tab cycle, after the prep flow', () => {
    vi.useFakeTimers();
    try {
      const state = makeChallengeState();
      const rng = seededRng(1);
      const { result, rerender } = renderHook(() =>
        useTurn({ initialState: state, rng }),
      );
      const Wrapper = (): JSX.Element => (
        <EncounterScreen
          // Stat 18 vs DC 15 — guaranteed pass so we land on the
          // Continue button rather than the fail-choice pair.
          context={{ ...baseContext, stat: 18, availableAllies: [] }}
          rng={rng}
          mode="hot-seat"
          turn={result.current}
          onResolved={vi.fn()}
        />
      );
      const view = render(<Wrapper />);
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /^Roll$/ }));
      });
      act(() => {
        vi.advanceTimersByTime(800);
      });
      rerender();
      view.rerender(<Wrapper />);
      const continueBtn = screen.getByRole('button', { name: /^Continue$/ });
      expect(continueBtn.tagName.toLowerCase()).toBe('button');
      const ti = continueBtn.getAttribute('tabindex');
      if (ti !== null) {
        expect(Number(ti)).toBeGreaterThanOrEqual(0);
      }
      const screenEl = document.querySelector(
        '[data-encounter-screen]',
      ) as HTMLElement | null;
      expect(screenEl).not.toBeNull();
      if (screenEl === null) return;
      const order = getInteractiveOrder(screenEl);
      expect(order).toContain(continueBtn);
    } finally {
      vi.useRealTimers();
    }
  });

  it('react sub-state (fail): Retry and Accept buttons are real <button>s in the tab cycle, in document order', () => {
    vi.useFakeTimers();
    try {
      const state = makeChallengeState();
      const rng = seededRng(1);
      const { result, rerender } = renderHook(() =>
        useTurn({ initialState: state, rng }),
      );
      const Wrapper = (): JSX.Element => (
        <EncounterScreen
          // Stat 1 vs DC 15 — guaranteed fail so we land on Retry /
          // Accept setback rather than Continue.
          context={{ ...baseContext, stat: 1, availableAllies: [] }}
          rng={rng}
          mode="hot-seat"
          turn={result.current}
          onResolved={vi.fn()}
        />
      );
      const view = render(<Wrapper />);
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /^Roll$/ }));
      });
      act(() => {
        vi.advanceTimersByTime(800);
      });
      rerender();
      view.rerender(<Wrapper />);
      const retry = document.querySelector(
        '[data-fail-choice="retry"]',
      ) as HTMLButtonElement | null;
      const accept = document.querySelector(
        '[data-fail-choice="accept"]',
      ) as HTMLButtonElement | null;
      expect(retry).not.toBeNull();
      expect(accept).not.toBeNull();
      if (retry === null || accept === null) return;
      // Both choice affordances are real <button>s.
      expect(retry.tagName.toLowerCase()).toBe('button');
      expect(accept.tagName.toLowerCase()).toBe('button');
      // Neither has tabindex=-1.
      for (const el of [retry, accept]) {
        const ti = el.getAttribute('tabindex');
        if (ti !== null) {
          expect(Number(ti)).toBeGreaterThanOrEqual(0);
        }
      }
      const screenEl = document.querySelector(
        '[data-encounter-screen]',
      ) as HTMLElement | null;
      expect(screenEl).not.toBeNull();
      if (screenEl === null) return;
      const order = getInteractiveOrder(screenEl);
      // Retry comes before Accept in document order — pinning this
      // matches the rendered "Burn another card to retry" / "Accept
      // setback" left-to-right read.
      const retryIdx = order.indexOf(retry);
      const acceptIdx = order.indexOf(accept);
      expect(retryIdx).toBeGreaterThanOrEqual(0);
      expect(acceptIdx).toBeGreaterThan(retryIdx);
    } finally {
      vi.useRealTimers();
    }
  });

  it('react sub-state (pass): pressing Enter on the focused Continue button activates it', async () => {
    vi.useFakeTimers();
    try {
      const state = makeChallengeState();
      const rng = seededRng(1);
      const onResolved = vi.fn();
      const { result, rerender } = renderHook(() =>
        useTurn({ initialState: state, rng }),
      );
      const Wrapper = (): JSX.Element => (
        <EncounterScreen
          context={{ ...baseContext, stat: 18, availableAllies: [] }}
          rng={rng}
          mode="hot-seat"
          turn={result.current}
          onResolved={onResolved}
        />
      );
      const view = render(<Wrapper />);
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /^Roll$/ }));
      });
      act(() => {
        vi.advanceTimersByTime(800);
      });
      rerender();
      view.rerender(<Wrapper />);
      const continueBtn = screen.getByRole('button', { name: /^Continue$/ });
      // Switch to real timers before driving userEvent — its
      // keyboard helper schedules on real Promise microtasks and
      // hangs under `vi.useFakeTimers`. The resolve animation has
      // already been advanced past at this point, so the rest of
      // the test no longer needs the fake clock.
      vi.useRealTimers();
      // Press Enter on the focused Continue button via userEvent.
      // The original version of this test called `fireEvent.click`
      // with a comment claiming jsdom synthesizes click from Enter
      // on native buttons — it does not. `userEvent.keyboard`
      // models that browser behaviour faithfully (keydown → click
      // on Enter for activatable elements), so this is the keyboard
      // path the test name promises.
      const user = userEvent.setup();
      continueBtn.focus();
      await user.keyboard('{Enter}');
      expect(onResolved).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('EncounterScreen — non-check Sefirot (Malkuth, Kether)', () => {
  it('throws on Malkuth construction', () => {
    const orig = console.error;
    console.error = (..._args: unknown[]): void => undefined;
    try {
      const state = makeChallengeState();
      const rng = seededRng(1);
      const { result } = renderHook(() =>
        useTurn({ initialState: state, rng }),
      );
      expect(() =>
        render(
          <EncounterScreen
            context={{ ...baseContext, sefirah: 'malkuth' }}
            rng={rng}
            mode="hot-seat"
            turn={result.current}
            onResolved={vi.fn()}
          />,
        ),
      ).toThrow(/no stat check/);
    } finally {
      console.error = orig;
    }
  });
});

describe('EncounterScreen — embedded stat sheet', () => {
  it('renders compact stat sheet when player is supplied', () => {
    const state = makeChallengeState();
    const rng = seededRng(1);
    const { result } = renderHook(() =>
      useTurn({ initialState: state, rng }),
    );
    const player = makePlayer({
      id: state.activePlayerId,
      name: 'Andy',
      position: 'gevurah',
    });
    render(
      <EncounterScreen
        context={baseContext}
        rng={rng}
        mode="hot-seat"
        turn={result.current}
        onResolved={vi.fn()}
        player={player}
      />,
    );
    const sheet = document.querySelector('[data-stat-sheet]');
    expect(sheet).not.toBeNull();
    expect(sheet?.getAttribute('data-mode')).toBe('compact');
  });

  it('omits stat sheet when player is not supplied', () => {
    const state = makeChallengeState();
    const rng = seededRng(1);
    const { result } = renderHook(() =>
      useTurn({ initialState: state, rng }),
    );
    render(
      <EncounterScreen
        context={baseContext}
        rng={rng}
        mode="hot-seat"
        turn={result.current}
        onResolved={vi.fn()}
      />,
    );
    expect(document.querySelector('[data-stat-sheet]')).toBeNull();
  });
});

describe('EncounterScreen — Soul Door callout', () => {
  it('renders verbatim callout when soulDoorDelta is -2', () => {
    const state = makeChallengeState();
    const rng = seededRng(1);
    const { result } = renderHook(() =>
      useTurn({ initialState: state, rng }),
    );
    render(
      <EncounterScreen
        context={{ ...baseContext, soulDoorDelta: -2 }}
        rng={rng}
        mode="hot-seat"
        turn={result.current}
        onResolved={vi.fn()}
      />,
    );
    const callout = document.querySelector('[data-soul-door]');
    expect(callout).not.toBeNull();
    // Per design/soul-doors.md § 6: "DC X → X−2" template.
    expect(callout?.textContent).toBe('Soul Door open here: DC 15 → 13');
  });
});

describe('EncounterScreen — cumulative card-burn display', () => {
  it('shows "X cards burned, +Y modifier" after a failed retry', () => {
    vi.useFakeTimers();
    try {
      // Construct a state already in 'prep' with a preserved
      // pendingModifiers (simulating a post-failed-roll retry).
      const base = makeChallengeState();
      const stateWithPending: GameState = {
        ...base,
        pendingModifiers: {
          cardBurns: [0, 1],
          sparkBurns: [],
          assistRequests: [],
        },
      };
      const rng = seededRng(1);
      const { result } = renderHook(() =>
        useTurn({ initialState: stateWithPending, rng }),
      );
      render(
        <EncounterScreen
          context={baseContext}
          rng={rng}
          mode="hot-seat"
          turn={result.current}
          onResolved={vi.fn()}
        />,
      );
      const cumulative = document.querySelector('[data-cumulative-burns]');
      expect(cumulative).not.toBeNull();
      // 2 cards × 3 = +6 modifier.
      expect(cumulative?.textContent).toMatch(/2 cards burned/);
      expect(cumulative?.textContent).toMatch(/\+6/);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('EncounterScreen — prefers-reduced-motion respect', () => {
  /**
   * Code-review fix (E3, #228): the 800ms `setTimeout` that gates the
   * resolve→react sub-state transition fired unconditionally, leaving
   * players with `prefers-reduced-motion: reduce` stuck on a static
   * "Rolling…" screen for 800ms with no visible animation. The fix
   * checks `window.matchMedia('(prefers-reduced-motion: reduce)')` at
   * Roll time and uses a near-zero (50ms) delay so motion-sensitive
   * users see the result immediately. Mirrors `D20Roll`'s no-animation
   * branch.
   */
  function withReducedMotion(reduce: boolean): () => void {
    const original = window.matchMedia;
    window.matchMedia = ((query: string): MediaQueryList => {
      const matches = reduce && query === '(prefers-reduced-motion: reduce)';
      return {
        matches,
        media: query,
        onchange: null,
        addListener: (): void => undefined,
        removeListener: (): void => undefined,
        addEventListener: (): void => undefined,
        removeEventListener: (): void => undefined,
        dispatchEvent: (): boolean => false,
      } as unknown as MediaQueryList;
    }) as typeof window.matchMedia;
    return (): void => {
      window.matchMedia = original;
    };
  }

  it('flips to react sub-state within one tick when prefers-reduced-motion is reduce', () => {
    vi.useFakeTimers();
    const restore = withReducedMotion(true);
    try {
      const state = makeChallengeState();
      const rng = seededRng(1);
      const { result, rerender } = renderHook(() =>
        useTurn({ initialState: state, rng }),
      );
      const Wrapper = (): JSX.Element => (
        <EncounterScreen
          context={{ ...baseContext, stat: 18 }}
          rng={rng}
          mode="hot-seat"
          turn={result.current}
          onResolved={vi.fn()}
        />
      );
      const view = render(<Wrapper />);
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /^Roll$/ }));
      });
      // Advance past the reduced-motion delay (50ms) but well short of
      // the standard 800ms — only a reduced-motion-aware setTimeout
      // can fire here.
      act(() => {
        vi.advanceTimersByTime(60);
      });
      rerender();
      view.rerender(<Wrapper />);
      const screenEl = document.querySelector('[data-encounter-screen]');
      expect(screenEl?.getAttribute('data-encounter-sub-phase')).toBe(
        'react',
      );
    } finally {
      vi.useRealTimers();
      restore();
    }
  });

  it('keeps the 800ms delay when prefers-reduced-motion is not set', () => {
    // Control: confirm that without reduced-motion, the resolve sub-
    // state is still visible at 60ms (i.e. we didn't accidentally
    // shorten the animation for everyone).
    vi.useFakeTimers();
    const restore = withReducedMotion(false);
    try {
      const state = makeChallengeState();
      const rng = seededRng(1);
      const { result, rerender } = renderHook(() =>
        useTurn({ initialState: state, rng }),
      );
      const Wrapper = (): JSX.Element => (
        <EncounterScreen
          context={{ ...baseContext, stat: 18 }}
          rng={rng}
          mode="hot-seat"
          turn={result.current}
          onResolved={vi.fn()}
        />
      );
      const view = render(<Wrapper />);
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /^Roll$/ }));
      });
      act(() => {
        vi.advanceTimersByTime(60);
      });
      rerender();
      view.rerender(<Wrapper />);
      const screenEl = document.querySelector('[data-encounter-screen]');
      // Engine moved to react synchronously inside prep-confirm, but
      // the UI lag flag keeps uiSubPhase at 'resolve' during the
      // animation window.
      expect(screenEl?.getAttribute('data-encounter-sub-phase')).toBe(
        'resolve',
      );
    } finally {
      vi.useRealTimers();
      restore();
    }
  });
});

/**
 * Avatar verdict + player-response copy (#277). The parent
 * EncounterScreen picks a variant via the seeded rng and stores it
 * in component state; PrepPanel renders the player-response above
 * the Roll button (`[data-player-response]`) and ReactPanel renders
 * the avatar's verdict in `[data-avatar-verdict]` with the avatar
 * name in `[data-avatar-name]`.
 *
 * Pinning data → DOM mapping for 3 Sefirot × 3 signs (Hermes/Hod ×
 * Aries pass; Aphrodite/Netzach × Pisces pass; Ares/Gevurah ×
 * Capricorn fail). A custom rng that always returns the lower bound
 * makes the picker pick variant 0, which we can pin against the
 * data file.
 */
describe('EncounterScreen — avatar verdict + player-response (#277)', () => {
  // Custom rng that always picks variant 0 from any range, but
  // returns 20 for d20 calls (so the pre-roll passes with stat 18).
  // The picker uses `int(0, length-1)`; rollCheck uses `d20()`.
  function makePinningRng(d20: number): {
    int: (min: number, max: number) => number;
    d20: () => number;
  } {
    return {
      int: (min: number, _max: number): number => min,
      d20: (): number => d20,
    };
  }

  it('renders Hermes verdict for Hod × Aries pass', () => {
    vi.useFakeTimers();
    try {
      const state = makeChallengeState();
      const rng = makePinningRng(20);
      const { result, rerender } = renderHook(() =>
        useTurn({ initialState: state, rng }),
      );
      const Wrapper = (): JSX.Element => (
        <EncounterScreen
          context={{
            sefirah: 'hod',
            stat: 18,
            statLabel: 'Intellect',
            availableAllies: [],
            availableCardBurns: 0,
            availableSparkBurns: 0,
            playerSign: 'aries',
          }}
          rng={rng}
          mode="hot-seat"
          turn={result.current}
          onResolved={vi.fn()}
        />
      );
      const view = render(<Wrapper />);
      // Player-response renders in prep, picked from variant 0.
      const prepResponse = document.querySelector('[data-player-response]');
      expect(prepResponse?.textContent).toContain(
        "Just say what you mean, messenger.",
      );

      // Roll → resolve animation → react reveal.
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /^Roll$/ }));
      });
      act(() => {
        vi.advanceTimersByTime(800);
      });
      rerender();
      view.rerender(<Wrapper />);

      const verdict = document.querySelector('[data-avatar-verdict]');
      const avatarName = document.querySelector('[data-avatar-name]');
      expect(avatarName?.textContent).toBe('Hermes:');
      expect(verdict?.textContent).toContain(
        "You charged the answer like a ram",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders Aphrodite verdict for Netzach × Pisces pass', () => {
    vi.useFakeTimers();
    try {
      const base = makeFullGame({ playerCount: 2, seed: 1 });
      const activeIdx = base.players.findIndex(
        (p) => p.id === base.activePlayerId,
      );
      const players = base.players.map((p, idx) =>
        idx === activeIdx
          ? { ...p, position: 'netzach' as const, stats: { ...p.stats, passion: 18 } }
          : p,
      );
      const state: GameState = {
        ...base,
        players,
        phase: 'challenge',
        challengeSubPhase: 'prep',
        pendingModifiers: { cardBurns: [], sparkBurns: [], assistRequests: [] },
        lastOutcome: undefined,
      };
      const rng = makePinningRng(20);
      const { result, rerender } = renderHook(() =>
        useTurn({ initialState: state, rng }),
      );
      const Wrapper = (): JSX.Element => (
        <EncounterScreen
          context={{
            sefirah: 'netzach',
            stat: 18,
            statLabel: 'Passion',
            availableAllies: [],
            availableCardBurns: 0,
            availableSparkBurns: 0,
            playerSign: 'pisces',
          }}
          rng={rng}
          mode="hot-seat"
          turn={result.current}
          onResolved={vi.fn()}
        />
      );
      const view = render(<Wrapper />);
      const prepResponse = document.querySelector('[data-player-response]');
      expect(prepResponse?.textContent).toContain(
        "I'm in the want already, Aphrodite.",
      );

      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /^Roll$/ }));
      });
      act(() => {
        vi.advanceTimersByTime(800);
      });
      rerender();
      view.rerender(<Wrapper />);

      const verdict = document.querySelector('[data-avatar-verdict]');
      const avatarName = document.querySelector('[data-avatar-name]');
      expect(avatarName?.textContent).toBe('Aphrodite:');
      expect(verdict?.textContent).toContain(
        "You let the want come through you",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders Ares fail verdict for Gevurah × Capricorn fail', () => {
    vi.useFakeTimers();
    try {
      const state = makeChallengeState();
      const rng = makePinningRng(1);
      const { result, rerender } = renderHook(() =>
        useTurn({ initialState: state, rng }),
      );
      const Wrapper = (): JSX.Element => (
        <EncounterScreen
          // Stat 1 vs DC 15 — guaranteed fail.
          context={{
            sefirah: 'gevurah',
            stat: 1,
            statLabel: 'Strength',
            availableAllies: [],
            availableCardBurns: 0,
            availableSparkBurns: 0,
            playerSign: 'capricorn',
          }}
          rng={rng}
          mode="hot-seat"
          turn={result.current}
          onResolved={vi.fn()}
        />
      );
      const view = render(<Wrapper />);
      const prepResponse = document.querySelector('[data-player-response]');
      expect(prepResponse?.textContent).toContain(
        "Give me the spec, Ares.",
      );

      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /^Roll$/ }));
      });
      act(() => {
        vi.advanceTimersByTime(800);
      });
      rerender();
      view.rerender(<Wrapper />);

      const verdict = document.querySelector('[data-avatar-verdict]');
      const avatarName = document.querySelector('[data-avatar-name]');
      expect(avatarName?.textContent).toBe('Ares:');
      expect(verdict?.textContent).toContain(
        "You planned the discipline.",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('preserves player-response text across react-retry (#277 review-driven)', () => {
    // The player-response is picked once via lazy useState initializer
    // with no setter — it must NOT re-pick when the engine loops back
    // to prep on retry. Only the avatar verdict re-picks (a fresh roll
    // gets a fresh verdict). Pinning this design-by-construction
    // guarantee so a future refactor that adds a setter would surface.
    vi.useFakeTimers();
    try {
      const state = makeChallengeState();
      const rng = makePinningRng(1); // d20=1 → fail
      const { result, rerender } = renderHook(() =>
        useTurn({ initialState: state, rng }),
      );
      const Wrapper = (): JSX.Element => (
        <EncounterScreen
          context={{
            sefirah: 'gevurah',
            stat: 1,
            statLabel: 'Strength',
            availableAllies: [],
            availableCardBurns: 0,
            availableSparkBurns: 0,
            playerSign: 'capricorn',
          }}
          rng={rng}
          mode="hot-seat"
          turn={result.current}
          onResolved={vi.fn()}
        />
      );
      const view = render(<Wrapper />);
      const responseBefore = document
        .querySelector('[data-player-response]')
        ?.textContent?.trim();
      expect(responseBefore).toBeTruthy();

      // Roll → fail → react sub-state.
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /^Roll$/ }));
      });
      act(() => {
        vi.advanceTimersByTime(800);
      });
      rerender();
      view.rerender(<Wrapper />);

      // Click Retry → engine goes react → prep.
      const retryBtn = document.querySelector('[data-fail-choice="retry"]');
      if (!(retryBtn instanceof HTMLButtonElement)) {
        throw new Error('expected retry button to be present');
      }
      act(() => {
        fireEvent.click(retryBtn);
      });
      rerender();
      view.rerender(<Wrapper />);

      const responseAfter = document
        .querySelector('[data-player-response]')
        ?.textContent?.trim();
      expect(responseAfter).toBe(responseBefore);
    } finally {
      vi.useRealTimers();
    }
  });

  it('falls back to placeholder when context has no playerSign', () => {
    vi.useFakeTimers();
    try {
      const state = makeChallengeState();
      const rng = seededRng(1);
      const { result, rerender } = renderHook(() =>
        useTurn({ initialState: state, rng }),
      );
      const Wrapper = (): JSX.Element => (
        <EncounterScreen
          // No playerSign — demo / test harness path.
          context={{ ...baseContext, stat: 18, availableAllies: [] }}
          rng={rng}
          mode="hot-seat"
          turn={result.current}
          onResolved={vi.fn()}
        />
      );
      const view = render(<Wrapper />);
      // No player-response in prep when sign is absent.
      expect(document.querySelector('[data-player-response]')).toBeNull();

      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /^Roll$/ }));
      });
      act(() => {
        vi.advanceTimersByTime(800);
      });
      rerender();
      view.rerender(<Wrapper />);

      const verdict = document.querySelector('[data-avatar-verdict]');
      expect(verdict?.textContent).toBe('The Sefirah responds.');
      expect(document.querySelector('[data-avatar-name]')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
