/**
 * Tests for zodiac player response voice narration in EncounterScreen (#229).
 *
 * Covers:
 *   - playVoice called with correct zodiac-keyed response path on prep reveal
 *   - path format includes sefirah, sign, and variant index
 *   - playVoice NOT called when voice is disabled
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen } from '@testing-library/react';
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

/**
 * Render EncounterScreen at Hod with Aries player sign in prep phase.
 * The player response voice should fire immediately on mount.
 */
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
  // Advance past framing animation so dialoguePhase reaches 'player-response' and voice fires.
  act(() => {
    vi.advanceTimersByTime(5000);
  });
  rerender();
  view.rerender(<Wrapper />);

  return { audioInstances, view };
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

describe('player response voice narration', () => {
  it('plays response voice with correct path in prep phase', async () => {
    await renderPrep(true);

    const responseAudio = audioInstances.find((a) => a.src.includes('response-hod-aries'));
    expect(responseAudio).toBeDefined();
    expect(responseAudio?.play).toHaveBeenCalled();
  });

  it('path includes sefirah key, sign, and variant index', async () => {
    await renderPrep(true);

    const responseAudio = audioInstances.find((a) => /response-hod-aries-[012]\.mp3$/.test(a.src));
    expect(responseAudio).toBeDefined();
  });

  it('does NOT play voice when voice is disabled', async () => {
    await renderPrep(false);

    // useVoice returns early before new Audio() when disabled
    const responseAudio = audioInstances.find((a) => a.src.includes('response-hod'));
    expect(responseAudio).toBeUndefined();
  });

  it('Roll button is present — component is in prep phase', async () => {
    await renderPrep(true);

    expect(screen.getByRole('button', { name: /^Roll$/ })).toBeInTheDocument();
  });
});
