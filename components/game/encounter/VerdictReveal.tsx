import type { CheckOutcome } from '@/engine/checks';
import { DialogueLine } from './DialogueLine';

/**
 * Staged verdict reveal for the EncounterScreen (#315). Branches on
 * pass / fail with distinct visual treatments while preserving the
 * existing aria-live status content (handled by the parent's
 * `[role="status"]` block above).
 *
 * **Pass:** the modal background gains a brief gold sparkle (CSS
 * keyframes, no particles — the sparkle is a radial-gradient
 * pseudo-layer authored as a `data-verdict="pass"` selector hook so
 * it runs once on mount). DialogueLine uses `border-l-tiferet` treatment.
 *
 * **Fail:** the modal frame dims; a thin Gevurah-red separation line
 * crosses the screen behind the modal. DialogueLine uses `border-l-gevurah`.
 *
 * **Reduced motion:** all the keyframes are gated under
 * `motion-safe:`. The component still mounts the same DOM (so tests
 * pin the same selectors) but the keyframe animations don't run.
 * The `data-reduced-motion` attribute lets CSS branch off the
 * preference deterministically.
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

  return (
    <div
      data-verdict-reveal
      data-verdict={verdict}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      className="relative mt-4 flex flex-col items-center gap-3"
    >
      {verdict === 'pass' && !reducedMotion ? (
        <span
          aria-hidden
          data-verdict-sparkle
          className="pointer-events-none absolute inset-0 -z-10 rounded-lg motion-safe:animate-victory-glow"
        />
      ) : null}
      {verdict === 'fail' ? (
        <span
          aria-hidden
          data-verdict-separation
          className={`pointer-events-none absolute left-0 right-0 top-1/2 -z-10 h-px bg-gevurah ${
            reducedMotion ? 'opacity-60' : 'motion-safe:opacity-60'
          }`}
        />
      ) : null}

      {avatarName !== undefined && verdictLine !== undefined ? (
        <DialogueLine
          speaker={avatarName}
          line={verdictLine}
          variant={verdict}
          reducedMotion={reducedMotion}
          className="max-w-sm"
        />
      ) : (
        <p data-avatar-verdict className="max-w-sm text-center text-sm italic opacity-90">
          The gate considers you.
        </p>
      )}
      {children}
    </div>
  );
}
