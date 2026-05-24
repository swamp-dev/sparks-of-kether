/**
 * Build the expected clip map from the current TypeScript verdict/response data.
 * Also exports `hashText`, used by generate-voices.ts when writing manifest.json.
 *
 * `buildExpectedClipMap` returns a Map of clip-key → entry for all 864 verdict +
 * response clips (576 + 288). Used by check-drift.ts to compare against the
 * committed manifest.json. Greeting (9) and narrator (2) clips are excluded from
 * drift checking — they appear as orphan entries in the manifest and are silently
 * ignored by detectDrift.
 *
 * Clip-key format matches lib/voice/paths.ts:
 *   verdict-{avatar}-{sign}-{outcome}-{variant}
 *   response-{avatar}-{sign}-{variant}
 */

import { createHash } from 'node:crypto';
import { sefirahVerdicts, sefirahPlayerResponses } from '@/data/pantheons/greco-roman/verdicts';

export interface ClipEntry {
  readonly key: string;
  readonly text: string;
  readonly textHash: string;
}

export function hashText(text: string): string {
  // NFC-normalize before hashing so visually identical strings with different
  // Unicode encodings (e.g. composed vs decomposed accents) produce the same hash.
  return 'sha256:' + createHash('sha256').update(text.normalize('NFC'), 'utf8').digest('hex');
}

export function buildExpectedClipMap(): Map<string, ClipEntry> {
  const map = new Map<string, ClipEntry>();

  for (const [avatar, signMap] of Object.entries(sefirahVerdicts)) {
    for (const [sign, outcomeMap] of Object.entries(signMap)) {
      for (const outcome of ['pass', 'fail'] as const) {
        const variants = outcomeMap[outcome];
        if (!variants) continue;
        for (let i = 0; i < variants.length; i++) {
          const text = variants[i];
          if (text === undefined) continue;
          const key = `verdict-${avatar}-${sign}-${outcome}-${i}`;
          map.set(key, { key, text, textHash: hashText(text) });
        }
      }
    }
  }

  for (const [avatar, signMap] of Object.entries(sefirahPlayerResponses)) {
    for (const [sign, variants] of Object.entries(signMap)) {
      if (!Array.isArray(variants)) continue;
      for (let i = 0; i < variants.length; i++) {
        const text = variants[i];
        if (text === undefined) continue;
        const key = `response-${avatar}-${sign}-${i}`;
        map.set(key, { key, text, textHash: hashText(text) });
      }
    }
  }

  return map;
}
