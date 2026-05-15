import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { SoundSettingsProvider, MUSIC_ENABLED_STORAGE_KEY, useSoundEnabled } from '@/lib/sound/settings';
import { useMusic } from '../useMusic';

/**
 * Pin the `useMusic` hook contract (#526):
 *
 *   - When soundEnabled is false (default), no audio plays.
 *   - When soundEnabled is true, the correct track URL plays with loop=true.
 *   - The track switches when the `track` argument changes.
 *   - The old track pauses before the new one starts.
 *   - Toggling soundEnabled pauses/resumes the current track.
 *   - Audio pauses on unmount.
 *   - SefirahKey arguments map to encounter track URLs via the manifest.
 */

interface AudioStub {
  src: string;
  loop: boolean;
  volume: number;
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
      play = vi.fn().mockResolvedValue(undefined);
      pause = vi.fn();
      constructor(src?: string) {
        this.src = src ?? '';
        audioInstances.push(this as unknown as AudioStub);
      }
    },
  );
}

function withSound(enabled: boolean) {
  return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MUSIC_ENABLED_STORAGE_KEY, enabled ? 'true' : 'false');
    }
    return <SoundSettingsProvider>{children}</SoundSettingsProvider>;
  };
}

describe('useMusic', () => {
  beforeEach(() => {
    localStorage.clear();
    installAudioStub();
  });

  afterEach(() => {
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

  it('pauses the track on unmount', () => {
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
    // Sound off — no play yet.
    expect(audioInstances.filter((a) => a.play.mock.calls.length > 0)).toHaveLength(0);

    act(() => {
      result.current.setMusicEnabled(true);
    });
    const played = audioInstances.filter((a) => a.play.mock.calls.length > 0);
    expect(played.length).toBeGreaterThan(0);
  });

  it('pauses the old track and starts the new one when the track changes', () => {
    interface Props { track: Parameters<typeof useMusic>[0] }
    const { rerender } = renderHook(
      ({ track }: Props) => useMusic(track),
      { wrapper: withSound(true), initialProps: { track: 'lobby' } as Props },
    );

    const lobbyInstance = audioInstances.find((a) => a.src.includes('lobby'));
    expect(lobbyInstance?.play).toHaveBeenCalled();
    expect(lobbyInstance?.pause).not.toHaveBeenCalled();

    rerender({ track: 'play' as const });

    expect(lobbyInstance?.pause).toHaveBeenCalled();
    const playInstance = audioInstances.find((a) => a.src.includes('/audio/play.mp3'));
    expect(playInstance?.play).toHaveBeenCalled();
  });
});
