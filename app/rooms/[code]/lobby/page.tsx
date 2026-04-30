'use client';
import Link from 'next/link';
import { Lobby, type LobbyPlayer } from '@/components/setup/Lobby';
import { ZodiacSignPicker } from '@/components/setup/ZodiacSignPicker';
import { useLobby } from '@/lib/use-lobby';
import type { ZodiacSignKey } from '@/data';

/**
 * Room lobby page. Thin renderer over `useLobby(code)` — the hook
 * owns data fetching, the begin-game POST, the Realtime players-row
 * subscription, and the in-flight flag that prevents double-click 409s.
 * See `lib/use-lobby.ts`.
 *
 * #265 wires the per-player ZodiacSignPicker for multiplayer; the
 * hot-seat path in `app/play/page.tsx` keeps its own local-state
 * picker (no Supabase round-trip needed there).
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
    setZodiacSign,
    setReady,
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

  // The current player's row drives whether we render the picker or
  // the lobby. `currentPlayerId` can be null briefly between the
  // anon-auth bootstrap and the first players fetch; in that window
  // the lobby renders read-only (no toggle, no picker).
  const currentPlayer =
    currentPlayerId !== null
      ? players.find((p) => p.id === currentPlayerId) ?? null
      : null;
  const needsSignPick =
    currentPlayer !== null && currentPlayer.zodiac_sign === null;

  // `taken` mirrors the hot-seat picker's pattern (`app/play/page.tsx`):
  // a sign already chosen by another player renders disabled in the
  // grid with the taker's name visible, so two players can't race to
  // the same sign client-side. The server-side gate
  // (`validateAndBuildSetup` returns `duplicate-zodiac-signs`) is the
  // floor — this is the friendlier UX above it.
  const taken: Partial<Record<ZodiacSignKey, string>> = {};
  for (const p of players) {
    if (p.zodiac_sign !== null && p.id !== currentPlayerId) {
      taken[p.zodiac_sign as ZodiacSignKey] = p.nickname;
    }
  }

  const handlePick = (sign: ZodiacSignKey): void => {
    void setZodiacSign(sign);
  };

  const handleToggleReady = (playerId: string): void => {
    if (currentPlayer === null || playerId !== currentPlayer.id) return;
    // Don't let a player flip ready before they've picked a sign —
    // mirrors the server-side `missing-zodiac-sign` rejection so the
    // gate is visible per-player, not just at Begin time.
    if (currentPlayer.zodiac_sign === null) return;
    void setReady(!currentPlayer.ready);
  };

  if (needsSignPick) {
    return (
      <main className="min-h-screen p-8 text-veil">
        <header className="mb-6 text-center">
          <h1 className="font-display text-3xl tracking-widest">
            {currentPlayer.nickname} — Choose Sign
          </h1>
          <p className="mt-1 font-display text-2xl tracking-[0.5em] text-illumination">
            {code}
          </p>
        </header>
        <ZodiacSignPicker taken={taken} onPick={handlePick} />
      </main>
    );
  }

  const lobbyPlayers: readonly LobbyPlayer[] = players.map((p) => ({
    id: p.id,
    name: p.nickname,
    zodiacSign: p.zodiac_sign as ZodiacSignKey | null,
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
        onToggleReady={handleToggleReady}
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
          Picks and ready toggles sync across tabs in real time.
        </p>
      </div>
    </main>
  );
}
