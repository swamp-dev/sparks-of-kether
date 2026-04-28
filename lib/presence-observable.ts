import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Pure-ish presence subscription wrapped around Supabase Realtime.
 * Returns plain callbacks/snapshots, no React. Intended to be the
 * unit of testable presence logic — `usePresence` in `./presence.ts`
 * is the React adapter that consumes this and writes to React state.
 *
 * Why split: the React hook conflates Supabase channel lifecycle
 * (subscribe / track / untrack / removeChannel) with React state.
 * The four channel-status branches (`SUBSCRIBED`, `CHANNEL_ERROR`,
 * `TIMED_OUT`, `CLOSED`) plus the teardown path
 * (`untrack() + removeChannel()`) are reachable here without a
 * `renderHook` harness. Test the observable for logic, test the
 * hook for React glue.
 */

export type PresenceStatus = 'connected' | 'error' | 'closed' | 'timed-out';

export interface PresenceSnapshot {
  /** Player ids currently present on the channel. */
  readonly onlinePlayerIds: ReadonlySet<string>;
}

export interface PresenceMeta {
  readonly playerId: string;
  readonly joinedAt: string;
}

export interface PresenceSubscription {
  /**
   * Begin tracking. The supplied callbacks fire on:
   *   - `onSnapshot` — every presence sync (initial + diffs).
   *   - `onStatus` — channel-status transitions (connect / error /
   *     closed / timed-out). Fires at least once on first subscribe.
   *
   * Returns an `unsubscribe` function that untracks self-presence
   * AND removes the channel from the Supabase client. Idempotent —
   * calling it twice is safe.
   */
  readonly subscribe: (
    onSnapshot: (snapshot: PresenceSnapshot) => void,
    onStatus: (status: PresenceStatus) => void,
  ) => () => void;
}

/**
 * Build a presence subscription over the supplied Supabase client.
 * Channel is keyed by `presence:{roomId}`; self-presence uses
 * `selfPlayerId` as the key so two tabs from the same player
 * collapse to one online entry.
 */
export function presenceSubscription(
  client: SupabaseClient,
  roomId: string,
  selfPlayerId: string,
): PresenceSubscription {
  return {
    subscribe(onSnapshot, onStatus) {
      let unsubscribed = false;
      const channel = client.channel(`presence:${roomId}`, {
        config: { presence: { key: selfPlayerId } },
      });

      channel.on('presence', { event: 'sync' }, () => {
        if (unsubscribed) return;
        const presenceState = channel.presenceState() as Record<
          string,
          readonly PresenceMeta[]
        >;
        const ids = new Set<string>();
        for (const metas of Object.values(presenceState)) {
          for (const meta of metas) {
            if (meta.playerId) ids.add(meta.playerId);
          }
        }
        onSnapshot({ onlinePlayerIds: ids });
      });

      channel.subscribe((status) => {
        if (unsubscribed) return;
        if (status === 'SUBSCRIBED') {
          onStatus('connected');
          // Track self once the channel is live. Other clients see
          // this player join via their own sync events.
          const meta: PresenceMeta = {
            playerId: selfPlayerId,
            joinedAt: new Date().toISOString(),
          };
          void channel.track(meta);
        } else if (status === 'CHANNEL_ERROR') {
          onStatus('error');
        } else if (status === 'TIMED_OUT') {
          onStatus('timed-out');
        } else if (status === 'CLOSED') {
          onStatus('closed');
        }
      });

      return (): void => {
        if (unsubscribed) return;
        unsubscribed = true;
        void channel.untrack();
        void client.removeChannel(channel);
      };
    },
  };
}
