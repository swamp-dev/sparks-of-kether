'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readLastGame, clearLastGame, type LastGame } from '@/lib/last-game';

/**
 * "Continue Game" banner — shown on the home page when the player has a
 * recent active room bookmarked in localStorage (`sok.lastGame`).
 *
 * SSR-safe: renders null on the server (useState initialises to null),
 * then a useEffect populates from localStorage on the client. This avoids
 * hydration mismatches — the server and client initially agree on "nothing."
 *
 * "Resume" routes to the play page (playing/paused) or lobby (lobby state).
 * "Leave" clears the bookmark and hides the banner — it does NOT call any
 * API; the room in Supabase persists until the host resets or game ends.
 */

export function ContinueGame(): JSX.Element | null {
  const router = useRouter();
  const [entry, setEntry] = useState<LastGame | null>(null);

  useEffect(() => {
    setEntry(readLastGame());
  }, []);

  if (entry === null) return null;

  const handleResume = (): void => {
    const path =
      entry.roomState === 'lobby'
        ? `/rooms/${entry.code}/lobby`
        : `/rooms/${entry.code}/play`;
    router.push(path);
  };

  const handleLeave = (): void => {
    clearLastGame();
    setEntry(null);
  };

  return (
    <div
      data-continue-game
      className="
        mx-auto mt-6 w-full max-w-sm rounded border border-veil/20
        bg-ground/60 px-5 py-4 backdrop-blur-sm
      "
    >
      <p className="text-xs uppercase tracking-widest opacity-50">
        {entry.roomState === 'lobby' ? 'In lobby' : 'Game in progress'}
      </p>
      <p className="mt-1 font-display text-sm tracking-wider text-veil">
        Continue as{' '}
        <span className="text-illumination">{entry.nickname}</span>
        {' — room '}
        <span className="font-mono tracking-widest">{entry.code}</span>
      </p>
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={handleResume}
          aria-label="Resume game"
          className="
            flex-1 rounded bg-illumination px-4 py-2 text-xs
            font-display uppercase tracking-widest text-ground
          "
        >
          Resume →
        </button>
        <button
          type="button"
          onClick={handleLeave}
          aria-label="Leave game"
          className="
            rounded border border-veil/30 px-4 py-2 text-xs
            uppercase tracking-widest text-veil/60
          "
        >
          Leave ×
        </button>
      </div>
    </div>
  );
}
