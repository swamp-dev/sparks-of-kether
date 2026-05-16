/**
 * Netzach encounter track — green, passion, desire, art, nature,
 * endurance. Flowing, melodic — cascading arpeggios.
 *
 * Per #528 spec: "Flowing, melodic — cascading arpeggios, melodic
 * motifs that develop, slight tempo (compared to the others'
 * driftiness)."
 */

import {
  buildEncounterTrack,
  DEFAULT_CROSSFADE_SEC,
  DEFAULT_DURATION_SEC,
  DEFAULT_QA_GATES,
  DEFAULT_SAMPLE_RATE,
  DEFAULT_WARMUP_SEC,
} from './lib/encounter-stack';

// F major — softer and more sensual than G; the Hermetic Venus key.
// Netzach is passion, art, nature — the music should flow rather
// than march. F major sits a whole step lower than G, putting the
// drone in cello range and giving the cascades a velvety quality.
const F2 = 87.31;
const F4 = 349.23;
const A4 = 440.0;
const C5 = 523.25;
const F5 = 698.46;
const A5 = 880.0;
const C6 = 1046.5;
const F6 = 1396.91;

export const encounterNetzach = buildEncounterTrack({
  name: 'encounter-netzach',
  durationSec: DEFAULT_DURATION_SEC,
  crossfadeSec: DEFAULT_CROSSFADE_SEC,
  warmupSec: DEFAULT_WARMUP_SEC,
  sampleRate: DEFAULT_SAMPLE_RATE,
  seed: 0x70707070,

  // No drone — F2 saw bed removed. The F major pad + cascading
  // arpeggios + wave-shaped melody carry the flow. Netzach's energy
  // is movement, not foundation.

  pad: {
    pitchesHz: [F4, A4, C5, F5],
    chorusCents: 4,
    amCycles: 4,
    gain: 0.06,
    pans: [-0.3, 0.0, 0.3, 0.0],
  },

  // Cascading arpeggios — KS plucks at F5/A5/C6/F6 firing densely.
  // Higher density than the contemplative tracks → "flowing, with
  // tempo".
  events: {
    kind: 'ksPluck',
    pitchesHz: [F5, A5, C6, F6],
    avgIntervalSec: 3,
    jitterSec: 0.8,
    panRange: 0.7,
    decaySec: 0.4,
    gain: 0.16,
    tailSafetySec: 4,
    ksDecayCoef: 0.997,
  },

  // Wave-shaped motif — F5 → A5 → C6 → F6 → C6 → A5 → F5 → A5.
  // Climbs to the upper octave and descends in a curving line, like
  // a wave breaking and pulling back. Plays twice with a slight
  // pan shift between passes for stereo motion. F major's softer
  // colour gives the cascade a velvet, sensuous quality vs the
  // brighter G major it replaces.
  melody: {
    notes: [
      { pitchHz: F5, durationSec: 0.4 },
      { pitchHz: A5, durationSec: 0.4 },
      { pitchHz: C6, durationSec: 0.4 },
      { pitchHz: F6, durationSec: 0.7 },
      { pitchHz: C6, durationSec: 0.4 },
      { pitchHz: A5, durationSec: 0.4 },
      { pitchHz: F5, durationSec: 0.4 },
      { pitchHz: A5, durationSec: 0.9 },
    ],
    startOffsetsLoopSec: [5, 19],
    gain: 0.22,
    decaySec: 0.6,
    pan: -0.05,
    voice: 'celesta',
    tailSafetySec: 5,
  },

  reverb: {
    tailSec: 3.5,
    wet: 0.32,
  },

  qaGates: { ...DEFAULT_QA_GATES },
});
