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
  /**
   * Lowercase planet key matching the `Planet` type, used for engine
   * lookups (e.g. zodiac dignities → stat). Absent on Malkuth, whose
   * attribution is Earth — Earth is not in the `Planet` union because
   * the path system doesn't model an earth-attributed major arcanum
   * and the zodiac dignity system has no Earth entry. The `planet`
   * display string ('Earth') stays for human-readable contexts.
   */
  readonly planetKey?: Planet;
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
/**
 * The 7 classical planets plus modern Pluto and Neptune (already
 * attributed to Kether and Chokmah in `data/sefirot.ts`). Pluto and
 * Neptune are used in zodiac dignities as modern co-rulers of Scorpio
 * and Pisces respectively (see `design/astrological-classes.md`).
 * Uranus is intentionally absent — its traditional Hermetic-Qabalah
 * home is Daath, which the game doesn't model.
 */
export type Planet =
  | 'mercury'
  | 'moon'
  | 'venus'
  | 'jupiter'
  | 'mars'
  | 'sun'
  | 'saturn'
  | 'pluto'
  | 'neptune';
export type ZodiacSignKey =
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
  | { readonly kind: 'sign'; readonly value: ZodiacSignKey };

/** Astrological qualities used to describe a sign's character. */
export type ZodiacModality = 'cardinal' | 'fixed' | 'mutable';

/**
 * The four classical elements as they appear in the zodiac. Wider than
 * `Element` (which omits 'earth' because no Major Arcanum is Earth-
 * attributed in the path system). Kept as its own alias so callers can
 * pattern-match exhaustively without re-stating the union inline.
 */
export type ZodiacElement = Element | 'earth';

/** Per-sign metadata used by the picker UI and the engine bonus computation. */
export interface ZodiacSign {
  readonly key: ZodiacSignKey;
  /** Display name (capitalised). */
  readonly name: string;
  /** Single Unicode glyph (♈, ♉, ...). */
  readonly glyph: string;
  /** Classical four-element attribution. */
  readonly element: ZodiacElement;
  readonly modality: ZodiacModality;
  /** Classical ruler. Always present. */
  readonly ruler: Planet;
  /**
   * Modern co-ruler. The `?` (rather than `Planet | null`) is
   * intentional: a co-ruler is a *non-classical addition* — most signs
   * simply don't have one. Compare with `SignDignities.exaltation`,
   * which uses `Planet | null` because every sign has an exaltation
   * *slot* (it just happens to be empty for some signs in the classical
   * tradition).
   */
  readonly coRuler?: Planet;
}

/** A planet's relationship to a zodiac sign (one of four classical dignities). */
export type Dignity = 'rulership' | 'exaltation' | 'detriment' | 'fall';

/**
 * Per-sign dignity table. Each sign maps a `Dignity` to a `Planet | null`;
 * `null` indicates the slot exists but has no planet assigned (the
 * four classical "thin" signs — Gemini, Leo, Sagittarius, Aquarius —
 * have empty exaltation and fall slots, and Taurus has an empty fall
 * slot matching Scorpio's empty exaltation).
 *
 * Modern co-rulerships (Pluto for Scorpio, Neptune for Pisces) are
 * stored on `ZodiacSign.coRuler`; this table is for the four classical
 * dignities only. Engine code combines both at bonus computation.
 */
export interface SignDignities {
  readonly sign: ZodiacSignKey;
  readonly rulership: Planet;
  readonly exaltation: Planet | null;
  readonly detriment: Planet;
  readonly fall: Planet | null;
}

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
