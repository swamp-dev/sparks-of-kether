import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';

import { SoundSettingsProvider } from '../settings';
import { useSound, MAX_REPEATS_PER_WINDOW, REPEAT_WINDOW_MS } from '../useSound';

/**
 * Pin the `useSound` hook contract (#321):
 *
 *   - `playSound(cue)` is a no-op when settings.soundEnabled === false.
 *   - When enabled, it lazy-loads an `Audio` element on first use of
 *     each cue and reuses (clones) it for subsequent plays.
 *   - It throttles repeats: at most `MAX_REPEATS_PER_WINDOW` instances
 *     of the SAME cue inside `REPEAT_WINDOW_MS` ms. Different cues
 *     don't share a window — Spark-collected and Card-drawn within
 *     the same 500ms window both play.
 *   - It honours `prefers-reduced-motion` only via `settings.soundEnabled`
 *     defaulting OFF; the hook itself doesn't re-read the media query.
 *
 * Tests stub `HTMLAudioElement` so we can assert "did a play happen?"
 * without needing a real audio decoder in jsdom.
 */

interface AudioCall {
  readonly src: string;
  readonly play: ReturnType<typeof vi.fn>;
}

let audioCalls: AudioCall[] = [];

function installAudioStub(): void {
  audioCalls = [];
  // Replace the Audio constructor with a fake that records every
  // construction + every `.play()` invocation.
  vi.stubGlobal(
    'Audio',
    class FakeAudio {
      src = '';
      volume = 1;
      // Minimal enough to satisfy the implementation's calls. The
      // implementation calls `.play()` (returns Promise) and may set
      // `.volume`; nothing else.
      play = vi.fn().mockResolvedValue(undefined);
      cloneNode(): FakeAudio {
        // The FakeAudio constructor itself pushes onto `audioCalls`;
        // pass `src` through so the recorded entry has the right
        // path. Don't push again — the constructor already did.
        const clone = new FakeAudio(this.src);
        return clone;
      }
      addEventListener(): void {
        // no-op
      }
      removeEventListener(): void {
        // no-op
      }
      load(): void {
        // no-op
      }
      pause(): void {
        // no-op
      }
      constructor(src?: string) {
        if (src !== undefined) {
          this.src = src;
        }
        audioCalls.push({ src: this.src, play: this.play });
      }
    },
  );
}

function withSoundEnabled(enabled: boolean) {
  // Pre-seed localStorage so the provider's lazy initializer reads
  // the desired value on first render. This avoids the React-warning
  // anti-pattern of calling a state setter during the render of a
  // sibling, and means the hook under test sees the right value on
  // its very first render (the value the call sites actually depend on).
  return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('sok.soundEnabled', enabled ? 'true' : 'false');
    }
    return <SoundSettingsProvider>{children}</SoundSettingsProvider>;
  };
}

describe('useSound', () => {
  beforeEach(() => {
    localStorage.clear();
    installAudioStub();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('is a no-op when soundEnabled is false', () => {
    const { result } = renderHook(() => useSound(), { wrapper: withSoundEnabled(false) });
    act(() => {
      result.current.playSound('spark-collected');
    });
    // No audio constructor and no play happened.
    expect(audioCalls.find((c) => c.play.mock.calls.length > 0)).toBeUndefined();
  });

  it('plays when soundEnabled is true', () => {
    const { result } = renderHook(() => useSound(), { wrapper: withSoundEnabled(true) });
    act(() => {
      result.current.playSound('spark-collected');
    });
    const played = audioCalls.filter((c) => c.play.mock.calls.length > 0);
    expect(played).toHaveLength(1);
    expect(played[0]?.src).toMatch(/spark-collected\.mp3$/);
  });

  it('throttles same-cue repeats inside the repeat window', () => {
    const { result } = renderHook(() => useSound(), { wrapper: withSoundEnabled(true) });
    act(() => {
      // Fire MAX_REPEATS_PER_WINDOW + 2 instantly.
      for (let i = 0; i < MAX_REPEATS_PER_WINDOW + 2; i++) {
        result.current.playSound('illumination-up');
      }
    });
    const playedCount = audioCalls.filter(
      (c) => c.src.includes('illumination-up') && c.play.mock.calls.length > 0,
    ).length;
    expect(playedCount).toBe(MAX_REPEATS_PER_WINDOW);
  });

  it('lets the same cue play again after the repeat window expires', () => {
    const { result } = renderHook(() => useSound(), { wrapper: withSoundEnabled(true) });
    act(() => {
      for (let i = 0; i < MAX_REPEATS_PER_WINDOW; i++) {
        result.current.playSound('card-drawn');
      }
    });
    // One more inside the window: throttled.
    act(() => {
      result.current.playSound('card-drawn');
    });
    let played = audioCalls.filter(
      (c) => c.src.includes('card-drawn') && c.play.mock.calls.length > 0,
    );
    expect(played).toHaveLength(MAX_REPEATS_PER_WINDOW);
    // Advance past the window, then play again.
    act(() => {
      vi.advanceTimersByTime(REPEAT_WINDOW_MS + 50);
      result.current.playSound('card-drawn');
    });
    played = audioCalls.filter(
      (c) => c.src.includes('card-drawn') && c.play.mock.calls.length > 0,
    );
    expect(played).toHaveLength(MAX_REPEATS_PER_WINDOW + 1);
  });

  it('does not share the throttle window between different cues', () => {
    const { result } = renderHook(() => useSound(), { wrapper: withSoundEnabled(true) });
    act(() => {
      // Fill the window for spark-collected.
      for (let i = 0; i < MAX_REPEATS_PER_WINDOW; i++) {
        result.current.playSound('spark-collected');
      }
      // A different cue should still play immediately.
      result.current.playSound('shell-awakened');
    });
    const shellPlayed = audioCalls.find(
      (c) => c.src.includes('shell-awakened') && c.play.mock.calls.length > 0,
    );
    expect(shellPlayed).toBeDefined();
  });

  it('lazy-loads each cue once and clones it for subsequent plays', () => {
    const { result } = renderHook(() => useSound(), { wrapper: withSoundEnabled(true) });
    // First play of card-drawn: one Audio constructed + cloned.
    act(() => {
      result.current.playSound('card-drawn');
    });
    const constructedForCard = audioCalls.filter((c) => c.src.includes('card-drawn'));
    // First play creates the cached Audio AND clones it once.
    expect(constructedForCard.length).toBeGreaterThan(0);
    const baselineCount = constructedForCard.length;
    // Second play: should clone, not re-construct via `new Audio()`.
    // We assert that another play increments construction count by
    // exactly one (the clone), proving the cache is active.
    act(() => {
      result.current.playSound('card-drawn');
    });
    const afterSecondPlay = audioCalls.filter((c) => c.src.includes('card-drawn'));
    expect(afterSecondPlay.length).toBe(baselineCount + 1);
  });
});
