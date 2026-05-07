import { describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { RevealLine } from '../RevealLine';

/**
 * Tests for `RevealLine` (#482). Drive both the animating path
 * (default) and the reduced-motion path explicitly via the
 * `reducedMotionOverride` prop so the suite doesn't depend on
 * monkey-patching `window.matchMedia`. jsdom doesn't run CSS
 * animations, so timing assertions use the component's own
 * setTimeout-based completion signal — that's the contract callers
 * actually rely on (chaining a follow-up beat after the avatar
 * finishes speaking).
 */
describe('RevealLine', () => {
  it('renders one span per word', () => {
    render(<RevealLine text="The dream rang true" />);
    const words = document.querySelectorAll('[data-reveal-word]');
    expect(words.length).toBe(4);
  });

  it('preserves the original text content (whitespace-collapsed)', () => {
    // Multiple spaces / em-dashes in authored copy collapse to single
    // spaces in the rendered output. Tests that the visual reads
    // correctly even when the source string has irregular spacing.
    render(<RevealLine text="The   dream   rang true" />);
    const reveal = document.querySelector('[data-reveal-line]');
    expect(reveal?.textContent).toBe('The dream rang true');
  });

  it('flips out of the SSR placeholder state after client mount', () => {
    // The component renders `data-reveal-state="ssr"` until its
    // mount-flag `useEffect` flips. By the time `render()` returns,
    // React has already flushed that effect — so we can only verify
    // the post-mount shape from jsdom. The full SSR-then-hydrate
    // path is covered by the build step + Playwright e2e (no jsdom
    // primitive lets us pause between server and client render).
    // This test is the cheap canary that the post-mount state is
    // not stuck on `"ssr"`.
    render(<RevealLine text="Hello world" />);
    const reveal = document.querySelector('[data-reveal-line]');
    expect(reveal?.getAttribute('data-reveal-state')).not.toBe('ssr');
  });

  it('staggers each word with animation-delay = stagger × index', () => {
    render(<RevealLine text="Hermes asks again" stagger={50} />);
    const words = document.querySelectorAll('[data-reveal-word]');
    expect(words.length).toBe(3);
    // Inline animation-delay set per word; verifies the stagger
    // formula. jsdom returns the inline `style.animationDelay`
    // string verbatim.
    expect((words[0] as HTMLElement).style.animationDelay).toBe('0ms');
    expect((words[1] as HTMLElement).style.animationDelay).toBe('50ms');
    expect((words[2] as HTMLElement).style.animationDelay).toBe('100ms');
  });

  it('uses 40ms stagger by default', () => {
    render(<RevealLine text="quiet first" />);
    const words = document.querySelectorAll('[data-reveal-word]');
    expect((words[1] as HTMLElement).style.animationDelay).toBe('40ms');
  });

  it('reduced-motion: renders words with no animation styles', () => {
    render(<RevealLine text="Hermes asks again" reducedMotionOverride />);
    const reveal = document.querySelector('[data-reveal-line]');
    expect(reveal?.getAttribute('data-reveal-state')).toBe('reduced');
    const words = document.querySelectorAll('[data-reveal-word]');
    expect(words.length).toBe(3);
    // No animation-delay applied under reduced motion — the words
    // mount at full opacity, no stagger.
    for (const w of Array.from(words)) {
      expect((w as HTMLElement).style.animationDelay).toBe('');
    }
  });

  it('fires onComplete after the expected total duration (animating path)', () => {
    vi.useFakeTimers();
    try {
      const onComplete = vi.fn();
      render(
        <RevealLine
          text="one two three"
          stagger={50}
          onComplete={onComplete}
        />,
      );
      // 3 words × 50ms stagger means the last word starts at
      // 100ms; with 320ms keyframe duration it finishes at 420ms.
      expect(onComplete).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(419);
      });
      expect(onComplete).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(onComplete).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('fires onComplete on next tick under reduced motion', () => {
    vi.useFakeTimers();
    try {
      const onComplete = vi.fn();
      render(
        <RevealLine
          text="one two three"
          stagger={50}
          onComplete={onComplete}
          reducedMotionOverride
        />,
      );
      // Reduced-motion total = 0ms; the timer fires on the next
      // event-loop tick, not synchronously inside render.
      expect(onComplete).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(0);
      });
      expect(onComplete).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('fires onComplete immediately on empty text', () => {
    vi.useFakeTimers();
    try {
      const onComplete = vi.fn();
      render(<RevealLine text="" onComplete={onComplete} />);
      act(() => {
        vi.advanceTimersByTime(0);
      });
      expect(onComplete).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('cleans up the completion timer on unmount', () => {
    vi.useFakeTimers();
    try {
      const onComplete = vi.fn();
      const { unmount } = render(
        <RevealLine
          text="one two three"
          stagger={50}
          onComplete={onComplete}
        />,
      );
      unmount();
      // Advance past the would-be completion time. If the timer
      // wasn't cleared, onComplete would fire on a stale closure
      // — exactly the React 18 setState-on-unmounted-component
      // smell. The test pins the cleanup contract.
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(onComplete).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses the latest onComplete reference if the prop changes', () => {
    vi.useFakeTimers();
    try {
      const first = vi.fn();
      const second = vi.fn();
      const { rerender } = render(
        <RevealLine text="one two" stagger={50} onComplete={first} />,
      );
      // Swap callbacks before the timer fires.
      rerender(
        <RevealLine text="one two" stagger={50} onComplete={second} />,
      );
      // 2 words × 50ms stagger + 320ms = 370ms total.
      act(() => {
        vi.advanceTimersByTime(370);
      });
      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('passes className through to the wrapping span', () => {
    render(
      <RevealLine
        text="Hermes asks"
        className="font-display italic opacity-90"
      />,
    );
    const reveal = document.querySelector('[data-reveal-line]');
    expect(reveal?.className).toContain('font-display');
    expect(reveal?.className).toContain('italic');
  });
});
