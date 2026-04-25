'use client';
import { useEffect, useRef, useState } from 'react';
import { D20 } from '@/components/tokens/D20';

/**
 * Animated d20 wrapper. Pass `value` and a `rolling` flag to drive the
 * animation: when `rolling` flips from false → true, the die cycles
 * through random faces for `durationMs`, then settles on the final
 * `value`. Uses `requestAnimationFrame` so it's jank-free and respects
 * `prefers-reduced-motion`.
 *
 * The component does NOT perform the actual roll — it's a pure
 * presentation layer. The roll math lives in `engine/checks.ts`; this
 * component just animates the reveal once a result is committed.
 */

interface D20RollProps {
  /** Final value to settle on (1..20). */
  readonly value: number;
  /** If true, animate through random faces before settling on `value`. */
  readonly rolling: boolean;
  /** Total animation duration in ms; default 800. */
  readonly durationMs?: number;
  readonly className?: string;
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function D20Roll({
  value,
  rolling,
  durationMs = 800,
  className,
}: D20RollProps): JSX.Element {
  const [displayed, setDisplayed] = useState<number>(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!rolling) {
      setDisplayed(value);
      return;
    }
    // Honor prefers-reduced-motion: skip the cycle and just show the
    // final value. AT users / motion-sensitive users get the result
    // without the visual churn.
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.(REDUCED_MOTION_QUERY).matches;
    if (reduce) {
      setDisplayed(value);
      return;
    }

    const start = performance.now();
    const tick = (now: number): void => {
      const elapsed = now - start;
      if (elapsed >= durationMs) {
        setDisplayed(value);
        rafRef.current = null;
        return;
      }
      // Random face during the spin. The progressive rate-of-change
      // slows toward the end (linear elapsed; visually the eye reads
      // it as deceleration because each frame is a hard switch).
      setDisplayed(1 + Math.floor(Math.random() * 20));
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
      data-d20-roll
      data-rolling={rolling ? 'true' : 'false'}
      role="status"
      aria-live="polite"
      aria-label={rolling ? 'Rolling…' : `Rolled ${value}`}
      className={className}
    >
      <D20 value={displayed} />
    </div>
  );
}
