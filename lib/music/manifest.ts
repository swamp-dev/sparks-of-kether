/**
 * Per-Sefirah encounter-track manifest (#527 stub; #526 will replace).
 *
 * The full music engine in #526 reads this file to decide which audio
 * URL to mount when an encounter screen opens. For Sefirot listed
 * here, the engine prefers the per-Sefirah track; for any not listed,
 * it falls back to the generic `encounter` track from #512.
 *
 * #526 has not shipped yet. This stub exists so the per-Sefirah audio
 * files have a typed home in the codebase even before the engine
 * consumes it. When #526 lands, the engine starts reading this map and
 * the entries below become live.
 *
 * Adding a track:
 *   1. Drop the rendered files into `public/audio/encounter-<key>.{mp3,ogg}`.
 *   2. Add the entry below.
 *   3. Document source + license in `assets/audio/LICENSE.md`.
 */

import type { SefirahKey } from '@/data/types';

export const ENCOUNTER_TRACKS: Partial<Record<SefirahKey, string>> = {
  kether: '/audio/encounter-kether.mp3',
  chokmah: '/audio/encounter-chokmah.mp3',
  binah: '/audio/encounter-binah.mp3',
  chesed: '/audio/encounter-chesed.mp3',
  gevurah: '/audio/encounter-gevurah.mp3',
  tiferet: '/audio/encounter-tiferet.mp3',
  netzach: '/audio/encounter-netzach.mp3',
  hod: '/audio/encounter-hod.mp3',
  yesod: '/audio/encounter-yesod.mp3',
  // Malkuth has no encounter (setup-only per design/mechanics.md).
};

export function encounterTrackFor(sefirah: SefirahKey): string {
  return ENCOUNTER_TRACKS[sefirah] ?? '/audio/encounter.mp3';
}
