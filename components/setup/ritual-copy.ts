import type { SefirahKey } from '@/data';

/**
 * Per-Sefirah ritual copy used by `BlessingRitual`. The "essence"
 * line is taken verbatim from `reference/sefirot.md`'s game-block
 * sections; the "invocation" is a short imperative the player reads
 * before rolling 3d6 for that Sefirah's stat.
 *
 * Keep these intentionally short (one or two sentences). The ritual
 * is the game's emotional opening — long copy hurts the cadence.
 */

export interface RitualCopy {
  readonly essence: string;
  readonly invocation: string;
}

export const RITUAL_COPY: Readonly<Record<SefirahKey, RitualCopy>> = {
  kether: {
    essence: 'Before separation there is only this.',
    invocation: 'Receive your portion of Unity — the silence beneath every voice.',
  },
  chokmah: {
    essence: 'The flash before thought.',
    invocation: 'Receive your Insight — the spark that arrives unasked.',
  },
  binah: {
    essence: 'Form is limitation, and limitation is sorrow.',
    invocation: 'Receive your Understanding — the willingness to see clearly.',
  },
  chesed: {
    essence: 'What you pour out returns sevenfold.',
    invocation: 'Receive your Lovingkindness — the open hand.',
  },
  gevurah: {
    essence: 'I say no so that yes means something.',
    invocation: 'Receive your Strength — the line you choose to hold.',
  },
  tiferet: {
    essence: 'Know yourself, and you know the All.',
    invocation: 'Receive your Harmony — the heart that holds the center.',
  },
  netzach: {
    essence: 'The heart knows the way.',
    invocation: 'Receive your Passion — the fire that does not ask permission.',
  },
  hod: {
    essence: 'Words are spells.',
    invocation: 'Receive your Intellect — the precision of named things.',
  },
  yesod: {
    essence: 'Nothing is solid here.',
    invocation: 'Receive your Intuition — the dream that shows the door.',
  },
  malkuth: {
    essence: 'Here the journey begins, or ends.',
    invocation: 'Receive your Body — the ground that bears the journey.',
  },
};
