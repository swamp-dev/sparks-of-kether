'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { Lobby, type LobbyPlayer } from '@/components/setup/Lobby';
import type { PlayerRow, RoomRow } from '@/lib/supabase';
import type { SoulAspectKey } from '@/data';

/**
 * Room lobby page. Reads players + room from Supabase and renders the
 * existing Lobby component. Live updates (Supabase Realtime) come in
 * the next ticket (#34); for now we re-fetch on a manual refresh
 * button so the page is at least demo-able once the user wires a
 * real Supabase project.
 *
 * Without env vars (`.env.local` not configured) the page surfaces a
 * clear error rather than crashing — the multiplayer flow is
 * gated on user setup.
 */

interface LobbyPageProps {
  // Next.js 14: params is a plain object, not a Promise. (Next 15
  // changed this; we'll switch to `use(params)` if/when the project
  // upgrades.)
  readonly params: { readonly code: string };
}

export default function LobbyPage({ params }: LobbyPageProps): JSX.Element {
  const { code } = params;
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<readonly PlayerRow[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const client = getSupabaseBrowserClient();
        const { data: user } = await client.auth.getUser();
        if (!cancelled) {
          setCurrentPlayerId(user.user?.id ?? null);
        }
        const roomLookup = await client
          .from('rooms')
          .select()
          .eq('code', code)
          .maybeSingle<RoomRow>();
        if (cancelled) return;
        if (roomLookup.error || !roomLookup.data) {
          setError(`No room with code ${code}.`);
          return;
        }
        setRoom(roomLookup.data);
        const playersLookup = await client
          .from('players')
          .select()
          .eq('room_id', roomLookup.data.id)
          .order('seat', { ascending: true });
        if (cancelled) return;
        if (playersLookup.error) {
          setError(`Could not load players: ${playersLookup.error.message}`);
          return;
        }
        setPlayers((playersLookup.data ?? []) as PlayerRow[]);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, refresh]);

  if (error !== null) {
    return (
      <main className="min-h-screen bg-ground p-8 text-center text-veil">
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

  const lobbyPlayers: readonly LobbyPlayer[] = players.map((p) => ({
    id: p.id,
    name: p.nickname,
    soulAspect: p.soul_aspect as SoulAspectKey | null,
    ready: p.ready,
  }));

  return (
    <main className="min-h-screen bg-ground p-8 text-veil">
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
        onBegin={() => {
          setError('Multiplayer game start not yet wired (next ticket).');
        }}
      />

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => setRefresh((n) => n + 1)}
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
