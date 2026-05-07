import type { SefirahKey } from '@/data';

/**
 * Per-Shell descriptive name and effect summary, surfaced in the
 * panel's hover/focus tooltip. Source: `design/shells.md` § The ten
 * Shells.
 *
 * Naming rule (from the design doc): we never use the traditional
 * proper names from Kabbalistic demonology. The Shells are
 * impersonal pressures, named by what they *do* ("Fragmentation",
 * "Paralysis", "Hoarding"…), not what they're called.
 *
 * Effect copy is condensed to one short sentence. The full mechanical
 * text lives in the design doc; the UI prefers a player-readable
 * summary that fits in a tooltip.
 */

export interface ShellCopy {
  readonly title: string;
  readonly effect: string;
}

export const SHELL_COPY: Readonly<Record<SefirahKey, ShellCopy>> = {
  kether: {
    title: 'Shell of Kether — Fragmentation',
    effect: 'All public information becomes private; hands that were shared go hidden.',
  },
  chokmah: {
    title: 'Shell of Chokmah — Paralysis',
    effect: 'You cannot play a card on the turn you draw it.',
  },
  binah: {
    title: 'Shell of Binah — Despair',
    effect: 'Acts of reflection — Spark abilities, ally assists — give no light.',
  },
  chesed: {
    title: 'Shell of Chesed — Hoarding',
    effect: 'No card gifts, in any direction, for one full round.',
  },
  gevurah: {
    title: 'Shell of Gevurah — Cruelty',
    effect: 'Every player’s Strength drops by 1; Gevurah challenges are DC +2.',
  },
  tiferet: {
    title: 'Shell of Tiferet — Vanity',
    effect: 'The Tiferet player’s Soul Aspect ability is disabled.',
  },
  netzach: {
    title: 'Shell of Netzach — Obsession',
    effect: 'Cards on Netzach-adjacent paths (21, 24, 28, 29) burn but produce no movement.',
  },
  hod: {
    title: 'Shell of Hod — Deception',
    effect: 'The top of the draw pile speaks a false name; only the blind drawer hears the true one.',
  },
  yesod: {
    title: 'Shell of Yesod — Illusion',
    effect: 'One path shows the wrong door — travelers pay its cost but arrive elsewhere.',
  },
  malkuth: {
    title: 'Shell of Malkuth — Inertia',
    effect: 'Every movement costs two cards (the path-key + one discard).',
  },
};
