import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

/**
 * Pin the settings store contract (#321, #76):
 *
 *   - `sfxEnabled` defaults ON (SFX fire on user gestures, not hostile).
 *   - `musicEnabled` defaults OFF (ambient auto-play is hostile by default).
 *   - Both respect `prefers-reduced-motion: reduce` on first visit (default OFF).
 *   - Stored preferences win over the reduced-motion heuristic.
 *   - Setters persist to `localStorage` under stable keys.
 */

import {
  SoundSettingsProvider,
  useSoundEnabled,
  SFX_ENABLED_STORAGE_KEY,
  MUSIC_ENABLED_STORAGE_KEY,
} from '../settings';

const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
  <SoundSettingsProvider>{children}</SoundSettingsProvider>
);

const setReducedMotion = (reduce: boolean): void => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion: reduce') ? reduce : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: () => false,
  }));
};

describe('useSoundEnabled — sfxEnabled', () => {
  beforeEach(() => {
    localStorage.clear();
    setReducedMotion(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults ON when there is no stored preference and no reduced-motion request', () => {
    const { result } = renderHook(() => useSoundEnabled(), { wrapper });
    expect(result.current.sfxEnabled).toBe(true);
  });

  it('defaults OFF when prefers-reduced-motion: reduce is set, even with no stored preference', () => {
    setReducedMotion(true);
    const { result } = renderHook(() => useSoundEnabled(), { wrapper });
    expect(result.current.sfxEnabled).toBe(false);
  });

  it('reads stored true on mount when localStorage has the key', () => {
    localStorage.setItem(SFX_ENABLED_STORAGE_KEY, 'true');
    const { result } = renderHook(() => useSoundEnabled(), { wrapper });
    expect(result.current.sfxEnabled).toBe(true);
  });

  it('reads stored false on mount when localStorage has the key', () => {
    localStorage.setItem(SFX_ENABLED_STORAGE_KEY, 'false');
    const { result } = renderHook(() => useSoundEnabled(), { wrapper });
    expect(result.current.sfxEnabled).toBe(false);
  });

  it('honors the stored override even under prefers-reduced-motion: reduce', () => {
    setReducedMotion(true);
    localStorage.setItem(SFX_ENABLED_STORAGE_KEY, 'true');
    const { result } = renderHook(() => useSoundEnabled(), { wrapper });
    expect(result.current.sfxEnabled).toBe(true);
  });

  it('persists to localStorage when the setter is called', () => {
    const { result } = renderHook(() => useSoundEnabled(), { wrapper });
    act(() => {
      result.current.setSfxEnabled(false);
    });
    expect(result.current.sfxEnabled).toBe(false);
    expect(localStorage.getItem(SFX_ENABLED_STORAGE_KEY)).toBe('false');

    act(() => {
      result.current.setSfxEnabled(true);
    });
    expect(result.current.sfxEnabled).toBe(true);
    expect(localStorage.getItem(SFX_ENABLED_STORAGE_KEY)).toBe('true');
  });

  it('attempts an audio unlock play when sfxEnabled transitions from off to on', () => {
    const playCalls: string[] = [];
    vi.stubGlobal(
      'Audio',
      class FakeAudio {
        src: string;
        play = vi.fn(() => {
          playCalls.push(this.src);
          return Promise.resolve();
        });
        constructor(src?: string) {
          this.src = src ?? '';
        }
      },
    );

    localStorage.setItem(SFX_ENABLED_STORAGE_KEY, 'false');
    const { result } = renderHook(() => useSoundEnabled(), { wrapper });
    expect(playCalls).toHaveLength(0);

    act(() => {
      result.current.setSfxEnabled(true);
    });
    expect(playCalls.length).toBeGreaterThan(0);

    const countAfterEnable = playCalls.length;
    act(() => {
      result.current.setSfxEnabled(false);
    });
    expect(playCalls.length).toBe(countAfterEnable);

    vi.unstubAllGlobals();
  });
});

describe('useSoundEnabled — musicEnabled', () => {
  beforeEach(() => {
    localStorage.clear();
    setReducedMotion(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults OFF when there is no stored preference', () => {
    const { result } = renderHook(() => useSoundEnabled(), { wrapper });
    expect(result.current.musicEnabled).toBe(false);
  });

  it('reads stored true on mount when localStorage has the key', () => {
    localStorage.setItem(MUSIC_ENABLED_STORAGE_KEY, 'true');
    const { result } = renderHook(() => useSoundEnabled(), { wrapper });
    expect(result.current.musicEnabled).toBe(true);
  });

  it('persists to localStorage when the setter is called', () => {
    const { result } = renderHook(() => useSoundEnabled(), { wrapper });
    act(() => {
      result.current.setMusicEnabled(true);
    });
    expect(result.current.musicEnabled).toBe(true);
    expect(localStorage.getItem(MUSIC_ENABLED_STORAGE_KEY)).toBe('true');

    act(() => {
      result.current.setMusicEnabled(false);
    });
    expect(result.current.musicEnabled).toBe(false);
    expect(localStorage.getItem(MUSIC_ENABLED_STORAGE_KEY)).toBe('false');
  });
});

describe('useSoundEnabled — outside provider', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns a silent-OFF stub for both settings when used without provider', () => {
    const { result } = renderHook(() => useSoundEnabled());
    expect(result.current.sfxEnabled).toBe(false);
    expect(result.current.musicEnabled).toBe(false);
    act(() => {
      result.current.setSfxEnabled(true);
    });
    act(() => {
      result.current.setMusicEnabled(true);
    });
    expect(result.current.sfxEnabled).toBe(false);
    expect(result.current.musicEnabled).toBe(false);
    expect(localStorage.getItem(SFX_ENABLED_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(MUSIC_ENABLED_STORAGE_KEY)).toBeNull();
  });
});
