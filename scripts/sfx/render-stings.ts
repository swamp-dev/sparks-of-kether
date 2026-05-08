/**
 * Render CLI for per-Sefirah avatar-arrival stings (#484).
 *
 *   pnpm sfx:render-stings              # render every sting
 *   pnpm sfx:render-stings athena       # render only the named sting
 *
 * Output: `public/audio/<sting-name>.{mp3,ogg}`. Stings reuse the
 * music engine's encode pipeline (libmp3lame -q 4, libvorbis -q 4)
 * with `+bitexact` flags, so renders are byte-deterministic.
 *
 * Errors helpfully if `ffmpeg` is missing.
 */

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { encodeWavToMp3AndOgg, publicAudioDir } from '../music/lib/encode';
import { measurePeakDbfs } from '../music/lib/qa';
import { encodeWav } from '../music/lib/wav';
import { STINGS, type StingManifest } from './stings';

async function main(): Promise<void> {
  const arg = process.argv[2];
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const outputDir = publicAudioDir(repoRoot);

  const requested =
    arg === undefined
      ? STINGS
      : STINGS.filter((s) => s.name === arg || s.name.endsWith(`-${arg}`));

  if (requested.length === 0) {
    console.error(`Unknown sting: ${arg}`);
    console.error(`Available: ${STINGS.map((s) => s.name).join(', ')}`);
    process.exit(1);
  }

  let anyFail = false;
  for (const sting of requested) {
    console.log(
      `▶ Rendering "${sting.name}" — ${sting.durationSec}s @ ${sting.sampleRate}Hz`,
    );
    const t0 = Date.now();
    const buffer = sting.render();
    console.log(`  synth: ${Date.now() - t0} ms`);

    const peak = measurePeakDbfs(buffer);
    if (peak > -1) {
      console.error(`  ✘ Peak ${peak.toFixed(2)} dBFS exceeds -1 dBFS — clipping risk`);
      anyFail = true;
      continue;
    }
    console.log(`  ✓ peak=${peak.toFixed(2)} dBFS`);

    const wav = encodeWav(buffer);
    const result = await encodeWavToMp3AndOgg({
      wavBytes: wav,
      outputDir,
      baseName: sting.name,
    });
    const mp3Kb = (result.mp3Bytes / 1024).toFixed(1);
    const oggKb = (result.oggBytes / 1024).toFixed(1);
    console.log(`  ✓ ${result.mp3Path} (${mp3Kb} KB)`);
    console.log(`  ✓ ${result.oggPath} (${oggKb} KB)`);

    // Per-sting size budget: 50 KB at 1-1.5 s × ~96-128 kbps ≈ 18-24 KB
    // typical, plus the reverb tail can extend the encode. 60 KB ceiling
    // gives reasonable headroom for the ones with longer reverb.
    const STING_MAX_BYTES = 60 * 1024;
    if (result.mp3Bytes > STING_MAX_BYTES || result.oggBytes > STING_MAX_BYTES) {
      console.error(
        `  ✘ size ceiling exceeded (max ${STING_MAX_BYTES / 1024} KB)`,
      );
      anyFail = true;
    }
  }

  if (anyFail) {
    console.error('\nOne or more stings failed. See above.');
    process.exit(1);
  }
  console.log('\nAll stings rendered.');
}

main().catch((err) => {
  console.error('Render failed:');
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

// Hint to type-checkers that StingManifest is the source of truth here.
export type { StingManifest };
