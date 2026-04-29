'use client';
import Link from 'next/link';
import { Lobby, type LobbyPlayer } from '@/components/setup/Lobby';
import { useLobby } from '@/lib/use-lobby';
import type { SoulAspectKey } from '@/data';

/**
 * Room lobby page. Thin renderer over `useLobby(code)` — the hook
 * owns data fetching, the begin-game POST, and the in-flight flag
 * that prevents double-click 409s. See `lib/use-lobby.ts`.
 */

interface LobbyPageProps {
  // Next.js 14: params is a plain object, not a Promise. (Next 15
  // changed this; we'll switch to `use(params)` if/when the project
  // upgrades.)
  readonly params: { readonly code: string };
}

export default function LobbyPage({ params }: LobbyPageProps): JSX.Element {
  const { code } = params;
  const {
    room,
    players,
    currentPlayerId,
    error,
    loading,
    beginning,
    refresh,
    beginGame,
  } = useLobby(code);

  if (error !== null) {
    return (
      <main className="min-h-screen p-8 text-center text-veil">
        <h1 className="font-display text-3xl tracking-widest">Lobby — {code}</h1>
        <p
          role="alert"
          data-error
          className="mx-auto mt-6 max-w-md rounded border border-pillar-severity/50 bg-pillar-severity/10 px-3 py-2 text-sm text-pillar-severity"
        >
          {error}
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded border border-veil/30 px-4 py-2 text-xs uppercase tracking-widest"
        >
          Back to home
        </Link>
      </main>
    );
  }

  if (loading) {
    // First fetch hasn't resolved. Without this branch the page
    // briefly renders an empty-but-successful-looking lobby (no
    // players yet, no error) which misleads a freshly-arrived user.
    return (
      <main className="min-h-screen p-8 text-center text-veil">
        <h1 className="font-display text-3xl tracking-widest">Lobby — {code}</h1>
        <p
          role="status"
          aria-live="polite"
          data-loading
          className="mt-8 text-sm opacity-70"
        >
          Connecting…
        </p>
      </main>
    );
  }

  const lobbyPlayers: readonly LobbyPlayer[] = players.map((p) => ({
    id: p.id,
    name: p.nickname,
    soulAspect: p.soul_aspect as SoulAspectKey | null,
    ready: p.ready,
  }));

  return (
    <main className="min-h-screen p-8 text-veil">
      <header className="mb-6 text-center">
        <h1 className="font-display text-3xl tracking-widest">Lobby</h1>
        <p className="mt-1 font-display text-2xl tracking-[0.5em] text-illumination">
          {code}
        </p>
        <p className="mt-1 text-xs uppercase tracking-widest opacity-50">
          Share this code so others can join
        </p>
      </header>

      <Lobby
        players={lobbyPlayers}
        isHost={room?.host_id === currentPlayerId}
        {...(currentPlayerId !== null ? { currentPlayerId } : {})}
        beginning={beginning}
        onBegin={beginGame}
      />

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={refresh}
          className="rounded border border-veil/30 px-4 py-1 text-xs uppercase tracking-widest"
          data-action="refresh"
        >
          Refresh
        </button>
        <p className="mt-2 text-xs opacity-40">
          Realtime sync arrives with the next multiplayer ticket.
        </p>
      </div>
    </main>
  );
}
