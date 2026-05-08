/**
 * Render CLI for the synth-ambient music engine.
 *
 *   pnpm music:render          # render every track in the manifest
 *   pnpm music:render lobby    # render only the named track
 *
 * For each track:
 *   1. Run the synth program → Float32 stereo PCM.
 *   2. Run audio QA (loop-seam, peak, silence, LUFS). Abort on fail.
 *   3. Encode the PCM to WAV → mp3 + ogg in `public/audio/<name>.{mp3,ogg}`.
 *   4. Verify the encoded sizes are below the per-track ceiling.
 *
 * Errors helpfully if `ffmpeg` is missing.
 */

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { encodeWavToMp3AndOgg, publicAudioDir } from './lib/encode';
import { runQa } from './lib/qa';
import { encodeWav } from './lib/wav';
import { lobby, type TrackManifest } from './tracks/lobby';
import { encounterYesod } from './tracks/encounter-yesod';

const TRACKS: TrackManifest[] = [lobby, encounterYesod];

async function main(): Promise<void> {
  const arg = process.argv[2];
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const outputDir = publicAudioDir(repoRoot);

  const requested =
    arg === undefined ? TRACKS : TRACKS.filter((t) => t.name === arg);
  if (requested.length === 0) {
    console.error(`Unknown track: ${arg}`);
    console.error(`Available: ${TRACKS.map((t) => t.name).join(', ')}`);
    process.exit(1);
  }

  let anyFail = false;
  for (const track of requested) {
    console.log(`▶ Rendering "${track.name}" — ${track.durationSec}s @ ${track.sampleRate}Hz`);
    const t0 = Date.now();
    const buffer = track.render();
    console.log(`  synth: ${(Date.now() - t0)} ms`);

    console.log('  running QA…');
    const qa = await runQa(buffer, track.qaGates);
    if (!qa.ok) {
      console.error(`  ✘ QA failed for "${track.name}":`);
      for (const f of qa.failures) console.error(`    – ${f}`);
      anyFail = true;
      continue;
    }
    console.log(
      `  ✓ QA: seam=${qa.metrics.loopSeam.toFixed(3)} ` +
        `peak=${qa.metrics.peakDbfs.toFixed(2)}dBFS ` +
        `lufs=${qa.metrics.lufs.toFixed(2)} ` +
        `silenceRegions=${qa.metrics.silenceRegions.length}`,
    );

    console.log('  encoding…');
    const wav = encodeWav(buffer);
    const result = await encodeWavToMp3AndOgg({
      wavBytes: wav,
      outputDir,
      baseName: track.name,
    });

    const mp3Kb = (result.mp3Bytes / 1024).toFixed(1);
    const oggKb = (result.oggBytes / 1024).toFixed(1);
    console.log(`  ✓ ${result.mp3Path} (${mp3Kb} KB)`);
    console.log(`  ✓ ${result.oggPath} (${oggKb} KB)`);

    if (
      result.mp3Bytes > track.qaGates.maxBytes ||
      result.oggBytes > track.qaGates.maxBytes
    ) {
      console.error(
        `  ✘ size ceiling exceeded (max ${(track.qaGates.maxBytes / 1024).toFixed(0)} KB)`,
      );
      anyFail = true;
    }
  }

  if (anyFail) {
    console.error('\nOne or more tracks failed. See above.');
    process.exit(1);
  }
  console.log('\nAll tracks rendered.');
}

main().catch((err) => {
  console.error('Render failed:');
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
