/**
 * Public entrypoint for the symbolic data layer.
 *
 * Typed constants are re-exported from their respective modules. Lookup
 * helpers throw on miss — symbolic content is fixed at build time, and a
 * miss always indicates a programming error (bad key, out-of-range
 * number), not a runtime data issue. Throwing keeps call sites from
 * sprinkling `!` / null-checks everywhere.
 *
 * Lookups are backed by `Map`s computed once at module load. O(1) access
 * across the data, and the engine can call these freely in hot paths
 * without degrading as datasets grow.
 */

import { arcana } from './arcana';
import { letters } from './letters';
import { paths } from './paths';
import { sefirot } from './sefirot';
import { soulAspects } from './soul-aspects';
import type {
  Arcanum,
  HebrewLetter,
  LetterKey,
  Path,
  Sefirah,
  SefirahKey,
  SoulAspect,
  SoulAspectKey,
} from './types';

export { sefirot } from './sefirot';
export { letters } from './letters';
export { arcana } from './arcana';
export { paths } from './paths';
export { soulAspects } from './soul-aspects';
export * from './types';

// ──────────────── Indexes (built once) ────────────────

const sefirotByKeyIndex = new Map<SefirahKey, Sefirah>(sefirot.map((s) => [s.key, s]));
const sefirotByNumberIndex = new Map<number, Sefirah>(sefirot.map((s) => [s.number, s]));
const lettersByKeyIndex = new Map<LetterKey, HebrewLetter>(letters.map((l) => [l.key, l]));
const arcanaByNumberIndex = new Map<number, Arcanum>(arcana.map((a) => [a.number, a]));
const pathsByNumberIndex = new Map<number, Path>(paths.map((p) => [p.number, p]));
const soulAspectsByKeyIndex = new Map<SoulAspectKey, SoulAspect>(
  soulAspects.map((a) => [a.key, a]),
);

// ──────────────── Lookups ────────────────

export function sefirahByKey(key: SefirahKey): Sefirah {
  const found = sefirotByKeyIndex.get(key);
  if (!found) {
    throw new Error(`Unknown Sefirah key: ${key}`);
  }
  return found;
}

export function sefirahByNumber(n: number): Sefirah {
  const found = sefirotByNumberIndex.get(n);
  if (!found) {
    throw new Error(`No Sefirah with number ${n} (valid: 1-10)`);
  }
  return found;
}

export function letterByKey(key: LetterKey): HebrewLetter {
  const found = lettersByKeyIndex.get(key);
  if (!found) {
    throw new Error(`Unknown Hebrew letter key: ${key}`);
  }
  return found;
}

export function arcanumByNumber(n: number): Arcanum {
  const found = arcanaByNumberIndex.get(n);
  if (!found) {
    throw new Error(`No Arcanum with number ${n} (valid: 0-21)`);
  }
  return found;
}

export function pathByNumber(n: number): Path {
  const found = pathsByNumberIndex.get(n);
  if (!found) {
    throw new Error(`No Path with number ${n} (valid: 11-32)`);
  }
  return found;
}

/**
 * Non-throwing variant of `pathByNumber` — returns the Path record or
 * `undefined`. Use when the caller genuinely doesn't know whether the
 * number is valid (e.g. user-supplied input the engine must reject
 * without surfacing a throw up the stack).
 */
export function tryPathByNumber(n: number): Path | undefined {
  return pathsByNumberIndex.get(n);
}

/** Path → Arcanum: every path has exactly one arcanum (its "key card"). */
export function arcanumByPath(pathNumber: number): Arcanum {
  const path = pathByNumber(pathNumber);
  return arcanumByNumber(path.arcanumNumber);
}

/** Arcanum → Path: the inverse of `arcanumByPath`. */
export function pathByArcanum(arcanumNumber: number): Path {
  const arc = arcanumByNumber(arcanumNumber);
  return pathByNumber(arc.pathNumber);
}

/** Soul Aspect → the aspect record. */
export function soulAspectByKey(key: SoulAspectKey): SoulAspect {
  const found = soulAspectsByKeyIndex.get(key);
  if (!found) {
    throw new Error(`Unknown Soul Aspect key: ${key}`);
  }
  return found;
}
