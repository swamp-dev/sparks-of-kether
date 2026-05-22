import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';

import {
  SoundSettingsProvider,
  VOICE_ENABLED_STORAGE_KEY,
  useSoundEnabled,
} from '@/lib/sound/settings';
// VOICE_ENABLED_STORAGE_KEY used by seedVoice() helper below
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

function Provider({ children }: { children: ReactNode }): JSX.Element {
  return <SoundSettingsProvider>{children}</SoundSettingsProvider>;
}

function seedVoice(enabled: boolean): void {
  // Seed before renderHook so SoundSettingsProvider's lazy initializer
  // reads the desired value. Idempotent — beforeEach already clears.
  window.localStorage.setItem(VOICE_ENABLED_STORAGE_KEY, enabled ? 'true' : 'false');
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
    seedVoice(false);
    const { result } = renderHook(() => useVoice(), { wrapper: Provider });
    act(() => {
      result.current.playVoice('/audio/voice/greeting-zeus.mp3');
    });
    expect(audioInstances).toHaveLength(0);
  });

  it('plays when voiceEnabled is true', () => {
    seedVoice(true);
    const { result } = renderHook(() => useVoice(), { wrapper: Provider });
    act(() => {
      result.current.playVoice('/audio/voice/greeting-zeus.mp3');
    });
    const played = audioInstances.filter((a) => a.play.mock.calls.length > 0);
    expect(played).toHaveLength(1);
    expect(played[0]?.src).toBe('/audio/voice/greeting-zeus.mp3');
  });

  it('sets preload to none on constructed audio', () => {
    seedVoice(true);
    const { result } = renderHook(() => useVoice(), { wrapper: Provider });
    act(() => {
      result.current.playVoice('/audio/voice/greeting-apollo.mp3');
    });
    expect(audioInstances[0]?.preload).toBe('none');
  });

  it('pauses and resets currentTime before playing a second voice', () => {
    seedVoice(true);
    const { result } = renderHook(() => useVoice(), { wrapper: Provider });
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
    seedVoice(true);
    const { result } = renderHook(() => useVoice(), { wrapper: Provider });
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
    seedVoice(true);
    const { result } = renderHook(() => useVoice(), { wrapper: Provider });
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
    seedVoice(true);
    const { result } = renderHook(() => useVoice(), { wrapper: Provider });
    expect(() => {
      act(() => {
        result.current.stopVoice();
      });
    }).not.toThrow();
  });

  it('pauses in-flight audio when voiceEnabled toggles off mid-clip', () => {
    seedVoice(true);
    const { result } = renderHook(() => ({ voice: useVoice(), settings: useSoundEnabled() }), {
      wrapper: Provider,
    });
    act(() => {
      result.current.voice.playVoice('/audio/voice/verdict-chesed-cancer-pass-1.mp3');
    });
    const playing = audioInstances[0];
    expect(playing?.play).toHaveBeenCalled();

    // Toggle voice off while the clip is still playing.
    act(() => {
      result.current.settings.setVoiceEnabled(false);
    });
    expect(playing?.pause).toHaveBeenCalled();
  });
});
