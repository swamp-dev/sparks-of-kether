'use client';
import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from './supabase';
import { presenceSubscription } from './presence-observable';

/**
 * React adapter over `presenceSubscription` (`./presence-observable`).
 * The observable owns Supabase channel lifecycle + status branching;
 * this hook owns the React state (`onlinePlayerIds`, `connected`,
 * `error`) and unmount teardown. See `./presence-observable.ts` for
 * the testable core.
 */

export interface UsePresenceReturn {
  /** Player ids currently present on the channel. */
  readonly onlinePlayerIds: ReadonlySet<string>;
  /** True once the channel has SUBSCRIBED at least once. */
  readonly connected: boolean;
  readonly error: string | null;
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
    const client = getSupabaseBrowserClient();
    const subscription = presenceSubscription(client, roomId, selfPlayerId);
    const unsubscribe = subscription.subscribe(
      ({ onlinePlayerIds: ids }) => {
        setOnlinePlayerIds(ids);
      },
      (status) => {
        if (status === 'connected') {
          setConnected(true);
          setError(null);
        } else {
          // 'error' | 'closed' | 'timed-out' — surface to the UI so
          // it can grey out controls or show a stale-state warning.
          setError(status);
          setConnected(false);
        }
      },
    );
    return unsubscribe;
  }, [roomId, selfPlayerId]);

  return { onlinePlayerIds, connected, error };
}
