import { describe, it } from 'vitest';
import { render, renderHook } from '@testing-library/react';
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
      pendingModifiers: { cardBurns: [], sparkBurns: [], assistRequests: [] },
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
      <BlessingRitual rng={seededRng(1)} onComplete={() => undefined} />,
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
});
