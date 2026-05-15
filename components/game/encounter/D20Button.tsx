'use client';
import { D20Roll } from '@/components/challenge/D20Roll';
import { D20 } from '@/components/tokens/D20';

/**
 * d20-shaped roll button for the EncounterScreen (#315). Replaces
 * the rectangular yellow `Roll` button with a real <button>
 * containing the existing D20 token (reused from
 * `components/tokens/D20.tsx`, the same one rendered in
 * `/demo/tokens`). The button stays a real DOM `<button>` for
 * accessibility — Tab-reachable, Enter/Space-activatable by browser
 * default; only its presentation changes to the d20 silhouette.
 *
 * Three render states:
 *   - **idle (prep)** — empty d20 token, "Roll" caption below.
 *   - **rolling (resolve)** — the existing `D20Roll` cycles random
 *     faces for ~700ms with `ease-flow`, then settles to the rolled
 *     value. Reduced-motion users skip the cycle (the inner
 *     `D20Roll` already honours `prefers-reduced-motion: reduce`).
 *   - **settled (react)** — the rolled value is displayed with a
 *     pass/fail glow flash via the existing `d20-roll-settle`
 *     keyframe in tailwind.config.ts (set on `D20` via the `rolled`
 *     prop). The keyframe uses Tiferet-gold for pass and an
 *     additional Gevurah-red drop-shadow class for fail (rendered
 *     by composing two `data-` attributes).
 *
 * Pass/fail glow colour is applied via a CSS class on the wrapping
 * div: `data-result="pass"` adds a Tiferet-gold ring class via the
 * `data-` selector hooks in the keyframe; `data-result="fail"` adds
 * a Gevurah-red ring. Both fade in over ~600ms then to baseline,
 * exactly mirroring the existing `d20-roll-settle` keyframe shape.
 */

interface D20ButtonProps {
  /** Current state — `idle` shows an empty die, `rolling` cycles, `settled` displays a value. */
  readonly state: 'idle' | 'rolling' | 'settled';
  /** Final rolled value when `state === 'settled'`. Required at settled state. */
  readonly value?: number;
  /** Outcome flag for the settled-state glow flash. Pass = gold; fail = red. */
  readonly result?: 'pass' | 'fail';
  /** Sefirah-coloured glow class — applied to the wrapping element while idle so the button reads as warmly framed. */
  readonly glowClass: string;
  /** Click handler — only fires in `idle` state; the parent gates re-rolling via state machine. */
  readonly onClick?: () => void;
  /** Visible caption below the die — "Roll", "Rolling…", or the rolled total. */
  readonly caption?: string;
  /** Disable the button (parent uses this when prep is locked or post-resolve). */
  readonly disabled?: boolean;
}

export function D20Button({
  state,
  value,
  result,
  glowClass,
  onClick,
  caption,
  disabled,
}: D20ButtonProps): JSX.Element {
  const isRolling = state === 'rolling';
  const isSettled = state === 'settled';
  const displayValue = isSettled ? value : undefined;

  // Glow flash class follows pass/fail at settle. Pass uses the
  // existing `d20-roll-settle` keyframe (gold). Fail layers a
  // gevurah-red drop-shadow via a separate class so the same
  // keyframe doesn't have to branch internally.
  const settleResultClass = isSettled
    ? result === 'pass'
      ? 'shadow-glow-tiferet'
      : 'shadow-glow-gevurah'
    : '';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-action="roll"
      data-d20-state={state}
      data-result={result ?? ''}
      // The button frame stays subtle (rounded-full, no fill) so the
      // d20 silhouette dominates. The Sefirah glow (idle) or pass/fail
      // glow (settled) is applied to a wrapping div one level deep so
      // the button's focus ring isn't masked. `ring-offset-ground`
      // (deep indigo) gives the focus ring a dark backstop so the
      // off-white ring doesn't bleed visually into the per-Sefirah
      // glow halo on focused keyboard nav.
      className={`group relative flex flex-col items-center gap-1 rounded-full p-1 transition-all duration-300 ease-emerge focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-veil focus-visible:ring-offset-2 focus-visible:ring-offset-ground disabled:cursor-not-allowed disabled:opacity-60`}
      aria-label={
        isRolling ? 'Rolling…' : isSettled && value !== undefined ? `Rolled ${value}` : 'Roll'
      }
    >
      <span
        // The wrapping span carries the breath/glow recipe so the
        // button focus ring sits cleanly around it. `idle` uses the
        // Sefirah glow + slow breath; `settled` swaps to the pass/fail
        // glow via the `d20-roll-settle` keyframe (already handles
        // motion-reduce internally on the `D20` token).
        className={`flex h-16 w-16 items-center justify-center rounded-full transition-all duration-300 ease-emerge ${
          state === 'idle' ? `${glowClass} motion-safe:animate-breath` : ''
        } ${settleResultClass}`}
        data-d20-glow
      >
        {isRolling && value !== undefined ? (
          <D20Roll value={value} rolling={true} className="h-12 w-12" />
        ) : (
          <D20
            // `value` is omitted when not settled — D20 reads
            // `value === undefined` as "empty die" (the idle prep
            // state). With `exactOptionalPropertyTypes`, we have to
            // build the prop bag conditionally rather than passing
            // `undefined` explicitly.
            {...(displayValue !== undefined ? { value: displayValue } : {})}
            rolled={isSettled}
            className="h-12 w-12"
          />
        )}
      </span>
      {caption !== undefined ? (
        <span
          className="font-display text-xs uppercase tracking-widest opacity-80"
          data-d20-caption
        >
          {caption}
        </span>
      ) : null}
    </button>
  );
}
