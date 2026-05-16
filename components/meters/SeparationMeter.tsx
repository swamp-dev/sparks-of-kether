'use client';
import { useEffect, useRef } from 'react';
import { GROUND } from '@/data/colors';
import { MAX_ACTIVATIONS, SHELL_THRESHOLD_STEP } from '@/engine/shells';

/**
 * SeparationMeter — vertical, descending-shadow meter.
 *
 * Inverts the metaphor: where Illumination is light **rising** from
 * the bottom, Separation is shadow **descending** from the top. The
 * fill column is anchored to the top of the trough and grows
 * downward with the value.
 *
 * Threshold marks at +3, +6, +9, +12 (every `SHELL_THRESHOLD_STEP`)
 * are rendered as faint horizontal lines on the meter, each tagged
 * with the Hebrew first-letter of the Sefirah whose Shell would
 * awaken next from that threshold (canonical descending order:
 * Malkuth, Yesod, Hod, Netzach — bottom-up Tree of Life, since the
 * `pickNextShellTarget` rule with all dormant + 0 sparks tie-breaks
 * by Sefirah number descending).
 *
 * Atmosphere:
 *   - Gevurah-red rim around the trough.
 *   - Subtle smoke/ink texture inside the descending column — a slow
 *     ~10s opacity loop on a tinted gradient overlay (`motion-safe:`).
 *   - Halo at the bottom edge of the descending column uses
 *     `shadow-glow-binah` (deep blue-violet, Binah = form-giver,
 *     saturnian dark) so the depth reads as "shadow encroaching" not
 *     "red bar growing."
 *
 * Tick: fill descends with `ease-flow` over 700ms — a heavier easing
 * than Illumination's `ease-emerge` to match the symbolic weight of
 * shadow.
 *
 * `onSeparationIncrease` fires once per upward delta — sound hook for
 * #321; this component is silent.
 *
 * Per `docs/motion.md` § Reduced motion.
 */

export const SHELL_THRESHOLDS: readonly number[] = Array.from(
  { length: MAX_ACTIVATIONS },
  (_, i) => (i + 1) * SHELL_THRESHOLD_STEP,
);

/**
 * Hebrew first-letter hints for each Shell-awakening threshold.
 * Order matches `pickNextShellTarget` with all-dormant Shells and 0
 * team Sparks — tie-breaks by Sefirah number descending, so the order
 * is Malkuth → Yesod → Hod → Netzach.
 *
 * Callers needing dynamic order (e.g. Sefirot already cleared so a
 * different Shell is next) can pass `nextShellHints` to override.
 */
export const DEFAULT_SHELL_HINTS: readonly { letter: string; name: string }[] = [
  { letter: 'מ', name: 'Inertia (Malkuth)' },
  { letter: 'י', name: 'Illusion (Yesod)' },
  { letter: 'ה', name: 'Deception (Hod)' },
  { letter: 'נ', name: 'Obsession (Netzach)' },
];

interface SeparationMeterProps {
  readonly value: number;
  readonly max: number;
  readonly nextShellHints?: readonly { letter: string; name: string }[];
  /**
   * Fired when `value` increases from one render to the next. Hook
   * for sound design (#321); this component is silent by default.
   */
  readonly onSeparationIncrease?: (delta: number) => void;
  readonly className?: string;
}

// Descending-shadow gradient: top = darker, bottom = soft purple-grey
// fade. Reads as ink falling into the indigo void rather than a red
// bar growing.
const FILL_GRADIENT = 'linear-gradient(to bottom, #1a1a2e 0%, #2c1f3d 60%, #4a3a5e 100%)';
// Smoke overlay: a lower-contrast tinted highlight that pulses slowly
// via the breath keyframe (used through arbitrary-value animation
// duration: ~10s instead of the default 6s named animation, per the
// ticket's "very slow ~10s loop" guidance).
const SMOKE_GRADIENT =
  'linear-gradient(to bottom, rgba(75,0,130,0.25) 0%, rgba(220,20,60,0.10) 50%, rgba(75,0,130,0.25) 100%)';

export function SeparationMeter({
  value,
  max,
  nextShellHints = DEFAULT_SHELL_HINTS,
  onSeparationIncrease,
  className,
}: SeparationMeterProps): JSX.Element {
  // Hooks before guard (rules of hooks). See companion comment in
  // IlluminationMeter.tsx.
  const prevRef = useRef(value);
  useEffect(() => {
    const prev = prevRef.current;
    if (value > prev && onSeparationIncrease) {
      onSeparationIncrease(value - prev);
    }
    prevRef.current = value;
  }, [value, onSeparationIncrease]);

  if (max <= 0) {
    throw new Error(`SeparationMeter: max must be > 0; received ${max}`);
  }

  const clamped = Math.max(0, Math.min(max, value));
  const ratio = clamped / max;
  const ariaLabel = `Separation: ${clamped} of ${max}`;

  return (
    <div
      role="meter"
      aria-label={ariaLabel}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={max}
      data-meter-bar="separation"
      className={`relative h-32 w-12 ${className ?? ''}`}
    >
      {/* Trough — gevurah-red rim, void interior with inner shadow. */}
      <div
        className="absolute inset-0 rounded-md border border-gevurah/60"
        style={{
          backgroundColor: GROUND,
          boxShadow: 'inset 0 0 6px rgba(0,0,0,0.45)',
        }}
      />

      {/* Fill column — descends from the top. Heavier `ease-flow` per
          ticket, slower than Illumination's emerge. */}
      <div
        data-meter-fill
        className="absolute left-0 top-0 w-full overflow-hidden rounded-md transition-[height] duration-700 ease-flow"
        style={{
          height: `${(ratio * 100).toFixed(2)}%`,
          background: FILL_GRADIENT,
        }}
      >
        {/* Smoke / ink texture — slow ~10s opacity loop on a tinted
            gradient. Authored as the named `breath` keyframe but with
            an arbitrary `[animation-duration:10000ms]` so it runs
            slower than the standard 6s breath. Behind `motion-safe:`
            so reduced-motion users get the static smoke layer. */}
        <div
          aria-hidden="true"
          data-separation-smoke
          className="pointer-events-none absolute inset-0 motion-safe:animate-breath motion-safe:[animation-duration:10000ms]"
          style={{
            background: SMOKE_GRADIENT,
            mixBlendMode: 'multiply',
          }}
        />
      </div>

      {/* Bottom-edge halo — sits on the descending column's leading
          edge. `shadow-glow-binah` (indigo) reads as "depth / form"
          on the void, where a red Gevurah halo would just look like
          a glowing battery. Opacity scales with ratio. */}
      <div
        aria-hidden="true"
        data-separation-halo
        className="pointer-events-none absolute left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-binah/30 shadow-glow-binah transition-[top,opacity] duration-700 ease-flow"
        style={{
          top: `calc(${(ratio * 100).toFixed(2)}% - 2px)`,
          opacity: ratio,
        }}
      />

      {/* Threshold markers + Hebrew Shell-letter hints. Each line sits
          inside the trough at its proportional height, with a Hebrew
          letter to the right indicating the next-Shell-to-awake from
          that threshold. The lines render even when the threshold is
          past — they teach the meter's structure throughout the game. */}
      {SHELL_THRESHOLDS.map((t, i) => {
        const hint = nextShellHints[i];
        const reached = clamped >= t;
        return (
          <div
            key={t}
            data-shell-threshold={t}
            data-shell-reached={reached ? 'true' : 'false'}
            className="pointer-events-none absolute left-0 right-0"
            style={{ top: `${(t / max) * 100}%` }}
            aria-hidden="true"
          >
            {/* Faint horizontal line across the trough. Brightens
                slightly when reached so the player feels the meter's
                structure rebuild as it climbs. */}
            <div
              className="h-px w-full"
              style={{
                backgroundColor: reached
                  ? 'rgba(248, 248, 255, 0.55)'
                  : 'rgba(248, 248, 255, 0.25)',
              }}
            />
            {hint ? (
              <span
                className="absolute font-hebrew text-[10px] leading-none text-veil/70 sm:text-[11px]"
                style={{
                  left: '105%',
                  top: '0',
                  transform: 'translateY(-50%)',
                }}
                title={hint.name}
              >
                {hint.letter}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
