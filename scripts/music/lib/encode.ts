/**
 * Encode pipeline — shell out to `ffmpeg` for mp3 and ogg encoding.
 *
 * Why a shell-out: pure-JS encoders (lamejs, oggv) are slower and
 * flakier than ffmpeg, and ffmpeg is essentially universal on dev
 * machines and CI runners. Pragmatic over pure.
 *
 * Helpful error: a missing ffmpeg is the most common failure mode; we
 * detect it explicitly and tell the caller exactly what to install.
 */

import { execFile } from 'node:child_process';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type EncodeResult = {
  mp3Path: string;
  oggPath: string;
  mp3Bytes: number;
  oggBytes: number;
};

export async function encodeWavToMp3AndOgg(opts: {
  wavBytes: Uint8Array;
  outputDir: string;
  baseName: string; // e.g. "lobby"
}): Promise<EncodeResult> {
  await assertFfmpegAvailable();
  await mkdir(opts.outputDir, { recursive: true });

  const tmpWav = join(tmpdir(), `sok-music-${opts.baseName}-${process.pid}.wav`);
  await writeFile(tmpWav, opts.wavBytes);

  const mp3Path = join(opts.outputDir, `${opts.baseName}.mp3`);
  const oggPath = join(opts.outputDir, `${opts.baseName}.ogg`);

  // -fflags +bitexact (libavformat) and -flags +bitexact (libavcodec)
  // suppress everything ffmpeg does to make outputs unique per run:
  // Ogg page serial numbers, encoder-version metadata strings,
  // creation timestamps, etc. With these flags the same input always
  // produces the same bytes — required by the byte-determinism AC.
  const bitexact = ['-fflags', '+bitexact', '-flags', '+bitexact'];

  try {
    // mp3: VBR quality 4 → ~96-128 kbps for music. Ambient drone
    // compresses very well at this rate.
    await runFfmpeg([
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      tmpWav,
      ...bitexact,
      '-codec:a',
      'libmp3lame',
      '-q:a',
      '4',
      mp3Path,
    ]);

    // ogg: vorbis quality 4 ≈ 128 kbps.
    await runFfmpeg([
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      tmpWav,
      ...bitexact,
      '-codec:a',
      'libvorbis',
      '-q:a',
      '4',
      oggPath,
    ]);

    const [mp3Stat, oggStat] = await Promise.all([stat(mp3Path), stat(oggPath)]);

    return {
      mp3Path,
      oggPath,
      mp3Bytes: mp3Stat.size,
      oggBytes: oggStat.size,
    };
  } finally {
    await unlink(tmpWav).catch(() => undefined);
  }
}

async function assertFfmpegAvailable(): Promise<void> {
  try {
    await execFileAsync('ffmpeg', ['-version']);
  } catch (err) {
    const hint = [
      'ffmpeg not found on PATH. Install it to render audio:',
      '  Debian/Ubuntu:  sudo apt-get install ffmpeg',
      '  macOS:          brew install ffmpeg',
      '  Arch:           sudo pacman -S ffmpeg',
    ].join('\n');
    throw new Error(`${hint}\n\n(Underlying error: ${(err as Error).message})`);
  }
}

async function runFfmpeg(args: string[]): Promise<void> {
  try {
    await execFileAsync('ffmpeg', args, { maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { stderr?: string };
    const stderr = e.stderr ? `\nffmpeg stderr:\n${e.stderr}` : '';
    throw new Error(`ffmpeg failed (${e.code ?? 'unknown'})${stderr}`);
  }
}

// Re-exported for tests / callers that need the directory for related artefacts.
export function publicAudioDir(repoRoot: string): string {
  return join(repoRoot, 'public', 'audio');
}

// Convenience: ensure a parent directory exists. Used by the render CLI
// so a freshly-cloned repo without `public/audio/` gets the directory
// created on first render rather than failing.
export async function ensureDir(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
}
