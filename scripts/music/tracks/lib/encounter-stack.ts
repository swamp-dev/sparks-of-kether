/**
 * `buildEncounterTrack` — shared synthesis pattern used by the 8
 * per-Sefirah encounter tracks landing in #528. Each track has its
 * own *character* (timbre choices, scale, reverb mix) but all share
 * a common architectural backbone:
 *
 *   1. Drone bed (one or two saws ± detune, or a square, or sines),
 *      passed through a slow-LFO-modulated lowpass.
 *   2. Optional sustained pad of detuned sines forming a chord. AM
 *      modulated for a "breathing" shimmer.
 *   3. Optional sparse events — FM bells, FM strikes, or KS plucks —
 *      sized to fit the loop's safe window without crossing the tail
 *      crossfade.
 *   4. Schroeder reverb (tail + wet are per-Sefirah).
 *   5. Linear head-into-tail crossfade so the loop is seamless.
 *
 * Frequencies are auto-aligned to integer cycles over the loop span
 * (= duration − crossfade). After the head/tail crossfade, the start
 * and end of the loop share source content; loopSeam Pearson rises
 * close to 1.
 *
 * Each track lives in its own `encounter-<key>.ts` file as a config
 * + a `buildEncounterTrack(config)` call.
 */

import {
  expDecay,
  fmBell,
  ksPluck,
  lfo,
  makePrng,
  onePoleLowpass,
  pan,
  sawtoothPolyBlep,
  schroederReverb,
  sineOsc,
  squarePolyBlep,
} from '../../lib/synth';
import type { StereoBuffer } from '../../lib/wav';
import type { TrackManifest } from '../lobby';

export type DroneShape = 'saw' | 'square' | 'sine';
export type EventKind = 'fmBell' | 'ksPluck' | 'fmStrike';

export type EncounterConfig = {
  name: string;
  durationSec: number;
  crossfadeSec: number;
  warmupSec: number;
  sampleRate: number;
  seed: number;

  /**
   * Optional sustained drone layer. Removed from the 8 per-Sefirah
   * tracks per user feedback — the constant saw bed reads as
   * "unpleasant" against the melodic motifs. Pad + melody + events
   * now carry each track without it. Kept as an optional slot so
   * future tracks can opt back in if a drone genuinely fits the
   * Sefirah's energy.
   */
  drone?: {
    pitchHz: number; // tonic root for the drone
    detuneCents: number; // ± detune for the second voice; 0 = single voice
    subPitchHz?: number; // optional sub-octave sine
    cutoffCenterHz: number;
    cutoffSwingHz: number;
    cutoffLfoCycles: number; // LFO cycles over LOOP_SPAN_SEC (integer)
    droneGain: number;
    subGain?: number;
    shape?: DroneShape; // default 'saw'
  };

  pad?: {
    pitchesHz: number[]; // base chord pitches (Hz)
    chorusCents: number; // ± detune for shadow voices; 0 = single voice each
    amCycles: number; // AM cycles over LOOP_SPAN_SEC (integer)
    gain: number;
    pans: number[]; // one per pitch
  };

  events?: {
    kind: EventKind;
    pitchesHz: number[]; // pool to draw from
    avgIntervalSec: number;
    jitterSec: number;
    panRange: number; // events panned ± this
    decaySec: number; // event decay
    gain: number;
    // Forbidden tail: any event whose audible energy crosses into the
    // last `tailSafetySec` seconds is skipped, so the loop tail stays
    // sample-identical to the head modulo reverb fuzz.
    tailSafetySec: number;
    // FM-only: modulator ratio relative to carrier. Default 1.5.
    fmModRatio?: number;
    fmModIndex?: number;
    // FM strike: shorter envelope vs. bell — gives a percussive transient.
    isStrike?: boolean;
    // KS-only: decay coefficient (closer to 1 = longer pluck tail).
    ksDecayCoef?: number;
  };

  /**
   * Optional melodic motif. Plays a fixed sequence of notes at one or
   * more loop-time offsets. Distinct from `events` (which is sparse,
   * random, accent-style) — `melody` is the structured tune that
   * sits on top of the drone bed and carries the per-Sefirah
   * character. Default voice: celesta (sine fundamental + 3rd
   * harmonic + slight detune shimmer), matching the lobby track's
   * twinkle layer.
   *
   * Each `startOffsetsLoopSec` value is the loop-time second at which
   * the motif begins. Multiple offsets repeat the motif at different
   * positions — give it breathing room (≥ motifTotalSec + 2 s gap)
   * between passes. The melody is forbidden from any region whose
   * audible tail (decay × 5 + reverb headroom) reaches the tail
   * crossfade window — `tailSafetySec` enforces this.
   */
  melody?: {
    notes: ReadonlyArray<{ pitchHz: number; durationSec: number }>;
    startOffsetsLoopSec: ReadonlyArray<number>;
    gain: number;
    decaySec: number; // exponential decay per note
    pan?: number; // single pan (default 0 = centred)
    voice?: 'celesta' | 'fmBell'; // default 'celesta'
    tailSafetySec: number;
    // FM-only: modulator ratio relative to carrier. Default 1.5.
    fmModRatio?: number;
    fmModIndex?: number;
  };

  reverb: {
    tailSec: number;
    wet: number;
  };

  qaGates: {
    minLoopSeam: number;
    minLufs: number;
    maxLufs: number;
    maxPeakDbfs: number;
    maxSilenceSec: number;
    maxBytes: number;
  };
};

function freqWithIntegerCycles(targetHz: number, durationSec: number): number {
  return Math.round(targetHz * durationSec) / durationSec;
}

function makeDroneOscillator(
  freqHz: number,
  sampleRate: number,
  shape: DroneShape,
): () => number {
  if (shape === 'square') return squarePolyBlep(freqHz, sampleRate);
  if (shape === 'sine') return sineOsc(freqHz, sampleRate);
  return sawtoothPolyBlep(freqHz, sampleRate);
}

export function buildEncounterTrack(config: EncounterConfig): TrackManifest {
  const {
    name,
    durationSec,
    crossfadeSec,
    warmupSec,
    sampleRate,
    seed,
    drone,
    pad,
    events,
    melody,
    reverb,
    qaGates,
  } = config;

  return {
    name,
    durationSec,
    sampleRate,
    seed,
    qaGates: {
      crossfadeSec,
      ...qaGates,
    },
    render(): StereoBuffer {
      const sr = sampleRate;
      const N = sr * durationSec;
      const W = sr * warmupSec;
      const M = Math.floor(crossfadeSec * sr);
      const totalSamples = W + N;
      const loopSpanSec = durationSec - crossfadeSec;

      /* ----- Drone bed (optional) --------------------------------- */
      // Removed from the 8 per-Sefirah tracks; the pad + melody +
      // events carry each loop on their own. Block stays here so a
      // future track can opt back into the drone if its character
      // genuinely needs the constant low layer.

      const droneBuffer = new Float32Array(totalSamples);
      if (drone !== undefined) {
        if (drone.detuneCents < 0) {
          throw new Error(
            `drone.detuneCents must be >= 0 (treated as magnitude). For a single voice, use 0.`,
          );
        }
        const shape = drone.shape ?? 'saw';
        const detuneA = Math.pow(2, -drone.detuneCents / 1200);
        const detuneB = Math.pow(2, +drone.detuneCents / 1200);
        const droneAFreq = freqWithIntegerCycles(drone.pitchHz * detuneA, loopSpanSec);
        const droneBFreq = freqWithIntegerCycles(drone.pitchHz * detuneB, loopSpanSec);
        const oscA = makeDroneOscillator(droneAFreq, sr, shape);
        const oscB =
          drone.detuneCents > 0
            ? makeDroneOscillator(droneBFreq, sr, shape)
            : null;
        const subOsc =
          drone.subPitchHz !== undefined
            ? sineOsc(freqWithIntegerCycles(drone.subPitchHz, loopSpanSec), sr)
            : null;
        const subGain = drone.subGain ?? 0;

        const cutoffLfoHz = drone.cutoffLfoCycles / loopSpanSec;
        const cutoffLfo = lfo(cutoffLfoHz, sr);
        const lp = onePoleLowpass(drone.cutoffCenterHz, sr);

        for (let i = 0; i < totalSamples; i++) {
          const cutoff = drone.cutoffCenterHz + drone.cutoffSwingHz * cutoffLfo();
          lp.setCutoff(cutoff);
          const a = oscA();
          const b = oscB === null ? 0 : oscB();
          const mix = oscB === null ? a : (a + b) * 0.5;
          const filtered = lp.process(mix);
          const sub = subOsc === null ? 0 : subOsc() * subGain;
          droneBuffer[i] = filtered * drone.droneGain + sub;
        }
      }

      /* ----- Pad / shimmer ---------------------------------------- */

      const padLeft = new Float32Array(totalSamples);
      const padRight = new Float32Array(totalSamples);
      if (pad !== undefined) {
        const amHz = pad.amCycles / loopSpanSec;
        const am = sineOsc(amHz, sr);
        // Two voices per pitch when chorusCents > 0; one when 0.
        const voices: { osc: () => number; pan: number }[] = [];
        for (let p = 0; p < pad.pitchesHz.length; p++) {
          const pitchHz = pad.pitchesHz[p] ?? 440;
          const panPos = pad.pans[p] ?? 0;
          if (pad.chorusCents > 0) {
            const up = freqWithIntegerCycles(
              pitchHz * Math.pow(2, +pad.chorusCents / 1200),
              loopSpanSec,
            );
            const dn = freqWithIntegerCycles(
              pitchHz * Math.pow(2, -pad.chorusCents / 1200),
              loopSpanSec,
            );
            voices.push({ osc: sineOsc(up, sr), pan: panPos });
            voices.push({ osc: sineOsc(dn, sr), pan: -panPos });
          } else {
            const baseFreq = freqWithIntegerCycles(pitchHz, loopSpanSec);
            voices.push({ osc: sineOsc(baseFreq, sr), pan: panPos });
          }
        }
        for (let i = 0; i < totalSamples; i++) {
          const amVal = 0.5 + 0.5 * am();
          for (const v of voices) {
            const s = v.osc() * pad.gain * amVal;
            const { left: l, right: r } = pan(s, v.pan);
            padLeft[i]! += l;
            padRight[i]! += r;
          }
        }
      }

      /* ----- Events (sparse FM bells / strikes / KS plucks) ------- */

      const evtLeft = new Float32Array(totalSamples);
      const evtRight = new Float32Array(totalSamples);
      if (events !== undefined) {
        const rng = makePrng(seed);
        const earliestSec = warmupSec + crossfadeSec + 1;
        const latestSec =
          warmupSec + durationSec - crossfadeSec - events.tailSafetySec;

        type Evt = { startSample: number; pitchHz: number; panPos: number };
        const list: Evt[] = [];
        let cursor = earliestSec + 1;
        while (true) {
          const interval =
            events.avgIntervalSec + (rng() * 2 - 1) * events.jitterSec;
          cursor += interval;
          if (cursor >= latestSec) break;
          const pitchHz =
            events.pitchesHz[Math.floor(rng() * events.pitchesHz.length)] ??
            (events.pitchesHz[0] ?? 440);
          const panPos = (rng() * 2 - 1) * events.panRange;
          list.push({
            startSample: Math.floor(cursor * sr),
            pitchHz,
            panPos,
          });
        }

        for (const ev of list) {
          if (events.kind === 'fmBell' || events.kind === 'fmStrike') {
            const carrier = ev.pitchHz;
            const modHz = carrier * (events.fmModRatio ?? 1.5);
            const modIndex = events.fmModIndex ?? (events.isStrike ? 4 : 2);
            const decaySec = events.decaySec;
            const bell = fmBell({ carrierHz: carrier, modHz, modIndex, decaySec }, sr);
            const renderLen = Math.min(
              totalSamples - ev.startSample,
              Math.floor(sr * decaySec * 5),
            );
            for (let i = 0; i < renderLen; i++) {
              const s = bell() * events.gain;
              const { left: l, right: r } = pan(s, ev.panPos);
              evtLeft[ev.startSample + i]! += l;
              evtRight[ev.startSample + i]! += r;
            }
          } else if (events.kind === 'ksPluck') {
            const ks = ksPluck(
              ev.pitchHz,
              sr,
              makePrng(seed ^ ev.startSample),
              events.ksDecayCoef ?? 0.998,
            );
            const env = expDecay(events.decaySec, sr);
            const renderLen = Math.min(
              totalSamples - ev.startSample,
              Math.floor(sr * Math.max(events.decaySec, 1.0)),
            );
            for (let i = 0; i < renderLen; i++) {
              const s = ks() * env() * events.gain;
              const { left: l, right: r } = pan(s, ev.panPos);
              evtLeft[ev.startSample + i]! += l;
              evtRight[ev.startSample + i]! += r;
            }
          }
        }
      }

      /* ----- Melody (structured motif) ---------------------------- */
      // A celesta-like voice (sine fundamental + 3rd harmonic + slight
      // detune shimmer) playing a fixed sequence of notes at one or
      // more loop-time offsets. Each note has its own exponential
      // decay envelope so consecutive notes don't bleed.

      const melodyLeft = new Float32Array(totalSamples);
      const melodyRight = new Float32Array(totalSamples);
      if (melody !== undefined) {
        const motifTotalSec = melody.notes.reduce((sum, n) => sum + n.durationSec, 0);
        const voice = melody.voice ?? 'celesta';
        const melodyPan = melody.pan ?? 0;
        const safeLatestRawSec =
          warmupSec + durationSec - crossfadeSec - melody.tailSafetySec;
        for (const startLoopSec of melody.startOffsetsLoopSec) {
          const startRawSec = warmupSec + startLoopSec;
          if (startRawSec + motifTotalSec > safeLatestRawSec) {
            // A pass that would cross the tail-safety window is a
            // config error, not a runtime fallback — silently
            // dropping it loses the intended motif. Throw early so
            // the caller sees the boundary and re-times.
            throw new Error(
              `melody pass at loop-time ${startLoopSec.toFixed(2)}s extends past ` +
                `the tail-safety boundary (motif ends at ` +
                `${(startLoopSec + motifTotalSec).toFixed(2)}s; safe latest = ` +
                `${(durationSec - crossfadeSec - melody.tailSafetySec).toFixed(2)}s). ` +
                `Either advance the offset or shrink tailSafetySec.`,
            );
          }
          let cursor = Math.floor(startRawSec * sr);
          for (const note of melody.notes) {
            const renderLen = Math.min(
              totalSamples - cursor,
              Math.floor(sr * melody.decaySec * 5),
            );
            if (voice === 'celesta') {
              const fund = sineOsc(note.pitchHz, sr);
              const harm = sineOsc(note.pitchHz * 3, sr);
              const shimmer = sineOsc(note.pitchHz * 1.001, sr);
              const env = expDecay(melody.decaySec, sr);
              for (let i = 0; i < renderLen; i++) {
                const e = env();
                const v =
                  (fund() * 0.55 + harm() * 0.15 + shimmer() * 0.25) *
                  e *
                  melody.gain;
                const { left: l, right: r } = pan(v, melodyPan);
                melodyLeft[cursor + i]! += l;
                melodyRight[cursor + i]! += r;
              }
            } else {
              const carrier = note.pitchHz;
              const modHz = carrier * (melody.fmModRatio ?? 1.5);
              const modIndex = melody.fmModIndex ?? 2;
              const bell = fmBell(
                { carrierHz: carrier, modHz, modIndex, decaySec: melody.decaySec },
                sr,
              );
              for (let i = 0; i < renderLen; i++) {
                const v = bell() * melody.gain;
                const { left: l, right: r } = pan(v, melodyPan);
                melodyLeft[cursor + i]! += l;
                melodyRight[cursor + i]! += r;
              }
            }
            cursor += Math.floor(note.durationSec * sr);
          }
        }
      }

      /* ----- Mix + reverb ----------------------------------------- */

      const verb = schroederReverb({
        tailSec: reverb.tailSec,
        wet: reverb.wet,
        sampleRate: sr,
      });
      const wetLeft = new Float32Array(totalSamples);
      const wetRight = new Float32Array(totalSamples);
      for (let i = 0; i < totalSamples; i++) {
        const dryL =
          (droneBuffer[i] ?? 0) +
          (padLeft[i] ?? 0) +
          (evtLeft[i] ?? 0) +
          (melodyLeft[i] ?? 0);
        const dryR =
          (droneBuffer[i] ?? 0) +
          (padRight[i] ?? 0) +
          (evtRight[i] ?? 0) +
          (melodyRight[i] ?? 0);
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
}

// Default QA gates after the constant-drone removal.
//
// `minLoopSeam: 0.85` — kept enabled. Tracks with a pad
// (Kether/Binah/Chesed/Tiferet/Netzach) inherit this default and the
// integer-cycle-aligned pad voices give them seams near 1.000. Tracks
// without a pad (Chokmah/Gevurah/Hod) override this to 0 in their
// per-track qaGates because head/tail Pearson is meaningless when
// both regions are near-silent. Per-track override is a deliberate
// choice for the rhythmic-only tracks; the regression detector stays
// active everywhere else.
//
// `minLufs: -32` — widened from -20 to fit the quieter post-drone
// mix. Upper bound stays at -16 so encounters still sit louder than
// lobby.
//
// `maxSilenceSec: 12` — widened from 1 to accommodate the rhythmic
// tracks. With a 36 s loop and only events + melody, gaps of 6-10 s
// between rhythmic content are normal and read as "music with
// breath." 12 s is the upper end of plausible silence on a 36 s
// loop; anything longer probably indicates a config error and should
// fail the gate.
export const DEFAULT_QA_GATES = {
  minLoopSeam: 0.85,
  minLufs: -32,
  maxLufs: -16,
  maxPeakDbfs: -1,
  maxSilenceSec: 12,
  // 36 s at libmp3lame -q 4 averages ~140 kbps for ambient drones
  // (~500 KB per file) but rises to ~150-160 kbps for tracks rich in
  // percussive transients (FM strikes / dense plucks). 750 KB caps the
  // outliers at ~165 kbps without forcing audibly-bad re-encoding —
  // total per-Sefirah budget across 9 tracks stays under 7 MB.
  maxBytes: 750 * 1024,
} as const;

// Standard durations / warmup. Encounters share these.
export const DEFAULT_DURATION_SEC = 36;
export const DEFAULT_CROSSFADE_SEC = 3;
export const DEFAULT_WARMUP_SEC = 8;
export const DEFAULT_SAMPLE_RATE = 44100;
