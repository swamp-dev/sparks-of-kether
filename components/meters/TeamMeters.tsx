'use client';
import { useEffect, useRef, useState } from 'react';
import { GROUND } from '@/data/colors';
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
 * Meter fills are CSS gradients keyed to the meter's Sefirah:
 * Illumination uses a tiferet-gold gradient, Separation uses a
 * binah-charcoal gradient. Bars are 48 px wide so the gradient is
 * legible (a 16 px-wide bar reads as a single tone).
 *
 * Optional `pillarStreak` renders three pillar columns (mercy,
 * severity, balance) below the meters; the current pillar's column
 * fills toward 3 in its pillar colour.
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

const PILLAR_STREAK_THRESHOLD = 3;

// Gradient tokens. Written inline (not as Tailwind utilities) because
// `bg-gradient-to-t from-... to-...` would require committing each
// stop colour as a Tailwind theme entry; inline keeps the design
// surface small.
const ILLUMINATION_GRADIENT = 'linear-gradient(to top, #a87c00 0%, #ffd700 100%)';
// Binah's pure charcoal (#1a1a1a) is ~1.12:1 against the indigo
// ground — invisible at low fills. Floor lifts to a foggy slate so
// 1–2 Separation reads from the start; top stop carries the binah
// identity at peak.
const SEPARATION_GRADIENT = 'linear-gradient(to top, #4a4a5a 0%, #9a9aaa 100%)';

const PILLAR_COLOR: Record<'mercy' | 'severity' | 'balance', string> = {
  mercy: '#4169e1',
  severity: '#dc143c',
  balance: '#ffd700',
};

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
      <div data-meters-row className="flex justify-center gap-8">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs uppercase tracking-widest opacity-70">
            Illumination
          </span>
          <GradientMeterBar
            value={illumination}
            max={max}
            background={ILLUMINATION_GRADIENT}
            label="Illumination"
            data-meter-bar="illumination"
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
          <SeparationMeterWithThresholds value={separation} max={max} />
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

interface GradientMeterBarProps {
  readonly value: number;
  readonly max: number;
  readonly background: string;
  readonly label: string;
  readonly 'data-meter-bar': string;
  readonly children?: React.ReactNode;
}

/**
 * Vertical bar that fills upward with a CSS gradient. Mirrors the
 * shape of `components/icons/Meter` but accepts a `background` value
 * (any CSS background string, including gradients) instead of a flat
 * `color`. Lives inside TeamMeters per ticket scope rather than
 * extending the shared Meter component.
 */
function GradientMeterBar({
  value,
  max,
  background,
  label,
  'data-meter-bar': dataMeterBar,
  children,
}: GradientMeterBarProps): JSX.Element {
  if (max <= 0) {
    throw new Error(`GradientMeterBar: max must be > 0; received ${max}`);
  }
  const clamped = Math.max(0, Math.min(max, value));
  const ratio = clamped / max;
  const ariaLabel = `${label}: ${clamped} of ${max}`;
  return (
    <div
      role="meter"
      aria-label={ariaLabel}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={max}
      data-meter-bar={dataMeterBar}
      className="relative h-32 w-12"
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: GROUND,
          border: '1px solid rgba(248, 248, 255, 0.25)',
          borderRadius: 4,
        }}
      />
      <div
        data-meter-fill
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: '100%',
          height: `${(ratio * 100).toFixed(2)}%`,
          background,
          borderRadius: 4,
          transition: 'height 320ms ease-out',
        }}
      />
      {children}
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
    <GradientMeterBar
      value={value}
      max={max}
      background={SEPARATION_GRADIENT}
      label="Separation"
      data-meter-bar="separation"
    >
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
            left: '105%',
            transform: 'translateY(50%)',
          }}
          aria-hidden="true"
          title={`Shell ${i + 1} threshold`}
        >
          {t}
        </span>
      ))}
    </GradientMeterBar>
  );
}

type StreakKind = 'imbalance' | 'equilibrium' | 'none';
type Pillar = 'mercy' | 'severity' | 'balance';
const PILLARS: readonly Pillar[] = ['mercy', 'severity', 'balance'];

function PillarStreak({ state }: { state: PillarStreakState }): JSX.Element {
  const same = state.sameCount;
  const alt = state.alternationCount;
  // Fresh state (no moves yet) is "none", not "imbalance" — the
  // engine doesn't consider 0/0 to be a streak in either direction,
  // and labeling it "imbalance" misleads a player who just sat down.
  const dominant: StreakKind =
    same === 0 && alt === 0 ? 'none' : same >= alt ? 'imbalance' : 'equilibrium';
  const count = Math.max(same, alt);
  const current = state.currentPillar;
  const fillRatio = Math.min(1, count / PILLAR_STREAK_THRESHOLD);
  return (
    <div
      data-pillar-streak
      data-streak-kind={dominant}
      className="flex flex-col items-center gap-1"
      aria-label={`Pillar streak: ${current ?? 'none'}, ${dominant} count ${count} of ${PILLAR_STREAK_THRESHOLD}`}
    >
      <span className="text-[10px] uppercase tracking-widest opacity-60">
        Pillar streak <span data-pillar-current>{current ?? 'none'}</span>{' '}
        <span className="font-display tabular-nums">
          <span data-streak-count>{count}</span>/{PILLAR_STREAK_THRESHOLD}
        </span>
      </span>
      <div className="flex items-end gap-2">
        {PILLARS.map((pillar) => {
          const isActive = current === pillar && count > 0;
          const ratio = isActive ? fillRatio : 0;
          return (
            <div
              key={pillar}
              data-pillar-column={pillar}
              data-active={isActive ? 'true' : 'false'}
              data-fill-ratio={ratio.toFixed(2)}
              className="flex flex-col items-center gap-0.5"
            >
              <div className="relative h-8 w-3 overflow-hidden rounded-sm border border-veil/20">
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    bottom: 0,
                    width: '100%',
                    height: `${(ratio * 100).toFixed(2)}%`,
                    backgroundColor: PILLAR_COLOR[pillar],
                    transition: 'height 240ms ease-out',
                  }}
                />
              </div>
              <span className="text-[9px] uppercase tracking-widest opacity-50">
                {pillar[0]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
