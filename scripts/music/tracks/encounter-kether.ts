/**
 * Kether encounter track — white, unity, source, pure being. Highest
 * register of the set. Pure sustained sines, no rhythm, very wide
 * reverb.
 *
 * Per #528 spec: "Pure, ethereal — high sustained sines, no rhythm,
 * very wide reverb. Highest register of the set."
 */

import {
  buildEncounterTrack,
  DEFAULT_CROSSFADE_SEC,
  DEFAULT_DURATION_SEC,
  DEFAULT_QA_GATES,
  DEFAULT_SAMPLE_RATE,
  DEFAULT_WARMUP_SEC,
} from './lib/encounter-stack';

// A — keter is "above" — high register. Drone at A4, pad at A5/E6/A6.
const A4 = 440;
const A5 = 880;
const C_SHARP_6 = 1108.73;
const E6 = 1318.51;
const A6 = 1760;

export const encounterKether = buildEncounterTrack({
  name: 'encounter-kether',
  durationSec: DEFAULT_DURATION_SEC,
  crossfadeSec: DEFAULT_CROSSFADE_SEC,
  warmupSec: DEFAULT_WARMUP_SEC,
  sampleRate: DEFAULT_SAMPLE_RATE,
  seed: 0x10101010,

  // No drone — A4 sine bed removed per user feedback. The pad's
  // breathing chord and the hymn motif carry the track.
  // (`drone` slot in the helper is now optional.)

  // Triadic sustained chord A5/C#6/E6/A6 — A major across the upper octave.
  // Wide stereo, slow AM breath.
  pad: {
    pitchesHz: [A5, C_SHARP_6, E6, A6],
    chorusCents: 4, // gentle chorus — adds shimmer without dissonance
    amCycles: 4, // ~0.121 Hz — slow breath
    gain: 0.022,
    pans: [-0.4, -0.15, 0.15, 0.4],
  },

  // Hymn-like ascending motif — A major triad up to A6 then back to E6,
  // sustained. Long notes (Kether is "above time"). Plays once mid-loop.
  melody: {
    notes: [
      { pitchHz: A5, durationSec: 1.6 },
      { pitchHz: C_SHARP_6, durationSec: 1.6 },
      { pitchHz: E6, durationSec: 1.6 },
      { pitchHz: A6, durationSec: 3.2 },
      { pitchHz: E6, durationSec: 3.0 },
    ],
    startOffsetsLoopSec: [12],
    gain: 0.18,
    decaySec: 1.4,
    pan: 0,
    voice: 'celesta',
    tailSafetySec: 8,
  },

  reverb: {
    tailSec: 8,
    wet: 0.55, // very wet — Kether's "everything is one"
  },

  qaGates: { ...DEFAULT_QA_GATES },
});
