/**
 * Chokmah encounter track — gray, raw creative flash, first impulse.
 * Sharp, percussive — short FM strikes scattered against a thin drone.
 * "Lightning" feel.
 *
 * Per #528 spec: "Sharp, percussive — short FM strikes scattered
 * against a thin drone."
 */

import {
  buildEncounterTrack,
  DEFAULT_CROSSFADE_SEC,
  DEFAULT_DURATION_SEC,
  DEFAULT_QA_GATES,
  DEFAULT_SAMPLE_RATE,
  DEFAULT_WARMUP_SEC,
} from './lib/encounter-stack';

// G2 — gray/iridescent, slightly dissonant against the dominant.
// Strikes drawn from a wide cluster (G/Bb/D/F#) — the F# is the
// "lightning" — a tritone above the C tonic of the strike pool, just
// outside the implied G minor.
const G2 = 98;
const G5 = 783.99;
const BB5 = 932.33;
const D6 = 1174.66;
const F_SHARP_6 = 1479.98;

export const encounterChokmah = buildEncounterTrack({
  name: 'encounter-chokmah',
  durationSec: DEFAULT_DURATION_SEC,
  crossfadeSec: DEFAULT_CROSSFADE_SEC,
  warmupSec: DEFAULT_WARMUP_SEC,
  sampleRate: DEFAULT_SAMPLE_RATE,
  seed: 0x20202020,

  // No drone — the constant G2 saw read as unpleasant against the
  // strikes. The dense FM strike pulses + lightning hook now stand
  // alone against the dry reverb. Chokmah's "raw flash" energy is
  // arguably MORE present without a continuous bed underneath.

  // Sharp FM strikes — short envelope, percussive. Sparser now so the
  // melodic hook reads through.
  events: {
    kind: 'fmStrike',
    pitchesHz: [G5, BB5, D6, F_SHARP_6],
    avgIntervalSec: 7,
    jitterSec: 1.5,
    panRange: 0.7, // wide
    decaySec: 0.4, // very short — strike, not bell
    gain: 0.30,
    tailSafetySec: 4,
    fmModRatio: 2,
    fmModIndex: 4,
    isStrike: true,
  },

  // 4-note ascending hook — G5 → D6 → F#6 → D6 — the "lightning"
  // pattern. FM bell voice for crispness; plays once mid-loop.
  melody: {
    notes: [
      { pitchHz: G5, durationSec: 0.5 },
      { pitchHz: D6, durationSec: 0.5 },
      { pitchHz: F_SHARP_6, durationSec: 0.5 },
      { pitchHz: D6, durationSec: 1.0 },
    ],
    startOffsetsLoopSec: [9, 22],
    gain: 0.26,
    decaySec: 0.4,
    pan: 0.1,
    voice: 'fmBell',
    fmModRatio: 2,
    fmModIndex: 2.5,
    tailSafetySec: 4,
  },

  reverb: {
    tailSec: 1,
    wet: 0.18, // dry-ish — strikes need to read as crisp
  },

  qaGates: {
    ...DEFAULT_QA_GATES,
    // No pad → head and tail are near-silent → Pearson is meaningless.
    minLoopSeam: 0,
  },
});
