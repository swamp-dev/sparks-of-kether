/**
 * Tests for avatar arrival greeting voice narration in EncounterScreen (#230).
 *
 * Covers:
 *   - playVoice called with correct greeting path on first prep mount
 *   - greeting fires once only (latch: does not re-fire on retry)
 *   - playVoice NOT called when voice is disabled
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { EncounterScreen } from '../EncounterScreen';
import { useTurn } from '@/lib/use-turn';
import { seededRng } from '@/engine/rng';
import { makeFullGame } from '@/test/fixtures';
import { EMPTY_PENDING_MODIFIERS, type GameState } from '@/engine/types';
import { SoundSettingsProvider, VOICE_ENABLED_STORAGE_KEY } from '@/lib/sound/settings';

// ──────────────── Audio stub ────────────────

interface AudioInstance {
  src: string;
  readonly play: ReturnType<typeof vi.fn>;
  readonly pause: ReturnType<typeof vi.fn>;
  currentTime: number;
}

let audioInstances: AudioInstance[] = [];

function installAudioStub(): void {
  audioInstances = [];
  vi.stubGlobal(
    'Audio',
    class FakeAudio {
      src = '';
      currentTime = 0;
      preload = 'none';
      play = vi.fn().mockResolvedValue(undefined);
      pause = vi.fn();
      // useSound calls cloneNode() on cached Audio elements
      cloneNode = vi.fn().mockImplementation(() => {
        const clone = new (vi.mocked(globalThis.Audio as unknown as typeof FakeAudio))();
        clone.src = this.src;
        return clone;
      });
      constructor(src?: string) {
        if (src !== undefined) this.src = src;
        audioInstances.push(this as unknown as AudioInstance);
      }
    },
  );
}

// ──────────────── Fixtures ────────────────

/** Build a GameState at Hod (Hermes) in challenge/prep. */
function makeHodChallengeState(): GameState {
  const base = makeFullGame({ playerCount: 2, seed: 1 });
  const activeIdx = base.players.findIndex((p) => p.id === base.activePlayerId);
  const players = base.players.map((p, idx) =>
    idx === activeIdx
      ? { ...p, position: 'hod' as const, stats: { ...p.stats, intellect: 20 } }
      : { ...p, position: 'hod' as const },
  );
  return {
    ...base,
    players,
    phase: 'challenge',
    challengeSubPhase: 'prep',
    pendingModifiers: EMPTY_PENDING_MODIFIERS,
    lastOutcome: undefined,
  };
}

function seedVoice(enabled: boolean): void {
  localStorage.setItem(VOICE_ENABLED_STORAGE_KEY, JSON.stringify(enabled));
}

// ──────────────── Helpers ────────────────

async function renderPrep(voiceEnabled = true) {
  seedVoice(voiceEnabled);
  const state = makeHodChallengeState();
  const rng = seededRng(1);
  const { result, rerender } = renderHook(() => useTurn({ initialState: state, rng }));

  const Wrapper = (): JSX.Element => (
    <SoundSettingsProvider>
      <EncounterScreen
        context={{
          sefirah: 'hod',
          stat: 20,
          statLabel: 'Intellect',
          availableAllies: [],
          availableCardBurns: 0,
          availableSparkBurns: 0,
          playerSign: 'aries',
        }}
        rng={rng}
        mode="hot-seat"
        turn={result.current}
        onResolved={vi.fn()}
      />
    </SoundSettingsProvider>
  );

  const view = render(<Wrapper />);
  rerender();
  view.rerender(<Wrapper />);

  return { audioInstances, result, rerender, view, rng, state };
}

// ──────────────── Tests ────────────────

beforeEach(() => {
  vi.useFakeTimers();
  installAudioStub();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('avatar greeting voice narration', () => {
  it('plays greeting voice for Hod (Hermes) on first prep mount', async () => {
    await renderPrep(true);

    // Hod's avatar is Hermes — greeting path uses avatar name
    const greetingAudio = audioInstances.find((a) => a.src.includes('greeting-hermes'));
    expect(greetingAudio).toBeDefined();
    expect(greetingAudio?.play).toHaveBeenCalled();
  });

  it('greeting fires only once — not again on retry', async () => {
    seedVoice(true);
    const state = makeHodChallengeState();
    const rng = seededRng(1);
    const origInt = rng.int.bind(rng);
    vi.spyOn(rng, 'int').mockImplementation((min, max) => {
      if (min === 1 && max === 20) return 1; // always fail
      return origInt(min, max);
    });

    const { result, rerender } = renderHook(() => useTurn({ initialState: state, rng }));
    const Wrapper = (): JSX.Element => (
      <SoundSettingsProvider>
        <EncounterScreen
          context={{
            sefirah: 'hod',
            stat: 5, // low stat + low roll = fail
            statLabel: 'Intellect',
            availableAllies: [],
            availableCardBurns: 0,
            availableSparkBurns: 0,
            playerSign: 'aries',
          }}
          rng={rng}
          mode="hot-seat"
          turn={result.current}
          onResolved={vi.fn()}
        />
      </SoundSettingsProvider>
    );

    const view = render(<Wrapper />);
    rerender();
    view.rerender(<Wrapper />);

    const greetingCountBefore = audioInstances.filter((a) =>
      a.src.includes('greeting-hermes'),
    ).length;
    expect(greetingCountBefore).toBeGreaterThan(0);

    // Roll (guaranteed fail)
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /^Roll$/ }));
    });
    act(() => {
      vi.advanceTimersByTime(800);
    });
    rerender();
    view.rerender(<Wrapper />);

    // Retry
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    });
    rerender();
    view.rerender(<Wrapper />);

    // Greeting must not have re-fired after retry loopback to prep
    const greetingCountAfter = audioInstances.filter((a) =>
      a.src.includes('greeting-hermes'),
    ).length;
    expect(greetingCountAfter).toBe(greetingCountBefore);
  });

  it('does NOT play greeting when voice is disabled', async () => {
    await renderPrep(false);

    const greetingAudio = audioInstances.find((a) => a.src.includes('greeting-hermes'));
    expect(greetingAudio).toBeUndefined();
  });
});
