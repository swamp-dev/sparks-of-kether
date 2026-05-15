/**
 * Blessing track — gentle catharsis. The Sefirah grants a blessing.
 * Softest of the four route tracks. Resolution, warmth.
 *
 * Vibe references: Arvo Pärt *Spiegel im Spiegel*, Mass Effect
 * reflection moments.
 *
 * Synthesis program (#512 spec):
 *
 *   - Choir: six detuned saws forming a C major triad spread across
 *     two octaves (C3 / E3 / G3 / C4 / E4 / G4). Bandpass at 600 Hz
 *     and 1000 Hz to approximate "Oo" vowel formant. Very slow
 *     attack (3 s).
 *   - Harp arpeggio: Karplus-Strong, C-E-G-B pattern at 60 BPM,
 *     gentle dynamics, panned slowly L-R-L-R.
 *   - Warm strings: two detuned saws at C2 (~65 Hz) and G2 (~98 Hz),
 *     lowpass @ 800 Hz, attack 2 s.
 *   - Distant bell: FM synth, very high pitch (E7), once per 30-60 s,
 *     far back in the mix.
 *   - Reverb: cathedral — 8 s tail, 50 % wet.
 *   - Length: 120 s.
 *   - Loop seam: 6 s crossfade. Harp arpeggio pauses in the last 6 s.
 */

import {
  biquadBandpass,
  expDecay,
  fmBell,
  ksPluck,
  makePrng,
  onePoleLowpass,
  pan,
  sawtoothPolyBlep,
  schroederReverb,
} from '../lib/synth';
import type { StereoBuffer } from '../lib/wav';
import type { TrackManifest } from './lobby';

// C major triad. C2/G2 for the warm strings, C3/E3/G3/C4/E4/G4 for
// the choir, C5/E5/G5/B5 for the harp.
const C2 = 65.41;
const G2 = 98.0;
const C3 = 130.81;
const E3 = 164.81;
const G3 = 196.0;
const C4 = 261.63;
const E4 = 329.63;
const G4 = 392.0;
const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const B5 = 987.77;
const E7 = 2637.02;

const DURATION_SEC = 120;
const SAMPLE_RATE = 44100;
const CROSSFADE_SEC = 6;
const WARMUP_SEC = 14;
const SEED = 0xb1e5e500;

const LOOP_SPAN_SEC = DURATION_SEC - CROSSFADE_SEC; // 114 s

// 60 BPM = one beat per second. Harp pattern is 4 notes (C-E-G-B)
// repeated, one per beat. Over 114 s of loop content, that's 114
// beats = 28.5 patterns. Round to 28 patterns to keep the harp
// quantised — gives a 28 × 4 = 112 s harp run with 2 s of silence
// before the tail crossfade region.
const HARP_BPM = 60;
const HARP_BEAT_SEC = 60 / HARP_BPM;
const HARP_PATTERN = [C5, E5, G5, B5];
// 4 s harp-quiet zone before the 6 s tail crossfade region begins.
// Total silence at the seam = 4 s pause + 6 s crossfade = 10 s, which
// is more than the spec's "last 6 s" and gives the cathedral reverb
// tail (~8 s RT60) enough time to ring out before the loop wraps.
const HARP_PAUSE_SEC = 4;

function freqWithIntegerCycles(targetHz: number, durationSec: number): number {
  return Math.round(targetHz * durationSec) / durationSec;
}

const choirFreqs = [C3, E3, G3, C4, E4, G4].map((f) => freqWithIntegerCycles(f, LOOP_SPAN_SEC));
const stringFreqs = [
  freqWithIntegerCycles(C2 * Math.pow(2, -4 / 1200), LOOP_SPAN_SEC),
  freqWithIntegerCycles(C2 * Math.pow(2, +4 / 1200), LOOP_SPAN_SEC),
  freqWithIntegerCycles(G2 * Math.pow(2, -4 / 1200), LOOP_SPAN_SEC),
  freqWithIntegerCycles(G2 * Math.pow(2, +4 / 1200), LOOP_SPAN_SEC),
];

export const blessing: TrackManifest = {
  name: 'blessing',
  durationSec: DURATION_SEC,
  sampleRate: SAMPLE_RATE,
  seed: SEED,
  qaGates: {
    crossfadeSec: CROSSFADE_SEC,
    minLoopSeam: 0.85,
    minLufs: -26, // softest of the four — explicit per spec
    maxLufs: -18,
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

    /* ----- Warm strings (C2 + G2, perfect fifth) ---------------- */

    const stringOscs = stringFreqs.map((f) => sawtoothPolyBlep(f, sr));
    const stringLp = onePoleLowpass(800, sr);
    const stringGain = 0.075;
    const stringAttackSec = 2;
    const stringAttackSamples = sr * stringAttackSec;

    const stringBuffer = new Float32Array(totalSamples);
    for (let i = 0; i < totalSamples; i++) {
      const env = Math.min(1, i / stringAttackSamples);
      let mix = 0;
      for (const osc of stringOscs) mix += osc() * (1 / stringOscs.length);
      stringBuffer[i] = stringLp.process(mix) * stringGain * env;
    }

    /* ----- Choir (C major triad, "Oo" formant) ------------------ */

    const choirOscs = choirFreqs.map((f) => sawtoothPolyBlep(f, sr));
    const bpf1L = biquadBandpass(600, 5, sr);
    const bpf2L = biquadBandpass(1000, 6, sr);
    const bpf1R = biquadBandpass(600, 5, sr);
    const bpf2R = biquadBandpass(1000, 6, sr);
    const choirGain = 0.16;
    const choirAttackSec = 3;
    const choirAttackSamples = sr * choirAttackSec;

    const choirLeft = new Float32Array(totalSamples);
    const choirRight = new Float32Array(totalSamples);
    for (let i = 0; i < totalSamples; i++) {
      const env = Math.min(1, i / choirAttackSamples);
      // First three voices → L, last three → R.
      let l = 0;
      let r = 0;
      for (let v = 0; v < 3; v++) l += choirOscs[v]!() * (1 / 3);
      for (let v = 3; v < 6; v++) r += choirOscs[v]!() * (1 / 3);
      const formantL = (bpf1L.process(l) + bpf2L.process(l)) * 0.5;
      const formantR = (bpf1R.process(r) + bpf2R.process(r)) * 0.5;
      choirLeft[i] = formantL * choirGain * env;
      choirRight[i] = formantR * choirGain * env;
    }

    /* ----- Harp arpeggio (KS, C-E-G-B at 60 BPM) ---------------- */
    // Slow stereo pan: L-R-L-R one beat at a time.

    const HARP_DECAY_COEF = 0.999;
    const harpGain = 0.08;
    const harpLeft = new Float32Array(totalSamples);
    const harpRight = new Float32Array(totalSamples);
    const harpStartSec = WARMUP_SEC + CROSSFADE_SEC + 2;
    const harpEndSec = WARMUP_SEC + DURATION_SEC - CROSSFADE_SEC - HARP_PAUSE_SEC;

    let beatIndex = 0;
    let beatT = harpStartSec;
    while (beatT + HARP_BEAT_SEC <= harpEndSec) {
      const pitchHz = HARP_PATTERN[beatIndex % HARP_PATTERN.length] ?? C5;
      const panPos = beatIndex % 2 === 0 ? -0.4 : 0.4;
      const startSample = Math.floor(beatT * sr);
      const ks = ksPluck(pitchHz, sr, makePrng(SEED ^ beatIndex), HARP_DECAY_COEF);
      const env = expDecay(0.9, sr);
      const renderLen = Math.min(totalSamples - startSample, Math.floor(sr * 1.5));
      for (let i = 0; i < renderLen; i++) {
        const s = ks() * env() * harpGain;
        const { left: l, right: r } = pan(s, panPos);
        harpLeft[startSample + i]! += l;
        harpRight[startSample + i]! += r;
      }
      beatIndex += 1;
      beatT += HARP_BEAT_SEC;
    }

    /* ----- Distant bell (E7 FM, very rare) ---------------------- */

    const rng = makePrng(SEED ^ 0xface);
    const bellGain = 0.07;
    const bellDecaySec = 4;
    const bellStartEarliestSec = WARMUP_SEC + CROSSFADE_SEC + 5;
    const BELL_TAIL_SEC = bellDecaySec * 5 + 8; // generous reverb headroom
    const bellEndLatestSec = WARMUP_SEC + DURATION_SEC - CROSSFADE_SEC - BELL_TAIL_SEC;
    const bellLeft = new Float32Array(totalSamples);
    const bellRight = new Float32Array(totalSamples);
    let bellT = bellStartEarliestSec + 5;
    while (bellT < bellEndLatestSec) {
      const interval = 30 + rng() * 30; // 30-60 s
      bellT += interval;
      if (bellT >= bellEndLatestSec) break;
      const startSample = Math.floor(bellT * sr);
      const bell = fmBell(
        { carrierHz: E7, modHz: E7 * 1.5, modIndex: 1.2, decaySec: bellDecaySec },
        sr,
      );
      const renderLen = Math.min(totalSamples - startSample, Math.floor(sr * bellDecaySec * 5));
      const panPos = (rng() * 2 - 1) * 0.6;
      for (let i = 0; i < renderLen; i++) {
        const s = bell() * bellGain;
        const { left: l, right: r } = pan(s, panPos);
        bellLeft[startSample + i]! += l;
        bellRight[startSample + i]! += r;
      }
    }

    /* ----- Mix + reverb (cathedral) ----------------------------- */

    const verb = schroederReverb({ tailSec: 8, wet: 0.5, sampleRate: sr });
    const wetLeft = new Float32Array(totalSamples);
    const wetRight = new Float32Array(totalSamples);
    for (let i = 0; i < totalSamples; i++) {
      const dryL =
        (stringBuffer[i] ?? 0) + (choirLeft[i] ?? 0) + (harpLeft[i] ?? 0) + (bellLeft[i] ?? 0);
      const dryR =
        (stringBuffer[i] ?? 0) + (choirRight[i] ?? 0) + (harpRight[i] ?? 0) + (bellRight[i] ?? 0);
      const [l, r] = verb.process(dryL, dryR);
      wetLeft[i] = l;
      wetRight[i] = r;
    }

    /* ----- Extract loop content + crossfade --------------------- */

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
