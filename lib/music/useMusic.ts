'use client';
import { useEffect, useRef } from 'react';
import { useSoundEnabled } from '@/lib/sound/settings';
import type { SefirahKey } from '@/data/types';
import { encounterTrackFor } from './manifest';

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

const MUSIC_VOLUME = 0.35;

function trackUrl(track: AmbientTrack): string {
  if (SEFIRAH_KEYS.has(track)) {
    return encounterTrackFor(track as SefirahKey);
  }
  return `/audio/${track}.mp3`;
}

/**
 * Play a looping ambient music track (#526).
 *
 * Call once per screen with the appropriate track key. PlayScreen owns
 * the music for both the board view ('play') and the encounter overlay
 * (the sefirah key) — switching the `track` argument switches by
 * pausing the old element and starting a new one. EncounterScreen does
 * not call this hook; PlayScreen selects the track based on phase.
 *
 * Behaviours:
 *   - Silent when `soundEnabled` is false (the default). No Audio
 *     element is constructed until the first play attempt.
 *   - Loops indefinitely (`audio.loop = true`).
 *   - Pauses on unmount and when `soundEnabled` flips to false.
 *   - Resumes (on the same element) when `soundEnabled` flips to true.
 *   - Track changes: old element paused, new element constructed and
 *     played if enabled.
 */
export function useMusic(track: AmbientTrack): void {
  const { musicEnabled } = useSoundEnabled();
  const enabledRef = useRef(musicEnabled);
  enabledRef.current = musicEnabled;
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    // Stop whatever was playing before this track.
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(trackUrl(track));
    audio.loop = true;
    audio.volume = MUSIC_VOLUME;
    audioRef.current = audio;

    if (enabledRef.current) {
      const p = audio.play();
      if (p && typeof p.catch === 'function') {
        p.catch((err: unknown) => {
          if (typeof console !== 'undefined' && console.debug) {
            console.debug(`useMusic: play(${track}) rejected`, err);
          }
        });
      }
    }

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [track]);

  // This effect only responds to musicEnabled changes. `track` is intentionally
  // omitted from the dep array — track changes are fully handled by the effect
  // above (which pauses the old element and starts a new one). Including `track`
  // here would fire an extra pause() or play() against the newly-created element.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (musicEnabled) {
      const p = audio.play();
      if (p && typeof p.catch === 'function') {
        p.catch((err: unknown) => {
          if (typeof console !== 'undefined' && console.debug) {
            console.debug('useMusic: resume rejected', err);
          }
        });
      }
    } else {
      audio.pause();
    }
  }, [musicEnabled]);
}
