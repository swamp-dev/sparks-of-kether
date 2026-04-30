import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { EncounterScreen } from '../EncounterScreen';
import type { ChallengeContext } from '@/components/challenge/ChallengeModal';
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
