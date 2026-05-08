import type { SefirahKey } from '../../types';

/**
 * Per-Sefirah codex "Voice" row for the Egyptian pantheon.
 *
 * Anchors against `reference/pantheons/egyptian.md` § 1 (#551):
 *   - `null` for Kether — the Final Threshold is collective and
 *     "the team becomes the avatar"; no single deity. (Atum / Nu
 *     would be the cosmological match if Kether ever gets a single
 *     voice; the table follows the Greek pantheon's special-case
 *     for now.)
 *   - Bastet stays attached to Malkuth even though she's a
 *     companion — the codex still names her on the Sefirah page,
 *     mirroring how Hestia surfaces for Greco-Roman.
 *   - The other 8 are the same names as `avatarNames[*].primary`
 *     for the encounter avatars — listed independently so the codex
 *     map can diverge if a future pantheon decides to (e.g. an
 *     alternate companion for Malkuth).
 */
export const sefirahCodexAvatar: Readonly<Record<SefirahKey, string | null>> = {
  kether: null,
  chokmah: 'Amun',
  binah: 'Isis',
  chesed: 'Ra',
  gevurah: 'Horus',
  tiferet: 'Osiris',
  netzach: 'Hathor',
  hod: 'Thoth',
  yesod: 'Khonsu',
  malkuth: 'Bastet',
};
