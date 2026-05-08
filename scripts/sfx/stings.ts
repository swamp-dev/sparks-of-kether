/**
 * Per-Sefirah avatar-arrival stings (#484).
 *
 * 9 short (1-1.5 s) audio stings — one per Sefirah avatar — that play
 * when the avatar's portrait appears in the EncounterScreen prep
 * sub-state. Built on the same synth toolkit as the music tracks,
 * so the stings sit in the same sonic palette as the route music
 * and feel coherent across the whole game.
 *
 * One sting per avatar:
 *   Athena    (Chokmah/wisdom)   — sharp intelligent strike + harmonic ping
 *   Demeter   (Binah/mother)     — slow low chord swell + fade
 *   Zeus      (Chesed/generosity)— big regal major-chord burst
 *   Ares      (Gevurah/severity) — short tritone hit, dry
 *   Apollo    (Tiferet/beauty)   — lyrical harp arpeggio over sustained sine
 *   Aphrodite (Netzach/passion)  — flowing KS pluck cascade with vibrato
 *   Hermes    (Hod/trickster)    — quick FM strike + descending arpeggio
 *   Selene    (Yesod/moon)       — dreamy KS pluck with long reverb
 *   Hestia    (Malkuth/hearth)   — warm sustained sine with soft swell
 *
 * Stings are non-looping; no loop-seam alignment is needed. Each
 * starts from silence and ends in silence (with reverb tail) so
 * playback into the existing useSound hook is well-behaved.
 */

import {
  expDecay,
  fmBell,
  ksPluck,
  makePrng,
  onePoleLowpass,
  pan,
  sawtoothPolyBlep,
  schroederReverb,
  sineOsc,
} from '../music/lib/synth';
import type { StereoBuffer } from '../music/lib/wav';

export type StingManifest = {
  name: string;
  durationSec: number;
  sampleRate: number;
  render: () => StereoBuffer;
};

const SR = 44100;

// Sample-count helper. Some sting durations (1.4 s) multiply to a
// non-integer double (44100 × 1.4 = 61740.0000000...01 in IEEE 754),
// which causes the typed-array constructor to allocate `Math.trunc(N)`
// elements while a `for (let i = 0; i < N; i++)` loop runs one
// iteration past that length. The extra write is silent (typed arrays
// drop OOB writes) and the file is correct, but rounding fixes the
// arithmetic at source so subsequent maintainers don't trip on the
// same edge.
function nSamples(durationSec: number): number {
  return Math.round(SR * durationSec);
}

function emptyBuffers(samples: number): { left: Float32Array; right: Float32Array } {
  return { left: new Float32Array(samples), right: new Float32Array(samples) };
}

function applyReverb(
  left: Float32Array,
  right: Float32Array,
  tailSec: number,
  wet: number,
): { left: Float32Array; right: Float32Array } {
  const verb = schroederReverb({ tailSec, wet, sampleRate: SR });
  const wL = new Float32Array(left.length);
  const wR = new Float32Array(left.length);
  for (let i = 0; i < left.length; i++) {
    const [l, r] = verb.process(left[i] ?? 0, right[i] ?? 0);
    wL[i] = l;
    wR[i] = r;
  }
  return { left: wL, right: wR };
}

/* ===================== Athena — Chokmah (wisdom) ===================== */
// Sharp insight: single bright FM bell at A6 + harmonic ping at E7.
// Short, decisive. Light reverb wash.
const athena: StingManifest = {
  name: 'avatar-arrives-athena',
  durationSec: 1.4,
  sampleRate: SR,
  render(): StereoBuffer {
    const N = nSamples(1.4);
    const { left, right } = emptyBuffers(N);
    const bell = fmBell(
      { carrierHz: 1760, modHz: 2640, modIndex: 3, decaySec: 0.4 },
      SR,
    );
    const ping = fmBell(
      { carrierHz: 2637, modHz: 3956, modIndex: 1.5, decaySec: 0.3 },
      SR,
    );
    const pingDelay = Math.floor(SR * 0.08);
    const gain = 0.35;
    for (let i = 0; i < N; i++) {
      const a = bell() * gain;
      const b = i >= pingDelay ? ping() * gain * 0.7 : 0;
      const { left: l, right: r } = pan(a + b, 0);
      left[i] = l;
      right[i] = r;
    }
    return { ...applyReverb(left, right, 1.5, 0.30), sampleRate: SR };
  },
};

/* ===================== Demeter — Binah (mother) ====================== */
// Slow low chord (Bb minor) swell + fade. Warm, weighty.
const demeter: StingManifest = {
  name: 'avatar-arrives-demeter',
  durationSec: 1.5,
  sampleRate: SR,
  render(): StereoBuffer {
    const N = nSamples(1.5);
    const { left, right } = emptyBuffers(N);
    // Bb minor triad — Bb2, Db3, F3.
    const oscs = [
      sawtoothPolyBlep(116.54, SR),
      sawtoothPolyBlep(138.59, SR),
      sawtoothPolyBlep(174.61, SR),
    ];
    const lp = onePoleLowpass(700, SR);
    const gain = 0.25;
    const attackSamples = SR * 0.4;
    const releaseStart = N - SR * 0.5;
    for (let i = 0; i < N; i++) {
      let mix = 0;
      for (const o of oscs) mix += o() * (1 / oscs.length);
      const filtered = lp.process(mix);
      const env =
        i < attackSamples
          ? i / attackSamples
          : i < releaseStart
            ? 1
            : Math.max(0, 1 - (i - releaseStart) / (N - releaseStart));
      const s = filtered * gain * env;
      left[i] = s;
      right[i] = s;
    }
    return { ...applyReverb(left, right, 2.5, 0.40), sampleRate: SR };
  },
};

/* ===================== Zeus — Chesed (generosity) ==================== */
// Big regal C major chord burst. Detuned saws, bright, generous tail.
const zeus: StingManifest = {
  name: 'avatar-arrives-zeus',
  durationSec: 1.4,
  sampleRate: SR,
  render(): StereoBuffer {
    const N = nSamples(1.4);
    const { left, right } = emptyBuffers(N);
    // C major: C2, E2, G2, C3, E3, G3 — wide.
    const lo = [65.41, 82.41, 98.0];
    const hi = [130.81, 164.81, 196.0];
    const loOscs = lo.map((f) => sawtoothPolyBlep(f, SR));
    const hiOscs = hi.map((f) => sawtoothPolyBlep(f * Math.pow(2, +5 / 1200), SR));
    const hiOscsB = hi.map((f) => sawtoothPolyBlep(f * Math.pow(2, -5 / 1200), SR));
    const lp = onePoleLowpass(1500, SR);
    const decay = expDecay(0.7, SR);
    const gain = 0.25;
    for (let i = 0; i < N; i++) {
      let mix = 0;
      for (const o of loOscs) mix += o() * (1 / 9);
      for (const o of hiOscs) mix += o() * (1 / 9);
      for (const o of hiOscsB) mix += o() * (1 / 9);
      const env = decay();
      const s = lp.process(mix) * env * gain;
      // Wide stereo from per-side bias.
      const { left: l, right: r } = pan(s, 0);
      left[i] = l;
      right[i] = r;
    }
    return { ...applyReverb(left, right, 2.5, 0.45), sampleRate: SR };
  },
};

/* ===================== Ares — Gevurah (severity) ==================== */
// Short tritone hit. F# + C square waves. Dry. Edge.
const ares: StingManifest = {
  name: 'avatar-arrives-ares',
  durationSec: 1.0,
  sampleRate: SR,
  render(): StereoBuffer {
    const N = nSamples(1.0);
    const { left, right } = emptyBuffers(N);
    const gain = 0.32;
    // F#3 + C3 (tritone). FM strikes.
    const fSharp = fmBell(
      { carrierHz: 185.0, modHz: 555.0, modIndex: 4, decaySec: 0.4 },
      SR,
    );
    const c = fmBell(
      { carrierHz: 130.81, modHz: 392.43, modIndex: 4, decaySec: 0.4 },
      SR,
    );
    const cDelay = Math.floor(SR * 0.04);
    for (let i = 0; i < N; i++) {
      const a = fSharp();
      const b = i >= cDelay ? c() : 0;
      const s = (a + b) * gain;
      left[i] = s * 0.85;
      right[i] = s * 0.85;
    }
    // Very dry — discipline doesn't sing.
    return { ...applyReverb(left, right, 0.5, 0.12), sampleRate: SR };
  },
};

/* ===================== Apollo — Tiferet (beauty) ==================== */
// Lyrical harp arpeggio over a sustained sine drone. E major.
const apollo: StingManifest = {
  name: 'avatar-arrives-apollo',
  durationSec: 1.5,
  sampleRate: SR,
  render(): StereoBuffer {
    const N = nSamples(1.5);
    const { left, right } = emptyBuffers(N);
    // E major: E5, G#5, B5, E6.
    const arp = [659.25, 830.61, 987.77, 1318.51];
    const noteSpacingSec = 0.12;
    const sustain = sineOsc(659.25, SR);
    const sustainGain = 0.10;
    const arpGain = 0.20;

    // Sustained sine throughout.
    for (let i = 0; i < N; i++) {
      const env =
        i < SR * 0.1
          ? i / (SR * 0.1)
          : i > N - SR * 0.3
            ? Math.max(0, (N - i) / (SR * 0.3))
            : 1;
      const s = sustain() * sustainGain * env;
      left[i] = s * 0.6;
      right[i] = s * 0.6;
    }

    // Harp arpeggio on top.
    for (let n = 0; n < arp.length; n++) {
      const startSample = Math.floor(n * noteSpacingSec * SR);
      const ks = ksPluck(arp[n] ?? 659.25, SR, makePrng(0xa901100 + n), 0.998);
      const env = expDecay(0.4, SR);
      const renderLen = Math.min(N - startSample, Math.floor(SR * 0.8));
      const panPos = (n / (arp.length - 1)) * 1 - 0.5; // -0.5 .. 0.5
      for (let i = 0; i < renderLen; i++) {
        const s = ks() * env() * arpGain;
        const { left: l, right: r } = pan(s, panPos);
        left[startSample + i]! += l;
        right[startSample + i]! += r;
      }
    }
    return { ...applyReverb(left, right, 2.0, 0.40), sampleRate: SR };
  },
};

/* ===================== Aphrodite — Netzach (passion) ================ */
// Flowing KS pluck cascade up-and-down with detuned chorus. G major.
const aphrodite: StingManifest = {
  name: 'avatar-arrives-aphrodite',
  durationSec: 1.5,
  sampleRate: SR,
  render(): StereoBuffer {
    const N = nSamples(1.5);
    const { left, right } = emptyBuffers(N);
    // G major arpeggio: G4, B4, D5, G5, D5, B4.
    const cascade = [392.0, 493.88, 587.33, 783.99, 587.33, 493.88];
    const noteSpacingSec = 0.10;
    const gain = 0.20;
    for (let n = 0; n < cascade.length; n++) {
      const startSample = Math.floor(n * noteSpacingSec * SR);
      const ks = ksPluck(cascade[n] ?? 392, SR, makePrng(0xaf01100 + n), 0.998);
      const env = expDecay(0.5, SR);
      const renderLen = Math.min(N - startSample, Math.floor(SR * 0.9));
      const panPos = Math.sin((n / cascade.length) * Math.PI * 2) * 0.4;
      for (let i = 0; i < renderLen; i++) {
        const s = ks() * env() * gain;
        const { left: l, right: r } = pan(s, panPos);
        left[startSample + i]! += l;
        right[startSample + i]! += r;
      }
    }
    return { ...applyReverb(left, right, 1.8, 0.35), sampleRate: SR };
  },
};

/* ===================== Hermes — Hod (trickster) ===================== */
// Quick FM strike + descending bright arpeggio. Playful, fast, dry.
const hermes: StingManifest = {
  name: 'avatar-arrives-hermes',
  durationSec: 1.0,
  sampleRate: SR,
  render(): StereoBuffer {
    const N = nSamples(1.0);
    const { left, right } = emptyBuffers(N);
    // Descending D minor: A6, F6, D6, A5.
    const desc = [1760, 1396.91, 1174.66, 880];
    const noteSpacingSec = 0.07;
    const gain = 0.28;
    // Initial strike.
    const strike = fmBell(
      { carrierHz: 1760, modHz: 3520, modIndex: 5, decaySec: 0.15 },
      SR,
    );
    const strikeLen = Math.floor(SR * 0.3);
    for (let i = 0; i < strikeLen; i++) {
      const s = strike() * gain;
      left[i]! += s * 0.7;
      right[i]! += s * 0.7;
    }
    // Then arpeggio.
    for (let n = 0; n < desc.length; n++) {
      const startSample = Math.floor(SR * 0.08) + Math.floor(n * noteSpacingSec * SR);
      const bell = fmBell(
        { carrierHz: desc[n] ?? 1760, modHz: (desc[n] ?? 1760) * 1.5, modIndex: 1.2, decaySec: 0.2 },
        SR,
      );
      const renderLen = Math.min(N - startSample, Math.floor(SR * 0.4));
      const panPos = (n / (desc.length - 1)) * 1 - 0.5;
      for (let i = 0; i < renderLen; i++) {
        const s = bell() * gain * 0.7;
        const { left: l, right: r } = pan(s, panPos);
        left[startSample + i]! += l;
        right[startSample + i]! += r;
      }
    }
    return { ...applyReverb(left, right, 0.8, 0.20), sampleRate: SR };
  },
};

/* ===================== Selene — Yesod (moon) ======================== */
// Dreamy single KS pluck with long reverb. Cool, distant, hypnotic.
const selene: StingManifest = {
  name: 'avatar-arrives-selene',
  durationSec: 1.5,
  sampleRate: SR,
  render(): StereoBuffer {
    const N = nSamples(1.5);
    const { left, right } = emptyBuffers(N);
    const gain = 0.32;
    const ks1 = ksPluck(587.33, SR, makePrng(0x5e1e0e), 0.999); // D5
    const ks2 = ksPluck(880, SR, makePrng(0x5e1e0e + 1), 0.999); // A5
    // Single shared envelope on purpose: the A5 enters 0.18 s into
    // the decay (≈ 0.835 of peak amplitude), giving the second pluck
    // a softer-than-the-first dynamic — natural-sounding "second
    // bell" stagger that fits Selene's distant-moon character.
    const env = expDecay(1.0, SR);
    const ks2Delay = Math.floor(SR * 0.18);
    const renderLen = Math.min(N, Math.floor(SR * 1.5));
    for (let i = 0; i < renderLen; i++) {
      const a = ks1() * env() * gain;
      const b = i >= ks2Delay ? ks2() * gain * 0.7 : 0;
      const { left: lA, right: rA } = pan(a, -0.3);
      const { left: lB, right: rB } = pan(b, 0.3);
      left[i]! += lA + lB;
      right[i]! += rA + rB;
    }
    return { ...applyReverb(left, right, 3.0, 0.50), sampleRate: SR };
  },
};

/* ===================== Hestia — Malkuth (hearth) ==================== */
// Warm sustained sine with soft swell. Simple, grounded, welcoming.
const hestia: StingManifest = {
  name: 'avatar-arrives-hestia',
  durationSec: 1.5,
  sampleRate: SR,
  render(): StereoBuffer {
    const N = nSamples(1.5);
    const { left, right } = emptyBuffers(N);
    // C major triad — C4, E4, G4 — slow swell.
    const oscs = [
      sineOsc(261.63, SR),
      sineOsc(329.63, SR),
      sineOsc(392.0, SR),
    ];
    const gain = 0.18;
    const attackSamples = SR * 0.35;
    const releaseStart = N - SR * 0.4;
    for (let i = 0; i < N; i++) {
      let mix = 0;
      for (const o of oscs) mix += o() * (1 / oscs.length);
      const env =
        i < attackSamples
          ? i / attackSamples
          : i < releaseStart
            ? 1
            : Math.max(0, 1 - (i - releaseStart) / (N - releaseStart));
      const s = mix * gain * env;
      left[i] = s;
      right[i] = s;
    }
    return { ...applyReverb(left, right, 1.8, 0.35), sampleRate: SR };
  },
};

export const STINGS: readonly StingManifest[] = [
  athena,
  demeter,
  zeus,
  ares,
  apollo,
  aphrodite,
  hermes,
  selene,
  hestia,
];
