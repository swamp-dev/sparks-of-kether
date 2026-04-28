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
 *
 * **Behavior deltas vs. the pre-#107 version of this hook** (called
 * out by the post-hoc review of PR #116; documenting here so callers
 * know what changed):
 *
 *   1. `error` now resets to `null` on reconnect. The original kept
 *      a stale error string visible across status transitions —
 *      e.g. a `TIMED_OUT` followed by recovery would leave the UI
 *      reporting an error indefinitely. The new behavior is correct
 *      but is a real change.
 *
 *   2. `error` strings are now lowercase / hyphenated
 *      (`'error'` | `'timed-out'` | `'closed'`) — the observable's
 *      domain enum — instead of the raw Supabase status names
 *      (`'CHANNEL_ERROR'` | `'TIMED_OUT'` | `'CLOSED'`). Any caller
 *      doing string-equality on the error value MUST update. As of
 *      writing no production caller reads `.error` so this is safe;
 *      flagged here so the next consumer doesn't get bitten.
 */

export interface UsePresenceReturn {
  /** Player ids currently present on the channel. */
  readonly onlinePlayerIds: ReadonlySet<string>;
  /** True once the channel has SUBSCRIBED at least once. */
  readonly connected: boolean;
  /**
   * Channel error state. `null` when healthy. Lowercase domain
   * strings (`'error'` | `'timed-out'` | `'closed'`) — see the
   * "Behavior deltas" note in the file docstring above.
   */
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
