/**
 * Gevurah encounter track — red, discipline, judgment, sacred No.
 * Tight, severe — short envelopes, dissonant intervals (tritone),
 * no reverb wash. "Tension" feel.
 */

import {
  buildEncounterTrack,
  DEFAULT_CROSSFADE_SEC,
  DEFAULT_DURATION_SEC,
  DEFAULT_QA_GATES,
  DEFAULT_SAMPLE_RATE,
  DEFAULT_WARMUP_SEC,
} from './lib/encounter-stack';

// F# tonic — sharp, edged. Tritone interval against C in the strike
// pool. Square waves for severity.
const F_SHARP_2 = 92.5;
const C5 = 523.25;
const F_SHARP_5 = 739.99;
const C6 = 1046.5;
const F_SHARP_6 = 1479.98;

export const encounterGevurah = buildEncounterTrack({
  name: 'encounter-gevurah',
  durationSec: DEFAULT_DURATION_SEC,
  crossfadeSec: DEFAULT_CROSSFADE_SEC,
  warmupSec: DEFAULT_WARMUP_SEC,
  sampleRate: DEFAULT_SAMPLE_RATE,
  seed: 0x50505050,

  // No drone, no pad. Gevurah is BARE — only strikes, melody, and
  // the briefest reverb. That's the energy: a sword unsheathed,
  // judgment delivered, no comforting wash. The tritone hits in
  // both events and melody carry all the harmonic information.

  events: {
    kind: 'fmStrike',
    pitchesHz: [C5, F_SHARP_5, C6, F_SHARP_6], // tritone pairs
    avgIntervalSec: 5.5,
    jitterSec: 0.8,
    panRange: 0.3, // narrower stage
    decaySec: 0.25,
    gain: 0.22,
    tailSafetySec: 3,
    fmModRatio: 3,
    fmModIndex: 5,
    isStrike: true,
  },

  // Stark tritone ostinato — F#5 ↔ C6, alternating. Severe, decisive,
  // a march of sacred No. FM bell voice for cutting clarity.
  melody: {
    notes: [
      { pitchHz: F_SHARP_5, durationSec: 0.45 },
      { pitchHz: C6, durationSec: 0.45 },
      { pitchHz: F_SHARP_5, durationSec: 0.45 },
      { pitchHz: C6, durationSec: 0.45 },
      { pitchHz: F_SHARP_5, durationSec: 0.9 },
    ],
    startOffsetsLoopSec: [8, 22],
    gain: 0.28,
    decaySec: 0.35,
    pan: 0,
    voice: 'fmBell',
    fmModRatio: 2,
    fmModIndex: 3,
    tailSafetySec: 3,
  },

  reverb: {
    tailSec: 0.6, // essentially dry
    wet: 0.10,
  },

  qaGates: {
    ...DEFAULT_QA_GATES,
    // No pad → head and tail are near-silent → Pearson is meaningless.
    minLoopSeam: 0,
  },
});
