'use client';
import { useState } from 'react';
import { sefirahByKey, tryPathByNumber } from '@/data';
import type { SoulAspectKey } from '@/data';
import { TreeBoard } from '@/components/tree/TreeBoard';
import { Hand } from '@/components/hand/Hand';
import { StatSheet } from '@/components/player/StatSheet';
import { TeamMeters } from '@/components/meters/TeamMeters';
import { ShellPanel } from '@/components/shells/ShellPanel';
import { ChallengeModal } from '@/components/challenge/ChallengeModal';
import type {
  ChallengeContext,
  ChallengeResolution,
} from '@/components/challenge/ChallengeModal';
import { FinalThreshold } from '@/components/game/FinalThreshold';
import type { FinalThresholdResult } from '@/engine/endgame';
import { isHandVisible } from '@/components/hand/visibility';
import { useTurn } from '@/lib/use-turn';
import type { Rng } from '@/engine/rng';
import type { GameState } from '@/engine/types';
import { checkEndgame } from '@/engine/endgame';

/**
 * Top-level play surface. Composes every Phase 3 component around the
 * `useTurn` state machine. This is the integration that turns the
 * engine + UI library into something a human can actually play.
 *
 * Single-screen orchestrator (no multiplayer routing yet — Phase 5):
 *   - Tree (current player's valid moves highlighted)
 *   - Hand (visibility-aware, owner sees own; others by upper-Tree rule)
 *   - StatSheet for the active player (active stat highlighted during a check)
 *   - TeamMeters (Illumination / Separation / pillar streak)
 *   - ShellPanel
 *   - ChallengeModal opens automatically when the active player arrives at
 *     an uncleared `'check'`-kind Sefirah
 *   - FinalThreshold takes over when all players reach Kether
 *
 * The orchestrator does not own GameState authoritatively — `useTurn`
 * exposes a `setState` hook for server pushes (Phase 5). For now the
 * hook owns local state.
 */

interface PlayScreenProps {
  readonly initialState: GameState;
  readonly soulAspectByPlayer: Readonly<Record<string, SoulAspectKey>>;
  readonly rng: Rng;
  readonly className?: string;
}

export function PlayScreen({
  initialState,
  soulAspectByPlayer,
  rng,
  className,
}: PlayScreenProps): JSX.Element {
  const turn = useTurn({ initialState, rng });
  const [thresholdResult, setThresholdResult] =
    useState<FinalThresholdResult | null>(null);
  const [selectedCard, setSelectedCard] = useState<number | undefined>(undefined);
  // Bumped on every retry choice from the challenge modal — keyed
  // into the modal's React `key` so the modal remounts with a clean
  // committing/rolling/reveal state machine.
  const [retryNonce, setRetryNonce] = useState(0);

  const activePlayer = turn.state.players[turn.activePlayerIndex];
  const endgame = checkEndgame(turn.state);
  const allAtKether =
    turn.state.players.length > 0 &&
    turn.state.players.every((p) => p.position === 'kether');

  // Final Threshold takeover: once all players reach Kether, the play
  // surface yields to the threshold ritual. The engine runs the actual
  // win/loss check inside `resolveFinalThreshold`.
  if (allAtKether && thresholdResult === null) {
    return (
      <FinalThreshold
        state={turn.state}
        onResolved={(r) => setThresholdResult(r)}
        {...(className !== undefined ? { className } : {})}
      />
    );
  }

  if (endgame.status === 'lost') {
    return (
      <section
        data-play-screen
        data-status="lost"
        className={`mx-auto max-w-md p-8 text-center text-veil ${className ?? ''}`}
      >
        <h2 className="font-display text-3xl tracking-widest">The light fell.</h2>
        <p className="mt-2 italic opacity-80">
          {endgame.reason === 'separation-overflow'
            ? 'Separation overflowed the Tree.'
            : 'The team is stranded.'}
        </p>
      </section>
    );
  }

  // Challenge modal: useTurn's phase moves to 'challenge' when the
  // active player arrives at an uncleared 'check' Sefirah.
  const showChallenge =
    turn.phase === 'challenge' &&
    activePlayer !== undefined &&
    !activePlayer.clearedSefirot.has(activePlayer.position);

  const challengeContext: ChallengeContext | null =
    showChallenge && activePlayer
      ? buildChallengeContext(turn.state, activePlayer.id)
      : null;

  const handlePathClick = (pathNumber: number): void => {
    if (!activePlayer) return;
    if (selectedCard === undefined) {
      // No card selected — short-circuit. Phase 6 polish: surface a
      // hint that the player must select a card first.
      return;
    }
    const path = tryPathByNumber(pathNumber);
    if (!path || path.arcanumNumber !== selectedCard) return;
    const result = turn.move(pathNumber);
    if (result.ok) {
      setSelectedCard(undefined);
    }
  };

  const handleChallengeResolved = (resolution: ChallengeResolution): void => {
    if (!activePlayer) return;
    const ctx = challengeContext;
    if (!ctx) return;
    // The modal animated the d20 and committed the modifiers the
    // player chose; both come back in the resolution. Forward them
    // so the engine applies the same outcome the player saw.
    if (resolution.pass) {
      turn.submitChallenge(
        ctx.sefirah,
        resolution.modifiers,
        resolution.outcome,
      );
      // Reset retry counter so the next challenge starts at 0.
      setRetryNonce(0);
      return;
    }
    if (resolution.choice === 'retry') {
      // Retry: don't advance the phase. The player commits another
      // round of modifiers (typically a card or spark burn) and
      // rolls again. We force a fresh modal mount by bumping a
      // local key so the previous outcome state doesn't bleed in.
      setRetryNonce((n) => n + 1);
      return;
    }
    // 'accept': apply the engine's failure consequence — Separation
    // ticks up by 1 (or +2 on shortcut arrivals) — and advance the
    // phase to 'draw'. ATOMICALLY via `acceptChallengeSetback`. The
    // earlier pattern (setState(acceptSetback(...)) +
    // submitChallenge(failed-outcome)) lost the setback to a React
    // batching race: submitChallenge's internal `setState(unchanged)`
    // overwrote the setback in the same flush. The dedicated action
    // collapses both updates into one setState call.
    turn.acceptChallengeSetback({
      sefirah: ctx.sefirah,
      shortcut: ctx.shortcut ?? false,
    });
    setRetryNonce(0);
  };

  return (
    <main
      data-play-screen
      data-phase={turn.phase}
      data-active-player={activePlayer?.id}
      className={`mx-auto grid max-w-6xl grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_400px] ${className ?? ''}`}
    >
      <section aria-label="Tree of Life board" className="flex flex-col items-center gap-4">
        <TreeBoard
          state={turn.state}
          {...(activePlayer ? { activePlayerId: activePlayer.id } : {})}
          onPathClick={handlePathClick}
          className="w-full max-w-xl"
        />
        <div className="flex w-full max-w-xl items-center justify-between rounded border border-veil/20 bg-ground/40 px-4 py-2 text-sm">
          <span className="text-xs uppercase tracking-widest opacity-60">
            Phase: {turn.phase}
          </span>
          <span className="font-display tracking-widest">
            {activePlayer?.name ?? '—'}&apos;s turn
          </span>
          <div className="flex gap-2">
            {turn.phase === 'move' ? (
              <button
                type="button"
                onClick={() => turn.meditate()}
                data-action="meditate"
                className="rounded border border-veil/30 px-2 py-1 text-xs"
              >
                Meditate
              </button>
            ) : null}
            {turn.phase === 'draw' ? (
              <button
                type="button"
                onClick={() => turn.draw()}
                data-action="draw"
                className="rounded border border-illumination/60 px-2 py-1 text-xs"
              >
                Draw
              </button>
            ) : null}
            {turn.phase === 'end' ? (
              <button
                type="button"
                onClick={() => turn.endTurn()}
                data-action="end-turn"
                className="rounded bg-illumination px-2 py-1 text-xs text-ground"
              >
                End turn
              </button>
            ) : null}
          </div>
        </div>
        {activePlayer ? (
          <Hand
            hand={activePlayer.hand}
            visible={isHandVisible(turn.state, activePlayer.id, activePlayer.id)}
            onCardSelect={(n) => setSelectedCard(n)}
            {...(selectedCard !== undefined ? { selectedArcanum: selectedCard } : {})}
            ariaLabel={`${activePlayer.name}'s hand`}
            className="w-full max-w-xl"
          />
        ) : null}
      </section>

      <aside aria-label="Game status" className="flex flex-col gap-6 text-veil">
        {activePlayer ? (
          <div className="rounded border border-veil/20 bg-ground/40 p-4">
            <StatSheet
              player={activePlayer}
              {...(soulAspectByPlayer[activePlayer.id] !== undefined
                ? { soulAspect: soulAspectByPlayer[activePlayer.id] }
                : {})}
            />
          </div>
        ) : null}
        <div className="rounded border border-veil/20 bg-ground/40 p-4">
          <TeamMeters
            illumination={turn.state.illumination}
            separation={turn.state.separation}
            pillarStreak={turn.state.pillarStreak}
          />
        </div>
        <div className="rounded border border-veil/20 bg-ground/40 p-4">
          <ShellPanel shells={turn.state.shells} headingLevel={3} />
        </div>
      </aside>

      {challengeContext ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ground/80 p-4">
          <ChallengeModal
            // Bumping retryNonce remounts the modal so the
            // committing/rolling/reveal state machine starts fresh
            // for the next roll. Reset on pass/accept so a future
            // challenge at the same Sefirah doesn't start at a
            // stale nonce.
            key={`challenge-${retryNonce}`}
            context={challengeContext}
            rng={rng}
            onResolved={handleChallengeResolved}
            className="w-full max-w-md"
          />
        </div>
      ) : null}
    </main>
  );
}

/**
 * Build a ChallengeContext from the active player's current state.
 * The check is for the Sefirah they just arrived at; the relevant
 * stat is that Sefirah's stat. Allies are other players currently
 * at the same Sefirah; their relevant stat is the same.
 */
function buildChallengeContext(
  state: GameState,
  playerId: string,
): ChallengeContext | null {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return null;
  const sefirahData = sefirahByKey(player.position);
  if (sefirahData.challenge.kind !== 'check') return null;
  const allies = state.players
    .filter(
      (p) =>
        p.id !== player.id && p.position === player.position,
    )
    .map((p) => ({
      id: p.id,
      name: p.name,
      stat: p.stats[sefirahData.stat],
    }));
  return {
    sefirah: sefirahData.key,
    stat: player.stats[sefirahData.stat],
    statLabel: sefirahData.stat,
    availableAllies: allies,
    availableCardBurns: player.hand.length,
    availableSparkBurns: player.sparksHeld.size,
  };
}
