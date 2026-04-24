/**
 * Shared types for the symbolic data layer.
 *
 * Source of truth for the content itself lives in `reference/*.md`. These
 * types encode the *shape* of that content so the engine and UI can
 * consume it without parsing markdown at runtime.
 */

// ──────────────── Sefirot ────────────────

export type SefirahKey =
  | 'kether'
  | 'chokmah'
  | 'binah'
  | 'chesed'
  | 'gevurah'
  | 'tiferet'
  | 'netzach'
  | 'hod'
  | 'yesod'
  | 'malkuth';

export type StatKey =
  | 'unity'
  | 'insight'
  | 'understanding'
  | 'lovingkindness'
  | 'strength'
  | 'harmony'
  | 'passion'
  | 'intellect'
  | 'intuition'
  | 'body';

export type Pillar = 'mercy' | 'severity' | 'balance';

/**
 * A Sefirah's challenge. Three semantically distinct shapes so the
 * engine can branch exhaustively in a `switch` without re-deriving
 * which kind it is from a null sentinel:
 *   - `check`: standard d20 + stat vs DC.
 *   - `no-check`: Malkuth's starting-waypoint state — set intention, no roll.
 *   - `collective`: Kether's Final Threshold — resolved across the team,
 *     not by a single roll.
 */
export type Challenge =
  | { readonly kind: 'check'; readonly dc: number }
  | { readonly kind: 'no-check' }
  | { readonly kind: 'collective' };

export interface Sefirah {
  readonly key: SefirahKey;
  /** Traditional numbering, 1 (Kether) through 10 (Malkuth). */
  readonly number: number;
  readonly hebrewName: string;
  readonly englishName: string;
  readonly pillar: Pillar;
  /** Planetary attribution, phrased as in `reference/sefirot.md`. */
  readonly planet: string;
  /** Hex color, matches Tailwind's per-Sefirah token. */
  readonly color: string;
  readonly bodyPart: string;
  readonly stat: StatKey;
  readonly challenge: Challenge;
  /** One-word description of the Shell's inversion of this Sefirah's gift. */
  readonly shellKeyword: string;
}

// ──────────────── Hebrew letters ────────────────

export type LetterKey =
  | 'aleph'
  | 'beth'
  | 'gimel'
  | 'daleth'
  | 'he'
  | 'vav'
  | 'zayin'
  | 'cheth'
  | 'teth'
  | 'yod'
  | 'kaph'
  | 'lamed'
  | 'mem'
  | 'nun'
  | 'samekh'
  | 'ayin'
  | 'peh'
  | 'tzaddi'
  | 'qoph'
  | 'resh'
  | 'shin'
  | 'tav';

/** Sepher Yetzirah classification. */
export type LetterClass = 'mother' | 'double' | 'simple';

export interface HebrewLetter {
  readonly key: LetterKey;
  readonly name: string;
  /** Unicode glyph, rendered right-to-left. */
  readonly glyph: string;
  /** Gematric value. Also serves as card value where sums matter. */
  readonly value: number;
  readonly meaning: string;
  readonly class: LetterClass;
  readonly attribution: Attribution;
  /** Path (11–32) to which the letter is attributed. */
  readonly pathNumber: number;
}

// ──────────────── Astrology ────────────────

/**
 * Sepher Yetzirah attributes exactly three elements to the Mother letters
 * (Aleph=Air, Mem=Water, Shin=Fire). Earth is the implicit fourth — it
 * appears in the Four Worlds / Minor Arcana system (not yet modelled
 * here). If Minor Arcana are added, extend this union with `'earth'`.
 */
export type Element = 'fire' | 'water' | 'air';
export type Planet =
  | 'mercury'
  | 'moon'
  | 'venus'
  | 'jupiter'
  | 'mars'
  | 'sun'
  | 'saturn';
export type ZodiacSign =
  | 'aries'
  | 'taurus'
  | 'gemini'
  | 'cancer'
  | 'leo'
  | 'virgo'
  | 'libra'
  | 'scorpio'
  | 'sagittarius'
  | 'capricorn'
  | 'aquarius'
  | 'pisces';

export type Attribution =
  | { readonly kind: 'element'; readonly value: Element }
  | { readonly kind: 'planet'; readonly value: Planet }
  | { readonly kind: 'sign'; readonly value: ZodiacSign };

// ──────────────── Major Arcana ────────────────

export interface Arcanum {
  /** 0 (The Fool) through 21 (The World). */
  readonly number: number;
  readonly name: string;
  readonly letterKey: LetterKey;
  readonly pathNumber: number;
  readonly keywords: readonly string[];
  readonly attribution: Attribution;
}

// ──────────────── Paths ────────────────

export interface Path {
  /** 11 through 32, per the traditional 22-path enumeration. */
  readonly number: number;
  readonly from: SefirahKey;
  readonly to: SefirahKey;
  readonly letterKey: LetterKey;
  readonly arcanumNumber: number;
  readonly attribution: Attribution;
  /** Pillars of the endpoints, in `[from-pillar, to-pillar]` order. */
  readonly pillarsCrossed: readonly [Pillar, Pillar];
}

// ──────────────── Soul Aspects ────────────────

/**
 * The six "personality" Sefirot — Chesed through Yesod — each carry a
 * class in the player-role sense. Kether/Chokmah/Binah are "too
 * elevated" and Malkuth is the starting waypoint; none of those are
 * playable classes.
 */
export type SoulAspectKey =
  | 'chesed'
  | 'gevurah'
  | 'tiferet'
  | 'hod'
  | 'netzach'
  | 'yesod';

export interface SoulAspect {
  readonly key: SoulAspectKey;
  readonly sefirahKey: SefirahKey;
  /** Stat that receives the +2 class bonus. */
  readonly bonusStat: StatKey;
  readonly title: string;
  readonly flavor: string;
  readonly abilityName: string;
  readonly abilityDescription: string;
  readonly weaknessDescription: string;
}
