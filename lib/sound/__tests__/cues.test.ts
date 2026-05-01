import { describe, it, expect } from 'vitest';
import { CUE_FILES, type SoundCue } from '../cues';

/**
 * Pin the cue → file map (#321):
 *
 *   - Eight cues, one per gameplay event.
 *   - Each entry resolves to a public-served audio path.
 *   - File paths are typed off the `SoundCue` literal union so a
 *     mistyped cue name fails at compile time, not at first play.
 *
 * The mp3 file living at the path is asserted by the audio-asset
 * presence test (a separate spec), not here. This spec pins the
 * SHAPE of the registry only.
 */
describe('CUE_FILES', () => {
  const expectedCues: readonly SoundCue[] = [
    'spark-collected',
    'illumination-up',
    'separation-up',
    'shell-awakened',
    'shell-banished',
    'card-drawn',
    'encounter-pass',
    'encounter-fail',
  ];

  it('exposes exactly the 8 cues the design system promises', () => {
    expect(Object.keys(CUE_FILES).sort()).toEqual([...expectedCues].sort());
  });

  it('every cue resolves to an /audio/ public path', () => {
    for (const cue of expectedCues) {
      expect(CUE_FILES[cue]).toMatch(/^\/audio\/.+\.mp3$/);
    }
  });
});
