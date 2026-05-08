import type { AvatarName, EncounterAvatarKey } from '../types';

/**
 * Per-Sefirah avatar names — Greek (primary) and Roman (secondary).
 *
 * Source: `design/avatars.md` § 1 "Avatar mapping (locked)". The Greek
 * name is rendered in the EncounterScreen verdict line for MVP; the
 * Roman name is preserved for future pantheon-rotation work (Epic
 * #293 — see `design/avatars.md` § 6).
 *
 * Notes on omitted keys:
 *   - **Kether**: "the team becomes the avatar" — collective Final
 *     Threshold (#285), not a single deity. Excluded by the
 *     `EncounterAvatarKey` narrow union.
 *   - **Malkuth (Hestia)**: Hestia is a *companion*, not an encounter
 *     avatar. Her lines surface at different game moments (start /
 *     rest / homecoming) with a different matrix shape. Out of scope
 *     for the encounter-screen wire-up; tracked separately.
 */
export const avatarNames: Readonly<Record<EncounterAvatarKey, AvatarName>> = {
  chokmah: { greek: 'Athena', roman: 'Minerva' },
  binah: { greek: 'Demeter', roman: 'Ceres' },
  chesed: { greek: 'Zeus', roman: 'Jupiter' },
  gevurah: { greek: 'Ares', roman: 'Mars' },
  tiferet: { greek: 'Apollo', roman: 'Sol' },
  netzach: { greek: 'Aphrodite', roman: 'Venus' },
  hod: { greek: 'Hermes', roman: 'Mercury' },
  yesod: { greek: 'Selene', roman: 'Luna' },
} as const;
