/**
 * Binah encounter track — black, form, structure, sorrow. Cosmic
 * mother. Dark, slow, minor, cathedral reverb.
 *
 * Per #528 spec: "Dark, slow, minor — low drones in B♭ minor or
 * similar, very deep cathedral reverb. 'Weight' feel."
 */

import {
  buildEncounterTrack,
  DEFAULT_CROSSFADE_SEC,
  DEFAULT_DURATION_SEC,
  DEFAULT_QA_GATES,
  DEFAULT_SAMPLE_RATE,
  DEFAULT_WARMUP_SEC,
} from './lib/encounter-stack';

// Bb minor — low, heavy. Bb1 is the lowest tonic across the set.
const BB1 = 58.27;
const BB2 = 116.54;
const DB4 = 277.18;
const F4 = 349.23;
const BB4 = 466.16;
const BB3 = 233.08;
const DB5 = 554.37;

export const encounterBinah = buildEncounterTrack({
  name: 'encounter-binah',
  durationSec: DEFAULT_DURATION_SEC,
  crossfadeSec: DEFAULT_CROSSFADE_SEC,
  warmupSec: 10, // longer warmup for the long reverb tail
  sampleRate: DEFAULT_SAMPLE_RATE,
  seed: 0x30303030,

  // No drone — Bb1 saw bed removed. The Bb minor pad still sits low
  // (BB3 root in the chord), the cathedral reverb still gives weight,
  // and the lament motif carries the sorrow.

  // Bb minor triad pad: Db4 / F4 / Bb4 (minor 3rd, perfect 5th, octave).
  // Plus a low BB3 root for harmonic anchoring.
  pad: {
    pitchesHz: [DB4, F4, BB4, BB3],
    chorusCents: 5,
    amCycles: 2, // very slow breath
    gain: 0.014,
    pans: [-0.3, 0.3, 0.0, 0.0],
  },

  // Sparse low FM bell — chimes deep in the cathedral.
  events: {
    kind: 'fmBell',
    pitchesHz: [BB3, DB5],
    avgIntervalSec: 18, // ~1-2 per loop
    jitterSec: 4,
    panRange: 0.4,
    decaySec: 4,
    gain: 0.06,
    tailSafetySec: 14,
    fmModRatio: 1.5,
    fmModIndex: 2,
  },

  // Lament motif — F4 → Db4 → Bb3 → Db4 → F4 (descending pendulum,
  // resolving back up). Slow notes; sorrowful.
  melody: {
    notes: [
      { pitchHz: F4, durationSec: 1.5 },
      { pitchHz: DB4, durationSec: 1.5 },
      { pitchHz: BB3, durationSec: 2.5 },
      { pitchHz: DB4, durationSec: 1.5 },
      { pitchHz: F4, durationSec: 2.5 },
    ],
    startOffsetsLoopSec: [11],
    gain: 0.11,
    decaySec: 1.6,
    pan: -0.1,
    voice: 'celesta',
    tailSafetySec: 10,
  },

  reverb: {
    tailSec: 10, // very long cathedral
    wet: 0.55,
  },

  qaGates: { ...DEFAULT_QA_GATES },
});
