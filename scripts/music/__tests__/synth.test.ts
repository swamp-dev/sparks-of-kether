import { describe, expect, it } from 'vitest';

import {
  adsr,
  biquadBandpass,
  expDecay,
  fmBell,
  ksPluck,
  lfo,
  makePrng,
  onePoleHighpass,
  onePoleLowpass,
  pan,
  sawtoothPolyBlep,
  schroederReverb,
  sineOsc,
  squarePolyBlep,
} from '../lib/synth';

const SR = 44100;

describe('makePrng', () => {
  it('produces deterministic output for the same seed', () => {
    const a = makePrng(0xdeadbeef);
    const b = makePrng(0xdeadbeef);
    for (let i = 0; i < 1000; i++) expect(a()).toBe(b());
  });

  it('produces values in [0, 1) and reasonably uniform distribution', () => {
    const r = makePrng(42);
    const buckets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const N = 100_000;
    for (let i = 0; i < N; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      buckets[Math.floor(v * 10)]!++;
    }
    // Each bucket should be within ±10 % of expected count.
    const expected = N / 10;
    for (const count of buckets) {
      expect(Math.abs(count - expected) / expected).toBeLessThan(0.1);
    }
  });
});

describe('sineOsc', () => {
  it('produces a periodic signal bounded in [-1, 1]', () => {
    const osc = sineOsc(441, SR); // 100 samples / cycle
    const samples: number[] = [];
    for (let i = 0; i < 200; i++) samples.push(osc());
    for (const s of samples) {
      expect(s).toBeGreaterThanOrEqual(-1);
      expect(s).toBeLessThanOrEqual(1);
    }
    // Sample 0 ≈ 0, sample 25 ≈ 1 (quarter cycle), sample 50 ≈ 0
    expect(Math.abs(samples[0]!)).toBeLessThan(1e-6);
    expect(samples[25]!).toBeGreaterThan(0.99);
    expect(Math.abs(samples[50]!)).toBeLessThan(1e-6);
    // Periodicity: samples[100] ≈ samples[0]
    expect(Math.abs(samples[100]! - samples[0]!)).toBeLessThan(1e-6);
  });
});

describe('sawtoothPolyBlep + squarePolyBlep', () => {
  it('produces bounded output', () => {
    const saw = sawtoothPolyBlep(220, SR);
    const sq = squarePolyBlep(220, SR);
    for (let i = 0; i < 1000; i++) {
      const s = saw();
      const q = sq();
      // PolyBLEP can overshoot slightly at the discontinuity; allow a small margin.
      expect(Math.abs(s)).toBeLessThan(1.2);
      expect(Math.abs(q)).toBeLessThan(1.2);
    }
  });

  it('saw has non-zero DC-reduced energy', () => {
    const saw = sawtoothPolyBlep(220, SR);
    let sumSq = 0;
    const N = 4410;
    for (let i = 0; i < N; i++) {
      const v = saw();
      sumSq += v * v;
    }
    expect(Math.sqrt(sumSq / N)).toBeGreaterThan(0.3);
  });
});

describe('adsr envelope', () => {
  it('starts at 0, rises during attack, falls to sustain, releases to 0', () => {
    const env = adsr(
      { attackSec: 0.01, decaySec: 0.01, sustainLevel: 0.5, releaseSec: 0.01, holdSec: 0.02 },
      SR,
    );
    const totalSamples = Math.floor(SR * 0.05);
    const samples: number[] = [];
    for (let i = 0; i < totalSamples; i++) samples.push(env());

    expect(samples[0]!).toBeLessThan(0.05);
    // Peak somewhere near the end of attack
    const attackEnd = Math.floor(SR * 0.01);
    expect(samples[attackEnd]!).toBeGreaterThan(0.9);
    // Sustain plateau
    const sustainSample = Math.floor(SR * 0.025);
    expect(Math.abs(samples[sustainSample]! - 0.5)).toBeLessThan(0.05);
    // After release
    const last = samples.at(-1)!;
    expect(last).toBeLessThan(0.05);
  });
});

describe('expDecay envelope', () => {
  it('starts at 1 and decays toward 0', () => {
    const env = expDecay(0.1, SR); // 100ms time constant
    const v0 = env();
    expect(v0).toBeCloseTo(1, 2);
    // After one time-constant (~SR * 0.1 samples), value ≈ 1/e ≈ 0.368
    for (let i = 0; i < Math.floor(SR * 0.1) - 1; i++) env();
    const vt = env();
    expect(Math.abs(vt - 1 / Math.E)).toBeLessThan(0.02);
  });
});

describe('onePoleLowpass / onePoleHighpass', () => {
  it('lowpass passes DC and attenuates high frequencies', () => {
    const lp = onePoleLowpass(100, SR);
    let dc = 0;
    for (let i = 0; i < 5000; i++) dc = lp.process(1);
    expect(Math.abs(dc - 1)).toBeLessThan(0.01);

    const lp2 = onePoleLowpass(100, SR);
    let sumSq = 0;
    const N = 10_000;
    for (let i = 0; i < N; i++) {
      // Nyquist-adjacent square wave: alternating ±1.
      const x = i % 2 === 0 ? 1 : -1;
      const y = lp2.process(x);
      sumSq += y * y;
    }
    expect(Math.sqrt(sumSq / N)).toBeLessThan(0.1);
  });

  it('highpass blocks DC and passes high frequencies (steady state)', () => {
    const hp = onePoleHighpass(2000, SR);
    let lastDc = 0;
    for (let i = 0; i < 20_000; i++) lastDc = hp.process(1);
    expect(Math.abs(lastDc)).toBeLessThan(0.05);
  });
});

describe('biquadBandpass', () => {
  it('produces bounded output for white noise input', () => {
    const bp = biquadBandpass(800, 4, SR);
    const r = makePrng(7);
    let peak = 0;
    for (let i = 0; i < 10_000; i++) {
      const y = bp.process(r() * 2 - 1);
      peak = Math.max(peak, Math.abs(y));
    }
    expect(peak).toBeLessThan(10); // sanity: not blowing up
  });
});

describe('lfo', () => {
  it('produces a slow oscillation in [-1, 1]', () => {
    const l = lfo(0.1, SR);
    let min = Infinity;
    let max = -Infinity;
    // 20 seconds → 2 full cycles at 0.1 Hz
    for (let i = 0; i < SR * 20; i++) {
      const v = l();
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
    expect(max).toBeGreaterThan(0.99);
    expect(min).toBeLessThan(-0.99);
  });
});

describe('ksPluck', () => {
  it('produces signal with the right fundamental period', () => {
    const freq = 440;
    const expectedPeriod = Math.round(SR / freq);
    const ks = ksPluck(freq, SR, makePrng(1));
    const samples: number[] = [];
    for (let i = 0; i < SR * 0.2; i++) samples.push(ks());

    // Autocorrelate around the expected period and find peak.
    const window = 20;
    let bestLag = 0;
    let bestCorr = -Infinity;
    for (let lag = expectedPeriod - window; lag <= expectedPeriod + window; lag++) {
      let s = 0;
      const N = 4000;
      for (let i = 0; i < N; i++) s += samples[1000 + i]! * samples[1000 + i + lag]!;
      if (s > bestCorr) {
        bestCorr = s;
        bestLag = lag;
      }
    }
    expect(Math.abs(bestLag - expectedPeriod)).toBeLessThanOrEqual(2);
  });
});

describe('fmBell', () => {
  it('starts with audible signal and decays toward silence', () => {
    // 0.2s time constant + 2s observation → exp(-10) ≈ 4.5e-5, well below 1%.
    const bell = fmBell({ carrierHz: 880, modHz: 1320, modIndex: 2, decaySec: 0.2 }, SR);
    const samples: number[] = [];
    for (let i = 0; i < SR * 2; i++) samples.push(bell());

    const earlyRms = rms(samples.slice(0, 1000));
    const lateRms = rms(samples.slice(samples.length - 1000));
    expect(earlyRms).toBeGreaterThan(0.05);
    expect(lateRms).toBeLessThan(earlyRms * 0.01);
  });
});

describe('schroederReverb', () => {
  it('produces a decaying impulse response with bounded RMS', () => {
    const verb = schroederReverb({ tailSec: 1, wet: 1, sampleRate: SR });
    const out: number[] = [];
    out.push(verb.process(1, 1)[0]); // first sample on left channel
    for (let i = 0; i < SR * 1.5; i++) out.push(verb.process(0, 0)[0]);

    expect(rms(out)).toBeLessThan(1); // not blowing up
    const earlyRms = rms(out.slice(0, SR / 4));
    const lateRms = rms(out.slice(SR));
    expect(lateRms).toBeLessThan(earlyRms * 0.5);
  });
});

describe('pan', () => {
  it('is equal-power: left² + right² ≈ 1 across the pan field', () => {
    for (let p = -1; p <= 1.01; p += 0.1) {
      const { left, right } = pan(1, p);
      const power = left * left + right * right;
      expect(Math.abs(power - 1)).toBeLessThan(1e-6);
    }
  });

  it('panPos -1 puts everything on the left', () => {
    const { left, right } = pan(1, -1);
    expect(left).toBeCloseTo(1, 5);
    expect(right).toBeCloseTo(0, 5);
  });
});

function rms(xs: readonly number[]): number {
  let s = 0;
  for (const x of xs) s += x * x;
  return Math.sqrt(s / xs.length);
}
