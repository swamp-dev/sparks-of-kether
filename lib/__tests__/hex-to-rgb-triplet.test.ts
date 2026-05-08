import { describe, it, expect } from 'vitest';
import { hexToRgbTriplet } from '../hex-to-rgb-triplet';

describe('hexToRgbTriplet', () => {
  describe('with valid #rrggbb input', () => {
    it('parses lowercase hex', () => {
      expect(hexToRgbTriplet('#c0392b')).toBe('192, 57, 43');
    });

    it('parses uppercase hex', () => {
      expect(hexToRgbTriplet('#FFFFFF')).toBe('255, 255, 255');
    });

    it('parses mixed case hex', () => {
      expect(hexToRgbTriplet('#aB12cD')).toBe('171, 18, 205');
    });

    it('parses #000000', () => {
      expect(hexToRgbTriplet('#000000')).toBe('0, 0, 0');
    });
  });

  describe('rejects non-#rrggbb input', () => {
    it('throws on 3-digit shorthand', () => {
      expect(() => hexToRgbTriplet('#abc')).toThrow();
    });

    it('throws on missing leading #', () => {
      expect(() => hexToRgbTriplet('c0392b')).toThrow();
    });

    it('throws on rgb() function notation', () => {
      expect(() => hexToRgbTriplet('rgb(1, 2, 3)')).toThrow();
    });

    it('throws on CSS color names', () => {
      expect(() => hexToRgbTriplet('red')).toThrow();
    });

    it('throws on 7-digit hex', () => {
      expect(() => hexToRgbTriplet('#c0392bb')).toThrow();
    });

    it('throws on empty string', () => {
      expect(() => hexToRgbTriplet('')).toThrow();
    });

    it('throws on non-hex chars in the slot', () => {
      expect(() => hexToRgbTriplet('#zzzzzz')).toThrow();
    });

    it('error message includes the bad input for diagnosability', () => {
      expect(() => hexToRgbTriplet('not-a-hex')).toThrow(/not-a-hex/);
    });
  });
});
