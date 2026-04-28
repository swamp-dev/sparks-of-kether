import { GROUND } from '@/data/colors';

/**
 * Meter — vertical or horizontal bar that animates its fill from 0 to
 * `value`. Used for the team Illumination and Separation counters.
 *
 * No animation library: a CSS transition on `width`/`height` is
 * enough. Phase 6 may upgrade to Framer Motion when individual
 * delta-pulses become a thing.
 *
 * Bounds: `value` is clamped to [0, max] for both the visual fill
 * and the ARIA `aria-valuenow` / label so screen reader and screen
 * agree (a "25 of 10" mismatch would be confusing). Callers needing
 * overflow semantics (e.g. Separation ≥ 15 ends the game) should
 * detect and react to that condition outside this component, not
 * lean on the meter to communicate it.
 *
 * Sizing: pass dimensions via `className` (Tailwind `h-N` and `w-N`)
 * or via the `style` prop on a wrapper. The meter fills its parent
 * and defaults to 100% on each axis — there's no inline width/height
 * baked in, so a class can always win.
 */

interface MeterProps {
  readonly value: number;
  readonly max: number;
  readonly color: string;
  readonly orientation?: 'vertical' | 'horizontal';
  readonly label: string;
  readonly className?: string;
}

export function Meter({
  value,
  max,
  color,
  orientation = 'vertical',
  label,
  className,
}: MeterProps): JSX.Element {
  if (max <= 0) {
    throw new Error(`Meter: max must be > 0; received ${max}`);
  }
  const clamped = Math.max(0, Math.min(max, value));
  const ratio = clamped / max;
  const fillStyle =
    orientation === 'vertical'
      ? {
          height: `${(ratio * 100).toFixed(2)}%`,
          width: '100%',
          bottom: 0,
          left: 0,
        }
      : {
          width: `${(ratio * 100).toFixed(2)}%`,
          height: '100%',
          top: 0,
          left: 0,
        };
  const ariaLabel = `${label}: ${clamped} of ${max}`;
  return (
    <div
      role="meter"
      aria-label={ariaLabel}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={max}
      data-orientation={orientation}
      style={{ position: 'relative' }}
      className={className}
    >
      {/* Background trough. Color is hardcoded to bg-ground for now —
          `troughColor` prop is a deliberate non-feature until a UI
          surface needs the meter on a non-ground background. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: GROUND,
          border: '1px solid rgba(248, 248, 255, 0.25)',
          borderRadius: 4,
        }}
      />
      {/* Filled portion. CSS transition keeps deltas smooth as `value`
          changes; no JS animation library needed at this stage. */}
      <div
        data-meter-fill
        style={{
          position: 'absolute',
          backgroundColor: color,
          borderRadius: 4,
          transition: `${orientation === 'vertical' ? 'height' : 'width'} 320ms ease-out`,
          ...fillStyle,
        }}
      />
    </div>
  );
}
