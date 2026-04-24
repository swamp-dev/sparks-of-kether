/**
 * Seedable random-number generator for the engine.
 *
 * Every engine function that needs randomness takes an `Rng` instance so
 * tests can seed a deterministic sequence. Production code creates one
 * from `Date.now()` (or a server-side seed) at game-start; tests create
 * one with a literal integer so outcomes are reproducible.
 *
 * The algorithm is Mulberry32 — a tiny, well-distributed 32-bit PRNG.
 * It's not cryptographically secure (we don't need it to be) but is
 * plenty good for game dice.
 *
 *   https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32
 */

export interface Rng {
  /** Return an integer in the inclusive range [min, max]. */
  int(min: number, max: number): number;
  /** Roll a single d20 — shorthand for `int(1, 20)`. */
  d20(): number;
}

/**
 * Create a fresh `Rng` from a 32-bit integer seed. Two instances with
 * the same seed produce identical sequences.
 *
 * Seeds are truncated to 32 bits (`seed >>> 0`). Seed `0` is a valid
 * input — the first call bumps the internal state before sampling,
 * so no "all zeros" sequence is possible. For prod, seed with a value
 * that fits 32 bits: `seededRng(Math.floor(Math.random() * 0x100000000))`
 * or `seededRng(Date.now() >>> 0)` (the raw millisecond value would
 * otherwise silently truncate).
 *
 * `nextFloat()` samples in [0, 1) — never exactly 1.0 — so
 * `int(min, max)` is guaranteed to return a value in the inclusive
 * range without an off-by-one at the upper bound. `int(n, n)` correctly
 * returns `n`.
 */
export function seededRng(seed: number): Rng {
  // Keep the state in a closure; the returned object only exposes the
  // sampling API so callers can't step on internals.
  let state = seed >>> 0;

  // Mulberry32: 32-bit state, returns a float in [0, 1).
  function nextFloat(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  }

  return {
    int(min: number, max: number): number {
      if (!Number.isInteger(min) || !Number.isInteger(max)) {
        throw new Error(`Rng.int: non-integer bounds (min=${min}, max=${max})`);
      }
      if (min > max) {
        throw new Error(`Rng.int: min > max (min=${min}, max=${max})`);
      }
      return min + Math.floor(nextFloat() * (max - min + 1));
    },
    d20(): number {
      return this.int(1, 20);
    },
  };
}
