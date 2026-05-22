/**
 * Voice text-audio drift detection (#258).
 *
 * Usage:
 *   pnpm voice:check-drift
 *
 * Reads `public/audio/voice/manifest.json` (committed to git, written
 * by `pnpm voice:generate`) and compares text hashes against the
 * current TypeScript verdict/response data. Exits 0 on clean, 1 with
 * a diff table on any drift.
 *
 * Error cases:
 *   - Manifest file missing → error with instructions
 *   - Stale entry → text changed, audio not regenerated
 *   - Missing entry → clip has TypeScript source text but no manifest entry
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildExpectedClipMap, type ClipEntry } from './build-manifest';

export interface ManifestClip {
  path?: string;
  textHash: string;
  textSnippet?: string;
  voiceId?: string;
  generatedAt?: string;
}

export interface Manifest {
  version: string;
  generatedAt: string;
  clips: Record<string, ManifestClip>;
}

export interface StaleEntry {
  key: string;
  was: string;
  now: string;
}

export interface DriftResult {
  stale: StaleEntry[];
  missing: string[];
}

export function detectDrift(
  manifest: Manifest,
  expected: Map<string, ClipEntry>,
): DriftResult {
  const stale: StaleEntry[] = [];
  const missing: string[] = [];

  for (const [key, entry] of expected) {
    const manifestEntry = manifest.clips[key];
    if (!manifestEntry) {
      missing.push(key);
      continue;
    }
    if (manifestEntry.textHash !== entry.textHash) {
      stale.push({
        key,
        was: manifestEntry.textSnippet ?? '(no snippet)',
        now: snippet(entry.text),
      });
    }
  }

  return { stale, missing };
}

function snippet(text: string): string {
  return text.length > 60 ? text.slice(0, 57) + '...' : text;
}

function buildFixSuggestion(staleKeys: string[], missingKeys: string[]): string {
  const all = [...staleKeys, ...missingKeys];
  const avatars = new Set<string>();
  for (const key of all) {
    const parts = key.split('-');
    if (parts[1]) avatars.add(parts[1]);
  }
  if (avatars.size === 0) return '';
  const lines = [...avatars].map((a) => `  pnpm voice:generate --only-avatar ${a}`);
  return '\nRun:\n' + lines.join('\n');
}

function readManifest(manifestPath: string): Manifest {
  let raw: string;
  try {
    raw = readFileSync(manifestPath, 'utf-8');
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      console.error('\n  ERROR: No manifest found at public/audio/voice/manifest.json');
      console.error('         Run pnpm voice:generate to generate audio and write the manifest.\n');
    } else {
      console.error('\n  ERROR: Failed to read manifest.json:', (e as Error).message, '\n');
    }
    process.exit(1);
  }
  try {
    const parsed = JSON.parse(raw) as Manifest;
    if (typeof parsed.clips !== 'object' || parsed.clips === null || Array.isArray(parsed.clips)) {
      console.error('\n  ERROR: manifest.json is malformed — "clips" must be an object.\n');
      process.exit(1);
    }
    return parsed;
  } catch (e) {
    console.error('\n  ERROR: Failed to parse manifest.json:', (e as Error).message, '\n');
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const manifestPath = resolve(__dirname, '../../public/audio/voice/manifest.json');
  const manifest = readManifest(manifestPath);
  const expected = buildExpectedClipMap();

  const { stale, missing } = detectDrift(manifest, expected);

  if (stale.length === 0 && missing.length === 0) {
    console.log(`\n  Voice manifest clean — ${expected.size} clips verified.\n`);
    process.exit(0);
  }

  console.error(
    `\nDRIFT DETECTED — ${stale.length} clip(s) stale, ${missing.length} clip(s) missing\n`,
  );

  if (stale.length > 0) {
    console.error('STALE (text changed, audio not regenerated):');
    for (const { key, was, now } of stale) {
      console.error(`  ${key}`);
      console.error(`    was: "${was}"`);
      console.error(`    now: "${now}"`);
    }
    console.error('');
  }

  if (missing.length > 0) {
    console.error('MISSING (no audio generated for this text):');
    for (const key of missing) {
      console.error(`  ${key}`);
    }
    console.error('');
  }

  console.error(buildFixSuggestion(stale.map((s) => s.key), missing));
  process.exit(1);
}

// Only execute when this file is the entry point; not when imported by tests.
if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((e: unknown) => {
    console.error('check-drift: unexpected error:', e);
    process.exit(1);
  });
}
