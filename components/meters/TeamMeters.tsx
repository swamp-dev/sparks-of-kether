'use client';
import { useEffect, useRef, useState } from 'react';
import { SEPARATION_LOSS_THRESHOLD } from '@/engine/endgame';
import type { PillarStreakState } from '@/engine/types';
import { IlluminationMeter } from './IlluminationMeter';
import {
  SeparationMeter,
  SHELL_THRESHOLDS as SEPARATION_SHELL_THRESHOLDS,
} from './SeparationMeter';
import { PillarStreakStrip } from './PillarStreakStrip';

/**
 * Team-wide Illumination / Separation tracker — composition wrapper.
 *
 * Two meters side-by-side:
 *   - **Illumination** as rising light (gold gradient + caustic
 *     shimmer + tiferet halo at the leading edge).
 *   - **Separation** as descending shadow (dark gradient + smoke
 *     overlay + binah halo + threshold marks at +3/+6/+9/+12 with
 *     Hebrew Shell-letter hints).
 *
 * Below the row, an optional pillar-streak triptych renders three
 * chevrons (Mercy / Balance / Severity) with the active streak's
 * chevron filled.
 *
 * Both meters share `max = SEPARATION_LOSS_THRESHOLD = 15` so visual
 * heights are commensurable — the win condition is "Illumination ≥
 * Separation + 5" and a side-by-side comparison is the natural
 * mental model.
 *
 * `aria-live="polite"` on the announcement region means screen-reader
 * users hear "Illumination 8 of 15" deltas without being interrupted.
 *
 * Sound hooks (`onIlluminationIncrease` / `onSeparationIncrease`) are
 * forwarded to the per-meter components — wired for #321 sound design,
 * silent today.
 */

// Re-exported for tests + downstream callers that want to know which
// thresholds are decorated. Sourced from `SeparationMeter` (which is
// the canonical owner) so a future change there is the only edit.
export const SHELL_THRESHOLDS = SEPARATION_SHELL_THRESHOLDS;

interface TeamMetersProps {
  readonly illumination: number;
  readonly separation: number;
  readonly pillarStreak?: PillarStreakState;
  readonly max?: number;
  /**
   * Hooks for future sound design (#321). Both fire once per upward
   * delta after mount; downward and equal changes are skipped.
   */
  readonly onIlluminationIncrease?: (delta: number) => void;
  readonly onSeparationIncrease?: (delta: number) => void;
  readonly className?: string;
}

export function TeamMeters({
  illumination,
  separation,
  pillarStreak,
  max = SEPARATION_LOSS_THRESHOLD,
  onIlluminationIncrease,
  onSeparationIncrease,
  className,
}: TeamMetersProps): JSX.Element {
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
    <div data-team-meters className={`flex flex-col gap-3${className ? ` ${className}` : ''}`}>
      <div data-meters-row className="flex justify-center gap-8">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs uppercase tracking-widest opacity-70">Illumination</span>
          {/* Conditional spread is required under
              `exactOptionalPropertyTypes: true` — passing `undefined`
              explicitly would violate the optional-but-not-undefined
              contract on the child's prop type. */}
          <IlluminationMeter
            value={illumination}
            max={max}
            {...(onIlluminationIncrease ? { onIlluminationIncrease } : {})}
          />
          <span data-meter-readout="illumination" className="font-display text-sm tabular-nums">
            {illumination} / {max}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="text-xs uppercase tracking-widest opacity-70">Separation</span>
          <SeparationMeter
            value={separation}
            max={max}
            {...(onSeparationIncrease ? { onSeparationIncrease } : {})}
          />
          <span data-meter-readout="separation" className="font-display text-sm tabular-nums">
            {separation} / {max}
          </span>
        </div>
      </div>

      {pillarStreak ? <PillarStreakStrip state={pillarStreak} /> : null}

      <p role="status" aria-live="polite" data-meters-announcement className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
