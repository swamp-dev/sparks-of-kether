/**
 * Tests for Kether narrator voice in FinalThresholdScreen (#231).
 *
 * Covers:
 *   - narrator-kether-threshold-open fires on trial phase mount
 *   - narrator-kether-threshold-close fires on close phase mount
 *   - neither fires when voice is disabled
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { render, renderHook } from '@testing-library/react';
import { FinalThresholdScreen } from '../FinalThresholdScreen';
import { initKetherRitual } from '@/engine/kether';
import { useTurn } from '@/lib/use-turn';
import { seededRng } from '@/engine/rng';
import { makePlayer, makeState } from '@/test/fixtures';
import type { GameState, KetherRitualState } from '@/engine/types';
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
      // useSound (SFX) calls cloneNode on cached Audio elements;
      // useVoice does not, but stub must be present for any SFX paths.
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

function buildTrialState(): GameState {
  const player1 = makePlayer({ id: 'p1', name: 'Alex', position: 'kether', zodiacSign: 'aries' });
  const player2 = makePlayer({ id: 'p2', name: 'Bea', position: 'kether', zodiacSign: 'leo' });
  const base = makeState({}, { players: [player1, player2], activePlayerId: 'p1' });
  const result = initKetherRitual(base, { p1: 100, p2: 200 });
  if (!result.ok) throw new Error(`buildTrialState: ${result.reason.kind}`);
  return result.value;
}

function buildCloseState(): GameState {
  const trial = buildTrialState();
  const ritual = trial.ketherRitual;
  if (ritual === undefined) throw new Error('buildCloseState: ritual undefined');
  const closedRitual: KetherRitualState = { ...ritual, subPhase: 'close' };
  return { ...trial, ketherRitual: closedRitual };
}

function seedVoice(enabled: boolean): void {
  localStorage.setItem(VOICE_ENABLED_STORAGE_KEY, JSON.stringify(enabled));
}

// ──────────────── Helpers ────────────────

function renderWithVoice(state: GameState, voiceEnabled = true) {
  seedVoice(voiceEnabled);
  const player = state.players.find((p) => p.id === 'p1');
  if (!player) throw new Error('player p1 not found');
  const rng = seededRng(1);
  const { result } = renderHook(() => useTurn({ initialState: state, rng }));

  const Wrapper = (): JSX.Element => (
    <SoundSettingsProvider>
      <FinalThresholdScreen state={state} player={player} turn={result.current} mode="hot-seat" />
    </SoundSettingsProvider>
  );

  return render(<Wrapper />);
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

describe('Kether narrator voice (#231)', () => {
  it('plays threshold-open narrator on trial phase mount', () => {
    renderWithVoice(buildTrialState(), true);

    const narratorAudio = audioInstances.find((a) =>
      a.src.includes('narrator-kether-threshold-open'),
    );
    expect(narratorAudio).toBeDefined();
    expect(narratorAudio?.play).toHaveBeenCalled();
  });

  it('plays threshold-close narrator on close phase mount', () => {
    renderWithVoice(buildCloseState(), true);

    const narratorAudio = audioInstances.find((a) =>
      a.src.includes('narrator-kether-threshold-close'),
    );
    expect(narratorAudio).toBeDefined();
    expect(narratorAudio?.play).toHaveBeenCalled();
  });

  it('does NOT play narrator when voice is disabled', () => {
    renderWithVoice(buildTrialState(), false);

    const narratorAudio = audioInstances.find((a) => a.src.includes('narrator-kether'));
    expect(narratorAudio).toBeUndefined();
  });
});
