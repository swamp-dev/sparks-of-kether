/**
 * Pantheon registry types — shared shape for any avatar pantheon.
 *
 * Phase A1 of Epic #293 (#547). The avatar layer is pluggable by
 * pantheon: each pantheon supplies a full set of per-Sefirah
 * content (avatar names, codex avatar, framing, verdicts, blessings).
 * The MVP ships only `'greco-roman'`; subsequent pantheons (e.g.
 * Egyptian, Phase B) plug into the same shape.
 *
 * Source-of-truth contract: `design/avatars.md` § 6
 * ("pantheon-rotation architecture").
 */

import type { EncounterAvatarKey, SefirahKey } from '../types';
import type { SefirahBlessingMatrix } from '../sefirah-blessings';
import type { VerdictMatrix } from '../sefirah-verdicts';
import type { FramingMatrix } from '../sefirah-framing';

/**
 * Identifier for a single pantheon in the registry. Extensible union —
 * adding a pantheon means widening this type AND adding a matching
 * entry to the `pantheons` registry in `./index.ts` (TypeScript will
 * complain at compile time if the two drift, since the registry is
 * typed `Readonly<Record<PantheonId, Pantheon>>`). `'greco-roman'`
 * is the MVP entry.
 */
export type PantheonId = 'greco-roman';

// Re-export `EncounterAvatarKey` from its canonical home in `data/types.ts`
// so callers reading "pantheon types" still find it here.
export type { EncounterAvatarKey };

/**
 * Two cultural names for the same avatar. The Greek name is rendered
 * in the EncounterScreen verdict line for MVP; the Roman name is
 * preserved for future pantheon-rotation work. Other pantheons may
 * not have this primary/secondary split — if not, the same string
 * may appear in both fields, or the shape may evolve in a follow-up.
 */
export interface AvatarName {
  readonly greek: string;
  readonly roman: string;
}

/**
 * A single pantheon. Phase A1 wires `sefirahFraming`, `sefirahVerdicts`,
 * and `sefirahBlessings` as references to the existing top-level
 * exports — A4 (#550) moves the data into per-pantheon files.
 */
export interface Pantheon {
  readonly id: PantheonId;
  readonly displayName: string;
  readonly avatarNames: Readonly<Record<EncounterAvatarKey, AvatarName>>;
  /**
   * Codex "Voice" row per Sefirah. `null` for Kether (collective —
   * "the team becomes the avatar"). Includes Malkuth (Hestia,
   * companion-only — surfaces in the codex even though she's not an
   * encounter avatar).
   */
  readonly sefirahCodexAvatar: Readonly<Record<SefirahKey, string | null>>;
  readonly sefirahFraming: FramingMatrix;
  readonly sefirahVerdicts: VerdictMatrix;
  readonly sefirahBlessings: SefirahBlessingMatrix;
}
