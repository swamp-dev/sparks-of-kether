import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import {
  initialCardDragState,
  reduceCardDrag,
  type CardDragEffect,
  type CardDragState,
} from './card-drag-machine';

/**
 * React hook wrapping the pure card-drag state machine (#412).
 *
 * Returns a state value the consumer renders against, plus four
 * pointer handlers that go on every card button. The hook handles:
 *
 *   - Pointer capture so move/up events route back to the original
 *     element even when the pointer leaves it (touch + mouse).
 *   - Threshold detection (delegated to the reducer).
 *   - Effect dispatch — `drag-start` / `drag-move` / `drop` /
 *     `click` / `drag-cancel` — via the consumer-supplied callback.
 *
 * Why Pointer Events: a single API covers mouse, touch, and pen with
 * uniform pointerId routing. HTML5 drag-and-drop was ruled out: it
 * doesn't compose with the fan-overlap layout (drag image is one
 * card, not a fan), and its touch story is poor on iOS. Native
 * pointer events with `setPointerCapture` give us touch + mouse
 * parity for free.
 *
 * The `click` effect fires on `pointerup` from `press` (movement
 * stayed below threshold) — this preserves the existing
 * click-to-select-then-click-path keyboard parity. Keyboard users
 * never enter the press state in the first place because they don't
 * use pointer events; the hook is purely additive to today's
 * onClick / onKeyDown handlers.
 */

interface UseCardDragOptions {
  readonly onEffect: (effect: CardDragEffect) => void;
}

/**
 * Pointer capture API isn't universally available — jsdom (the test
 * runtime) implements `setPointerCapture` but not the matching
 * `hasPointerCapture` / `releasePointerCapture`. Real browsers
 * implement all three; pointerup also auto-releases capture. The
 * explicit `release` is belt-and-braces in production code; in tests
 * we no-op silently rather than blow up the whole hook.
 */
function setPointerCaptureSafe(el: Element, pointerId: number): void {
  if (typeof el.setPointerCapture === 'function') {
    el.setPointerCapture(pointerId);
  }
}

function releasePointerCaptureSafe(el: Element, pointerId: number): void {
  if (
    typeof el.hasPointerCapture === 'function' &&
    typeof el.releasePointerCapture === 'function' &&
    el.hasPointerCapture(pointerId)
  ) {
    el.releasePointerCapture(pointerId);
  }
}

interface UseCardDragReturn {
  readonly state: CardDragState;
  readonly handlers: {
    readonly onPointerDown: (e: PointerEvent<HTMLElement>, arcanum: number) => void;
    readonly onPointerMove: (e: PointerEvent<HTMLElement>) => void;
    readonly onPointerUp: (e: PointerEvent<HTMLElement>) => void;
    readonly onPointerCancel: (e: PointerEvent<HTMLElement>) => void;
  };
}

export function useCardDrag(options: UseCardDragOptions): UseCardDragReturn {
  const [state, setState] = useState<CardDragState>(initialCardDragState);
  // The reducer is pure but its consumer callback (`onEffect`) often
  // wants the LATEST closure — caching `onEffect` in a ref lets the
  // pointer handlers stay stable while the consumer's effect routing
  // updates on every render. Without the ref, every render would
  // produce new handler identities and trigger React's
  // event-listener churn even though semantically nothing changed.
  const onEffectRef = useRef(options.onEffect);
  onEffectRef.current = options.onEffect;
  // Pending effect produced by the most recent dispatch. Written inside
  // the setState updater (safe: ref mutation is idempotent under
  // StrictMode double-invoke since both calls produce the same effect).
  // Consumed and cleared in the useEffect below. (#36)
  const pendingEffectRef = useRef<CardDragEffect | undefined>(undefined);

  const dispatch = useCallback((event: Parameters<typeof reduceCardDrag>[1]): void => {
    setState((prev) => {
      const step = reduceCardDrag(prev, event);
      // Unconditional write (even when `undefined`) keeps the invariant
      // explicit: pendingEffectRef always reflects the latest step's effect.
      pendingEffectRef.current = step.effect;
      return step.state;
    });
  }, []);

  // Fire the effect after the state update commits. `state` is the dep
  // (trigger only — not read in the body; pendingEffectRef carries the
  // value). useEffect runs after React's commit phase, so state has
  // already settled when the consumer callback fires — same timing
  // guarantee as the old queueMicrotask, but StrictMode-safe: the
  // updater double-invoke writes the same effect both times, so
  // pendingEffectRef is idempotent and the effect fires exactly once.
  // Note: rapid pointer-move batching could cause only the last
  // drag-move effect to survive; drag-move has no active consumer
  // today (#412) so this is not observable. (#36)
  useEffect(() => {
    const effect = pendingEffectRef.current;
    if (effect !== undefined) {
      pendingEffectRef.current = undefined;
      onEffectRef.current(effect);
    }
  }, [state]);

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLElement>, arcanum: number): void => {
      // Capture so subsequent move/up events fire on this element even
      // if the pointer drifts off. Without capture, dragging a finger
      // over a Tree path would fire pointer events on the path
      // element instead of the card, breaking the gesture.
      setPointerCaptureSafe(e.currentTarget, e.pointerId);
      dispatch({
        kind: 'pointer-down',
        arcanum,
        x: e.clientX,
        y: e.clientY,
        pointerId: e.pointerId,
      });
    },
    [dispatch],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLElement>): void => {
      dispatch({
        kind: 'pointer-move',
        x: e.clientX,
        y: e.clientY,
        pointerId: e.pointerId,
      });
    },
    [dispatch],
  );

  const onPointerUp = useCallback(
    (e: PointerEvent<HTMLElement>): void => {
      releasePointerCaptureSafe(e.currentTarget, e.pointerId);
      dispatch({
        kind: 'pointer-up',
        x: e.clientX,
        y: e.clientY,
        pointerId: e.pointerId,
      });
    },
    [dispatch],
  );

  const onPointerCancel = useCallback(
    (e: PointerEvent<HTMLElement>): void => {
      releasePointerCaptureSafe(e.currentTarget, e.pointerId);
      dispatch({ kind: 'pointer-cancel', pointerId: e.pointerId });
    },
    [dispatch],
  );

  return {
    state,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
}
