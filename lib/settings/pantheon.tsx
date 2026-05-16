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

import { pantheons, type Pantheon, type PantheonId } from '@/data/pantheons';

/**
 * Pantheon settings store (#548 — Phase A2 of Epic #293).
 *
 * One slot: `pantheonId`. Persists to `localStorage` so the user's
 * choice survives reloads. The provider is mounted once at the app
 * root; `usePantheon()` reads it from any descendant.
 *
 * Pattern is intentionally identical to `lib/sound/settings.tsx`:
 * SSR-safe lazy initializer, post-mount re-sync, no-op stub when no
 * provider is mounted (so unit tests can render without a wrapper).
 *
 * The hook returns the full `Pantheon` object — a single registry
 * lookup, computed once per change, so consumers don't each re-do it.
 * The `pantheonId` is also exposed for components that only need the
 * id (e.g. settings UI radios).
 *
 * Forward-compat: the stored id is preserved verbatim even if the
 * registry doesn't know it yet, so a "future" id (e.g. `'egyptian'`
 * before Phase B1 lands) survives reloads. The `pantheon` payload
 * falls back to greco-roman so consumers never receive `undefined`.
 * C1 (#557) will validate the id at the user-facing toggle.
 *
 * Stack note: same rationale as the sound settings store — the project
 * has no global state library yet (Zustand is on the stack table for
 * later); a React Context provider is functionally equivalent at this
 * scale and avoids stack drift.
 */

export const PANTHEON_STORAGE_KEY = 'sok.pantheonId';

const DEFAULT_PANTHEON_ID: PantheonId = 'greco-roman';

interface PantheonSettingsContextValue {
  /** The stored id, possibly an id the registry doesn't know yet. */
  readonly pantheonId: string;
  /** Resolved pantheon — falls back to greco-roman for unknown ids. */
  readonly pantheon: Pantheon;
  readonly setPantheonId: (next: string) => void;
}

const PantheonSettingsContext = createContext<PantheonSettingsContextValue | null>(null);

interface PantheonSettingsProviderProps {
  readonly children: ReactNode;
}

/**
 * Read the initial `pantheonId` from `localStorage` if present;
 * otherwise return the default. Runs INSIDE `useState`'s lazy
 * initializer so the first render's value is correct without a
 * flash from default → stored value.
 *
 * Returns the default on the server (SSR has no `localStorage`); the
 * `useEffect` in the provider re-syncs on mount.
 */
function readInitialId(): string {
  if (typeof window === 'undefined') return DEFAULT_PANTHEON_ID;
  try {
    const stored = window.localStorage.getItem(PANTHEON_STORAGE_KEY);
    if (stored && stored.length > 0) return stored;
  } catch {
    // localStorage can throw in private-browsing modes / quota
    // exceeded. Fall through to the default.
  }
  return DEFAULT_PANTHEON_ID;
}

function resolvePantheon(id: string): Pantheon {
  const found = (pantheons as Readonly<Record<string, Pantheon>>)[id];
  return found ?? pantheons[DEFAULT_PANTHEON_ID];
}

export function PantheonSettingsProvider({ children }: PantheonSettingsProviderProps): JSX.Element {
  const [pantheonId, setPantheonIdState] = useState<string>(readInitialId);

  // Re-sync on mount in case the SSR-rendered initial (default) is
  // overridden by a stored client-side preference. Mirrors the
  // SoundSettingsProvider pattern — the initial render commits the
  // SSR value; without this effect the post-hydration render would
  // still show the default.
  useEffect(() => {
    const next = readInitialId();
    setPantheonIdState((prev) => (prev === next ? prev : next));
  }, []);

  const setPantheonId = useCallback((next: string) => {
    setPantheonIdState(next);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(PANTHEON_STORAGE_KEY, next);
      } catch {
        // localStorage write can throw under quota / private-mode.
        // Drop the write silently — the in-memory state still
        // reflects the user's choice for this session.
      }
    }
  }, []);

  const value = useMemo(
    (): PantheonSettingsContextValue => ({
      pantheonId,
      pantheon: resolvePantheon(pantheonId),
      setPantheonId,
    }),
    [pantheonId, setPantheonId],
  );

  return (
    <PantheonSettingsContext.Provider value={value}>{children}</PantheonSettingsContext.Provider>
  );
}

/**
 * Read the current pantheon setting + setter.
 *
 * If no `<PantheonSettingsProvider />` is mounted up-tree, returns a
 * no-op stub: `pantheonId = 'greco-roman'`, `pantheon = the greco-roman
 * Pantheon`, `setPantheonId` is a no-op. In production the provider is
 * mounted at `app/layout.tsx`, so this defensive branch only kicks in
 * for unit tests that mount a pantheon-consuming component without
 * the wrapper.
 */
export function usePantheon(): PantheonSettingsContextValue {
  const ctx = useContext(PantheonSettingsContext);
  if (ctx === null) {
    return DEFAULT_STUB_VALUE;
  }
  return ctx;
}

const DEFAULT_STUB_VALUE: PantheonSettingsContextValue = {
  pantheonId: DEFAULT_PANTHEON_ID,
  pantheon: pantheons[DEFAULT_PANTHEON_ID],
  setPantheonId: () => undefined,
};
