import type { AvatarName, EncounterAvatarKey } from '../types';

/**
 * Per-Sefirah avatar names for the Egyptian pantheon. `primary` is
 * the canonical English / Greek-form name (Thoth, Osiris, Hathor,
 * …) — what gets rendered in the EncounterScreen and codex pages.
 * `secondary` is the older Egyptian-language form where one is
 * meaningful and well-attested (Djehuti, Wesir, Het-Heru, …) and is
 * omitted otherwise.
 *
 * Source: `reference/pantheons/egyptian.md` § 1 "Mapping table"
 * (#551).
 *
 * Notes on omitted keys:
 *   - **Kether**: "the team becomes the avatar" — collective Final
 *     Threshold (#285), not a single deity. Excluded by the
 *     `EncounterAvatarKey` narrow union, same as the Greco-Roman
 *     pantheon.
 *   - **Malkuth (Bastet)**: Bastet is a *companion*, not an encounter
 *     avatar — same role Hestia plays in the Greco-Roman pantheon.
 *     Her name surfaces in the codex (`sefirahCodexAvatar.malkuth`)
 *     but not here.
 */
export const avatarNames: Readonly<Record<EncounterAvatarKey, AvatarName>> = {
  // No clean older Egyptian-language form for Amun in modern English —
  // the consonantal root `Imn` (per `reference/pantheons/egyptian.md`
  // § 5) appears only in transliteration, and the syncretic `Amun-Ra`
  // is *newer*, not older. Leaving `secondary` unset is honest.
  chokmah: { primary: 'Amun' },
  binah: { primary: 'Isis', secondary: 'Aset' },
  chesed: { primary: 'Ra', secondary: 'Re' },
  gevurah: { primary: 'Horus', secondary: 'Heru' },
  tiferet: { primary: 'Osiris', secondary: 'Wesir' },
  netzach: { primary: 'Hathor', secondary: 'Het-Heru' },
  hod: { primary: 'Thoth', secondary: 'Djehuti' },
  yesod: { primary: 'Khonsu', secondary: 'Khons' },
} as const;
