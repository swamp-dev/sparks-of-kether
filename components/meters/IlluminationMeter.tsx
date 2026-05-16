'use client';
import { useEffect, useRef } from 'react';
import { GROUND } from '@/data/colors';

/**
 * IlluminationMeter — vertical, rising-light meter.
 *
 * The Illumination meter is **light the team kindles**, not battery
 * juice. The fill is a tiferet-gold gradient column with:
 *
 *   - A thin tiferet-gold rim around the trough.
 *   - A caustic shimmer (slow `motion-safe:animate-breath` on the
 *     gradient overlay) so the column reads as living warmth rather
 *     than flat fill.
 *   - A halo on the top edge of the fill (`shadow-glow-tiferet`) that
 *     lights up when there is *any* fill. Intensity reads through
 *     opacity scaling with the value ratio.
 *   - On a value tick (prop change) the fill animates with `ease-emerge`
 *     over 700 ms. The caller can attach to `onIlluminationIncrease`
 *     for sound (this component fires the callback once per upward
 *     change after mount; downward and equal changes are skipped).
 *
 * Uses `motion-safe:` for all atmospheric loops so reduced-motion users
 * see the static halo, not the cycling shimmer.
 *
 * Per `docs/motion.md` § Reduced motion.
 */

interface IlluminationMeterProps {
  readonly value: number;
  readonly max: number;
  /**
   * Fired when `value` increases from one render to the next. Wired
   * for future sound design (#321) — this component never produces
   * audio itself.
   */
  readonly onIlluminationIncrease?: (delta: number) => void;
  readonly className?: string;
}

// Living-light gradient: deep gold floor → bright kether-white peak.
// Reads as "the light is brighter at the top" — the column has a
// natural focal point rather than a uniform fill.
const FILL_GRADIENT = 'linear-gradient(to top, #a87c00 0%, #ffd700 60%, #fff5cc 100%)';
// Caustic-shimmer overlay — a soft highlight band that sits on top of
// the base gradient. `mix-blend-mode: screen` brightens midtones; the
// `animate-breath` keyframe pulses its opacity so the column reads as
// living warmth rather than flat fill. Position-stable (no per-frame
// paint cost; only opacity changes on the GPU compositor).
const SHIMMER_GRADIENT =
  'linear-gradient(to top, rgba(255,245,204,0) 0%, rgba(255,245,204,0.35) 50%, rgba(255,245,204,0) 100%)';

export function IlluminationMeter({
  value,
  max,
  onIlluminationIncrease,
  className,
}: IlluminationMeterProps): JSX.Element {
  // Hooks must run on every render path (rules of hooks). The `max`
  // guard is enforced AFTER the hook calls so a downstream caller
  // wrapped in an ErrorBoundary can recover with corrected props
  // without leaving the prevRef stale.
  const prevRef = useRef(value);
  useEffect(() => {
    const prev = prevRef.current;
    if (value > prev && onIlluminationIncrease) {
      onIlluminationIncrease(value - prev);
    }
    prevRef.current = value;
  }, [value, onIlluminationIncrease]);

  if (max <= 0) {
    throw new Error(`IlluminationMeter: max must be > 0; received ${max}`);
  }

  const clamped = Math.max(0, Math.min(max, value));
  const ratio = clamped / max;
  const ariaLabel = `Illumination: ${clamped} of ${max}`;

  // Halo intensity follows the fill ratio. At ratio=0 the halo
  // disappears entirely (opacity:0), so an unlit meter doesn't carry
  // a stray glow. The underlying `shadow-glow-tiferet` recipe is
  // already three stacked shadows; no need to scale beyond its
  // baseline.

  return (
    <div
      role="meter"
      aria-label={ariaLabel}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={max}
      data-meter-bar="illumination"
      className={`relative h-32 w-12 ${className ?? ''}`}
    >
      {/* Trough — tiferet-gold rim, void interior. */}
      <div
        className="absolute inset-0 rounded-md border border-tiferet/60"
        style={{
          backgroundColor: GROUND,
          // Inner depth so the column doesn't read as a sticker.
          boxShadow: 'inset 0 0 6px rgba(0,0,0,0.45)',
        }}
      />

      {/* Fill column — rises from the bottom. `ease-emerge` over 700ms
          per ticket; transition runs on every value change so a tick
          reads as "the light arrived" rather than "the bar moved." */}
      <div
        data-meter-fill
        className="absolute bottom-0 left-0 w-full overflow-hidden rounded-md transition-[height] duration-700 ease-emerge"
        style={{
          height: `${(ratio * 100).toFixed(2)}%`,
          background: FILL_GRADIENT,
        }}
      >
        {/* Caustic shimmer — gold highlight band that breathes via
            `animate-breath`. Reduced-motion users get the static
            highlight (no breath cycle) per `motion-safe:`. */}
        <div
          aria-hidden="true"
          data-illumination-shimmer
          className="pointer-events-none absolute inset-0 motion-safe:animate-breath"
          style={{
            background: SHIMMER_GRADIENT,
            mixBlendMode: 'screen',
          }}
        />
      </div>

      {/* Halo — sits on the top edge of the fill column. Intensity
          reads through `opacity` scaled by the fill ratio. The underlying
          `shadow-glow-tiferet` is the per-Sefirah glow recipe from #311.
          When fill is 0, halo opacity is 0 → the glow disappears, so
          the meter reads as "unlit". */}
      <div
        aria-hidden="true"
        data-illumination-halo
        className="pointer-events-none absolute left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-tiferet/40 shadow-glow-tiferet transition-[bottom,opacity] duration-700 ease-emerge"
        style={{
          bottom: `calc(${(ratio * 100).toFixed(2)}% - 2px)`,
          opacity: ratio,
        }}
      />
    </div>
  );
}
