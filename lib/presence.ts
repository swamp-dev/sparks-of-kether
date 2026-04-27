'use client';
import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from './supabase';

/**
 * Subscribe to a room's Supabase Presence channel and surface the set
 * of currently-online player ids.
 *
 * Each connected client tracks `{ playerId, joinedAt }` on the
 * `presence:{roomId}` channel; the channel's sync event diffs the
 * full presence state and we recompute the online set from it.
 *
 * Strict-mode-safe: cancelled-flag cleanup, untrack + remove on
 * unmount.
 *
 * Tradeoff: we recompute the entire `Set` on every sync. Per design
 * a room caps at 4 players, so this is comfortably cheap. If room
 * sizes grow, switch to delta tracking via `'join'`/`'leave'`
 * events instead of full sync.
 */

export interface UsePresenceReturn {
  /** Player ids currently present on the channel. */
  readonly onlinePlayerIds: ReadonlySet<string>;
  /** True once the channel has SUBSCRIBED at least once. */
  readonly connected: boolean;
  readonly error: string | null;
}

interface PresenceMeta {
  readonly playerId: string;
  readonly joinedAt: string;
}

export function usePresence(
  roomId: string | null,
  selfPlayerId: string | null,
): UsePresenceReturn {
  const [onlinePlayerIds, setOnlinePlayerIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (roomId === null || selfPlayerId === null) return;
    let cancelled = false;
    const client = getSupabaseBrowserClient();

    // Each client gets its own ephemeral key (Supabase's presence
    // surface) but we re-key by playerId in the sync diff so two
    // tabs from the same player collapse to one online entry.
    const channel = client.channel(`presence:${roomId}`, {
      config: { presence: { key: selfPlayerId } },
    });

    channel.on('presence', { event: 'sync' }, () => {
      if (cancelled) return;
      const presenceState = channel.presenceState() as Record<
        string,
        readonly PresenceMeta[]
      >;
      // Each top-level key is a presence-key (we set it to playerId)
      // and the value is an array of metas (one per tab/connection).
      // We collapse to a flat Set of playerIds.
      const ids = new Set<string>();
      for (const metas of Object.values(presenceState)) {
        for (const meta of metas) {
          if (meta.playerId) ids.add(meta.playerId);
        }
      }
      setOnlinePlayerIds(ids);
    });

    channel.subscribe((status) => {
      if (cancelled) return;
      if (status === 'SUBSCRIBED') {
        setConnected(true);
        // Once subscribed, broadcast self-presence. Untrack happens
        // on unmount via `removeChannel`, but explicit untrack first
        // is cleaner so the leave event fires before disconnect.
        const meta: PresenceMeta = {
          playerId: selfPlayerId,
          joinedAt: new Date().toISOString(),
        };
        void channel.track(meta);
      } else if (
        status === 'CHANNEL_ERROR' ||
        status === 'TIMED_OUT' ||
        status === 'CLOSED'
      ) {
        // CLOSED fires both on our own cleanup (via removeChannel —
        // `cancelled` short-circuits this branch) and on a
        // server-initiated close, in which case we want to surface
        // it so the UI can re-render with stale-set warnings.
        setError(status);
        setConnected(false);
      }
    });

    return () => {
      cancelled = true;
      void channel.untrack();
      void client.removeChannel(channel);
    };
  }, [roomId, selfPlayerId]);

  return { onlinePlayerIds, connected, error };
}
