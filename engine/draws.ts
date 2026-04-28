import type { Rng } from './rng';

/**
 * Shared draw-pile helpers (#56). Both `lib/turn-machine.ts` (post-
 * move replenishment) and `engine/sparks.ts` (Kether-Unity) need
 * recycle-when-empty behaviour, and per `design/mechanics.md`
 * § Discard recycle the recycle MUST shuffle — otherwise a player
 * who memorises the discard order can predict every subsequent
 * draw.
 *
 * Keeping the helpers here so the engine and the turn-machine share
 * one implementation. Engine boundary stays clean: `lib/` imports
 * from `engine/`, never the reverse.
 */

/**
 * Fisher-Yates shuffle. Pure: returns a new array; `arr` is unchanged.
 * Uses `Rng.int(min, max)` so the shuffle is deterministic for a
 * seeded RNG (tests pin specific outcomes by seed).
 */
export function shuffleArray<T>(arr: readonly T[], rng: Rng): readonly T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    const tmp = out[i] as T;
    out[i] = out[j] as T;
    out[j] = tmp;
  }
  return out;
}

/**
 * If `deck` is empty and `discard` is non-empty, return a recycled
 * pair (shuffled discard becomes the new deck; discard is empty).
 * Otherwise return the inputs unchanged. Pure.
 *
 * Returning the structurally-equal input on the no-op path lets
 * callers compare references when checking whether a recycle
 * happened (e.g. for analytics or telemetry).
 */
export function recycleDiscardIntoDeck(
  deck: readonly number[],
  discard: readonly number[],
  rng: Rng,
): { readonly deck: readonly number[]; readonly discard: readonly number[] } {
  if (deck.length > 0 || discard.length === 0) {
    return { deck, discard };
  }
  return { deck: shuffleArray(discard, rng), discard: [] };
}
