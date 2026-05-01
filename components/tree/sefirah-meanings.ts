import type { SefirahKey } from '@/data';

/**
 * One-line "meaning" for each Sefirah, surfaced in the hover-tooltip
 * card on the Tree of Life (#312). Sourced from the "Quality" column
 * in `reference/sefirot.md`'s master table — the reference doc is the
 * authority; this is a UI-side mirror that lets the tooltip read in
 * one ~6-word sentence rather than reaching for a multi-paragraph
 * Codex page.
 *
 * The Codex pages (#320) will surface the full Sefaria-style two-
 * column scholarly explanation — these are the elevator-pitch
 * summaries that tide a hovering player over while they decide
 * whether to click into the Codex.
 *
 * Single source of truth: `reference/sefirot.md` § Master table,
 * Quality column. If a Sefirah's quality copy ever changes there,
 * mirror it here; nothing else consumes this map.
 */
export const SEFIRAH_MEANINGS: Readonly<Record<SefirahKey, string>> = {
  kether: 'Unity, source, pure being.',
  chokmah: 'Raw creative flash, first impulse.',
  binah: 'Form, structure, the cosmic mother.',
  chesed: 'Love, abundance, overflow.',
  gevurah: 'Discipline, judgment, sacred no.',
  tiferet: 'Harmony, balance, compassion.',
  netzach: 'Passion, desire, endurance.',
  hod: 'Intellect, language, precision.',
  yesod: 'Dreams, intuition, cycles.',
  malkuth: 'Manifestation, body, the world.',
};
