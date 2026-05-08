import { describe, it, expect } from 'vitest';

import type { SefirahKey } from '@/data/types';

import { ENCOUNTER_TRACKS, encounterTrackFor } from '../manifest';

describe('per-Sefirah encounter manifest (#527 + #528)', () => {
  it('every encountered Sefirah resolves to its per-Sefirah track', () => {
    // Malkuth has no encounter (setup-only) so it correctly falls through.
    const encountered: SefirahKey[] = [
      'kether',
      'chokmah',
      'binah',
      'chesed',
      'gevurah',
      'tiferet',
      'netzach',
      'hod',
      'yesod',
    ];
    for (const key of encountered) {
      expect(encounterTrackFor(key)).toBe(`/audio/encounter-${key}.mp3`);
    }
  });

  it('Malkuth (no encounter) falls through to the generic encounter track', () => {
    expect(encounterTrackFor('malkuth')).toBe('/audio/encounter.mp3');
  });

  it('manifest entries match the encountered Sefirot exactly', () => {
    const keys = Object.keys(ENCOUNTER_TRACKS).sort();
    expect(keys).toEqual(
      [
        'binah',
        'chesed',
        'chokmah',
        'gevurah',
        'hod',
        'kether',
        'netzach',
        'tiferet',
        'yesod',
      ].sort(),
    );
  });
});
