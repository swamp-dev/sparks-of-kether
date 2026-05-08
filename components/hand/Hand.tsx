import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { ArcanumCard } from '@/components/cards/ArcanumCard';
import { useCardDrag } from '@/lib/hooks/useCardDrag';
import { useReduceMotion } from '@/lib/hooks/useReduceMotion';
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
  /**
   * Hover/focus callback. Fires with the arcanum on `mouseenter` /
   * `focus` and with `undefined` on `mouseleave` / `blur`. The
   * consumer typically threads this into the Tree's path-light so
   * the player sees "this card opens these paths" without having
   * to commit to a click. (#405) Tapping on a touch device lands
   * focus on the card, which fires this with the arcanum — release
   * (focus moving away) fires with undefined.
   */
  readonly onCardHover?: (arcanumNumber: number | undefined) => void;
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
  /**
   * #412 — fires when a drag gesture starts on a card. Pointer
   * movement crossed the threshold; the consumer is expected to thread
   * the arcanum into the Tree's `highlightedCard` so paths light up
   * during the drag.
   */
  readonly onCardDragStart?: (arcanumNumber: number) => void;
  /**
   * #412 — fires when a drag gesture ends. `position` carries the
   * pointer-up coordinates in client space; the consumer hit-tests
   * via `document.elementFromPoint` to find a `data-drop-zone` target
   * (Tree path or discard pile) and dispatches the play. If no valid
   * target is under the pointer, the consumer should announce "this
   * card can't be played there" via aria-live.
   */
  readonly onCardDragEnd?: (
    arcanumNumber: number,
    position: { readonly x: number; readonly y: number },
  ) => void;
  /**
   * #412 — fires when a drag gesture is cancelled by the OS (system
   * gesture, scroll capture, touch reservation). The consumer should
   * clear any drag-related visual state without dispatching the play.
   */
  readonly onCardDragCancel?: () => void;
  /**
   * #579 — layout mode for the open hand. `'floating'` (default)
   * renders the fan as a fixed-position overlay anchored to the
   * bottom of the viewport, with rest-tiny / swell-large magnify.
   * `'inline'` renders the fan as inline flow (pre-#579 behaviour),
   * for embedded contexts like the `/demo/hand` showcase where
   * multiple hands stack vertically and a fixed overlay would have
   * them all collide at the same viewport position.
   */
  readonly layout?: 'floating' | 'inline';
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

/**
 * Free-floating hand (#579). The hand was an inline-flow fan at the
 * bottom of the Tree column under the #411 fit-on-screen budget;
 * it's now a `position: fixed` overlay anchored to the viewport's
 * bottom edge. At rest the entire fan scales down to a thin band
 * (`FAN_REST_SCALE`); when any card is hovered or keyboard-focused
 * the fan transitions to natural size and the active card scales
 * up dramatically (`MAGNIFY_SCALE_BIG`) and translates upward
 * toward the vertical centre of the viewport (`MAGNIFY_LIFT_VH`).
 * The magnified card renders at `MAGNIFY_OPACITY` so the matching
 * Tree path's per-Sefirah glow (#312/#405) shows through.
 *
 * Pre-#579 the Mac-dock-style magnification (#463) used
 * MAGNIFY_SCALE=1.3 and a 12px lift. Post-#579 those constants are
 * retired; the new big numbers replace them. Neighbour-nudge
 * primitives stay because the fan still uses them inside the
 * naturally-sized expanded state.
 *
 * `prefers-reduced-motion` flattens scale + translate (rest fan
 * stays at scale 1, magnified card stays in place). Opacity is
 * preserved — the path-through-card visual is a11y-load-bearing
 * (it's the connective signal between hand and Tree, not just
 * decoration).
 */
const FAN_REST_SCALE = 0.35;
const MAGNIFY_SCALE_BIG = 3.5;
const MAGNIFY_LIFT_VH = 35;
const MAGNIFY_OPACITY = 0.75;
const NEIGHBOUR_NUDGE_REM = 0.8;
const NEAR_NEIGHBOUR_NUDGE_REM = 0.25;
const MAGNIFY_TRANSITION =
  'transform 240ms ease-out, opacity 200ms ease-out, box-shadow 240ms ease-out';
const FAN_TRANSITION = 'transform 240ms ease-out';
const MAGNIFY_BOX_SHADOW =
  '0 18px 60px rgba(0, 0, 0, 0.55), 0 0 36px rgba(255, 215, 0, 0.28)';

export function Hand({
  hand,
  visible,
  onCardSelect,
  onCardHover,
  selectedArcanum,
  ariaLabel,
  defaultOpen = true,
  onCardDragStart,
  onCardDragEnd,
  onCardDragCancel,
  layout = 'floating',
  className,
}: HandProps): JSX.Element {
  const [focusIndex, setFocusIndex] = useState(0);
  const [open, setOpen] = useState(defaultOpen);
  // #412: arcanum currently being dragged (after threshold crossed).
  // Drives the per-card visual lift and lets the rendered card
  // suppress its onMouseLeave-clear of `hoveredCard` while the
  // gesture is still live (the pointer leaves the card on the way
  // to the Tree, but we don't want the path-light to drop until the
  // drop fires).
  const [draggingArcanum, setDraggingArcanum] = useState<number | undefined>(
    undefined,
  );
  // #412: when a drag completes (drop or cancel), the browser still
  // dispatches the synthesized `click` event on the originating
  // button. Without suppression, that click would call
  // `onCardSelect(arcanum)` immediately after the drop already
  // committed the play — double dispatch. The ref flag is set on
  // drop / cancel and cleared by the next React onClick handler;
  // taps that never entered the dragging state never set the flag,
  // so the existing click-to-select path is unchanged.
  const suppressNextClickRef = useRef(false);
  const cardDrag = useCardDrag({
    onEffect: (effect) => {
      switch (effect.kind) {
        case 'drag-start':
          setDraggingArcanum(effect.arcanum);
          if (onCardDragStart) onCardDragStart(effect.arcanum);
          break;
        case 'drag-move':
          // Pure positional update — no React state needed; the
          // consumer reads pointer position on drop. (A future
          // ticket may surface live-tracking visuals — drag-move
          // is the hook for that.)
          break;
        case 'drop':
          suppressNextClickRef.current = true;
          setDraggingArcanum(undefined);
          if (onCardDragEnd)
            onCardDragEnd(effect.arcanum, { x: effect.x, y: effect.y });
          break;
        case 'click':
          // No-op here. React onClick handles the click-to-select
          // path so existing tests using `fireEvent.click` keep
          // working and so keyboard Enter (which fires native click
          // on a button) routes through the same handler.
          break;
        case 'drag-cancel':
          // No `suppressNextClickRef.current = true` here. Browsers
          // do NOT synthesize a click event after `pointercancel`
          // (only after a clean `pointerup`), so there's no click
          // to suppress. Setting the flag would silently eat the
          // user's next legitimate tap — a real bug on mobile when
          // iOS scroll-capture cancels a tentative press before the
          // drag threshold.
          setDraggingArcanum(undefined);
          if (onCardDragCancel) onCardDragCancel();
          break;
      }
    },
  });
  // #463: hover/focus magnification state. `hoveredIndex` is mouse-driven,
  // `focusedIndex` is keyboard-driven. They're tracked separately so a
  // mouse that drifts off doesn't kill the magnify on a keyboard-focused
  // card. `activeIndex = hoveredIndex ?? focusedIndex` — mouse wins when
  // both are present, matching the convention that the cursor is the
  // most-recent expression of intent.
  const [hoveredIndex, setHoveredIndex] = useState<number | undefined>(undefined);
  const [focusedIndex, setFocusedIndex] = useState<number | undefined>(undefined);
  const reduceMotion = useReduceMotion();
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

  // #463: derive the active (magnified) slot once per render. The value
  // doesn't depend on the per-card index, so hoisting avoids
  // re-computing the same expression for every card in the .map() below
  // and makes the per-card branches easier to read. Magnification is
  // visible-only: face-down hands don't lift on hover (nothing for the
  // player to read). The stale-index guard handles the race where the
  // hand shrinks (cards played) faster than the leave event fires —
  // without it we'd magnify a slot that no longer exists.
  const rawActive = hoveredIndex ?? focusedIndex;
  const activeIndex =
    visible && rawActive !== undefined && rawActive < hand.length
      ? rawActive
      : undefined;
  // #463: track the previous-render `activeIndex` so the magnify
  // transition persists for one render after the user moves off the
  // active card. CSS transitions only fire when the `transition`
  // property is present *before* the style change — removing both the
  // transform and the transition atomically would skip the exit
  // animation, snapping the card from scale(1.3) → scale(1.0) instead
  // of easing back. The ref is updated in a `useEffect` after commit,
  // so during render N the ref reads the value from render N-1.
  const prevActiveIndexRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    prevActiveIndexRef.current = activeIndex;
  });
  const prevActiveIndex =
    prevActiveIndexRef.current !== undefined &&
    prevActiveIndexRef.current < hand.length
      ? prevActiveIndexRef.current
      : undefined;

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

  // #579 — the open hand is a fixed-position overlay anchored to the
  // viewport's bottom edge. The OUTER wrapper carries the role/aria
  // semantics + `position: fixed`; the INNER fan div carries the
  // existing flex layout, the #340 stacking context (`position:
  // relative`), and the new free-floating scale transform.
  //
  // `pointer-events-none` on the outer wrapper lets clicks pass
  // through the empty space around the fan to whatever sits below
  // (the Tree, the action bar, etc.); `pointer-events-auto` on the
  // inner fan re-enables interaction on the cards themselves.
  // Without this split, the full-width overlay would intercept
  // clicks on the Tree below.
  const someActive = activeIndex !== undefined;
  // The floating fan scales to a thin band at rest so the player
  // sees they have cards but doesn't lose Tree real estate.
  // Activating any card (mouse hover OR keyboard focus) blooms the
  // fan to natural size; the active card then magnifies further
  // within the now-natural fan. Reduced-motion users skip the scale
  // entirely — the fan stays at natural size, and per-card
  // transforms are already gated on `reduceMotion`.
  //
  // #579 review fix: `layout="inline"` consumers (e.g. /demo/hand)
  // always render at scale 1 inline-flow — multiple hands stack
  // vertically there, so a fixed overlay would have them all
  // collide at the same viewport position.
  const isFloating = layout === 'floating';
  const fanTransform =
    reduceMotion || !isFloating
      ? undefined
      : someActive
        ? 'scale(1)'
        : `scale(${FAN_REST_SCALE})`;
  // The role/aria attrs sit on the outer wrapper. For `floating`
  // layout that wrapper is a `position: fixed` viewport overlay;
  // for `inline` it's the existing inline-flow div the consumer
  // can size with `className`.
  const outerClassName = isFloating
    ? `pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center ${className ?? ''}`
    : `${className ?? ''}`;
  // Inner fan className — `pointer-events-auto` only matters when
  // the outer wrapper carries `pointer-events-none` (floating
  // layout); inline layout doesn't need the override but it's
  // harmless either way.
  const innerClassName = isFloating
    ? 'pointer-events-auto animate-hand-fade-in overflow-x-hidden motion-reduce:animate-none'
    : 'animate-hand-fade-in overflow-x-hidden motion-reduce:animate-none';
  return (
    <div
      role="group"
      aria-label={computedLabel}
      data-hand
      data-hand-state="open"
      data-visible={visible ? 'true' : 'false'}
      data-layout={layout}
      className={outerClassName.trim()}
    >
      <div
        data-hand-fan
        // #38: `overflow-x-hidden` belt-and-braces — the fan fits in a
        // 320 px viewport at the chosen card+overlap dimensions, but
        // hiding overflow guarantees the page never gets a horizontal
        // scrollbar even if a future change widens the fan.
        // #340: `overflow-x-hidden` plus `position: relative` here are
        // load-bearing for selected-card stacking — they form the
        // stacking context the per-card `zIndex` participates in.
        // Removing either would collapse the selected-card z-index lift
        // into the document context.
        className={innerClassName}
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 0,
          position: 'relative',
          ...(fanTransform !== undefined
            ? {
                transform: fanTransform,
                transformOrigin: 'bottom center',
                transition: FAN_TRANSITION,
              }
            : {}),
        }}
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
        // #412: dragging the card visually lifts it. The same magnify
        // primitive used for hover/focus drives the lift — keeping
        // one transform path means the dock-magnify and drag-lift
        // never fight for the transform property.
        const isDragging = draggingArcanum !== undefined && draggingArcanum === arcanum;
        const isMagnified = activeIndex === i || isDragging;
        const handleClick = interactive
          ? (): void => {
              // #412 suppression: a drop or cancel just fired; skip
              // the synthesized click that the browser still
              // dispatches after pointer-up. The flag is cleared on
              // every click attempt regardless of whether it was
              // suppressed, so a subsequent legitimate tap is
              // unaffected.
              if (suppressNextClickRef.current) {
                suppressNextClickRef.current = false;
                return;
              }
              onCardSelect(arcanum);
            }
          : undefined;
        const offsetFromActive =
          activeIndex !== undefined ? i - activeIndex : null;
        const isImmediateNeighbour =
          offsetFromActive !== null && Math.abs(offsetFromActive) === 1;
        const isNearNeighbour =
          offsetFromActive !== null && Math.abs(offsetFromActive) === 2;
        // #463: magnify-set membership — only these cards participate in
        // the dock motion (active + the two flanking pairs). Used below
        // to scope `transition` so unrelated state changes (focusIndex,
        // open toggle, selection) don't animate the base fan transform.
        const inMagnifySet = isMagnified || isImmediateNeighbour || isNearNeighbour;
        // #463: same membership against the previous render's active
        // slot. A card that *was* in the magnify set but isn't anymore
        // keeps `transition` for exactly one render, so the exit
        // transform change (scale 1.3 → 1.0, translateX(0.8rem) → 0)
        // animates instead of snapping. After commit, the ref updates
        // via the useEffect above and `prevInMagnifySet` becomes false
        // on the following render, so the transition is removed once
        // the exit animation has had its render to take effect.
        const offsetFromPrevActive =
          prevActiveIndex !== undefined ? i - prevActiveIndex : null;
        const prevInMagnifySet =
          offsetFromPrevActive !== null && Math.abs(offsetFromPrevActive) <= 2;
        // #405: hover/focus → fire onCardHover so the consumer can
        // light corresponding paths on the Tree. Disabled or
        // face-down cards don't fire (visible gates the entire hover
        // contract). Mouse leave / blur clears with undefined.
        // #463: same handlers also drive local hover/focus state for
        // the dock-magnify lift. State updates run regardless of
        // whether onCardHover is set; the callback is opt-in.
        const handleHoverEnter = visible
          ? (): void => {
              setHoveredIndex(i);
              if (onCardHover) onCardHover(arcanum);
            }
          : undefined;
        const handleHoverLeave = visible
          ? (): void => {
              setHoveredIndex((prev) => (prev === i ? undefined : prev));
              if (onCardHover) onCardHover(undefined);
            }
          : undefined;
        const handleFocusIn = visible
          ? (): void => {
              setFocusedIndex(i);
              if (onCardHover) onCardHover(arcanum);
            }
          : undefined;
        const handleFocusOut = visible
          ? (): void => {
              setFocusedIndex((prev) => (prev === i ? undefined : prev));
              if (onCardHover) onCardHover(undefined);
            }
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
        // #463: zIndex tiers — magnified > selected > unselected stack
        // (left over right). All stay below the parent's `z-10` close
        // button. With HAND_CAP=6 the magnified ceiling is `hand.length
        // + 2` = 8, comfortably under 10. Even the over-cap Meditate
        // path (#291, hand size up to 8) keeps it at 10 → still under
        // any future close-button bump if we ever raise it.
        let zIndex: number;
        if (isMagnified) {
          zIndex = hand.length + 2;
        } else if (isSelected) {
          zIndex = hand.length + 1;
        } else {
          zIndex = hand.length - i;
        }
        // #463: build the transform from base + magnify pieces. The
        // base (`rotate` + `translateY`) is the existing fan layout;
        // magnify adds `scale` on the active card and `translateX` on
        // its neighbours so they slide outward. `prefers-reduced-motion`
        // strips both magnify pieces — the focus indicator (CSS ring,
        // below) carries the keyboard-focus signal in that mode.
        const baseTransform = `rotate(${fanDeg.toFixed(2)}deg) translateY(${Math.abs(offsetFromCenter) * 4}px)`;
        let magnifyTransform = '';
        if (!reduceMotion) {
          if (isMagnified) {
            // #579: scale up dramatically and translate the card upward
            // by `MAGNIFY_LIFT_VH` viewport-height units so the magnified
            // card lifts toward the centre of the screen. `vh` is
            // viewport-relative and unaffected by the scale, so the
            // translation is consistent across card sizes. Transform
            // order: right-to-left, so `translateY(-Yvh)` runs in the
            // pre-scale coordinate space — the card lifts a fixed
            // viewport fraction regardless of how big the scale grows.
            magnifyTransform = ` scale(${MAGNIFY_SCALE_BIG}) translateY(-${MAGNIFY_LIFT_VH}vh)`;
          } else if (isImmediateNeighbour && offsetFromActive !== null) {
            const sign = offsetFromActive > 0 ? 1 : -1;
            magnifyTransform = ` translateX(${(sign * NEIGHBOUR_NUDGE_REM).toFixed(2)}rem)`;
          } else if (isNearNeighbour && offsetFromActive !== null) {
            const sign = offsetFromActive > 0 ? 1 : -1;
            magnifyTransform = ` translateX(${(sign * NEAR_NEIGHBOUR_NUDGE_REM).toFixed(2)}rem)`;
          }
        }
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
            data-magnified={isMagnified ? 'true' : 'false'}
            data-dragging={isDragging ? 'true' : 'false'}
            disabled={htmlDisabled}
            aria-disabled={ariaDisabled}
            // #412 — pointer events drive drag-to-play. The native
            // click event still fires after pointer-up (one of the
            // browser's mouse-event compatibility layers), and is
            // routed through React's onClick to onCardSelect — same
            // path the keyboard Enter / Space activation uses, so
            // tap and keyboard share one click site. Drag completion
            // sets `suppressNextClickRef`; the onClick handler skips
            // the post-drop synthesized click on its first
            // invocation, then resets.
            onClick={handleClick}
            onPointerDown={(e) => {
              if (interactive) cardDrag.handlers.onPointerDown(e, arcanum);
            }}
            onPointerMove={cardDrag.handlers.onPointerMove}
            onPointerUp={cardDrag.handlers.onPointerUp}
            onPointerCancel={cardDrag.handlers.onPointerCancel}
            onMouseEnter={handleHoverEnter}
            onMouseLeave={handleHoverLeave}
            onFocus={handleFocusIn}
            onBlur={handleFocusOut}
            onKeyDown={(e) => handleKey(e, i, arcanum)}
            tabIndex={i === focusIndex ? 0 : -1}
            style={{
              // #340: `position: relative` on every card so `zIndex`
              // takes effect predictably (without it, the property is
              // ignored on a static button and the selected card stays
              // buried under its right-hand neighbour in DOM order).
              //
              // #368: stack the fan so left cards paint over right cards.
              // The fan overlaps each card by ~55% with later DOM-order
              // cards rendering on top by default — that put card 0's
              // bounding-box centre under card 1's SVG, so a pointer
              // click at card 0's centre dispatched to card 1. Inverting
              // the stacking with `hand.length - i` makes the leftmost
              // card the topmost, decreasing rightward; the rightmost
              // card stays at the bottom of the stack but is fully
              // visible (nothing overlaps its right edge), so this
              // doesn't trade one occlusion for another.
              //
              // Selected lifts one above the highest unselected slot
              // (`hand.length`) regardless of its own index, so #340
              // holds for any selection. #463: magnified lifts one
              // higher still so a hovered selected card stays on top
              // of its neighbours.
              position: 'relative',
              zIndex,
              transform: baseTransform + magnifyTransform,
              // #579: magnified cards anchor at `center` so scale + lift
              // both move the card's centre toward viewport centre. The
              // existing fan layout (rotate + base translateY) doesn't
              // care which origin is used at scale 1, so flipping the
              // origin only when magnified keeps non-magnified cards
              // visually identical to today's #463 dock-magnify base
              // (bottom-center origin keeps the fan's curve anchored on
              // a horizontal line). Pre-#579 the origin was always
              // `bottom center` and the magnify lift was a fixed 12 px;
              // post-#579 the lift is 35 vh and the origin matters.
              transformOrigin: isMagnified ? 'center' : 'bottom center',
              // Transition is scoped to cards participating in the magnify
              // *now or on the previous render*. The `inMagnifySet` half
              // covers entry; the `prevInMagnifySet` half covers exit
              // (a card leaving the magnify set keeps its transition for
              // one render so the snap-back is animated instead of
              // instant). Applying the transition unconditionally would
              // animate the base `rotate`/`translateY` on unrelated
              // re-renders (focus-index nav, selection change, open
              // toggle) — visually low-impact but a needless write to
              // every card's compositor layer on every state change.
              // #579 review fix: restore the `!reduceMotion` gate on
              // the transition. Pre-fix the gate was dropped when
              // opacity was added to MAGNIFY_TRANSITION; the result was
              // that reduced-motion users still saw the box-shadow
              // flash + opacity fade on hover, which violates the
              // spirit of `prefers-reduced-motion` even though the
              // opacity *value* was correctly preserved. Now the
              // transition fires only for motion-safe users; reduced-
              // motion users get the opacity 0.75 value snapped on
              // (instant, no fade) — the path-through-card visual
              // still works for them, just without animation.
              transition:
                !reduceMotion && (inMagnifySet || prevInMagnifySet)
                  ? MAGNIFY_TRANSITION
                  : undefined,
              boxShadow: isMagnified ? MAGNIFY_BOX_SHADOW : undefined,
              // #579: 75% opacity while magnified so the matching Tree
              // path's per-Sefirah glow shows THROUGH the card. The
              // opacity is preserved under `prefers-reduced-motion`
              // because the path-through-card visual is the connective
              // signal between hand and Tree — not just decoration —
              // and reduced-motion users still need it.
              opacity: isMagnified ? MAGNIFY_OPACITY : undefined,
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
            //
            // #463: focus-visible ring is the load-bearing keyboard
            // focus indicator, applied independently of the scale
            // transform — it remains visible under
            // `prefers-reduced-motion` even when the magnify is off.
            className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-illumination/80 ${i === 0 ? '' : 'sm:!ml-[-4.95rem]'}`.trim()}
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
    </div>
  );
}
