/**
 * Tests for verdict voice narration in EncounterScreen (#228).
 *
 * Covers:
 *   - playVoice called with correct path on verdict reveal
 *   - playVoice NOT called when voice is disabled
 *   - stopVoice called on retry (encounter reset)
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

/** Pin d20 to always roll a specific value. */
function makePinningRng(value: number) {
  const rng = seededRng(1);
  const orig = rng.int.bind(rng);
  vi.spyOn(rng, 'int').mockImplementation((min, max) => {
    if (min === 1 && max === 20) return value;
    return orig(min, max);
  });
  return rng;
}

function seedVoice(enabled: boolean): void {
  localStorage.setItem(VOICE_ENABLED_STORAGE_KEY, JSON.stringify(enabled));
}

// ──────────────── Helpers ────────────────

/**
 * Render EncounterScreen at Hod (Hermes) with Aries player sign, roll,
 * advance animation, and return the audio instances that were created.
 */
async function renderAndRoll(voiceEnabled = true) {
  seedVoice(voiceEnabled);
  const state = makeHodChallengeState();
  const rng = makePinningRng(20); // guaranteed pass
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

  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /^Roll$/ }));
  });
  act(() => {
    vi.advanceTimersByTime(800);
  });
  rerender();
  view.rerender(<Wrapper />);

  return { audioInstances, rerender, result, view, rng };
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

describe('verdict voice narration', () => {
  it('plays verdict voice with correct path on reveal', async () => {
    await renderAndRoll(true);

    // At least one Audio was constructed with a verdict path.
    const verdictAudio = audioInstances.find((a) => a.src.includes('verdict-hod-aries-pass'));
    expect(verdictAudio).toBeDefined();
    expect(verdictAudio?.play).toHaveBeenCalled();
  });

  it('verdict path includes the sefirah key (hod), sign, outcome, and variant index', async () => {
    await renderAndRoll(true);

    const verdictAudio = audioInstances.find((a) =>
      /verdict-hod-aries-pass-[012]\.mp3$/.test(a.src),
    );
    expect(verdictAudio).toBeDefined();
  });

  it('does NOT play voice when voice is disabled', async () => {
    await renderAndRoll(false);

    // useVoice returns early before new Audio() when disabled, so no
    // verdict Audio element is constructed at all.
    const verdictAudio = audioInstances.find((a) => a.src.includes('verdict-hod'));
    expect(verdictAudio).toBeUndefined();
  });

  it('stops voice on retry (react → prep loopback)', async () => {
    seedVoice(true);
    const state = makeHodChallengeState();
    const failRng = seededRng(1);
    const origInt = failRng.int.bind(failRng);
    vi.spyOn(failRng, 'int').mockImplementation((min, max) => {
      if (min === 1 && max === 20) return 1; // always roll 1, always fail
      return origInt(min, max);
    });

    const { result, rerender } = renderHook(() => useTurn({ initialState: state, rng: failRng }));
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
          rng={failRng}
          mode="hot-seat"
          turn={result.current}
          onResolved={vi.fn()}
        />
      </SoundSettingsProvider>
    );

    const view = render(<Wrapper />);

    // Roll (fail)
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /^Roll$/ }));
    });
    act(() => {
      vi.advanceTimersByTime(800);
    });
    rerender();
    view.rerender(<Wrapper />);

    // Capture the verdict audio that played
    const verdictAudio = audioInstances.find((a) => a.src.includes('verdict-hod'));
    expect(verdictAudio?.play).toHaveBeenCalled();

    // Retry
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    });
    rerender();
    view.rerender(<Wrapper />);

    // The verdict audio should have been paused (stopVoice called)
    expect(verdictAudio?.pause).toHaveBeenCalled();
  });
});
