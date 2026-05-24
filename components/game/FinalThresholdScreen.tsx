'use client';
import { useEffect, useMemo, useRef } from 'react';
import { sefirahByKey, zodiacSigns } from '@/data';
import type { SefirahKey } from '@/data';
import { REQUIRED_ILLUMINATION_MARGIN } from '@/engine/endgame';
import { isKetherHeld } from '@/engine/kether';
import type { GameState, KetherSubPhase, KetherTrialChallenge, PlayerState } from '@/engine/types';
import type { UseTurnReturn } from '@/lib/use-turn';
import { useVoice } from '@/lib/voice/useVoice';
import { narratorVoicePath } from '@/lib/voice/paths';

/**
 * FinalThresholdScreen — K3 of #285 / dissolution redesign.
 *
 * Three sub-states driven by `state.ketherRitual.subPhase`:
 *
 *   trial — cooperative gauntlet. Each player resolves one d20 challenge
 *            in turn (the trial order). Sparks may be staged for the
 *            active challenge for a bonus. Passed challenges grant +1
 *            Illumination.
 *   close  — closure window. Each player can stage / unstage Sparks for
 *            +1 Illumination each (consumed at confirm). Confirm-closure
 *            button is single-press, any-player (first-confirm-wins).
 *
 * A **pre-ritual hold view** renders for players who have reached Kether
 * but the rest of the team has not (per § 2.1).
 */

interface FinalThresholdScreenProps {
  readonly state: GameState;
  readonly player: PlayerState;
  readonly turn: UseTurnReturn;
  readonly mode: 'hot-seat' | 'multiplayer';
  readonly className?: string;
}

export function FinalThresholdScreen(props: FinalThresholdScreenProps): JSX.Element {
  const { state, player, turn, mode, className } = props;

  // #231: Kether narrator voice. Hooks must precede all early returns.
  // subPhase is derived here (before the PreRitualHoldView guards) so
  // the effects can fire on the correct phase transitions.
  const ritual = state.ketherRitual;
  const narratorSubPhase: 'trial' | 'close' | undefined =
    state.phase === 'kether' && ritual !== undefined
      ? ritual.subPhase === 'close'
        ? 'close'
        : 'trial'
      : undefined;

  const { playVoice } = useVoice();

  // #231: fire once when the trial gauntlet opens (team gathered at Kether).
  const trialOpenFiredRef = useRef(false);
  useEffect(() => {
    if (trialOpenFiredRef.current) return;
    if (narratorSubPhase !== 'trial') return;
    trialOpenFiredRef.current = true;
    playVoice(narratorVoicePath('threshold-open'));
  }, [narratorSubPhase, playVoice]);

  // #231: fire once when the closure window opens (trial gauntlet complete).
  const closureOpenFiredRef = useRef(false);
  useEffect(() => {
    if (closureOpenFiredRef.current) return;
    if (narratorSubPhase !== 'close') return;
    closureOpenFiredRef.current = true;
    playVoice(narratorVoicePath('threshold-close'));
  }, [narratorSubPhase, playVoice]);

  if (isKetherHeld(state, player.id)) {
    return (
      <PreRitualHoldView
        state={state}
        player={player}
        mode={mode}
        {...(className !== undefined ? { className } : {})}
      />
    );
  }

  if (state.phase !== 'kether' || ritual === undefined) {
    return (
      <PreRitualHoldView
        state={state}
        player={player}
        mode={mode}
        {...(className !== undefined ? { className } : {})}
      />
    );
  }

  // 'gather' is non-durable — falls back to 'trial' UI defensively.
  const subPhase: Exclude<KetherSubPhase, 'gather'> =
    ritual.subPhase === 'close' ? 'close' : 'trial';

  return (
    <section
      data-final-threshold-screen
      data-sub-phase={subPhase}
      data-mode={mode}
      aria-label="Final Threshold ritual"
      className={`relative mx-auto max-w-3xl rounded-lg border border-illumination/40 bg-ground/80 p-6 text-veil shadow-glow-kether${className ? ` ${className}` : ''}`}
    >
      <header className="mb-6 text-center">
        <h2 className="font-display text-3xl tracking-widest">The Final Threshold</h2>
        <p className="mt-2 italic opacity-80">The Crown stands before you. Stand together.</p>
      </header>

      {subPhase === 'trial' ? (
        <TrialPanel state={state} player={player} turn={turn} />
      ) : (
        <ClosurePanel state={state} player={player} turn={turn} />
      )}
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// Pre-ritual hold view (§ 2.1)
// ────────────────────────────────────────────────────────────────────

interface PreRitualHoldViewProps {
  readonly state: GameState;
  readonly player: PlayerState;
  readonly mode: 'hot-seat' | 'multiplayer';
  readonly className?: string;
}

function PreRitualHoldView(props: PreRitualHoldViewProps): JSX.Element {
  const { state, player, mode, className } = props;
  const arrived = state.players.filter((p) => p.position === 'kether');
  const stillClimbing = state.players.filter((p) => p.position !== 'kether');

  return (
    <section
      data-final-threshold-screen
      data-sub-phase="hold"
      data-mode={mode}
      aria-label="Waiting at the Crown"
      className={`relative mx-auto max-w-3xl rounded-lg border border-illumination/30 bg-ground/80 p-6 text-veil shadow-glow-kether${className ? ` ${className}` : ''}`}
    >
      <header className="mb-4 text-center">
        <h2 className="font-display text-3xl tracking-widest">You stand at the Crown</h2>
        <p role="status" aria-live="polite" className="mt-2 italic opacity-80">
          Waiting for the rest of the team to arrive.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div
          data-roster="arrived"
          className="rounded border border-illumination/40 bg-ground/40 p-3"
        >
          <h3 className="text-xs uppercase tracking-widest opacity-60">
            At Kether ({arrived.length})
          </h3>
          <ul className="mt-2 space-y-1 text-sm">
            {arrived.map((p) => (
              <li
                key={p.id}
                data-player={p.id}
                data-roster-status="arrived"
                className="flex items-center gap-2"
              >
                <PlayerGlyph player={p} />
                <span className="font-display tracking-widest">
                  {p.name}
                  {p.id === player.id ? ' (you)' : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div data-roster="climbing" className="rounded border border-veil/30 bg-ground/40 p-3">
          <h3 className="text-xs uppercase tracking-widest opacity-60">
            Still climbing ({stillClimbing.length})
          </h3>
          {stillClimbing.length === 0 ? (
            <p className="mt-2 text-xs italic opacity-50">
              The team is whole. The ritual is about to begin.
            </p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {stillClimbing.map((p) => (
                <li
                  key={p.id}
                  data-player={p.id}
                  data-roster-status="climbing"
                  className="flex items-center gap-2 opacity-70"
                >
                  <PlayerGlyph player={p} />
                  <span className="font-display tracking-widest">{p.name}</span>
                  <span className="text-xs opacity-60">{sefirahByKey(p.position).englishName}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-xs italic opacity-60">
        Your hand is held; you cannot move, draw, or meditate. The ritual begins when the last
        player arrives.
      </p>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// Trial sub-state — cooperative gauntlet
// ────────────────────────────────────────────────────────────────────

interface TrialPanelProps {
  readonly state: GameState;
  readonly player: PlayerState;
  readonly turn: UseTurnReturn;
}

function TrialPanel(props: TrialPanelProps): JSX.Element {
  const { state, player, turn } = props;
  const ritual = state.ketherRitual;
  if (ritual === undefined) {
    throw new Error('TrialPanel: state.ketherRitual is undefined inside phase==="kether"');
  }

  const currentTrialId = turn.currentTrialPlayerId;
  const isMyTurn = currentTrialId === player.id;
  const currentTrialPlayer = useMemo(
    () => state.players.find((p) => p.id === currentTrialId),
    [state.players, currentTrialId],
  );

  const { trialOrder, trialTurnIndex, trialChallenges, trialStagedSparks } = ritual;

  const activeChallengeIndex = trialTurnIndex < trialChallenges.length ? trialTurnIndex : null;
  const activeChallenge: KetherTrialChallenge | null =
    activeChallengeIndex !== null ? (trialChallenges[activeChallengeIndex] ?? null) : null;

  const myStagedSparks = useMemo(
    () => new Set(trialStagedSparks.filter((s) => s.playerId === player.id).map((s) => s.sefirah)),
    [trialStagedSparks, player.id],
  );

  return (
    <div data-trial-panel className="space-y-6">
      {/* Council order ribbon */}
      <div
        data-trial-order
        role="list"
        aria-label="Trial order"
        className="flex flex-wrap justify-center gap-3"
      >
        {trialOrder.map((id, idx) => {
          const p = state.players.find((pl) => pl.id === id);
          if (!p) return null;
          const isCurrent = idx === trialTurnIndex;
          const challenge = trialChallenges[idx];
          const isDone = challenge?.passed !== null && challenge?.passed !== undefined;
          return (
            <div
              key={id}
              role="listitem"
              data-trial-seat={id}
              data-trial-active={isCurrent ? 'true' : 'false'}
              className={`flex items-center gap-2 rounded-full border px-3 py-1 ${
                isCurrent
                  ? 'border-illumination shadow-glow-kether'
                  : isDone
                    ? 'border-veil/20 opacity-60'
                    : 'border-veil/30'
              }`}
            >
              <PlayerGlyph player={p} />
              <span className="font-display text-sm tracking-widest">{p.name}</span>
              {isDone ? (
                <span className="text-xs">
                  {challenge?.passed ? (
                    <span className="text-illumination">✓</span>
                  ) : (
                    <span className="opacity-60">✗</span>
                  )}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Whose-turn status */}
      <div
        data-trial-status
        role="status"
        aria-live="polite"
        className="text-center font-display text-sm uppercase tracking-widest opacity-80"
      >
        {isMyTurn
          ? 'Your turn — face the challenge.'
          : currentTrialPlayer
            ? `Waiting for ${currentTrialPlayer.name} to resolve their challenge.`
            : 'The trial gauntlet has ended.'}
      </div>

      {/* Active challenge */}
      {activeChallenge !== null ? (
        <div
          data-active-challenge
          className="rounded border border-illumination/40 bg-ground/40 p-4"
        >
          <header className="mb-3 flex items-baseline justify-between">
            <h3 className="font-display tracking-widest">
              {sefirahByKey(activeChallenge.sefirahKey).englishName} Trial
            </h3>
            <span className="text-xs uppercase tracking-widest opacity-60">
              DC {activeChallenge.dc}
            </span>
          </header>
          <p className="mb-3 text-xs opacity-70">
            Stat: <span className="font-display capitalize">{activeChallenge.stat}</span>
          </p>

          {/* Spark staging for this challenge */}
          {player.sparksHeld.size > 0 ? (
            <div className="mb-3">
              <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
                Stage Sparks (+{5} per Spark)
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from(player.sparksHeld).map((sefirah) => {
                  const staged = myStagedSparks.has(sefirah);
                  const sefirahData = sefirahByKey(sefirah);
                  return (
                    <button
                      key={sefirah}
                      type="button"
                      onClick={() => {
                        if (staged) {
                          turn.ketherTrialUnstageSpark(player.id, sefirah);
                        } else {
                          turn.ketherTrialStageSpark(player.id, sefirah);
                        }
                      }}
                      aria-pressed={staged}
                      data-action={
                        staged ? 'kether-trial-unstage-spark' : 'kether-trial-stage-spark'
                      }
                      data-spark-sefirah={sefirah}
                      data-spark-staged={staged ? 'true' : 'false'}
                      className={`rounded border px-3 py-1 text-xs ${
                        staged
                          ? 'border-illumination bg-illumination/15 text-illumination'
                          : 'border-veil/40 hover:border-illumination'
                      }`}
                    >
                      {staged ? 'Staged: ' : 'Stage '}
                      {sefirahData.englishName}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {isMyTurn ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => turn.ketherTrialResolve()}
                data-action="kether-trial-resolve"
                className="rounded bg-illumination px-6 py-2 font-display tracking-widest text-ground shadow-glow-kether focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-illumination/80"
              >
                Roll
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Completed challenges log */}
      <div
        data-trial-log
        role="log"
        aria-live="polite"
        aria-label="Trial results"
        className="rounded border border-veil/20 bg-ground/40 p-4"
      >
        <h3 className="text-xs uppercase tracking-widest opacity-60">Results</h3>
        {trialChallenges.every((c) => c.passed === null) ? (
          <p className="mt-2 text-xs italic opacity-50">
            No challenges resolved yet. The first player opens the gauntlet.
          </p>
        ) : (
          <ol className="mt-2 space-y-1 text-sm">
            {trialChallenges.map((challenge, idx) => {
              if (challenge.roll === null) return null;
              const playerId = trialOrder[idx];
              const p = state.players.find((pl) => pl.id === playerId);
              const name = p?.name ?? playerId ?? '?';
              const sefirahName = sefirahByKey(challenge.sefirahKey).englishName;
              return (
                <li
                  key={idx}
                  data-log-entry={challenge.passed ? 'passed' : 'failed'}
                  data-log-player={playerId}
                  className="flex items-baseline gap-2"
                >
                  <span className="font-display tracking-widest">{name}</span>
                  <span className="opacity-60">—</span>
                  <span>{sefirahName}</span>
                  <span className="text-xs opacity-60">
                    rolled {challenge.roll} vs DC {challenge.dc}
                  </span>
                  {challenge.passed ? (
                    <span className="text-xs text-illumination">passed (+1 Illumination)</span>
                  ) : (
                    <span className="text-xs italic opacity-60">failed</span>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Closure sub-state (§ 2.4)
// ────────────────────────────────────────────────────────────────────

interface ClosurePanelProps {
  readonly state: GameState;
  readonly player: PlayerState;
  readonly turn: UseTurnReturn;
}

function ClosurePanel(props: ClosurePanelProps): JSX.Element {
  const { state, player, turn } = props;
  const ritual = state.ketherRitual;
  if (ritual === undefined) {
    throw new Error(
      'ClosurePanel: state.ketherRitual is undefined inside phase==="kether"; engine corruption',
    );
  }

  const stagedSparks = ritual.stagedClosureSparks;
  const closureLocked = ritual.closureLocked;
  const stagedCount = stagedSparks.length;
  const projectedIllumination = state.illumination + stagedCount;
  const target = state.separation + REQUIRED_ILLUMINATION_MARGIN;
  const projectedGap = target - projectedIllumination;
  const wouldClear = projectedGap <= 0;

  const myStaged = useMemo(
    () => new Set(stagedSparks.filter((s) => s.playerId === player.id).map((s) => s.sefirah)),
    [stagedSparks, player.id],
  );

  return (
    <div data-closure-panel className="space-y-6">
      <div
        data-closure-status
        role="status"
        aria-live="polite"
        className="rounded border border-illumination/40 bg-ground/40 p-4 text-center"
      >
        <p className="text-xs uppercase tracking-widest opacity-70">
          The trial is over. The closure window is open.
        </p>
        <p className="mt-2 font-display text-2xl tabular-nums">
          <span data-closure-projected>{projectedIllumination}</span>
          <span className="opacity-50"> / </span>
          <span data-closure-target>{target}</span>
        </p>
        <p className="mt-1 text-xs opacity-70">
          Illumination after staged Sparks vs. target (Separation + {REQUIRED_ILLUMINATION_MARGIN}).{' '}
          {wouldClear ? (
            <span data-closure-gap-status="closed" className="text-illumination">
              Threshold cleared.
            </span>
          ) : (
            <span data-closure-gap-status="open">{projectedGap} more needed.</span>
          )}
        </p>
        {stagedCount > 0 ? (
          <p data-closure-staged-count className="mt-1 text-xs italic opacity-60">
            {stagedCount} Spark{stagedCount === 1 ? '' : 's'} staged.
          </p>
        ) : null}
      </div>

      <ol role="list" className="space-y-3">
        {state.players.map((p) => {
          const isMe = p.id === player.id;
          const sparks = Array.from(p.sparksHeld);
          return (
            <li
              key={p.id}
              data-closure-player={p.id}
              className="rounded border border-veil/30 bg-ground/40 p-3"
            >
              <header className="flex items-baseline justify-between">
                <h3 className="font-display tracking-widest">
                  <PlayerGlyph player={p} />{' '}
                  <span className="ml-1">
                    {p.name}
                    {isMe ? ' (you)' : ''}
                  </span>
                </h3>
                <span className="text-xs uppercase tracking-widest opacity-60">
                  {sparks.length} Spark{sparks.length === 1 ? '' : 's'}
                </span>
              </header>
              {sparks.length === 0 ? (
                <p className="mt-2 text-xs italic opacity-50">No Sparks held.</p>
              ) : (
                <ul role="list" className="mt-2 flex flex-wrap gap-2">
                  {sparks.map((sefirah) => {
                    const staged =
                      isMe && myStaged.has(sefirah)
                        ? true
                        : stagedSparks.some((s) => s.playerId === p.id && s.sefirah === sefirah);
                    const sefirahData = sefirahByKey(sefirah);
                    return (
                      <li key={sefirah}>
                        <button
                          type="button"
                          onClick={() => {
                            if (closureLocked) return;
                            if (staged) {
                              turn.ketherCloseUnstageSpark(p.id, sefirah);
                            } else {
                              turn.ketherCloseStageSpark(p.id, sefirah);
                            }
                          }}
                          disabled={closureLocked || (!isMe && !staged)}
                          aria-pressed={staged}
                          data-action={
                            staged ? 'kether-close-unstage-spark' : 'kether-close-stage-spark'
                          }
                          data-spark-player={p.id}
                          data-spark-sefirah={sefirah}
                          data-spark-staged={staged ? 'true' : 'false'}
                          className={`rounded border px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40 ${
                            staged
                              ? 'border-illumination bg-illumination/15 text-illumination'
                              : 'border-veil/40 hover:border-illumination'
                          }`}
                        >
                          {staged ? 'Staged: ' : 'Stage '}
                          {sefirahData.englishName} {staged ? '(+1)' : ''}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => turn.thresholdConfirm()}
          disabled={closureLocked}
          data-action="threshold-confirm"
          className="rounded bg-illumination px-6 py-3 font-display tracking-widest text-ground shadow-glow-kether focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-illumination/80 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {closureLocked ? 'Closure confirmed' : 'Confirm closure'}
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

interface PlayerGlyphProps {
  readonly player: PlayerState;
}

function PlayerGlyph({ player }: PlayerGlyphProps): JSX.Element {
  const sign = zodiacSigns.find((s) => s.key === player.zodiacSign);
  return (
    <span
      aria-hidden
      data-player-glyph={player.id}
      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-veil/40 text-sm"
    >
      {sign?.glyph ?? '?'}
    </span>
  );
}

export type { SefirahKey };
