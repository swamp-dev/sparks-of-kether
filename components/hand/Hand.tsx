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
  readonly className?: string;
}

const MAX_FAN_DEG = 12;

export function Hand({
  hand,
  visible,
  onCardSelect,
  selectedArcanum,
  ariaLabel,
  className,
}: HandProps): JSX.Element {
  const [focusIndex, setFocusIndex] = useState(0);
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

  return (
    <div
      role="group"
      aria-label={computedLabel}
      data-hand
      data-visible={visible ? 'true' : 'false'}
      className={className}
      style={{ display: 'flex', justifyContent: 'center', gap: 0 }}
    >
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
              transform: `rotate(${fanDeg.toFixed(2)}deg) translateY(${Math.abs(offsetFromCenter) * 4}px)`,
              transformOrigin: 'bottom center',
              marginLeft: i === 0 ? 0 : -36,
              padding: 0,
              border: isSelected ? '2px solid #d4af37' : 'none',
              borderRadius: 12,
              background: 'transparent',
              cursor: interactive ? 'pointer' : 'default',
            }}
          >
            {visible ? (
              <ArcanumCard number={arcanum} className="w-24" />
            ) : (
              <CardBack className="w-24" />
            )}
          </button>
        );
      })}
    </div>
  );
}
