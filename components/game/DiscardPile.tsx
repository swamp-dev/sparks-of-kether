'use client';
import { useState } from 'react';
import { ArcanumCard } from '@/components/cards/ArcanumCard';
import { DiscardBrowseOverlay } from './DiscardBrowseOverlay';

/**
 * #507 — visible discard pile. Renders the top of `state.discardPile`
 * as a small face-up card with a count badge, plus a click affordance
 * that opens a browse overlay listing every card currently in the pile.
 *
 * The pile is informational, not phase-gated: it stays mounted across
 * `move` / `challenge` / `end` and reflects engine state live (any
 * discard during the turn updates the count + top-of-pile immediately
 * because `state.discardPile` is the prop).
 *
 * Empty state: render a muted placeholder instead of an empty
 * `ArcanumCard` so a fresh game doesn't lead with a card-shaped void.
 * The button is `aria-disabled` and click is a no-op (the overlay
 * never opens against an empty pile).
 */
export interface DiscardPileProps {
  readonly discardPile: readonly number[];
  readonly className?: string;
}

export function DiscardPile({ discardPile, className }: DiscardPileProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const count = discardPile.length;
  const top = count > 0 ? discardPile[count - 1] : undefined;
  const label =
    count === 0
      ? 'Discard pile, empty'
      : `Discard pile, ${count} ${count === 1 ? 'card' : 'cards'}. Click to browse.`;

  return (
    <div
      data-discard-pile
      data-discard-empty={count === 0 ? 'true' : 'false'}
      className={`flex flex-col items-center gap-1 ${className ?? ''}`}
    >
      <button
        type="button"
        data-discard-pile-button
        aria-label={label}
        aria-disabled={count === 0 ? 'true' : undefined}
        disabled={count === 0}
        onClick={count === 0 ? undefined : () => setOpen(true)}
        className="relative block w-20 rounded border border-veil/30 bg-ground/40 p-1 transition hover:border-illumination focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-illumination/80 disabled:cursor-default disabled:hover:border-veil/30"
      >
        {count === 0 || top === undefined ? (
          <div
            data-discard-empty-placeholder
            className="flex aspect-[5/8] w-full flex-col items-center justify-center rounded border border-dashed border-veil/20 px-1 text-center text-[10px] uppercase tracking-widest text-veil/40"
          >
            No discards yet
          </div>
        ) : (
          <div className="relative" data-discard-top>
            {count > 1 ? (
              // Faint stack visual — a thin offset slab behind the top
              // card hints "there's more underneath" without trying to
              // render every card in the pile.
              <div
                aria-hidden="true"
                data-discard-stack-shadow
                className="absolute inset-0 -translate-x-0.5 -translate-y-0.5 rounded border border-veil/15 bg-ground/40"
              />
            ) : null}
            <ArcanumCard number={top} className="relative w-full" />
          </div>
        )}
      </button>
      <p className="text-[10px] uppercase tracking-widest text-veil/60">
        <span data-discard-count>{count}</span> {count === 1 ? 'card' : 'cards'}
      </p>
      {open ? (
        <DiscardBrowseOverlay discardPile={discardPile} onClose={() => setOpen(false)} />
      ) : null}
    </div>
  );
}
