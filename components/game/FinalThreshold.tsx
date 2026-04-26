'use client';
import { useMemo, useState } from 'react';
import { arcanumByNumber, sefirahByKey } from '@/data';
import type { SefirahKey } from '@/data';
import {
  REQUIRED_ILLUMINATION_MARGIN,
  resolveFinalThreshold,
} from '@/engine/endgame';
import type {
  CardPlay,
  FinalThresholdResult,
  SparkBurn,
} from '@/engine/endgame';
import type { GameState } from '@/engine/types';
import { JourneySummary } from './JourneySummary';

/**
 * Final Threshold screen. Reached when all players are at Kether and
 * the orchestrator transitions the game into endgame. Each player
 * plays remaining hand cards (optionally with a one-sentence
 * reflection) and burns Sparks to close any remaining Illumination
 * gap. Calling the engine's `resolveFinalThreshold` produces the
 * win/loss outcome.
 *
 * Live preview: as the player commits cards/sparks, the projected
 * Illumination delta updates so they see whether they'll cross the
 * threshold before clicking Resolve.
 *
 * The component does NOT mutate state — it accumulates `cardPlays`
 * and `sparkBurns` locally and calls `resolveFinalThreshold` on
 * Resolve. The orchestrator applies the resulting `state` upstream.
 *
 * Reflections are UI-only (one sentence per played card); the engine
 * doesn't persist them. Saving reflections post-game is a future
 * feature.
 */

interface FinalThresholdProps {
  readonly state: GameState;
  readonly onResolved: (result: FinalThresholdResult) => void;
  readonly className?: string;
}

export function FinalThreshold({
  state,
  onResolved,
  className,
}: FinalThresholdProps): JSX.Element {
  const [cardPlays, setCardPlays] = useState<readonly CardPlay[]>([]);
  const [sparkBurns, setSparkBurns] = useState<readonly SparkBurn[]>([]);
  const [reflections, setReflections] = useState<Readonly<Record<string, string>>>({});
  const [outcome, setOutcome] = useState<FinalThresholdResult | null>(null);

  const cardsRemainingByPlayer = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const player of state.players) {
      const consumed = cardPlays
        .filter((p) => p.playerId === player.id)
        .map((p) => p.arcanumNumber);
      const remaining = [...player.hand];
      for (const c of consumed) {
        const idx = remaining.indexOf(c);
        if (idx !== -1) remaining.splice(idx, 1);
      }
      map.set(player.id, remaining);
    }
    return map;
  }, [state.players, cardPlays]);

  const sparksRemainingByPlayer = useMemo(() => {
    const map = new Map<string, SefirahKey[]>();
    for (const player of state.players) {
      const burned = sparkBurns
        .filter((b) => b.playerId === player.id)
        .map((b) => b.sefirah);
      const remaining = [...player.sparksHeld].filter(
        (s) => !burned.includes(s),
      );
      map.set(player.id, remaining);
    }
    return map;
  }, [state.players, sparkBurns]);

  // Each spark burn = +1 illumination per the spark-spent event delta.
  const projectedIllumination = state.illumination + sparkBurns.length;
  const target = state.separation + REQUIRED_ILLUMINATION_MARGIN;
  const gap = target - projectedIllumination;

  const playCard = (playerId: string, arcanumNumber: number): void => {
    setCardPlays((prev) => [...prev, { playerId, arcanumNumber }]);
  };

  const burnSpark = (playerId: string, sefirah: SefirahKey): void => {
    setSparkBurns((prev) => [...prev, { playerId, sefirah }]);
  };

  const setReflection = (playerId: string, text: string): void => {
    setReflections((prev) => ({ ...prev, [playerId]: text }));
  };

  const handleResolve = (): void => {
    // Guard against double-fire — even though the button switches to
    // JourneySummary on outcome, a fast double-click in concurrent
    // mode could land twice in the same tick. `resolveFinalThreshold`
    // is pure, but firing `onResolved` twice would have the
    // orchestrator apply the result twice.
    if (outcome !== null) return;
    const result = resolveFinalThreshold({
      state,
      cardPlays,
      sparkBurns,
    });
    setOutcome(result);
    onResolved(result);
  };

  const allAtKether = useMemo(
    () => state.players.every((p) => p.position === 'kether'),
    [state.players],
  );

  if (outcome !== null) {
    return (
      <div data-final-threshold data-resolved className={className}>
        <JourneySummary
          state={state}
          outcome={outcome}
          reflections={reflections}
        />
      </div>
    );
  }

  return (
    <section
      data-final-threshold
      aria-label="Final Threshold ritual"
      className={`relative mx-auto max-w-3xl text-veil ${className ?? ''}`}
    >
      <header className="mb-6 text-center">
        <h2 className="font-display text-3xl tracking-widest">
          The Final Threshold
        </h2>
        <p className="mt-2 italic opacity-80">
          You stand at Kether. What you brought, you lay down here.
        </p>
        {!allAtKether ? (
          <p className="mt-2 text-xs uppercase tracking-widest text-pillar-severity">
            Waiting: not all players are at Kether
          </p>
        ) : null}
      </header>

      <ProgressBar
        illumination={state.illumination}
        projected={projectedIllumination}
        target={target}
        gap={gap}
      />

      <ol role="list" data-player-list className="mt-6 space-y-4">
        {state.players.map((player) => {
          const remainingCards = cardsRemainingByPlayer.get(player.id) ?? [];
          const remainingSparks = sparksRemainingByPlayer.get(player.id) ?? [];
          return (
            <li
              key={player.id}
              data-player={player.id}
              className="rounded border border-veil/30 p-4"
            >
              <header className="flex items-baseline justify-between">
                <h3 className="font-display tracking-widest">{player.name}</h3>
                <span className="text-xs uppercase tracking-widest opacity-60">
                  {remainingCards.length} card{remainingCards.length === 1 ? '' : 's'} ·{' '}
                  {remainingSparks.length} spark{remainingSparks.length === 1 ? '' : 's'}
                </span>
              </header>

              <div className="mt-3 flex flex-wrap gap-2">
                {remainingCards.map((arcanum) => {
                  const arc = arcanumByNumber(arcanum);
                  return (
                    <button
                      key={arcanum}
                      type="button"
                      onClick={() => playCard(player.id, arcanum)}
                      data-action="play-card"
                      data-arcanum={arcanum}
                      className="rounded border border-veil/40 px-3 py-1 text-xs hover:border-illumination"
                    >
                      Play {arc.name}
                    </button>
                  );
                })}
                {remainingCards.length === 0 ? (
                  <span className="text-xs opacity-50">Cards spent.</span>
                ) : null}
              </div>

              {remainingSparks.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {remainingSparks.map((sefirah) => (
                    <button
                      key={sefirah}
                      type="button"
                      onClick={() => burnSpark(player.id, sefirah)}
                      data-action="burn-spark"
                      data-sefirah={sefirah}
                      className="rounded border border-illumination/60 px-3 py-1 text-xs text-illumination hover:bg-illumination/10"
                    >
                      Burn {sefirahByKey(sefirah).englishName} Spark (+1 Illumination)
                    </button>
                  ))}
                </div>
              ) : null}

              <label className="mt-3 block text-xs">
                <span className="block uppercase tracking-widest opacity-60">
                  Reflection (optional)
                </span>
                <textarea
                  data-reflection={player.id}
                  value={reflections[player.id] ?? ''}
                  onChange={(e) => setReflection(player.id, e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded border border-veil/30 bg-ground/40 p-2 text-veil"
                  placeholder="One sentence. What did this journey bring you?"
                />
              </label>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 flex justify-center">
        <button
          type="button"
          onClick={handleResolve}
          disabled={!allAtKether}
          data-action="resolve"
          className="rounded bg-illumination px-6 py-3 font-display tracking-widest text-ground disabled:cursor-not-allowed disabled:opacity-30"
        >
          Resolve the Threshold
        </button>
      </div>
    </section>
  );
}

interface ProgressBarProps {
  readonly illumination: number;
  readonly projected: number;
  readonly target: number;
  readonly gap: number;
}

function ProgressBar({
  illumination,
  projected,
  target,
  gap,
}: ProgressBarProps): JSX.Element {
  return (
    <div
      data-threshold-progress
      role="status"
      aria-live="polite"
      aria-label={
        gap <= 0
          ? `Illumination ${projected}, target ${target}, threshold cleared`
          : `Illumination ${projected}, target ${target}, ${gap} more needed`
      }
      className="rounded border border-veil/30 bg-ground/40 p-3"
    >
      <div className="flex items-baseline justify-between text-sm">
        <span className="opacity-70">Illumination</span>
        <span className="font-display text-2xl tabular-nums">
          <span data-projected>{projected}</span>
          <span className="opacity-50"> / </span>
          <span data-target>{target}</span>
        </span>
      </div>
      <p className="mt-1 text-xs opacity-60">
        {illumination !== projected
          ? `${illumination} now, +${projected - illumination} from sparks burned`
          : `${illumination} now`}
        {' · '}
        {gap <= 0 ? (
          <span className="text-illumination" data-gap-status="closed">
            Threshold cleared
          </span>
        ) : (
          <span data-gap-status="open">{gap} more needed</span>
        )}
      </p>
    </div>
  );
}
