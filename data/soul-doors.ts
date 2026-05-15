import type { SefirahKey, ZodiacSignKey } from './types';

/**
 * Per-class **Soul Doors** table for Epic #240.
 *
 * Each zodiac-sign class has 1–2 Soul Doors — the Sefirot at the
 * endpoints of its soul card's path that bear a stat-check Challenge.
 * When a player faces the Challenge at one of their Doors, the
 * effective DC is reduced by 2 (see `engine/soul-doors.ts` in T3).
 *
 * Source: `design/soul-doors.md` § 3 — locked Door table. Derived
 * mechanically from the 12 zodiacal "Simples" (`data/arcana.ts`)
 * crossed with the path network (`data/paths.ts`); the test in
 * `__tests__/soul-doors.test.ts` re-verifies that derivation so any
 * drift in the upstream data fails loudly.
 *
 * **Pisces is structurally unique.** Its soul card (The Moon, path
 * 29) connects Netzach ↔ Malkuth, and Malkuth has no Challenge — so
 * Pisces gets only one Door. This asymmetry is the locked D4
 * decision (see `design/soul-doors.md` § 7); the single Door
 * (Netzach) aligns exactly with Pisces's Venus exaltation in #212's
 * dignity table.
 *
 * Frozen at module load so accidental writes throw rather than
 * silently corrupting the symbolic state.
 */
export const soulDoorsBySign: Readonly<Record<ZodiacSignKey, readonly SefirahKey[]>> =
  Object.freeze({
    aries: Object.freeze(['chokmah', 'tiferet'] as const),
    taurus: Object.freeze(['chokmah', 'chesed'] as const),
    gemini: Object.freeze(['binah', 'tiferet'] as const),
    cancer: Object.freeze(['binah', 'gevurah'] as const),
    leo: Object.freeze(['chesed', 'gevurah'] as const),
    virgo: Object.freeze(['chesed', 'tiferet'] as const),
    libra: Object.freeze(['gevurah', 'tiferet'] as const),
    scorpio: Object.freeze(['tiferet', 'netzach'] as const),
    sagittarius: Object.freeze(['tiferet', 'yesod'] as const),
    capricorn: Object.freeze(['tiferet', 'hod'] as const),
    aquarius: Object.freeze(['netzach', 'yesod'] as const),
    pisces: Object.freeze(['netzach'] as const),
  });
