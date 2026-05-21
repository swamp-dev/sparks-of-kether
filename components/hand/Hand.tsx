import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { arcanumByNumber } from '@/data';
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
  /**
   * #90 — when true, each face-up card shows a translucent discard
   * icon overlay. Clicking the icon fires `onDiscard`. Hovering the
   * card still fires `onCardHover` so Tree paths light up before the
   * player commits to discarding.
   */
  readonly discardMode?: boolean;
  /**
   * #90 — fires with the arcanum when the player clicks a card's
   * discard icon during `discardMode`. Supply together with
   * `discardMode={true}`.
   */
  readonly onDiscard?: (arcanum: number) => void;
}

const MAX_FAN_DEG = 12;
/**
 * Card overlap when the hand is open. Cards render at `w-24` (96 px =
 * 6 rem) on narrow viewports and `w-36` (144 px = 9 rem) on `sm:` and
 * up (#38). Each subsequent card overlaps its predecessor by 48% of
 * the card's width, advancing 52% per slot.
 *
 * 6 rem × 0.48 = 2.88 rem (mobile, set inline below)
 * 9 rem × 0.48 = 4.32 rem (sm:, set as a Tailwind utility — must be
 *   a literal string for JIT detection, see slot className)
 *
 * Width check:
 *  - desktop 6-card fan: 144 + 5 × (144 × 0.52) ≈ 518 px (fits the
 *    576 px `max-w-xl` container).
 *  - mobile 6-card fan:  96 + 5 × (96 × 0.52)  ≈ 346 px — overflows
 *    a 320 px viewport by ~26 px. Acceptable because the open hand
 *    is `position: fixed` at the viewport bottom; the outer edges of
 *    the fan extend past the viewport edges (clipped, not scrolled).
 *
 * #290: previously expressed as `marginLeft: '-55%'`, but CSS resolves
 * a percentage margin against the **parent's** content-box width, not
 * against the element itself. The overlap is now expressed in
 * card-relative units (rem), tracking the responsive `w-24 sm:w-36`
 * card width via a Tailwind responsive utility on each slot.
 */
const CARD_OVERLAP_REM_BASE = '-2.88rem';

/**
 * Free-floating hand (#579, reworked). The hand is a `position: fixed`
 * overlay anchored to the viewport's bottom edge. At rest the fan
 * peeks `PEEK_HEIGHT_PX` pixels above the viewport bottom — enough to
 * see card art tops — via a `translateY(calc(100% - PEEK_HEIGHT_PX))`
 * on the inner fan div. Hovering or touching the peek strip slides the
 * full fan up into view. Mouse / pointer leaving the hand starts a
 * short grace-period timer before hiding.
 *
 * The fan is always at scale(1). The old `FAN_REST_SCALE = 0.35 →
 * scale(1)` bloom was the root cause of the "never settles" jank: the
 * scale-up repositioned every card, which could push the hovered card
 * away from the cursor and trigger an infinite enter/leave loop.
 * Replacing the scale with a translateY eliminates the feedback loop.
 *
 * Active card magnification is in-place: `translateY(-MAGNIFY_LIFT_PX)
 * scale(MAGNIFY_SCALE)`. No centering teleport — the fan is always
 * centred at the viewport bottom so no card can fly off screen.
 *
 * `prefers-reduced-motion` forces `handExpanded = true` on mount so
 * the hand is always fully visible. Opacity is preserved — the
 * path-through-card visual is a11y-load-bearing.
 */
const PEEK_HEIGHT_PX = 72;
const HAND_REVEAL_MS = 280;
const HAND_HIDE_MS = 380;
const HAND_HIDE_DELAY_MS = 120;
const MAGNIFY_SCALE = 1.12;
const MAGNIFY_LIFT_PX = 18;
const MAGNIFY_OPACITY = 0.75;
const NEIGHBOUR_NUDGE_REM = 0.8;
const NEAR_NEIGHBOUR_NUDGE_REM = 0.25;
const MAGNIFY_TRANSITION =
  'transform 240ms ease-out, opacity 200ms ease-out, box-shadow 240ms ease-out';
const MAGNIFY_BOX_SHADOW = '0 18px 60px rgba(0, 0, 0, 0.55), 0 0 36px rgba(255, 215, 0, 0.28)';

export function Hand({
  hand,
  visible,
  onCardSelect,
  onCardHover,
  selectedArcanum,
  ariaLabel,
  onCardDragStart,
  onCardDragEnd,
  onCardDragCancel,
  layout = 'floating',
  className,
  discardMode = false,
  onDiscard,
}: HandProps): JSX.Element {
  const [focusIndex, setFocusIndex] = useState(0);
  // Peek-shelf expand/hide state. False = peeking (only PEEK_HEIGHT_PX
  // of cards visible); true = fully revealed. Controlled by
  // mouseenter/leave on the fan, keyboard focus, and drag state.
  const [handExpanded, setHandExpanded] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // #412: arcanum currently being dragged (after threshold crossed).
  // Drives the per-card visual lift and lets the rendered card
  // suppress its onMouseLeave-clear of `hoveredCard` while the
  // gesture is still live (the pointer leaves the card on the way
  // to the Tree, but we don't want the path-light to drop until the
  // drop fires).
  const [draggingArcanum, setDraggingArcanum] = useState<number | undefined>(undefined);
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
          if (onCardDragEnd) onCardDragEnd(effect.arcanum, { x: effect.x, y: effect.y });
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
    setFocusIndex((prev) => (prev >= hand.length && hand.length > 0 ? hand.length - 1 : prev));
  }, [hand.length]);

  const handleKey = (e: KeyboardEvent<HTMLButtonElement>, index: number, arcanum: number): void => {
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
    } else if (onCardSelect && visible && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onCardSelect(arcanum);
    }
  };

  const computedLabel = ariaLabel ?? `Hand of ${hand.length} card${hand.length === 1 ? '' : 's'}`;

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
    visible && rawActive !== undefined && rawActive < hand.length ? rawActive : undefined;
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
    prevActiveIndexRef.current !== undefined && prevActiveIndexRef.current < hand.length
      ? prevActiveIndexRef.current
      : undefined;

  // Peek-shelf expand/hide helpers. `expandHand` clears any pending hide
  // timer and opens the fan. `scheduleHide` starts a short grace-period
  // timer so the hand doesn't snap closed the instant the mouse drifts
  // off a card (the player needs a moment to move toward the board for
  // drag-to-play without the hand collapsing on them).
  const expandHand = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setHandExpanded(true);
  }, []);

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (draggingArcanum === undefined) setHandExpanded(false);
    }, HAND_HIDE_DELAY_MS);
  }, [draggingArcanum]);

  // Cancel any pending hide timer on unmount to avoid a setState call
  // on an already-unmounted component (React 18 no-ops it, but it still
  // produces a dev-mode warning and is a resource leak).
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  // Keep the hand open for the full duration of a drag so the player
  // can pick up a card and move to the board without the fan collapsing.
  useEffect(() => {
    if (draggingArcanum !== undefined) expandHand();
  }, [draggingArcanum, expandHand]);

  // Reduced-motion: skip the peek animation entirely — always show the
  // full hand so no card information is hidden behind a motion barrier.
  useEffect(() => {
    if (reduceMotion) setHandExpanded(true);
  }, [reduceMotion]);

  // #579 — open hand: fixed-position overlay anchored to viewport bottom.
  // `pointer-events-none` outer + `pointer-events-auto` inner lets clicks
  // pass through empty space to the Tree while cards remain interactive.
  const isFloating = layout === 'floating';
  const outerClassName = isFloating
    ? `pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center${className ? ` ${className}` : ''}`
    : (className ?? '');
  const innerClassName = isFloating
    ? 'pointer-events-auto animate-hand-fade-in motion-reduce:animate-none'
    : 'animate-hand-fade-in overflow-x-clip motion-reduce:animate-none';
  return (
    <div
      role="group"
      aria-label={computedLabel}
      data-hand
      data-hand-state="open"
      data-visible={visible ? 'true' : 'false'}
      data-layout={layout}
      className={outerClassName}
    >
      <div
        data-hand-fan
        className={innerClassName}
        onMouseEnter={isFloating ? expandHand : undefined}
        onMouseLeave={isFloating ? scheduleHide : undefined}
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 0,
          position: 'relative',
          ...(isFloating
            ? {
                transform: handExpanded
                  ? 'translateY(0)'
                  : `translateY(calc(100% - ${PEEK_HEIGHT_PX}px))`,
                transformOrigin: 'bottom center',
                transition: reduceMotion
                  ? 'none'
                  : handExpanded
                    ? `transform ${HAND_REVEAL_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
                    : `transform ${HAND_HIDE_MS}ms cubic-bezier(0.4, 0, 1, 1)`,
              }
            : {}),
        }}
      >
        {hand.length === 0 ? (
          // #208: explicit empty-state copy. Without it, an empty hand
          // would render nothing — no signal that the absence is
          // intentional state ("you've played all your cards") rather
          // than a UI miss.
          <p data-hand-empty className="px-8 py-12 text-center text-sm opacity-60">
            Hand is empty.
          </p>
        ) : null}
        {hand.map((arcanum, i) => {
          const offsetFromCenter = i - (hand.length - 1) / 2;
          const fanDeg =
            hand.length > 1 ? (offsetFromCenter / Math.max(hand.length - 1, 1)) * MAX_FAN_DEG : 0;
          const interactive = visible && onCardSelect !== undefined && !discardMode;
          // Drag is allowed in normal interactive mode OR in discardMode
          // (drag-to-discard-pile is an alternative to clicking the icon).
          const draggable = interactive || (visible && discardMode);
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
          const offsetFromActive = activeIndex !== undefined ? i - activeIndex : null;
          const isImmediateNeighbour =
            offsetFromActive !== null && Math.abs(offsetFromActive) === 1;
          const isNearNeighbour = offsetFromActive !== null && Math.abs(offsetFromActive) === 2;
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
          const offsetFromPrevActive = prevActiveIndex !== undefined ? i - prevActiveIndex : null;
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
                if (isFloating) expandHand();
                setFocusedIndex(i);
                if (onCardHover) onCardHover(arcanum);
              }
            : undefined;
          const handleFocusOut = visible
            ? (): void => {
                if (isFloating) scheduleHide();
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
          // In discard mode the card button is not selectable, but the sibling
          // discard icon IS the active affordance — aria-disabled should be
          // false so screen readers don't announce the card as "dimmed" when
          // the icon is the thing to interact with.
          const ariaDisabled = !visible || (!interactive && !discardMode);
          const htmlDisabled = !visible;
          // #463: zIndex tiers — magnified > selected > unselected stack
          // (left over right). With HAND_CAP=5 the magnified ceiling is
          // `hand.length + 2` = 7; the over-cap Meditate path (#291,
          // hand size up to 7) raises it to 9.
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
              magnifyTransform = ` translateY(-${MAGNIFY_LIFT_PX}px) scale(${MAGNIFY_SCALE})`;
            } else if (isImmediateNeighbour && offsetFromActive !== null) {
              const sign = offsetFromActive > 0 ? 1 : -1;
              magnifyTransform = ` translateX(${(sign * NEIGHBOUR_NUDGE_REM).toFixed(2)}rem)`;
            } else if (isNearNeighbour && offsetFromActive !== null) {
              const sign = offsetFromActive > 0 ? 1 : -1;
              magnifyTransform = ` translateX(${(sign * NEAR_NEIGHBOUR_NUDGE_REM).toFixed(2)}rem)`;
            }
          }
          // #90: wrap each card slot in a <div> so the discard icon can be
          // a sibling <button> (HTML disallows nested interactive elements).
          // Layout transforms, zIndex, and hover handlers live on the wrapper;
          // the inner card button retains focus/keyboard handlers.
          // The `group` class enables group-hover:opacity-100 on the icon.
          return (
            <div
              key={`${i}-${arcanum}`}
              onMouseEnter={handleHoverEnter}
              onMouseLeave={handleHoverLeave}
              style={{
                // #340: `position: relative` on every card so `zIndex`
                // takes effect predictably (without it, the property is
                // ignored on a static element and the selected card stays
                // buried under its right-hand neighbour in DOM order).
                //
                // #368: stack the fan so left cards paint over right cards.
                position: 'relative',
                zIndex,
                transform: baseTransform + magnifyTransform,
                // Magnified cards scale from center so the lift is symmetric;
                // non-magnified cards anchor at bottom-center to keep the
                // fan's curve on a horizontal baseline.
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
              }}
              // sm: breakpoint widens the card from w-24 (6 rem) to
              // w-36 (9 rem). The overlap must scale with it; the
              // responsive utility class (with `!important`) swaps to
              // the larger negative margin from `sm:` upward and
              // overrides the rem base set inline above — without an
              // additional inline-style branch that would require a
              // matchMedia subscription. Tailwind's JIT needs the class
              // to be a literal string; `-4.32rem` is 9rem × 0.48 (see
              // overlap doc above the constant).
              className={i === 0 ? 'group' : 'group sm:!ml-[-4.32rem]'}
            >
              <button
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                type="button"
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
                  if (draggable) cardDrag.handlers.onPointerDown(e, arcanum);
                }}
                onPointerMove={cardDrag.handlers.onPointerMove}
                onPointerUp={cardDrag.handlers.onPointerUp}
                onPointerCancel={cardDrag.handlers.onPointerCancel}
                onFocus={handleFocusIn}
                onBlur={handleFocusOut}
                onKeyDown={(e) => handleKey(e, i, arcanum)}
                tabIndex={i === focusIndex ? 0 : -1}
                style={{
                  padding: 0,
                  border: isSelected ? '2px solid #d4af37' : 'none',
                  borderRadius: 12,
                  background: 'transparent',
                  cursor: interactive ? 'pointer' : 'default',
                  display: 'block',
                }}
                // #463: focus-visible ring is the load-bearing keyboard
                // focus indicator, applied independently of the scale
                // transform — it remains visible under
                // `prefers-reduced-motion` even when the magnify is off.
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-illumination/80"
              >
                {visible ? (
                  // #38: responsive width — `w-24` on narrow (96 px),
                  // `w-36` on `sm:` and up (144 px). Combined with the
                  // `-2.88rem` / `sm:-4.32rem` overlap (#290), a 6-card
                  // fan sits inside the desktop `max-w-xl` container and
                  // overflows a 320 px mobile viewport by ~26 px (clipped
                  // at viewport edge — see CARD_OVERLAP doc above).
                  <ArcanumCard number={arcanum} className="w-24 sm:w-36" />
                ) : (
                  <CardBack className="w-24 sm:w-36" />
                )}
              </button>
              {discardMode && onDiscard && visible ? (
                // #90: Translucent discard icon overlay. Appears on
                // group-hover so hovering anywhere in the card area
                // reveals it. Positioned absolute over the card; the
                // wrapper <div> is `position: relative`.
                // HTML requires this to be a sibling, not a child of
                // the card <button> — nested interactive elements are
                // invalid HTML and cause accessibility issues.
                <button
                  type="button"
                  data-discard-icon={arcanum}
                  aria-label={`Discard ${arcanumByNumber(arcanum).name}`}
                  tabIndex={0}
                  onClick={() => onDiscard(arcanum)}
                  className="absolute inset-0 flex items-center justify-center rounded-[12px] bg-ground/60 opacity-0 transition-opacity duration-150 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-veil/80 group-hover:opacity-100"
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden
                    className="h-8 w-8 text-veil/90"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <polyline points="3,6 5,6 21,6" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
