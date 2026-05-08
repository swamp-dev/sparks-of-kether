/**
 * Audio synthesis primitives — pure JS DSP. Each primitive is a small
 * factory that returns a stateful processor (closure), produced one
 * sample at a time. The toolkit covers everything the lobby track
 * needs (saw + LP + LFO + tremolo + FM bells + Schroeder reverb +
 * stereo pan + seeded PRNG) and a few extras (Karplus-Strong, biquad
 * bandpass, ADSR) for the three follow-up tracks.
 *
 * References:
 *   PolyBLEP anti-aliasing — https://www.kvraudio.com/forum/viewtopic.php?t=375517
 *   Schroeder reverberators — https://ccrma.stanford.edu/~jos/pasp/Schroeder_Reverberators.html
 *   Karplus-Strong synthesis — https://ccrma.stanford.edu/~jos/pasp/Karplus_Strong_Algorithm.html
 *   RBJ biquad cookbook — https://www.w3.org/TR/audio-eq-cookbook/
 */

export type Filter = {
  process: (x: number) => number;
  setCutoff: (hz: number) => void;
};

export type StereoFilter = {
  process: (left: number, right: number) => [number, number];
};

/* --------------------------------------------------------------------- */
/* PRNG                                                                  */
/* --------------------------------------------------------------------- */

// mulberry32 — small, fast, sufficient quality for sparse-event scheduling
// and noise excitation. Output in [0, 1).
export function makePrng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/* --------------------------------------------------------------------- */
/* Oscillators                                                           */
/* --------------------------------------------------------------------- */

export function sineOsc(freqHz: number, sampleRate: number): () => number {
  let phase = 0;
  const incr = freqHz / sampleRate;
  return () => {
    const v = Math.sin(phase * 2 * Math.PI);
    phase += incr;
    if (phase >= 1) phase -= Math.floor(phase);
    return v;
  };
}

// PolyBLEP correction term for a discontinuity at phase 0/1.
function polyBlep(t: number, dt: number): number {
  if (t < dt) {
    const x = t / dt;
    return x + x - x * x - 1;
  }
  if (t > 1 - dt) {
    const x = (t - 1) / dt;
    return x * x + x + x + 1;
  }
  return 0;
}

export function sawtoothPolyBlep(
  freqHz: number,
  sampleRate: number,
): () => number {
  let phase = 0;
  const dt = freqHz / sampleRate;
  return () => {
    let v = 2 * phase - 1;
    v -= polyBlep(phase, dt);
    phase += dt;
    if (phase >= 1) phase -= 1;
    return v;
  };
}

export function squarePolyBlep(
  freqHz: number,
  sampleRate: number,
): () => number {
  let phase = 0;
  const dt = freqHz / sampleRate;
  return () => {
    let v = phase < 0.5 ? 1 : -1;
    v += polyBlep(phase, dt);
    let t2 = phase + 0.5;
    if (t2 >= 1) t2 -= 1;
    v -= polyBlep(t2, dt);
    phase += dt;
    if (phase >= 1) phase -= 1;
    return v;
  };
}

/* --------------------------------------------------------------------- */
/* LFO — sine, low-frequency convenience wrapper                         */
/* --------------------------------------------------------------------- */

export function lfo(freqHz: number, sampleRate: number): () => number {
  return sineOsc(freqHz, sampleRate);
}

/* --------------------------------------------------------------------- */
/* Envelopes                                                             */
/* --------------------------------------------------------------------- */

// Linear ADSR with an explicit hold (sustain duration) so the envelope
// is fully scheduled at construction — no separate trigger/release event.
export function adsr(
  opts: {
    attackSec: number;
    decaySec: number;
    sustainLevel: number;
    releaseSec: number;
    holdSec: number;
  },
  sampleRate: number,
): () => number {
  const a = Math.max(1, opts.attackSec * sampleRate);
  const d = Math.max(1, opts.decaySec * sampleRate);
  const r = Math.max(1, opts.releaseSec * sampleRate);
  const h = Math.max(0, opts.holdSec * sampleRate);
  const sustain = opts.sustainLevel;
  let n = 0;
  return () => {
    let g: number;
    if (n < a) {
      g = n / a;
    } else if (n < a + d) {
      g = 1 + (sustain - 1) * ((n - a) / d);
    } else if (n < a + d + h) {
      g = sustain;
    } else if (n < a + d + h + r) {
      g = sustain * (1 - (n - a - d - h) / r);
    } else {
      g = 0;
    }
    n++;
    return g;
  };
}

// Exponential decay starting at 1.0 with the supplied time constant.
export function expDecay(timeConstSec: number, sampleRate: number): () => number {
  const k = Math.exp(-1 / Math.max(1, timeConstSec * sampleRate));
  let v = 1;
  return () => {
    const out = v;
    v *= k;
    return out;
  };
}

/* --------------------------------------------------------------------- */
/* Filters                                                               */
/* --------------------------------------------------------------------- */

function onePoleAlpha(cutoffHz: number, sampleRate: number): number {
  return 1 - Math.exp((-2 * Math.PI * cutoffHz) / sampleRate);
}

export function onePoleLowpass(cutoffHz: number, sampleRate: number): Filter {
  let last = 0;
  let alpha = onePoleAlpha(cutoffHz, sampleRate);
  return {
    process(x: number): number {
      last = last + alpha * (x - last);
      return last;
    },
    setCutoff(hz: number): void {
      alpha = onePoleAlpha(hz, sampleRate);
    },
  };
}

export function onePoleHighpass(cutoffHz: number, sampleRate: number): Filter {
  const lp = onePoleLowpass(cutoffHz, sampleRate);
  return {
    process(x: number): number {
      return x - lp.process(x);
    },
    setCutoff(hz: number): void {
      lp.setCutoff(hz);
    },
  };
}

// RBJ-cookbook bandpass (constant 0 dB peak gain). Q controls bandwidth.
export function biquadBandpass(
  centerHz: number,
  q: number,
  sampleRate: number,
): Filter {
  let b0 = 0;
  let b2 = 0;
  let a1 = 0;
  let a2 = 0;
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  function recompute(hz: number): void {
    const w0 = (2 * Math.PI * hz) / sampleRate;
    const cosw = Math.cos(w0);
    const sinw = Math.sin(w0);
    const alpha = sinw / (2 * Math.max(0.01, q));
    const a0 = 1 + alpha;
    b0 = alpha / a0;
    b2 = -alpha / a0;
    a1 = (-2 * cosw) / a0;
    a2 = (1 - alpha) / a0;
  }
  recompute(centerHz);
  return {
    process(x: number): number {
      // b1 is identically 0 for a constant-peak BPF.
      const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1;
      x1 = x;
      y2 = y1;
      y1 = y;
      return y;
    },
    setCutoff(hz: number): void {
      recompute(hz);
    },
  };
}

/* --------------------------------------------------------------------- */
/* Karplus-Strong plucked-string                                         */
/* --------------------------------------------------------------------- */

export function ksPluck(
  freqHz: number,
  sampleRate: number,
  prng: () => number,
  decayCoef = 0.998,
): () => number {
  const N = Math.max(2, Math.round(sampleRate / freqHz));
  const buffer = new Float32Array(N);
  for (let i = 0; i < N; i++) buffer[i] = prng() * 2 - 1;
  let idx = 0;
  return () => {
    const out = buffer[idx] ?? 0;
    const next = (idx + 1) % N;
    buffer[idx] = decayCoef * 0.5 * ((buffer[idx] ?? 0) + (buffer[next] ?? 0));
    idx = next;
    return out;
  };
}

/* --------------------------------------------------------------------- */
/* FM bell                                                               */
/* --------------------------------------------------------------------- */

export function fmBell(
  opts: {
    carrierHz: number;
    modHz: number;
    modIndex: number;
    decaySec: number;
  },
  sampleRate: number,
): () => number {
  const carrierIncr = (2 * Math.PI * opts.carrierHz) / sampleRate;
  const modIncr = (2 * Math.PI * opts.modHz) / sampleRate;
  const decay = expDecay(opts.decaySec, sampleRate);
  let cPhase = 0;
  let mPhase = 0;
  return () => {
    const env = decay();
    const m = Math.sin(mPhase) * opts.modIndex * env;
    const v = Math.sin(cPhase + m) * env;
    cPhase += carrierIncr;
    mPhase += modIncr;
    return v;
  };
}

/* --------------------------------------------------------------------- */
/* Schroeder reverb                                                      */
/* --------------------------------------------------------------------- */

// 4 parallel comb filters → 2 series FreeVerb-style allpass diffusers.
// (FreeVerb's `y = -x + buf[n-D]; buf[n] = x + g·buf[n-D]` is the
// canonical diffuser in this lineage; it is *not* a mathematically
// flat-magnitude allpass — its frequency response varies — but it's
// the standard structure for ambient verb and sounds correct.)
// Mono-input stereo-out, where both channels receive the same wet
// signal mixed over their own dry. Stereo richness in the lobby track
// comes from per-event panning rather than a stereo verb.
export function schroederReverb(opts: {
  tailSec: number;
  wet: number;
  sampleRate: number;
}): StereoFilter {
  const sr = opts.sampleRate;
  // FreeVerb-baseline lengths at 44.1 kHz, scaled for arbitrary sample rate.
  const combDelays = [1116, 1188, 1277, 1356].map((n) =>
    Math.max(2, Math.round(n * (sr / 44100))),
  );
  const allpassDelays = [556, 441].map((n) =>
    Math.max(2, Math.round(n * (sr / 44100))),
  );

  // RT60 ≈ -3D / (sr · log10(g)) → g = 10^(-3D / (sr·RT60)) for the longest comb.
  let longestD = 0;
  for (const d of combDelays) if (d > longestD) longestD = d;
  const feedback = Math.pow(10, (-3 * longestD) / (sr * Math.max(0.01, opts.tailSec)));

  type Comb = { buf: Float32Array; idx: number };
  const combs: Comb[] = combDelays.map((d) => ({ buf: new Float32Array(d), idx: 0 }));

  type Allpass = { buf: Float32Array; idx: number; g: number };
  const allpasses: Allpass[] = allpassDelays.map((d) => ({
    buf: new Float32Array(d),
    idx: 0,
    g: 0.5,
  }));

  function processMono(x: number): number {
    let sum = 0;
    for (const c of combs) {
      const out = c.buf[c.idx] ?? 0;
      sum += out;
      c.buf[c.idx] = x + out * feedback;
      c.idx = (c.idx + 1) % c.buf.length;
    }
    let y = sum * 0.25;
    for (const a of allpasses) {
      const bufOut = a.buf[a.idx] ?? 0;
      const ap = -y + bufOut;
      a.buf[a.idx] = y + bufOut * a.g;
      a.idx = (a.idx + 1) % a.buf.length;
      y = ap;
    }
    return y;
  }

  const wet = opts.wet;
  const dry = 1 - wet;
  return {
    process(left: number, right: number): [number, number] {
      const mono = (left + right) * 0.5;
      const w = processMono(mono);
      return [dry * left + wet * w, dry * right + wet * w];
    },
  };
}

/* --------------------------------------------------------------------- */
/* Stereo pan (equal-power)                                              */
/* --------------------------------------------------------------------- */

export function pan(sample: number, panPos: number): { left: number; right: number } {
  const p = Math.max(-1, Math.min(1, panPos));
  // [-1, 1] → [0, π/2]; cos²+sin² = 1.
  const angle = (p + 1) * (Math.PI / 4);
  return {
    left: sample * Math.cos(angle),
    right: sample * Math.sin(angle),
  };
}
