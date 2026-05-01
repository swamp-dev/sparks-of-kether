/**
 * "What is this?" pitch — three columns below the hero (#313).
 *
 * Cooperative · Symbolic · Short. Each column carries a small
 * relevant glyph (Sefirah-coloured disc / Hebrew letter / hourglass)
 * so the trio reads as a triptych instead of a brochure.
 *
 * Mobile: vertical stack. Desktop / tablet: 3-column grid.
 *
 * Decorative glyphs carry `aria-hidden="true"`; the column heading +
 * body copy carries the semantic meaning. Screen readers get a clean
 * three-section narrative without "circle, hebrew letter, hourglass"
 * noise.
 */

import { TIFERET_GOLD } from '@/data/colors';

interface PitchColumnsProps {
  readonly className?: string;
}

interface Column {
  readonly key: 'cooperative' | 'symbolic' | 'short';
  readonly title: string;
  readonly body: string;
  /** SVG glyph for the column. Decorative; aria-hidden at the column level. */
  readonly glyph: JSX.Element;
}

// Three Sefirah colours to anchor the columns visually — Tiferet
// (gold) for Cooperative as the heart, Yesod (violet) for Symbolic
// (Yesod is foundation / the symbolic substrate), and the
// Malkuth GLOW-amber (not Malkuth's canonical brown) for Short.
// Canonical Malkuth `#8b4513` is too low-chroma to read against
// the void substrate at glyph scale; we reach for the same earthy
// amber the #311 glow scale uses for `glow-malkuth` (see
// `tailwind.config.ts` and `docs/motion.md`'s glow-substitution
// note). SVG `fill` requires literal hex, so these are constants
// rather than Tailwind classes.
const COOPERATIVE_GOLD = TIFERET_GOLD;
const SYMBOLIC_VIOLET = '#9370db'; // matches Yesod canonical
const SHORT_MALKUTH_GLOW_AMBER = '#b87333'; // matches glow-malkuth

const COLUMNS: readonly Column[] = [
  {
    key: 'cooperative',
    title: 'Cooperative',
    body: 'Two to four players. Real-time. No winner — only the team. You ascend together or not at all.',
    glyph: (
      <svg
        viewBox="0 0 48 48"
        className="h-12 w-12"
        role="presentation"
        aria-hidden="true"
      >
        {/* Three interlocking discs — three players, one Tree. */}
        <circle cx={18} cy={20} r={9} fill={COOPERATIVE_GOLD} fillOpacity={0.6} />
        <circle cx={30} cy={20} r={9} fill={COOPERATIVE_GOLD} fillOpacity={0.6} />
        <circle cx={24} cy={30} r={9} fill={COOPERATIVE_GOLD} fillOpacity={0.6} />
      </svg>
    ),
  },
  {
    key: 'symbolic',
    title: 'Symbolic',
    body: "Real Kabbalah. You'll learn the ten Sefirot, the twenty-two paths, and the Major Arcana by playing.",
    glyph: (
      <svg
        viewBox="0 0 48 48"
        className="h-12 w-12"
        role="presentation"
        aria-hidden="true"
      >
        {/* Aleph (א) — the first Hebrew letter, sized as a glyph
            inside a Sefirah-coloured disc. The letter's weight comes
            from `font-hebrew` so it matches the rest of the project's
            Hebrew rendering. */}
        <circle cx={24} cy={24} r={22} fill={SYMBOLIC_VIOLET} fillOpacity={0.18} />
        <text
          x={24}
          y={24}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={26}
          fontFamily="var(--font-hebrew), serif"
          fontWeight={500}
          fill={SYMBOLIC_VIOLET}
          // The Hebrew alphabet's first letter — the start of every
          // ascent. RTL doesn't matter for a single character; we
          // omit the `dir` attribute for a cleaner SVG.
        >
          א
        </text>
      </svg>
    ),
  },
  {
    key: 'short',
    title: 'Short',
    body: 'One ascent in thirty to forty-five minutes. A complete journey, not an open world.',
    glyph: (
      <svg
        viewBox="0 0 48 48"
        className="h-12 w-12"
        role="presentation"
        aria-hidden="true"
      >
        {/* Hourglass — minimal geometry: two stacked triangles in
            amber, with a thin glass outline. */}
        <polygon
          points="12,8 36,8 24,24 12,8"
          fill={SHORT_MALKUTH_GLOW_AMBER}
          fillOpacity={0.55}
        />
        <polygon
          points="12,40 36,40 24,24 12,40"
          fill={SHORT_MALKUTH_GLOW_AMBER}
          fillOpacity={0.7}
        />
        <line
          x1={10}
          y1={8}
          x2={38}
          y2={8}
          stroke={SHORT_MALKUTH_GLOW_AMBER}
          strokeWidth={1.5}
          strokeOpacity={0.8}
        />
        <line
          x1={10}
          y1={40}
          x2={38}
          y2={40}
          stroke={SHORT_MALKUTH_GLOW_AMBER}
          strokeWidth={1.5}
          strokeOpacity={0.8}
        />
      </svg>
    ),
  },
];

export function PitchColumns({ className }: PitchColumnsProps): JSX.Element {
  return (
    <section
      data-home-pitch
      aria-labelledby="home-pitch-heading"
      className={className}
    >
      {/* Hidden heading so the section has a programmatic name for
          AT users without adding visual weight above the columns —
          the columns themselves are the visual heading. */}
      <h2 id="home-pitch-heading" className="sr-only">
        What is Sparks of Kether?
      </h2>

      <ul
        className="
          mx-auto grid w-full max-w-4xl grid-cols-1 gap-8
          sm:grid-cols-3 sm:gap-6
        "
      >
        {COLUMNS.map((col) => (
          <li
            key={col.key}
            data-pitch-column={col.key}
            className="flex flex-col items-center gap-3 text-center"
          >
            {col.glyph}
            <h3 className="font-display text-xl tracking-widest text-veil">
              {col.title}
            </h3>
            <p className="max-w-xs text-sm leading-relaxed text-veil/80">
              {col.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
