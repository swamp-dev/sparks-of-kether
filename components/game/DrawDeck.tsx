'use client';
import { CardBack } from '@/components/hand/CardBack';

/**
 * #25 — visible draw deck. Informational visualization of `GameState.deck`.
 *
 * Shows a face-down `CardBack` with a count badge and a faint stack shadow
 * when more than one card remains. Empty placeholder when the deck is
 * exhausted (recycle fires automatically in the engine on the next draw;
 * the UI sees the count jump from 0 back up atomically).
 *
 * Since #502 shipped (discrete 'draw' phase folded into end-turn / Meditate),
 * the deck is informational only — no click-to-draw. Mount alongside the
 * DiscardPile so the deck/discard cluster reads as a unit.
 */
export interface DrawDeckProps {
  readonly deck: readonly number[];
  readonly className?: string;
}

export function DrawDeck({ deck, className }: DrawDeckProps): JSX.Element {
  const count = deck.length;
  const ariaLabel =
    count === 0
      ? 'Draw deck, empty'
      : `Draw deck, ${count} ${count === 1 ? 'card' : 'cards'} remaining`;

  return (
    <div
      data-draw-deck
      data-deck-empty={count === 0 ? 'true' : 'false'}
      role="group"
      aria-label={ariaLabel}
      className={`flex flex-col items-center gap-1${className ? ` ${className}` : ''}`}
    >
      <div
        aria-hidden="true"
        className="relative block w-20 lg:w-12 rounded border border-veil/30 bg-ground/40 p-1"
      >
        {count === 0 ? (
          <div
            data-deck-empty-placeholder
            className="flex aspect-[5/8] w-full flex-col items-center justify-center rounded border border-dashed border-veil/20 px-1 text-center text-[10px] uppercase tracking-widest text-veil/40"
          >
            Empty
          </div>
        ) : (
          <div data-deck-top className="relative">
            {count > 1 ? (
              <div
                data-deck-stack-shadow
                className="absolute inset-0 translate-x-0.5 translate-y-0.5 rounded border border-veil/15 bg-ground/40"
              />
            ) : null}
            <CardBack className="relative w-full" />
          </div>
        )}
      </div>
      {/* aria-live announces count changes to screen readers as the deck shrinks. */}
      <p
        aria-live="polite"
        aria-atomic="true"
        className="text-[10px] uppercase tracking-widest text-veil/60"
      >
        <span data-deck-count>{count}</span> {count === 1 ? 'card' : 'cards'}
      </p>
    </div>
  );
}
