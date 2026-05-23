import { describe, it, expect } from 'vitest';
import { CUE_FILES, avatarArrivesCueFor, avatarGreetingVoicePathFor, type SoundCue } from '../cues';

/**
 * Pin the cue → file map (#321 + #484):
 *
 *   - 17 cues total: 8 gameplay-event cues from #321 + 9 per-Sefirah
 *     avatar-arrival stings from #484.
 *   - Each entry resolves to a public-served audio path.
 *   - File paths are typed off the `SoundCue` literal union so a
 *     mistyped cue name fails at compile time, not at first play.
 *
 * The mp3 file living at the path is asserted by the audio-asset
 * presence test (a separate spec), not here. This spec pins the
 * SHAPE of the registry + the avatar-arrival sting helper.
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
    'avatar-arrives-athena',
    'avatar-arrives-demeter',
    'avatar-arrives-zeus',
    'avatar-arrives-ares',
    'avatar-arrives-apollo',
    'avatar-arrives-aphrodite',
    'avatar-arrives-hermes',
    'avatar-arrives-selene',
    'avatar-arrives-hestia',
  ];

  it('exposes exactly the 17 cues the design system promises', () => {
    expect(Object.keys(CUE_FILES).sort()).toEqual([...expectedCues].sort());
  });

  it('every cue resolves to an /audio/ public path', () => {
    for (const cue of expectedCues) {
      expect(CUE_FILES[cue]).toMatch(/^\/audio\/.+\.mp3$/);
    }
  });
});

describe('avatarArrivesCueFor (#484)', () => {
  it('maps each encounter Sefirah to its avatar sting', () => {
    expect(avatarArrivesCueFor('chokmah')).toBe('avatar-arrives-athena');
    expect(avatarArrivesCueFor('binah')).toBe('avatar-arrives-demeter');
    expect(avatarArrivesCueFor('chesed')).toBe('avatar-arrives-zeus');
    expect(avatarArrivesCueFor('gevurah')).toBe('avatar-arrives-ares');
    expect(avatarArrivesCueFor('tiferet')).toBe('avatar-arrives-apollo');
    expect(avatarArrivesCueFor('netzach')).toBe('avatar-arrives-aphrodite');
    expect(avatarArrivesCueFor('hod')).toBe('avatar-arrives-hermes');
    expect(avatarArrivesCueFor('yesod')).toBe('avatar-arrives-selene');
  });

  it('returns the Hestia sting for Malkuth', () => {
    expect(avatarArrivesCueFor('malkuth')).toBe('avatar-arrives-hestia');
  });

  it('returns null for Kether (no avatar — collective threshold)', () => {
    expect(avatarArrivesCueFor('kether')).toBeNull();
  });
});

describe('avatarGreetingVoicePathFor (#230)', () => {
  it('maps each encounter Sefirah to its avatar greeting voice path', () => {
    expect(avatarGreetingVoicePathFor('chokmah')).toBe('/audio/voice/greeting-athena.mp3');
    expect(avatarGreetingVoicePathFor('binah')).toBe('/audio/voice/greeting-demeter.mp3');
    expect(avatarGreetingVoicePathFor('chesed')).toBe('/audio/voice/greeting-zeus.mp3');
    expect(avatarGreetingVoicePathFor('gevurah')).toBe('/audio/voice/greeting-ares.mp3');
    expect(avatarGreetingVoicePathFor('tiferet')).toBe('/audio/voice/greeting-apollo.mp3');
    expect(avatarGreetingVoicePathFor('netzach')).toBe('/audio/voice/greeting-aphrodite.mp3');
    expect(avatarGreetingVoicePathFor('hod')).toBe('/audio/voice/greeting-hermes.mp3');
    expect(avatarGreetingVoicePathFor('yesod')).toBe('/audio/voice/greeting-selene.mp3');
  });

  it('returns the Hestia greeting for Malkuth', () => {
    expect(avatarGreetingVoicePathFor('malkuth')).toBe('/audio/voice/greeting-hestia.mp3');
  });

  it('returns null for Kether (narrator handled by #231)', () => {
    expect(avatarGreetingVoicePathFor('kether')).toBeNull();
  });
});
