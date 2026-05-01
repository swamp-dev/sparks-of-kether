import { useEffect, useState } from 'react';

/**
 * SSR-safe hook for `prefers-reduced-motion: reduce`.
 *
 * Returns `false` during server-render and on the first client render
 * (so SSR-hydration matches), then flips to the actual user preference
 * after mount via a `matchMedia` listener. Subsequent OS-level changes
 * to the preference flip the boolean live.
 *
 * Tailwind's `motion-safe:` / `motion-reduce:` variants cover the
 * majority of CSS-driven animations without any JS — reach for this
 * hook only when you have JS-side branches that need to know the
 * preference (e.g. `requestAnimationFrame`-driven cursor smoothing,
 * setInterval-driven cadence-changes, broadcast throttle).
 *
 * Used by #322 presence wiring to thread reduce-motion through the
 * `usePeerPresence` send-side throttle and the cursor / ring / toast
 * components. Could be promoted to a project-wide utility when a
 * second consumer surfaces.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mql.matches);
    const handler = (event: MediaQueryListEvent): void => {
      setReduceMotion(event.matches);
    };
    mql.addEventListener('change', handler);
    return (): void => {
      mql.removeEventListener('change', handler);
    };
  }, []);

  return reduceMotion;
}
