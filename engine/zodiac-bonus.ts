import {
  dignitiesBySign,
  statForPlanet,
  zodiacSignByKey,
  type Dignity,
  type Planet,
  type StatKey,
  type ZodiacSignKey,
} from '@/data';
import type { StatSheet } from './types';

/**
 * Magnitudes per `design/astrological-classes.md` § 2. The modern
 * co-rulership (Pluto for Scorpio, Neptune for Pisces) is treated as
 * an additional rulership at +1 each, per § 6 D6.
 */
const DIGNITY_BONUS: Readonly<Record<Dignity, number>> = {
  rulership: 1,
  exaltation: 2,
  detriment: -1,
  fall: -2,
};

/**
 * Pure: zodiac sign → per-stat bonus deltas. Reads the dignity table
 * from `data/dignities.ts` plus the modern co-rulerships from
 * `data/zodiac-signs.ts`, applies the formula in `DIGNITY_BONUS`.
 *
 * Multiple dignities for the same planet stack additively (Virgo's
 * ruler+exalt Mercury → +3 intellect; Pisces' detriment+fall Mercury
 * → −3 intellect).
 *
 * `body` is never modified (Earth has no zodiacal dignities;
 * `Planet` doesn't include earth; the body stat stays class-neutral).
 *
 * Sub-ticket 5 (#234) calls this at game start, applies the result
 * additively to the rolled `StatSheet`, and clamps to 1–18 per D5.
 *
 * Caller treatment of absent keys: a stat with no entry in the
 * returned `Partial<StatSheet>` means +0. The function never throws
 * for valid sign keys; lookup helpers throw on unknown signs.
 */
export function zodiacBonus(sign: ZodiacSignKey): Partial<StatSheet> {
  const out: Partial<Record<StatKey, number>> = {};
  const add = (planet: Planet | null, delta: number): void => {
    if (planet === null) return;
    const stat = statForPlanet(planet);
    out[stat] = (out[stat] ?? 0) + delta;
  };

  const dignities = dignitiesBySign(sign);
  add(dignities.rulership, DIGNITY_BONUS.rulership);
  add(dignities.exaltation, DIGNITY_BONUS.exaltation);
  add(dignities.detriment, DIGNITY_BONUS.detriment);
  add(dignities.fall, DIGNITY_BONUS.fall);

  // Modern co-rulership (Pluto for Scorpio, Neptune for Pisces) lives
  // on `ZodiacSign.coRuler`, not in the classical dignity table.
  // Treated as an additional rulership (+1) per design D6.
  const signRecord = zodiacSignByKey(sign);
  if (signRecord.coRuler !== undefined) {
    add(signRecord.coRuler, DIGNITY_BONUS.rulership);
  }

  return out;
}
