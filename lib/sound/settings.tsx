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
 * Sound settings store (#321).
 *
 * One toggle: `soundEnabled`. Persists to `localStorage` so the user's
 * choice survives reloads. The provider is mounted once at the app
 * root; `useSoundEnabled()` reads it from any descendant.
 *
 * Defaults:
 *   - OFF when there is no stored preference. Auto-playing audio in
 *     a browser tab is hostile by default; the player has to opt in.
 *   - OFF when the user has `prefers-reduced-motion: reduce` set,
 *     even with no stored preference. A user who has signalled "do
 *     less" should not be greeted by chimes; they can flip the
 *     toggle in Settings if they want them.
 *   - The stored preference WINS over the reduced-motion default —
 *     so a reduced-motion user who has explicitly turned sound on
 *     keeps sound on. (#321 spec: "user can override.")
 *
 * Stack note: the project has no global state library yet (the
 * stack table in CLAUDE.md lists Zustand as a future choice but it
 * is not installed). A React Context provider is functionally
 * equivalent at this scale and avoids a stack drift. If Zustand
 * lands later, this can become one slice.
 */

export const SOUND_ENABLED_STORAGE_KEY = 'sok.soundEnabled';

interface SoundSettingsContextValue {
  readonly soundEnabled: boolean;
  readonly setSoundEnabled: (next: boolean) => void;
}

const SoundSettingsContext = createContext<SoundSettingsContextValue | null>(null);

interface SoundSettingsProviderProps {
  readonly children: ReactNode;
}

/**
 * Read the initial `soundEnabled` value from `localStorage` if
 * present; otherwise fall back to the reduced-motion-aware default.
 *
 * Runs INSIDE `useState`'s lazy initializer so the first render's
 * value is correct without a flash from `false` → stored value.
 *
 * Returns `false` on the server (SSR has no `localStorage` and no
 * `window.matchMedia`). The `useEffect` below re-syncs on mount in
 * case the client's stored preference differs.
 */
function readInitial(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = window.localStorage.getItem(SOUND_ENABLED_STORAGE_KEY);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
  } catch {
    // localStorage can throw in private-browsing modes / quota
    // exceeded. Fall through to the default.
  }
  // No stored preference: respect prefers-reduced-motion if available.
  if (typeof window.matchMedia === 'function') {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mql.matches) return false;
  }
  return false;
}

export function SoundSettingsProvider({ children }: SoundSettingsProviderProps): JSX.Element {
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(readInitial);

  // Re-sync on mount in case the SSR-rendered initial (`false`) is
  // overridden by a stored client-side preference. Without this,
  // the first client-side render after hydration would still show
  // false; the initial render commits the SSR value, and `useState`'s
  // lazy initializer re-runs only on remount.
  useEffect(() => {
    const next = readInitial();
    setSoundEnabledState((prev) => (prev === next ? prev : next));
  }, []);

  const setSoundEnabled = useCallback((next: boolean) => {
    setSoundEnabledState(next);
    if (typeof window !== 'undefined') {
      if (next) {
        // Unlock the browser audio context synchronously while we are
        // still inside the click event's user-activation window.
        // Without this, every subsequent playSound() call (fired from
        // useEffect, outside the gesture chain) is silently rejected by
        // Chrome/Safari autoplay policy on sites with low MEI.
        try {
          const unlock = new Audio();
          const p = unlock.play();
          if (p && typeof p.catch === 'function') p.catch(() => undefined);
        } catch {
          /* ignore */
        }
      }
      try {
        window.localStorage.setItem(SOUND_ENABLED_STORAGE_KEY, next ? 'true' : 'false');
      } catch {
        // localStorage write can throw under quota / private-mode.
        // Drop the write silently — the in-memory state still
        // reflects the user's choice for this session.
      }
    }
  }, []);

  const value = useMemo(
    (): SoundSettingsContextValue => ({ soundEnabled, setSoundEnabled }),
    [soundEnabled, setSoundEnabled],
  );

  return <SoundSettingsContext.Provider value={value}>{children}</SoundSettingsContext.Provider>;
}

/**
 * Read the current sound setting + setter.
 *
 * If no `<SoundSettingsProvider />` is mounted up-tree, returns a
 * silent-OFF stub: `soundEnabled = false`, `setSoundEnabled` is a
 * no-op. This is the safe default — sound is opt-in by design, so
 * a missing provider effectively keeps the game quiet.
 *
 * In production the provider is mounted at `app/layout.tsx`, so
 * this defensive branch only kicks in for unit tests that mount
 * a sound-consuming component without the wrapper.
 */
export function useSoundEnabled(): SoundSettingsContextValue {
  const ctx = useContext(SoundSettingsContext);
  if (ctx === null) {
    return DEFAULT_DISABLED_VALUE;
  }
  return ctx;
}

const DEFAULT_DISABLED_VALUE: SoundSettingsContextValue = {
  soundEnabled: false,
  setSoundEnabled: () => undefined,
};
