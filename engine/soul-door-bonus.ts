import { soulDoorsForSign, type SefirahKey, type ZodiacSignKey } from '@/data';

/**
 * The DC adjustment a player rolls against when facing the Challenge
 * at one of their Soul Doors. Locked at **−2** in
 * `design/soul-doors.md` § 7 D1 — magnitude matches the +2
 * exaltation bonus in #212's dignity table so the two class-layer
 * mechanics stay commensurate (a class's signature contribution to a
 * Sefirah is symmetric: +2 to the relevant stat OR −2 to the DC).
 *
 * Used by the challenge resolver in T4 (#244): folded into
 * `effectiveDC` alongside `SHORTCUT_DC_PENALTY`. The two compose
 * additively — a player on the central-pillar shortcut at one of
 * their Doors gets +3 (shortcut) + −2 (Door) = +1 net DC.
 */
export const SOUL_DOOR_DC_DELTA = -2;

/**
 * Returns the DC adjustment for a player of the given class facing
 * a challenge at the given Sefirah. **−2** when the Sefirah is one
 * of that class's Soul Doors, **0** otherwise.
 *
 * Pure. Reads from `data/soul-doors.ts` via `soulDoorsForSign`. No
 * state, no side effects. Trivial to memoize at the call site if
 * the resolver ever needs it.
 *
 * Pisces is the only class with a single Door (Netzach) — see § 4
 * of `design/soul-doors.md`. Every other class has two Doors. Total
 * (sign, sefirah) cells returning −2 across the 12 × 10 grid = 23.
 *
 * Return type is narrowed to `typeof SOUL_DOOR_DC_DELTA | 0` per
 * `design/soul-doors.md` § 5 + § 8 — gives T4's `effectiveDC`
 * composition site a tight literal union to work with.
 */
export function soulDoorDcDelta(
  sign: ZodiacSignKey,
  sefirah: SefirahKey,
): typeof SOUL_DOOR_DC_DELTA | 0 {
  return soulDoorsForSign(sign).includes(sefirah) ? SOUL_DOOR_DC_DELTA : 0;
}
