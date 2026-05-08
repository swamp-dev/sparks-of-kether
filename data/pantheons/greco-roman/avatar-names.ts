import type { AvatarName, EncounterAvatarKey } from '../types';

/**
 * Per-Sefirah avatar names for the Greco-Roman pantheon — Greek
 * (primary) and Roman (secondary).
 *
 * Source: `design/avatars.md` § 1 "Avatar mapping (locked)". The
 * Greek name is rendered in the EncounterScreen verdict line and the
 * codex Voice row; the Roman name is preserved for surfaces that
 * want the alternate cultural form (Epic #293 — see
 * `design/avatars.md` § 6).
 *
 * Phase B2 (#552) renamed `AvatarName` fields from `greek/roman` to
 * `primary/secondary` to stay pantheon-neutral. The greco-roman
 * binding holds — `primary === greek`, `secondary === roman` — so
 * every consumer that read `.greek` reads the same string from
 * `.primary` after the rename.
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
  chokmah: { primary: 'Athena', secondary: 'Minerva' },
  binah: { primary: 'Demeter', secondary: 'Ceres' },
  chesed: { primary: 'Zeus', secondary: 'Jupiter' },
  gevurah: { primary: 'Ares', secondary: 'Mars' },
  tiferet: { primary: 'Apollo', secondary: 'Sol' },
  netzach: { primary: 'Aphrodite', secondary: 'Venus' },
  hod: { primary: 'Hermes', secondary: 'Mercury' },
  yesod: { primary: 'Selene', secondary: 'Luna' },
} as const;
