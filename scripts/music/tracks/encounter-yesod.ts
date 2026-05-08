/**
 * Yesod encounter track — violet, dreams, subconscious, intuition, the
 * moon (#527). Per-Sefirah aesthetic gate: ships one track to validate
 * that the synth toolkit can carve distinguishable per-Sefirah character
 * before the bulk of 8 tracks lands in #528.
 *
 * Vibe references: Coil *Time Machines*, Tim Hecker, Lustmord.
 *
 * Synthesis program (current — drone removed per user feedback that
 * the constant saw bed read as unpleasant):
 *
 *   - Hypnagogic shimmer: chorus-detuned sine triad on D-F-A around
 *     D5/F5/A5, very slowly amplitude-modulated ("breathing" pad).
 *     This is the sustained bottom layer.
 *   - D-minor lullaby motif: D5 → F5 → A5 → F5 → D5 celesta phrase,
 *     plays twice per loop. The melodic carrier.
 *   - Distant celesta drops: Karplus-Strong plucks at A5/D6 (perfect
 *     fifth above the original drone tonic), very sparse — average
 *     one per 20 s.
 *   - Reverb: very long tail (6 s) at higher wet (45 %) — pulls the
 *     track into "underwater / dreaming" texture.
 *   - Length: 36 s loop. Encounters are short-dwell.
 *   - Loop seam: 3 s head-into-tail crossfade.
 *
 * **Removed layer (kept here for context):** the original spec
 * called for a detuned-saw + sub-sine drone bed @ D2 (~73 Hz),
 * lowpass @ 600 Hz with a very slow LFO sweep (0.05 Hz, ±150 Hz).
 * The `SAW_LO_HZ` / `SAW_HI_HZ` / `SUB_HZ` / `CUTOFF_LFO_HZ`
 * constants below preserve the math from that program; the synth
 * code that used them was deleted in commit dd6a42a.
 *
 * Volume window: encounters are emotionally heightened relative to
 * lobby (-20 to -16 LUFS rather than -22).
 *
 * Loop-seam strategy mirrors lobby.ts: oscillator/modulator frequencies
 * are tuned to integer cycles over LOOP_SPAN_SEC = duration − crossfade.
 * After the linear crossfade, the head and tail share the same source
 * content, so the head/tail Pearson rises close to 1.
 */

import {
  expDecay,
  ksPluck,
  makePrng,
  pan,
  schroederReverb,
  sineOsc,
} from '../lib/synth';
import type { StereoBuffer } from '../lib/wav';
import type { TrackManifest } from './lobby';

// D Phrygian / D minor pitches.
const D2 = 73.42;
const D5 = 587.33;
const F5 = 698.46;
const A5 = 880.0;
const D6 = 1174.66;

const DURATION_SEC = 36;
const SAMPLE_RATE = 44100;
const CROSSFADE_SEC = 3;
// 8 s pre-roll lets the 6 s reverb tail reach steady state before the
// loop content begins (same rationale as lobby.ts but the verb is
// longer, so warmup is longer too).
const WARMUP_SEC = 8;
const SEED = 0xdeadbeef;

const LOOP_SPAN_SEC = DURATION_SEC - CROSSFADE_SEC; // 33 s

// Spec asks for 0.05 Hz. Integer-cycle alignment over 33 s only admits
// k/33 Hz; the closest options are 1/33 ≈ 0.030 Hz (too slow, drone
// barely moves) and 2/33 ≈ 0.061 Hz. Picked 2/33 to keep the spec's
// "slower than lobby's 0.07 Hz" relationship intact (0.061 < 0.07)
// while preserving the seamless loop wrap.
const CUTOFF_LFO_HZ = 2 / LOOP_SPAN_SEC;

function freqWithIntegerCycles(targetHz: number, durationSec: number): number {
  return Math.round(targetHz * durationSec) / durationSec;
}

// Detune ±5 cents around D2 — narrower than lobby's ±7 c so the drone
// reads as a single thicker voice (dreamlike) rather than two.
const SAW_LO_HZ = freqWithIntegerCycles(D2 * Math.pow(2, -5 / 1200), LOOP_SPAN_SEC);
const SAW_HI_HZ = freqWithIntegerCycles(D2 * Math.pow(2, +5 / 1200), LOOP_SPAN_SEC);
// Sub-sine layer at D2 (no detune — root grounding).
const SUB_HZ = freqWithIntegerCycles(D2, LOOP_SPAN_SEC);

// Hypnagogic shimmer triad — D-F-A. Each tuned to integer cycles so
// the sustained chord wraps cleanly. AM rate ~0.15 Hz (one breath per
// ~7 s) so the pad has motion without tempo.
const SHIMMER_D5 = freqWithIntegerCycles(D5, LOOP_SPAN_SEC);
const SHIMMER_F5 = freqWithIntegerCycles(F5, LOOP_SPAN_SEC);
const SHIMMER_A5 = freqWithIntegerCycles(A5, LOOP_SPAN_SEC);
// Light chorus detune (±3 cents) on a second voice per pitch — adds
// movement without breaking the integer-cycle alignment audibly.
const SHIMMER_CHORUS_RATIO = Math.pow(2, 3 / 1200);
const SHIMMER_AM_HZ = 5 / LOOP_SPAN_SEC; // ≈ 0.151 Hz

export const encounterYesod: TrackManifest = {
  name: 'encounter-yesod',
  durationSec: DURATION_SEC,
  sampleRate: SAMPLE_RATE,
  seed: SEED,
  qaGates: {
    crossfadeSec: CROSSFADE_SEC,
    minLoopSeam: 0.85,
    // Encounter tracks sit louder than lobby per #527 spec.
    minLufs: -20,
    maxLufs: -16,
    maxPeakDbfs: -1,
    // Tighter silence cap on the shorter loop — anything > 1 s of dead
    // air is structurally wrong on a 36 s ambient track.
    maxSilenceSec: 1,
    // 36 s at ~95-100 kbps VBR ≈ 430-450 KB. Same per-second-of-audio
    // budget as lobby (lobby = 2 MB / 120 s ≈ 17 KB/s; this is
    // 600 KB / 36 s ≈ 17 KB/s).
    maxBytes: 600 * 1024,
  },
  render(): StereoBuffer {
    const sr = SAMPLE_RATE;
    const N = sr * DURATION_SEC;
    const W = sr * WARMUP_SEC;
    const M = Math.floor(CROSSFADE_SEC * sr);
    const totalSamples = W + N;

    /* ----- Drone bed (REMOVED) ----------------------------------- */
    // The constant detuned-saw bed read as unpleasant against the
    // shimmer + melody. The hypnagogic shimmer triad below is now
    // the sustained low layer (AM-modulated breathing chord, not a
    // constant hum), and the melody motif carries the dream phrase.
    // SAW_LO_HZ / SAW_HI_HZ / SUB_HZ / CUTOFF_LFO_HZ constants are
    // kept above for the file's documented synthesis program but no
    // longer power any oscillator.

    const droneBuffer = new Float32Array(totalSamples);

    /* ----- Hypnagogic shimmer triad ------------------------------ */
    // Six sines (three pitches × two voices each) summed into a stereo
    // pad. "Breathing" amplitude modulation makes the chord pulse very
    // slowly. Pan the upper voice slightly L, the lower slightly R so
    // the shimmer reads as wide.

    const shimmerVoices = [
      { freq: SHIMMER_D5, pan: -0.3 },
      { freq: SHIMMER_D5 * SHIMMER_CHORUS_RATIO, pan: 0.3 },
      { freq: SHIMMER_F5, pan: 0.4 },
      { freq: SHIMMER_F5 / SHIMMER_CHORUS_RATIO, pan: -0.4 },
      { freq: SHIMMER_A5, pan: -0.2 },
      { freq: SHIMMER_A5 * SHIMMER_CHORUS_RATIO, pan: 0.2 },
    ];
    const shimmerOsc = shimmerVoices.map((v) => ({
      osc: sineOsc(v.freq, sr),
      pan: v.pan,
    }));
    const am = sineOsc(SHIMMER_AM_HZ, sr);
    // ±50 % gain swing → one full "breath" per AM cycle.
    const shimmerGain = 0.032;

    const shimmerLeft = new Float32Array(totalSamples);
    const shimmerRight = new Float32Array(totalSamples);
    for (let i = 0; i < totalSamples; i++) {
      const amVal = 0.5 + 0.5 * am(); // 0 .. 1
      for (const v of shimmerOsc) {
        const s = v.osc() * shimmerGain * amVal;
        const { left: l, right: r } = pan(s, v.pan);
        shimmerLeft[i]! += l;
        shimmerRight[i]! += r;
      }
    }

    /* ----- Celesta drops (KS plucks) ----------------------------- */
    // Sparse — average 1 per 12 s, ±3 s jitter — at A5 or D6. Keep
    // the tail clear: KS pluck audible tail ≈ a few hundred ms at
    // decay 0.998, and the verb adds 6 s of RT60 on top.

    const KS_DECAY_COEF = 0.998;
    const KS_GAIN = 0.13;
    const dropPitches = [A5, D6];
    const earliestDropSec = WARMUP_SEC + CROSSFADE_SEC;
    // Bell tail = ~0.5 s of pluck + 6 s reverb = 6.5 s. Forbid drops
    // whose audible tail crosses into the tail crossfade region.
    const DROP_TAIL_SEC = 7;
    const latestDropSec =
      WARMUP_SEC + DURATION_SEC - CROSSFADE_SEC - DROP_TAIL_SEC;

    const rng = makePrng(SEED);
    type Drop = { startSample: number; pitchHz: number; panPos: number };
    const drops: Drop[] = [];
    let nextDropSec = earliestDropSec + 2;
    while (true) {
      // 20 s avg ±4 s jitter per #527 spec. On a 36 s loop with a
      // ~22 s safe window, this lands ~1 drop per loop on average.
      const interval = 20 + (rng() * 2 - 1) * 4;
      nextDropSec += interval;
      if (nextDropSec >= latestDropSec) break;
      const pitchHz = dropPitches[Math.floor(rng() * dropPitches.length)] ?? A5;
      const panPos = (rng() * 2 - 1) * 0.5;
      drops.push({
        startSample: Math.floor(nextDropSec * sr),
        pitchHz,
        panPos,
      });
    }

    const dropLeft = new Float32Array(totalSamples);
    const dropRight = new Float32Array(totalSamples);
    for (const ev of drops) {
      const ks = ksPluck(ev.pitchHz, sr, makePrng(SEED ^ ev.startSample), KS_DECAY_COEF);
      // KS audible length: ~1 s is enough at decayCoef 0.998 (well past
      // perceptual zero). The verb extends it.
      const renderLen = Math.min(totalSamples - ev.startSample, Math.floor(sr * 1.0));
      // Exponential amplitude envelope (decay from 1.0 → 0). Shapes the
      // pluck so its KS-tail trails off rather than cutting at the
      // render cap; the 45 % wet reverb softens the attack transient.
      const env = expDecay(0.6, sr);
      for (let i = 0; i < renderLen; i++) {
        const s = ks() * env() * KS_GAIN;
        const { left: l, right: r } = pan(s, ev.panPos);
        dropLeft[ev.startSample + i]! += l;
        dropRight[ev.startSample + i]! += r;
      }
    }

    /* ----- Melodic motif (dreamy ascending-resolving) ------------ */
    // D5 → F5 → A5 → F5 → D5 — a slow lullaby phrase in D minor that
    // resolves to its own root. Plays twice in the loop. Celesta
    // voice (sine fundamental + 3rd harmonic + slight detune
    // shimmer) — same timbre family as the shimmer triad above so
    // the phrase reads as the dream-pad's "voice" rather than a
    // separate instrument.

    type MelodyNote = { pitchHz: number; durationSec: number };
    const motif: MelodyNote[] = [
      { pitchHz: D5, durationSec: 1.4 },
      { pitchHz: F5, durationSec: 1.4 },
      { pitchHz: A5, durationSec: 2.2 },
      { pitchHz: F5, durationSec: 1.4 },
      { pitchHz: D5, durationSec: 2.6 },
    ];
    const melodyDecaySec = 1.2;
    const melodyGain = 0.20;
    // Loop-time offsets — keep tail clear: motif total = 9 s; each
    // note has audible decay of melodyDecaySec × 5 + reverb (~12 s).
    // The pass starting at loop-time 5 s ends at 14 s + 12 s = 26 s,
    // well before the 33 s tail-crossfade region begins.
    const melodyStartsLoopSec = [5, 19];

    const melodyLeft = new Float32Array(totalSamples);
    const melodyRight = new Float32Array(totalSamples);
    for (const loopStartSec of melodyStartsLoopSec) {
      let cursor = Math.floor((WARMUP_SEC + loopStartSec) * sr);
      for (const note of motif) {
        const fund = sineOsc(note.pitchHz, sr);
        const harm = sineOsc(note.pitchHz * 3, sr);
        const shimmer = sineOsc(note.pitchHz * 1.001, sr);
        const env = expDecay(melodyDecaySec, sr);
        const renderLen = Math.min(
          totalSamples - cursor,
          Math.floor(sr * melodyDecaySec * 5),
        );
        for (let i = 0; i < renderLen; i++) {
          const e = env();
          const v =
            (fund() * 0.55 + harm() * 0.15 + shimmer() * 0.25) * e * melodyGain;
          const { left: l, right: r } = pan(v, -0.05);
          melodyLeft[cursor + i]! += l;
          melodyRight[cursor + i]! += r;
        }
        cursor += Math.floor(note.durationSec * sr);
      }
    }

    /* ----- Mix + reverb ------------------------------------------ */

    const verb = schroederReverb({ tailSec: 6, wet: 0.45, sampleRate: sr });
    const wetLeft = new Float32Array(totalSamples);
    const wetRight = new Float32Array(totalSamples);
    for (let i = 0; i < totalSamples; i++) {
      const dryL =
        (droneBuffer[i] ?? 0) +
        (shimmerLeft[i] ?? 0) +
        (dropLeft[i] ?? 0) +
        (melodyLeft[i] ?? 0);
      const dryR =
        (droneBuffer[i] ?? 0) +
        (shimmerRight[i] ?? 0) +
        (dropRight[i] ?? 0) +
        (melodyRight[i] ?? 0);
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
