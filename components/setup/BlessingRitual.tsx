'use client';
import { useEffect, useState } from 'react';
import { sefirot } from '@/data';
import type { StatKey } from '@/data';
import type { Rng } from '@/engine/rng';
import type { StatSheet } from '@/engine/types';
import { StatIcon } from '@/components/icons/StatIcon';
import { RITUAL_COPY } from './ritual-copy';

/**
 * Sefirot-blessing ritual — guided 10-step setup. Players pass
 * through Kether → Malkuth, rolling 3d6 for the stat each Sefirah
 * generates. The ritual is the game's emotional opening; copy and
 * cadence matter as much as the math.
 *
 * Flow per step:
 *   1. Sefirah essence line + invocation appear.
 *   2. Player rolls 3d6 (or auto-rolls when entering the step;
 *      configurable later).
 *   3. The total reveals; "Receive this blessing" advances.
 * After Malkuth, a summary screen lists all 10 stats and emits
 * `onComplete(statSheet)`.
 *
 * State machine per step: `'awaiting' → 'rolled' → 'received'`. The
 * received → next-step transition happens on the advance click.
 *
 * Pure presentation. The component takes a seeded `rng` so tests can
 * assert exact rolls. Production callers wire the engine's session
 * RNG.
 */

interface BlessingRitualProps {
  readonly rng: Rng;
  readonly onComplete: (stats: StatSheet) => void;
  readonly className?: string;
}

type StepStatus = 'awaiting' | 'rolled' | 'received';

export function BlessingRitual({
  rng,
  onComplete,
  className,
}: BlessingRitualProps): JSX.Element {
  const [stepIndex, setStepIndex] = useState(0);
  const [stats, setStats] = useState<Partial<Record<StatKey, number>>>({});
  const [stepStatus, setStepStatus] = useState<StepStatus>('awaiting');
  const [lastRoll, setLastRoll] = useState<readonly [number, number, number] | null>(null);

  const finished = stepIndex >= sefirot.length;
  const currentSefirah = finished ? null : sefirot[stepIndex];

  const handleRoll = (): void => {
    if (stepStatus !== 'awaiting') return;
    const a = rng.int(1, 6);
    const b = rng.int(1, 6);
    const c = rng.int(1, 6);
    setLastRoll([a, b, c]);
    setStepStatus('rolled');
    if (currentSefirah) {
      setStats((prev) => ({ ...prev, [currentSefirah.stat]: a + b + c }));
    }
  };

  const handleAdvance = (): void => {
    if (stepStatus !== 'rolled') return;
    // Reset for the next step. `onComplete` fires from the effect
    // below once `stepIndex` reaches `sefirot.length`, so React has
    // committed all the pending state updates before the parent sees
    // the final stats. Doing it here, mid-handler, would risk
    // interleaving with parent re-renders triggered synchronously
    // from the callback.
    setStepIndex((i) => i + 1);
    setStepStatus('awaiting');
    setLastRoll(null);
  };

  // Fire onComplete exactly once when the ritual finishes. Validates
  // that every stat is present before casting — the type system can't
  // prove it, but this throws loudly if a future regression skips a
  // step instead of silently passing an incomplete StatSheet to
  // downstream code.
  useEffect(() => {
    if (stepIndex < sefirot.length) return;
    const missing: StatKey[] = [];
    for (const s of sefirot) {
      if (stats[s.stat] === undefined) missing.push(s.stat);
    }
    if (missing.length > 0) {
      throw new Error(
        `BlessingRitual: missing stats at completion: ${missing.join(', ')}`,
      );
    }
    onComplete(stats as StatSheet);
    // Intentionally omitting `stats` and `onComplete` from deps —
    // we want this to fire exactly once when stepIndex crosses the
    // boundary, not whenever the parent passes a new callback ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  if (finished) {
    return (
      <Summary
        stats={stats as StatSheet}
        className={className}
      />
    );
  }

  if (!currentSefirah) {
    // Defensive — `finished` already checks this, but TypeScript wants
    // the narrow.
    return <p>Ritual complete.</p>;
  }

  const copy = RITUAL_COPY[currentSefirah.key];
  return (
    <section
      data-blessing-ritual
      data-step={stepIndex}
      data-sefirah={currentSefirah.key}
      data-status={stepStatus}
      aria-label={`Blessing ritual, step ${stepIndex + 1} of ${sefirot.length}: ${currentSefirah.englishName}`}
      className={`mx-auto max-w-md text-center ${className ?? ''}`}
    >
      <p className="text-xs uppercase tracking-widest opacity-60">
        Step {stepIndex + 1} of {sefirot.length}
      </p>
      <h2 className="mt-2 font-display text-3xl tracking-widest" data-sefirah-name>
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
        “{copy.essence}”
      </p>
      <p className="mt-3 text-sm opacity-70" data-invocation>
        {copy.invocation}
      </p>

      <div className="mt-6 flex flex-col items-center gap-3">
        <span className="text-veil opacity-80">
          <StatIcon stat={currentSefirah.stat} className="h-8 w-8" />
        </span>
        <span className="text-xs uppercase tracking-widest opacity-70">
          Stat: {currentSefirah.stat}
        </span>

        {stepStatus === 'awaiting' ? (
          <button
            type="button"
            onClick={handleRoll}
            data-action="roll"
            className="rounded bg-illumination px-4 py-2 font-display tracking-widest text-ground"
          >
            Roll 3d6
          </button>
        ) : null}

        {stepStatus === 'rolled' && lastRoll ? (
          <RollDisplay
            roll={lastRoll}
            stat={currentSefirah.stat}
            onAdvance={handleAdvance}
          />
        ) : null}
      </div>
    </section>
  );
}

interface RollDisplayProps {
  readonly roll: readonly [number, number, number];
  readonly stat: StatKey;
  readonly onAdvance: () => void;
}

function RollDisplay({ roll, stat, onAdvance }: RollDisplayProps): JSX.Element {
  const total = roll[0] + roll[1] + roll[2];
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-2"
    >
      <div
        data-roll
        aria-label={`Rolled ${roll[0]} + ${roll[1]} + ${roll[2]} = ${total}`}
        className="flex gap-2 text-2xl"
      >
        {roll.map((d, i) => (
          <span
            key={i}
            className="flex h-10 w-10 items-center justify-center rounded border border-veil/40 font-display tabular-nums"
          >
            {d}
          </span>
        ))}
      </div>
      <p
        data-stat-total={stat}
        className="font-display text-3xl tabular-nums text-illumination"
      >
        {total}
      </p>
      <button
        type="button"
        onClick={onAdvance}
        data-action="advance"
        className="rounded border border-illumination px-4 py-2 text-sm tracking-widest"
      >
        Receive this blessing
      </button>
    </div>
  );
}

function Summary({
  stats,
  className,
}: {
  stats: StatSheet;
  className: string | undefined;
}): JSX.Element {
  return (
    <section
      data-blessing-ritual
      data-status="complete"
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
            <dt className="flex-1 capitalize text-sm">{s.stat}</dt>
            <dd
              data-summary-value={s.stat}
              className="font-display tabular-nums"
            >
              {stats[s.stat]}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
