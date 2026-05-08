/**
 * Hod encounter track — orange, intellect, language, logic, precision.
 * Crystalline, geometric — repeating pulses, rhythmic, quantised
 * attacks. The most "music-box"-like of the set.
 */

import {
  buildEncounterTrack,
  DEFAULT_CROSSFADE_SEC,
  DEFAULT_DURATION_SEC,
  DEFAULT_QA_GATES,
  DEFAULT_SAMPLE_RATE,
  DEFAULT_WARMUP_SEC,
} from './lib/encounter-stack';

// D major — Mercury's bright, geometric, "fast scales" feel. The
// triad D-F♯-A glints rather than mourns; the music-box motif and
// dense pulses give the track its clockwork rhythm. (Replaces the
// earlier D minor draft, which felt analytical-but-cold; D major
// keeps the analytical and adds the Mercury glint.)
const D2 = 73.42;
const A4 = 440;
const D5 = 587.33;
const F_SHARP_5 = 739.99;
const A5 = 880;
const D6 = 1174.66;
const F_SHARP_6 = 1479.98;
const A6 = 1760;

export const encounterHod = buildEncounterTrack({
  name: 'encounter-hod',
  durationSec: DEFAULT_DURATION_SEC,
  crossfadeSec: DEFAULT_CROSSFADE_SEC,
  warmupSec: DEFAULT_WARMUP_SEC,
  sampleRate: DEFAULT_SAMPLE_RATE,
  seed: 0x80808080,

  // No drone, no pad. Hod is purely rhythmic — the music-box pulses
  // and the geometric melody ARE the music. A constant sustained
  // background would dilute the clockwork precision.

  // Crystalline music-box pulses. Strict rhythm — quantised attacks
  // (low jitter), bright FM bell timbre, sparser now so the geometric
  // melody underneath reads cleanly.
  events: {
    kind: 'fmBell',
    pitchesHz: [D5, F_SHARP_5, A5, D6, F_SHARP_6, A6],
    avgIntervalSec: 4, // looser — leaves space for the melody
    jitterSec: 0.3, // low jitter — geometric / quantised
    panRange: 0.5,
    decaySec: 0.5,
    gain: 0.14,
    tailSafetySec: 3,
    fmModRatio: 2.01, // very slightly inharmonic — music-box bite
    fmModIndex: 1.5,
  },

  // Geometric music-box motif — D5 → F♯5 → A5 → D6 → A5 → F♯5 →
  // D5 → A4. Mirror-symmetric, quantised, like a music-box
  // pin-pattern. D major triad ascending and back. Plays twice
  // with tight rhythm.
  melody: {
    notes: [
      { pitchHz: D5, durationSec: 0.3 },
      { pitchHz: F_SHARP_5, durationSec: 0.3 },
      { pitchHz: A5, durationSec: 0.3 },
      { pitchHz: D6, durationSec: 0.6 },
      { pitchHz: A5, durationSec: 0.3 },
      { pitchHz: F_SHARP_5, durationSec: 0.3 },
      { pitchHz: D5, durationSec: 0.3 },
      { pitchHz: A4, durationSec: 0.9 },
    ],
    startOffsetsLoopSec: [6, 19],
    gain: 0.28,
    decaySec: 0.45,
    pan: 0,
    voice: 'fmBell',
    fmModRatio: 2.01,
    fmModIndex: 1.5,
    tailSafetySec: 3,
  },

  reverb: {
    tailSec: 1.6, // shorter — clarity over wash
    wet: 0.22, // dry-ish — crystalline
  },

  qaGates: {
    ...DEFAULT_QA_GATES,
    // No pad → head and tail are near-silent → Pearson is meaningless.
    minLoopSeam: 0,
  },
});
