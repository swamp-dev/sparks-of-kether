import type { SefirahKey } from '../../types';

/**
 * Per-Sefirah codex "Voice" row for the greco-roman pantheon.
 *
 * Phase A3 of Epic #293 (#549) inlined these literals here when the
 * `avatar` field was dropped from `SefirahCodexContent`. The codex
 * page now reads this map via the active `Pantheon` from
 * `usePantheon()`, not from a derived field on `sefirahCodex`.
 *
 * Anchors against `design/avatars.md § 1` ("Avatar mapping (locked)"):
 *   - `null` for Kether — the Final Threshold is collective and "the
 *     team becomes the avatar"; no single deity.
 *   - Hestia stays attached to Malkuth even though she's a companion
 *     (the codex still names her on the Sefirah page).
 *   - The other 8 are the same names as in `avatarNames[*].primary` —
 *     listed independently here so the codex map can diverge from the
 *     encounter-avatar names if a future pantheon decides to (e.g. an
 *     alternate companion for Malkuth).
 */
export const sefirahCodexAvatar: Readonly<Record<SefirahKey, string | null>> = {
  kether: null,
  chokmah: 'Athena',
  binah: 'Demeter',
  chesed: 'Zeus',
  gevurah: 'Ares',
  tiferet: 'Apollo',
  netzach: 'Aphrodite',
  hod: 'Hermes',
  yesod: 'Selene',
  malkuth: 'Hestia',
};
