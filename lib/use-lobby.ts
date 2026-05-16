'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ZodiacSignKey } from '@/data';
import { setReady as setReadyMutation, setZodiacSign as setZodiacSignMutation } from './rooms';
import { getSupabaseBrowserClient } from './supabase';
import type { PlayerRow, RoomRow } from './supabase';

/**
 * Lobby page state machine extracted from
 * `app/rooms/[code]/lobby/page.tsx`. The hook owns:
 *
 *   - Initial fetch (rooms + players + current user) on mount.
 *   - Manual refresh (`refresh()` to re-fetch — Realtime live updates
 *     are wired here too as of #265, see below).
 *   - The begin-game POST to `/api/rooms/[code]/start`, including the
 *     `beginning` in-flight flag that prevents double-click 409s.
 *   - Lobby mutations: `setZodiacSign(sign)` and `setReady(ready)` —
 *     thin wrappers around `lib/rooms.ts` that target the current
 *     player's row. The Realtime subscription propagates the write to
 *     other tabs, so callers do not need to manually refresh.
 *   - Realtime subscription on the `players` table filtered to this
 *     room. Patches `players` state in place on UPDATE, appends on
 *     INSERT (a new joiner), and removes on DELETE (a kick).
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
  /**
   * True until the first fetch (success or error) resolves. Lets the
   * page distinguish "still connecting" from "successfully empty"
   * — both have `room === null && players.length === 0` otherwise.
   */
  readonly loading: boolean;
  /** True between `beginGame()` invocation and the response landing. */
  readonly beginning: boolean;
  /** Trigger a re-fetch of room + players. */
  readonly refresh: () => void;
  /** POST `/api/rooms/[code]/start`. Idempotent re-entry: returns early if `beginning`. */
  readonly beginGame: () => void;
  /**
   * Update the current player's `zodiac_sign`. Returns `{ ok: false }`
   * if the caller is not signed in (no `currentPlayerId`).
   */
  readonly setZodiacSign: (
    sign: ZodiacSignKey,
  ) => Promise<{ readonly ok: boolean }>;
  /** Update the current player's `ready` flag. */
  readonly setReady: (
    ready: boolean,
  ) => Promise<{ readonly ok: boolean }>;
}

export function useLobby(code: string): UseLobbyReturn {
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<readonly PlayerRow[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [beginning, setBeginning] = useState(false);
  // True until the first fetch resolves. Stays true on subsequent
  // refreshes (the page already has data; "loading" framing would
  // be misleading) — only the *initial* read sets it false.
  const [loading, setLoading] = useState(true);
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
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, refreshTick]);

  // #265: Realtime subscription on `players` filtered to this room.
  // Multiplayer was broken end-to-end without it because the lobby
  // had no way to surface a remote player's zodiac pick or ready
  // toggle without a manual refresh. We re-evaluate when the room
  // id resolves; before that there's no `room_id` filter to mount.
  const roomId = room?.id ?? null;
  useEffect(() => {
    if (roomId === null) return;
    let cancelled = false;
    const client = getSupabaseBrowserClient();
    const channel = client
      .channel(`lobby_players:${roomId}`)
      .on(
        // The narrow type for `on` rejects 'postgres_changes' as a
        // string literal in some Supabase JS versions; cast matches
        // the runtime accept-list. Same pattern as `useRoomState`.
        'postgres_changes' as 'system',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: {
          eventType: 'INSERT' | 'UPDATE' | 'DELETE';
          new: PlayerRow | null;
          old: PlayerRow | null;
        }) => {
          if (cancelled) return;
          setPlayers((prev) => mergeRealtimeRow(prev, payload));
        },
      )
      .subscribe((status) => {
        if (cancelled) return;
        // CHANNEL_ERROR means Supabase rejected the subscription — typical
        // causes are RLS denying the SELECT on `players` for this caller,
        // or the publication missing `players` (the latter is fixed by
        // migration 0005, but a misconfigured staging DB could regress).
        // Without this branch the hook silently stops receiving peer
        // updates: the host clicks Ready, the partner never sees it, and
        // the only diagnostic is "Begin never lights up." Surface it as
        // an `error` and `console.error` so the failure has a paper
        // trail. Mirrors the connection-status pattern in
        // `lib/realtime.ts:86`. We do not introduce new connection-state
        // UI here — that is scope creep for #265; this PR's job is to
        // stop the silence.
        if (status === 'CHANNEL_ERROR') {
          // eslint-disable-next-line no-console
          console.error(
            `[useLobby] Realtime channel error on lobby_players:${roomId}`,
          );
          setError('Realtime sync error. Refresh to retry.');
        }
      });

    // #95: Second subscription on `rooms` filtered to this room. When the
    // host resets (playing → lobby) the rooms.state change never reached
    // non-hosts because only the players table was subscribed. We call
    // setRefreshTick to re-fetch room + players on any rooms event —
    // the same re-fetch path used by `refresh()`. This handles future
    // rooms mutations (e.g. host-transfer) correctly too.
    const roomChannel = client
      .channel(`lobby_room:${roomId}`)
      .on(
        'postgres_changes' as 'system',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        () => {
          if (cancelled) return;
          setRefreshTick((n) => n + 1);
        },
      )
      .subscribe((status) => {
        if (cancelled) return;
        if (status === 'CHANNEL_ERROR') {
          // eslint-disable-next-line no-console
          console.error(
            `[useLobby] Realtime channel error on lobby_room:${roomId}`,
          );
          setError('Realtime sync error. Refresh to retry.');
        }
      });

    return () => {
      cancelled = true;
      void client.removeChannel(channel);
      void client.removeChannel(roomChannel);
    };
  }, [roomId]);

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

  const setZodiacSign = useCallback(
    async (sign: ZodiacSignKey): Promise<{ readonly ok: boolean }> => {
      if (currentPlayerId === null) {
        // Not signed in — caller should resolve `currentPlayerId` first.
        // We surface a clean `ok: false` rather than throwing so the
        // picker can display a friendly error without crashing the page.
        setError('Not signed in. Please refresh.');
        return { ok: false };
      }
      const client = getSupabaseBrowserClient();
      const result = await setZodiacSignMutation(client, {
        playerId: currentPlayerId,
        sign,
      });
      if (!result.ok) {
        setError(`Could not set sign: ${result.error.cause}`);
        return { ok: false };
      }
      // Optimistic local patch: don't wait for the Realtime echo.
      // The remote tab still gets it from the channel; this just
      // closes the visible delay on the picker's own UI.
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === currentPlayerId ? { ...p, zodiac_sign: sign } : p,
        ),
      );
      return { ok: true };
    },
    [currentPlayerId],
  );

  const setReady = useCallback(
    async (ready: boolean): Promise<{ readonly ok: boolean }> => {
      if (currentPlayerId === null) {
        setError('Not signed in. Please refresh.');
        return { ok: false };
      }
      const client = getSupabaseBrowserClient();
      const result = await setReadyMutation(client, {
        playerId: currentPlayerId,
        ready,
      });
      if (!result.ok) {
        setError(`Could not toggle ready: ${result.error.cause}`);
        return { ok: false };
      }
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === currentPlayerId ? { ...p, ready } : p,
        ),
      );
      return { ok: true };
    },
    [currentPlayerId],
  );

  return {
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
  };
}

/**
 * Merge a single `players` Realtime row into the current list. Sorted
 * by seat so callers can rely on stable ordering (the initial fetch
 * does the same).
 *
 * INSERT — append the new row.
 * UPDATE — replace the matching row by id.
 * DELETE — drop the matching row.
 *
 * For UPDATE we patch by id rather than swapping the whole row in
 * case future schema changes carry fields that aren't on the wire
 * (Supabase echoes only the published columns; an `Update`-style
 * payload could lose tracked client-only state if we were holding
 * any). Today PlayerRow is fully on the wire, so a swap is also
 * fine — patch is the safer default.
 */
function mergeRealtimeRow(
  prev: readonly PlayerRow[],
  payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: PlayerRow | null;
    old: PlayerRow | null;
  },
): readonly PlayerRow[] {
  if (payload.eventType === 'DELETE') {
    const target = payload.old?.id;
    if (target === undefined) return prev;
    return prev.filter((p) => p.id !== target);
  }
  if (payload.new === null) return prev;
  const incoming = payload.new;
  const exists = prev.some((p) => p.id === incoming.id);
  const merged = exists
    ? prev.map((p) => (p.id === incoming.id ? { ...p, ...incoming } : p))
    : [...prev, incoming];
  return [...merged].sort((a, b) => a.seat - b.seat);
}
