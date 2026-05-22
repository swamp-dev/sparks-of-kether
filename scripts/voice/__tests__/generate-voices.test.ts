import { describe, expect, it } from 'vitest';
import { buildClipList, estimateCharCount, type VoiceConfig, type Clip } from '../generate-voices';

// Minimal voice config covering the 8 encounter avatars + hestia, and 3 zodiac signs
const MOCK_CONFIG: VoiceConfig = {
  service: 'elevenlabs',
  model: 'eleven_multilingual_v2',
  outputFormat: 'mp3_44100_96',
  avatars: {
    athena: { voiceId: 'v-athena', name: 'Athena Voice' },
    demeter: { voiceId: 'v-demeter', name: 'Demeter Voice' },
    zeus: { voiceId: 'v-zeus', name: 'Zeus Voice' },
    ares: { voiceId: 'v-ares', name: 'Ares Voice' },
    apollo: { voiceId: 'v-apollo', name: 'Apollo Voice' },
    aphrodite: { voiceId: 'v-aphrodite', name: 'Aphrodite Voice' },
    hermes: { voiceId: 'v-hermes', name: 'Hermes Voice' },
    selene: { voiceId: 'v-selene', name: 'Selene Voice' },
    hestia: { voiceId: 'v-hestia', name: 'Hestia Voice' },
    kether: { voiceId: 'v-kether', name: 'Kether Voice' },
  },
  zodiac: {
    aries: { voiceId: 'z-aries', name: 'Aries Voice' },
    taurus: { voiceId: 'z-taurus', name: 'Taurus Voice' },
    gemini: { voiceId: 'z-gemini', name: 'Gemini Voice' },
    cancer: { voiceId: 'z-cancer', name: 'Cancer Voice' },
    leo: { voiceId: 'z-leo', name: 'Leo Voice' },
    virgo: { voiceId: 'z-virgo', name: 'Virgo Voice' },
    libra: { voiceId: 'z-libra', name: 'Libra Voice' },
    scorpio: { voiceId: 'z-scorpio', name: 'Scorpio Voice' },
    sagittarius: { voiceId: 'z-sagittarius', name: 'Sagittarius Voice' },
    capricorn: { voiceId: 'z-capricorn', name: 'Capricorn Voice' },
    aquarius: { voiceId: 'z-aquarius', name: 'Aquarius Voice' },
    pisces: { voiceId: 'z-pisces', name: 'Pisces Voice' },
  },
};

describe('buildClipList', () => {
  it('produces exactly 873 clips with no filters', () => {
    const clips = buildClipList(MOCK_CONFIG, {});
    // 576 verdicts + 288 responses + 9 greetings
    expect(clips).toHaveLength(873);
  });

  it('produces exactly 576 verdict clips', () => {
    const clips = buildClipList(MOCK_CONFIG, { onlyType: 'verdicts' });
    // 8 avatars × 12 signs × 2 outcomes × 3 variants
    expect(clips).toHaveLength(576);
  });

  it('produces exactly 288 response clips', () => {
    const clips = buildClipList(MOCK_CONFIG, { onlyType: 'responses' });
    // 8 avatars × 12 signs × 3 variants
    expect(clips).toHaveLength(288);
  });

  it('produces exactly 9 greeting clips', () => {
    const clips = buildClipList(MOCK_CONFIG, { onlyType: 'greetings' });
    // 8 encounter avatars + hestia
    expect(clips).toHaveLength(9);
  });

  it('filters to hermes clips with --only-avatar hermes', () => {
    const clips = buildClipList(MOCK_CONFIG, { onlyAvatar: 'hermes' });
    // 72 verdicts (12 × 2 × 3) + 36 responses (12 × 3) + 1 greeting
    expect(clips).toHaveLength(109);
  });

  it('verdict clip output path matches lib/voice/paths.ts convention', () => {
    const clips = buildClipList(MOCK_CONFIG, { onlyType: 'verdicts', onlyAvatar: 'hermes' });
    const first = clips[0] as Clip;
    // paths.ts: verdict-{sefirahKey}-{sign}-{outcome}-{variant}.mp3
    // hermes → hod
    expect(first.outputPath).toMatch(
      /^public\/audio\/voice\/verdict-hod-[a-z]+-(?:pass|fail)-[012]\.mp3$/,
    );
  });

  it('response clip output path matches lib/voice/paths.ts convention', () => {
    const clips = buildClipList(MOCK_CONFIG, { onlyType: 'responses', onlyAvatar: 'hermes' });
    const first = clips[0] as Clip;
    // paths.ts: response-{sefirahKey}-{sign}-{variant}.mp3
    expect(first.outputPath).toMatch(/^public\/audio\/voice\/response-hod-[a-z]+-[012]\.mp3$/);
  });

  it('greeting clip output path uses lowercase character name', () => {
    const clips = buildClipList(MOCK_CONFIG, { onlyType: 'greetings', onlyAvatar: 'hermes' });
    expect(clips).toHaveLength(1);
    expect((clips[0] as Clip).outputPath).toBe('public/audio/voice/greeting-hermes.mp3');
  });

  it('verdict clips use the avatar voice ID', () => {
    const clips = buildClipList(MOCK_CONFIG, { onlyType: 'verdicts', onlyAvatar: 'hermes' });
    for (const clip of clips) {
      expect(clip.voiceId).toBe('v-hermes');
    }
  });

  it('response clips use the zodiac sign voice ID', () => {
    const clips = buildClipList(MOCK_CONFIG, { onlyType: 'responses', onlyAvatar: 'hermes' });
    for (const clip of clips) {
      // voice ID should be from zodiac section, matching the sign in the filename
      const sign = clip.outputPath.match(/response-hod-([a-z]+)-/)![1]!;
      expect(clip.voiceId).toBe(
        MOCK_CONFIG.zodiac[sign as keyof typeof MOCK_CONFIG.zodiac]!.voiceId,
      );
    }
  });

  it('all clip texts are non-empty strings', () => {
    const clips = buildClipList(MOCK_CONFIG, {});
    for (const clip of clips) {
      expect(typeof clip.text).toBe('string');
      expect(clip.text.length).toBeGreaterThan(0);
    }
  });

  it('all clip output paths are unique', () => {
    const clips = buildClipList(MOCK_CONFIG, {});
    const paths = clips.map((c) => c.outputPath);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe('estimateCharCount', () => {
  it('returns 0 for empty clip list', () => {
    expect(estimateCharCount([])).toBe(0);
  });

  it('sums character counts of all clip texts', () => {
    const clips: Clip[] = [
      { voiceId: 'v1', text: 'hello', outputPath: 'a.mp3' },
      { voiceId: 'v2', text: 'world!!', outputPath: 'b.mp3' },
    ];
    expect(estimateCharCount(clips)).toBe(12);
  });

  it('returns a positive number for the full clip list', () => {
    const clips = buildClipList(MOCK_CONFIG, {});
    expect(estimateCharCount(clips)).toBeGreaterThan(0);
  });
});
