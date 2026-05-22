import { describe, expect, it } from 'vitest';
import {
  verdictVoicePath,
  playerResponseVoicePath,
  greetingVoicePath,
} from '../paths';

describe('verdictVoicePath', () => {
  it('produces correct path for variant 0', () => {
    expect(verdictVoicePath('chokmah', 'aries', 'pass', 0)).toBe(
      '/audio/voice/verdict-chokmah-aries-pass-0.mp3',
    );
  });

  it('produces correct path for fail outcome', () => {
    expect(verdictVoicePath('tiferet', 'scorpio', 'fail', 2)).toBe(
      '/audio/voice/verdict-tiferet-scorpio-fail-2.mp3',
    );
  });

  it('uses all three variant values', () => {
    expect(verdictVoicePath('hod', 'gemini', 'pass', 1)).toBe(
      '/audio/voice/verdict-hod-gemini-pass-1.mp3',
    );
    expect(verdictVoicePath('hod', 'gemini', 'pass', 2)).toBe(
      '/audio/voice/verdict-hod-gemini-pass-2.mp3',
    );
  });

  it('handles every avatar key', () => {
    const avatars = [
      'chokmah', 'binah', 'chesed', 'gevurah', 'tiferet',
      'netzach', 'hod', 'yesod',
    ] as const;
    for (const avatar of avatars) {
      const path = verdictVoicePath(avatar, 'aries', 'pass', 0);
      expect(path).toMatch(new RegExp(`/audio/voice/verdict-${avatar}-aries-pass-0\\.mp3`));
    }
  });
});

describe('playerResponseVoicePath', () => {
  it('produces correct path for variant 0', () => {
    expect(playerResponseVoicePath('chesed', 'leo', 0)).toBe(
      '/audio/voice/response-chesed-leo-0.mp3',
    );
  });

  it('produces correct path for variant 2', () => {
    expect(playerResponseVoicePath('yesod', 'pisces', 2)).toBe(
      '/audio/voice/response-yesod-pisces-2.mp3',
    );
  });

  it('handles every zodiac sign', () => {
    const signs = [
      'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
      'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
    ] as const;
    for (const sign of signs) {
      const path = playerResponseVoicePath('tiferet', sign, 0);
      expect(path).toMatch(new RegExp(`/audio/voice/response-tiferet-${sign}-0\\.mp3`));
    }
  });
});

describe('greetingVoicePath', () => {
  it('produces correct path for an avatar name', () => {
    expect(greetingVoicePath('athena')).toBe('/audio/voice/greeting-athena.mp3');
  });

  it('handles kether', () => {
    expect(greetingVoicePath('kether')).toBe('/audio/voice/greeting-kether.mp3');
  });

  it('lowercases the name in the path', () => {
    expect(greetingVoicePath('zeus')).toBe('/audio/voice/greeting-zeus.mp3');
  });
});
