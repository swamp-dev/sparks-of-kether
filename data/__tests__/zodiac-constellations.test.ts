import { describe, expect, it } from 'vitest';
import { ZODIAC_CONSTELLATIONS } from '../zodiac-constellations';
import { zodiacSigns } from '../zodiac-signs';

/**
 * Per-sign asterism data (#314). Each entry carries a list of stars
 * (normalised x/y in [0..1]) plus a list of edges that connect them
 * into the canonical line-art of the constellation. The picker draws
 * stars as faint circles and edges as faint lines.
 *
 * Data integrity: every sign keyed; every edge index in range; star
 * count matches stars.length; coordinates inside the unit square so
 * the SVG viewBox math stays simple.
 */

describe('ZODIAC_CONSTELLATIONS', () => {
  it('has an entry for every zodiac sign', () => {
    for (const sign of zodiacSigns) {
      expect(
        ZODIAC_CONSTELLATIONS[sign.key],
        `entry for ${sign.key}`,
      ).toBeDefined();
    }
  });

  it('every star coordinate sits inside the [0..1] unit square', () => {
    for (const sign of zodiacSigns) {
      const { stars } = ZODIAC_CONSTELLATIONS[sign.key];
      for (const star of stars) {
        expect(star.x, `${sign.key} star x`).toBeGreaterThanOrEqual(0);
        expect(star.x, `${sign.key} star x`).toBeLessThanOrEqual(1);
        expect(star.y, `${sign.key} star y`).toBeGreaterThanOrEqual(0);
        expect(star.y, `${sign.key} star y`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('every edge references valid star indices', () => {
    for (const sign of zodiacSigns) {
      const entry = ZODIAC_CONSTELLATIONS[sign.key];
      for (const [from, to] of entry.edges) {
        expect(
          from,
          `${sign.key} edge from-index in range`,
        ).toBeGreaterThanOrEqual(0);
        expect(from, `${sign.key} edge from-index < starCount`).toBeLessThan(
          entry.stars.length,
        );
        expect(
          to,
          `${sign.key} edge to-index in range`,
        ).toBeGreaterThanOrEqual(0);
        expect(to, `${sign.key} edge to-index < starCount`).toBeLessThan(
          entry.stars.length,
        );
        expect(from, `${sign.key} edge no self-loop`).not.toBe(to);
      }
    }
  });

  it('every constellation has at least 2 stars and 1 edge', () => {
    for (const sign of zodiacSigns) {
      const entry = ZODIAC_CONSTELLATIONS[sign.key];
      expect(entry.stars.length, `${sign.key} stars >= 2`).toBeGreaterThanOrEqual(2);
      expect(entry.edges.length, `${sign.key} edges >= 1`).toBeGreaterThanOrEqual(1);
    }
  });
});
