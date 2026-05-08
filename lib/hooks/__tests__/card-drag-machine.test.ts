import { describe, expect, it } from 'vitest';
import { reduceCardDrag, initialCardDragState, DRAG_THRESHOLD_PX } from '../card-drag-machine';

/**
 * Tests for the pure card-drag state machine that powers #412's
 * drag-to-play. The hook (`useCardDrag`) wraps this reducer in React
 * state + browser pointer handlers; the kernel itself is pure so it
 * can be exhaustively tested without rendering.
 *
 * State transitions:
 *
 *   idle ──pointer-down──▶ press
 *   press ──move <threshold──▶ press   (no transition)
 *   press ──move ≥threshold──▶ dragging
 *   press ──pointer-up──▶ idle (emit { click })
 *   dragging ──move──▶ dragging
 *   dragging ──pointer-up──▶ idle (emit { drop })
 *   dragging|press ──pointer-cancel──▶ idle (emit { drag-cancel })
 *   any ──pointer-down (different pointer)──▶ unchanged
 */
describe('card-drag-machine', () => {
  describe('initial state', () => {
    it('starts in idle', () => {
      expect(initialCardDragState).toEqual({ kind: 'idle' });
    });
  });

  describe('idle → press on pointer-down', () => {
    it('captures arcanum, start position, and pointerId', () => {
      const { state, effect } = reduceCardDrag(initialCardDragState, {
        kind: 'pointer-down',
        arcanum: 5,
        x: 100,
        y: 200,
        pointerId: 1,
      });
      expect(state).toEqual({
        kind: 'press',
        arcanum: 5,
        startX: 100,
        startY: 200,
        pointerId: 1,
      });
      expect(effect).toBeUndefined();
    });
  });

  describe('press → press on small movement (below threshold)', () => {
    it('stays in press when movement is exactly at threshold - 1', () => {
      const after = reduceCardDrag(
        {
          kind: 'press',
          arcanum: 5,
          startX: 100,
          startY: 200,
          pointerId: 1,
        },
        { kind: 'pointer-move', x: 100 + (DRAG_THRESHOLD_PX - 1), y: 200, pointerId: 1 },
      );
      expect(after.state.kind).toBe('press');
      expect(after.effect).toBeUndefined();
    });

    it('ignores movement events from a different pointer', () => {
      const before = {
        kind: 'press' as const,
        arcanum: 5,
        startX: 100,
        startY: 200,
        pointerId: 1,
      };
      const after = reduceCardDrag(before, {
        kind: 'pointer-move',
        x: 999,
        y: 999,
        pointerId: 7,
      });
      expect(after.state).toEqual(before);
    });
  });

  describe('press → dragging on movement at/over threshold', () => {
    it('transitions to dragging when movement equals threshold', () => {
      const after = reduceCardDrag(
        {
          kind: 'press',
          arcanum: 5,
          startX: 100,
          startY: 200,
          pointerId: 1,
        },
        { kind: 'pointer-move', x: 100 + DRAG_THRESHOLD_PX, y: 200, pointerId: 1 },
      );
      expect(after.state).toEqual({
        kind: 'dragging',
        arcanum: 5,
        pointerId: 1,
        x: 100 + DRAG_THRESHOLD_PX,
        y: 200,
      });
      expect(after.effect).toEqual({ kind: 'drag-start', arcanum: 5 });
    });

    it('uses Euclidean distance — diagonal movement under axis threshold but over Euclidean still drags', () => {
      // 4px right + 4px down = sqrt(32) ≈ 5.66 px > 5 threshold.
      const after = reduceCardDrag(
        {
          kind: 'press',
          arcanum: 5,
          startX: 100,
          startY: 200,
          pointerId: 1,
        },
        { kind: 'pointer-move', x: 104, y: 204, pointerId: 1 },
      );
      expect(after.state.kind).toBe('dragging');
    });
  });

  describe('press → idle on pointer-up (emits click)', () => {
    it('emits a click effect with the arcanum so the consumer can fire onCardSelect', () => {
      const after = reduceCardDrag(
        {
          kind: 'press',
          arcanum: 5,
          startX: 100,
          startY: 200,
          pointerId: 1,
        },
        { kind: 'pointer-up', x: 102, y: 201, pointerId: 1 },
      );
      expect(after.state).toEqual({ kind: 'idle' });
      expect(after.effect).toEqual({ kind: 'click', arcanum: 5 });
    });

    it('ignores pointer-up from a different pointer', () => {
      const before = {
        kind: 'press' as const,
        arcanum: 5,
        startX: 100,
        startY: 200,
        pointerId: 1,
      };
      const after = reduceCardDrag(before, {
        kind: 'pointer-up',
        x: 100,
        y: 200,
        pointerId: 7,
      });
      expect(after.state).toEqual(before);
      expect(after.effect).toBeUndefined();
    });
  });

  describe('dragging → idle on pointer-up (emits drop)', () => {
    it('emits a drop effect carrying arcanum and final position', () => {
      const after = reduceCardDrag(
        {
          kind: 'dragging',
          arcanum: 5,
          pointerId: 1,
          x: 200,
          y: 300,
        },
        { kind: 'pointer-up', x: 250, y: 320, pointerId: 1 },
      );
      expect(after.state).toEqual({ kind: 'idle' });
      expect(after.effect).toEqual({
        kind: 'drop',
        arcanum: 5,
        x: 250,
        y: 320,
      });
    });
  });

  describe('dragging → dragging on movement', () => {
    it('updates position', () => {
      const after = reduceCardDrag(
        {
          kind: 'dragging',
          arcanum: 5,
          pointerId: 1,
          x: 200,
          y: 300,
        },
        { kind: 'pointer-move', x: 250, y: 350, pointerId: 1 },
      );
      expect(after.state).toEqual({
        kind: 'dragging',
        arcanum: 5,
        pointerId: 1,
        x: 250,
        y: 350,
      });
      expect(after.effect).toEqual({ kind: 'drag-move', arcanum: 5, x: 250, y: 350 });
    });
  });

  describe('pointer-cancel → idle without emitting', () => {
    it('cancels a press silently (no click, no drop)', () => {
      const after = reduceCardDrag(
        {
          kind: 'press',
          arcanum: 5,
          startX: 100,
          startY: 200,
          pointerId: 1,
        },
        { kind: 'pointer-cancel', pointerId: 1 },
      );
      expect(after.state).toEqual({ kind: 'idle' });
      expect(after.effect).toEqual({ kind: 'drag-cancel' });
    });

    it('cancels a drag silently — the consumer must not run drop logic on cancel', () => {
      // Why: pointer-cancel fires when the OS takes the pointer away
      // (e.g. system gesture, touch reservation, scroll capture). The
      // user's intent is unknown at that point — treating it as a drop
      // would dispatch a card-play the player didn't confirm. Always
      // safer to return to idle without acting.
      const after = reduceCardDrag(
        {
          kind: 'dragging',
          arcanum: 5,
          pointerId: 1,
          x: 200,
          y: 300,
        },
        { kind: 'pointer-cancel', pointerId: 1 },
      );
      expect(after.state).toEqual({ kind: 'idle' });
      expect(after.effect).toEqual({ kind: 'drag-cancel' });
    });

    it('ignores pointer-cancel from a different pointer', () => {
      const before = {
        kind: 'dragging' as const,
        arcanum: 5,
        pointerId: 1,
        x: 200,
        y: 300,
      };
      const after = reduceCardDrag(before, { kind: 'pointer-cancel', pointerId: 7 });
      expect(after.state).toEqual(before);
      expect(after.effect).toBeUndefined();
    });
  });

  describe('idle → idle on stray events', () => {
    it('discards pointer-move when nothing is held', () => {
      const after = reduceCardDrag(initialCardDragState, {
        kind: 'pointer-move',
        x: 100,
        y: 100,
        pointerId: 1,
      });
      expect(after.state).toEqual(initialCardDragState);
      expect(after.effect).toBeUndefined();
    });

    it('discards pointer-up when nothing is held', () => {
      const after = reduceCardDrag(initialCardDragState, {
        kind: 'pointer-up',
        x: 100,
        y: 100,
        pointerId: 1,
      });
      expect(after.state).toEqual(initialCardDragState);
      expect(after.effect).toBeUndefined();
    });
  });

  describe('press → press on stray pointer-down', () => {
    it('a second pointer-down while in press is ignored (one-finger tracking)', () => {
      const before = {
        kind: 'press' as const,
        arcanum: 5,
        startX: 100,
        startY: 200,
        pointerId: 1,
      };
      const after = reduceCardDrag(before, {
        kind: 'pointer-down',
        arcanum: 9,
        x: 500,
        y: 600,
        pointerId: 2,
      });
      // Whichever finger went down first owns the gesture — the
      // second is ignored. The reducer keeps state stable; the hook's
      // pointer-capture handles real-world routing.
      expect(after.state).toEqual(before);
      expect(after.effect).toBeUndefined();
    });
  });
});
