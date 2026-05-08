/**
 * Chesed encounter track — blue, love, abundance, generosity. Warm,
 * expansive — major arpeggios, lush detuned saw pads, generous tail.
 *
 * Per #528 spec: "Warm, expansive — major arpeggios, lush detuned saw
 * pads, generous tail. 'Welcome' feel."
 */

import {
  buildEncounterTrack,
  DEFAULT_CROSSFADE_SEC,
  DEFAULT_DURATION_SEC,
  DEFAULT_QA_GATES,
  DEFAULT_SAMPLE_RATE,
  DEFAULT_WARMUP_SEC,
} from './lib/encounter-stack';

// C major — open, welcoming. Mid-low tonic.
const C2 = 65.41;
const C4 = 261.63;
const E4 = 329.63;
const G4 = 392.0;
const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;

export const encounterChesed = buildEncounterTrack({
  name: 'encounter-chesed',
  durationSec: DEFAULT_DURATION_SEC,
  crossfadeSec: DEFAULT_CROSSFADE_SEC,
  warmupSec: DEFAULT_WARMUP_SEC,
  sampleRate: DEFAULT_SAMPLE_RATE,
  seed: 0x40404040,

  // No drone — C2 saw bed removed. The 6-voice C major triad pad
  // (across two octaves) carries the warmth; the major arpeggio
  // events + arch melody do the giving.

  // C major triad spanning two octaves — pure major, no chromatic colour.
  pad: {
    pitchesHz: [C4, E4, G4, C5, E5, G5],
    chorusCents: 4,
    amCycles: 3,
    gain: 0.026,
    pans: [-0.4, -0.15, 0.15, 0.4, -0.25, 0.25],
  },

  // Major-arpeggio KS plucks — C-E-G drawn at random, like a harp giving.
  events: {
    kind: 'ksPluck',
    pitchesHz: [C5, E5, G5, C5 * 2],
    avgIntervalSec: 7, // generous — Chesed gives often
    jitterSec: 2,
    panRange: 0.6,
    decaySec: 0.7,
    gain: 0.09,
    tailSafetySec: 8,
    ksDecayCoef: 0.999,
  },

  // Generous arch motif — G4 → C5 → E5 → G5 → E5 → C5. Major triad
  // ascending and back down (give and recede). Plays twice for warmth.
  melody: {
    notes: [
      { pitchHz: G4, durationSec: 0.6 },
      { pitchHz: C5, durationSec: 0.6 },
      { pitchHz: E5, durationSec: 0.6 },
      { pitchHz: G5, durationSec: 1.0 },
      { pitchHz: E5, durationSec: 0.6 },
      { pitchHz: C5, durationSec: 1.4 },
    ],
    startOffsetsLoopSec: [6, 19],
    gain: 0.26,
    decaySec: 0.9,
    pan: 0,
    voice: 'celesta',
    tailSafetySec: 8,
  },

  reverb: {
    tailSec: 7, // generous tail
    wet: 0.42,
  },

  qaGates: { ...DEFAULT_QA_GATES },
});
