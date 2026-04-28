'use client';
import { useMemo, useState } from 'react';
import type { SoulAspectKey } from '@/data';
import { BlessingRitual } from '@/components/setup/BlessingRitual';
import { SoulAspectPicker } from '@/components/setup/SoulAspectPicker';
import { Lobby } from '@/components/setup/Lobby';
import type { LobbyPlayer } from '@/components/setup/Lobby';
import { PlayScreen } from '@/components/game/PlayScreen';
import { ColorBloom } from '@/components/atmosphere/ColorBloom';
import { initializeGame } from '@/engine/setup';
import type { PlayerSetup } from '@/engine/setup';
import { seededRng } from '@/engine/rng';
import type { StatSheet } from '@/engine/types';

/**
 * The actual play surface. Single-page state machine that walks each
 * player through the setup pipeline (blessing → aspect) for both
 * players in turn, then transitions to the lobby, and on Begin
 * hands off to `PlayScreen`.
 *
 * Hot-seat for now (no multiplayer routing). Phase 5 swaps the local
 * state machine for room-based state coming from Supabase.
 */

type SetupSlot =
  | { readonly id: string; readonly name: string; readonly stats?: StatSheet; readonly soulAspect?: SoulAspectKey };

type Phase =
  | { readonly kind: 'ritual'; readonly playerIndex: 0 | 1 }
  | { readonly kind: 'aspect'; readonly playerIndex: 0 | 1 }
  | { readonly kind: 'lobby' }
  | { readonly kind: 'play'; readonly setupComplete: PlayerSetup[] };

const RNG_SEED = 1729; // arbitrary; the seed itself doesn't matter for a demo

export default function PlayPage(): JSX.Element {
  const [phase, setPhase] = useState<Phase>({ kind: 'ritual', playerIndex: 0 });
  const [slots, setSlots] = useState<readonly [SetupSlot, SetupSlot]>([
    { id: 'p1', name: 'Player 1' },
    { id: 'p2', name: 'Player 2' },
  ]);

  // Per-player ritual RNGs — independent sequences so adding a roll
  // in one player's ritual doesn't shift the other player's stats.
  // Hot-seat for now; Phase 5 will move RNG seeding server-side.
  const ritualRngs = useMemo(
    () => [seededRng(RNG_SEED), seededRng(RNG_SEED + 1)] as const,
    [],
  );
  const playRng = useMemo(() => seededRng(RNG_SEED + 2), []);

  const finishRitual = (idx: 0 | 1, stats: StatSheet): void => {
    setSlots((prev) => {
      const next = [...prev] as [SetupSlot, SetupSlot];
      const slot = next[idx];
      next[idx] = { ...slot, stats };
      return next;
    });
    setPhase({ kind: 'aspect', playerIndex: idx });
  };

  const finishAspect = (idx: 0 | 1, aspect: SoulAspectKey): void => {
    setSlots((prev) => {
      const next = [...prev] as [SetupSlot, SetupSlot];
      const slot = next[idx];
      next[idx] = { ...slot, soulAspect: aspect };
      return next;
    });
    if (idx === 0) {
      setPhase({ kind: 'ritual', playerIndex: 1 });
    } else {
      setPhase({ kind: 'lobby' });
    }
  };

  const beginGame = (): void => {
    const setupComplete: PlayerSetup[] = slots.map((s) => {
      if (!s.stats || !s.soulAspect) {
        throw new Error('Lobby Begin reached without complete setup');
      }
      return {
        id: s.id,
        name: s.name,
        soulAspect: s.soulAspect,
        stats: s.stats,
      };
    });
    setPhase({ kind: 'play', setupComplete });
  };

  if (phase.kind === 'ritual') {
    return (
      <main className="min-h-screen p-8 text-veil">
        <PhaseHeader title={`${slots[phase.playerIndex].name} — Sefirot Blessing`} />
        <BlessingRitual
          key={`ritual-${phase.playerIndex}`}
          rng={ritualRngs[phase.playerIndex]}
          onComplete={(stats) => finishRitual(phase.playerIndex, stats)}
        />
      </main>
    );
  }

  if (phase.kind === 'aspect') {
    const taken: Partial<Record<SoulAspectKey, string>> = {};
    for (const s of slots) {
      if (s.soulAspect) taken[s.soulAspect] = s.name;
    }
    return (
      <main className="min-h-screen p-8 text-veil">
        <PhaseHeader title={`${slots[phase.playerIndex].name} — Choose Soul Aspect`} />
        <SoulAspectPicker
          taken={taken}
          onPick={(a) => finishAspect(phase.playerIndex, a)}
        />
      </main>
    );
  }

  if (phase.kind === 'lobby') {
    const lobbyPlayers: readonly LobbyPlayer[] = slots.map((s) => ({
      id: s.id,
      name: s.name,
      soulAspect: s.soulAspect ?? null,
      ready: s.stats !== undefined && s.soulAspect !== undefined,
    }));
    return (
      <main className="min-h-screen p-8 text-veil">
        <PhaseHeader title="Lobby — ready to begin" />
        <Lobby
          players={lobbyPlayers}
          isHost
          onBegin={beginGame}
        />
      </main>
    );
  }

  // phase.kind === 'play' — render the live game inside a child
  // component so `initializeGame` runs exactly once via useMemo,
  // not on every parent re-render. (Without this gate, every render
  // would consume more values from `playRng` and produce a fresh
  // GameState that `useTurn` would never observe — the game state
  // is a useState initializer, not a prop the hook diff-checks.)
  return (
    <main className="min-h-screen text-veil">
      <ColorBloom color="#ffd700" position="bottom" intensity={0.12} />
      <PlaySession setupComplete={phase.setupComplete} playRng={playRng} />
    </main>
  );
}

function PlaySession({
  setupComplete,
  playRng,
}: {
  setupComplete: PlayerSetup[];
  playRng: ReturnType<typeof seededRng>;
}): JSX.Element {
  const initialState = useMemo(
    () => initializeGame({ players: setupComplete, rng: playRng }),
    [setupComplete, playRng],
  );
  const soulAspectByPlayer = useMemo(() => {
    const map: Record<string, SoulAspectKey> = {};
    for (const p of setupComplete) {
      map[p.id] = p.soulAspect;
    }
    return map;
  }, [setupComplete]);
  return (
    <PlayScreen
      initialState={initialState}
      soulAspectByPlayer={soulAspectByPlayer}
      rng={playRng}
    />
  );
}

function PhaseHeader({ title }: { title: string }): JSX.Element {
  return (
    <header className="mb-8 text-center">
      <h1 className="font-display text-3xl tracking-widest">{title}</h1>
    </header>
  );
}
