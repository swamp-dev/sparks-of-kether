'use client';

import { sefirahByKey } from '@/data';
import type { PeerEvent } from '@/lib/use-peer-events';

function eventCopy(event: PeerEvent): string {
  switch (event.kind) {
    case 'turn-start':
      return `${event.playerName}'s Turn`;
    case 'move': {
      const name = event.sefirahKey ? sefirahByKey(event.sefirahKey).englishName : undefined;
      return name ? `${event.playerName} moves to ${name}` : `${event.playerName} moves`;
    }
    case 'encounter': {
      const name = event.sefirahKey ? sefirahByKey(event.sefirahKey).englishName : undefined;
      return name
        ? `${event.playerName} faces the trial of ${name}`
        : `${event.playerName} faces a trial`;
    }
    case 'meditate':
      return `${event.playerName} meditates`;
  }
}

interface GameEventToastProps {
  readonly event: PeerEvent | null;
}

/**
 * Quiet pill-style toast surfacing peer game events to non-active
 * players in multiplayer (#299). Mirrors ActionToast visually but
 * carries narrative copy instead of pre-action state.
 *
 * Rendered at fixed top-center; pointer-events-none so it doesn't
 * intercept clicks on the board below. Lives in a polite aria-live
 * region — SR users hear it without focus interruption.
 */
export function GameEventToast({ event }: GameEventToastProps): JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="game-event-toast-region"
      className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center"
    >
      {event !== null ? (
        <div
          data-testid="game-event-toast"
          className="rounded-full border border-veil/30 bg-ground/85 px-4 py-1.5 text-sm text-veil shadow-lg motion-safe:animate-[hand-fade-in_180ms_ease-out]"
        >
          {eventCopy(event)}
        </div>
      ) : null}
    </div>
  );
}
