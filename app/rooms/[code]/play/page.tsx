'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PlayScreen } from '@/components/game/PlayScreen';
import { ColorBloom } from '@/components/atmosphere/ColorBloom';
import { SettingsButton } from '@/components/play/SettingsButton';
import { useLobby } from '@/lib/use-lobby';
import { useRoomState } from '@/lib/realtime';
import { usePresence } from '@/lib/presence';
import { writeLastGame, clearLastGame } from '@/lib/last-game';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { seededRng } from '@/engine/rng';

/**
 * Multiplayer play surface for a live room.
 *
 * Responsibilities:
 *   - Subscribe to the room's game snapshot via `useRoomState`.
 *   - Subscribe to room-state changes (playing↔paused) via `useLobby`
 *     (which now includes the lobby_room Realtime channel).
 *   - Render `<PlayScreen>` in multiplayer mode when snapshot is available.
 *   - Show a pause overlay when room.state === 'paused'.
 *   - Auto-pause when presence drops to 1 (just this client) for > 30s.
 *   - Update `sok.lastGame` on mount to keep the bookmark fresh.
 *   - Redirect to /lobby if room is still in lobby state (player arrived early).
 */

interface PlayPageProps {
  readonly params: { readonly code: string };
}

export default function RoomPlayPage({ params }: PlayPageProps): JSX.Element {
  const { code } = params;
  const router = useRouter();
  const { room, players, currentPlayerId, error, loading } = useLobby(code);
  const { state: gameState, lastEventId } = useRoomState(room?.id ?? null);
  // RNG seeded from the last applied event ID — stays in sync with
  // the server's deterministic fold sequence.
  const rng = useMemo(() => seededRng((lastEventId ?? 0) + 1), [lastEventId]);
  const { onlinePlayerIds } = usePresence(room?.id ?? null, currentPlayerId);

  const currentPlayer = currentPlayerId !== null
    ? players.find((p) => p.id === currentPlayerId) ?? null
    : null;

  // Keep sok.lastGame fresh on every visit to this page so the "Continue
  // Game" banner stays visible for up to 30 days.
  useEffect(() => {
    if (currentPlayer === null || room === null) return;
    writeLastGame({
      code,
      nickname: currentPlayer.nickname,
      roomState: room.state === 'paused' ? 'paused' : 'playing',
      writtenAt: Date.now(),
    });
  }, [code, currentPlayer, room]);

  // If the room is still in lobby state, send the player back to the lobby.
  useEffect(() => {
    if (room?.state === 'lobby') {
      router.push(`/rooms/${code}/lobby`);
    }
  }, [room?.state, code, router]);

  // Auto-pause: when presence drops to only this client for 30 s,
  // POST /pause. The timer resets whenever more players reconnect.
  // We use a ref to hold the timer ID so cleanup is synchronous.
  const autoPauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Only arm auto-pause when a previously-multiplayer session drops to
  // 1 player. Without this guard a solo game (1 player total) would
  // trigger auto-pause 30s after the page loads and loop forever.
  const hadMultiplePlayersRef = useRef(false);
  useEffect(() => {
    if (onlinePlayerIds.size > 1) hadMultiplePlayersRef.current = true;
  }, [onlinePlayerIds.size]);

  useEffect(() => {
    if (room?.state !== 'playing') return;
    if (onlinePlayerIds.size > 1 || !hadMultiplePlayersRef.current) {
      // Others still connected, or this was always a solo session — cancel.
      if (autoPauseTimerRef.current !== null) {
        clearTimeout(autoPauseTimerRef.current);
        autoPauseTimerRef.current = null;
      }
      return;
    }
    // Last client standing in a previously-multiplayer session — start 30s countdown.
    autoPauseTimerRef.current = setTimeout(() => {
      void (async () => {
        const client = getSupabaseBrowserClient();
        const { data: session } = await client.auth.getSession();
        const token = session.session?.access_token;
        if (!token) return;
        await fetch(`/api/rooms/${code}/pause`, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}` },
        });
      })();
    }, 30_000);
    return () => {
      if (autoPauseTimerRef.current !== null) {
        clearTimeout(autoPauseTimerRef.current);
        autoPauseTimerRef.current = null;
      }
    };
  }, [onlinePlayerIds.size, room?.state, code]);

  const handleResume = (): void => {
    void (async () => {
      const client = getSupabaseBrowserClient();
      const { data: session } = await client.auth.getSession();
      const token = session.session?.access_token;
      if (!token) return;
      await fetch(`/api/rooms/${code}/resume`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      });
      // Room state update arrives via the lobby_room Realtime channel —
      // the overlay dismisses automatically.
    })();
  };

  const handleLeave = (): void => {
    clearLastGame();
    router.push('/');
  };

  // Pause overlay — shown whenever room.state === 'paused'.
  const isPaused = room?.state === 'paused';

  // Surface fetch errors (expired session, RLS denial, room not found).
  if (error !== null) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-veil">
        <p
          role="alert"
          className="rounded border border-pillar-severity/50 bg-pillar-severity/10 px-4 py-3 text-sm text-pillar-severity"
        >
          {error}
        </p>
        <button
          type="button"
          onClick={handleLeave}
          className="rounded border border-veil/30 px-4 py-2 text-xs uppercase tracking-widest"
        >
          Back to home
        </button>
      </main>
    );
  }

  // Loading state: room fetch or game snapshot not yet received.
  if (loading || gameState === null || room === null) {
    return (
      <main className="flex min-h-screen items-center justify-center text-veil">
        <p className="text-sm opacity-50">Connecting…</p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen text-veil">
      <ColorBloom color="#ffd700" position="bottom" intensity={0.12} />
      <SettingsButton />

      <PlayScreen
        initialState={gameState}
        rng={rng}
        roomCode={code}
      />

      {isPaused ? (
        <PauseOverlay
          code={code}
          pausedAt={room.paused_at}
          onResume={handleResume}
          onLeave={handleLeave}
        />
      ) : null}
    </main>
  );
}

function PauseOverlay({
  code,
  pausedAt,
  onResume,
  onLeave,
}: {
  readonly code: string;
  readonly pausedAt: string | null;
  readonly onResume: () => void;
  readonly onLeave: () => void;
}): JSX.Element {
  const pausedAgo = pausedAt !== null
    ? formatAgo(Date.now() - new Date(pausedAt).getTime())
    : null;

  return (
    <div
      data-pause-overlay
      className="
        fixed inset-0 z-50 flex flex-col items-center justify-center
        bg-ground/80 backdrop-blur-sm
      "
    >
      <div className="w-full max-w-sm rounded border border-veil/20 bg-ground/90 px-8 py-8 text-center">
        <p className="font-display text-4xl tracking-widest text-veil/40">⏸</p>
        <h1 className="mt-3 font-display text-2xl tracking-widest text-veil">
          Game Paused
        </h1>
        {pausedAgo !== null ? (
          <p className="mt-1 text-xs opacity-50">Paused {pausedAgo}</p>
        ) : null}
        <p className="mt-3 font-mono text-lg tracking-widest text-illumination">
          {code}
        </p>
        <p className="mt-1 text-xs opacity-40">Share this code to let others rejoin</p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onResume}
            className="
              w-full rounded bg-illumination px-6 py-3
              font-display tracking-widest text-ground
            "
          >
            Resume Game
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="
              rounded border border-veil/30 px-6 py-2
              text-xs uppercase tracking-widest text-veil/60
            "
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}

function formatAgo(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}
