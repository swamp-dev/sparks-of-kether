'use client';
import { useEffect, useRef, useState } from 'react';
import { D6 } from '@/components/tokens/D6';

/**
 * Animated d6 wrapper — parallel to D20Roll.tsx. When `rolling` flips
 * true the die cycles through random faces for `durationMs`, then
 * settles on `value`. Uses requestAnimationFrame; honours
 * prefers-reduced-motion.
 *
 * Pure presentation. Roll math lives upstream; this component just
 * animates the reveal.
 */

interface D6RollProps {
  /** Final value to settle on (1..6). */
  readonly value: number;
  /** Animate through random faces when true, show final value when false. */
  readonly rolling: boolean;
  /** Total animation duration in ms; default 700. */
  readonly durationMs?: number;
  /**
   * When false, suppress the built-in role="status"/aria-live so a
   * parent live region can own the announcement instead. Default true.
   * Set to false when composing multiple D6Rolls inside an outer
   * aria-live container to avoid nested live-region noise.
   */
  readonly announceToAt?: boolean;
  readonly className?: string;
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function D6Roll({
  value,
  rolling,
  durationMs = 700,
  announceToAt = true,
  className,
}: D6RollProps): JSX.Element {
  const [displayed, setDisplayed] = useState<number>(value);
  // `settled` drives the D6 gold-glow settle keyframe after the spin.
  // D20Roll omits this flag because the challenge D20 doesn't glow;
  // this is an intentional divergence, not an oversight.
  const [settled, setSettled] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!rolling) {
      setDisplayed(value);
      setSettled(true);
      return;
    }
    setSettled(false);
    const reduce =
      typeof window !== 'undefined' && window.matchMedia?.(REDUCED_MOTION_QUERY).matches;
    if (reduce) {
      setDisplayed(value);
      setSettled(true);
      return;
    }

    const start = performance.now();
    const tick = (now: number): void => {
      const elapsed = now - start;
      if (elapsed >= durationMs) {
        setDisplayed(value);
        setSettled(true);
        rafRef.current = null;
        return;
      }
      setDisplayed(1 + Math.floor(Math.random() * 6));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [rolling, value, durationMs]);

  return (
    <div
      data-d6-roll
      data-rolling={rolling ? 'true' : 'false'}
      {...(announceToAt
        ? {
            role: 'status' as const,
            'aria-live': 'polite' as const,
            'aria-label': rolling ? 'Rolling…' : `Rolled ${value}`,
          }
        : {})}
      className={className}
    >
      <D6 value={displayed} rolled={settled && !rolling} className="h-full w-full" />
    </div>
  );
}
