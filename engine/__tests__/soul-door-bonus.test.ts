import { describe, expect, it } from 'vitest';
import { soulDoorDcDelta, SOUL_DOOR_DC_DELTA } from '../soul-door-bonus';
import { soulDoorsForSign, type SefirahKey, type ZodiacSignKey } from '@/data';

const ALL_SIGNS: readonly ZodiacSignKey[] = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
];

const ALL_SEFIROT: readonly SefirahKey[] = [
  'kether',
  'chokmah',
  'binah',
  'chesed',
  'gevurah',
  'tiferet',
  'netzach',
  'hod',
  'yesod',
  'malkuth',
];

describe('SOUL_DOOR_DC_DELTA', () => {
  // Magnitude is locked at -2 in the design doc (D1) — matches the +2
  // exaltation magnitude in #212's dignity table so the two layers
  // stay commensurate. Fixed-value test guards against accidental
  // re-tuning that would silently re-balance every Door challenge.
  it('is -2 (matches the +2 exaltation magnitude in #212)', () => {
    expect(SOUL_DOOR_DC_DELTA).toBe(-2);
  });
});

describe('soulDoorDcDelta', () => {
  it("returns -2 when the Sefirah is one of the class's Doors", () => {
    // Spot checks across a range of signs and Door pairs.
    expect(soulDoorDcDelta('aries', 'chokmah')).toBe(-2);
    expect(soulDoorDcDelta('aries', 'tiferet')).toBe(-2);
    expect(soulDoorDcDelta('libra', 'gevurah')).toBe(-2);
    expect(soulDoorDcDelta('libra', 'tiferet')).toBe(-2);
    expect(soulDoorDcDelta('scorpio', 'tiferet')).toBe(-2);
    expect(soulDoorDcDelta('scorpio', 'netzach')).toBe(-2);
    expect(soulDoorDcDelta('pisces', 'netzach')).toBe(-2);
  });

  it("returns 0 when the Sefirah is not one of the class's Doors", () => {
    expect(soulDoorDcDelta('aries', 'hod')).toBe(0);
    expect(soulDoorDcDelta('aries', 'yesod')).toBe(0);
    expect(soulDoorDcDelta('libra', 'binah')).toBe(0);
    expect(soulDoorDcDelta('pisces', 'tiferet')).toBe(0);
  });

  // Pisces is structurally unique: only one Door (Netzach), because
  // The Moon's other endpoint is Malkuth and Malkuth has no Challenge.
  // Verify exhaustively that Pisces gets -2 only at Netzach.
  it.each(ALL_SEFIROT)('Pisces at %s — only Netzach is a Door', (sefirah) => {
    expect(soulDoorDcDelta('pisces', sefirah)).toBe(sefirah === 'netzach' ? -2 : 0);
  });

  // Tiferet is the busiest Door — 7 of the 12 classes have it (Aries,
  // Gemini, Virgo, Libra, Scorpio, Sagittarius, Capricorn). Verify the
  // 7-vs-5 split.
  it.each(ALL_SIGNS)('%s at Tiferet — match the per-class Door table', (sign) => {
    const expected = soulDoorsForSign(sign).includes('tiferet') ? -2 : 0;
    expect(soulDoorDcDelta(sign, 'tiferet')).toBe(expected);
  });

  // Hod is the loneliest Door — only Capricorn (via The Devil, path 26)
  // has it. Inverse of Tiferet's check.
  it.each(ALL_SIGNS)('%s at Hod — only Capricorn is a Door', (sign) => {
    expect(soulDoorDcDelta(sign, 'hod')).toBe(sign === 'capricorn' ? -2 : 0);
  });

  // Malkuth has no Challenge; no class has it as a Door (per Door
  // table in design/soul-doors.md § 3 + data/soul-doors.ts). Always 0.
  it.each(ALL_SIGNS)('%s at Malkuth — never a Door', (sign) => {
    expect(soulDoorDcDelta(sign, 'malkuth')).toBe(0);
  });

  // Kether's Final Threshold is collective (D6) — never a per-player
  // Door for any class. Always 0.
  it.each(ALL_SIGNS)('%s at Kether — never a Door', (sign) => {
    expect(soulDoorDcDelta(sign, 'kether')).toBe(0);
  });

  // Exhaustive cross-check against the data layer: for every (sign,
  // sefirah) pair, the engine helper agrees with the source table.
  // 12 × 10 = 120 cases. The exhaustive grid is the load-bearing
  // assertion — spot-checks above are convenience, this is correctness.
  it.each(ALL_SIGNS)('%s — full Sefirah grid agrees with data/soul-doors.ts', (sign) => {
    const doors = soulDoorsForSign(sign);
    for (const sefirah of ALL_SEFIROT) {
      const expected = doors.includes(sefirah) ? -2 : 0;
      expect(soulDoorDcDelta(sign, sefirah), `${sign} at ${sefirah}`).toBe(expected);
    }
  });

  // Aggregate count: there should be exactly 23 (sign, sefirah) cells
  // that return -2 across the full 120-cell grid (11 classes × 2 Doors
  // + 1 class × 1 Door = 23). Catches a regression where a class
  // gains or loses a Door silently.
  it('returns -2 for exactly 23 of the 120 (sign, sefirah) cells', () => {
    let count = 0;
    for (const sign of ALL_SIGNS) {
      for (const sefirah of ALL_SEFIROT) {
        if (soulDoorDcDelta(sign, sefirah) === -2) count++;
      }
    }
    expect(count).toBe(23);
  });
});
