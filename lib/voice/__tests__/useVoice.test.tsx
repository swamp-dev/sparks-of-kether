import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';

import { SoundSettingsProvider, VOICE_ENABLED_STORAGE_KEY } from '@/lib/sound/settings';
import { useVoice } from '../useVoice';

/**
 * Pin the `useVoice` hook contract (#226):
 *
 *   - playVoice(path) is a no-op when voiceEnabled === false.
 *   - playVoice(path) starts playback when enabled.
 *   - A second playVoice call pauses + resets the first audio before playing.
 *   - stopVoice() pauses the current audio.
 *   - The same path is reused (currentTime reset) rather than constructing
 *     a new Audio element.
 *   - preload is set to 'none' so ~873 clips don't preload on page load.
 */

interface AudioInstance {
  src: string;
  readonly play: ReturnType<typeof vi.fn>;
  readonly pause: ReturnType<typeof vi.fn>;
  currentTime: number;
  preload: string;
}

let audioInstances: AudioInstance[] = [];

function installAudioStub(): void {
  audioInstances = [];
  vi.stubGlobal(
    'Audio',
    class FakeAudio {
      src = '';
      volume = 1;
      currentTime = 0;
      preload = 'auto';
      play = vi.fn().mockResolvedValue(undefined);
      pause = vi.fn();
      constructor(src?: string) {
        if (src !== undefined) this.src = src;
        audioInstances.push(this as unknown as AudioInstance);
      }
    },
  );
}

function withVoiceEnabled(enabled: boolean) {
  return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VOICE_ENABLED_STORAGE_KEY, enabled ? 'true' : 'false');
    }
    return <SoundSettingsProvider>{children}</SoundSettingsProvider>;
  };
}

describe('useVoice', () => {
  beforeEach(() => {
    localStorage.clear();
    installAudioStub();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is a no-op when voiceEnabled is false', () => {
    const { result } = renderHook(() => useVoice(), {
      wrapper: withVoiceEnabled(false),
    });
    act(() => {
      result.current.playVoice('/audio/voice/greeting-zeus.mp3');
    });
    expect(audioInstances).toHaveLength(0);
  });

  it('plays when voiceEnabled is true', () => {
    const { result } = renderHook(() => useVoice(), {
      wrapper: withVoiceEnabled(true),
    });
    act(() => {
      result.current.playVoice('/audio/voice/greeting-zeus.mp3');
    });
    const played = audioInstances.filter((a) => a.play.mock.calls.length > 0);
    expect(played).toHaveLength(1);
    expect(played[0]?.src).toBe('/audio/voice/greeting-zeus.mp3');
  });

  it('sets preload to none on constructed audio', () => {
    const { result } = renderHook(() => useVoice(), {
      wrapper: withVoiceEnabled(true),
    });
    act(() => {
      result.current.playVoice('/audio/voice/greeting-apollo.mp3');
    });
    expect(audioInstances[0]?.preload).toBe('none');
  });

  it('pauses and resets currentTime before playing a second voice', () => {
    const { result } = renderHook(() => useVoice(), {
      wrapper: withVoiceEnabled(true),
    });
    act(() => {
      result.current.playVoice('/audio/voice/greeting-ares.mp3');
    });
    const first = audioInstances[0];
    expect(first).toBeDefined();

    act(() => {
      result.current.playVoice('/audio/voice/verdict-chokmah-aries-pass-0.mp3');
    });
    expect(first?.pause).toHaveBeenCalled();
    expect(first?.currentTime).toBe(0);
    const second = audioInstances.find((a) => a.src.includes('verdict-chokmah'));
    expect(second?.play).toHaveBeenCalled();
  });

  it('reuses the same Audio element for repeated same-path calls', () => {
    const { result } = renderHook(() => useVoice(), {
      wrapper: withVoiceEnabled(true),
    });
    const path = '/audio/voice/response-tiferet-leo-1.mp3';
    act(() => {
      result.current.playVoice(path);
    });
    act(() => {
      result.current.playVoice(path);
    });
    const forPath = audioInstances.filter((a) => a.src === path);
    expect(forPath).toHaveLength(1);
    expect(forPath[0]?.play.mock.calls.length).toBe(2);
  });

  it('stopVoice pauses the current audio', () => {
    const { result } = renderHook(() => useVoice(), {
      wrapper: withVoiceEnabled(true),
    });
    act(() => {
      result.current.playVoice('/audio/voice/greeting-selene.mp3');
    });
    const instance = audioInstances[0];
    act(() => {
      result.current.stopVoice();
    });
    expect(instance?.pause).toHaveBeenCalled();
  });

  it('stopVoice is safe with no current audio', () => {
    const { result } = renderHook(() => useVoice(), {
      wrapper: withVoiceEnabled(true),
    });
    expect(() => {
      act(() => {
        result.current.stopVoice();
      });
    }).not.toThrow();
  });
});
