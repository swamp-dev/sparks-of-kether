'use client';
import { useMemo, useState } from 'react';
import type { ZodiacSignKey } from '@/data';
import { BlessingRitual } from '@/components/setup/BlessingRitual';
import { ZodiacSignPicker } from '@/components/setup/ZodiacSignPicker';
import { Lobby } from '@/components/setup/Lobby';
import type { LobbyPlayer } from '@/components/setup/Lobby';
import { PlayScreen } from '@/components/game/PlayScreen';
import { ColorBloom } from '@/components/atmosphere/ColorBloom';
import { initializeGame } from '@/engine/setup';
import type { PlayerSetup } from '@/engine/setup';
import { seededRng } from '@/engine/rng';
import type { StatSheet } from '@/engine/types';
import { resolvePlaySeed } from '@/lib/play-seed';

/**
 * The actual play surface. Single-page state machine that walks each
 * player through the setup pipeline (sign → blessing) for both
 * players in turn, then transitions to the lobby, and on Begin hands
 * off to `PlayScreen`.
 *
 * #237 (Epic #212 T8) removed the Soul Aspect phase. #255 (Voices
 * Epic T4) reordered sign-pick before the blessing ritual so the
 * ritual can render sign-aware blessing copy. Current flow:
 * sign(p1) → ritual(p1) → sign(p2) → ritual(p2) → lobby → play.
 * The zodiac-sign pick alone supplies the player's class; dignity-
 * derived stat deltas land at `initializeGame` time.
 *
 * Hot-seat for now (no multiplayer routing). Phase 5 swaps the local
 * state machine for room-based state coming from Supabase.
 */

interface SetupSlot {
  readonly id: string;
  readonly name: string;
  readonly stats?: StatSheet;
  readonly zodiacSign?: ZodiacSignKey;
}

type Phase =
  | { readonly kind: 'ritual'; readonly playerIndex: 0 | 1 }
  | { readonly kind: 'sign'; readonly playerIndex: 0 | 1 }
  | { readonly kind: 'lobby' }
  | { readonly kind: 'play'; readonly setupComplete: PlayerSetup[] };

export default function PlayPage(): JSX.Element {
  // #255 reorder: sign-pick happens BEFORE the blessing ritual so
  // BlessingRitual can render per-sign blessing quotes (Voices Epic
  // T4). The sign is the player's astrological "class" — natural to
  // pick before the Tree blesses them.
  const [phase, setPhase] = useState<Phase>({ kind: 'sign', playerIndex: 0 });
  const [slots, setSlots] = useState<readonly [SetupSlot, SetupSlot]>([
    { id: 'p1', name: 'Player 1' },
    { id: 'p2', name: 'Player 2' },
  ]);

  // #402: Resolved once per session via useState's lazy initializer
  // — Date.now() so every fresh hot-seat session deals a different
  // hand, with `?seed=N` as a recovery affordance for memorable runs.
  // SSR safety: the initializer can run on the server during App
  // Router pre-render, so guard window/URLSearchParams access.
  const [seed] = useState<number>(() => {
    if (typeof window === 'undefined') return Date.now();
    return resolvePlaySeed(new URLSearchParams(window.location.search));
  });

  // Per-player ritual RNGs — independent sequences so adding a roll
  // in one player's ritual doesn't shift the other player's stats.
  // Hot-seat for now; Phase 5 will move RNG seeding server-side.
  const ritualRngs = useMemo(
    () => [seededRng(seed), seededRng(seed + 1)] as const,
    [seed],
  );
  const playRng = useMemo(() => seededRng(seed + 2), [seed]);

  const finishSign = (idx: 0 | 1, sign: ZodiacSignKey): void => {
    setSlots((prev) => {
      const next = [...prev] as [SetupSlot, SetupSlot];
      const slot = next[idx];
      next[idx] = { ...slot, zodiacSign: sign };
      return next;
    });
    setPhase({ kind: 'ritual', playerIndex: idx });
  };

  const finishRitual = (idx: 0 | 1, stats: StatSheet): void => {
    setSlots((prev) => {
      const next = [...prev] as [SetupSlot, SetupSlot];
      const slot = next[idx];
      next[idx] = { ...slot, stats };
      return next;
    });
    if (idx === 0) {
      setPhase({ kind: 'sign', playerIndex: 1 });
    } else {
      setPhase({ kind: 'lobby' });
    }
  };

  const beginGame = (): void => {
    const setupComplete: PlayerSetup[] = slots.map((s) => {
      // Diagnostic-grade error: name the player and the missing
      // field(s) so a setup-flow regression is debuggable from the
      // exception alone. The Lobby's `ready` gate should already
      // prevent this branch — if we reach it, something upstream
      // bypassed the gate. The single `||` guard doubles as type
      // narrowing for TS so the return-statement fields are
      // proven non-undefined.
      if (s.stats === undefined || s.zodiacSign === undefined) {
        const missing = [
          s.stats === undefined ? 'stats' : null,
          s.zodiacSign === undefined ? 'zodiacSign' : null,
        ].filter((f): f is string => f !== null);
        throw new Error(
          `Lobby Begin reached without complete setup for ${s.name}: missing ${missing.join(', ')}`,
        );
      }
      return {
        id: s.id,
        name: s.name,
        zodiacSign: s.zodiacSign,
        stats: s.stats,
      };
    });
    setPhase({ kind: 'play', setupComplete });
  };

  if (phase.kind === 'ritual') {
    const sign = slots[phase.playerIndex].zodiacSign;
    if (sign === undefined) {
      // The phase machine routes sign-pick before ritual (#255), so
      // this is unreachable through normal flow. Loud error if we
      // somehow get here so the regression is debuggable from the
      // exception alone.
      throw new Error(
        `BlessingRitual entered without a zodiac sign for player ${phase.playerIndex}`,
      );
    }
    return (
      <main className="min-h-screen p-8 text-veil">
        <PhaseHeader title={`${slots[phase.playerIndex].name} — Sefirot Blessing`} />
        <BlessingRitual
          key={`ritual-${phase.playerIndex}`}
          rng={ritualRngs[phase.playerIndex]}
          sign={sign}
          onComplete={(stats) => finishRitual(phase.playerIndex, stats)}
        />
      </main>
    );
  }

  if (phase.kind === 'sign') {
    // #236: zodiac-sign picker (Epic #212 T6). Mounts after the
    // blessing ritual; the chosen sign is plumbed into
    // PlayerSetup.zodiacSign so initializeGame's zodiac-bonus pass
    // picks it up.
    const taken: Partial<Record<ZodiacSignKey, string>> = {};
    for (const s of slots) {
      if (s.zodiacSign) taken[s.zodiacSign] = s.name;
    }
    return (
      <main className="min-h-screen p-8 text-veil">
        {/*
          PhaseHeader title is intentionally distinct from the
          picker's own h2 ("Choose your sign") so e2e selectors that
          match by heading text don't collide.
        */}
        <PhaseHeader title={`${slots[phase.playerIndex].name} — Choose Sign`} />
        <ZodiacSignPicker
          taken={taken}
          onPick={(s) => finishSign(phase.playerIndex, s)}
        />
      </main>
    );
  }

  if (phase.kind === 'lobby') {
    const lobbyPlayers: readonly LobbyPlayer[] = slots.map((s) => ({
      id: s.id,
      name: s.name,
      zodiacSign: s.zodiacSign ?? null,
      // Begin gates on a complete setup: stats + sign.
      ready: s.stats !== undefined && s.zodiacSign !== undefined,
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
  return <PlayScreen initialState={initialState} rng={playRng} />;
}

function PhaseHeader({ title }: { title: string }): JSX.Element {
  return (
    <header className="mb-8 text-center">
      <h1 className="font-display text-3xl tracking-widest">{title}</h1>
    </header>
  );
}
