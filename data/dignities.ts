import type { SignDignities } from './types';

/**
 * Classical (Ptolemaic) dignity table for the 12 zodiac signs. Source:
 * `design/astrological-classes.md` § 3.
 *
 * Modern co-rulerships (Pluto for Scorpio, Neptune for Pisces) live on
 * `ZodiacSign.coRuler` (`data/zodiac-signs.ts`), NOT on this table —
 * this table covers only the classical four-slot frame.
 *
 * Empty slots (`null`) are intentional: the four "thin" signs (Gemini,
 * Leo, Sagittarius, Aquarius) classically have no exaltation or fall;
 * Taurus has no fall (matching Scorpio's empty exaltation slot).
 *
 * Two anomalies preserved from the classical tradition:
 *   - **Virgo**: Mercury both rules and is exalted in Virgo.
 *     Cumulative +3 to the intellect stat.
 *   - **Pisces**: Mercury is both detriment and fall in Pisces.
 *     Cumulative −3 to the intellect stat.
 *
 * **Detriment** is always the planet that rules the *opposite* sign.
 * **Fall** is always the planet exalted in the opposite sign.
 */
export const signDignities: readonly SignDignities[] = [
  { sign: 'aries',       rulership: 'mars',    exaltation: 'sun',    detriment: 'venus',   fall: 'saturn'  },
  { sign: 'taurus',      rulership: 'venus',   exaltation: 'moon',   detriment: 'mars',    fall: null       },
  { sign: 'gemini',      rulership: 'mercury', exaltation: null,     detriment: 'jupiter', fall: null       },
  { sign: 'cancer',      rulership: 'moon',    exaltation: 'jupiter',detriment: 'saturn',  fall: 'mars'    },
  { sign: 'leo',         rulership: 'sun',     exaltation: null,     detriment: 'saturn',  fall: null       },
  { sign: 'virgo',       rulership: 'mercury', exaltation: 'mercury',detriment: 'jupiter', fall: 'venus'   },
  { sign: 'libra',       rulership: 'venus',   exaltation: 'saturn', detriment: 'mars',    fall: 'sun'     },
  { sign: 'scorpio',     rulership: 'mars',    exaltation: null,     detriment: 'venus',   fall: 'moon'    },
  { sign: 'sagittarius', rulership: 'jupiter', exaltation: null,     detriment: 'mercury', fall: null       },
  { sign: 'capricorn',   rulership: 'saturn',  exaltation: 'mars',   detriment: 'moon',    fall: 'jupiter' },
  { sign: 'aquarius',    rulership: 'saturn',  exaltation: null,     detriment: 'sun',     fall: null       },
  { sign: 'pisces',      rulership: 'jupiter', exaltation: 'venus',  detriment: 'mercury', fall: 'mercury' },
];
