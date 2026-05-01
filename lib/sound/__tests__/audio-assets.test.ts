import { describe, expect, it } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { CUE_FILES, type SoundCue } from '../cues';

/**
 * Pin the audio asset presence (#321):
 *
 *   - Every file referenced by `CUE_FILES` exists in `public/`.
 *   - Total size of all cues ≤ 500 KB (ticket cap).
 *
 * This is the only test in the suite that touches the filesystem
 * — running it under jsdom is fine since `node:fs` works regardless
 * of the test environment.
 */

const PROJECT_ROOT = resolve(__dirname, '..', '..', '..');

function publicPath(href: string): string {
  // CUE_FILES values are public-served paths like '/audio/foo.mp3'.
  // Strip the leading slash so `resolve()` joins them under
  // `<root>/public/`.
  return resolve(PROJECT_ROOT, 'public', href.replace(/^\//, ''));
}

describe('audio assets', () => {
  it('every cue file referenced by CUE_FILES exists in public/', () => {
    const missing: string[] = [];
    for (const [cue, href] of Object.entries(CUE_FILES) as [SoundCue, string][]) {
      const path = publicPath(href);
      if (!existsSync(path)) {
        missing.push(`${cue} → ${href}`);
      }
    }
    expect(missing, `Missing audio assets:\n  ${missing.join('\n  ')}`).toEqual([]);
  });

  it('total audio asset weight is ≤ 500 KB', () => {
    let total = 0;
    for (const href of Object.values(CUE_FILES)) {
      const path = publicPath(href);
      if (existsSync(path)) {
        total += statSync(path).size;
      }
    }
    // 500 KB ticket cap. The synthesized cues come in well under
    // 50KB total; this assertion catches a future curated-asset
    // batch that overshot the budget.
    expect(total).toBeLessThanOrEqual(500 * 1024);
  });
});
