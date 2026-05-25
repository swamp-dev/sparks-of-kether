'use client';
import { RevealLine } from './RevealLine';

/**
 * Single-line dialogue bar for the EncounterScreen. Replaces the
 * scattered framing-paragraph + avatar-caption pattern with one
 * focused surface: a left-accented panel showing the current speaker's
 * name above the word-by-word reveal of their line.
 *
 * Only one DialogueLine is visible at a time. The parent (EncounterScreen)
 * sequences lines by swapping the `variant` + `line` props and keying
 * re-mounts on the current dialogue phase.
 *
 * **Variant-specific data attributes** preserve the test selectors that
 * previously lived on the framing paragraph, AvatarPortrait caption, and
 * VerdictReveal:
 *   - `avatar` → body gets `data-encounter-framing`
 *   - `player` → body gets `data-player-response`
 *   - `pass` / `fail` → body gets `data-avatar-verdict`;
 *                        speaker span gets `data-avatar-name`
 *
 * CSS-only, no Framer Motion. Tailwind contract: every class string in
 * this file is a literal so JIT can extract it. Do NOT collapse variant
 * classes into template strings.
 */

export type DialogueVariant = 'avatar' | 'player' | 'pass' | 'fail';

interface DialogueLineProps {
  readonly speaker: string;
  readonly line: string;
  readonly variant: DialogueVariant;
  /**
   * Per-Sefirah left-border accent class (e.g. `'border-l-hod'`).
   * Required for `'avatar'` variant; ignored for `'player'`, `'pass'`,
   * `'fail'` (those use fixed tokens).
   */
  readonly accentBorderClass?: string;
  /**
   * Per-Sefirah speaker-nameplate text class (e.g. `'text-hod/70'`).
   * Required for `'avatar'` variant; ignored for others.
   */
  readonly accentSpeakerClass?: string;
  /**
   * Mirror of the parent's `prefers-reduced-motion` snapshot. Forwarded
   * to `RevealLine` so the text reveal respects the same preference
   * snapshot as the surrounding encounter, even if the OS setting changes
   * mid-encounter.
   */
  readonly reducedMotion: boolean;
  /** Fires once after the RevealLine's word-reveal finishes. */
  readonly onComplete?: () => void;
  readonly className?: string;
}

/** Fixed border class for player-spoken lines. */
const PLAYER_BORDER = 'border-l-veil/40';
/** Fixed border class for a passing verdict. */
const PASS_BORDER = 'border-l-tiferet';
/** Fixed border class for a failing verdict. */
const FAIL_BORDER = 'border-l-gevurah';

/** Fixed speaker text class for player lines. */
const PLAYER_SPEAKER = 'text-veil/60';
/** Fixed speaker text class for pass verdict. */
const PASS_SPEAKER = 'text-tiferet/80';
/** Fixed speaker text class for fail verdict. */
const FAIL_SPEAKER = 'text-gevurah/80';

export function DialogueLine({
  speaker,
  line,
  variant,
  accentBorderClass,
  accentSpeakerClass,
  reducedMotion,
  onComplete,
  className,
}: DialogueLineProps): JSX.Element {
  const borderClass =
    variant === 'pass'
      ? PASS_BORDER
      : variant === 'fail'
        ? FAIL_BORDER
        : variant === 'player'
          ? PLAYER_BORDER
          : (accentBorderClass ?? 'border-l-veil/40');

  const speakerClass =
    variant === 'pass'
      ? PASS_SPEAKER
      : variant === 'fail'
        ? FAIL_SPEAKER
        : variant === 'player'
          ? PLAYER_SPEAKER
          : (accentSpeakerClass ?? 'text-veil/60');

  const isVerdict = variant === 'pass' || variant === 'fail';

  return (
    <div
      data-dialogue-line
      data-dialogue-variant={isVerdict ? variant : undefined}
      className={`w-full rounded border-l-4 bg-ground/95 px-4 py-3${className ? ` ${className}` : ''} ${borderClass}`}
    >
      {isVerdict ? (
        // Verdict layout: avatar name + line in a single paragraph so
        // the existing `[data-avatar-verdict]` / `[data-avatar-name]`
        // selectors keep working without changes to the tests that pin
        // the VerdictReveal DOM contract.
        <p
          data-avatar-verdict
          className="text-center text-sm italic opacity-90"
        >
          <span
            data-avatar-name
            data-dialogue-speaker
            className={`font-semibold not-italic ${speakerClass}`}
          >
            {speaker}:
          </span>{' '}
          <RevealLine text={line} reducedMotionOverride={reducedMotion} onComplete={onComplete} />
        </p>
      ) : (
        // Framing / player-response layout: speaker nameplate above a
        // divider, then the word-reveal body below.
        <>
          <div
            data-dialogue-speaker
            className={`font-display text-xs uppercase tracking-widest ${speakerClass}`}
          >
            {speaker}
          </div>
          <div aria-hidden className="my-2 border-b border-veil/20" />
          <p
            {...(variant === 'avatar' ? { 'data-encounter-framing': true } : {})}
            {...(variant === 'player' ? { 'data-player-response': true } : {})}
            className="font-display italic leading-relaxed text-veil"
          >
            <RevealLine text={line} reducedMotionOverride={reducedMotion} onComplete={onComplete} />
          </p>
        </>
      )}
    </div>
  );
}
