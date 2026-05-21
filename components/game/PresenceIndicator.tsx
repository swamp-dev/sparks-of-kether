'use client';
import type { GraceState } from '@/lib/grace';

/**
 * Presence + disconnect-grace UI. One row per player:
 *   - Green dot when online.
 *   - Grey dot + "(disconnected)" when offline.
 *   - During the active player's grace window: countdown ("Xs left").
 *   - After grace expires: a "Kick" button (host-only).
 *
 * Pure-presentational: takes the upstream presence set + grace state
 * + a host flag, fires `onKick` for the host's click. Host policy
 * enforcement happens server-side via the `players_host_delete` RLS
 * policy — this component just hides the button for non-hosts.
 */

export interface PresencePlayerInfo {
  readonly id: string;
  readonly name: string;
}

export interface PresenceIndicatorProps {
  readonly players: readonly PresencePlayerInfo[];
  readonly onlinePlayerIds: ReadonlySet<string>;
  readonly activePlayerId: string;
  readonly grace: GraceState;
  /** Whether the viewing user is the room's host. Hides Kick from others. */
  readonly viewerIsHost: boolean;
  /** Caller's own player id, so we can tag self in the list. */
  readonly viewerPlayerId: string;
  readonly onKick?: (targetPlayerId: string) => void;
  readonly className?: string;
}

export function PresenceIndicator({
  players,
  onlinePlayerIds,
  activePlayerId,
  grace,
  viewerIsHost,
  viewerPlayerId,
  onKick,
  className,
}: PresenceIndicatorProps): JSX.Element {
  return (
    <ul
      className={`flex flex-col gap-2 text-sm${className ? ` ${className}` : ''}`}
      data-testid="presence-indicator"
    >
      {players.map((p) => {
        const isOnline = onlinePlayerIds.has(p.id);
        const isActive = p.id === activePlayerId;
        const isSelf = p.id === viewerPlayerId;
        const showCountdown = isActive && grace.phase === 'grace';
        const showKick = isActive && grace.phase === 'expired' && viewerIsHost && !isSelf;

        return (
          <li key={p.id} data-testid={`presence-row-${p.id}`} className="flex items-center gap-2">
            <span
              role="img"
              aria-label={isOnline ? 'online' : 'offline'}
              className={
                isOnline
                  ? 'inline-block h-2 w-2 rounded-full bg-emerald-500'
                  : 'inline-block h-2 w-2 rounded-full bg-zinc-400'
              }
            />
            <span className={isActive ? 'font-semibold' : ''}>{p.name}</span>
            {isSelf && <span className="text-xs text-zinc-500">(you)</span>}
            {!isOnline && !showCountdown && (
              // Always surface "(disconnected)" for offline players,
              // even when the host's Kick affordance is up — without
              // it, non-host viewers see only a grey dot during an
              // expired-grace state and have no explanation for why
              // the game has stalled.
              <span className="text-xs text-zinc-500">(disconnected)</span>
            )}
            {showCountdown && (
              <span className="text-xs text-amber-600" data-testid={`grace-countdown-${p.id}`}>
                disconnected — {Math.ceil(grace.remainingMs / 1000)}s left
              </span>
            )}
            {showKick && (
              <button
                type="button"
                onClick={() => onKick?.(p.id)}
                className="ml-auto rounded border border-rose-300 px-2 py-0.5 text-xs text-rose-700 hover:bg-rose-50"
                data-testid={`kick-button-${p.id}`}
              >
                Kick
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
