'use client';
import { soulAspectByKey } from '@/data';
import type { SoulAspectKey } from '@/data';

/**
 * Lobby — between-setup-and-play screen. Shows each player's name +
 * chosen Soul Aspect + a readiness indicator. The host starts the
 * game when everyone is ready.
 *
 * Pure presentation. The host's "Begin" click fires `onBegin()`; the
 * orchestrator runs the engine's `initializeGame` to produce the
 * starting `GameState` and transitions the room out of lobby.
 */

export interface LobbyPlayer {
  readonly id: string;
  readonly name: string;
  /** May be null while the player is still picking. */
  readonly soulAspect: SoulAspectKey | null;
  readonly ready: boolean;
}

interface LobbyProps {
  readonly players: readonly LobbyPlayer[];
  readonly isHost?: boolean;
  readonly onBegin?: () => void;
  readonly onToggleReady?: (playerId: string) => void;
  readonly currentPlayerId?: string;
  readonly className?: string;
}

// Title lookup goes through `soulAspectByKey` (throws on miss) so a
// SoulAspectKey added to the type without a matching data entry
// fails loudly rather than rendering "undefined" as the player's
// chosen aspect.
function aspectTitleFor(key: SoulAspectKey): string {
  return soulAspectByKey(key).title;
}

export function Lobby({
  players,
  isHost = false,
  onBegin,
  onToggleReady,
  currentPlayerId,
  className,
}: LobbyProps): JSX.Element {
  const allReady =
    players.length >= 2 &&
    players.length <= 4 &&
    players.every((p) => p.ready && p.soulAspect !== null);
  const canBegin = isHost && allReady && onBegin !== undefined;

  return (
    <section
      data-lobby
      aria-label="Game lobby"
      className={`mx-auto max-w-md ${className ?? ''}`}
    >
      <header className="mb-4 text-center">
        <h2 className="font-display text-2xl tracking-widest">Lobby</h2>
        <p className="mt-1 text-sm opacity-70">
          {players.length} player{players.length === 1 ? '' : 's'}
          {' · '}
          {players.length < 2
            ? 'Waiting for more players'
            : allReady
              ? 'Everyone is ready'
              : 'Waiting for everyone to ready up'}
        </p>
      </header>

      <ul role="list" data-lobby-players className="space-y-2">
        {players.map((p) => {
          const isCurrent = p.id === currentPlayerId;
          const aspectTitle = p.soulAspect ? aspectTitleFor(p.soulAspect) : null;
          return (
            <li
              key={p.id}
              data-lobby-row={p.id}
              data-ready={p.ready ? 'true' : 'false'}
              className={`flex items-center justify-between rounded border px-3 py-2 ${
                p.ready ? 'border-illumination/60' : 'border-veil/30'
              }`}
            >
              <div className="flex flex-col">
                <span className="font-display tracking-widest">
                  {p.name}
                  {isCurrent ? (
                    <span className="ml-2 text-xs uppercase opacity-60">(you)</span>
                  ) : null}
                </span>
                <span className="text-xs opacity-70">
                  {aspectTitle ?? 'Choosing aspect…'}
                </span>
              </div>
              <ReadyIndicator
                ready={p.ready}
                canToggle={isCurrent && onToggleReady !== undefined}
                onToggle={() => onToggleReady?.(p.id)}
              />
            </li>
          );
        })}
      </ul>

      {isHost ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={canBegin ? onBegin : undefined}
            disabled={!canBegin}
            data-action="begin"
            className="rounded bg-illumination px-6 py-2 font-display tracking-widest text-ground disabled:cursor-not-allowed disabled:opacity-30"
          >
            Begin
          </button>
        </div>
      ) : null}
    </section>
  );
}

function ReadyIndicator({
  ready,
  canToggle,
  onToggle,
}: {
  ready: boolean;
  canToggle: boolean;
  onToggle: () => void;
}): JSX.Element {
  if (canToggle) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={ready}
        data-action="toggle-ready"
        className={`rounded border px-3 py-1 text-xs uppercase tracking-widest ${
          ready
            ? 'border-illumination bg-illumination/20 text-illumination'
            : 'border-veil/40 opacity-70'
        }`}
      >
        {ready ? 'Ready' : 'Not ready'}
      </button>
    );
  }
  return (
    <span
      data-readiness
      className={`text-xs uppercase tracking-widest ${
        ready ? 'text-illumination' : 'opacity-50'
      }`}
    >
      {ready ? 'Ready' : 'Not ready'}
    </span>
  );
}
