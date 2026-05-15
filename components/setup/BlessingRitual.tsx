'use client';
import { useEffect, useRef, useState } from 'react';
import { sefirot } from '@/data';
import type { StatKey, ZodiacSignKey } from '@/data';
import type { EncounterAvatarKey } from '@/data/types';
import type { Rng } from '@/engine/rng';
import type { StatSheet } from '@/engine/types';
import {
  dignityRelationship,
  quoteForBlessing,
  type DignityRelationship,
} from '@/engine/sefirah-quote';
import { usePantheon } from '@/lib/settings/pantheon';
import { StatIcon } from '@/components/icons/StatIcon';
import { AvatarPortrait } from '@/components/game/encounter/AvatarPortrait';
import { D6Roll } from '@/components/challenge/D6Roll';
import { RITUAL_COPY } from './ritual-copy';
import { RitualScene } from './RitualScene';
import { RitualLedger } from './RitualLedger';

/**
 * Sefirot-blessing ritual — guided 10-step setup. Players pass
 * through Kether → Malkuth, rolling 3d6 for the stat each Sefirah
 * generates. The ritual is the game's emotional opening; copy and
 * cadence matter as much as the math.
 *
 * Flow per step:
 *   1. Avatar portrait + Sefirah essence line + invocation appear.
 *   2. Player rolls 3d6. The dice animate (RAF-based cycling) then
 *      settle on the actual values; the blessing quote + Next appear
 *      immediately so tests and impatient players aren't blocked.
 *   3. The total reveals; the player clicks **Next** to advance.
 * After Malkuth, a summary screen lists all 10 stats and waits for
 * an explicit "Continue" click before emitting `onComplete(statSheet)`.
 *
 * State machine per step: `'awaiting' → 'rolled'`. The advance click
 * jumps to the next step's `'awaiting'`. The dice `rolling` boolean
 * is a separate animation-only flag — it does not gate the Next button.
 *
 * Pure presentation. The component takes a seeded `rng` so tests can
 * assert exact rolls. Production callers wire the engine's session RNG.
 */

const ROLL_ANIMATION_MS = 700;

interface BlessingRitualProps {
  readonly rng: Rng;
  /**
   * The player's zodiac sign. Required: each Sefirah's blessing line
   * is selected from the per-sign matrix (#252) and tagged with the
   * dignity tier (#254) for tone-styling. Production callers must run
   * the sign-picker phase before mounting BlessingRitual.
   */
  readonly sign: ZodiacSignKey;
  readonly onComplete: (stats: StatSheet) => void;
  readonly className?: string;
}

type StepStatus = 'awaiting' | 'rolled';

interface BlessingRender {
  readonly quote: string;
  readonly tier: DignityRelationship;
}

export function BlessingRitual({
  rng,
  sign,
  onComplete,
  className,
}: BlessingRitualProps): JSX.Element {
  const { pantheon } = usePantheon();
  const [stepIndex, setStepIndex] = useState(0);
  const [stats, setStats] = useState<Partial<Record<StatKey, number>>>({});
  const [stepStatus, setStepStatus] = useState<StepStatus>('awaiting');
  const [lastRoll, setLastRoll] = useState<readonly [number, number, number] | null>(null);
  const [rolling, setRolling] = useState(false);
  const rollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Quote + tier are computed once at roll-time and held in state so
  // they don't re-pick (and consume rng) on every render. Cleared at
  // step advance; never present in the 'awaiting' state.
  const [blessing, setBlessing] = useState<BlessingRender | null>(null);

  // Clear any pending animation timer on unmount.
  useEffect(() => {
    return () => {
      if (rollTimerRef.current !== null) clearTimeout(rollTimerRef.current);
    };
  }, []);

  const finished = stepIndex >= sefirot.length;
  const currentSefirah = finished ? null : sefirot[stepIndex];

  const handleRoll = (): void => {
    if (stepStatus !== 'awaiting') return;
    const a = rng.int(1, 6);
    const b = rng.int(1, 6);
    const c = rng.int(1, 6);
    setLastRoll([a, b, c]);
    setStepStatus('rolled');
    setRolling(true);
    if (rollTimerRef.current !== null) clearTimeout(rollTimerRef.current);
    rollTimerRef.current = setTimeout(() => {
      setRolling(false);
      rollTimerRef.current = null;
    }, ROLL_ANIMATION_MS);
    if (currentSefirah) {
      setStats((prev) => ({ ...prev, [currentSefirah.stat]: a + b + c }));
      // Pick the blessing quote off the same rng — uniform-from-3 per
      // T3's `quoteForBlessing`. Compute the tier separately so the
      // rendered element can carry it for tone-styling.
      setBlessing({
        quote: quoteForBlessing(pantheon.sefirahBlessings, currentSefirah.key, sign, rng),
        tier: dignityRelationship(currentSefirah.key, sign),
      });
    }
  };

  const handleAdvance = (): void => {
    if (stepStatus !== 'rolled') return;
    // Cancel any in-flight animation timer before advancing.
    if (rollTimerRef.current !== null) {
      clearTimeout(rollTimerRef.current);
      rollTimerRef.current = null;
    }
    setStepIndex((i) => i + 1);
    setStepStatus('awaiting');
    setLastRoll(null);
    setBlessing(null);
    setRolling(false);
  };

  // #133: skip-to-summary — roll all remaining Sefirot in one click,
  // preserve any stats already rolled, and jump to the summary screen.
  const handleSkipCeremony = (): void => {
    const fresh: Partial<Record<StatKey, number>> = {};
    for (let i = stepIndex; i < sefirot.length; i++) {
      const s = sefirot[i];
      if (!s) continue;
      if (stats[s.stat] !== undefined) continue;
      fresh[s.stat] = rng.int(1, 6) + rng.int(1, 6) + rng.int(1, 6);
    }
    setStats((prev) => ({ ...prev, ...fresh }));
    setStepIndex(sefirot.length);
    setStepStatus('awaiting');
    setLastRoll(null);
    setBlessing(null);
    setRolling(false);
  };

  // #215: explicit Continue handler. Validates the StatSheet first.
  const handleContinue = (): void => {
    const missing: StatKey[] = [];
    for (const s of sefirot) {
      if (stats[s.stat] === undefined) missing.push(s.stat);
    }
    if (missing.length > 0) {
      throw new Error(`BlessingRitual: missing stats at completion: ${missing.join(', ')}`);
    }
    onComplete(stats as StatSheet);
  };

  if (finished) {
    return (
      <Summary
        stats={stats as StatSheet}
        blessingState={blessing === null ? 'null' : 'set'}
        onContinue={handleContinue}
        className={className}
      />
    );
  }

  if (!currentSefirah) {
    return <p>Ritual complete.</p>;
  }

  // Avatar name for the current Sefirah (kether + malkuth have no
  // commissioned portrait — AvatarPortrait handles the fallback).
  const isEncounterSefirah = currentSefirah.key !== 'kether' && currentSefirah.key !== 'malkuth';
  const avatarName = isEncounterSefirah
    ? pantheon.avatarNames[currentSefirah.key as EncounterAvatarKey].primary
    : undefined;

  const copy = RITUAL_COPY[currentSefirah.key];
  return (
    <section
      data-blessing-ritual
      data-step={stepIndex}
      data-sefirah={currentSefirah.key}
      data-status={stepStatus}
      // #380: explicit observability of the blessing-state invariant.
      data-blessing-state={blessing === null ? 'null' : 'set'}
      aria-label={`Blessing ritual, step ${stepIndex + 1} of ${sefirot.length}: ${currentSefirah.englishName}`}
      className={`mx-auto max-w-5xl ${className ?? ''}`}
    >
      <RitualScene color={currentSefirah.color} sefirahKey={currentSefirah.key} />

      {/*
        Three-column layout at md+: avatar portrait (left) | ceremony
        (centre) | ledger (right). Single column on mobile — avatar,
        then ceremony text, then ledger — preserving the natural reading
        order for small screens.
      */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_2fr_1fr] md:items-start md:gap-8">
        {/* Left: Sefirah avatar portrait */}
        <div className="flex flex-col items-center gap-2 md:items-end md:pt-8">
          <AvatarPortrait
            sefirah={currentSefirah.key}
            {...(avatarName !== undefined ? { avatarName } : {})}
            state={stepStatus === 'awaiting' ? 'prep' : 'pass'}
            size="stage"
          />
          <span
            data-sefirah-stat-label
            aria-hidden="true"
            className="text-[0.65rem] uppercase tracking-[0.25em] opacity-70"
          >
            {currentSefirah.stat}
          </span>
        </div>

        {/* Centre: ceremony — step counter, name, essence, dice, Roll, Skip */}
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest opacity-60">
            Step {stepIndex + 1} of {sefirot.length}
          </p>

          <h2 className="mt-3 font-display text-3xl tracking-widest" data-sefirah-name>
            {currentSefirah.englishName}
          </h2>
          <p
            className="mt-1 font-hebrew text-2xl"
            lang="he"
            style={{ direction: 'rtl', unicodeBidi: 'isolate' }}
          >
            {currentSefirah.hebrewName}
          </p>

          <p className="mt-4 italic opacity-80" data-essence>
            &ldquo;{copy.essence}&rdquo;
            <span className="mt-2 block text-sm not-italic opacity-90" data-invocation>
              {copy.invocation}
            </span>
          </p>

          <div className="mt-6 flex flex-col items-center gap-3">
            {stepStatus === 'awaiting' ? (
              <button
                type="button"
                onClick={handleRoll}
                data-action="roll"
                className="rounded bg-illumination px-6 py-2 font-display tracking-widest text-ground"
              >
                Roll 3d6
              </button>
            ) : null}

            {stepStatus === 'rolled' && lastRoll ? (
              <RollDisplay
                roll={lastRoll}
                stat={currentSefirah.stat}
                blessing={blessing}
                sefirahColor={currentSefirah.color}
                rolling={rolling}
                onAdvance={handleAdvance}
              />
            ) : null}

            <button
              type="button"
              onClick={handleSkipCeremony}
              data-action="skip-ceremony"
              className="mt-4 text-xs uppercase tracking-widest opacity-50 hover:opacity-80"
            >
              Hasten the rite — roll the rest at once
            </button>
          </div>
        </div>

        {/* Right: running ledger */}
        <RitualLedger stats={stats} currentIndex={stepIndex} />
      </div>
    </section>
  );
}

interface RollDisplayProps {
  readonly roll: readonly [number, number, number];
  readonly stat: StatKey;
  readonly blessing: BlessingRender | null;
  readonly sefirahColor: string;
  readonly rolling: boolean;
  readonly onAdvance: () => void;
}

function RollDisplay({
  roll,
  stat,
  blessing,
  sefirahColor,
  rolling,
  onAdvance,
}: RollDisplayProps): JSX.Element {
  const total = roll[0] + roll[1] + roll[2];
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-3">
      <div
        data-roll
        aria-label={`Rolled ${roll[0]} + ${roll[1]} + ${roll[2]} = ${total}`}
        className="flex gap-3"
      >
        {roll.map((d, i) => (
          <D6Roll
            key={i}
            value={d}
            rolling={rolling}
            durationMs={ROLL_ANIMATION_MS}
            announceToAt={false}
            className="h-14 w-14"
          />
        ))}
      </div>
      <p data-stat-total={stat} className="font-display text-3xl tabular-nums text-illumination">
        {total}
      </p>
      {blessing ? (
        <blockquote
          data-blessing-quote
          data-dignity-tier={blessing.tier}
          className="mt-2 max-w-prose px-4 text-center text-sm italic leading-relaxed opacity-90"
          style={{ color: sefirahColor }}
        >
          {blessing.quote}
        </blockquote>
      ) : null}
      <button
        type="button"
        onClick={onAdvance}
        data-action="advance"
        className="rounded border border-illumination px-4 py-2 text-sm tracking-widest"
      >
        Next
      </button>
    </div>
  );
}

function Summary({
  stats,
  blessingState,
  onContinue,
  className,
}: {
  stats: StatSheet;
  blessingState: 'set' | 'null';
  onContinue: () => void;
  className: string | undefined;
}): JSX.Element {
  return (
    <section
      data-blessing-ritual
      data-status="complete"
      data-blessing-state={blessingState}
      aria-label="Blessing ritual complete; final stats"
      className={`mx-auto max-w-md text-center ${className ?? ''}`}
    >
      <h2 className="font-display text-2xl tracking-widest">The Tree has spoken.</h2>
      <p className="mt-2 text-sm opacity-70">Your blessings:</p>
      <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 text-left">
        {sefirot.map((s) => (
          <div
            key={s.key}
            className="flex items-center gap-2 rounded px-2 py-1"
            data-summary-row={s.stat}
          >
            <span className="text-veil opacity-80">
              <StatIcon stat={s.stat} className="h-5 w-5" />
            </span>
            <dt className="flex-1 text-sm capitalize">{s.stat}</dt>
            <dd data-summary-value={s.stat} className="font-display tabular-nums">
              {stats[s.stat]}
            </dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        onClick={onContinue}
        data-action="continue"
        className="mt-6 rounded bg-illumination px-6 py-2 font-display tracking-widest text-ground"
      >
        Continue
      </button>
    </section>
  );
}
