'use client';
import { useEffect, useId, useRef } from 'react';
import { ArcanumCard } from '@/components/cards/ArcanumCard';
import { arcanumByNumber } from '@/data';

/**
 * #507 — modal overlay listing every card currently in
 * `state.discardPile`, oldest-to-newest. Read-only; the v1 ticket
 * explicitly defers Yesod-Spark recovery and sorting/filtering to
 * follow-ups.
 *
 * Pattern follows `SefirahInfoPopover`:
 *   - Backdrop click + inner-content `stopPropagation` close on outside
 *     clicks; explicit X button + Escape also close.
 *   - `role="dialog"` + `aria-modal="true"` + `aria-labelledby` give AT
 *     users the standard modal contract.
 *   - Focus moves to the dialog on mount so screen-reader users land
 *     inside the overlay rather than wherever focus was when the pile
 *     button was clicked.
 *
 * The card grid reuses `ArcanumCard` (the same component the
 * `/demo/cards` page renders), keyed by index because the same arcanum
 * number can appear more than once in a single game (the pile is
 * shuffled into the deck on recycle, and a freshly-discarded copy can
 * sit alongside an older copy mid-cycle).
 */
export interface DiscardBrowseOverlayProps {
  readonly discardPile: readonly number[];
  readonly onClose: () => void;
}

export function DiscardBrowseOverlay({
  discardPile,
  onClose,
}: DiscardBrowseOverlayProps): JSX.Element {
  const dialogRef = useRef<HTMLDivElement>(null);
  // `onClose` is wrapped in a ref so the keydown effect mounts the
  // listener exactly once. Inline closures from the parent re-create
  // on every render; without the ref the document listener pair would
  // churn on every parent tick. Same pattern as SefirahInfoPopover.
  const onCloseRef = useRef(onClose);
  const titleId = `discard-browse-title-${useId()}`;
  const count = discardPile.length;
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    // Capture the element that had focus *before* the overlay grabbed
    // it, so close can return focus there (WCAG 3.2.2). The pile button
    // is the typical opener; keyboard / screen-reader users would
    // otherwise land on `<body>` after close and have to re-walk the
    // aside to resume.
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') onCloseRef.current();
    }
    document.addEventListener('keydown', onKey);
    return (): void => {
      document.removeEventListener('keydown', onKey);
      // Defensive: only restore focus if the captured element is still
      // in the document (the pile button is always mounted across
      // overlay open/close, but a stricter caller could remount).
      if (previouslyFocused && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, []);

  return (
    <div
      data-discard-browse-backdrop
      onClick={onClose}
      // z-50: ensures the overlay sits above the hand and any inline
      // discard affordances so a player can browse the pile any time
      // (the pile button remains enabled because the pile is non-empty).
      className="fixed inset-0 z-50 flex items-center justify-center bg-ground/60 p-4 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        data-discard-browse-overlay
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[90vh] w-[min(56rem,calc(100vw-2rem))] flex-col gap-3 overflow-hidden rounded-md border border-veil/30 bg-ground/95 p-4 text-veil shadow-2xl outline-none"
      >
        <button
          type="button"
          data-discard-browse-close
          aria-label="Close"
          onClick={onClose}
          className="absolute right-2 top-2 z-10 rounded p-1 text-veil/70 hover:text-veil focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-illumination/80"
        >
          <span aria-hidden="true">×</span>
        </button>
        <h2 id={titleId} className="font-display text-base tracking-widest">
          Discard pile — {count} {count === 1 ? 'card' : 'cards'}
        </h2>
        {count === 0 ? (
          <p className="italic opacity-70">No cards in the discard pile.</p>
        ) : (
          <ul
            data-discard-browse-list
            className="grid grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
          >
            {discardPile.map((arcanum, idx) => {
              const meta = arcanumByNumber(arcanum);
              return (
                <li key={`${arcanum}-${idx}`}>
                  <span className="sr-only">{`Arcanum ${arcanum}, ${meta.name}`}</span>
                  <ArcanumCard number={arcanum} className="w-full" />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
