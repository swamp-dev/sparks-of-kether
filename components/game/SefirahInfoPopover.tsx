'use client';
import { useEffect, useRef } from 'react';
import { sefirahByKey, soulDoorsForSign } from '@/data';
import type { SefirahKey, ZodiacSignKey } from '@/data';
import { SEFIRAH_MEANINGS } from '@/components/tree/sefirah-meanings';

/**
 * #384 — In-game Sefirah info popover. Opens when the active player
 * clicks a Sefirah node on the Tree from /play, replacing the prior
 * navigate-to-Codex behaviour that stranded the player on a Codex
 * detail page with no "return to game" affordance.
 *
 * Surfaces the same compact info as `SefirahTooltip` (English name,
 * Hebrew, one-line meaning, team Sparks count) plus the Sefirah's
 * stat label and a "soul-door" indicator when the sign-aware caller
 * marks this Sefirah as a soul-door for the active player. A
 * "Read more in Codex" link opens `/sefirah/{key}` in a new tab so
 * a player who legitimately wants the full Codex page can read it
 * without losing in-progress game state.
 *
 * Close affordances: explicit close button + Escape key.
 *
 * Layout choice: a centred modal-ish dialog rather than a positioned
 * floating popover. The Tree fills the left column on /play and the
 * info panel is small enough that centring keeps it predictable
 * across viewports without dynamic-positioning complexity. `role=
 * "dialog"` + `aria-modal="true"` + `aria-labelledby` on the title
 * give AT users the standard modal contract.
 */

interface SefirahInfoPopoverProps {
  readonly sefirahKey: SefirahKey;
  readonly teamSparks: number;
  /**
   * Active player's zodiac sign, used to derive whether this Sefirah
   * is one of their soul doors. `undefined` when no active player —
   * the soul-door indicator is hidden in that case.
   */
  readonly activePlayerSign: ZodiacSignKey | undefined;
  readonly onClose: () => void;
}

export function SefirahInfoPopover({
  sefirahKey,
  teamSparks,
  activePlayerSign,
  onClose,
}: SefirahInfoPopoverProps): JSX.Element {
  const sefirah = sefirahByKey(sefirahKey);
  const meaning = SEFIRAH_MEANINGS[sefirahKey];
  const isSoulDoor =
    activePlayerSign !== undefined && soulDoorsForSign(activePlayerSign).includes(sefirahKey);

  // Close on Escape. The dialog grabs focus on mount so the key
  // listener catches the user's Escape regardless of where focus
  // was when the popover was triggered.
  //
  // `onClose` is read through a ref so the effect mounts the
  // listener exactly once. Inline `() => setOpenSefirah(undefined)`
  // callers (PlayScreen) re-create the function on every parent
  // render — without this indirection, the keydown listener would
  // be removed and re-added on every PlayScreen tick (turn state
  // change, sound effect, auto-advance timer), churning the
  // document listener pair pointlessly and introducing a tiny
  // window where an Escape between remove and re-add would miss.
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    dialogRef.current?.focus();
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') onCloseRef.current();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const titleId = `sefirah-popover-title-${sefirahKey}`;

  return (
    <div
      data-sefirah-popover-backdrop
      // Backdrop click closes. The inner dialog stops propagation.
      onClick={onClose}
      className="fixed inset-0 z-40 flex items-center justify-center bg-ground/60 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        data-sefirah-popover={sefirahKey}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-2 rounded-md border border-veil/30 bg-ground/95 px-4 py-3 text-veil shadow-2xl outline-none focus:outline-none"
      >
        <button
          type="button"
          data-sefirah-popover-close
          aria-label="Close"
          onClick={onClose}
          className="absolute right-2 top-2 z-10 rounded p-1 text-veil/70 hover:text-veil focus:outline-none focus-visible:ring-2 focus-visible:ring-illumination/80"
        >
          <span aria-hidden="true">×</span>
        </button>
        <div className="flex items-baseline justify-between gap-2 pr-6">
          <span id={titleId} className="font-display text-base tracking-wide" data-popover-name>
            {sefirah.englishName}
          </span>
          <span lang="he" className="font-hebrew text-base opacity-90" data-popover-hebrew>
            {sefirah.hebrewName}
          </span>
        </div>
        <p className="italic opacity-80" data-popover-meaning>
          {meaning}
        </p>
        <p className="text-xs uppercase tracking-widest opacity-70" data-popover-stat>
          Stat: {sefirah.stat}
        </p>
        {isSoulDoor ? (
          <p className="text-xs uppercase tracking-widest text-illumination" data-popover-soul-door>
            ✦ Soul Door
          </p>
        ) : null}
        <p className="text-xs opacity-70" data-popover-sparks>
          {teamSparks === 1 ? '1 spark held' : `${teamSparks} sparks held`}
        </p>
        <a
          data-popover-codex-link
          href={`/sefirah/${sefirahKey}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 self-start text-xs text-illumination underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-illumination/80"
        >
          Read more in Codex →
        </a>
      </div>
    </div>
  );
}
