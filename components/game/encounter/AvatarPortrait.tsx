import type { SefirahKey } from '@/data';
import { sefirahMarkLetter } from '@/data';
import { SEFIRAH_FRAME_TOKENS } from './sefirah-frame-tokens';

/**
 * Disco-Elysium-style circular avatar portrait for the EncounterScreen
 * (#315). The portrait sits top-left of the modal and shows the voice
 * speaking: in prep, the player-response line; in react, the verdict.
 *
 * **Out of scope for this ticket:** the illustrated portrait artwork
 * itself — Epic #125 sub-ticket 8 owns that. For now we render a
 * placeholder: the Sefirah's Hebrew letter (from
 * `data/sefirah-glyphs.ts`) on a textured circular plate at the
 * avatar's colour. When illustrations land, drop the placeholder and
 * keep the surrounding ring + caption structure.
 *
 * The metallic ring is tinted with the Sefirah's colour via the
 * tokens in `sefirah-frame-tokens.ts` (per-Sefirah avatarRing class).
 * The plate uses a low-alpha Sefirah-coloured background so the
 * letter reads against it without painting the whole ring.
 *
 * `caption` is the avatar's currently-spoken line — the prep
 * player-response, or the post-roll verdict. When absent, the
 * portrait renders alone (the parent owns whether to surface a line
 * at all). The avatar's Greek name (e.g. "Hermes") is rendered as a
 * small label under the portrait when supplied.
 */

interface AvatarPortraitProps {
  readonly sefirah: SefirahKey;
  /** Greek name of the avatar (e.g. "Apollo"). Optional — absent in demo / sign-less test contexts. */
  readonly avatarName?: string;
  /** The line the avatar is currently saying. Optional — prep mounts this empty until the parent decides which line to show. */
  readonly caption?: string;
  /**
   * Caption lifecycle hint. `pass` and `fail` are the post-roll
   * states; `prep` is the pre-roll player-response context. Consumers
   * pin different visual treatments off this attribute (CSS pulls it
   * via `[data-avatar-state]`).
   */
  readonly state: 'prep' | 'pass' | 'fail';
  readonly className?: string;
}

export function AvatarPortrait({
  sefirah,
  avatarName,
  caption,
  state,
  className,
}: AvatarPortraitProps): JSX.Element {
  const tokens = SEFIRAH_FRAME_TOKENS[sefirah];
  const letter = sefirahMarkLetter[sefirah];
  return (
    <div
      data-avatar-portrait
      data-sefirah={sefirah}
      data-avatar-state={state}
      className={`flex flex-col items-center gap-2 ${className ?? ''}`}
    >
      <div
        // The plate is the inner disc; the ring is the metallic outer
        // border tinted with the Sefirah colour. `motion-safe:` gates
        // the slow breath halo so reduced-motion users see a static
        // tinted disc, not an oscillating one.
        className={`relative flex h-16 w-16 items-center justify-center rounded-full border-2 ${tokens.avatarRing} ${tokens.avatarPlate} motion-safe:animate-breath`}
      >
        <span
          aria-hidden
          className="font-hebrew text-3xl text-veil"
          data-avatar-placeholder-letter
        >
          {letter}
        </span>
      </div>
      {avatarName !== undefined ? (
        <span
          className="font-display text-xs uppercase tracking-widest opacity-70"
          data-avatar-name-label
        >
          {avatarName}
        </span>
      ) : null}
      {caption !== undefined ? (
        <p
          data-avatar-caption
          // `data-player-response` lights up only in prep state so
          // the existing #277 selector contract continues to find
          // the pre-roll player line at this slot. In pass/fail
          // state the caption holds the verdict line; the
          // VerdictReveal component renders the canonical
          // `[data-avatar-verdict]` separately for its own a11y +
          // staging treatment.
          {...(state === 'prep' ? { 'data-player-response': true } : {})}
          className="max-w-[14rem] text-center text-xs italic opacity-80"
        >
          {caption}
        </p>
      ) : null}
    </div>
  );
}
