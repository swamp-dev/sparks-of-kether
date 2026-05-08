/**
 * UI sound cue registry (#321 — Epic #310 phase 6).
 *
 * One cue per gameplay event. Each cue maps to an mp3 served from
 * `/public/audio/`. Files are short (≤2s), tactile, and never musical
 * — sound supports state, never narrates it. License attribution for
 * each file lives in `assets/audio/LICENSE.md`.
 *
 * Adding a cue:
 *   1. Add the literal to `SoundCue`.
 *   2. Add the file path to `CUE_FILES`.
 *   3. Drop the asset into `public/audio/` and document its source +
 *      license in `assets/audio/LICENSE.md`.
 *   4. Wire the call site to `useSound().playSound(<your cue>)`.
 *
 * The const-assertion on `CUE_FILES` plus the `Record<SoundCue, string>`
 * type bound is intentional: a typo in either the cue literal or the
 * file path fails at compile time.
 */

import type { EncounterAvatarKey, SefirahKey } from '@/data/types';
import { pantheons } from '@/data/pantheons';

// Avatar-arrives cue keys are intentionally greco-roman-coupled —
// the cue keys (`avatar-arrives-hermes`, etc.) are baked into the
// `SoundCue` union and `CUE_FILES` map. Re-using the same audio
// regardless of active pantheon means a future Phase B pantheon
// doesn't need to ship its own per-deity audio.
//
// **Phase B requirement** (#293): if an alternate pantheon ships
// per-deity stings (different greek-name → audio mapping), the
// `SoundCue` union and `CUE_FILES` map must be extended FIRST.
// Today this function returns the greco-roman key regardless of the
// active pantheon — silently producing a cue that doesn't exist in
// `CUE_FILES` would fail the lookup at playback time.
const grecoRomanAvatarNames = pantheons['greco-roman'].avatarNames;

export type SoundCue =
  | 'spark-collected'
  | 'illumination-up'
  | 'separation-up'
  | 'shell-awakened'
  | 'shell-banished'
  | 'card-drawn'
  | 'encounter-pass'
  | 'encounter-fail'
  | 'avatar-arrives-athena'
  | 'avatar-arrives-demeter'
  | 'avatar-arrives-zeus'
  | 'avatar-arrives-ares'
  | 'avatar-arrives-apollo'
  | 'avatar-arrives-aphrodite'
  | 'avatar-arrives-hermes'
  | 'avatar-arrives-selene'
  | 'avatar-arrives-hestia';

export const CUE_FILES: Readonly<Record<SoundCue, string>> = {
  'spark-collected': '/audio/chime.spark-collected.mp3',
  'illumination-up': '/audio/chime.illumination-up.mp3',
  'separation-up': '/audio/hum.separation-up.mp3',
  'shell-awakened': '/audio/crackle.shell-awakened.mp3',
  'shell-banished': '/audio/seal.shell-banished.mp3',
  'card-drawn': '/audio/flip.card-drawn.mp3',
  'encounter-pass': '/audio/chime.encounter-pass.mp3',
  'encounter-fail': '/audio/tone.encounter-fail.mp3',
  'avatar-arrives-athena': '/audio/avatar-arrives-athena.mp3',
  'avatar-arrives-demeter': '/audio/avatar-arrives-demeter.mp3',
  'avatar-arrives-zeus': '/audio/avatar-arrives-zeus.mp3',
  'avatar-arrives-ares': '/audio/avatar-arrives-ares.mp3',
  'avatar-arrives-apollo': '/audio/avatar-arrives-apollo.mp3',
  'avatar-arrives-aphrodite': '/audio/avatar-arrives-aphrodite.mp3',
  'avatar-arrives-hermes': '/audio/avatar-arrives-hermes.mp3',
  'avatar-arrives-selene': '/audio/avatar-arrives-selene.mp3',
  'avatar-arrives-hestia': '/audio/avatar-arrives-hestia.mp3',
};

/**
 * Map a Sefirah key to its avatar's arrival sting cue (#484).
 *
 * Each avatar (Athena/Demeter/Zeus/Ares/Apollo/Aphrodite/Hermes/Selene)
 * has a unique sting that fires when the avatar emerges in the
 * EncounterScreen prep sub-state. The mapping uses Greek-name-based
 * cue keys so adding a future avatar pantheon (#293) doesn't require
 * renaming every per-Sefirah cue.
 *
 * Returns `null` for Sefirot without an encounter avatar (Kether is
 * collective; Malkuth has Hestia as a companion, not an encounter
 * avatar — though the Hestia sting is wired and available for future
 * Hestia moments per `design/avatars.md`).
 */
export function avatarArrivesCueFor(sefirah: SefirahKey): SoundCue | null {
  if (sefirah === 'kether') return null;
  if (sefirah === 'malkuth') return 'avatar-arrives-hestia';
  const greek = grecoRomanAvatarNames[sefirah as EncounterAvatarKey].greek.toLowerCase();
  return `avatar-arrives-${greek}` as SoundCue;
}
