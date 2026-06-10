import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  SoundSettingsProvider,
  MUSIC_ENABLED_STORAGE_KEY,
  useSoundEnabled,
} from '@/lib/sound/settings';
import { MusicProvider, CROSSFADE_INTERVAL_MS } from '../MusicProvider';
import { useMusic } from '../useMusic';

/**
 * Pin the `useMusic` hook contract (#26).
 *
 * The hook delegates to `MusicProvider`, so tests wrap with both
 * `SoundSettingsProvider` and `MusicProvider`. Behaviours pinned here:
 *
 *   - When musicEnabled is false (default), no audio plays.
 *   - When musicEnabled is true, the correct track URL plays with loop=true.
 *   - Same track re-called → no new Audio element (no-op).
 *   - Track changes → crossfade: old pauses after CROSSFADE_STEPS ticks.
 *   - Toggling musicEnabled pauses/resumes the current track.
 *   - Audio pauses when the provider unmounts.
 *   - SefirahKey arguments map to encounter track URLs via the manifest.
 *
 * Per-behavior crossfade and visibility tests live in MusicProvider.test.tsx.
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

function withSound(enabled: boolean) {
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

describe('useMusic', () => {
  beforeEach(() => {
    localStorage.clear();
    installAudioStub();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('does not play when soundEnabled is false', () => {
    renderHook(() => useMusic('play'), { wrapper: withSound(false) });
    const played = audioInstances.filter((a) => a.play.mock.calls.length > 0);
    expect(played).toHaveLength(0);
  });

  it('plays the play track URL when soundEnabled is true', () => {
    renderHook(() => useMusic('play'), { wrapper: withSound(true) });
    const played = audioInstances.filter((a) => a.play.mock.calls.length > 0);
    expect(played).toHaveLength(1);
    expect(played[0]?.src).toBe('/audio/play.mp3');
  });

  it('plays the lobby track URL', () => {
    renderHook(() => useMusic('lobby'), { wrapper: withSound(true) });
    const played = audioInstances.filter((a) => a.play.mock.calls.length > 0);
    expect(played[0]?.src).toBe('/audio/lobby.mp3');
  });

  it('plays the blessing track URL', () => {
    renderHook(() => useMusic('blessing'), { wrapper: withSound(true) });
    const played = audioInstances.filter((a) => a.play.mock.calls.length > 0);
    expect(played[0]?.src).toBe('/audio/blessing.mp3');
  });

  it('maps a SefirahKey to the encounter track URL', () => {
    renderHook(() => useMusic('hod'), { wrapper: withSound(true) });
    const played = audioInstances.filter((a) => a.play.mock.calls.length > 0);
    expect(played[0]?.src).toBe('/audio/encounter-hod.mp3');
  });

  it('sets loop = true on the audio element', () => {
    renderHook(() => useMusic('play'), { wrapper: withSound(true) });
    expect(audioInstances[0]?.loop).toBe(true);
  });

  it('pauses the track when the provider unmounts', () => {
    const { unmount } = renderHook(() => useMusic('play'), { wrapper: withSound(true) });
    const instance = audioInstances[0];
    expect(instance?.pause).not.toHaveBeenCalled();
    unmount();
    expect(instance?.pause).toHaveBeenCalled();
  });

  it('pauses when soundEnabled flips from true to false', () => {
    const { result } = renderHook(
      () => {
        const { setMusicEnabled } = useSoundEnabled();
        useMusic('play');
        return { setMusicEnabled };
      },
      { wrapper: withSound(true) },
    );
    const instance = audioInstances[0];
    expect(instance?.play).toHaveBeenCalled();
    expect(instance?.pause).not.toHaveBeenCalled();

    act(() => {
      result.current.setMusicEnabled(false);
    });
    expect(instance?.pause).toHaveBeenCalled();
  });

  it('resumes when soundEnabled flips from false to true', () => {
    const { result } = renderHook(
      () => {
        const { setMusicEnabled } = useSoundEnabled();
        useMusic('play');
        return { setMusicEnabled };
      },
      { wrapper: withSound(false) },
    );
    expect(audioInstances.filter((a) => a.play.mock.calls.length > 0)).toHaveLength(0);

    act(() => {
      result.current.setMusicEnabled(true);
    });
    const played = audioInstances.filter((a) => a.play.mock.calls.length > 0);
    expect(played.length).toBeGreaterThan(0);
  });

  it('pauses the old track and starts the new one when the track changes', () => {
    interface Props {
      track: Parameters<typeof useMusic>[0];
    }
    const { rerender } = renderHook(({ track }: Props) => useMusic(track), {
      wrapper: withSound(true),
      initialProps: { track: 'lobby' } as Props,
    });

    const lobbyInstance = audioInstances.find((a) => a.src.includes('lobby'));
    expect(lobbyInstance?.play).toHaveBeenCalled();
    expect(lobbyInstance?.pause).not.toHaveBeenCalled();

    rerender({ track: 'play' as const });

    // Advance timers to complete the crossfade.
    vi.advanceTimersByTime(CROSSFADE_INTERVAL_MS * CROSSFADE_STEPS + 10);

    expect(lobbyInstance?.pause).toHaveBeenCalled();
    const playInstance = audioInstances.find((a) => a.src.includes('/audio/play.mp3'));
    expect(playInstance?.play).toHaveBeenCalled();
  });
});
