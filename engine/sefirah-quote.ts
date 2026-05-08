import {
  dignitiesBySign,
  pickBlessing,
  sefirahByKey,
  zodiacSignByKey,
  type SefirahKey,
  type ZodiacSignKey,
} from '@/data';
import type { SefirahBlessingMatrix } from '@/data/pantheons/types';
import type { Rng } from './rng';

/**
 * Five-tier tone bucket for the Sefirah Voices Epic (#251 / T3 of #254).
 *
 * Differs from `data/types.ts`'s `Dignity` (`'rulership' | 'exaltation'
 * | 'detriment' | 'fall'`) in two ways:
 *
 *   - Adds `'neutral'` for cells where the Sefirah's planet has no
 *     classical or modern dignity in the sign (the majority of the
 *     120-cell matrix).
 *   - Renames `'rulership'` to `'ruler'` to align with the design
 *     doc's prose and the per-cell tier annotations on
 *     `design/sefirah-blessings.md`.
 *
 * The two types co-exist intentionally: `Dignity` is the four-slot
 * classical frame stored in `data/dignities.ts`, and is the unit the
 * stat-bonus engine works in (see `engine/zodiac-bonus.ts`).
 * `DignityRelationship` is the derived 5-tier tone bucket the blessing
 * surface speaks in.
 */
export type DignityRelationship =
  | 'ruler'
  | 'exaltation'
  | 'neutral'
  | 'detriment'
  | 'fall';

/**
 * Pure: resolve the dignity tier for a given Sefirah's planet in a
 * given zodiac sign. Walks the four classical dignities plus modern
 * co-rulers (Pluto/Scorpio, Neptune/Pisces) and returns the
 * "load-bearing" tier per the locked edge-case rules.
 *
 * Tier-priority rules (mirroring `design/sefirah-blessings.md` § 1):
 *
 *   - Malkuth (Earth, no `planetKey`) → always `neutral`. Hestia
 *     welcomes every sign equally; the blessing layer treats this
 *     as `neutral` and the matrix authoring (T1) followed suit.
 *   - **Kether (collective voice) → always `neutral`.** Per
 *     `design/final-threshold.md` § 1, "Kether's avatar is the team
 *     itself" — the Crown's blessing voice is intentionally
 *     dignity-agnostic. T1 authored all 12 Kether cells in the
 *     collective future-promise tone with the `neutral` tier tag,
 *     so the engine matches that contract here. Note that Kether's
 *     `planetKey` IS `pluto` (used by the stat-bonus engine in
 *     `engine/zodiac-bonus.ts` to compute Pluto's +1 co-rulership
 *     for Scorpio); this function diverges from that path on
 *     purpose because the blessing surface and the stat-bonus
 *     surface have different contracts.
 *   - When a sign is BOTH ruler and exalted for the same planet,
 *     `ruler` wins ("pick best at best pole"). Locked example:
 *     Virgo at Hod (Mercury double dignity) → `ruler`.
 *   - When a sign is BOTH detriment and fall for the same planet,
 *     `fall` wins ("pick worst at worst pole"). Locked example:
 *     Pisces at Hod (Mercury double affliction) → `fall`.
 *   - Modern co-rulers count as `ruler` for the matching Sefirah
 *     (other than Kether's special case above). Locked example:
 *     Pisces at Chokmah (Neptune co-ruler) → `ruler`.
 *
 * Implementation walks tiers in priority order — `ruler` (incl.
 * co-ruler), `exaltation`, then `fall` (worse than detriment, so
 * checked first), `detriment`, falling through to `neutral`.
 */
export function dignityRelationship(
  sefirah: SefirahKey,
  sign: ZodiacSignKey,
): DignityRelationship {
  // Special voices: Kether (collective) and Malkuth (Hestia) are
  // dignity-agnostic by design. Both the design doc and the T1
  // authoring author all of their cells in `neutral` tone; the
  // engine matches that authoring contract here so T4 can rely on
  // (Sefirah, sign) → tier returning the same tier the line was
  // written in.
  if (sefirah === 'kether' || sefirah === 'malkuth') return 'neutral';

  const sefirahRecord = sefirahByKey(sefirah);
  const planet = sefirahRecord.planetKey;

  // Defensive: any other Sefirah without a planetKey would also fall
  // through to neutral. None exist today, but the guard documents
  // the contract.
  if (planet === undefined) return 'neutral';

  const dignities = dignitiesBySign(sign);
  const signRecord = zodiacSignByKey(sign);

  if (dignities.rulership === planet || signRecord.coRuler === planet) {
    return 'ruler';
  }
  if (dignities.exaltation === planet) return 'exaltation';
  if (dignities.fall === planet) return 'fall';
  if (dignities.detriment === planet) return 'detriment';
  return 'neutral';
}

/**
 * Pick the blessing line for a given (sefirah, sign) from the
 * supplied matrix, uniformly at random across the 3 authored variants
 * via the engine's seedable Rng.
 *
 * Wraps `pickBlessing` for naming continuity with the design doc; the
 * variant-distribution rationale (the literary-review concern that
 * opener formulae must not become audible — see `Journal.md` for
 * #252) lives at this layer rather than in the data file.
 *
 * Matrix-as-parameter shape lets callers route to the active
 * pantheon's blessings via `usePantheon().pantheon.sefirahBlessings`.
 *
 * Callers that need the dignity tier for styling or copy choices
 * should compute it separately via `dignityRelationship`.
 */
export function quoteForBlessing(
  matrix: SefirahBlessingMatrix,
  sefirah: SefirahKey,
  sign: ZodiacSignKey,
  rng: Rng,
): string {
  return pickBlessing(matrix, sefirah, sign, rng);
}
