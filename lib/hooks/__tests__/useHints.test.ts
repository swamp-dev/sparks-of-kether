import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHints, markDismissed, clearAllHints, isDismissed } from '../useHints';
import { makeState } from '@/test/fixtures';

const ALL_HINT_IDS = [
  'tutorial-welcome',
  'tutorial-hand-intro',
  'tutorial-play-card',
  'tutorial-draw-replenish',
  'tutorial-meditate',
  'tutorial-challenge-intro',
  'tutorial-spark-earned',
];

function dismissAll(): void {
  ALL_HINT_IDS.forEach((id) => localStorage.setItem(`sok:hint:${id}`, 'dismissed'));
}

beforeEach(() => {
  clearAllHints();
  sessionStorage.clear();
});

afterEach(() => {
  clearAllHints();
  sessionStorage.clear();
});

describe('useHints', () => {
  describe('returns null when no hints are eligible', () => {
    it('returns null when all hints are dismissed', () => {
      dismissAll();
      const { result } = renderHook(() => useHints(makeState()));
      expect(result.current).toBeNull();
    });
  });

  describe('returns hint with lowest priority when multiple are eligible', () => {
    it('returns tutorial-welcome (priority 10) over tutorial-draw-replenish (priority 40) when both are eligible', async () => {
      // Set up so draw-replenish prerequisite chain is satisfied:
      // prereq = tutorial-play-card must be dismissed
      localStorage.setItem('sok:hint:tutorial-hand-intro', 'dismissed');
      localStorage.setItem('sok:hint:tutorial-play-card', 'dismissed');

      const { result, rerender } = renderHook(({ state }) => useHints(state), {
        initialProps: { state: makeState({}, { phase: 'move' }) },
      });

      // Advance to turn 2 by cycling through 'end' → 'move'
      act(() => {
        rerender({ state: makeState({}, { phase: 'end' }) });
      });
      act(() => {
        rerender({ state: makeState({}, { phase: 'move' }) });
      });

      // tutorial-welcome (game-start, no prereq, not dismissed) priority 10
      // tutorial-draw-replenish (turn-number:2 phase:move, prereq=play-card dismissed) priority 40
      expect(result.current?.id).toBe('tutorial-welcome');
    });
  });

  describe('prerequisiteId chain', () => {
    it('does not surface tutorial-play-card until tutorial-hand-intro is dismissed', () => {
      // Dismiss welcome so hand-intro becomes active after move-phase fires
      localStorage.setItem('sok:hint:tutorial-welcome', 'dismissed');

      const { result } = renderHook(() => useHints(makeState({}, { phase: 'move' })));

      // After effects settle, move-phase fires and hand-intro becomes eligible
      expect(result.current?.id).toBe('tutorial-hand-intro');

      // play-card should NOT be showing yet
      expect(result.current?.id).not.toBe('tutorial-play-card');
    });

    it('surfaces tutorial-play-card immediately after tutorial-hand-intro is dismissed (same phase)', () => {
      // Dismiss welcome and mark move-phase as first-event
      localStorage.setItem('sok:hint:tutorial-welcome', 'dismissed');
      sessionStorage.setItem('sok:first-event:move-phase', 'fired');

      const { result } = renderHook(() => useHints(makeState({}, { phase: 'move' })));

      expect(result.current?.id).toBe('tutorial-hand-intro');

      act(() => {
        markDismissed('tutorial-hand-intro');
      });

      expect(result.current?.id).toBe('tutorial-play-card');
    });
  });

  describe('dismissed hints are not re-surfaced', () => {
    it('does not show tutorial-welcome after it has been dismissed', () => {
      const { result } = renderHook(() => useHints(makeState()));

      // Initially tutorial-welcome is active
      expect(result.current?.id).toBe('tutorial-welcome');

      act(() => {
        markDismissed('tutorial-welcome');
      });

      expect(result.current?.id).not.toBe('tutorial-welcome');
    });
  });

  describe('game-start hint', () => {
    it('fires on first render (tutorial-welcome surfaces immediately)', () => {
      const { result } = renderHook(() => useHints(makeState()));
      expect(result.current?.id).toBe('tutorial-welcome');
    });

    it('does not re-surface after it is dismissed', () => {
      const { result } = renderHook(() => useHints(makeState()));

      act(() => {
        markDismissed('tutorial-welcome');
      });

      expect(isDismissed('tutorial-welcome')).toBe(true);
      expect(result.current?.id).not.toBe('tutorial-welcome');
    });
  });

  describe('phase-enter hint re-evaluates after dismiss event', () => {
    it('tutorial-play-card surfaces after tutorial-hand-intro is dismissed while already in move phase', () => {
      // Pre-seed: welcome and hand-intro dismissed, move-phase event fired
      localStorage.setItem('sok:hint:tutorial-welcome', 'dismissed');
      sessionStorage.setItem('sok:first-event:move-phase', 'fired');

      const { result } = renderHook(() => useHints(makeState({}, { phase: 'move' })));
      expect(result.current?.id).toBe('tutorial-hand-intro');

      act(() => {
        markDismissed('tutorial-hand-intro');
      });

      // tutorial-play-card: phase-enter:move, minTurn:1 (turn=1≥1), prereq=hand-intro (dismissed)
      expect(result.current?.id).toBe('tutorial-play-card');
    });
  });

  describe('first-event hint fires exactly once per session', () => {
    it('tutorial-hand-intro triggers once move-phase event fires in sessionStorage', () => {
      // mark prerequisite and first-event already fired (simulating prior session activity)
      localStorage.setItem('sok:hint:tutorial-welcome', 'dismissed');
      sessionStorage.setItem('sok:first-event:move-phase', 'fired');

      const { result } = renderHook(() => useHints(makeState({}, { phase: 'move' })));
      expect(result.current?.id).toBe('tutorial-hand-intro');
    });

    it('does not fire move-phase event when already fired in sessionStorage (re-mount in same session)', () => {
      sessionStorage.setItem('sok:first-event:move-phase', 'fired');
      // mount hook, move-phase effect runs but won't double-fire markFirstEventFired
      renderHook(() => useHints(makeState({}, { phase: 'move' })));
      // The sessionStorage value should still be 'fired' (not cleared or reset)
      expect(sessionStorage.getItem('sok:first-event:move-phase')).toBe('fired');
    });

    it('marks challenge first-event when phase transitions to challenge', () => {
      const { rerender } = renderHook(({ state }) => useHints(state), {
        initialProps: { state: makeState({}, { phase: 'move' }) },
      });

      act(() => {
        rerender({ state: makeState({}, { phase: 'challenge', challengeSubPhase: 'prep' }) });
      });

      expect(sessionStorage.getItem('sok:first-event:challenge')).toBe('fired');
    });
  });

  describe('timeout dismiss satisfies prerequisite check', () => {
    it('tutorial-meditate surfaces after tutorial-draw-replenish is timeout-dismissed', () => {
      // Pre-seed the prerequisite chain up to draw-replenish
      localStorage.setItem('sok:hint:tutorial-welcome', 'dismissed');
      localStorage.setItem('sok:hint:tutorial-hand-intro', 'dismissed');
      localStorage.setItem('sok:hint:tutorial-play-card', 'dismissed');
      sessionStorage.setItem('sok:first-event:move-phase', 'fired');

      const { result, rerender } = renderHook(({ state }) => useHints(state), {
        initialProps: { state: makeState({}, { phase: 'move' }) },
      });

      // Advance to turn 2 so draw-replenish trigger fires
      act(() => {
        rerender({ state: makeState({}, { phase: 'end' }) });
      });
      act(() => {
        rerender({ state: makeState({}, { phase: 'move' }) });
      });

      expect(result.current?.id).toBe('tutorial-draw-replenish');

      // Simulate a timeout dismiss (the timer fires and calls markDismissed)
      act(() => {
        markDismissed('tutorial-draw-replenish');
      });

      // tutorial-meditate: phase-enter:move, minTurn:2 (turn=2≥2), prereq=draw-replenish (just dismissed)
      expect(result.current?.id).toBe('tutorial-meditate');
    });
  });

  describe('hint-storage exports', () => {
    it('isDismissed returns false for an unknown hint id', () => {
      expect(isDismissed('nonexistent-hint')).toBe(false);
    });

    it('isDismissed returns true after markDismissed is called', () => {
      markDismissed('tutorial-welcome');
      expect(isDismissed('tutorial-welcome')).toBe(true);
    });

    it('clearAllHints removes all dismissed hints', () => {
      markDismissed('tutorial-welcome');
      markDismissed('tutorial-hand-intro');
      clearAllHints();
      expect(isDismissed('tutorial-welcome')).toBe(false);
      expect(isDismissed('tutorial-hand-intro')).toBe(false);
    });

    it('markDismissed ignores undefined id without throwing', () => {
      expect(() => markDismissed(undefined)).not.toThrow();
    });
  });
});
