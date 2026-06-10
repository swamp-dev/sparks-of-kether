'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { useSoundEnabled } from '@/lib/sound/settings';
import type { SefirahKey } from '@/data/types';
import { encounterTrackFor } from './manifest';

/**
 * Ambient music engine (#26).
 *
 * Architecture: a single provider at the app level owns one `<audio>`
 * element. Components call `useMusic(track)` to declare which track
 * they need; the provider handles crossfades, the enabled toggle, and
 * tab-visibility pausing.
 *
 * Crossfade design: when `playMusic` receives a different track from
 * the currently playing one, the new audio starts at volume 0 while
 * the old audio fades to 0 over CROSSFADE_STEPS × CROSSFADE_INTERVAL_MS
 * (default 15 × 100 ms = 1.5 s). After the final step the old element
 * is paused and discarded.
 *
 * No-op guarantee: calling `playMusic` with the same track that is
 * already playing is a strict no-op — no new element is created, no
 * audible gap.
 */

export type AmbientTrack = 'lobby' | 'play' | 'blessing' | SefirahKey;

const SEFIRAH_KEYS: ReadonlySet<string> = new Set([
  'kether',
  'chokmah',
  'binah',
  'chesed',
  'gevurah',
  'tiferet',
  'netzach',
  'hod',
  'yesod',
  'malkuth',
]);

export const MUSIC_VOLUME = 0.35;
const CROSSFADE_STEPS = 15;
export const CROSSFADE_INTERVAL_MS = 100; // 15 × 100 ms = 1.5 s total

export function trackUrl(track: AmbientTrack): string {
  if (SEFIRAH_KEYS.has(track)) {
    return encounterTrackFor(track as SefirahKey);
  }
  return `/audio/${track}.mp3`;
}

interface MusicContextValue {
  readonly playMusic: (track: AmbientTrack) => void;
  readonly stopMusic: () => void;
}

const MusicContext = createContext<MusicContextValue>({
  playMusic: () => undefined,
  stopMusic: () => undefined,
});

export function useMusicContext(): MusicContextValue {
  return useContext(MusicContext);
}

interface MusicProviderProps {
  readonly children: ReactNode;
}

export function MusicProvider({ children }: MusicProviderProps): JSX.Element {
  const { musicEnabled } = useSoundEnabled();
  const enabledRef = useRef(musicEnabled);
  enabledRef.current = musicEnabled;

  // Single long-lived audio element for the current track.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Track key that audioRef is playing (or was last asked to play).
  const currentTrackRef = useRef<AmbientTrack | null>(null);
  // Previous audio element still fading out during a crossfade.
  const fadingRef = useRef<HTMLAudioElement | null>(null);
  // setInterval handle for the active crossfade.
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cancelFade = useCallback((): void => {
    if (fadeTimerRef.current !== null) {
      clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    if (fadingRef.current !== null) {
      fadingRef.current.pause();
      fadingRef.current = null;
    }
  }, []);

  const playMusic = useCallback(
    (track: AmbientTrack): void => {
      if (typeof window === 'undefined') return;

      // Same-track no-op: already playing this track — just ensure it's
      // unpaused (in case the user had the tab hidden or disabled music).
      if (track === currentTrackRef.current && audioRef.current !== null) {
        if (enabledRef.current && audioRef.current.paused) {
          const p = audioRef.current.play();
          if (p?.catch) p.catch(() => undefined);
        }
        return;
      }

      // Cancel any in-progress crossfade before starting a new one.
      cancelFade();

      const outgoing = audioRef.current;
      currentTrackRef.current = track;

      const incoming = new Audio(trackUrl(track));
      incoming.loop = true;
      audioRef.current = incoming;

      if (!enabledRef.current) {
        // Music disabled: set volume but don't call play(). The
        // musicEnabled effect will call play() when the user enables.
        incoming.volume = MUSIC_VOLUME;
        if (outgoing !== null) outgoing.pause();
        return;
      }

      if (outgoing !== null) {
        // Crossfade: incoming starts silent, both fade over 1.5 s.
        incoming.volume = 0;
        const p = incoming.play();
        if (p?.catch) p.catch(() => undefined);

        fadingRef.current = outgoing;
        let step = 0;
        const timer = setInterval(() => {
          step++;
          const ratio = step / CROSSFADE_STEPS;
          incoming.volume = Math.min(MUSIC_VOLUME * ratio, MUSIC_VOLUME);
          outgoing.volume = Math.max(MUSIC_VOLUME * (1 - ratio), 0);
          if (step >= CROSSFADE_STEPS) {
            clearInterval(timer);
            fadeTimerRef.current = null;
            outgoing.pause();
            fadingRef.current = null;
          }
        }, CROSSFADE_INTERVAL_MS);
        fadeTimerRef.current = timer;
      } else {
        // First track: start immediately at target volume.
        incoming.volume = MUSIC_VOLUME;
        const p = incoming.play();
        if (p?.catch) p.catch(() => undefined);
      }
    },
    [cancelFade],
  );

  const stopMusic = useCallback((): void => {
    cancelFade();
    if (audioRef.current !== null) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    currentTrackRef.current = null;
  }, [cancelFade]);

  // Pause / resume current audio when the musicEnabled setting changes.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (musicEnabled) {
      // Normalize volume — a cancelled mid-crossfade may have left the
      // element at an intermediate level (e.g. 0.10 of 0.35).
      audio.volume = MUSIC_VOLUME;
      const p = audio.play();
      if (p?.catch) p.catch(() => undefined);
    } else {
      cancelFade();
      audio.pause();
    }
  }, [musicEnabled, cancelFade]);

  // Pause when the tab goes hidden; resume when it comes back.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const handleVisibility = (): void => {
      const audio = audioRef.current;
      if (!audio) return;
      if (document.hidden) {
        audio.pause();
      } else if (enabledRef.current) {
        const p = audio.play();
        if (p?.catch) p.catch(() => undefined);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return (): void => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Cleanup: pause everything when the provider unmounts.
  useEffect(() => {
    return (): void => {
      cancelFade();
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [cancelFade]);

  const value = useMemo(
    (): MusicContextValue => ({ playMusic, stopMusic }),
    [playMusic, stopMusic],
  );

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}
