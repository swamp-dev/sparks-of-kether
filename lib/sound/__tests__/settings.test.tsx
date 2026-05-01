import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

/**
 * Pin the settings store contract (#321):
 *
 *   - `useSoundEnabled()` returns the current setting + a setter.
 *   - Default is OFF (auto-playing audio is a UX trap; opt-in only).
 *   - When `prefers-reduced-motion: reduce`, the default flips to OFF
 *     even without explicit user choice. (User can override.)
 *   - The setter persists to `localStorage` under a stable key so the
 *     next mount reads the user's choice.
 *
 * The provider is `<SoundSettingsProvider />` so consumers can mount
 * a single source of truth at `app/layout.tsx`. Tests render the hook
 * inside a wrapper that mounts the provider once.
 */

import { SoundSettingsProvider, useSoundEnabled, SOUND_ENABLED_STORAGE_KEY } from '../settings';

const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
  <SoundSettingsProvider>{children}</SoundSettingsProvider>
);

const setReducedMotion = (reduce: boolean): void => {
  // jsdom's matchMedia is undefined by default; stub it so the
  // provider's mount-time read can resolve.
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion: reduce') ? reduce : false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }));
};

describe('useSoundEnabled', () => {
  beforeEach(() => {
    localStorage.clear();
    setReducedMotion(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults OFF when there is no stored preference and no reduced-motion request', () => {
    const { result } = renderHook(() => useSoundEnabled(), { wrapper });
    expect(result.current.soundEnabled).toBe(false);
  });

  it('defaults OFF when prefers-reduced-motion: reduce is set, even with no stored preference', () => {
    setReducedMotion(true);
    const { result } = renderHook(() => useSoundEnabled(), { wrapper });
    expect(result.current.soundEnabled).toBe(false);
  });

  it('reads stored true on mount when localStorage has the key', () => {
    localStorage.setItem(SOUND_ENABLED_STORAGE_KEY, 'true');
    const { result } = renderHook(() => useSoundEnabled(), { wrapper });
    expect(result.current.soundEnabled).toBe(true);
  });

  it('honors the user override even under prefers-reduced-motion: reduce', () => {
    // The reduced-motion request defaults to OFF, but a user who
    // explicitly turns sound on (storing "true") should keep it on.
    setReducedMotion(true);
    localStorage.setItem(SOUND_ENABLED_STORAGE_KEY, 'true');
    const { result } = renderHook(() => useSoundEnabled(), { wrapper });
    expect(result.current.soundEnabled).toBe(true);
  });

  it('persists to localStorage when the setter is called', () => {
    const { result } = renderHook(() => useSoundEnabled(), { wrapper });
    act(() => {
      result.current.setSoundEnabled(true);
    });
    expect(result.current.soundEnabled).toBe(true);
    expect(localStorage.getItem(SOUND_ENABLED_STORAGE_KEY)).toBe('true');

    act(() => {
      result.current.setSoundEnabled(false);
    });
    expect(result.current.soundEnabled).toBe(false);
    expect(localStorage.getItem(SOUND_ENABLED_STORAGE_KEY)).toBe('false');
  });

  it('returns a silent-OFF stub when used outside of the provider', () => {
    // Defensive default — sound is opt-in by design, so a missing
    // provider effectively keeps the game quiet rather than crashing
    // a unit-test render that doesn't care about sound. In production
    // the provider is mounted at app/layout.tsx.
    const { result } = renderHook(() => useSoundEnabled());
    expect(result.current.soundEnabled).toBe(false);
    // Setter is a no-op — calling it doesn't throw and doesn't
    // touch localStorage.
    act(() => {
      result.current.setSoundEnabled(true);
    });
    expect(result.current.soundEnabled).toBe(false);
    expect(localStorage.getItem(SOUND_ENABLED_STORAGE_KEY)).toBeNull();
  });
});
