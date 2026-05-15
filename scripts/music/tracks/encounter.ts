/**
 * Generic encounter track — heightened presence. Turn-based dialogue
 * with a Sefirah avatar. Tension *but not combat* — magical
 * conversation, something is at stake.
 *
 * This is the FALLBACK track for the per-Sefirah engine in #526. When
 * a Sefirah-specific track exists in `lib/music/manifest.ts`, the
 * engine prefers that; for any Sefirah without one, this generic
 * encounter track plays.
 *
 * Vibe references: Disco Elysium thought-cabinet cues, Persona
 * thinking themes.
 *
 * Synthesis program (#512 spec):
 *
 *   - Low drone: detuned saws @ A1 (~55 Hz) + A2 (~110 Hz). Lowpass
 *     @ 600 Hz with subtle slow LFO.
 *   - Choir-ish pad: eight detuned saws in two clusters at A3
 *     (~220 Hz) and E4 (~330 Hz) — perfect fifth. Bandpassed at
 *     800 Hz and 1200 Hz to approximate "Ah" vowel formant. Slow
 *     attack 2 s.
 *   - Felt mallet: damped FM bell — carrier A3, modulator E5, short
 *     exponential envelope. Fired every 6-10 s with subtle pitch
 *     variation.
 *   - Soft pulse: filtered noise burst every 4 beats at 70 BPM
 *     (= 0.857 s), very low in mix — "thinking" pulse.
 *   - Reverb: medium room — 2 s tail, 25 % wet.
 *   - Length: 100 s.
 *   - Loop seam: 4 s crossfade. Pulse continues across the seam.
 */

import {
  biquadBandpass,
  expDecay,
  fmBell,
  lfo,
  makePrng,
  onePoleLowpass,
  pan,
  sawtoothPolyBlep,
  schroederReverb,
} from '../lib/synth';
import type { StereoBuffer } from '../lib/wav';
import type { TrackManifest } from './lobby';

// A minor — gravitas, "presence" without despair. A1 is low.
const A1 = 55.0;
const A2 = 110.0;
const A3 = 220.0;
const E4 = 329.63;
const E5 = 659.25;
const C_SHARP_4 = 277.18;

const DURATION_SEC = 100;
const SAMPLE_RATE = 44100;
const CROSSFADE_SEC = 4;
const WARMUP_SEC = 10;
const SEED = 0xe1c01171; // "encounter"-ish

const LOOP_SPAN_SEC = DURATION_SEC - CROSSFADE_SEC; // 96 s

// 70 BPM, 4 beats per bar = bar length 60 / 70 * 4 = 3.4286 s.
// One pulse per bar. Over 96 s of loopable content, 96 / 3.4286 ≈ 28
// bars; not an integer, so quantise to 28 bars and adjust BPM
// slightly so the pulse divides cleanly into the loop.
const PULSES_PER_LOOP = 28;
const PULSE_INTERVAL_SEC = LOOP_SPAN_SEC / PULSES_PER_LOOP; // ≈ 3.43 s
const CUTOFF_LFO_HZ = 5 / LOOP_SPAN_SEC;

function freqWithIntegerCycles(targetHz: number, durationSec: number): number {
  return Math.round(targetHz * durationSec) / durationSec;
}

const droneFreqs = [A1, A2].map((f) => ({
  lo: freqWithIntegerCycles(f * Math.pow(2, -6 / 1200), LOOP_SPAN_SEC),
  hi: freqWithIntegerCycles(f * Math.pow(2, +6 / 1200), LOOP_SPAN_SEC),
}));
const padCluster1 = Array.from({ length: 4 }, (_, i) =>
  freqWithIntegerCycles(A3 * Math.pow(2, ((i - 1.5) * 4) / 1200), LOOP_SPAN_SEC),
);
const padCluster2 = Array.from({ length: 4 }, (_, i) =>
  freqWithIntegerCycles(E4 * Math.pow(2, ((i - 1.5) * 4) / 1200), LOOP_SPAN_SEC),
);

export const encounter: TrackManifest = {
  name: 'encounter',
  durationSec: DURATION_SEC,
  sampleRate: SAMPLE_RATE,
  seed: SEED,
  qaGates: {
    crossfadeSec: CROSSFADE_SEC,
    minLoopSeam: 0.85,
    minLufs: -22, // a touch louder than lobby — encounters are present
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

    /* ----- Low drone (A1 + A2 detuned saws) ---------------------- */

    const droneOscs: (() => number)[] = [];
    for (const pair of droneFreqs) {
      droneOscs.push(sawtoothPolyBlep(pair.lo, sr));
      droneOscs.push(sawtoothPolyBlep(pair.hi, sr));
    }
    const cutoffLfo = lfo(CUTOFF_LFO_HZ, sr);
    const droneCutoffCenter = 600;
    const droneCutoffSwing = 80;
    const droneLp = onePoleLowpass(droneCutoffCenter, sr);
    const droneGain = 0.3;

    const droneBuffer = new Float32Array(totalSamples);
    for (let i = 0; i < totalSamples; i++) {
      droneLp.setCutoff(droneCutoffCenter + droneCutoffSwing * cutoffLfo());
      let mix = 0;
      for (const osc of droneOscs) mix += osc() * (1 / droneOscs.length);
      droneBuffer[i] = droneLp.process(mix) * droneGain;
    }

    /* ----- Choir-ish pad (formant bandpass) ---------------------- */
    // "Ah" vowel approximated by two parallel BPFs at 800 Hz and
    // 1200 Hz. Stereo = cluster1 panned slightly L, cluster2 R.

    const padOscs1 = padCluster1.map((f) => sawtoothPolyBlep(f, sr));
    const padOscs2 = padCluster2.map((f) => sawtoothPolyBlep(f, sr));
    const bpf1L = biquadBandpass(800, 5, sr);
    const bpf2L = biquadBandpass(1200, 6, sr);
    const bpf1R = biquadBandpass(800, 5, sr);
    const bpf2R = biquadBandpass(1200, 6, sr);
    // High raw gain (1.4) compensates for narrow-Q BPF attenuation —
    // each formant filter passes only a slim band of the saw cluster's
    // harmonic content, so the post-filter amplitude is about an order
    // of magnitude lower than the input. Real peak ≈ 0.15-0.20 in
    // practice; the QA peak gate (-1 dBFS) catches any clipping.
    const padGain = 1.4;
    const padAttackSec = 2;
    const padAttackSamples = sr * padAttackSec;

    const padLeft = new Float32Array(totalSamples);
    const padRight = new Float32Array(totalSamples);
    for (let i = 0; i < totalSamples; i++) {
      const env = Math.min(1, i / padAttackSamples);
      let l = 0;
      let r = 0;
      for (const osc of padOscs1) l += osc() * (1 / padOscs1.length);
      for (const osc of padOscs2) r += osc() * (1 / padOscs2.length);
      const formantL = (bpf1L.process(l) + bpf2L.process(l)) * 0.5;
      const formantR = (bpf1R.process(r) + bpf2R.process(r)) * 0.5;
      padLeft[i] = formantL * padGain * env;
      padRight[i] = formantR * padGain * env;
    }

    /* ----- Felt mallet (FM bell, sparse) ------------------------- */

    const malletGain = 0.18;
    const malletDecaySec = 0.6;
    const malletPitches = [A3, C_SHARP_4, E4];
    const earliestMalletSec = WARMUP_SEC + CROSSFADE_SEC + 1;
    const MALLET_TAIL_SEC = 5; // 0.6 × 5 + 2 reverb headroom
    const latestMalletSec = WARMUP_SEC + DURATION_SEC - CROSSFADE_SEC - MALLET_TAIL_SEC;

    const rng = makePrng(SEED);
    type Mallet = { startSample: number; pitchHz: number; panPos: number };
    const mallets: Mallet[] = [];
    let nextMalletSec = earliestMalletSec + 2;
    while (true) {
      const interval = 8 + (rng() * 2 - 1) * 2; // 6-10 s spec
      nextMalletSec += interval;
      if (nextMalletSec >= latestMalletSec) break;
      mallets.push({
        startSample: Math.floor(nextMalletSec * sr),
        pitchHz: malletPitches[Math.floor(rng() * malletPitches.length)] ?? A3,
        panPos: (rng() * 2 - 1) * 0.4,
      });
    }

    const malletLeft = new Float32Array(totalSamples);
    const malletRight = new Float32Array(totalSamples);
    for (const ev of mallets) {
      const bell = fmBell(
        {
          carrierHz: ev.pitchHz,
          modHz: E5, // fixed modulator pitch — gives the felt-mallet bite
          modIndex: 1.5,
          decaySec: malletDecaySec,
        },
        sr,
      );
      const renderLen = Math.min(
        totalSamples - ev.startSample,
        Math.floor(sr * malletDecaySec * 5),
      );
      for (let i = 0; i < renderLen; i++) {
        const s = bell() * malletGain;
        const { left: l, right: r } = pan(s, ev.panPos);
        malletLeft[ev.startSample + i]! += l;
        malletRight[ev.startSample + i]! += r;
      }
    }

    /* ----- "Thinking" pulses (filtered noise) -------------------- */
    // One pulse per ~3.43 s = 28 pulses across the loop span.
    // Each pulse: a brief burst of bandpass-filtered seeded noise.
    // Continues across the seam — the pulses are periodic in
    // loop-time and exist in the warmup, so the head/tail crossfade
    // bridges cleanly.

    const PULSE_DURATION_SEC = 0.18;
    const PULSE_GAIN = 0.08;
    const pulseLeft = new Float32Array(totalSamples);
    const pulseRight = new Float32Array(totalSamples);

    // Pulse-times are in raw-timeline coordinates (after warmup).
    // Schedule a pulse at every multiple of PULSE_INTERVAL_SEC from
    // raw t=0; only pulses that start with enough headroom for their
    // duration before the tail-crossfade region survive.
    const pulseRng = makePrng(SEED ^ 0xbabecafe);
    let pulseT = 0;
    while (pulseT < totalSamples / sr) {
      const startSample = Math.floor(pulseT * sr);
      const renderLen = Math.min(totalSamples - startSample, Math.floor(sr * PULSE_DURATION_SEC));
      // Each pulse is its own bandpass-filtered noise — independent
      // BPF state per pulse so we don't carry state across pulses.
      const bpf = biquadBandpass(2000, 8, sr);
      const decay = expDecay(0.06, sr);
      for (let i = 0; i < renderLen; i++) {
        const noise = pulseRng() * 2 - 1;
        const env = decay();
        const filtered = bpf.process(noise);
        const s = filtered * env * PULSE_GAIN;
        pulseLeft[startSample + i]! += s;
        pulseRight[startSample + i]! += s;
      }
      pulseT += PULSE_INTERVAL_SEC;
    }

    /* ----- Mix + reverb (medium room) ---------------------------- */

    const verb = schroederReverb({ tailSec: 2, wet: 0.25, sampleRate: sr });
    const wetLeft = new Float32Array(totalSamples);
    const wetRight = new Float32Array(totalSamples);
    for (let i = 0; i < totalSamples; i++) {
      const dryL =
        (droneBuffer[i] ?? 0) + (padLeft[i] ?? 0) + (malletLeft[i] ?? 0) + (pulseLeft[i] ?? 0);
      const dryR =
        (droneBuffer[i] ?? 0) + (padRight[i] ?? 0) + (malletRight[i] ?? 0) + (pulseRight[i] ?? 0);
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
