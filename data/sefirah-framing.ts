import type { EncounterAvatarKey } from './avatar-names';

/**
 * Per-Sefirah trial-framing copy — the line the avatar speaks at the
 * top of the encounter prep sub-state, naming the trial before the
 * player stages modifiers.
 *
 * **Placeholder until #478 (B1) lands** — that ticket authors the full
 * sign-aware multi-variant matrix mirroring `data/sefirah-verdicts.ts`.
 * For now we ship one deterministic line per Sefirah authored against
 * the voice guide in `design/avatars.md`. When #478 lands, this file
 * is replaced by the four-dimensional matrix and a `pickFraming` picker.
 *
 * The lines below are intentionally short — staggered word-reveal in
 * #482 (`RevealLine`) wants 8–18 words to read as a beat, not a wall.
 */
export const sefirahFramingPlaceholder: Readonly<
  Record<EncounterAvatarKey, string>
> = {
  chokmah: 'Athena weighs your insight. Strike clean — the spark answers only to a sure mind.',
  binah: 'Demeter remembers every loss. Show patience here, or grief will school you.',
  chesed: 'Zeus opens his hand. Match his abundance, and the path floods with light.',
  gevurah: 'Ares names the cost. Pay in strength, or be sent back the way you came.',
  tiferet: 'Apollo holds the balance. Speak true, and the harmony tilts your way.',
  netzach: 'Aphrodite asks the desire beneath the desire. Want well, and the gate yields.',
  hod: 'Hermes grins. Wit against wit — outflank me, and the road is yours.',
  yesod: 'Selene closes the curtain. Dream past the veil, or wake where you started.',
} as const;
