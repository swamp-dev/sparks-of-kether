import { describe, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook } from '@testing-library/react';
import { axe } from 'vitest-axe';
import type { AxeResults } from 'axe-core';
import { TreeBoard } from '@/components/tree/TreeBoard';
import { Hand } from '@/components/hand/Hand';
import { StatSheet } from '@/components/player/StatSheet';
import { TeamMeters } from '@/components/meters/TeamMeters';
import { ShellPanel } from '@/components/shells/ShellPanel';
import { ChallengeModal } from '@/components/challenge/ChallengeModal';
import { EncounterScreen } from '@/components/game/EncounterScreen';
import { useTurn } from '@/lib/use-turn';
import { BlessingRitual } from '@/components/setup/BlessingRitual';
import { ZodiacSignPicker } from '@/components/setup/ZodiacSignPicker';
import { Lobby } from '@/components/setup/Lobby';
import { makeFullGame, makePlayer, makeState } from '@/test/fixtures';
import { seededRng } from '@/engine/rng';
import { EMPTY_PENDING_MODIFIERS } from '@/engine/types';

// `next/navigation`'s `useRouter` is consumed by `HomeRoomForms`,
// which lands inside the home-page tests below. Mock it at file
// scope so a render of <HomePage /> doesn't crash when the expanded
// portal panel mounts.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

// vitest-axe's `extend-expect` ships an empty file in 0.1.0 and the
// matcher pattern fights vitest 4's expect-context lifecycle. Assert
// on `axe(...).violations` directly instead — same coverage, simpler
// surface, no global matcher registration required.
function expectNoViolations(results: AxeResults): void {
  if (results.violations.length === 0) return;
  const summary = results.violations
    .map((v) => `  - [${v.id}] ${v.help} (${v.nodes.length} nodes)`)
    .join('\n');
  throw new Error(`axe found ${results.violations.length} violation(s):\n${summary}`);
}

/**
 * #39 foundation — axe-core static analysis on the major UI
 * components. Each test renders a representative shape and asserts
 * the rendered DOM has zero axe violations.
 *
 * This is intentionally a STATIC pass: we render once and audit. The
 * full keyboard-walkthrough audit lives in `design/a11y-walkthrough.md`
 * and follow-up tickets — axe doesn't catch ordering / focus / live
 * region timing issues, which is why a manual sweep is still required.
 *
 * Console-error suppression: `ChallengeModal` throws if rendered for
 * Malkuth/Kether (intentional invariant), and `Meter: max must be > 0`
 * is a known fixture noise from other test files. None of those
 * surfaces appears in this file.
 */

describe('a11y — major UI surfaces', () => {
  it('TreeBoard (static, no game state) is axe-clean', async () => {
    const { container } = render(<TreeBoard />);
    expectNoViolations(await axe(container));
  });

  it('TreeBoard (interactive, with player tokens) is axe-clean', async () => {
    const player = makePlayer({ id: 'p1', position: 'tiferet', hand: [2] });
    const state = makeState({}, { players: [player] });
    const { container } = render(
      <TreeBoard state={state} activePlayerId="p1" />,
    );
    expectNoViolations(await axe(container));
  });

  it('Hand (visible, open) is axe-clean', async () => {
    const { container } = render(<Hand hand={[1, 2, 3, 4]} visible={true} />);
    expectNoViolations(await axe(container));
  });

  it('Hand (collapsed) is axe-clean', async () => {
    const { container } = render(
      <Hand hand={[1, 2, 3]} visible={true} defaultOpen={false} />,
    );
    expectNoViolations(await axe(container));
  });

  it('Hand (face-down — for non-active players) is axe-clean', async () => {
    const { container } = render(<Hand hand={[1, 2, 3]} visible={false} />);
    expectNoViolations(await axe(container));
  });

  it('StatSheet (compact) is axe-clean', async () => {
    const player = makePlayer({ id: 'p1', sparksHeld: new Set(['gevurah']) });
    const { container } = render(<StatSheet player={player} mode="compact" />);
    expectNoViolations(await axe(container));
  });

  it('StatSheet (expanded, with active stat) is axe-clean', async () => {
    // Separate test (rather than two renders in one) so the previous
    // sheet's DOM doesn't linger and add false signal to this scan.
    const player = makePlayer({ id: 'p1', sparksHeld: new Set(['gevurah']) });
    const { container } = render(
      <StatSheet player={player} mode="expanded" activeStat="strength" />,
    );
    expectNoViolations(await axe(container));
  });

  it('TeamMeters is axe-clean', async () => {
    const { container } = render(
      <TeamMeters illumination={5} separation={2} />,
    );
    expectNoViolations(await axe(container));
  });

  it('ShellPanel is axe-clean', async () => {
    const state = makeState();
    const { container } = render(<ShellPanel shells={state.shells} />);
    expectNoViolations(await axe(container));
  });

  it('EncounterScreen (Gevurah prep, hot-seat) is axe-clean', async () => {
    // #228: the new encounter UI replaces ChallengeModal in the
    // real-game `/play` flow. Tested at the prep sub-state — the
    // most-rendered shape — with the same axe-clean bar.
    const base = makeFullGame({ playerCount: 2, seed: 1 });
    const activeIdx = base.players.findIndex(
      (p) => p.id === base.activePlayerId,
    );
    const players = base.players.map((p, idx) =>
      idx === activeIdx
        ? { ...p, position: 'gevurah' as const, hand: [0, 1, 2] }
        : { ...p, position: 'gevurah' as const },
    );
    const state = {
      ...base,
      players,
      phase: 'challenge' as const,
      challengeSubPhase: 'prep' as const,
      pendingModifiers: EMPTY_PENDING_MODIFIERS,
      lastOutcome: undefined,
    };
    const rng = seededRng(1);
    const { result } = renderHook(() => useTurn({ initialState: state, rng }));
    const player = state.players.find((p) => p.id === state.activePlayerId);
    const { container } = render(
      <EncounterScreen
        context={{
          sefirah: 'gevurah',
          stat: 12,
          statLabel: 'Strength',
          availableAllies: [],
          availableCardBurns: 3,
          availableSparkBurns: 2,
        }}
        rng={rng}
        mode="hot-seat"
        turn={result.current}
        onResolved={() => undefined}
        {...(player ? { player } : {})}
      />,
    );
    expectNoViolations(await axe(container));
  });

  /**
   * #283: extend axe coverage past prep to the resolve and react sub-
   * states. Each block has a distinct `aria-live="polite"` region and
   * outcome-specific affordances (the spinning d20 + "Rolling…" status
   * in resolve; the Continue / Retry / Accept choice buttons in react)
   * that prep-only coverage couldn't catch.
   *
   * Setup uses fake timers to drive the resolve animation
   * deterministically, then `vi.useRealTimers()` *before* invoking
   * `axe(...)` — axe internally awaits microtasks / timers and hangs
   * indefinitely if fake timers aren't drained first. We pair the
   * fake-timer dance with `stat` tuning to force outcomes against
   * Gevurah DC 15:
   *   - stat 18 → guaranteed pass (even a d20=1 totals 19 ≥ 15).
   *   - stat 1  → with the seeded `rng(1)` the first d20 face is
   *               below 14, so 1 + face < 15 → fail.
   *
   * For the resolve test we Roll, leave fake timers un-advanced (so
   * the UI is mid-animation), switch to real timers, and audit. For
   * the react tests we advance past the 800ms animation window first,
   * then switch and audit.
   */
  describe('EncounterScreen (resolve + react sub-states, #283)', () => {
    function buildPrepState(): ReturnType<typeof makeFullGame> {
      const base = makeFullGame({ playerCount: 2, seed: 1 });
      const activeIdx = base.players.findIndex(
        (p) => p.id === base.activePlayerId,
      );
      const players = base.players.map((p, idx) =>
        idx === activeIdx
          ? { ...p, position: 'gevurah' as const, hand: [0, 1, 2] }
          : { ...p, position: 'gevurah' as const },
      );
      return {
        ...base,
        players,
        phase: 'challenge' as const,
        challengeSubPhase: 'prep' as const,
        pendingModifiers: EMPTY_PENDING_MODIFIERS,
        lastOutcome: undefined,
      };
    }

    /**
     * Mount EncounterScreen, click Roll, advance the resolve animation
     * by `advanceMs` ms, then return the rendered view at that
     * sub-state. Using fake timers throughout so the resolve→react
     * lag is deterministic.
     *
     * The caller is responsible for switching to real timers before
     * calling `axe()` (axe internally awaits real timers and hangs on
     * fake ones) and for unmounting the view. We expose the helper
     * rather than auto-cleaning so the caller can pin the sub-state
     * before the scan.
     */
    function setupAndRoll(opts: {
      readonly stat: number;
      readonly advanceMs: number;
    }): { readonly view: ReturnType<typeof render> } {
      const state = buildPrepState();
      const rng = seededRng(1);
      const { result, rerender: rerenderHook } = renderHook(() =>
        useTurn({ initialState: state, rng }),
      );
      const player = state.players.find((p) => p.id === state.activePlayerId);
      const Wrapper = (): JSX.Element => (
        <EncounterScreen
          context={{
            sefirah: 'gevurah',
            stat: opts.stat,
            statLabel: 'Strength',
            availableAllies: [],
            availableCardBurns: 3,
            availableSparkBurns: 2,
          }}
          rng={rng}
          mode="hot-seat"
          turn={result.current}
          onResolved={() => undefined}
          {...(player ? { player } : {})}
        />
      );
      const view = render(<Wrapper />);
      act(() => {
        fireEvent.click(view.getByRole('button', { name: /^Roll$/ }));
      });
      if (opts.advanceMs > 0) {
        act(() => {
          vi.advanceTimersByTime(opts.advanceMs);
        });
      }
      rerenderHook();
      view.rerender(<Wrapper />);
      return { view };
    }

    function getSubPhase(view: ReturnType<typeof render>): string | null {
      return (
        view.container
          .querySelector('[data-encounter-screen]')
          ?.getAttribute('data-encounter-sub-phase') ?? null
      );
    }

    it('resolve sub-state (animatingResolve, aria-live region) is axe-clean', async () => {
      vi.useFakeTimers();
      try {
        // advanceMs=0 — leave the resolve animation mid-flight so we
        // audit the `aria-live="polite"` "Rolling…" status region.
        const { view } = setupAndRoll({ stat: 18, advanceMs: 0 });
        const sub = getSubPhase(view);
        // Sanity: confirm we're auditing the resolve panel, not prep
        // or react. An upstream regression that flips the panel under
        // test would otherwise leave the suite silently green.
        if (sub !== 'resolve') {
          throw new Error(`expected resolve sub-state, got ${sub}`);
        }
        // axe internally awaits real timers; switch back *before*
        // calling axe. If `setupAndRoll` above threw, the outer
        // `finally` still restores real timers and the original
        // error surfaces unchanged (no null-view obfuscation).
        vi.useRealTimers();
        try {
          expectNoViolations(await axe(view.container));
        } finally {
          view.unmount();
        }
      } finally {
        vi.useRealTimers();
      }
    });

    it('react sub-state (pass — Continue button, aria-live verdict) is axe-clean', async () => {
      vi.useFakeTimers();
      try {
        const { view } = setupAndRoll({ stat: 18, advanceMs: 800 });
        const sub = getSubPhase(view);
        if (sub !== 'react') {
          throw new Error(`expected react sub-state, got ${sub}`);
        }
        // Pin: this is the pass branch — Continue button, no Retry /
        // Accept. Drives the axe scan over the pass-specific button.
        const verdict = view.container.querySelector('[data-result="pass"]');
        if (verdict === null) {
          throw new Error('expected a pass verdict in the react panel');
        }
        vi.useRealTimers();
        try {
          expectNoViolations(await axe(view.container));
        } finally {
          view.unmount();
        }
      } finally {
        vi.useRealTimers();
      }
    });

    it('react sub-state (fail — Retry / Accept setback choice) is axe-clean', async () => {
      vi.useFakeTimers();
      try {
        // Stat 1 vs DC 15 — with the seeded rng(1) the first d20 face
        // is well below 14, so the total falls short. We assert
        // `data-result="fail"` before scanning, so a counter-example
        // would surface as a clear failure rather than silent miscoverage.
        const { view } = setupAndRoll({ stat: 1, advanceMs: 800 });
        const sub = getSubPhase(view);
        if (sub !== 'react') {
          throw new Error(`expected react sub-state, got ${sub}`);
        }
        const verdict = view.container.querySelector('[data-result="fail"]');
        if (verdict === null) {
          throw new Error(
            'expected a fail verdict in the react panel (seeded rng must have rolled below DC)',
          );
        }
        // Pin: both choice buttons must be in the DOM for this scan to
        // be meaningful — without both, axe wouldn't catch a regression
        // that hides one branch.
        if (
          view.container.querySelector('[data-fail-choice="retry"]') === null ||
          view.container.querySelector('[data-fail-choice="accept"]') === null
        ) {
          throw new Error(
            'expected both Retry and Accept setback buttons in the fail react panel',
          );
        }
        vi.useRealTimers();
        try {
          expectNoViolations(await axe(view.container));
        } finally {
          view.unmount();
        }
      } finally {
        vi.useRealTimers();
      }
    });
  });

  it('ChallengeModal (Gevurah, with stat sheet) is axe-clean', async () => {
    const player = makePlayer({ id: 'p1' });
    const { container } = render(
      <ChallengeModal
        context={{
          sefirah: 'gevurah',
          stat: 12,
          statLabel: 'Strength',
          availableAllies: [],
          availableCardBurns: 3,
          availableSparkBurns: 2,
        }}
        rng={seededRng(1)}
        onResolved={() => undefined}
        player={player}
      />,
    );
    expectNoViolations(await axe(container));
  });

  it('BlessingRitual (initial step) is axe-clean', async () => {
    const { container } = render(
      <BlessingRitual rng={seededRng(1)} sign="aries" onComplete={() => undefined} />,
    );
    expectNoViolations(await axe(container));
  });

  it('ZodiacSignPicker (with one taken sign) is axe-clean', async () => {
    const { container } = render(
      <ZodiacSignPicker
        taken={{ aries: 'Andy' }}
        onPick={() => undefined}
      />,
    );
    expectNoViolations(await axe(container));
  });

  it('Lobby (host view, mixed-ready players) is axe-clean', async () => {
    const players = [
      { id: 'p1', name: 'Andy', zodiacSign: 'aries' as const, ready: true },
      { id: 'p2', name: 'Bea', zodiacSign: 'leo' as const, ready: false },
    ];
    const { container } = render(
      <Lobby
        players={players}
        isHost={true}
        currentPlayerId="p1"
        onBegin={() => undefined}
        onToggleReady={() => undefined}
      />,
    );
    expectNoViolations(await axe(container));
  });

  // #313: home page is the recruitment surface. Axe sweep at both
  // disclosure states pins the contract that neither closed-portal
  // nor expanded-portal introduces a violation. Mocking
  // `next/navigation` mirrors `home.test.tsx` — `HomeRoomForms`
  // (rendered inside the expanded panel) calls `useRouter()`.
  describe('HomePage (#313)', () => {
    it('home page (closed-portal default) is axe-clean', async () => {
      const HomePage = (await import('@/app/page')).default;
      const { container } = render(<HomePage />);
      expectNoViolations(await axe(container));
    });

    it('home page (expanded-portal — three CTAs visible) is axe-clean', async () => {
      const HomePage = (await import('@/app/page')).default;
      const { container, getByRole } = render(<HomePage />);
      // Click the trigger so the panel mounts. axe over the open
      // panel state catches a different DOM (HomeRoomForms inputs +
      // Hot-seat Link) than the closed state.
      const trigger = getByRole('button', { name: /begin the ascent/i });
      trigger.click();
      // Wait for the panel to mount (synchronous in this codepath —
      // useState set + render — but the click handler may be batched).
      await new Promise((resolve) => setTimeout(resolve, 0));
      expectNoViolations(await axe(container));
    });
  });
});

