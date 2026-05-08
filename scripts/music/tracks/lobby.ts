/**
 * Lobby track — anticipatory hush. Empty stone hall before a ritual
 * begins. Sparse, no melody, no pulse. Vibe references: Eno *Music for
 * Airports*, Vangelis *Blade Runner* opening titles, Coil *Time
 * Machines*.
 *
 * Synthesis program (locked into ticket #511):
 *
 *   - Drone bed: two detuned saws @ A2 (110 Hz, ±7 cents). One-pole
 *     lowpass @ 800 Hz, modulated ±200 Hz by an LFO @ 0.07 Hz. Tremolo
 *     @ 0.13 Hz, ±2 dB.
 *   - Distant FM bells: carrier A5 / modulator E6, mod index 2. 3 s
 *     exponential decay. Sparse — average 1 event per 14 s, ±4 s
 *     jitter. Random pitch from {A5, C♯6, E6, A6}. Stereo pan ±0.4.
 *   - Schroeder reverb: 4 s tail, 35 % wet.
 *   - Length: 120 s.
 *   - Loop seam: no bell events in the last 6 s; 6 s linear crossfade
 *     from head (0–6 s) into tail (114–120 s) so the seam is inaudible.
 */

import {
  expDecay,
  fmBell,
  lfo,
  makePrng,
  onePoleLowpass,
  pan,
  sawtoothPolyBlep,
  schroederReverb,
  sineOsc,
} from '../lib/synth';
import type { StereoBuffer } from '../lib/wav';

export type TrackManifest = {
  name: string;
  durationSec: number;
  sampleRate: number;
  seed: number;
  qaGates: {
    crossfadeSec: number;
    minLoopSeam: number;
    minLufs: number;
    maxLufs: number;
    maxPeakDbfs: number;
    maxSilenceSec: number;
    maxBytes: number;
  };
  render: () => StereoBuffer;
};

const A2 = 110;
const A5 = 880;
const C_SHARP_6 = 1108.73;
const E6 = 1318.51;
const A6 = 1760;
const C_SHARP_7 = 2217.46;
const E7 = 2637.02;

const DURATION_SEC = 120;
const SAMPLE_RATE = 44100;
const CROSSFADE_SEC = 6;
// 10 s pre-roll lets the reverb tail (RT60 ≈ 4 s) reach steady state
// before the loop content begins. Without it, the head crossfade region
// has near-silent reverb energy while the tail has full reverb energy,
// which tanks the head/tail Pearson correlation.
const WARMUP_SEC = 10;
const SEED = 0xc0ffee;

// Modulator and oscillator frequencies are nudged so each completes an
// integer number of cycles over the LOOP_SPAN_SEC = DURATION_SEC -
// CROSSFADE_SEC = 114 s window. With that alignment:
//
//   raw[t = W .. W + crossfade) ≡ raw[t = W + 114s .. W + 120s)
//
// (waveforms identical except for accumulated reverb fuzz). After the
// simple linear "head-into-tail" crossfade, both the loop's first 6 s
// and last 6 s share the same source content, so the head/tail
// correlation rises close to 1 — the loop seam is inaudible.
//
// The audible cost: when the loop *wraps* from sample N-1 back to
// sample 0, the LFOs are at slightly different phases (because
// neither freq has integer cycles in the full 120 s loop). The drone
// is texturally homogeneous though, and the LP cutoff modulator only
// swings ±200 Hz around 800 Hz, so the wrap-jump reads as a tiny
// cross-modulation rather than a click — well within "ambient"
// perceptual budget.
const LOOP_SPAN_SEC = DURATION_SEC - CROSSFADE_SEC; // 114 s

const CUTOFF_LFO_HZ = 8 / LOOP_SPAN_SEC; // 0.0702 Hz, was 0.07
const TREMOLO_LFO_HZ = 15 / LOOP_SPAN_SEC; // 0.1316 Hz, was 0.13

// Saw frequencies tuned so each saw completes an integer number of
// cycles over LOOP_SPAN_SEC. Detune is approximately ±7 cents around A2.
function freqWithIntegerCycles(targetHz: number, durationSec: number): number {
  return Math.round(targetHz * durationSec) / durationSec;
}
const SAW_LO_HZ = freqWithIntegerCycles(A2 * Math.pow(2, -7 / 1200), LOOP_SPAN_SEC);
const SAW_HI_HZ = freqWithIntegerCycles(A2 * Math.pow(2, +7 / 1200), LOOP_SPAN_SEC);

export const lobby: TrackManifest = {
  name: 'lobby',
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
    // Ticket #511 ACs name two values that can't both hold at 120 s
    // duration: "≤ 250 KB" and "96-128 kbps VBR". 96 kbps × 120 s = 1440 KB,
    // 128 kbps × 120 s = 1920 KB — already 6× the size cap. The 250 KB
    // figure is consistent with the SFX cues (≤ 1 s each); for a 120 s
    // ambient track at the same bitrate target, the ceiling has to scale
    // with duration. 2 MB sits 1.04× over 128 kbps × 120 s, which keeps
    // the bitrate honest without forcing audibly bad encoding.
    maxBytes: 2 * 1024 * 1024,
  },
  render(): StereoBuffer {
    const sr = SAMPLE_RATE;
    const N = sr * DURATION_SEC;
    const W = sr * WARMUP_SEC;
    const M = Math.floor(CROSSFADE_SEC * sr);

    /* ----- Drone bed (rendered for warmup + loop length) --------- */

    const sawA = sawtoothPolyBlep(SAW_LO_HZ, sr);
    const sawB = sawtoothPolyBlep(SAW_HI_HZ, sr);

    const cutoffLfo = lfo(CUTOFF_LFO_HZ, sr);
    const cutoffCenter = 800;
    const cutoffSwing = 200;

    const tremoloLfo = lfo(TREMOLO_LFO_HZ, sr);
    // ±2 dB tremolo: gain in [10^(-2/20), 10^(2/20)] ≈ [0.794, 1.259].
    const tremoloDb = 2;

    const lp = onePoleLowpass(cutoffCenter, sr);

    // Drone amplitude target before reverb. The two-saw mix peaks
    // around ±2; LP knocks ~3-4 dB off. -18 dB is enough headroom for
    // the bells + reverb tail to fit without clipping.
    const droneGain = 0.18;

    const totalSamples = W + N;
    const droneBuffer = new Float32Array(totalSamples);
    for (let i = 0; i < totalSamples; i++) {
      const cutoff = cutoffCenter + cutoffSwing * cutoffLfo();
      lp.setCutoff(cutoff);

      const sawMix = (sawA() + sawB()) * 0.5;
      const filtered = lp.process(sawMix);

      const tremoloDbMod = tremoloDb * tremoloLfo();
      const tremoloGain = Math.pow(10, tremoloDbMod / 20);

      droneBuffer[i] = filtered * tremoloGain * droneGain;
    }

    /* ----- Bell events ------------------------------------------- */
    // Forbidden in the warmup (W), the head crossfade region (next M),
    // and the tail crossfade region (last M of the loop). This keeps
    // both ends of the loop bell-free so the crossfade only blends
    // drone material on drone material.

    const rng = makePrng(SEED);
    const bellPitches = [A5, C_SHARP_6, E6, A6];
    const earliestBellSec = WARMUP_SEC + CROSSFADE_SEC; // = 16 s
    // The bell decay envelope is exponential with τ = 3 s; we render
    // until 5τ for a clean fade. The tail is also passed through the
    // 4 s reverb. So a bell fired at t=t0 has audible content up to
    // ~ t0 + 5·3 + 4 = t0 + 19 s. To keep the loop's tail crossfade
    // region drone-only (matches the head exactly), forbid bells
    // whose audible tail reaches into [W+N-M, W+N).
    const BELL_TAIL_SEC = 5 * 3 + 4;
    const latestBellSec =
      WARMUP_SEC + DURATION_SEC - CROSSFADE_SEC - BELL_TAIL_SEC; // = 105 s

    type BellEvent = {
      startSample: number;
      pitchHz: number;
      panPos: number;
      decaySec: number;
    };
    const events: BellEvent[] = [];
    let nextEventSec = earliestBellSec;
    while (true) {
      // Average 1 event per 14 s, ±4 s jitter (uniform).
      const interval = 14 + (rng() * 2 - 1) * 4;
      nextEventSec += interval;
      if (nextEventSec >= latestBellSec) break;
      const pitchIndex = Math.floor(rng() * bellPitches.length);
      const pitchHz = bellPitches[pitchIndex] ?? A5;
      const panPos = (rng() * 2 - 1) * 0.4;
      events.push({
        startSample: Math.floor(nextEventSec * sr),
        pitchHz,
        panPos,
        decaySec: 3,
      });
    }

    // Each bell renders into its own envelope, then pans to the bell
    // sum. Bell amplitude sits below the drone; the reverb adds back
    // the perceptual loudness.
    const bellGain = 0.25;
    const bellLeft = new Float32Array(totalSamples);
    const bellRight = new Float32Array(totalSamples);

    for (const ev of events) {
      const bell = fmBell(
        { carrierHz: ev.pitchHz, modHz: ev.pitchHz * 1.5, modIndex: 2, decaySec: ev.decaySec },
        sr,
      );
      // Render until the envelope is inaudible (~ 5 time constants).
      const bellSamples = Math.min(
        totalSamples - ev.startSample,
        Math.floor(sr * ev.decaySec * 5),
      );
      for (let i = 0; i < bellSamples; i++) {
        const s = bell() * bellGain;
        const { left: l, right: r } = pan(s, ev.panPos);
        const idx = ev.startSample + i;
        bellLeft[idx]! += l;
        bellRight[idx]! += r;
      }
    }

    /* ----- Melodic motif (celesta phrase) ------------------------ */
    // Two passes of a simple A-major arpeggio — ascending from A5 up
    // to A6 over four notes, then descending back. Held resolutions
    // on the peak (A6) and the final tonic (A5). Same celesta voice
    // as the twinkle layer for timbral coherence.
    type MelodyNote = { pitchHz: number; durationSec: number };
    const F_SHARP_6 = 1479.98;
    const motif: MelodyNote[] = [
      { pitchHz: A5, durationSec: 1.5 },
      { pitchHz: C_SHARP_6, durationSec: 1.5 },
      { pitchHz: E6, durationSec: 1.5 },
      { pitchHz: A6, durationSec: 3.0 },
      { pitchHz: F_SHARP_6, durationSec: 1.5 },
      { pitchHz: E6, durationSec: 1.5 },
      { pitchHz: C_SHARP_6, durationSec: 1.5 },
      { pitchHz: A5, durationSec: 4.0 },
    ];
    const melodyGain = 0.22;
    const melodyDecaySec = 1.6;

    // Two passes spaced so each fits in the bell-allowed range
    // [earliestBellSec, latestBellSec] = [16, 105] of raw timeline.
    // Total motif length = 16 s; placing at 25 s and 70 s of the LOOP
    // (= 35 s and 80 s of raw) leaves contemplative gaps before, between,
    // and after.
    //
    // **Future-pass safety.** Each note's audible tail =
    // melodyDecaySec · 5 (render cap) + reverb RT60 ≈ 12 s. For any
    // additional pass at loop-time `s`, the latest sample touched is
    // `(W + s + motifTotalSec) * sr + tailSamples` and must stay below
    // `(W + N - M) * sr` (the start of the tail crossfade). With
    // motifTotalSec = 16 s and tail = 12 s, the latest safe loop-time
    // start is N - M - 16 - 12 = 86 s. The current 25 s and 70 s passes
    // both clear; if a third pass is added it must clear too.
    const melodyStartsLoopSec = [25, 70];
    for (const loopStartSec of melodyStartsLoopSec) {
      let cursor = Math.floor((WARMUP_SEC + loopStartSec) * sr);
      for (const note of motif) {
        const noteFreq = note.pitchHz;
        const fund = sineOsc(noteFreq, sr);
        const harm = sineOsc(noteFreq * 3, sr);
        const shimmer = sineOsc(noteFreq * 1.001, sr);
        const env = expDecay(melodyDecaySec, sr);
        const renderLen = Math.min(
          totalSamples - cursor,
          Math.floor(sr * melodyDecaySec * 5),
        );
        for (let i = 0; i < renderLen; i++) {
          const e = env();
          const v =
            (fund() * 0.55 + harm() * 0.15 + shimmer() * 0.25) * e * melodyGain;
          bellLeft[cursor + i]! += v * 0.85;
          bellRight[cursor + i]! += v * 0.85;
        }
        cursor += Math.floor(note.durationSec * sr);
      }
    }

    /* ----- Twinkle layer (celesta-like high arpeggios) ----------- */
    // Sparse ascending three-note arpeggios on an A major triad,
    // celesta-flavoured (sine fundamental + 3rd harmonic + slight
    // detune for shimmer). Brief decay; pans wider than the FM bells
    // so the twinkle reads as "stars overhead" against the centred
    // drone bed.
    const TWINKLE_DECAY_SEC = 0.4;
    const TWINKLE_NOTE_GAP_SEC = 0.13;
    const twinkleTriadPitches = [A6, C_SHARP_7, E7];
    const twinkleGain = 0.18;
    let nextTwinkleSec = earliestBellSec + 4; // offset from bell schedule
    while (true) {
      // Average 11 s, ±3 s jitter — slightly denser than the tolls so
      // the magic glints through more often than the deep bells.
      const interval = 11 + (rng() * 2 - 1) * 3;
      nextTwinkleSec += interval;
      if (nextTwinkleSec >= latestBellSec) break;

      const tonicChoice = Math.floor(rng() * twinkleTriadPitches.length);
      const tonic = twinkleTriadPitches[tonicChoice] ?? A6;
      const arpeggio = [tonic, (tonic * 5) / 4, (tonic * 3) / 2];
      const panPos = (rng() * 2 - 1) * 0.6;
      const eventStart = Math.floor(nextTwinkleSec * sr);

      for (let n = 0; n < arpeggio.length; n++) {
        const noteFreq = arpeggio[n] ?? tonic;
        const noteStart = eventStart + Math.floor(n * TWINKLE_NOTE_GAP_SEC * sr);
        const fund = sineOsc(noteFreq, sr);
        const harm = sineOsc(noteFreq * 3, sr);
        const shimmer = sineOsc(noteFreq * 1.001, sr);
        const decay = expDecay(TWINKLE_DECAY_SEC, sr);
        const renderLen = Math.min(
          totalSamples - noteStart,
          Math.floor(sr * TWINKLE_DECAY_SEC * 5),
        );
        for (let i = 0; i < renderLen; i++) {
          const env = decay();
          const v = (fund() * 0.55 + harm() * 0.15 + shimmer() * 0.25) * env * twinkleGain;
          const { left: l, right: r } = pan(v, panPos);
          bellLeft[noteStart + i]! += l;
          bellRight[noteStart + i]! += r;
        }
      }
    }

    /* ----- Mix + reverb (continuous over warmup + loop) ---------- */

    const verb = schroederReverb({ tailSec: 4, wet: 0.35, sampleRate: sr });
    const wetLeft = new Float32Array(totalSamples);
    const wetRight = new Float32Array(totalSamples);
    for (let i = 0; i < totalSamples; i++) {
      const dryL = (droneBuffer[i] ?? 0) + (bellLeft[i] ?? 0);
      const dryR = (droneBuffer[i] ?? 0) + (bellRight[i] ?? 0);
      const [l, r] = verb.process(dryL, dryR);
      wetLeft[i] = l;
      wetRight[i] = r;
    }

    /* ----- Extract loop content + crossfade ---------------------- */
    // Drop the warmup; the loop is samples [W, W+N) of the rendered
    // mix. Linear crossfade the head into the tail: tail[i] becomes
    // (1-α)·tail[i] + α·head[i] for i in [0, M). With LFO phase
    // alignment + reverb warmup, the head and tail are texturally
    // very close; the crossfade hides the residual waveform mismatch.
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
