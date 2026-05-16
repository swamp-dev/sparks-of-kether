/**
 * Play track — meditative home. The Tree of Life. Players spend most
 * of their session here, so the track has to be **non-fatiguing on
 * loop**: warm, expansive, contemplative.
 *
 * Vibe references: Hollow Knight overworld, Hildegard Westerkamp
 * soundscapes, Brian Eno *Ambient 1*.
 *
 * Synthesis program (current — drone removed per user feedback that
 * the constant saw bed read as unpleasant):
 *
 *   - Soft pad: six detuned sawtooths forming a Cm9 voicing
 *     (C-Eb-G-Bb-D), super-soft, lowpass @ 600 Hz. This is the
 *     sustained bottom layer.
 *   - Celesta motif: 8-note Cm9-themed phrase (G4 → B♭4 → D5 → G5
 *     → F5 → D5 → B♭4 → G4) playing 3 times across the 120 s loop
 *     with a slight L→C→R stereo drift. The melodic carrier.
 *   - Harp / bell flourishes: Karplus-Strong plucks at C5/E♭5/G5/B♭5,
 *     fired very sparsely (every 18-25 s, random) at low velocity.
 *     Panned random ±0.5.
 *   - Reverb: massive cathedral — 6 s tail, 40 % wet.
 *   - Length: 120 s.
 *   - Loop seam: 6 s crossfade. Ensure no plucks in the last 8 s.
 *
 * **Removed layer (kept here for context):** the original spec
 * called for a three-octave detuned-saw cello drone (C2 + C3 + C4)
 * with LFO-modulated lowpass and tremolo. Removed in commit
 * 10f554d; the synth code that produced it was deleted alongside.
 */

import {
  expDecay,
  ksPluck,
  makePrng,
  onePoleLowpass,
  pan,
  sawtoothPolyBlep,
  schroederReverb,
  sineOsc,
} from '../lib/synth';
import type { StereoBuffer } from '../lib/wav';
import type { TrackManifest } from './lobby';

// Cm9: C-Eb-G-Bb-D. Tonic on C in the bass octave.
const C3 = 130.81;
const C4 = 261.63;
const C5 = 523.25;
const EB5 = 622.25;
const F5 = 698.46;
const G5 = 783.99;
const BB5 = 932.33;
const EB3 = 155.56;
const G3 = 196.0;
const BB3 = 233.08;
const D4 = 293.66;
const G4 = 392.0;
const BB4 = 466.16;
const D5 = 587.33;

const DURATION_SEC = 120;
const SAMPLE_RATE = 44100;
const CROSSFADE_SEC = 6;
const WARMUP_SEC = 12;
const SEED = 0xc0c0c0c0;

const LOOP_SPAN_SEC = DURATION_SEC - CROSSFADE_SEC; // 114 s

function freqWithIntegerCycles(targetHz: number, durationSec: number): number {
  return Math.round(targetHz * durationSec) / durationSec;
}

const padFreqs = [C3, EB3, G3, BB3, D4, C4].map((f) => freqWithIntegerCycles(f, LOOP_SPAN_SEC));

export const play: TrackManifest = {
  name: 'play',
  durationSec: DURATION_SEC,
  sampleRate: SAMPLE_RATE,
  seed: SEED,
  qaGates: {
    crossfadeSec: CROSSFADE_SEC,
    minLoopSeam: 0.85,
    minLufs: -24,
    maxLufs: -16,
    maxPeakDbfs: -1,
    maxSilenceSec: 2,
    maxBytes: 2 * 1024 * 1024,
  },
  render(): StereoBuffer {
    const sr = SAMPLE_RATE;
    const N = sr * DURATION_SEC;
    const W = sr * WARMUP_SEC;
    const M = Math.floor(CROSSFADE_SEC * sr);
    const totalSamples = W + N;

    /* ----- Cello-ish drone (REMOVED) ---------------------------- */
    // The constant three-octave detuned-saw bed read as unpleasant
    // on a track players hear for most of their session. The Cm9
    // pad below (sustained but soft and lowpass-rolled) is now the
    // bottom layer; the celesta motif and harp plucks carry the
    // melodic interest.

    /* ----- Soft pad (Cm9 voicing) -------------------------------- */
    // Six layered saws forming Cm9. Bandwidth-limit by lowpassing each
    // pair (instead of one wide LP across the whole pad) — gives a
    // smoother "warm string section" timbre than a single shared LP.

    const padOscs = padFreqs.map((f) => sawtoothPolyBlep(f, sr));
    const padLp = onePoleLowpass(600, sr);
    const padGain = 0.03;

    const padBuffer = new Float32Array(totalSamples);
    for (let i = 0; i < totalSamples; i++) {
      let s = 0;
      for (let v = 0; v < padOscs.length; v++) s += padOscs[v]!() * (1 / padOscs.length);
      padBuffer[i] = padLp.process(s) * padGain;
    }

    /* ----- Harp / bell flourishes (KS plucks) -------------------- */

    const KS_DECAY_COEF = 0.9985;
    const KS_GAIN = 0.13;
    const pluckPitches = [C5, EB5, G5, BB5];
    const earliestPluckSec = WARMUP_SEC + CROSSFADE_SEC + 4;
    // Pluck audible tail ≈ 1.5 s (KS) + 6 s reverb = 7.5 s. Forbid
    // plucks whose tail crosses into the tail crossfade region.
    const PLUCK_TAIL_SEC = 8;
    const latestPluckSec = WARMUP_SEC + DURATION_SEC - CROSSFADE_SEC - PLUCK_TAIL_SEC;

    const rng = makePrng(SEED);
    type Pluck = { startSample: number; pitchHz: number; panPos: number };
    const plucks: Pluck[] = [];
    let nextPluckSec = earliestPluckSec;
    while (true) {
      // Average 21.5 s, ±3.5 s jitter (uniform). 18-25 s window per spec.
      const interval = 21.5 + (rng() * 2 - 1) * 3.5;
      nextPluckSec += interval;
      if (nextPluckSec >= latestPluckSec) break;
      const pitchHz = pluckPitches[Math.floor(rng() * pluckPitches.length)] ?? C5;
      const panPos = (rng() * 2 - 1) * 0.5;
      plucks.push({
        startSample: Math.floor(nextPluckSec * sr),
        pitchHz,
        panPos,
      });
    }

    const pluckLeft = new Float32Array(totalSamples);
    const pluckRight = new Float32Array(totalSamples);
    for (const ev of plucks) {
      const ks = ksPluck(ev.pitchHz, sr, makePrng(SEED ^ ev.startSample), KS_DECAY_COEF);
      const env = expDecay(0.8, sr);
      const renderLen = Math.min(totalSamples - ev.startSample, Math.floor(sr * 1.5));
      for (let i = 0; i < renderLen; i++) {
        const s = ks() * env() * KS_GAIN;
        const { left: l, right: r } = pan(s, ev.panPos);
        pluckLeft[ev.startSample + i]! += l;
        pluckRight[ev.startSample + i]! += r;
      }
    }

    /* ----- Melodic motif (celesta) ------------------------------- */
    // Cm9-themed phrase. Players spend most of the session here, so
    // the motif is gentle and asymmetric — moves enough to be tuneful
    // without becoming an earworm. Plays three times across the 120 s
    // loop with long contemplative gaps. Same celesta voice (sine +
    // 3rd harmonic + slight detune shimmer) as the lobby track's
    // twinkle layer.

    type MelodyNote = { pitchHz: number; durationSec: number };
    const motif: MelodyNote[] = [
      { pitchHz: G4, durationSec: 1.5 },
      { pitchHz: BB4, durationSec: 1.5 },
      { pitchHz: D5, durationSec: 1.5 },
      { pitchHz: G5, durationSec: 2.5 },
      { pitchHz: F5, durationSec: 1.5 },
      { pitchHz: D5, durationSec: 1.5 },
      { pitchHz: BB4, durationSec: 1.5 },
      { pitchHz: G4, durationSec: 3.5 },
    ];
    const melodyDecaySec = 1.6;
    const melodyGain = 0.2;
    // Three passes across 120 s. Each motif = 15 s; tail per note =
    // decay × 5 + reverb tailSec = 1.6 × 5 + 6 = 14 s. Latest safe
    // loop-time start = 120 − 6 (xfade) − 15 (motif) − 14 (tail) =
    // 85. The 75 s pass ends decay at 75 + 15 + 14 = 104, well
    // before the 114 s seam.
    const melodyStartsLoopSec = [12, 45, 75];

    const melodyLeft = new Float32Array(totalSamples);
    const melodyRight = new Float32Array(totalSamples);
    melodyStartsLoopSec.forEach((loopStartSec, passIndex) => {
      let cursor = Math.floor((WARMUP_SEC + loopStartSec) * sr);
      // Slow stereo drift across the three passes — slight L,
      // centred, slight R — so the phrase feels like it walks
      // across the stereo field. Computed once per pass, not
      // per sample.
      const panPos = (passIndex - 1) * 0.15;
      for (const note of motif) {
        const fund = sineOsc(note.pitchHz, sr);
        const harm = sineOsc(note.pitchHz * 3, sr);
        const shimmer = sineOsc(note.pitchHz * 1.001, sr);
        const env = expDecay(melodyDecaySec, sr);
        const renderLen = Math.min(totalSamples - cursor, Math.floor(sr * melodyDecaySec * 5));
        for (let i = 0; i < renderLen; i++) {
          const e = env();
          const v = (fund() * 0.55 + harm() * 0.15 + shimmer() * 0.25) * e * melodyGain;
          const { left: l, right: r } = pan(v, panPos);
          melodyLeft[cursor + i]! += l;
          melodyRight[cursor + i]! += r;
        }
        cursor += Math.floor(note.durationSec * sr);
      }
    });

    /* ----- Mix + reverb (cathedral) ------------------------------ */

    const verb = schroederReverb({ tailSec: 6, wet: 0.4, sampleRate: sr });
    const wetLeft = new Float32Array(totalSamples);
    const wetRight = new Float32Array(totalSamples);
    for (let i = 0; i < totalSamples; i++) {
      const dryL = (padBuffer[i] ?? 0) + (pluckLeft[i] ?? 0) + (melodyLeft[i] ?? 0);
      const dryR = (padBuffer[i] ?? 0) + (pluckRight[i] ?? 0) + (melodyRight[i] ?? 0);
      const [l, r] = verb.process(dryL, dryR);
      wetLeft[i] = l;
      wetRight[i] = r;
    }

    /* ----- Extract loop content + crossfade ---------------------- */

    const left = new Float32Array(N);
    const right = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      left[i] = wetLeft[W + i] ?? 0;
      right[i] = wetRight[W + i] ?? 0;
    }
    for (let i = 0; i < M; i++) {
      const tailIdx = N - M + i;
      const alpha = i / M;
      left[tailIdx] = (left[tailIdx] ?? 0) * (1 - alpha) + (left[i] ?? 0) * alpha;
      right[tailIdx] = (right[tailIdx] ?? 0) * (1 - alpha) + (right[i] ?? 0) * alpha;
    }

    return { left, right, sampleRate: sr };
  },
};
