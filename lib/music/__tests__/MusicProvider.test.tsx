import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  SoundSettingsProvider,
  MUSIC_ENABLED_STORAGE_KEY,
  useSoundEnabled,
} from '@/lib/sound/settings';
import { MusicProvider, CROSSFADE_INTERVAL_MS, trackUrl } from '../MusicProvider';
import { useMusic } from '../useMusic';

/**
 * Pin the MusicProvider + useMusic contract (#26):
 *
 *   - Same track called twice → no-op (no new Audio element).
 *   - Switching tracks starts a crossfade: incoming plays at volume 0,
 *     outgoing fades to 0 over CROSSFADE_STEPS × CROSSFADE_INTERVAL_MS.
 *   - After crossfade completes, outgoing is paused.
 *   - musicEnabled=false → Audio constructed but not played.
 *   - musicEnabled toggle pauses / resumes.
 *   - Tab visibility hidden → pause; visible → resume.
 *   - Provider cleanup pauses on unmount.
 *   - SefirahKey argument maps to encounter track URL via manifest.
 */

interface AudioStub {
  src: string;
  loop: boolean;
  volume: number;
  paused: boolean;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
}

let audioInstances: AudioStub[] = [];

function installAudioStub(): void {
  audioInstances = [];
  vi.stubGlobal(
    'Audio',
    class FakeAudio {
      src: string;
      loop = false;
      volume = 1;
      paused = true;
      play = vi.fn().mockImplementation(() => {
        (this as unknown as AudioStub).paused = false;
        return Promise.resolve();
      });
      pause = vi.fn().mockImplementation(() => {
        (this as unknown as AudioStub).paused = true;
      });
      constructor(src?: string) {
        this.src = src ?? '';
        audioInstances.push(this as unknown as AudioStub);
      }
    },
  );
}

const CROSSFADE_STEPS = 15;

function withMusicProvider(enabled: boolean) {
  return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MUSIC_ENABLED_STORAGE_KEY, enabled ? 'true' : 'false');
    }
    return (
      <SoundSettingsProvider>
        <MusicProvider>{children}</MusicProvider>
      </SoundSettingsProvider>
    );
  };
}

describe('MusicProvider + useMusic integration', () => {
  beforeEach(() => {
    localStorage.clear();
    installAudioStub();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('does not play when musicEnabled is false', () => {
    renderHook(() => useMusic('play'), { wrapper: withMusicProvider(false) });
    const played = audioInstances.filter((a) => a.play.mock.calls.length > 0);
    expect(played).toHaveLength(0);
  });

  it('plays the play track URL when musicEnabled is true', () => {
    renderHook(() => useMusic('play'), { wrapper: withMusicProvider(true) });
    const played = audioInstances.filter((a) => a.play.mock.calls.length > 0);
    expect(played).toHaveLength(1);
    expect(played[0]?.src).toBe('/audio/play.mp3');
  });

  it('plays the lobby track URL', () => {
    renderHook(() => useMusic('lobby'), { wrapper: withMusicProvider(true) });
    const played = audioInstances.filter((a) => a.play.mock.calls.length > 0);
    expect(played[0]?.src).toBe('/audio/lobby.mp3');
  });

  it('plays the blessing track URL', () => {
    renderHook(() => useMusic('blessing'), { wrapper: withMusicProvider(true) });
    const played = audioInstances.filter((a) => a.play.mock.calls.length > 0);
    expect(played[0]?.src).toBe('/audio/blessing.mp3');
  });

  it('maps a SefirahKey to the encounter track URL via manifest', () => {
    renderHook(() => useMusic('hod'), { wrapper: withMusicProvider(true) });
    const played = audioInstances.filter((a) => a.play.mock.calls.length > 0);
    expect(played[0]?.src).toBe('/audio/encounter-hod.mp3');
  });

  it('sets loop = true on the audio element', () => {
    renderHook(() => useMusic('play'), { wrapper: withMusicProvider(true) });
    expect(audioInstances[0]?.loop).toBe(true);
  });

  it('pauses on provider unmount', () => {
    const { unmount } = renderHook(() => useMusic('play'), {
      wrapper: withMusicProvider(true),
    });
    const instance = audioInstances[0];
    expect(instance?.pause).not.toHaveBeenCalled();
    unmount();
    expect(instance?.pause).toHaveBeenCalled();
  });

  it('pauses when musicEnabled flips to false', () => {
    const { result } = renderHook(
      () => {
        const { setMusicEnabled } = useSoundEnabled();
        useMusic('play');
        return { setMusicEnabled };
      },
      { wrapper: withMusicProvider(true) },
    );
    const instance = audioInstances[0];
    expect(instance?.play).toHaveBeenCalled();
    expect(instance?.pause).not.toHaveBeenCalled();

    act(() => {
      result.current.setMusicEnabled(false);
    });
    expect(instance?.pause).toHaveBeenCalled();
  });

  it('resumes when musicEnabled flips to true', () => {
    const { result } = renderHook(
      () => {
        const { setMusicEnabled } = useSoundEnabled();
        useMusic('play');
        return { setMusicEnabled };
      },
      { wrapper: withMusicProvider(false) },
    );
    expect(audioInstances.filter((a) => a.play.mock.calls.length > 0)).toHaveLength(0);

    act(() => {
      result.current.setMusicEnabled(true);
    });
    expect(audioInstances.filter((a) => a.play.mock.calls.length > 0).length).toBeGreaterThan(0);
  });

  it('same-track call is a no-op (no new Audio element)', () => {
    interface Props {
      track: Parameters<typeof useMusic>[0];
    }
    const { rerender } = renderHook(({ track }: Props) => useMusic(track), {
      wrapper: withMusicProvider(true),
      initialProps: { track: 'lobby' } as Props,
    });
    const countBefore = audioInstances.length;
    rerender({ track: 'lobby' as const });
    expect(audioInstances.length).toBe(countBefore);
  });

  it('crossfade: starts new track at volume 0, new track plays immediately', () => {
    interface Props {
      track: Parameters<typeof useMusic>[0];
    }
    const { rerender } = renderHook(({ track }: Props) => useMusic(track), {
      wrapper: withMusicProvider(true),
      initialProps: { track: 'lobby' } as Props,
    });

    rerender({ track: 'play' as const });

    const playInstance = audioInstances.find((a) => a.src.includes('/audio/play.mp3'));
    expect(playInstance?.play).toHaveBeenCalled();
    // At the start of the crossfade, volume begins near 0.
    expect(playInstance?.volume).toBeLessThan(0.05);
  });

  it('crossfade: outgoing track is paused after the fade completes', () => {
    interface Props {
      track: Parameters<typeof useMusic>[0];
    }
    const { rerender } = renderHook(({ track }: Props) => useMusic(track), {
      wrapper: withMusicProvider(true),
      initialProps: { track: 'lobby' } as Props,
    });

    const lobbyInstance = audioInstances.find((a) => a.src.includes('lobby'));
    expect(lobbyInstance?.pause).not.toHaveBeenCalled();

    rerender({ track: 'play' as const });

    // Before fade completes, old track is still running.
    vi.advanceTimersByTime(CROSSFADE_INTERVAL_MS * (CROSSFADE_STEPS - 1));
    expect(lobbyInstance?.pause).not.toHaveBeenCalled();

    // After the final step, outgoing is paused.
    vi.advanceTimersByTime(CROSSFADE_INTERVAL_MS + 1);
    expect(lobbyInstance?.pause).toHaveBeenCalled();
  });

  it('crossfade: incoming track reaches MUSIC_VOLUME after fade completes', () => {
    interface Props {
      track: Parameters<typeof useMusic>[0];
    }
    const { rerender } = renderHook(({ track }: Props) => useMusic(track), {
      wrapper: withMusicProvider(true),
      initialProps: { track: 'lobby' } as Props,
    });

    rerender({ track: 'play' as const });

    vi.advanceTimersByTime(CROSSFADE_INTERVAL_MS * CROSSFADE_STEPS + 1);

    const playInstance = audioInstances.find((a) => a.src.includes('/audio/play.mp3'));
    expect(playInstance?.volume).toBeCloseTo(0.35, 2);
  });

  it('tab visibility hidden pauses the current track', () => {
    renderHook(() => useMusic('play'), { wrapper: withMusicProvider(true) });
    const instance = audioInstances[0];
    expect(instance?.pause).not.toHaveBeenCalled();

    // Simulate the tab going hidden.
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(instance?.pause).toHaveBeenCalled();

    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  });

  it('tab visibility visible resumes the current track when enabled', () => {
    renderHook(() => useMusic('play'), { wrapper: withMusicProvider(true) });
    const instance = audioInstances[0];

    // Hide first.
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    const pauseCallsBefore = instance?.pause.mock.calls.length ?? 0;

    // Show again.
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    // play() should have been called again.
    const playCalls = instance?.play.mock.calls.length ?? 0;
    expect(playCalls).toBeGreaterThan(1); // at least initial play + resume
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    expect(pauseCallsBefore).toBeDefined(); // suppress unused var lint
  });

  it('trackUrl helper maps lobby/play/blessing to /audio/<name>.mp3', () => {
    expect(trackUrl('lobby')).toBe('/audio/lobby.mp3');
    expect(trackUrl('play')).toBe('/audio/play.mp3');
    expect(trackUrl('blessing')).toBe('/audio/blessing.mp3');
  });

  it('trackUrl helper maps sefirah keys to encounter track paths', () => {
    expect(trackUrl('tiferet')).toBe('/audio/encounter-tiferet.mp3');
    expect(trackUrl('malkuth')).toBe('/audio/encounter.mp3'); // malkuth has no per-Sefirah track yet
  });
});
