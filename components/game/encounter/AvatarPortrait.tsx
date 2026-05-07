import { useState } from 'react';
import type { SefirahKey } from '@/data';
import { sefirahMarkLetter } from '@/data';
import { avatarNames, type EncounterAvatarKey } from '@/data/avatar-names';
import { SEFIRAH_FRAME_TOKENS } from './sefirah-frame-tokens';

/**
 * Disco-Elysium-style avatar portrait for the EncounterScreen.
 *
 * Two sizes:
 *   - `small` (default): 64×64 circular plate. Used in the resolve /
 *     react sub-states and in pre-#479 layouts. Renders the Sefirah's
 *     Hebrew letter on a tinted disc.
 *   - `stage`: ~240×360 oval crop. Used by the re-skinned prep
 *     sub-state (#479) where the avatar is the page, not a side
 *     icon. Renders the commissioned portrait image from
 *     `public/portraits/<character>/large.webp` with a Sefirah-tinted
 *     ring + breath halo.
 *
 * The portrait images are 16:9 horizontal source — the figures sit
 * inside the canvas with varying focal positions. The oval crop uses
 * `object-position: center 25%` as a default that frames most figures
 * head-and-shoulders; per-Sefirah focal overrides will land in #483
 * (idle motion polish) when each character's framing is visually
 * tuned.
 *
 * If the portrait asset fails to load (404 / network error), the
 * `<Image>` `onError` flips us back to the Hebrew-letter placeholder
 * so the screen never renders empty.
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
  /**
   * Render scale. `small` is the original 64×64 disc used by resolve /
   * react and by surfaces that haven't been re-skinned. `stage` is the
   * larger oval used by the re-skinned prep where the avatar is the
   * visual focus.
   */
  readonly size?: 'small' | 'stage';
  readonly className?: string;
}

/** Sefirot that have a commissioned portrait shipped under `public/portraits/<character>/`. */
function avatarCharacterFor(sefirah: SefirahKey): string | undefined {
  if (sefirah === 'kether' || sefirah === 'malkuth') return undefined;
  return avatarNames[sefirah as EncounterAvatarKey].greek.toLowerCase();
}

export function AvatarPortrait({
  sefirah,
  avatarName,
  caption,
  state,
  size = 'small',
  className,
}: AvatarPortraitProps): JSX.Element {
  const tokens = SEFIRAH_FRAME_TOKENS[sefirah];
  const letter = sefirahMarkLetter[sefirah];
  const character = avatarCharacterFor(sefirah);
  const [imageFailed, setImageFailed] = useState(false);
  const showPortraitImage =
    size === 'stage' && character !== undefined && !imageFailed;

  // Frame size: small disc vs stage oval. The stage oval is taller
  // than wide so half-body framing reads correctly; the small variant
  // is a perfect circle as before.
  const frameClass =
    size === 'stage'
      ? `relative h-60 w-44 overflow-hidden rounded-[40%] border-2 ${tokens.avatarRing} ${tokens.avatarPlate} motion-safe:animate-breath`
      : `relative flex h-16 w-16 items-center justify-center rounded-full border-2 ${tokens.avatarRing} ${tokens.avatarPlate} motion-safe:animate-breath`;

  return (
    <div
      data-avatar-portrait
      data-sefirah={sefirah}
      data-avatar-state={state}
      data-avatar-size={size}
      className={`flex flex-col items-center gap-2 ${className ?? ''}`}
    >
      <div className={frameClass}>
        {showPortraitImage && character !== undefined ? (
          // Plain <img> instead of next/image: next/image is not used
          // anywhere else in the repo, the asset is static under
          // /public (resolved at request time without runtime resize),
          // and avoiding next/image keeps the jsdom-based test setup
          // simple. Reassess if/when other components adopt next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/portraits/${character}/large.webp`}
            alt={avatarName ?? character}
            data-avatar-portrait-image
            // 16:9 source with the figure roughly centred horizontally
            // and slightly above the vertical centre. `center 25%`
            // frames head + shoulders for most characters; will be
            // tuned per-character in #483 if any look wrong in situ.
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: 'center 25%' }}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span
            aria-hidden
            className={
              size === 'stage'
                ? 'absolute inset-0 flex items-center justify-center font-hebrew text-7xl text-veil'
                : 'font-hebrew text-3xl text-veil'
            }
            data-avatar-placeholder-letter
          >
            {letter}
          </span>
        )}
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
