'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { createRoom, joinRoom, type CreateRoomError, type JoinRoomError } from '@/lib/rooms';
import { ROOM_CODE_LENGTH, normalizeRoomCode } from '@/lib/room-code';
import { clearLastGame, writeLastGame } from '@/lib/last-game';

/**
 * Home-page room forms. Two modes:
 *   - "New game"  → enter nickname → creates room → routes to lobby
 *                   with the freshly-minted code.
 *   - "Join game" → enter code + nickname → routes to lobby for that
 *                   code if it exists and has room.
 *
 * The Supabase client is lazily resolved inside each handler so a
 * page render without env vars (e.g. SSR before localStorage is
 * available, or a misconfigured deploy) doesn't crash the home page.
 * Errors fall through to a visible inline message.
 */

export function HomeRoomForms(): JSX.Element {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (): Promise<void> => {
    if (busy) return;
    if (nickname.trim() === '') {
      setError('Pick a nickname first.');
      return;
    }
    setError(null);
    setBusy(true);
    // createRoom calls auth.signOut() internally, which orphans the old
    // anonymous session. Clear any stale bookmark before the new session begins.
    clearLastGame();
    try {
      const result = await createRoom({
        client: getSupabaseBrowserClient(),
        nickname: nickname.trim(),
      });
      if (!result.ok) {
        setError(formatCreateError(result.error));
        return;
      }
      writeLastGame({
        code: result.value.code,
        nickname: nickname.trim(),
        roomState: 'lobby',
        writtenAt: Date.now(),
      });
      router.push(`/rooms/${result.value.code}/lobby`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error.');
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async (): Promise<void> => {
    if (busy) return;
    const normalized = normalizeRoomCode(code);
    if (normalized === null) {
      setError(`Codes are ${ROOM_CODE_LENGTH} characters from A–Z and 2–9 (no I, O, 0, 1).`);
      return;
    }
    if (nickname.trim() === '') {
      setError('Pick a nickname first.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const result = await joinRoom({
        client: getSupabaseBrowserClient(),
        code: normalized,
        nickname: nickname.trim(),
      });
      if (!result.ok) {
        setError(formatJoinError(result.error));
        return;
      }
      writeLastGame({
        code: normalized,
        nickname: nickname.trim(),
        roomState: 'lobby',
        writtenAt: Date.now(),
      });
      router.push(`/rooms/${normalized}/lobby`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-home-forms className="flex flex-col gap-4">
      <label className="block text-left">
        <span className="block text-xs uppercase tracking-widest opacity-70">Nickname</span>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={24}
          aria-label="Nickname"
          data-input="nickname"
          className="mt-1 w-full rounded border border-veil/40 bg-ground/40 px-3 py-2 text-veil"
        />
      </label>

      <button
        type="button"
        onClick={handleCreate}
        disabled={busy}
        data-action="create-room"
        className="rounded bg-illumination px-6 py-3 font-display tracking-widest text-ground disabled:opacity-30"
      >
        {busy ? 'Creating…' : 'New game'}
      </button>

      <div className="my-2 flex items-center gap-3 text-xs uppercase tracking-widest opacity-40">
        <span className="h-px flex-1 bg-veil/20" />
        <span>or</span>
        <span className="h-px flex-1 bg-veil/20" />
      </div>

      <label className="block text-left">
        <span className="block text-xs uppercase tracking-widest opacity-70">Room code</span>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={ROOM_CODE_LENGTH}
          aria-label="Room code"
          data-input="room-code"
          placeholder="ABCDEF"
          className="mt-1 w-full rounded border border-veil/40 bg-ground/40 px-3 py-2 text-center font-display text-2xl tracking-widest text-veil"
        />
      </label>

      <button
        type="button"
        onClick={handleJoin}
        disabled={busy}
        data-action="join-room"
        className="rounded border border-illumination px-6 py-3 font-display tracking-widest text-illumination disabled:opacity-30"
      >
        {busy ? 'Joining…' : 'Join game'}
      </button>

      {error !== null ? (
        <p
          role="alert"
          data-error
          className="rounded border border-pillar-severity/50 bg-pillar-severity/10 px-3 py-2 text-sm text-pillar-severity"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function formatCreateError(err: CreateRoomError): string {
  switch (err.kind) {
    case 'auth-failed':
      return `Couldn't start an anonymous session. ${err.cause}`;
    case 'code-generation-exhausted':
      return 'The lobby is unusually busy. Please try again in a moment.';
    case 'insert-failed':
      // Player-facing message stays gentle; the cause stays in the
      // browser console for dev triage.
      console.error('[room] insert-failed', err.cause);
      return 'Something went wrong opening the room. Please try again.';
  }
}

function formatJoinError(err: JoinRoomError): string {
  switch (err.kind) {
    case 'auth-failed':
      return `Couldn't start an anonymous session. ${err.cause}`;
    case 'room-not-found':
      return `No room with code ${err.code}.`;
    case 'room-not-joinable':
      if (err.state === 'playing') return 'That game is already in progress.';
      if (err.state === 'paused')
        return 'That game is paused. Use your Continue Game bookmark to rejoin.';
      return 'That game has finished.';
    case 'room-full':
      return 'That room is full (4 players max).';
    case 'seat-rpc-failed':
      // The `join_room_next_seat` RPC (#325, migration 0006) is the
      // server-side seat picker. A failure here is a deployment /
      // migration drift issue, not a normal user condition; the
      // cause is logged for dev triage and the player gets a
      // gentle retry prompt.
      console.error('[room] seat-rpc-failed', err.cause);
      return 'Something went wrong joining the room. Please try again.';
    case 'self-lookup-failed':
      // Post-RPC re-join detection read failure (e.g. transient
      // PostgREST error). Surface so the user can retry rather
      // than fall through to a confusing constraint-violation
      // `insert-failed`.
      console.error('[room] self-lookup-failed', err.cause);
      return 'Something went wrong joining the room. Please try again.';
    case 'insert-failed':
      console.error('[room] insert-failed', err.cause);
      return 'Something went wrong joining the room. Please try again.';
  }
}
