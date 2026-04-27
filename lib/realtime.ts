'use client';
import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from './supabase';
import {
  deserializeGameState,
  type GameStateRow,
  type SerializedGameState,
} from './supabase';
import type { GameState } from '@/engine/types';

/**
 * Subscribe to a room's `game_states` row and keep the deserialized
 * `GameState` in React state. Server actions mutate the snapshot
 * (see `app/api/rooms/[code]/events/route.ts`); Supabase Realtime
 * pushes the row update; this hook deserializes and re-renders.
 *
 * Returns `state: null` while the initial snapshot is in flight, then
 * the latest state on every push. `connected` reflects the channel's
 * SUBSCRIBED status — UI can grey out controls when false.
 *
 * Strict-mode-safe: the effect cleans up its channel and ignores
 * stale post-unmount setStates.
 */

export interface UseRoomStateReturn {
  readonly state: GameState | null;
  readonly connected: boolean;
  readonly error: string | null;
  /** Last-applied row's `last_event_id`. Useful for skip detection. */
  readonly lastEventId: number | null;
}

export function useRoomState(roomId: string | null): UseRoomStateReturn {
  const [state, setState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEventId, setLastEventId] = useState<number | null>(null);

  useEffect(() => {
    if (roomId === null) return;
    let cancelled = false;
    const client = getSupabaseBrowserClient();

    // Initial snapshot fetch — without it, the first render after
    // subscribe() shows `null` until something writes.
    void (async () => {
      const snapshot = await client
        .from('game_states')
        .select()
        .eq('room_id', roomId)
        .maybeSingle<GameStateRow>();
      if (cancelled) return;
      if (snapshot.error) {
        setError(snapshot.error.message);
        return;
      }
      if (snapshot.data) {
        setState(deserializeGameState(snapshot.data.snapshot));
        setLastEventId(snapshot.data.last_event_id);
      }
    })();

    // Realtime subscription. Channel name is per-room; the server
    // writes the snapshot row, Postgres fires the UPDATE, and
    // Supabase Realtime broadcasts.
    const channel = client
      .channel(`game_state:${roomId}`)
      .on(
        // The narrow type for `on` rejects 'postgres_changes' as a
        // string literal in some Supabase JS versions; the cast
        // matches what the runtime accepts.
        'postgres_changes' as 'system',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_states',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: { new: GameStateRow }) => {
          if (cancelled) return;
          const newRow = payload.new;
          setState(deserializeGameState(newRow.snapshot as SerializedGameState));
          setLastEventId(newRow.last_event_id);
        },
      )
      .subscribe((status) => {
        if (cancelled) return;
        setConnected(status === 'SUBSCRIBED');
      });

    return () => {
      cancelled = true;
      void client.removeChannel(channel);
    };
  }, [roomId]);

  return { state, connected, error, lastEventId };
}
