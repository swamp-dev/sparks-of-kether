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

export type SoundCue =
  | 'spark-collected'
  | 'illumination-up'
  | 'separation-up'
  | 'shell-awakened'
  | 'shell-banished'
  | 'card-drawn'
  | 'encounter-pass'
  | 'encounter-fail';

export const CUE_FILES: Readonly<Record<SoundCue, string>> = {
  'spark-collected': '/audio/chime.spark-collected.mp3',
  'illumination-up': '/audio/chime.illumination-up.mp3',
  'separation-up': '/audio/hum.separation-up.mp3',
  'shell-awakened': '/audio/crackle.shell-awakened.mp3',
  'shell-banished': '/audio/seal.shell-banished.mp3',
  'card-drawn': '/audio/flip.card-drawn.mp3',
  'encounter-pass': '/audio/chime.encounter-pass.mp3',
  'encounter-fail': '/audio/tone.encounter-fail.mp3',
};
