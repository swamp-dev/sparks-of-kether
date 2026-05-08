import { describe, it, expect } from 'vitest';

import { ENCOUNTER_TRACKS, encounterTrackFor } from '../manifest';

describe('per-Sefirah encounter manifest (#527)', () => {
  it('returns the per-Sefirah track when one exists', () => {
    expect(encounterTrackFor('yesod')).toBe('/audio/encounter-yesod.mp3');
  });

  it('falls back to the generic encounter track when no entry exists', () => {
    expect(encounterTrackFor('kether')).toBe('/audio/encounter.mp3');
    expect(encounterTrackFor('chokmah')).toBe('/audio/encounter.mp3');
    expect(encounterTrackFor('binah')).toBe('/audio/encounter.mp3');
    expect(encounterTrackFor('chesed')).toBe('/audio/encounter.mp3');
    expect(encounterTrackFor('gevurah')).toBe('/audio/encounter.mp3');
    expect(encounterTrackFor('tiferet')).toBe('/audio/encounter.mp3');
    expect(encounterTrackFor('netzach')).toBe('/audio/encounter.mp3');
    expect(encounterTrackFor('hod')).toBe('/audio/encounter.mp3');
    expect(encounterTrackFor('malkuth')).toBe('/audio/encounter.mp3');
  });

  it('only the Yesod entry is present in the stub manifest', () => {
    // Every other entry resolves to the fallback, so the live entries
    // are precisely the keys that exist on the manifest object.
    expect(Object.keys(ENCOUNTER_TRACKS)).toEqual(['yesod']);
  });
});
