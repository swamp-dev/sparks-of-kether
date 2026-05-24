/**
 * Generate all voice clips via the ElevenLabs TTS API.
 *
 * Writes mp3 files directly to public/audio/voice/ (Next.js static
 * serving directory). Incremental by default — skips files that already
 * exist so partial runs are safe to resume. Also writes
 * public/audio/voice/manifest.json so pnpm voice:check-drift can
 * detect text-audio drift on CI.
 *
 * Usage:
 *   pnpm voice:generate                          # generate all missing clips
 *   pnpm voice:generate:dry                      # dry-run: count + char estimate, no API calls
 *   pnpm voice:generate --only-avatar hermes     # one avatar only
 *   pnpm voice:generate --only-type verdicts     # verdicts | responses | greetings | narrator
 *   pnpm voice:generate --force                  # regenerate even if file exists
 *
 * Requires ELEVENLABS_API_KEY in env (set in .env.local).
 *
 * Output paths mirror lib/voice/paths.ts:
 *   verdict-{sefirahKey}-{sign}-{outcome}-{variant}.mp3
 *   response-{sefirahKey}-{sign}-{variant}.mp3
 *   greeting-{characterName}.mp3
 *   narrator-kether-{context}.mp3
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sefirahVerdicts, sefirahPlayerResponses } from '@/data/pantheons/greco-roman/verdicts';
import { avatarNames } from '@/data/pantheons/greco-roman/avatar-names';
import { hashText } from './build-manifest';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ──────────────── Types ────────────────

export interface VoiceEntry {
  voiceId: string;
  name: string;
}

export interface VoiceConfig {
  service: string;
  model: string;
  outputFormat: string;
  avatars: Record<string, VoiceEntry>;
  zodiac: Record<string, VoiceEntry>;
}

export interface Clip {
  voiceId: string;
  text: string;
  outputPath: string; // relative to repo root, e.g. public/audio/voice/verdict-hod-aries-pass-0.mp3
}

export interface BuildOptions {
  onlyAvatar?: string; // lowercase character name, e.g. 'hermes'
  onlyType?: 'verdicts' | 'responses' | 'greetings' | 'narrator';
}

// ──────────────── Narrator text ────────────────
// Kether narrator lines for FinalThresholdScreen key moments.

const NARRATOR_LINES: Record<string, string> = {
  'threshold-open': 'All ten rise here. The final question opens.',
  'threshold-close': 'The threshold closes. What you have placed holds.',
};

// ──────────────── Greeting text ────────────────
// Short spoken greeting when avatar arrives in prep phase (~1 sentence each).

const GREETINGS: Record<string, string> = {
  athena: 'Sit with the question before you answer it.',
  demeter: 'What you tend, grows. I am watching.',
  zeus: 'The table is set. Make your offering.',
  ares: 'Hold the line. Nothing passes that should not.',
  apollo: 'The chord is struck. Listen before you play.',
  aphrodite: 'Name what you want. That is the first courage.',
  hermes: 'I am already ahead of you. Catch up.',
  selene: 'The tide has turned. Step carefully.',
  hestia: 'The fire is kept. Begin.',
};

// Sefirah key → lowercase character name mapping (derived from avatarNames)
// chokmah → athena, hod → hermes, etc.
const SEFIRAH_TO_CHARACTER: Record<string, string> = Object.fromEntries(
  Object.entries(avatarNames).map(([sefirah, name]) => [sefirah, name.primary.toLowerCase()]),
);

// Zodiac sign keys in canonical order
const ZODIAC_SIGNS = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
] as const;

const OUTCOMES = ['pass', 'fail'] as const;
const VARIANTS = [0, 1, 2] as const;

// ──────────────── Pure helpers (exported for tests) ────────────────

export function buildClipList(config: VoiceConfig, opts: BuildOptions): Clip[] {
  const clips: Clip[] = [];

  const sefirahKeys = Object.keys(SEFIRAH_TO_CHARACTER) as string[];

  // ── Verdicts ──
  if (!opts.onlyType || opts.onlyType === 'verdicts') {
    for (const sefirah of sefirahKeys) {
      const characterName = SEFIRAH_TO_CHARACTER[sefirah]!;
      if (opts.onlyAvatar && opts.onlyAvatar !== characterName) continue;

      const voiceEntry = config.avatars[characterName];
      if (!voiceEntry) throw new Error(`voice-config.json missing avatar: ${characterName}`);

      const avatarMatrix = sefirahVerdicts[sefirah as keyof typeof sefirahVerdicts];
      if (!avatarMatrix) continue;

      for (const sign of ZODIAC_SIGNS) {
        const signCell = avatarMatrix[sign];
        if (!signCell) continue;

        for (const outcome of OUTCOMES) {
          const variants = signCell[outcome];
          if (!variants) continue;

          for (const v of VARIANTS) {
            const text = variants[v];
            if (!text) continue;
            clips.push({
              voiceId: voiceEntry.voiceId,
              text,
              outputPath: `public/audio/voice/verdict-${sefirah}-${sign}-${outcome}-${v}.mp3`,
            });
          }
        }
      }
    }
  }

  // ── Responses ──
  if (!opts.onlyType || opts.onlyType === 'responses') {
    for (const sefirah of sefirahKeys) {
      const characterName = SEFIRAH_TO_CHARACTER[sefirah]!;
      if (opts.onlyAvatar && opts.onlyAvatar !== characterName) continue;

      const avatarMatrix = sefirahPlayerResponses[sefirah as keyof typeof sefirahPlayerResponses];
      if (!avatarMatrix) continue;

      for (const sign of ZODIAC_SIGNS) {
        const variants = avatarMatrix[sign];
        if (!variants) continue;

        const zodiacEntry = config.zodiac[sign];
        if (!zodiacEntry) throw new Error(`voice-config.json missing zodiac: ${sign}`);

        for (const v of VARIANTS) {
          const text = variants[v];
          if (!text) continue;
          clips.push({
            voiceId: zodiacEntry.voiceId,
            text,
            outputPath: `public/audio/voice/response-${sefirah}-${sign}-${v}.mp3`,
          });
        }
      }
    }
  }

  // ── Greetings ──
  if (!opts.onlyType || opts.onlyType === 'greetings') {
    for (const [characterName, text] of Object.entries(GREETINGS)) {
      if (opts.onlyAvatar && opts.onlyAvatar !== characterName) continue;

      const voiceEntry = config.avatars[characterName];
      if (!voiceEntry)
        throw new Error(`voice-config.json missing avatar for greeting: ${characterName}`);

      clips.push({
        voiceId: voiceEntry.voiceId,
        text,
        outputPath: `public/audio/voice/greeting-${characterName}.mp3`,
      });
    }
  }

  // ── Narrator ──
  // Narrator is Kether-only; skip when --only-avatar targets a different character.
  if (!opts.onlyType || opts.onlyType === 'narrator') {
    if (!opts.onlyAvatar || opts.onlyAvatar === 'kether') {
      const narratorEntry = config.avatars['kether'];
      if (!narratorEntry) throw new Error('voice-config.json missing avatars.kether for narrator');

      for (const [context, text] of Object.entries(NARRATOR_LINES)) {
        clips.push({
          voiceId: narratorEntry.voiceId,
          text,
          outputPath: `public/audio/voice/narrator-kether-${context}.mp3`,
        });
      }
    }
  }

  return clips;
}

export function estimateCharCount(clips: Clip[]): number {
  return clips.reduce((sum, c) => sum + c.text.length, 0);
}

// ──────────────── I/O helpers ────────────────

function loadEnv(): void {
  const envPath = resolve(__dirname, '../../.env.local');
  try {
    for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      // m[1] and m[2] always exist: regex has exactly two capture groups
      if (m) process.env[m[1]!.trim()] = m[2]!.trim();
    }
  } catch {
    /* rely on shell env */
  }
}

function loadVoiceConfig(): VoiceConfig {
  const configPath = resolve(__dirname, 'voice-config.json');
  const config = JSON.parse(readFileSync(configPath, 'utf-8')) as VoiceConfig;
  if (!config.avatars || !config.zodiac) {
    throw new Error('voice-config.json is malformed — missing "avatars" or "zodiac" section');
  }
  return config;
}

function parseArgs(): {
  dryRun: boolean;
  onlyAvatar?: string;
  onlyType?: BuildOptions['onlyType'];
  force: boolean;
} {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };

  const rawType = get('--only-type');
  if (
    rawType !== undefined &&
    rawType !== 'verdicts' &&
    rawType !== 'responses' &&
    rawType !== 'greetings' &&
    rawType !== 'narrator'
  ) {
    console.error(
      `--only-type must be one of: verdicts, responses, greetings, narrator (got "${rawType}")`,
    );
    process.exit(1);
  }
  const onlyType = rawType as BuildOptions['onlyType'];

  const onlyAvatar = get('--only-avatar');

  return {
    dryRun: args.includes('--dry-run'),
    ...(onlyAvatar !== undefined && { onlyAvatar }),
    ...(onlyType !== undefined && { onlyType }),
    force: args.includes('--force'),
  };
}

async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream as unknown as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function generateClip(
  client: ElevenLabsClient,
  clip: Clip,
  model: string,
  outputFormat: string,
  force: boolean,
): Promise<'skipped' | 'generated'> {
  const absPath = resolve(__dirname, '../../', clip.outputPath);

  if (!force && existsSync(absPath)) return 'skipped';

  const MAX_ATTEMPTS = 3;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const stream = await client.textToSpeech.convert(clip.voiceId, {
        text: clip.text,
        modelId: model,
        outputFormat: outputFormat as 'mp3_44100_96',
        voiceSettings: { stability: 0.5, similarityBoost: 0.75 },
      });

      const audio = await streamToBuffer(stream);
      mkdirSync(dirname(absPath), { recursive: true });
      writeFileSync(absPath, audio);
      return 'generated';
    } catch (err: unknown) {
      lastErr = err;
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 429 && attempt < MAX_ATTEMPTS) {
        const delay = 2 ** attempt * 1000; // 2s, 4s
        console.warn(
          `  429 rate limit — retrying in ${delay / 1000}s (attempt ${attempt}/${MAX_ATTEMPTS})`,
        );
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
  throw lastErr ?? new Error(`Failed after ${MAX_ATTEMPTS} attempts: ${clip.outputPath}`);
}

// ──────────────── Main ────────────────

async function main() {
  loadEnv();

  const { dryRun, onlyAvatar, onlyType, force } = parseArgs();
  const config = loadVoiceConfig();
  const clips = buildClipList(config, {
    ...(onlyAvatar !== undefined && { onlyAvatar }),
    ...(onlyType !== undefined && { onlyType }),
  });

  if (clips.length === 0) {
    console.error(
      `No clips matched the given filters. Check --only-avatar (must be lowercase, e.g. 'hermes') and --only-type.`,
    );
    process.exit(1);
  }

  const charCount = estimateCharCount(clips);

  console.log(`\nVoice generation${dryRun ? ' (DRY RUN)' : ''}`);
  console.log(`  Clips:      ${clips.length}`);
  console.log(`  Est. chars: ${charCount.toLocaleString()}`);
  console.log(
    `  Est. cost:  ~$${((charCount / 1_000_000) * 22).toFixed(2)} at ElevenLabs Creator tier`,
  );
  if (onlyAvatar) console.log(`  Filter:     --only-avatar ${onlyAvatar}`);
  if (onlyType) console.log(`  Filter:     --only-type ${onlyType}`);
  console.log();

  if (dryRun) return;

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error('ELEVENLABS_API_KEY not set. Add it to .env.local.');
    process.exit(1);
  }

  const client = new ElevenLabsClient({ apiKey });
  let generated = 0;
  let skipped = 0;

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i]!;
    const result = await generateClip(client, clip, config.model, config.outputFormat, force);
    if (result === 'generated') {
      generated++;
      console.log(`[${i + 1}/${clips.length}] ✓ ${clip.outputPath}`);
    } else {
      skipped++;
      if (skipped <= 5 || (i + 1) % 50 === 0) {
        console.log(`[${i + 1}/${clips.length}] — skipped (exists): ${clip.outputPath}`);
      }
    }
  }

  console.log(`\nDone. Generated: ${generated}  Skipped: ${skipped}  Total: ${clips.length}\n`);

  // Write manifest.json so pnpm voice:check-drift can detect text-audio drift on CI.
  // Only written on full (unfiltered) runs — a partial run (--only-type / --only-avatar)
  // would overwrite the manifest with a stale timestamp for clips that weren't regenerated.
  if (!onlyType && !onlyAvatar) {
    const manifestPath = resolve(__dirname, '../../public/audio/voice/manifest.json');
    // Re-derive the full 875-clip list for the manifest — separate from `clips` above,
    // which only covers what matched the active filters this run.
    const allClips = buildClipList(config, {});
    const manifestClips: Record<
      string,
      { textHash: string; textSnippet: string; voiceId: string }
    > = {};
    for (const clip of allClips) {
      const key = basename(clip.outputPath, extname(clip.outputPath));
      manifestClips[key] = {
        textHash: hashText(clip.text),
        textSnippet: clip.text.length > 60 ? clip.text.slice(0, 57) + '...' : clip.text,
        voiceId: clip.voiceId,
      };
    }
    const manifest = {
      version: '1',
      generatedAt: new Date().toISOString(),
      clips: manifestClips,
    };
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(
      `Manifest written: public/audio/voice/manifest.json (${allClips.length} clips)\n`,
    );
  } else {
    console.log(
      `Skipping manifest update — partial run (filters active). Re-run without filters to refresh manifest.\n`,
    );
  }
}

// Only run when invoked directly; skip when imported by tests.
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
