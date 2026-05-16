import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolvePlaySeed } from '../play-seed';

/**
 * #402 — hot-seat seed resolver. The ?seed=N override exists so a
 * player who hits an interesting hand can paste the URL back to
 * reproduce. No-arg / non-numeric / missing param all fall back to
 * Date.now() so each fresh hot-seat session deals a different hand.
 */
describe('resolvePlaySeed', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {
      /* swallow log during this test */
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('honors ?seed=N when N parses as a finite integer', () => {
    const params = new URLSearchParams('seed=42');
    expect(resolvePlaySeed(params)).toBe(42);
  });

  it('honors ?seed=0 (a valid finite seed)', () => {
    const params = new URLSearchParams('seed=0');
    expect(resolvePlaySeed(params)).toBe(0);
  });

  it('truncates large seeds to 32 bits to match seededRng internals', () => {
    // Date.now() is ~1.7e12, well beyond 32 bits. seededRng does
    // `seed >>> 0` internally — so the resolver must do the same up
    // front, or the logged "replay" URL won't actually reproduce.
    const big = 0x1_0000_0001; // 2^32 + 1
    const params = new URLSearchParams(`seed=${big}`);
    expect(resolvePlaySeed(params)).toBe(1); // (2^32 + 1) >>> 0 === 1
  });

  it('falls back to Date.now()-truncated when no ?seed is present', () => {
    const params = new URLSearchParams('');
    const before = Date.now() >>> 0;
    const seed = resolvePlaySeed(params);
    const after = Date.now() >>> 0;
    // 32-bit truncated millisecond values are still monotone within
    // a span of seconds (2^32 ms ≈ 49.7 days), so a tight before/after
    // window holds.
    expect(seed).toBeGreaterThanOrEqual(before);
    expect(seed).toBeLessThanOrEqual(after);
    expect(seed).toBeLessThan(0x1_0000_0000);
  });

  it('falls back to Date.now() when ?seed value is non-numeric', () => {
    const params = new URLSearchParams('seed=not-a-number');
    const before = Date.now() >>> 0;
    const seed = resolvePlaySeed(params);
    const after = Date.now() >>> 0;
    expect(seed).toBeGreaterThanOrEqual(before);
    expect(seed).toBeLessThanOrEqual(after);
  });

  it('falls back to Date.now() when called with no params (SSR / safety case)', () => {
    const before = Date.now() >>> 0;
    const seed = resolvePlaySeed();
    const after = Date.now() >>> 0;
    expect(seed).toBeGreaterThanOrEqual(before);
    expect(seed).toBeLessThanOrEqual(after);
  });

  it('logs the seed and replay URL hint on console.info (fallback path)', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {
      /* swallow log during this test */
    });
    resolvePlaySeed(new URLSearchParams(''));
    expect(spy).toHaveBeenCalledOnce();
    const message = spy.mock.calls[0]?.[0];
    expect(message).toContain('seed:');
    expect(message).toContain('replay with ?seed=');
  });

  it('logs the explicit-seed source when ?seed is honored', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {
      /* swallow log during this test */
    });
    resolvePlaySeed(new URLSearchParams('seed=42'));
    expect(spy).toHaveBeenCalledOnce();
    const message = spy.mock.calls[0]?.[0];
    expect(message).toContain('42');
    expect(message).toContain('(from ?seed)');
  });
});
