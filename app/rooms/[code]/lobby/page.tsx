'use client';
import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Lobby, type LobbyPlayer } from '@/components/setup/Lobby';
import { ZodiacSignPicker } from '@/components/setup/ZodiacSignPicker';
import { AvatarStack, type PresencePeer } from '@/components/presence/AvatarStack';
import { useLobby } from '@/lib/use-lobby';
import { usePresence } from '@/lib/presence';
import { sefirot, zodiacSigns } from '@/data';
import type { ZodiacSignKey } from '@/data';

/**
 * Maps each zodiac sign to its primary-ruler Sefirah accent color.
 * The ruler-Sefirah link is the same one Soul Doors use (a sign's
 * ruler maps to a Sefirah; that Sefirah is its "home gate"). This
 * keeps the avatar tint consistent with the ColorBloom on the play
 * screen — no new color taxonomy.
 */
const SIGN_COLOR_BY_KEY = (() => {
  const sefirahColorByPlanet = new Map<string, string>();
  for (const s of sefirot) {
    if (s.planetKey !== undefined) sefirahColorByPlanet.set(s.planetKey, s.color);
  }
  const out: Partial<Record<ZodiacSignKey, string>> = {};
  for (const sign of zodiacSigns) {
    const color = sefirahColorByPlanet.get(sign.ruler);
    if (color !== undefined) out[sign.key] = color;
  }
  return out;
})();

const SIGN_GLYPH_BY_KEY = Object.fromEntries(zodiacSigns.map((s) => [s.key, s.glyph])) as Record<
  ZodiacSignKey,
  string
>;

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
  const router = useRouter();
  const {
    room,
    players,
    currentPlayerId,
    error,
    loading,
    beginning,
    resetting,
    refresh,
    beginGame,
    resetGame,
    setZodiacSign,
    setReady,
  } = useLobby(code);

  // When the game starts (host clicks Begin, or this tab was open when
  // another tab triggered the start), send the player to the play surface.
  useEffect(() => {
    if (room?.state === 'playing' || room?.state === 'paused') {
      router.push(`/rooms/${code}/play`);
    }
  }, [room?.state, code, router]);

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
        <p role="status" aria-live="polite" data-loading className="mt-8 text-sm opacity-70">
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
    currentPlayerId !== null ? (players.find((p) => p.id === currentPlayerId) ?? null) : null;
  const needsSignPick = currentPlayer !== null && currentPlayer.zodiac_sign === null;

  // Room is in a non-lobby state (playing or finished). Show a recovery
  // screen: the host can reset back to lobby so players can start again.
  // Exclude 'paused' — the useEffect above already redirects paused rooms
  // to /play; showing the reset UI here would let the host destroy an
  // in-progress paused game before the redirect fires.
  if (room !== null && room.state !== 'lobby' && room.state !== 'paused') {
    const isHost = room.host_id === currentPlayerId;
    return (
      <main className="min-h-screen p-8 text-center text-veil">
        <h1 className="font-display text-3xl tracking-widest">Lobby — {code}</h1>
        <p className="mx-auto mt-6 max-w-md text-sm opacity-70">
          {room.state === 'playing' ? 'A game is in progress.' : 'The game has ended.'}
        </p>
        {isHost ? (
          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={resetGame}
              disabled={resetting}
              data-action="reset-room"
              className="rounded border border-veil/30 px-6 py-2 font-display tracking-widest disabled:cursor-not-allowed disabled:opacity-40"
            >
              {resetting ? 'Resetting…' : 'Play Again'}
            </button>
            <p className="text-xs uppercase tracking-widest opacity-50">
              Resets the room so everyone can set up and begin a new game
            </p>
          </div>
        ) : (
          <p className="mt-6 text-xs uppercase tracking-widest opacity-50">
            Waiting for the host to reset the room
          </p>
        )}
        <Link
          href="/"
          className="mt-8 inline-block rounded border border-veil/30 px-4 py-2 text-xs uppercase tracking-widest"
        >
          Back to home
        </Link>
      </main>
    );
  }

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
      <main className="flex h-dvh flex-col p-4 pt-6 text-veil sm:p-8">
        <header className="mb-6 shrink-0 text-center">
          <h1 className="font-display text-3xl tracking-widest">
            {currentPlayer.nickname} — Choose Sign
          </h1>
          <p className="mt-1 font-display text-2xl tracking-[0.5em] text-illumination">{code}</p>
        </header>
        <ZodiacSignPicker taken={taken} onPick={handlePick} className="min-h-0 flex-1" />
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
    <main className="relative min-h-screen p-8 text-veil">
      {/*
        #322 — Figma-style avatar stack. Top-right of the lobby so
        players see their party assemble in real time as peers join,
        pick signs, and toggle ready. Honors the existing presence
        roster (`usePresence`) for online/offline state without
        introducing a parallel channel.
      */}
      <PresenceAvatarStack
        roomId={room?.id ?? null}
        viewerPlayerId={currentPlayerId}
        players={players}
      />
      <header className="mb-6 text-center">
        <h1 className="font-display text-3xl tracking-widest">Lobby</h1>
        <p className="mt-1 font-display text-2xl tracking-[0.5em] text-illumination">{code}</p>
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

/**
 * Presence-aware avatar stack rendered fixed top-right. Pulls
 * online/offline from the existing `usePresence` channel so a
 * disconnected peer's avatar dims without needing a second presence
 * pipeline. Active player surfaces during play, not lobby — in lobby
 * the active-player concept doesn't apply, so we mark the viewer
 * themselves as "active" purely as a self-locator (the ring is the
 * viewer's; the gold tells them which avatar is "you").
 */
/**
 * `PresenceAvatarStack` reads the same `players` array `useLobby`
 * already produces — no duplicate mapping at the call site. The
 * inline narrowing here (`p.zodiac_sign as ZodiacSignKey | null`)
 * mirrors the cast in `lobbyPlayers` above; both run against the
 * same `PlayerRow.zodiac_sign: string | null` field.
 */
function PresenceAvatarStack({
  roomId,
  viewerPlayerId,
  players,
}: {
  readonly roomId: string | null;
  readonly viewerPlayerId: string | null;
  readonly players: readonly {
    readonly id: string;
    readonly nickname: string;
    readonly zodiac_sign: string | null;
  }[];
}): JSX.Element | null {
  const { onlinePlayerIds } = usePresence(roomId, viewerPlayerId);

  const peers = useMemo<readonly PresencePeer[]>(
    () =>
      players.map((p) => {
        const sign = p.zodiac_sign as ZodiacSignKey | null;
        const glyph = sign ? SIGN_GLYPH_BY_KEY[sign] : null;
        return {
          playerId: p.id,
          name: p.nickname,
          color: (sign && SIGN_COLOR_BY_KEY[sign]) ?? '#f8f8ff',
          ...(glyph ? { glyph } : {}),
          online: onlinePlayerIds.has(p.id),
        };
      }),
    [players, onlinePlayerIds],
  );

  if (peers.length === 0 || viewerPlayerId === null) return null;

  return (
    <div className="absolute right-4 top-4 z-20" data-testid="lobby-avatar-stack-wrapper">
      <AvatarStack
        peers={peers}
        viewerPlayerId={viewerPlayerId}
        // In the lobby we don't have a "current turn" concept — point
        // the gold ring at the viewer themselves so they can spot
        // their own avatar at a glance.
        activePlayerId={viewerPlayerId}
      />
    </div>
  );
}
