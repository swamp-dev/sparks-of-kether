import type { SefirahKey } from './types';

/**
 * Codex-page-specific extras for #320. Per-Sefirah / per-Arcanum /
 * per-Path rich content sourced from `reference/*.md` — quotes,
 * expanded one-line descriptions, gameplay-role narrative, Shell
 * rule narrative.
 *
 * Why a separate file: the engine and gameplay surfaces don't need
 * any of this content. Keeping it isolated means the Codex can be
 * statically prerendered with a richer payload without bloating
 * `data/sefirot.ts` etc. (which the engine imports on every state
 * transition).
 *
 * Source-of-truth for the content remains the `reference/*.md`
 * markdown — these constants are the runtime form. If a content
 * edit lands here, the markdown must move in lockstep.
 */

export interface SefirahCodexContent {
  /** Italicised epigraph from the per-Sefirah game-block. */
  readonly quote: string;
  /** "Quality" column from the master table — short keyword phrase. */
  readonly quality: string;
  /** "Game role" line from the per-Sefirah game block. */
  readonly gameRole: string;
  /** "Stat generated" full description from the per-Sefirah game block. */
  readonly statDescription: string;
  /** Shell-rule narrative ("Fragmentation — team information splits..."). */
  readonly shellRule: string;
}

export interface ArcanumCodexContent {
  /** One-sentence symbolic meaning (per-card capsule from arcana.md). */
  readonly meaning: string;
  /** One-sentence gameplay role (also from the per-card capsule). */
  readonly gameRole: string;
}

/**
 * Notable structural roles for paths. A path can fill at most one
 * — when a path qualifies for two (e.g. 32 is both central-pillar
 * and out-of-malkuth) the more distinctive role wins. See the
 * test file for the precedence rules.
 */
export type PathStructuralRole =
  | 'central-pillar'
  | 'abyss-crossing'
  | 'out-of-malkuth'
  | 'into-kether'
  | null;

export interface PathCodexContent {
  readonly structuralRole: PathStructuralRole;
  /** Short one-line description of the path's role on the Tree. */
  readonly note: string;
}

/**
 * Per-Sefirah Codex content. Quotes match `reference/sefirot.md`
 * verbatim; descriptions are short, scholarly-tone English.
 */
export const sefirahCodex: Readonly<Record<SefirahKey, SefirahCodexContent>> = {
  kether: {
    quote: 'Before separation there is only this.',
    quality: 'Unity, source, pure being',
    gameRole:
      'Final destination. The collective Final Threshold is here — resolved across the whole team, not by a single d20.',
    statDescription:
      'Unity — factors into every cooperative assist; the silence beneath every voice.',
    shellRule:
      'Fragmentation — team information splits; private hands again. Banished by reaching Kether collectively.',
  },
  chokmah: {
    quote: 'The flash before thought.',
    quality: 'Raw creative flash, first impulse',
    gameRole:
      'Upper-right gate. Challenges reward spontaneity — the answer that arrives before reasoning catches up.',
    statDescription: 'Insight — first-instinct checks; the leap that knows where it lands.',
    shellRule:
      'Paralysis — no instinctive actions allowed this round. Banished by clearing Chokmah.',
  },
  binah: {
    quote: 'Form is limitation, and limitation is sorrow.',
    quality: 'Form, structure, sorrow, the cosmic mother',
    gameRole:
      'Upper-left gate. Challenges reward accepted loss — sitting with what cannot be undone.',
    statDescription:
      'Understanding — lore and reflection checks; the stat of carrying weight without flinching.',
    shellRule: 'Despair — reflection-based Sparks produce no effect. Banished by clearing Binah.',
  },
  chesed: {
    quote: 'What you pour out returns sevenfold.',
    quality: 'Love, abundance, overflow, generosity',
    gameRole:
      'Generosity sphere. Its challenge can never fail — only unfold. Spending more pours more back.',
    statDescription:
      'Lovingkindness — used when giving or assisting; the gravity that draws the team together.',
    shellRule: 'Hoarding — no cards may be gifted for one full round. Banished by clearing Chesed.',
  },
  gevurah: {
    quote: 'I say no so that yes means something.',
    quality: 'Discipline, judgment, boundaries, sacred No',
    gameRole: 'Sacrifice sphere. Discard to pass — the boundary is the cost, not the obstacle.',
    statDescription: 'Strength — boundary and willpower checks; the stat of holding the line.',
    shellRule:
      'Cruelty — every player loses 1 point of Strength until banished. Banished by clearing Gevurah.',
  },
  tiferet: {
    quote: 'Know yourself, and you know the All.',
    quality: 'Harmony, balance, compassion, the self',
    gameRole:
      'Center of the Tree; every pillar crosses here. Integration challenges — the sum, not the part.',
    statDescription:
      'Harmony — coordination and assist bonuses; the stat that makes the whole greater than the parts.',
    shellRule:
      'Vanity — the Tiferet Soul Aspect ability is disabled. Banished by clearing Tiferet.',
  },
  netzach: {
    quote: 'The heart knows the way.',
    quality: 'Passion, desire, art, nature, endurance',
    gameRole:
      'Lower-right gate. Emotion / desire challenges — the answer that the body already knew.',
    statDescription: 'Passion — instinctive and artistic checks; the stat of sustained want.',
    shellRule:
      'Obsession — cards played on desire-themed paths have no effect. Banished by clearing Netzach.',
  },
  hod: {
    quote: 'Words are spells.',
    quality: 'Intellect, language, logic, precision',
    gameRole:
      'Lower-left gate. Logic / language challenges — the right name binds the right power.',
    statDescription:
      'Intellect — analysis, sequencing, word puzzles; the stat of finding the seam.',
    shellRule: 'Deception — the top card of the deck is misreported. Banished by clearing Hod.',
  },
  yesod: {
    quote: 'Nothing is solid here.',
    quality: 'Dreams, subconscious, intuition, cycles',
    gameRole:
      'First gate above Malkuth. Intuition / illusion challenges — what the dream is trying to say.',
    statDescription:
      'Intuition — perception and dream checks; the stat of catching the signal in the noise.',
    shellRule:
      "Illusion — until banished, one path's name shows the wrong door. Banished by clearing Yesod.",
  },
  malkuth: {
    quote: 'Here the journey begins, or ends.',
    quality: 'Manifestation, body, material world',
    gameRole:
      'Starting point. No challenge; setting of intention only — the world before the ascent.',
    statDescription:
      'Body — physical grounding; resists Separation effects. The stat that anchors.',
    shellRule:
      'Inertia — movement costs an extra card this round. Banished by reclearing Malkuth (rare; usually mid-game corruption).',
  },
};

/**
 * Per-Arcanum Codex content. The "per-card capsule" prose from
 * `reference/arcana.md` — keeps the scholarly reading short (one
 * sentence of meaning + one sentence of game role).
 */
export const arcanumCodex: Readonly<Record<number, ArcanumCodexContent>> = {
  0: {
    meaning: 'The leap before knowing. Innocence as power, not ignorance.',
    gameRole:
      'The only path into Chokmah from Kether; also the iconic "wild" card in competitive variants.',
  },
  1: {
    meaning: 'Focused will bringing form to the formless. One hand up, one down.',
    gameRole: 'Opens Binah; thematic match for challenges requiring concentration.',
  },
  2: {
    meaning: 'The longest single span on the Tree — Crown to Heart. Intuition without explanation.',
    gameRole: 'The direct path up the central pillar; scarce and valuable.',
  },
  3: {
    meaning: 'Nature, nurture, the mother-force. Crosses the Abyss at its widest.',
    gameRole: 'The only non-Kether path between the upper pillars.',
  },
  4: {
    meaning: 'Order and structure; the father-principle.',
    gameRole: 'Alternate route down the right side toward the heart.',
  },
  5: {
    meaning: 'The teacher who transmits across generations.',
    gameRole: 'The "stay on the Mercy pillar" path.',
  },
  6: {
    meaning: 'Choice, not romance. The sword of Zayin discriminates.',
    gameRole: 'Left-pillar descent into the heart.',
  },
  7: {
    meaning: 'Opposing forces yoked to one vehicle.',
    gameRole: '"Stay on Severity" path; useful when building a sacrifice-heavy route.',
  },
  8: {
    meaning: 'Gentling the lion. True power is tenderness.',
    gameRole: "Horizontal bridge over the Abyss's lower arc; essential for balance-seekers.",
  },
  9: {
    meaning: 'Inner light; the teacher within.',
    gameRole: 'Right-pillar descent into the heart; the Hermit illuminates solo challenges.',
  },
  10: {
    meaning: 'Change you cannot stop, only ride.',
    gameRole: 'Descends the Mercy pillar.',
  },
  11: {
    meaning: 'Cause and effect made visible.',
    gameRole: 'Left-pillar descent; paired often with The Hermit to cross Tiferet balanced.',
  },
  12: {
    meaning: 'Surrender as insight.',
    gameRole: 'Descends the Severity pillar.',
  },
  13: {
    meaning: 'Transformation, not cessation.',
    gameRole: 'Heart-to-Venus; a common card in the emotional route.',
  },
  14: {
    meaning: 'Central pillar again. The angel mixing fire and water.',
    gameRole: 'The direct central descent below the heart.',
  },
  15: {
    meaning: 'Attachment; the chains we forget we can remove.',
    gameRole: 'Heart-to-mercury; dangerous ground but unavoidable for some routes.',
  },
  16: {
    meaning: 'Lightning on false structure.',
    gameRole: 'The only horizontal path in the lower Tree; shake-up card.',
  },
  17: {
    meaning: "Hope that isn't naïve.",
    gameRole: 'Venus-to-Moon; kind and necessary.',
  },
  18: {
    meaning: 'Walking through fog.',
    gameRole: 'One of three paths out of Malkuth.',
  },
  19: {
    meaning: 'Clarity and restored innocence.',
    gameRole: 'Bright, easy descent on the Severity side.',
  },
  20: {
    meaning: 'The trumpet call to rise.',
    gameRole: 'One of three paths out of Malkuth.',
  },
  21: {
    meaning: 'Completion that is also beginning.',
    gameRole: 'The default path out of Malkuth; the most common opening move.',
  },
};

export const pathCodex: Readonly<Record<number, PathCodexContent>> = {
  11: {
    structuralRole: 'into-kether',
    note: 'Final ascent from Chokmah. The Fool brings the leap that completes the journey.',
  },
  12: {
    structuralRole: 'into-kether',
    note: "Final ascent from Binah. The Magician's focused will closes the gap.",
  },
  13: {
    structuralRole: 'central-pillar',
    note: 'Central-pillar ascent — Tiferet to Kether. The longest single span; intuition without explanation.',
  },
  14: {
    structuralRole: 'abyss-crossing',
    note: 'Upper abyss-crossing. The widest gap on the Tree, between Wisdom and Understanding.',
  },
  15: {
    structuralRole: null,
    note: 'Right-pillar approach to the heart. The Emperor lays structure across mercy.',
  },
  16: {
    structuralRole: null,
    note: 'Stays on the Mercy pillar — Wisdom flowing into Lovingkindness via the Hierophant.',
  },
  17: {
    structuralRole: null,
    note: 'Left-pillar descent into the heart. The Lovers as discrimination, not romance.',
  },
  18: {
    structuralRole: null,
    note: 'Stays on the Severity pillar — Understanding tempering itself in Strength.',
  },
  19: {
    structuralRole: 'abyss-crossing',
    note: 'Middle abyss-crossing. Strength tames the lion of mercy and severity together.',
  },
  20: {
    structuralRole: null,
    note: 'Right-pillar descent into the heart. The Hermit illuminates the path inward.',
  },
  21: {
    structuralRole: null,
    note: 'Stays on the Mercy pillar — Lovingkindness yielding to Victory through change.',
  },
  22: {
    structuralRole: null,
    note: 'Left-pillar descent into the heart. Justice as the visible law of cause and effect.',
  },
  23: {
    structuralRole: null,
    note: 'Stays on the Severity pillar — Strength surrendering through The Hanged Man.',
  },
  24: {
    structuralRole: null,
    note: 'Heart to Venus. Death as transformation through the emotional pillar.',
  },
  25: {
    structuralRole: 'central-pillar',
    note: 'Central-pillar descent — the heart settling into foundation through Temperance.',
  },
  26: {
    structuralRole: null,
    note: 'Heart to Mercury. The Devil as the chains we choose, dangerous and instructive.',
  },
  27: {
    structuralRole: 'abyss-crossing',
    note: 'Lower abyss-crossing. The Tower as the only horizontal path below the heart.',
  },
  28: {
    structuralRole: null,
    note: 'Venus to Moon. The Star as hope without naivety.',
  },
  29: {
    structuralRole: 'out-of-malkuth',
    note: 'Right opening from Malkuth. The Moon walks through fog into Victory.',
  },
  30: {
    structuralRole: null,
    note: 'Mercury to Moon. The Sun brings clarity across the lower Severity pillar.',
  },
  31: {
    structuralRole: 'out-of-malkuth',
    note: 'Left opening from Malkuth. Judgement is the trumpet that calls the soul up.',
  },
  32: {
    // Path 32 is both central-pillar AND out-of-malkuth. We tag it
    // as central-pillar (the more distinctive structural role for
    // the Codex; the note copy still surfaces the Malkuth opening).
    structuralRole: 'central-pillar',
    note: 'Default opening from Malkuth and the lowest segment of the central pillar. The World walks gently upward.',
  },
};
