/**
 * Pantheon registry — Phase A1 of Epic #293 (#547).
 *
 * Lookup by `PantheonId` returns the corresponding `Pantheon` (full
 * per-Sefirah content). MVP ships only `'greco-roman'`. Subsequent
 * pantheons (e.g. Egyptian, Phase B) widen `PantheonId` and add an
 * entry here — no consumer code changes needed once A3 (#549) lands.
 */

import { grecoRoman } from './greco-roman';
import type { Pantheon, PantheonId } from './types';

export type { AvatarName, EncounterAvatarKey, Pantheon, PantheonId } from './types';

export const pantheons: Readonly<Record<PantheonId, Pantheon>> = {
  'greco-roman': grecoRoman,
};
