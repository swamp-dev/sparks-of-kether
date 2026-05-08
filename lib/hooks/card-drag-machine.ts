/**
 * Pure state machine for card drag-to-play (#412).
 *
 * Transitions:
 *
 *   idle ──pointer-down──▶ press
 *   press ──move <threshold──▶ press
 *   press ──move ≥threshold──▶ dragging  (effect: drag-start)
 *   press ──pointer-up──▶ idle  (effect: click)
 *   dragging ──move──▶ dragging  (effect: drag-move)
 *   dragging ──pointer-up──▶ idle  (effect: drop)
 *   press|dragging ──pointer-cancel──▶ idle  (emit: drag-cancel)
 *
 * The "press" intermediate is what preserves click-to-select for
 * keyboard parity: a tap that lifts before the threshold fires the
 * click effect, not a drop. The hook (`useCardDrag`) wraps this
 * reducer with React state, pointer capture, and DOM dispatch; the
 * kernel itself is pure so it can be exhaustively tested without
 * rendering.
 *
 * Pointer-cancel is a *silent* return to idle — the OS yanking the
 * pointer (system gesture, touch reservation, scroll capture) doesn't
 * confirm the player's intent, so dropping a card on cancel would
 * dispatch a play the user didn't confirm.
 */

/**
 * Movement threshold in CSS pixels. Below this, a pointer-up fires
 * `click`; at or above, the gesture transitions to `dragging`. 5px is
 * the conventional default — high enough that a finger-tap doesn't
 * accidentally drag, low enough that intent-to-drag registers fast.
 */
export const DRAG_THRESHOLD_PX = 5;

export type CardDragState =
  | { kind: 'idle' }
  | {
      kind: 'press';
      arcanum: number;
      startX: number;
      startY: number;
      pointerId: number;
    }
  | {
      kind: 'dragging';
      arcanum: number;
      pointerId: number;
      x: number;
      y: number;
    };

export type CardDragEvent =
  | {
      kind: 'pointer-down';
      arcanum: number;
      x: number;
      y: number;
      pointerId: number;
    }
  | { kind: 'pointer-move'; x: number; y: number; pointerId: number }
  | { kind: 'pointer-up'; x: number; y: number; pointerId: number }
  | { kind: 'pointer-cancel'; pointerId: number };

export type CardDragEffect =
  | { kind: 'drag-start'; arcanum: number }
  | { kind: 'drag-move'; arcanum: number; x: number; y: number }
  | { kind: 'drop'; arcanum: number; x: number; y: number }
  | { kind: 'click'; arcanum: number }
  | { kind: 'drag-cancel' };

export interface CardDragStep {
  readonly state: CardDragState;
  readonly effect?: CardDragEffect;
}

export const initialCardDragState: CardDragState = { kind: 'idle' };

export function reduceCardDrag(
  state: CardDragState,
  event: CardDragEvent,
): CardDragStep {
  switch (state.kind) {
    case 'idle': {
      if (event.kind === 'pointer-down') {
        return {
          state: {
            kind: 'press',
            arcanum: event.arcanum,
            startX: event.x,
            startY: event.y,
            pointerId: event.pointerId,
          },
        };
      }
      return { state };
    }

    case 'press': {
      if (event.kind === 'pointer-down') {
        // A second pointer while one finger is already pressing is
        // ignored. The hook's pointer-capture handles real-world
        // routing of move/up events to the captured pointerId; the
        // reducer just refuses to switch tracking targets mid-gesture.
        return { state };
      }
      if (event.pointerId !== state.pointerId) {
        return { state };
      }
      if (event.kind === 'pointer-move') {
        const dx = event.x - state.startX;
        const dy = event.y - state.startY;
        const distSq = dx * dx + dy * dy;
        if (distSq >= DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
          return {
            state: {
              kind: 'dragging',
              arcanum: state.arcanum,
              pointerId: state.pointerId,
              x: event.x,
              y: event.y,
            },
            effect: { kind: 'drag-start', arcanum: state.arcanum },
          };
        }
        return { state };
      }
      if (event.kind === 'pointer-up') {
        return {
          state: { kind: 'idle' },
          effect: { kind: 'click', arcanum: state.arcanum },
        };
      }
      // pointer-cancel
      return {
        state: { kind: 'idle' },
        effect: { kind: 'drag-cancel' },
      };
    }

    case 'dragging': {
      if (event.kind === 'pointer-down') {
        return { state };
      }
      if (event.pointerId !== state.pointerId) {
        return { state };
      }
      if (event.kind === 'pointer-move') {
        return {
          state: {
            kind: 'dragging',
            arcanum: state.arcanum,
            pointerId: state.pointerId,
            x: event.x,
            y: event.y,
          },
          effect: {
            kind: 'drag-move',
            arcanum: state.arcanum,
            x: event.x,
            y: event.y,
          },
        };
      }
      if (event.kind === 'pointer-up') {
        return {
          state: { kind: 'idle' },
          effect: {
            kind: 'drop',
            arcanum: state.arcanum,
            x: event.x,
            y: event.y,
          },
        };
      }
      // pointer-cancel
      return {
        state: { kind: 'idle' },
        effect: { kind: 'drag-cancel' },
      };
    }
  }
}
