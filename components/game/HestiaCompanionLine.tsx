import { useMemo } from 'react';
import type { ZodiacSignKey } from '@/data';
import type { Pantheon } from '@/data/pantheons';
import { pickBlessing } from '@/data/pantheons/greco-roman/blessings';
import type { Rng } from '@/engine/rng';

interface HestiaCompanionLineProps {
  readonly sign: ZodiacSignKey;
  readonly pantheon: Pantheon;
  readonly rng: Rng;
}

/**
 * Companion text from Hestia shown when the active player is at Malkuth
 * in end phase (#68). Hestia speaks at arrival, setback, and homecoming
 * — any moment the player rests at the hearth. No pass/fail axis.
 *
 * Uses the sefirah blessing matrix (Hestia → Player direction) rather
 * than the framing matrix, which excludes Malkuth by type design.
 */
export function HestiaCompanionLine({
  sign,
  pantheon,
  rng,
}: HestiaCompanionLineProps): JSX.Element {
  const line = useMemo(
    () => pickBlessing(pantheon.sefirahBlessings, 'malkuth', sign, rng),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pantheon, sign],
  );

  return (
    <p
      data-hestia-companion-line
      className="w-full max-w-xl text-center text-sm italic text-veil/70"
    >
      {line}
    </p>
  );
}
