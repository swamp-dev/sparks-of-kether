/**
 * Audio quality-assurance helpers — the gates the lobby track has to
 * clear before its mp3/ogg is shipped:
 *
 *   1. Loop-seam correlation > 0.85 across a configurable crossfade.
 *   2. Integrated loudness in [-24, -16] LUFS (ambient sits quiet).
 *   3. No sample peak > -1 dBFS.
 *   4. No silent region > 2 s.
 *
 * The first three are pure-JS — testable in isolation. LUFS uses
 * ffmpeg's loudnorm filter (industry-standard EBU R128), so it
 * shells out and is not unit-tested directly; the render CLI's
 * smoke-test exercises it end to end.
 */

import { execFile } from 'node:child_process';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import type { StereoBuffer } from './wav';
import { encodeWav } from './wav';

const execFileAsync = promisify(execFile);

/* --------------------------------------------------------------------- */
/* Peak                                                                  */
/* --------------------------------------------------------------------- */

export function measurePeakDbfs(buffer: StereoBuffer): number {
  let peak = 0;
  const { left, right } = buffer;
  for (let i = 0; i < left.length; i++) {
    const l = Math.abs(left[i] ?? 0);
    const r = Math.abs(right[i] ?? 0);
    if (l > peak) peak = l;
    if (r > peak) peak = r;
  }
  if (peak === 0) return -Infinity;
  return 20 * Math.log10(peak);
}

/* --------------------------------------------------------------------- */
/* Silence detection                                                     */
/* --------------------------------------------------------------------- */

export type SilenceRegion = { startSec: number; durationSec: number };

// Slide a 50 ms RMS window over the mono mix and report contiguous runs
// where RMS drops below threshold for at least `minSec`. 50 ms is short
// enough to catch edge transients, long enough to ignore single-sample
// zero-crossings of a steady tone.
export function silenceRegions(
  buffer: StereoBuffer,
  opts: { thresholdDbfs: number; minSec: number },
): SilenceRegion[] {
  const { left, right, sampleRate } = buffer;
  const windowSamples = Math.max(1, Math.floor(sampleRate * 0.05));
  const minSamples = Math.floor(sampleRate * opts.minSec);
  const threshold = Math.pow(10, opts.thresholdDbfs / 20);

  const regions: SilenceRegion[] = [];
  let silentRun = 0;

  // Compute RMS in non-overlapping windows for speed; the resulting
  // resolution is `windowSamples` samples, which is fine at 50 ms.
  for (let start = 0; start < left.length; start += windowSamples) {
    let sumSq = 0;
    let n = 0;
    const end = Math.min(start + windowSamples, left.length);
    for (let i = start; i < end; i++) {
      const l = left[i] ?? 0;
      const r = right[i] ?? 0;
      sumSq += l * l + r * r;
      n += 2;
    }
    const rms = Math.sqrt(sumSq / Math.max(1, n));
    if (rms < threshold) {
      silentRun += end - start;
    } else if (silentRun > 0) {
      if (silentRun >= minSamples) {
        regions.push({
          startSec: (start - silentRun) / sampleRate,
          durationSec: silentRun / sampleRate,
        });
      }
      silentRun = 0;
    }
  }
  if (silentRun >= minSamples) {
    regions.push({
      startSec: (left.length - silentRun) / sampleRate,
      durationSec: silentRun / sampleRate,
    });
  }
  return regions;
}

/* --------------------------------------------------------------------- */
/* Loop-seam correlation                                                 */
/* --------------------------------------------------------------------- */

// Pearson correlation between the head (0 .. crossfadeSec) and tail
// (length-crossfadeSec .. length) regions of the mix-down.
//
// **What this measures.** This is a *crossfade-application* gate, not
// a perceptual-seam gate. When a track applies a head-into-tail
// linear crossfade (as `tracks/lobby.ts` does), the tail region ends
// up containing mostly head content; a high Pearson here confirms
// the crossfade was actually applied and didn't get corrupted by an
// off-by-one or buffer-aliasing bug. It will NOT detect an audible
// glitch at the loop wrap point (sample N-1 → sample 0), because
// after a head-into-tail crossfade the tail *is* head data and the
// wrap discontinuity lives inside the head's own first sample.
//
// For the lobby track, the wrap discontinuity is small and hidden by
// the long reverb tail + texturally-homogeneous drone; auditing it
// requires listening, not a Pearson score. If a future track has
// transient content near the loop boundary, add a separate gate that
// measures local RMS jump at the wrap point.
export function loopSeamCorrelation(
  buffer: StereoBuffer,
  opts: { crossfadeSec: number },
): number {
  const { left, right, sampleRate } = buffer;
  const N = Math.floor(opts.crossfadeSec * sampleRate);
  if (N <= 0 || N > left.length / 2) {
    throw new Error(
      `loop-seam crossfade ${opts.crossfadeSec}s is out of range for a ${(left.length / sampleRate).toFixed(1)}s buffer`,
    );
  }
  const headOffset = 0;
  const tailOffset = left.length - N;

  // Sum mono mix for each region.
  let sumH = 0;
  let sumT = 0;
  for (let i = 0; i < N; i++) {
    sumH += ((left[headOffset + i] ?? 0) + (right[headOffset + i] ?? 0)) * 0.5;
    sumT += ((left[tailOffset + i] ?? 0) + (right[tailOffset + i] ?? 0)) * 0.5;
  }
  const meanH = sumH / N;
  const meanT = sumT / N;

  let num = 0;
  let denH = 0;
  let denT = 0;
  for (let i = 0; i < N; i++) {
    const h =
      ((left[headOffset + i] ?? 0) + (right[headOffset + i] ?? 0)) * 0.5 - meanH;
    const t =
      ((left[tailOffset + i] ?? 0) + (right[tailOffset + i] ?? 0)) * 0.5 - meanT;
    num += h * t;
    denH += h * h;
    denT += t * t;
  }
  const den = Math.sqrt(denH * denT);
  if (den === 0) return 0;
  return num / den;
}

/* --------------------------------------------------------------------- */
/* LUFS via ffmpeg loudnorm                                              */
/* --------------------------------------------------------------------- */

export async function measureLufs(buffer: StereoBuffer): Promise<number> {
  const wav = encodeWav(buffer);
  const tmpPath = join(tmpdir(), `sok-music-lufs-${process.pid}-${Date.now()}.wav`);
  await writeFile(tmpPath, wav);
  try {
    // loudnorm in measurement (pass 1) mode prints a JSON block to stderr.
    const { stderr } = await execFileAsync(
      'ffmpeg',
      [
        '-hide_banner',
        '-loglevel',
        'info',
        '-i',
        tmpPath,
        '-af',
        'loudnorm=print_format=json',
        '-f',
        'null',
        '-',
      ],
      { maxBuffer: 16 * 1024 * 1024 },
    );
    return parseLoudnormJson(stderr);
  } finally {
    await unlink(tmpPath).catch(() => undefined);
  }
}

export function parseLoudnormJson(stderr: string): number {
  // ffmpeg writes the JSON at the end of stderr; find the last `{ ... }`
  // block and pull `input_i` out of it.
  const start = stderr.lastIndexOf('{');
  const end = stderr.lastIndexOf('}');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`Could not locate loudnorm JSON in ffmpeg output:\n${stderr}`);
  }
  const json = stderr.slice(start, end + 1);
  let parsed: { input_i?: string };
  try {
    parsed = JSON.parse(json) as { input_i?: string };
  } catch (e) {
    throw new Error(`Invalid loudnorm JSON: ${(e as Error).message}\n${json}`);
  }
  const inputI = parsed.input_i;
  if (typeof inputI !== 'string') {
    throw new Error(`loudnorm JSON missing input_i:\n${json}`);
  }
  // ffmpeg reports fully-silent audio as `"-inf"`. Surface it as
  // -Infinity rather than throwing — a track measured at -inf LUFS is
  // a legitimate (terrible) measurement that the gate logic should
  // see and reject through the [-24, -16] range check.
  if (inputI === '-inf') return -Infinity;
  const lufs = parseFloat(inputI);
  if (!Number.isFinite(lufs)) {
    throw new Error(`loudnorm input_i not a finite number: "${inputI}"`);
  }
  return lufs;
}

/* --------------------------------------------------------------------- */
/* Aggregate gate                                                        */
/* --------------------------------------------------------------------- */

export type QaResult = {
  ok: boolean;
  failures: string[];
  metrics: {
    loopSeam: number;
    peakDbfs: number;
    lufs: number;
    silenceRegions: SilenceRegion[];
  };
};

export async function runQa(
  buffer: StereoBuffer,
  opts: {
    crossfadeSec: number;
    minLufs: number;
    maxLufs: number;
    maxPeakDbfs: number;
    minLoopSeam: number;
    maxSilenceSec: number;
  },
): Promise<QaResult> {
  const failures: string[] = [];
  const loopSeam = loopSeamCorrelation(buffer, { crossfadeSec: opts.crossfadeSec });
  if (loopSeam < opts.minLoopSeam) {
    failures.push(
      `loop-seam correlation ${loopSeam.toFixed(3)} < ${opts.minLoopSeam}`,
    );
  }
  const peakDbfs = measurePeakDbfs(buffer);
  if (peakDbfs > opts.maxPeakDbfs) {
    failures.push(
      `peak ${peakDbfs.toFixed(2)} dBFS exceeds ${opts.maxPeakDbfs} dBFS`,
    );
  }
  const regions = silenceRegions(buffer, {
    thresholdDbfs: -50,
    minSec: opts.maxSilenceSec,
  });
  if (regions.length > 0) {
    const longest = regions.reduce((m, r) => Math.max(m, r.durationSec), 0);
    failures.push(
      `${regions.length} silent region(s) ≥ ${opts.maxSilenceSec}s (longest ${longest.toFixed(2)}s)`,
    );
  }
  const lufs = await measureLufs(buffer);
  if (lufs < opts.minLufs || lufs > opts.maxLufs) {
    failures.push(
      `loudness ${lufs.toFixed(2)} LUFS outside [${opts.minLufs}, ${opts.maxLufs}]`,
    );
  }
  return {
    ok: failures.length === 0,
    failures,
    metrics: { loopSeam, peakDbfs, lufs, silenceRegions: regions },
  };
}
