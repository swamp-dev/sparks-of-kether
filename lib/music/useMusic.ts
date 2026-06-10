'use client';
import { useEffect } from 'react';
import { useMusicContext, type AmbientTrack } from './MusicProvider';

export type { AmbientTrack } from './MusicProvider';

/**
 * Plays a looping ambient track while the component is mounted (#26).
 *
 * Delegates entirely to `MusicProvider` for audio management. The
 * provider owns the single `<audio>` element, crossfade timers, the
 * musicEnabled toggle, and tab-visibility pausing. This hook just
 * declares which track the current screen needs.
 *
 * Transition semantics:
 *   - Different track from current → 1.5 s linear crossfade.
 *   - Same track already playing → no-op (no gap, no restart).
 *   - No explicit stop on unmount: the provider keeps the audio alive
 *     until the next `playMusic` call replaces it, so route-to-route
 *     navigation that calls `useMusic` on both sides crossfades cleanly.
 */
export function useMusic(track: AmbientTrack): void {
  const { playMusic } = useMusicContext();

  useEffect(() => {
    playMusic(track);
  }, [track, playMusic]);
}
