'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * Sound settings store (#321, #76).
 *
 * Two independent toggles:
 *   - `sfxEnabled`   — Sound effects. Default ON. SFX fire on user
 *     gestures (clicks), so defaulting ON is not hostile; the browser's
 *     autoplay policy is not triggered.
 *   - `musicEnabled` — Ambient music. Default OFF. Music auto-plays in
 *     useEffects (outside the gesture chain), so we keep it opt-in to
 *     avoid auto-playing audio on first visit.
 *
 * Both persist to `localStorage` under stable keys. On first visit (no
 * stored preference) they resolve to their respective defaults.
 *
 * Reduced-motion: if the user has `prefers-reduced-motion: reduce` and
 * no stored preference, SFX also defaults OFF — a user who has
 * signalled "do less" should not be greeted by chimes. A stored
 * preference always wins over the reduced-motion heuristic.
 */

export const SFX_ENABLED_STORAGE_KEY = 'sok.sfxEnabled';
export const MUSIC_ENABLED_STORAGE_KEY = 'sok.musicEnabled';

interface SoundSettingsContextValue {
  readonly sfxEnabled: boolean;
  readonly setSfxEnabled: (next: boolean) => void;
  readonly musicEnabled: boolean;
  readonly setMusicEnabled: (next: boolean) => void;
}

const SoundSettingsContext = createContext<SoundSettingsContextValue | null>(null);

interface SoundSettingsProviderProps {
  readonly children: ReactNode;
}

function hasReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function readSfxInitial(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = window.localStorage.getItem(SFX_ENABLED_STORAGE_KEY);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
  } catch {
    /* localStorage can throw in private-browsing / quota exceeded */
  }
  // No stored preference: defer to reduced-motion heuristic.
  if (hasReducedMotion()) return false;
  return true; // SFX default: ON
}

function readMusicInitial(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = window.localStorage.getItem(MUSIC_ENABLED_STORAGE_KEY);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
  } catch {
    /* ignore */
  }
  return false; // Music default: OFF (ambient auto-play is hostile by default)
}

function unlockAudioContext(): void {
  if (typeof window === 'undefined') return;
  try {
    const unlock = new Audio();
    const p = unlock.play();
    if (p && typeof p.catch === 'function') p.catch(() => undefined);
  } catch {
    /* ignore */
  }
}

function persist(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, value ? 'true' : 'false');
  } catch {
    /* ignore quota / private-browsing errors */
  }
}

export function SoundSettingsProvider({ children }: SoundSettingsProviderProps): JSX.Element {
  const [sfxEnabled, setSfxState] = useState<boolean>(readSfxInitial);
  const [musicEnabled, setMusicState] = useState<boolean>(readMusicInitial);

  // Re-sync on mount in case SSR-rendered initial differs from stored value.
  useEffect(() => {
    const sfx = readSfxInitial();
    const music = readMusicInitial();
    setSfxState((prev) => (prev === sfx ? prev : sfx));
    setMusicState((prev) => (prev === music ? prev : music));
  }, []);

  const setSfxEnabled = useCallback((next: boolean) => {
    setSfxState(next);
    if (typeof window !== 'undefined') {
      if (next) {
        // Unlock browser audio context synchronously inside the gesture
        // window so subsequent playSound() calls (in effects, outside
        // the gesture chain) are accepted by Chrome/Safari autoplay policy.
        unlockAudioContext();
      }
      persist(SFX_ENABLED_STORAGE_KEY, next);
    }
  }, []);

  const setMusicEnabled = useCallback((next: boolean) => {
    setMusicState(next);
    if (typeof window !== 'undefined') {
      if (next) {
        // Same unlock needed for music: useMusic plays in a useEffect,
        // which is outside any gesture chain.
        unlockAudioContext();
      }
      persist(MUSIC_ENABLED_STORAGE_KEY, next);
    }
  }, []);

  const value = useMemo(
    (): SoundSettingsContextValue => ({
      sfxEnabled,
      setSfxEnabled,
      musicEnabled,
      setMusicEnabled,
    }),
    [sfxEnabled, setSfxEnabled, musicEnabled, setMusicEnabled],
  );

  return <SoundSettingsContext.Provider value={value}>{children}</SoundSettingsContext.Provider>;
}

/**
 * Read the current sound settings + setters.
 *
 * Safe default when no `<SoundSettingsProvider />` is mounted up-tree:
 * both flags OFF, setters are no-ops. Sound is opt-in by design, so a
 * missing provider keeps the game quiet rather than crashing unit tests
 * that mount a sound-consuming component without the wrapper.
 */
export function useSoundEnabled(): SoundSettingsContextValue {
  const ctx = useContext(SoundSettingsContext);
  if (ctx === null) {
    return DEFAULT_DISABLED_VALUE;
  }
  return ctx;
}

const DEFAULT_DISABLED_VALUE: SoundSettingsContextValue = {
  sfxEnabled: false,
  setSfxEnabled: () => undefined,
  musicEnabled: false,
  setMusicEnabled: () => undefined,
};
