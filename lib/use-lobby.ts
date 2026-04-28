'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabaseBrowserClient } from './supabase';
import type { PlayerRow, RoomRow } from './supabase';

/**
 * Lobby page state machine extracted from
 * `app/rooms/[code]/lobby/page.tsx`. The hook owns:
 *
 *   - Initial fetch (rooms + players + current user) on mount.
 *   - Manual refresh (`refresh()` to re-fetch — Realtime live updates
 *     are a separate concern handled by `useRoomState`).
 *   - The begin-game POST to `/api/rooms/[code]/start`, including the
 *     `beginning` in-flight flag that prevents double-click 409s.
 *
 * Why a hook: the page component had three useState calls + one
 * useEffect + one fire-and-forget begin-game closure all colliding
 * inline. The page tested at 0% per the T1a coverage baseline (#86)
 * because the data-fetching and side-effect branches were
 * unreachable from any React Testing Library test that didn't first
 * stand up Supabase. Extracting to a hook lets us cover the same
 * surface via `renderHook` with a mocked `getSupabaseBrowserClient`.
 */

export interface UseLobbyReturn {
  readonly room: RoomRow | null;
  readonly players: readonly PlayerRow[];
  readonly currentPlayerId: string | null;
  readonly error: string | null;
  /** True between `beginGame()` invocation and the response landing. */
  readonly beginning: boolean;
  /** Trigger a re-fetch of room + players. */
  readonly refresh: () => void;
  /** POST `/api/rooms/[code]/start`. Idempotent re-entry: returns early if `beginning`. */
  readonly beginGame: () => void;
}

export function useLobby(code: string): UseLobbyReturn {
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<readonly PlayerRow[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [beginning, setBeginning] = useState(false);
  // Guard against re-entrancy within a single render. `beginning`
  // is React state — synchronous double-clicks both see the
  // pre-update value via the useCallback closure. The ref flips
  // immediately on the first call so the second call returns early.
  const beginningRef = useRef(false);

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
  }, [code, refreshTick]);

  const refresh = useCallback((): void => {
    setRefreshTick((n) => n + 1);
  }, []);

  const beginGame = useCallback((): void => {
    if (beginningRef.current) return;
    beginningRef.current = true;
    setBeginning(true);
    void (async () => {
      try {
        const client = getSupabaseBrowserClient();
        const { data: session } = await client.auth.getSession();
        const token = session.session?.access_token;
        if (!token) {
          setError('Not signed in. Please refresh.');
          return;
        }
        const res = await fetch(`/api/rooms/${code}/start`, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setRefreshTick((n) => n + 1);
          return;
        }
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          reason?: { kind?: string };
        };
        setError(
          `Could not start game: ${
            body.reason?.kind ?? body.error ?? `HTTP ${res.status}`
          }`,
        );
      } finally {
        beginningRef.current = false;
        setBeginning(false);
      }
    })();
  }, [code]);

  return {
    room,
    players,
    currentPlayerId,
    error,
    beginning,
    refresh,
    beginGame,
  };
}
