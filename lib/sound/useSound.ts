'use client';
import { useCallback, useRef } from 'react';
import { CUE_FILES, type SoundCue } from './cues';
import { useSoundEnabled } from './settings';

/**
 * `useSound` — fire-and-forget UI sound cues (#321).
 *
 * Returns `{ playSound }`. Call `playSound(cue)` from anywhere a
 * gameplay event fires (Spark collected, encounter passed, …).
 *
 * Behaviours:
 *   1. **Honors settings.** When `soundEnabled === false` (the default),
 *      `playSound` is a pure no-op. No `Audio` is constructed, no
 *      decode work happens; the game stays silent.
 *
 *   2. **Lazy-loads + caches.** The first call for a given cue
 *      constructs an `Audio(...)` element, kept in a per-component
 *      ref. Subsequent calls clone that element with `cloneNode` so
 *      overlapping cues (two Sparks collected within the same tick)
 *      don't truncate one another. The src in `public/audio/` is
 *      served once, then re-decoded for each clone.
 *
 *   3. **Throttled per cue.** Spam protection. At most
 *      `MAX_REPEATS_PER_WINDOW` plays of the same cue inside any
 *      `REPEAT_WINDOW_MS` window. Different cues don't share a
 *      window — Spark-collected and Card-drawn within the same 500
 *      ms both play. (Gameplay events that fire fast in succession
 *      are usually for visual reasons — meter ticks, multi-card
 *      draws — and a cluster of identical chimes reads as a glitch,
 *      not as feedback.)
 *
 *   4. **Reduced-motion.** Handled at the SETTINGS layer, not here.
 *      The hook just respects whatever `soundEnabled` resolves to.
 *      Per `docs/motion.md` § Reduced motion: a user who has signalled
 *      "do less" gets `soundEnabled` defaulted to `false`; if they
 *      explicitly turn sound on in the settings popover, that
 *      override sticks.
 *
 *   5. **Silent in SSR.** `typeof window === 'undefined'` → no-op.
 *      Server renders never construct an `Audio`.
 *
 * The returned `playSound` is stable across renders (memoized via
 * `useCallback` with no caller-facing deps); call sites can pass it
 * to `useEffect` deps without thrashing.
 */

export const REPEAT_WINDOW_MS = 500;
export const MAX_REPEATS_PER_WINDOW = 3;
const DEFAULT_VOLUME = 0.6;

interface UseSoundReturn {
  readonly playSound: (cue: SoundCue) => void;
}

export function useSound(): UseSoundReturn {
  const { sfxEnabled } = useSoundEnabled();
  const cacheRef = useRef<Partial<Record<SoundCue, HTMLAudioElement>>>({});
  // Per-cue play timestamps (ms since epoch). Bounded by
  // MAX_REPEATS_PER_WINDOW + 1 entries — we drop entries older than
  // REPEAT_WINDOW_MS on every call so the array never grows unbounded.
  const recentRef = useRef<Partial<Record<SoundCue, number[]>>>({});

  // Mirror the setting into a ref so the returned `playSound` stays
  // stable across renders (no need to invalidate the callback when
  // the toggle flips). The closure reads the ref's current value at
  // call time.
  const enabledRef = useRef(sfxEnabled);
  enabledRef.current = sfxEnabled;

  const playSound = useCallback((cue: SoundCue): void => {
    if (!enabledRef.current) return;
    if (typeof window === 'undefined') return;

    const now = Date.now();
    const recentForCue = recentRef.current[cue] ?? [];
    // Drop timestamps older than the window so the count reflects
    // only "recent" plays.
    const fresh = recentForCue.filter((t) => now - t < REPEAT_WINDOW_MS);
    if (fresh.length >= MAX_REPEATS_PER_WINDOW) {
      // Persist the trimmed list (no new entry) so the next call's
      // window is correct.
      recentRef.current[cue] = fresh;
      return;
    }
    fresh.push(now);
    recentRef.current[cue] = fresh;

    const src = CUE_FILES[cue];
    let cached = cacheRef.current[cue];
    if (cached === undefined) {
      cached = new Audio(src);
      cached.volume = DEFAULT_VOLUME;
      cacheRef.current[cue] = cached;
    }
    // Clone so overlapping plays don't reset the in-flight playhead
    // on the cached element. The clone shares the `src` attribute
    // (one network fetch per cue at the HTTP-cache layer); whether
    // the decoded audio buffer is also shared is a browser-internal
    // detail — Chrome and Safari typically reuse the decode, mobile
    // browsers under memory pressure may evict and re-decode. The
    // pragmatic guarantee is "no extra network fetch per clone".
    const clone = cached.cloneNode() as HTMLAudioElement;
    clone.volume = DEFAULT_VOLUME;
    // .play() returns a Promise that resolves once playback starts.
    // We don't await it — sound is fire-and-forget. Some browsers
    // throw synchronously on autoplay-policy violations; the
    // try/catch + .catch on the returned promise both handle that.
    try {
      const p = clone.play();
      // `.play()` returns Promise<void> in modern browsers but is
      // typed loosely; guard the .catch wiring against legacy
      // implementations that returned undefined.
      if (p && typeof p.catch === 'function') {
        p.catch((err: unknown) => {
          if (typeof console !== 'undefined' && console.debug) {
            console.debug(`useSound: play(${cue}) rejected`, err);
          }
        });
      }
    } catch (err) {
      if (typeof console !== 'undefined' && console.debug) {
        console.debug(`useSound: play(${cue}) threw`, err);
      }
    }
  }, []);

  return { playSound };
}
