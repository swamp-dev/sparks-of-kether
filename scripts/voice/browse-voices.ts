/**
 * Browse the ElevenLabs shared voice library and filter by gender/accent/age.
 *
 * Usage:
 *   pnpm voice:browse                              # all english voices, grouped by gender
 *   pnpm voice:browse --gender female              # female voices only
 *   pnpm voice:browse --gender male                # male voices only
 *   pnpm voice:browse --search "deep mature"       # keyword search (searches name)
 *   pnpm voice:browse --age middle_aged            # young | middle_aged | old
 *   pnpm voice:browse --accent british             # accent filter
 *   pnpm voice:browse --use-case characters_animation
 *   pnpm voice:browse --page 2                     # paginate (30 per page default)
 *   pnpm voice:browse --limit 50                   # results per page
 *
 * Requires ELEVENLABS_API_KEY in env (set in .env.local).
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

function loadEnv() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(__dirname, '../../.env.local');
  try {
    for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1]!.trim()] = m[2]!.trim();
    }
  } catch {
    /* rely on shell env */
  }
}

async function main() {
  loadEnv();
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error('ELEVENLABS_API_KEY not set in .env.local');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };

  const genderFilter = get('--gender');
  const searchFilter = get('--search');
  const ageFilter = get('--age');
  const accentFilter = get('--accent');
  const useCaseFilter = get('--use-case');
  const page = parseInt(get('--page') ?? '1', 10);
  const limit = parseInt(get('--limit') ?? '30', 10);

  const client = new ElevenLabsClient({ apiKey });

  console.log('\nFetching ElevenLabs shared voice library...\n');

  const response = await client.voices.getShared({
    pageSize: limit,
    page: page - 1,
    language: 'en', // English-primary voices only
    ...(genderFilter && { gender: genderFilter }),
    ...(searchFilter && { search: searchFilter }),
    ...(ageFilter && { age: ageFilter }),
    ...(accentFilter && { accent: accentFilter }),
    ...(useCaseFilter && { useCases: [useCaseFilter] }),
    sort: 'cloned_by_count', // popularity as a quality signal
  });

  type LibraryVoice = {
    voiceId?: string;
    name?: string;
    gender?: string;
    age?: string;
    accent?: string;
    descriptive?: string;
    useCase?: string;
    description?: string;
    previewUrl?: string;
    clonedByCount?: number;
  };
  const voices = (response.voices ?? []) as LibraryVoice[];

  if (voices.length === 0) {
    console.log('No voices matched.');
    return;
  }

  const active = [
    genderFilter && `gender=${genderFilter}`,
    ageFilter && `age=${ageFilter}`,
    accentFilter && `accent=${accentFilter}`,
    useCaseFilter && `use-case=${useCaseFilter}`,
    searchFilter && `search="${searchFilter}"`,
  ].filter(Boolean);
  if (active.length) console.log(`Filters: ${active.join('  ')}\n`);

  // Group by gender
  const grouped: Record<string, LibraryVoice[]> = {};
  for (const v of voices) {
    const g = v.gender ?? 'unknown';
    (grouped[g] ??= []).push(v);
  }

  for (const [gender, group] of Object.entries(grouped)) {
    console.log(`\n── ${gender.toUpperCase()} (${group.length}) ──────────────────────`);
    for (const v of group) {
      const badge = [v.age, v.accent, v.descriptive, v.useCase].filter(Boolean).join(' · ');
      const clones = v.clonedByCount ? ` [${v.clonedByCount} clones]` : '';
      console.log(`\n  ID:   ${v.voiceId}`);
      console.log(`  Name: ${v.name}${clones}`);
      if (badge) console.log(`  Tags: ${badge}`);
      if (v.description) console.log(`  Desc: ${v.description}`);
      if (v.previewUrl) console.log(`  Preview: ${v.previewUrl}`);
    }
  }

  console.log(`\n─────────────────────────────────────`);
  console.log(
    `Page ${page} · ${voices.length} shown · total: ${(response as unknown as Record<string, unknown>).totalCount ?? '?'}`,
  );
  const nextFlags = `--page ${page + 1}${genderFilter ? ` --gender ${genderFilter}` : ''}${ageFilter ? ` --age ${ageFilter}` : ''}${accentFilter ? ` --accent ${accentFilter}` : ''}${searchFilter ? ` --search "${searchFilter}"` : ''}`;
  console.log(`Next page:  pnpm voice:browse ${nextFlags}`);
  console.log(`\nSample:     pnpm voice:sample --voice-id <ID> --character <name>\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
