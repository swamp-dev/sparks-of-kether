import { describe, expect, it } from 'vitest';
import { buildExpectedClipMap, hashText } from '../build-manifest';
import { detectDrift, type Manifest } from '../check-drift';

/**
 * Unit tests for the voice drift detection system (#258).
 *
 * Tests the pure functions: buildExpectedClipMap, hashText, detectDrift.
 * The I/O shell (readManifest, main) is thin orchestration around these
 * helpers and is not tested here.
 */

describe('hashText', () => {
  it('produces a sha256: prefixed hex string', () => {
    const h = hashText('hello world');
    expect(h).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('is deterministic for the same input', () => {
    expect(hashText('some text')).toBe(hashText('some text'));
  });

  it('differs for different inputs', () => {
    expect(hashText('text A')).not.toBe(hashText('text B'));
  });
});

describe('buildExpectedClipMap', () => {
  const map = buildExpectedClipMap();

  it('generates exactly 864 clips (576 verdicts + 288 responses)', () => {
    expect(map.size).toBe(864);
  });

  it('generates 576 verdict clips', () => {
    const verdictCount = [...map.keys()].filter((k) => k.startsWith('verdict')).length;
    expect(verdictCount).toBe(576);
  });

  it('generates 288 response clips', () => {
    const responseCount = [...map.keys()].filter((k) => k.startsWith('response')).length;
    expect(responseCount).toBe(288);
  });

  it('uses the correct key format for verdict clips', () => {
    const key = 'verdict-hod-aries-pass-0';
    expect(map.has(key)).toBe(true);
    const entry = map.get(key)!;
    expect(entry.key).toBe(key);
    expect(entry.text.length).toBeGreaterThan(10);
    expect(entry.textHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('uses the correct key format for response clips', () => {
    const key = 'response-hod-aries-0';
    expect(map.has(key)).toBe(true);
  });

  it('covers all three variants (0, 1, 2) per cell', () => {
    for (const variant of [0, 1, 2] as const) {
      expect(map.has(`verdict-hod-aries-pass-${variant}`)).toBe(true);
      expect(map.has(`verdict-hod-aries-fail-${variant}`)).toBe(true);
      expect(map.has(`response-hod-aries-${variant}`)).toBe(true);
    }
  });

  it('covers all 8 encounter avatar keys', () => {
    const avatars = ['chokmah', 'binah', 'chesed', 'gevurah', 'tiferet', 'netzach', 'hod', 'yesod'];
    for (const avatar of avatars) {
      expect(map.has(`verdict-${avatar}-aries-pass-0`)).toBe(true);
    }
  });

  it('covers all 12 zodiac signs', () => {
    const signs = [
      'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
      'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
    ];
    for (const sign of signs) {
      expect(map.has(`verdict-hod-${sign}-pass-0`)).toBe(true);
    }
  });
});

describe('detectDrift', () => {
  function makeManifest(clips: Record<string, { textHash: string; textSnippet?: string }>): Manifest {
    const manifestClips: Record<string, { textHash: string; textSnippet?: string }> = {};
    for (const [k, v] of Object.entries(clips)) {
      const entry: { textHash: string; textSnippet?: string } = { textHash: v.textHash };
      if (v.textSnippet !== undefined) entry.textSnippet = v.textSnippet;
      manifestClips[k] = entry;
    }
    return {
      version: '1',
      generatedAt: '2026-05-22T00:00:00Z',
      clips: manifestClips,
    };
  }

  it('returns no stale and no missing when manifest is clean', () => {
    const expected = buildExpectedClipMap();
    const clips: Record<string, { textHash: string; textSnippet: string }> = {};
    for (const [key, entry] of expected) {
      clips[key] = { textHash: entry.textHash, textSnippet: entry.text.slice(0, 60) };
    }
    const manifest = makeManifest(clips);
    const { stale, missing } = detectDrift(manifest, expected);
    expect(stale).toHaveLength(0);
    expect(missing).toHaveLength(0);
  });

  it('reports a clip as stale when its hash differs', () => {
    const expected = buildExpectedClipMap();
    const clips: Record<string, { textHash: string }> = {};
    for (const [key, entry] of expected) {
      clips[key] = { textHash: entry.textHash };
    }
    // Corrupt one hash to simulate text drift.
    clips['verdict-hod-aries-pass-0'] = { textHash: 'sha256:deadbeef' + '0'.repeat(56) };
    const manifest = makeManifest(clips);
    const { stale, missing } = detectDrift(manifest, expected);
    expect(stale).toHaveLength(1);
    expect(stale[0]?.key).toBe('verdict-hod-aries-pass-0');
    expect(missing).toHaveLength(0);
  });

  it('reports a clip as missing when it is absent from the manifest', () => {
    const expected = buildExpectedClipMap();
    const clips: Record<string, { textHash: string }> = {};
    for (const [key, entry] of expected) {
      clips[key] = { textHash: entry.textHash };
    }
    // Remove one entry to simulate missing audio.
    delete clips['verdict-hod-aries-pass-0'];
    const manifest = makeManifest(clips);
    const { stale, missing } = detectDrift(manifest, expected);
    expect(missing).toHaveLength(1);
    expect(missing[0]).toBe('verdict-hod-aries-pass-0');
    expect(stale).toHaveLength(0);
  });

  it('reports multiple stale and missing clips independently', () => {
    const expected = buildExpectedClipMap();
    const clips: Record<string, { textHash: string }> = {};
    for (const [key, entry] of expected) {
      clips[key] = { textHash: entry.textHash };
    }
    clips['verdict-hod-aries-pass-0'] = { textHash: 'sha256:' + 'a'.repeat(64) };
    clips['verdict-hod-aries-pass-1'] = { textHash: 'sha256:' + 'b'.repeat(64) };
    delete clips['response-hod-aries-0'];
    delete clips['response-hod-aries-1'];
    const manifest = makeManifest(clips);
    const { stale, missing } = detectDrift(manifest, expected);
    expect(stale).toHaveLength(2);
    expect(missing).toHaveLength(2);
  });
});
