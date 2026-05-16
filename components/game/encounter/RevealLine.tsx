'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useReduceMotion } from '@/lib/hooks/useReduceMotion';

/**
 * Word-by-word reveal for the avatar's framing line (#479 prep stage)
 * and verdict line (#277 react sub-state). Splits the input on
 * whitespace and fades each word in on a staggered animation-delay so
 * the rhythm reads like speech, not subtitles.
 *
 * **Animation** is CSS-only — the `animate-word-reveal` Tailwind
 * utility consumes the `word-reveal` keyframe defined in
 * `tailwind.config.ts`. Stagger is set inline per word as
 * `animation-delay`. No framer-motion, no `requestAnimationFrame`;
 * keeps mobile paint cost low and makes the component test-friendly.
 *
 * **Reduced motion** (`prefers-reduced-motion: reduce`): all words
 * render at full opacity immediately, no stagger. `onComplete` fires
 * on the next tick so callers that chain a follow-up beat (e.g.
 * enabling the d20 button after the avatar finishes speaking) still
 * get a signal — they don't wait an animation cycle that won't run.
 *
 * **`onComplete` timing** uses `setTimeout` rather than the last
 * word's `animationend` event so jsdom + reduced-motion paths get
 * the same signal shape. The total delay equals the last word's
 * stagger plus the keyframe duration (320ms). A consumer that
 * disables a button on mount and re-enables in `onComplete` works
 * deterministically across all paths.
 *
 * Out of scope: per-character (typewriter) reveal — word-level only.
 * Audio-synced subtitle timing — much later.
 */

interface RevealLineProps {
  readonly text: string;
  /** ms between word starts. Default 40 — matches encounter-prep design (#479). */
  readonly stagger?: number;
  /**
   * Fires once after the last word's animation finishes (or
   * immediately on next tick under reduced motion). Use to chain a
   * follow-up beat — e.g. enabling the d20 button after the avatar
   * has finished speaking.
   */
  readonly onComplete?: () => void;
  readonly className?: string;
  /**
   * Test-only override of the reduced-motion preference. Lets the
   * test suite drive both code paths without monkey-patching
   * `window.matchMedia`.
   */
  readonly reducedMotionOverride?: boolean;
}

/**
 * Keyframe duration. Mirrors the `word-reveal` animation utility in
 * `tailwind.config.ts`. Used to compute the `onComplete` timer so it
 * fires after the last word finishes, not just after it starts.
 */
const WORD_REVEAL_DURATION_MS = 320;

const DEFAULT_STAGGER_MS = 40;

export function RevealLine({
  text,
  stagger = DEFAULT_STAGGER_MS,
  onComplete,
  className,
  reducedMotionOverride,
}: RevealLineProps): JSX.Element {
  const detectedReduceMotion = useReduceMotion();
  const reducedMotion = reducedMotionOverride ?? detectedReduceMotion;

  // Split on whitespace, preserving word boundaries. `text` may
  // contain multiple spaces from authored copy (e.g. an em-dash
  // surrounded by spaces); we collapse those — only non-empty
  // tokens become animated `<span>`s, with a single rendered space
  // between them.
  const words = useMemo(() => text.split(/\s+/).filter((w) => w.length > 0), [text]);

  // Track whether the component has mounted on the client so SSR
  // hydration matches: server emits the static text, client mounts
  // animate the reveal. Without this flag the SSR-rendered HTML
  // would briefly flash at zero opacity before hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Latest-callback ref so the completion timer doesn't re-arm if
  // the parent passes a fresh `onComplete` reference on each render.
  // Same pattern as the `onResolved` ref in `EncounterScreen`.
  // Effect intentionally has no deps array — it runs after every
  // render so `current` always points at the latest function.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useEffect(() => {
    if (!mounted) return;
    if (words.length === 0) {
      // Edge case: empty string — fire onComplete immediately so
      // callers that gate UI on completion don't hang.
      onCompleteRef.current?.();
      return;
    }
    // Total time from mount until the last word finishes its keyframe.
    // Reduced motion: 0 (one tick via `setTimeout(_, 0)`).
    const totalMs = reducedMotion ? 0 : (words.length - 1) * stagger + WORD_REVEAL_DURATION_MS;
    const handle = setTimeout(() => {
      onCompleteRef.current?.();
    }, totalMs);
    return (): void => {
      clearTimeout(handle);
    };
    // `words.length` (not `words`) is in deps because the timer math
    // only depends on word count + stagger duration, not on the
    // text itself. Callers that swap `text` mid-mount with the same
    // word count get the same completion timer — fine for the
    // current callers (static `framingLine`, single-set `verdictLine`)
    // and a known-unknown for any future caller passing dynamic text.
  }, [mounted, reducedMotion, stagger, words.length]);

  // SSR + first-render: emit the plain text. Client-side post-mount
  // re-render renders the staggered word spans. Behavior matches
  // `useReduceMotion`'s SSR-safe pattern.
  if (!mounted) {
    return (
      <span data-reveal-line data-reveal-state="ssr" className={className}>
        {text}
      </span>
    );
  }

  // Reduced motion: render words inline with no animation, no delay.
  // The DOM shape (one span per word) stays consistent so test
  // selectors work across both paths.
  if (reducedMotion) {
    return (
      <span data-reveal-line data-reveal-state="reduced" className={className}>
        {words.map((word, idx) => (
          <span key={`${word}-${idx}`} data-reveal-word>
            {word}
            {idx < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </span>
    );
  }

  return (
    <span data-reveal-line data-reveal-state="animating" className={className}>
      {words.map((word, idx) => (
        <span
          key={`${word}-${idx}`}
          data-reveal-word
          data-reveal-word-index={idx}
          // `animation-delay` per word is the stagger × index. Inline
          // so Tailwind doesn't have to JIT a class per delay value.
          // Words start invisible from the keyframe's 0% frame; the
          // `forwards` fill-mode pins the final state at 100% opacity.
          //
          // **Display: inline (default) — not inline-block.** Earlier
          // revisions used `inline-block` to allow a `translateY`
          // slide-up. That caused **layout drift between local and
          // hosted Chromium** on `/demo/challenge` mobile (29px page
          // height delta, e2e visual-regression failure on PR #506) —
          // inline-block boxes have whitespace ambiguity between
          // adjacent words that the two browser environments
          // resolved differently, shifting the framing line wrap by
          // ~one line. Inline spans inherit the parent paragraph's
          // text flow exactly, so wrapping matches plain-text-node
          // baselines. Trade-off: the keyframe is now opacity-only
          // (no slide-up); the staggered reveal still reads as speech.
          //
          // **Reduced-motion safety:** the `motion-safe:` variant on
          // `animate-word-reveal` ensures users with
          // `prefers-reduced-motion: reduce` never see the keyframe
          // run. Without `motion-safe:`, a user whose JS branch hasn't
          // hydrated yet but whose CSS has loaded would see all words
          // stuck at the keyframe's 0% opacity (invisible) until the
          // useEffect flips the path. The variant guards that window.
          style={{
            animationDelay: `${idx * stagger}ms`,
          }}
          className="motion-safe:animate-word-reveal"
        >
          {word}
          {idx < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  );
}
