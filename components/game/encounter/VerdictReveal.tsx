import type { CheckOutcome } from '@/engine/checks';
import { RevealLine } from './RevealLine';

/**
 * Staged verdict reveal for the EncounterScreen (#315). Branches on
 * pass / fail with distinct visual treatments while preserving the
 * existing aria-live status content (handled by the parent's
 * `[role="status"]` block above).
 *
 * **Pass:** the modal background gains a brief gold sparkle (CSS
 * keyframes, no particles — the sparkle is a radial-gradient
 * pseudo-layer authored as a `data-verdict="pass"` selector hook so
 * it runs once on mount). The avatar's halo flash is owned by the
 * `D20Button`'s settled-state glow.
 *
 * **Fail:** the modal frame dims; a thin Gevurah-red separation line
 * crosses the screen behind the modal. This is rendered as an
 * absolute pseudo-line on `[data-verdict-reveal][data-verdict="fail"]`,
 * positioned via fixed coordinates so it sits behind the modal in
 * the stacking context.
 *
 * **Reduced motion:** all the keyframes are gated under
 * `motion-safe:`. The component still mounts the same DOM (so tests
 * pin the same selectors) but the keyframe animations don't run.
 * The `data-reduced-motion` attribute lets CSS branch off the
 * preference deterministically.
 *
 * Out of scope: heavy animation libraries (framer-motion, etc.).
 * The reveal is CSS-only; that keeps mobile paint cost low and is
 * test-friendly (no animation-frame coupling).
 */

interface VerdictRevealProps {
  readonly outcome: CheckOutcome;
  /** True when `prefers-reduced-motion: reduce` matches at mount time. */
  readonly reducedMotion: boolean;
  /** The avatar verdict line (e.g. "You crossed first; you crossed alone.") */
  readonly verdictLine?: string;
  /** Avatar's Greek name (e.g. "Hermes"). Optional — fallback rendered when absent. */
  readonly avatarName?: string;
  readonly children?: React.ReactNode;
}

export function VerdictReveal({
  outcome,
  reducedMotion,
  verdictLine,
  avatarName,
  children,
}: VerdictRevealProps): JSX.Element {
  const verdict: 'pass' | 'fail' = outcome.pass ? 'pass' : 'fail';

  // The avatar verdict line. Falls back to the placeholder string when
  // the encounter context didn't carry a sign (demo / test path).
  // Italic style is the existing #277 contract; we preserve it so
  // tests targeting `[data-avatar-verdict]` still match.
  // Verdict body: avatar name (rendered immediately, not staggered)
  // followed by the verdict line wrapped in `<RevealLine>` so the
  // line reads word-by-word like speech (#482). The avatar name is
  // outside the staggered flow because the speaker should be named
  // immediately — the avatar isn't speaking themselves; the parent
  // is. Reduced-motion users see the same DOM with no stagger.
  const verdictBody =
    avatarName !== undefined && verdictLine !== undefined ? (
      <>
        <span data-avatar-name className="not-italic font-semibold">
          {avatarName}:
        </span>{' '}
        <RevealLine text={verdictLine} />
      </>
    ) : (
      'The gate considers you.'
    );

  return (
    <div
      data-verdict-reveal
      data-verdict={verdict}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      className="relative mt-4 flex flex-col items-center gap-3"
    >
      {/*
        Pass overlay: gold sparkle. Authored as a positioned absolute
        pseudo-layer that fades in/out via the `victory-glow` keyframe
        already present in tailwind.config.ts. Reduced-motion users
        skip the keyframe entirely; the layer renders at its
        baseline opacity (transparent) and stays out of their way.
      */}
      {verdict === 'pass' && !reducedMotion ? (
        <span
          aria-hidden
          data-verdict-sparkle
          className="pointer-events-none absolute inset-0 -z-10 rounded-lg motion-safe:animate-victory-glow"
        />
      ) : null}
      {/*
        Fail overlay: thin Gevurah-red separation line behind the
        modal. The line is styled inline so it sits across the modal
        width without depending on a parent's layout context. CSS
        keyframes drive its draw-in; reduced-motion users see it at
        its 100% state (a static thin line) so the visual is still
        readable but no animation runs.
      */}
      {verdict === 'fail' ? (
        <span
          aria-hidden
          data-verdict-separation
          className={`pointer-events-none absolute left-0 right-0 top-1/2 -z-10 h-px bg-gevurah ${
            reducedMotion ? 'opacity-60' : 'motion-safe:opacity-60'
          }`}
        />
      ) : null}

      <p
        // Preserve #277's `[data-avatar-verdict]` contract.
        data-avatar-verdict
        className="max-w-sm text-center text-sm italic opacity-90"
      >
        {verdictBody}
      </p>
      {children}
    </div>
  );
}
