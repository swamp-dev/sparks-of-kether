/**
 * Pantheon registry — Phase A1 of Epic #293 (#547). Phase B2 (#552)
 * registered the Egyptian pantheon.
 *
 * Lookup by `PantheonId` returns the corresponding `Pantheon` (full
 * per-Sefirah content). Adding a future pantheon means widening the
 * `PantheonId` union in `./types.ts` and adding a registry entry
 * here; TypeScript catches drift via `Record<PantheonId, Pantheon>`.
 */

import { grecoRoman } from './greco-roman';
import { egyptian } from './egyptian';
import type { Pantheon, PantheonId } from './types';

export type { AvatarName, EncounterAvatarKey, Pantheon, PantheonId } from './types';

export const pantheons: Readonly<Record<PantheonId, Pantheon>> = {
  'greco-roman': grecoRoman,
  egyptian,
};
