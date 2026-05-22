'use client';
import { useCallback, useRef } from 'react';
import { useSoundEnabled } from '@/lib/sound/settings';

interface UseVoiceReturn {
  readonly playVoice: (path: string) => void;
  readonly stopVoice: () => void;
}

export function useVoice(): UseVoiceReturn {
  const { voiceEnabled } = useSoundEnabled();

  // Mirror setting into a ref so the stable callbacks always read
  // the current value without needing voiceEnabled in their deps.
  const enabledRef = useRef(voiceEnabled);
  enabledRef.current = voiceEnabled;

  // Currently-playing audio element (exclusive playback).
  const currentRef = useRef<HTMLAudioElement | null>(null);
  // Per-path cache: reuse (reset currentTime) instead of cloning —
  // voice clips are 3-10s; cloning would be wasteful.
  const cacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const playVoice = useCallback((path: string): void => {
    if (!enabledRef.current) return;
    if (typeof window === 'undefined') return;

    // Interrupt any in-flight voice.
    if (currentRef.current) {
      currentRef.current.pause();
      currentRef.current.currentTime = 0;
    }

    let audio = cacheRef.current.get(path);
    if (!audio) {
      audio = new Audio(path);
      audio.preload = 'none';
      cacheRef.current.set(path, audio);
    }

    currentRef.current = audio;

    try {
      const p = audio.play();
      if (p && typeof p.catch === 'function') {
        p.catch((err: unknown) => {
          if (typeof console !== 'undefined' && console.debug) {
            console.debug(`useVoice: play(${path}) rejected`, err);
          }
        });
      }
    } catch (err) {
      if (typeof console !== 'undefined' && console.debug) {
        console.debug(`useVoice: play(${path}) threw`, err);
      }
    }
  }, []);

  const stopVoice = useCallback((): void => {
    if (currentRef.current) {
      currentRef.current.pause();
    }
  }, []);

  return { playVoice, stopVoice };
}
