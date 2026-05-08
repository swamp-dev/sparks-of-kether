/**
 * Tiferet encounter track — gold, harmony, balance, compassion. The
 * centre of the Tree. Lyrical celesta + drone, mid-register, balanced
 * wet/dry. The "reference" track of the set.
 *
 * Per #528 spec: "Centred, warm major — lyrical celesta + drone,
 * mid-register, balanced wet/dry. The 'reference' track of the set."
 */

import {
  buildEncounterTrack,
  DEFAULT_CROSSFADE_SEC,
  DEFAULT_DURATION_SEC,
  DEFAULT_QA_GATES,
  DEFAULT_SAMPLE_RATE,
  DEFAULT_WARMUP_SEC,
} from './lib/encounter-stack';

// C major — the "centre" key in Western theory (no sharps or flats),
// the traditional Hermetic correspondence for the Sun/Sol/Apollo/heart.
// Tiferet sits at the heart of the Tree; the most lyrical, songful
// track of the set. C2 is mid-low.
const C2 = 65.41;
const C4 = 261.63;
const E4 = 329.63;
const G4 = 392.0;
const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;

export const encounterTiferet = buildEncounterTrack({
  name: 'encounter-tiferet',
  durationSec: DEFAULT_DURATION_SEC,
  crossfadeSec: DEFAULT_CROSSFADE_SEC,
  warmupSec: DEFAULT_WARMUP_SEC,
  sampleRate: DEFAULT_SAMPLE_RATE,
  seed: 0x60606060,

  // No drone — C2 saw bed removed. The C major pad (4 voices around
  // C4-E4-G4-C5) breathes underneath; lyrical celesta + arch melody
  // carry the heart-centre.

  // C major triad pad — pure, centred, no chromatic colour.
  pad: {
    pitchesHz: [C4, E4, G4, C5],
    chorusCents: 4,
    amCycles: 3,
    gain: 0.060,
    pans: [-0.3, 0.3, -0.15, 0.15],
  },

  // Lyrical celesta KS plucks — sparse accents around the melody.
  events: {
    kind: 'ksPluck',
    pitchesHz: [C5, E5, G5, C6],
    avgIntervalSec: 9,
    jitterSec: 2.5,
    panRange: 0.5,
    decaySec: 0.6,
    gain: 0.22,
    tailSafetySec: 7,
    ksDecayCoef: 0.998,
  },

  // C major lyrical arch — G4 → C5 → E5 → G5 → C6 → G5 → E5 → C5.
  // The most clearly songful melody of the set; sounds like a heart
  // opening up to its peak octave then resolving home. Tiferet is
  // the "reference" track — every other Sefirah's mood is read
  // against the warmth and centeredness of this one.
  melody: {
    notes: [
      { pitchHz: G4, durationSec: 0.55 },
      { pitchHz: C5, durationSec: 0.55 },
      { pitchHz: E5, durationSec: 0.55 },
      { pitchHz: G5, durationSec: 0.7 },
      { pitchHz: C6, durationSec: 1.0 },
      { pitchHz: G5, durationSec: 0.55 },
      { pitchHz: E5, durationSec: 0.55 },
      { pitchHz: C5, durationSec: 1.6 },
    ],
    startOffsetsLoopSec: [6, 19],
    gain: 0.28,
    decaySec: 0.85,
    pan: 0,
    voice: 'celesta',
    tailSafetySec: 7,
  },

  reverb: {
    tailSec: 4, // balanced like lobby
    wet: 0.32,
  },

  qaGates: { ...DEFAULT_QA_GATES },
});
