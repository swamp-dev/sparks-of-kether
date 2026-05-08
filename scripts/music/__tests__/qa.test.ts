import { describe, expect, it } from 'vitest';

import {
  loopSeamCorrelation,
  measurePeakDbfs,
  silenceRegions,
} from '../lib/qa';

const SR = 44100;

describe('measurePeakDbfs', () => {
  it('reports -inf for silence', () => {
    const left = new Float32Array(1000);
    const right = new Float32Array(1000);
    expect(measurePeakDbfs({ left, right, sampleRate: SR })).toBe(-Infinity);
  });

  it('reports 0 dBFS for full-scale signal', () => {
    const left = new Float32Array([1, 0, -1]);
    const right = new Float32Array([0, 0, 0]);
    expect(measurePeakDbfs({ left, right, sampleRate: SR })).toBe(0);
  });

  it('reports negative dBFS for sub-unit signal', () => {
    const left = new Float32Array([0.5, -0.5]);
    const right = new Float32Array([0, 0]);
    const peak = measurePeakDbfs({ left, right, sampleRate: SR });
    expect(peak).toBeCloseTo(20 * Math.log10(0.5), 4);
  });
});

describe('silenceRegions', () => {
  it('reports an empty list for steady-state signal', () => {
    const left = new Float32Array(SR);
    const right = new Float32Array(SR);
    for (let i = 0; i < SR; i++) {
      left[i] = 0.3;
      right[i] = 0.3;
    }
    const regions = silenceRegions(
      { left, right, sampleRate: SR },
      { thresholdDbfs: -50, minSec: 0.1 },
    );
    expect(regions).toEqual([]);
  });

  it('reports a region for an inserted silence longer than the minimum', () => {
    const left = new Float32Array(SR * 3);
    const right = new Float32Array(SR * 3);
    // Fill with 0.3 amplitude noise; insert 1s of silence in the middle.
    for (let i = 0; i < left.length; i++) {
      const inSilence = i >= SR && i < SR * 2;
      left[i] = inSilence ? 0 : 0.3;
      right[i] = inSilence ? 0 : 0.3;
    }
    const regions = silenceRegions(
      { left, right, sampleRate: SR },
      { thresholdDbfs: -50, minSec: 0.5 },
    );
    expect(regions).toHaveLength(1);
    expect(regions[0]!.startSec).toBeCloseTo(1, 1);
    expect(regions[0]!.durationSec).toBeCloseTo(1, 1);
  });

  it('ignores brief dips shorter than the minimum', () => {
    const left = new Float32Array(SR);
    const right = new Float32Array(SR);
    for (let i = 0; i < SR; i++) {
      const inDip = i >= 1000 && i < 2000; // ~22ms dip
      left[i] = inDip ? 0 : 0.3;
      right[i] = inDip ? 0 : 0.3;
    }
    const regions = silenceRegions(
      { left, right, sampleRate: SR },
      { thresholdDbfs: -50, minSec: 0.1 },
    );
    expect(regions).toEqual([]);
  });
});

describe('loopSeamCorrelation', () => {
  it('returns 1 for a perfectly looped signal', () => {
    // Build a buffer where the head and tail crossfade regions are
    // numerically identical: the same source samples copied to both
    // ends.
    const total = SR * 4;
    const crossfade = SR;
    const left = new Float32Array(total);
    const right = new Float32Array(total);
    for (let i = 0; i < total; i++) {
      left[i] = Math.sin((i / SR) * 2 * Math.PI * 220);
      right[i] = left[i]!;
    }
    // Force the tail crossfade region to equal the head region.
    for (let i = 0; i < crossfade; i++) {
      left[total - crossfade + i] = left[i]!;
      right[total - crossfade + i] = right[i]!;
    }
    const corr = loopSeamCorrelation(
      { left, right, sampleRate: SR },
      { crossfadeSec: 1 },
    );
    expect(corr).toBeGreaterThan(0.99);
  });

  it('returns a low value for unrelated head and tail', () => {
    const total = SR * 4;
    const left = new Float32Array(total);
    const right = new Float32Array(total);
    // Head: sine 220Hz; tail: white noise from a different seed.
    for (let i = 0; i < total; i++) {
      left[i] = Math.sin((i / SR) * 2 * Math.PI * 220);
      right[i] = left[i]!;
    }
    let s = 1234;
    for (let i = total - SR; i < total; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const n = (s / 0x7fffffff) * 2 - 1;
      left[i] = n;
      right[i] = n;
    }
    const corr = loopSeamCorrelation(
      { left, right, sampleRate: SR },
      { crossfadeSec: 1 },
    );
    expect(corr).toBeLessThan(0.5);
  });
});
