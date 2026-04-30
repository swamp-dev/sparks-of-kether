'use client';
import { zodiacSignByKey } from '@/data';
import type { ZodiacSignKey } from '@/data';

/**
 * Lobby — between-setup-and-play screen. Shows each player's name +
 * chosen zodiac sign + a readiness indicator. The host starts the
 * game when everyone is ready.
 *
 * Pure presentation. The host's "Begin" click fires `onBegin()`; the
 * orchestrator runs the engine's `initializeGame` to produce the
 * starting `GameState` and transitions the room out of lobby.
 *
 * Soul Aspects were retired in #237 (Epic #212 T8); the Lobby now
 * surfaces the player's zodiac-sign class instead.
 */

export interface LobbyPlayer {
  readonly id: string;
  readonly name: string;
  /** May be null while the player is still picking. */
  readonly zodiacSign: ZodiacSignKey | null;
  readonly ready: boolean;
}

interface LobbyProps {
  readonly players: readonly LobbyPlayer[];
  readonly isHost?: boolean;
  readonly onBegin?: () => void;
  readonly onToggleReady?: (playerId: string) => void;
  readonly currentPlayerId?: string;
  /**
   * When true, the Begin button is disabled and shows an in-flight
   * label. The orchestrator sets this between calling `onBegin` and
   * the server response landing — without it a host can double-click
   * and the second POST returns 409 `already-started`, surfacing as a
   * confusing error. Defaults to false.
   */
  readonly beginning?: boolean;
  readonly className?: string;
}

// Title lookup goes through `zodiacSignByKey` (throws on miss) so a
// ZodiacSignKey added to the type without a matching data entry
// fails loudly rather than rendering "undefined" as the player's
// chosen sign.
function signLabelFor(key: ZodiacSignKey): string {
  const sign = zodiacSignByKey(key);
  return `${sign.glyph} ${sign.name}`;
}

export function Lobby({
  players,
  isHost = false,
  onBegin,
  onToggleReady,
  currentPlayerId,
  beginning = false,
  className,
}: LobbyProps): JSX.Element {
  // Mirrors `validateAndBuildSetup` (`lib/start-game.ts`): a duplicate
  // sign across players is a server-side rejection (`duplicate-zodiac-signs`).
  // Without this gate, two players who race to pick the same sign during
  // the ~500ms-2s Realtime propagation window can both end up with
  // `zodiacSign !== null`, the host clicks Begin, and the server returns
  // a raw error string. Gating Begin (and surfacing a hint) closes the
  // race at the UI layer.
  const pickedSigns = players
    .map((p) => p.zodiacSign)
    .filter((s): s is NonNullable<typeof s> => s !== null);
  const hasDuplicateSigns = new Set(pickedSigns).size < pickedSigns.length;
  const allReady =
    players.length >= 2 &&
    players.length <= 4 &&
    players.every((p) => p.ready && p.zodiacSign !== null) &&
    !hasDuplicateSigns;
  const canBegin =
    isHost && allReady && onBegin !== undefined && !beginning;

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
          const signLabel = p.zodiacSign ? signLabelFor(p.zodiacSign) : null;
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
                  {signLabel ?? 'Choosing sign…'}
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
        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={canBegin ? onBegin : undefined}
            disabled={!canBegin}
            data-action="begin"
            className="rounded bg-illumination px-6 py-2 font-display tracking-widest text-ground disabled:cursor-not-allowed disabled:opacity-30"
          >
            {beginning ? 'Beginning…' : 'Begin'}
          </button>
          <BeginHint players={players} />
        </div>
      ) : null}
    </section>
  );
}

/**
 * Mirror of `validateAndBuildSetup`'s rejection cases (`lib/start-game.ts`)
 * — surfaces the same gates the server enforces so the host knows why
 * Begin is disabled. Without this the host stares at a greyed-out
 * button and has to guess.
 *
 * Order of precedence: too-few/too-many players → missing-zodiac-sign
 * → duplicate-zodiac-signs → not-ready. The duplicate check sits after
 * missing-sign (we can only diagnose duplicates once everyone has
 * picked) and before not-ready (a duplicate is the louder gate — no
 * amount of readying up will let Begin go through). We only render one
 * hint at a time to keep the call to action focused.
 */
function BeginHint({
  players,
}: {
  players: readonly LobbyPlayer[];
}): JSX.Element | null {
  if (players.length < 2) {
    return (
      <p
        data-begin-hint="too-few-players"
        className="text-xs uppercase tracking-widest opacity-60"
      >
        Need at least 2 players
      </p>
    );
  }
  if (players.length > 4) {
    return (
      <p
        data-begin-hint="too-many-players"
        className="text-xs uppercase tracking-widest opacity-60"
      >
        Cap is 4 players
      </p>
    );
  }
  const missingSign = players.filter((p) => p.zodiacSign === null);
  if (missingSign.length > 0) {
    return (
      <p
        data-begin-hint="missing-zodiac-sign"
        className="text-center text-xs uppercase tracking-widest opacity-60"
      >
        Waiting on {missingSign.map((p) => p.name).join(', ')} to choose a sign
      </p>
    );
  }
  // Duplicate detection: every player has picked a sign at this point;
  // a duplicate means at least two players collided on the same sign,
  // which `validateAndBuildSetup` rejects with `duplicate-zodiac-signs`.
  // The Realtime sync window between picker → DB → peer hook makes this
  // a routine race in 2-player co-op flow; surfacing it here closes the
  // gap before the host's click.
  const pickedSigns = players
    .map((p) => p.zodiacSign)
    .filter((s): s is NonNullable<typeof s> => s !== null);
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const s of pickedSigns) {
    if (seen.has(s)) {
      duplicates.add(s);
    }
    seen.add(s);
  }
  if (duplicates.size > 0) {
    return (
      <p
        data-begin-hint="duplicate-zodiac-signs"
        className="text-center text-xs uppercase tracking-widest opacity-60"
      >
        Each player needs a unique sign
      </p>
    );
  }
  const notReady = players.filter((p) => !p.ready);
  if (notReady.length > 0) {
    return (
      <p
        data-begin-hint="not-ready"
        className="text-center text-xs uppercase tracking-widest opacity-60"
      >
        Waiting on {notReady.map((p) => p.name).join(', ')} to ready up
      </p>
    );
  }
  return null;
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
