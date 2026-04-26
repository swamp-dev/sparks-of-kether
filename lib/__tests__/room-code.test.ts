import { describe, expect, it } from 'vitest';
import {
  ROOM_CODE_LENGTH,
  generateRoomCode,
  normalizeRoomCode,
} from '../room-code';

describe('generateRoomCode', () => {
  it('returns a 6-character string', () => {
    const code = generateRoomCode();
    expect(code.length).toBe(ROOM_CODE_LENGTH);
  });

  it('uses only uppercase confusable-free characters', () => {
    // Run a thousand iterations; the alphabet has 32 chars so this
    // covers every position thoroughly.
    for (let i = 0; i < 1000; i++) {
      const code = generateRoomCode();
      expect(code).toMatch(/^[A-Z2-9]+$/);
      expect(code).not.toMatch(/[IO01]/);
    }
  });

  it('is deterministic with a deterministic rng', () => {
    let seed = 0;
    const rng = (): number => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    seed = 1;
    const a = generateRoomCode(rng);
    seed = 1;
    const b = generateRoomCode(rng);
    expect(a).toBe(b);
  });

  it('falls back gracefully if rng returns 1.0', () => {
    // Math.random is documented to return [0, 1) but a misbehaving
    // shim could break the contract. The fallback keeps codes valid.
    const code = generateRoomCode(() => 1.0);
    expect(code.length).toBe(ROOM_CODE_LENGTH);
    expect(code).toMatch(/^[A-Z2-9]+$/);
  });
});

describe('normalizeRoomCode', () => {
  it('accepts a clean code as-is', () => {
    expect(normalizeRoomCode('ABCDEF')).toBe('ABCDEF');
  });

  it('uppercases lowercase input', () => {
    expect(normalizeRoomCode('abcdef')).toBe('ABCDEF');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeRoomCode('  ABCDEF  ')).toBe('ABCDEF');
  });

  it('rejects wrong-length input', () => {
    expect(normalizeRoomCode('ABC')).toBeNull();
    expect(normalizeRoomCode('ABCDEFG')).toBeNull();
    expect(normalizeRoomCode('')).toBeNull();
  });

  it('rejects confusable characters', () => {
    expect(normalizeRoomCode('IBCDEF')).toBeNull();
    expect(normalizeRoomCode('OBCDEF')).toBeNull();
    expect(normalizeRoomCode('0BCDEF')).toBeNull();
    expect(normalizeRoomCode('1BCDEF')).toBeNull();
  });

  it('rejects non-alphanumeric', () => {
    expect(normalizeRoomCode('AB-DEF')).toBeNull();
    expect(normalizeRoomCode('AB DEF')).toBeNull();
  });
});
