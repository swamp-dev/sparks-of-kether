import { existsSync, readdirSync } from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

import { RW_IMAGE_FILE } from '../rw-image-map';

// The map is the only link between ArcanumCard and the files on disk; a
// renamed or missing image would otherwise surface only as a broken <image>
// in the browser. Keep the two in lock-step.
const PUBLIC_DIR = path.join(process.cwd(), 'public', 'rider-waite-cards');

describe('RW_IMAGE_FILE', () => {
  it('maps every major arcanum 0–21 to a file that exists on disk', () => {
    for (let n = 0; n <= 21; n++) {
      const file = RW_IMAGE_FILE[n];
      expect(file, `arcanum ${n} has a mapping`).toBeDefined();
      expect(existsSync(path.join(PUBLIC_DIR, file as string)), `${file} exists`).toBe(true);
    }
  });

  it('ships only the derived WebPs — no legacy JPEGs of unknown provenance (#369)', () => {
    const files = readdirSync(PUBLIC_DIR);
    expect(files.filter((f) => f.endsWith('.jpg'))).toEqual([]);
    expect(files.filter((f) => f.endsWith('.webp'))).toHaveLength(22);
  });
});
