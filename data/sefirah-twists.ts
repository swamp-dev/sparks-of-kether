import type { EncounterAvatarKey } from './avatar-names';

/**
 * Per-Sefirah "Twist" banner copy — names the per-Sefirah encounter
 * mechanic in plain language so the player sees the twist *before*
 * staging modifiers (`design/per-sefirah-mechanics.md` § 2.2).
 *
 * Deterministic from `encounter.sefirah`; no per-player variation.
 *
 * Only Sefirot with **shipped** per-Sefirah mechanics get a banner.
 * Today that is **Hod** (Word-Match #353) and **Yesod** (Dream-Peek
 * #354). The other six are tracked under Epic #475; their entries
 * here will be added by the implementing tickets so the banner only
 * lights up once the mechanic is wired through `engine/checks.ts`.
 *
 * Returns `undefined` for any Sefirah without a shipped twist —
 * callers omit the banner entirely.
 */
export const sefirahTwist: Readonly<
  Partial<Record<EncounterAvatarKey, string>>
> = {
  hod: 'Hermes asks: name an arcanum. Match the deck-top, gain the edge.',
  yesod: 'Selene offers: fail here, and a hidden door opens to your sight.',
} as const;
