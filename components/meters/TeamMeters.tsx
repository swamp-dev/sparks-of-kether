'use client';
import { useEffect, useRef, useState } from 'react';
import { Meter } from '@/components/icons/Meter';
import { TIFERET_GOLD } from '@/data/colors';
import { MAX_ACTIVATIONS, SHELL_THRESHOLD_STEP } from '@/engine/shells';
import { SEPARATION_LOSS_THRESHOLD } from '@/engine/endgame';
import type { PillarStreakState } from '@/engine/types';

/**
 * Team-wide Illumination / Separation tracker.
 *
 * Two vertical meters side-by-side. The Separation meter overlays
 * Shell-activation threshold markers at {3, 6, 9, 12} (every
 * `SHELL_THRESHOLD_STEP` from 0 up to `MAX_ACTIVATIONS * STEP`) so
 * the team sees how close they are to the next pressure spike.
 *
 * Optional `pillarStreak` renders a small streak readout below the
 * meters: current pillar + the larger of (sameCount, alternationCount)
 * with the threshold (3) implicit.
 *
 * `aria-live="polite"` on the meter labels means screen-reader users
 * hear "Illumination 8 of 15" updates without being interrupted.
 *
 * Both meters share `max = SEPARATION_LOSS_THRESHOLD = 15` so that
 * the visual heights are commensurable — the goal is "Illumination
 * ≥ Separation + 5" and a side-by-side compare is the natural
 * mental model.
 */

export const SHELL_THRESHOLDS: readonly number[] = Array.from(
  { length: MAX_ACTIVATIONS },
  (_, i) => (i + 1) * SHELL_THRESHOLD_STEP,
);

interface TeamMetersProps {
  readonly illumination: number;
  readonly separation: number;
  readonly pillarStreak?: PillarStreakState;
  readonly max?: number;
  readonly className?: string;
}

export function TeamMeters({
  illumination,
  separation,
  pillarStreak,
  max = SEPARATION_LOSS_THRESHOLD,
  className,
}: TeamMetersProps): JSX.Element {
  // aria-live region for the human-readable summary. Updating it on
  // every value change is what makes the meter "speak" deltas. The
  // `<p>` carries `role="status"` + `aria-live="polite"` directly,
  // no ref needed.
  const [announcement, setAnnouncement] = useState('');

  const prevRef = useRef({ illumination, separation });
  useEffect(() => {
    const prev = prevRef.current;
    const dIllum = illumination - prev.illumination;
    const dSep = separation - prev.separation;
    if (dIllum !== 0 || dSep !== 0) {
      const parts: string[] = [];
      if (dIllum !== 0) {
        parts.push(`Illumination ${dIllum > 0 ? '+' : ''}${dIllum} (now ${illumination})`);
      }
      if (dSep !== 0) {
        parts.push(`Separation ${dSep > 0 ? '+' : ''}${dSep} (now ${separation})`);
      }
      setAnnouncement(parts.join(', '));
    }
    prevRef.current = { illumination, separation };
  }, [illumination, separation]);

  return (
    <div
      data-team-meters
      className={`flex flex-col gap-3 ${className ?? ''}`}
    >
      <div className="flex gap-6">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs uppercase tracking-widest opacity-70">
            Illumination
          </span>
          <Meter
            value={illumination}
            max={max}
            color={TIFERET_GOLD}
            label="Illumination"
            orientation="vertical"
            className="h-32 w-4"
          />
          <span
            data-meter-readout="illumination"
            className="font-display text-sm tabular-nums"
          >
            {illumination} / {max}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="text-xs uppercase tracking-widest opacity-70">
            Separation
          </span>
          <SeparationMeterWithThresholds
            value={separation}
            max={max}
          />
          <span
            data-meter-readout="separation"
            className="font-display text-sm tabular-nums"
          >
            {separation} / {max}
          </span>
        </div>
      </div>

      {pillarStreak ? <PillarStreak state={pillarStreak} /> : null}

      <p
        role="status"
        aria-live="polite"
        data-meters-announcement
        className="sr-only"
      >
        {announcement}
      </p>
    </div>
  );
}

function SeparationMeterWithThresholds({
  value,
  max,
}: {
  value: number;
  max: number;
}): JSX.Element {
  return (
    <div className="relative h-32 w-4" data-separation-meter>
      <Meter
        value={value}
        max={max}
        color="#dc143c"
        label="Separation"
        orientation="vertical"
        className="h-full w-full"
      />
      {/* Threshold markers: each Shell activation fires at +3 cumulative
          Separation. Position from the bottom (vertical meter fills
          upward); transforms live entirely in inline `style` so a
          Tailwind utility can't silently override them. */}
      {SHELL_THRESHOLDS.map((t, i) => (
        <span
          key={t}
          data-shell-threshold={t}
          className="pointer-events-none absolute text-[8px] font-display text-veil/70"
          style={{
            bottom: `${(t / max) * 100}%`,
            left: '125%', // sit just outside the meter on the right
            transform: 'translateY(50%)',
          }}
          aria-hidden="true"
          title={`Shell ${i + 1} threshold`}
        >
          {t}
        </span>
      ))}
    </div>
  );
}

type StreakKind = 'imbalance' | 'equilibrium' | 'none';

function PillarStreak({ state }: { state: PillarStreakState }): JSX.Element {
  const same = state.sameCount;
  const alt = state.alternationCount;
  // Fresh state (no moves yet) is "none", not "imbalance" — the
  // engine doesn't consider 0/0 to be a streak in either direction,
  // and labeling it "imbalance" misleads a player who just sat down.
  const dominant: StreakKind =
    same === 0 && alt === 0
      ? 'none'
      : same >= alt
        ? 'imbalance'
        : 'equilibrium';
  const count = Math.max(same, alt);
  const pillar = state.currentPillar ?? 'none';
  return (
    <div
      data-pillar-streak
      data-streak-kind={dominant}
      className="flex items-center gap-2 text-xs opacity-80"
      aria-label={`Pillar streak: ${pillar}, ${dominant} count ${count} of 3`}
    >
      <span className="opacity-60">Pillar streak</span>
      <span className="capitalize" data-pillar-current>
        {pillar}
      </span>
      <span className="font-display tabular-nums">
        <span data-streak-count>{count}</span>/3
      </span>
      <span className="opacity-60">({dominant})</span>
    </div>
  );
}
