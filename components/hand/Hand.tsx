import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { ArcanumCard } from '@/components/cards/ArcanumCard';
import { CardBack } from './CardBack';

/**
 * Player hand — a fan of cards. Faces show when `visible` is true,
 * face-down backs otherwise. The owner's view always passes
 * `visible={true}`; other players' hands set it according to the
 * `isHandVisible(state, viewer, owner)` derivation.
 *
 * Interaction:
 *   - Click a card or activate it via Enter/Space → `onCardSelect`
 *     fires with the arcanum number. Without a handler, cards are
 *     non-interactive (read-only display).
 *   - Arrow Left/Right cycles keyboard focus across the hand. The
 *     hand owns focus management so the consumer doesn't have to.
 *
 * Visibility note: when `visible` is false the cards are face-down
 * AND the arcanum numbers do not render in the DOM. That matters for
 * multiplayer: the server should not be sending hidden hands to
 * other players, but if it ever did, the UI doesn't leak the data.
 */

interface HandProps {
  readonly hand: readonly number[];
  readonly visible: boolean;
  readonly onCardSelect?: (arcanumNumber: number) => void;
  /** Highlights the named card with a focus ring (e.g. selection). */
  readonly selectedArcanum?: number;
  /** Aria label for the whole hand region (e.g. "Andy's hand, 4 cards"). */
  readonly ariaLabel?: string;
  /**
   * Initial open/closed state. Defaults to true (cards visible). When
   * false, the hand renders a compact stack badge that the player taps
   * to expand. (#132)
   */
  readonly defaultOpen?: boolean;
  readonly className?: string;
}

const MAX_FAN_DEG = 12;
/**
 * Card overlap when the hand is open. Cards render at `w-24` (96 px =
 * 6 rem) on narrow viewports and `w-36` (144 px = 9 rem) on `sm:` and
 * up (#38). Each subsequent card overlaps its predecessor by 55% of
 * the card's width, which advances 45% of card width per slot and
 * keeps a 6-card hand inside a 320 px viewport (96 + 5 × 43.2 = 312
 * px) and a 576 px max-w-xl on desktop (144 + 5 × 64.8 = 468 px).
 *
 * #290: previously expressed as `marginLeft: '-55%'`, but CSS resolves
 * a percentage margin against the **parent's** content-box width, not
 * against the element itself. With a 576 px parent that became
 * −316 px per card — collapsing 5/6-card hands into a stack and
 * pushing the rightmost slots past the `overflow-x-hidden` clip, so
 * the player saw only the first 4 cards. The overlap is now expressed
 * in card-relative units (rem), tracking the responsive `w-24
 * sm:w-36` card width via a Tailwind responsive utility on each slot.
 *
 * 6 rem × 0.55 = 3.3 rem (mobile, set inline below)
 * 9 rem × 0.55 = 4.95 rem (sm:, set as a Tailwind utility — must be
 *   a literal string for JIT detection, see slot className)
 */
const CARD_OVERLAP_REM_BASE = '-3.3rem';

export function Hand({
  hand,
  visible,
  onCardSelect,
  selectedArcanum,
  ariaLabel,
  defaultOpen = true,
  className,
}: HandProps): JSX.Element {
  const [focusIndex, setFocusIndex] = useState(0);
  const [open, setOpen] = useState(defaultOpen);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Clamp focus index when the hand shrinks (cards played). Use a
  // functional updater so this effect only re-runs when `hand.length`
  // actually changes — keeping `focusIndex` out of the deps prevents
  // a spurious re-evaluation on every keypress.
  useEffect(() => {
    setFocusIndex((prev) =>
      prev >= hand.length && hand.length > 0 ? hand.length - 1 : prev,
    );
  }, [hand.length]);

  const handleKey = (
    e: KeyboardEvent<HTMLButtonElement>,
    index: number,
    arcanum: number,
  ): void => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(index + 1, hand.length - 1);
      setFocusIndex(next);
      cardRefs.current[next]?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = Math.max(index - 1, 0);
      setFocusIndex(prev);
      cardRefs.current[prev]?.focus();
    } else if (
      onCardSelect &&
      visible &&
      (e.key === 'Enter' || e.key === ' ')
    ) {
      e.preventDefault();
      onCardSelect(arcanum);
    }
  };

  const computedLabel =
    ariaLabel ?? `Hand of ${hand.length} card${hand.length === 1 ? '' : 's'}`;

  // #132: collapsed state — render a small badge with the card count
  // instead of the full fan. A tap on the badge reopens the hand.
  // The mount runs the `hand-fade-in` keyframe (Tailwind config) so
  // the badge eases in rather than snapping. `motion-reduce:animate-none`
  // honours the user's reduced-motion preference.
  if (!open) {
    return (
      <div
        role="group"
        aria-label={computedLabel}
        data-hand
        data-hand-state="closed"
        data-visible={visible ? 'true' : 'false'}
        className={`animate-hand-fade-in motion-reduce:animate-none ${className ?? ''}`}
        style={{ display: 'flex', justifyContent: 'center' }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-action="open-hand"
          className="rounded border border-veil/30 px-4 py-2 text-sm"
          aria-expanded="false"
        >
          {hand.length} card{hand.length === 1 ? '' : 's'} — tap to open
        </button>
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={computedLabel}
      data-hand
      data-hand-state="open"
      data-visible={visible ? 'true' : 'false'}
      // #38: `overflow-x-hidden` belt-and-braces — the fan fits in a
      // 320 px viewport at the chosen card+overlap dimensions, but
      // hiding overflow guarantees the page never gets a horizontal
      // scrollbar even if a future change widens the fan.
      // #340: `overflow-x-hidden` plus `position: relative` here are
      // load-bearing for selected-card stacking — they form the
      // stacking context the per-card `zIndex` participates in.
      // Removing either would collapse the selected-card z-index lift
      // into the document context.
      className={`animate-hand-fade-in overflow-x-hidden motion-reduce:animate-none ${className ?? ''}`}
      style={{ display: 'flex', justifyContent: 'center', gap: 0, position: 'relative' }}
    >
      {/*
        Always render the close button so the hand can be collapsed
        even when empty — earlier the gating on `hand.length > 0` left
        the open hand stuck if a player drew zero cards (#132 reviewer).
        `z-10` keeps it above the rotated card edges in a full 6-card
        fan, where the rightmost card's corner can otherwise overlap.
        `min-h-11 min-w-11` meets WCAG 2.5.5 tap-target on mobile (#38).
      */}
      <button
        type="button"
        onClick={() => setOpen(false)}
        data-action="close-hand"
        aria-expanded="true"
        aria-label="Collapse hand"
        className="absolute right-0 top-0 z-10 flex min-h-11 min-w-11 items-center justify-center rounded border border-veil/20 bg-ground/80 text-base opacity-70 hover:opacity-100"
      >
        ×
      </button>
      {hand.length === 0 ? (
        // #208: explicit empty-state copy. The open hand at length 0
        // would otherwise render as the close button alone — no
        // signal to the player that the absence is intentional state
        // ("you've played all your cards") rather than a UI miss.
        // The closed badge already carries the count; this mirrors
        // it in the open variant.
        <p
          data-hand-empty
          className="px-8 py-12 text-center text-sm opacity-60"
        >
          Hand is empty.
        </p>
      ) : null}
      {hand.map((arcanum, i) => {
        const offsetFromCenter = i - (hand.length - 1) / 2;
        const fanDeg =
          hand.length > 1
            ? (offsetFromCenter / Math.max(hand.length - 1, 1)) * MAX_FAN_DEG
            : 0;
        const interactive = visible && onCardSelect !== undefined;
        const isSelected = selectedArcanum !== undefined && selectedArcanum === arcanum;
        const handleClick = interactive
          ? () => onCardSelect(arcanum)
          : undefined;
        // Major Arcana are unique within a single deck; the project's
        // 3–4-player rule allows two decks, so a future hand might
        // contain duplicates. Keying on arcanum + slot keeps DOM
        // identity stable across re-renders even then. When card
        // identity (deal-time UUIDs) is added to PlayerState.hand,
        // switch to that.
        // For visible read-only hands (no `onCardSelect`), use
        // aria-disabled rather than `disabled` so the card stays in
        // the AT tree as a readable element. `disabled` removes the
        // node from the accessibility tree — fine for face-down
        // cards (nothing to read), wrong for face-up cards.
        const ariaDisabled = !interactive;
        const htmlDisabled = !visible;
        return (
          <button
            key={`${i}-${arcanum}`}
            type="button"
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            data-card-slot={i}
            data-arcanum={visible ? arcanum : undefined}
            data-selected={isSelected ? 'true' : 'false'}
            disabled={htmlDisabled}
            aria-disabled={ariaDisabled}
            onClick={handleClick}
            onKeyDown={(e) => handleKey(e, i, arcanum)}
            tabIndex={i === focusIndex ? 0 : -1}
            style={{
              // #340: `position: relative` on every card so `zIndex`
              // takes effect predictably (without it, the property is
              // ignored on a static button and the selected card stays
              // buried under its right-hand neighbour in DOM order).
              // Selected card lifts to z=1 — above siblings (default
              // 0/auto) but below the parent's z-10 close button.
              position: 'relative',
              zIndex: isSelected ? 1 : undefined,
              transform: `rotate(${fanDeg.toFixed(2)}deg) translateY(${Math.abs(offsetFromCenter) * 4}px)`,
              transformOrigin: 'bottom center',
              // #290: marginLeft is set in card-relative rem units so
              // the overlap tracks the card's intrinsic width rather
              // than the parent. The first card anchors the fan with
              // no marginLeft set at all (omitted from the style
              // object); every subsequent card overlaps by 55% of
              // card width via the responsive base/sm pair below.
              ...(i === 0 ? {} : { marginLeft: CARD_OVERLAP_REM_BASE }),
              padding: 0,
              border: isSelected ? '2px solid #d4af37' : 'none',
              borderRadius: 12,
              background: 'transparent',
              cursor: interactive ? 'pointer' : 'default',
            }}
            // sm: breakpoint widens the card from w-24 (6 rem) to
            // w-36 (9 rem). The overlap must scale with it; the
            // responsive utility class (with `!important`) swaps to
            // the larger negative margin from `sm:` upward and
            // overrides the rem base set inline above — without an
            // additional inline-style branch that would require a
            // matchMedia subscription. Tailwind's JIT needs the class
            // to be a literal string; `-4.95rem` is 9rem × 0.55 (see
            // overlap doc above the constant).
            className={
              i === 0 ? undefined : 'sm:!ml-[-4.95rem]'
            }
          >
            {visible ? (
              // #38: responsive width — `w-24` on narrow (96 px),
              // `w-36` on `sm:` and up (144 px). The 24/36 pair plus
              // the `-3.3rem` / `sm:-4.95rem` overlap (#290) keeps a
              // 6-card fan inside a 320 px viewport without
              // horizontal scroll. #132's "1.5× scale for arm's
              // length" still applies on desktop.
              <ArcanumCard number={arcanum} className="w-24 sm:w-36" />
            ) : (
              <CardBack className="w-24 sm:w-36" />
            )}
          </button>
        );
      })}
    </div>
  );
}
