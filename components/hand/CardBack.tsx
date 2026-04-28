import { useId } from 'react';
import { GROUND, VEIL } from '@/data/colors';

/**
 * Face-down card. Same 200×320 footprint as `ArcanumCard` so the two
 * are interchangeable in any hand layout.
 *
 * Visual: indigo gradient, inscribed circle with a hexagram (Magen
 * David), four Hebrew letters of the Tetragrammaton (יהוה) at the
 * cardinal points just outside the circle, faint diagonal lattice
 * background, corner flourishes. Reads as "occult bookbinding"
 * rather than the prior single-letter centred glyph.
 *
 * The whole illustration is data-only — no per-instance state — so
 * a deck of face-downs is a single SVG repeated, not a randomized
 * motif. Intentional: the back is meant to be uniform across the
 * deck so face-down cards in a hand read as a stack of identical
 * artefacts, not a deck of distinct hidden cards.
 */

const VIEW_W = 200;
const VIEW_H = 320;
const CENTER_X = VIEW_W / 2;
const CENTER_Y = VIEW_H / 2;
const GOLD = '#d4af37';

// Tetragrammaton letters placed at the four cardinal points just
// outside the central seal — north, east, south, west.
const TETRAGRAMMATON: readonly { letter: string; x: number; y: number }[] = [
  { letter: 'י', x: CENTER_X, y: CENTER_Y - 70 }, // Yod, north
  { letter: 'ה', x: CENTER_X + 64, y: CENTER_Y + 6 }, // Heh, east
  { letter: 'ו', x: CENTER_X, y: CENTER_Y + 78 }, // Vav, south
  { letter: 'ה', x: CENTER_X - 64, y: CENTER_Y + 6 }, // Heh, west
];

// Hexagram (two overlaid equilateral triangles) on a circle of
// radius R_HEX around the centre.
const R_HEX = 36;
const HEX_UP =
  `${CENTER_X},${CENTER_Y - R_HEX} ` +
  `${CENTER_X + R_HEX * 0.866},${CENTER_Y + R_HEX * 0.5} ` +
  `${CENTER_X - R_HEX * 0.866},${CENTER_Y + R_HEX * 0.5}`;
const HEX_DOWN =
  `${CENTER_X},${CENTER_Y + R_HEX} ` +
  `${CENTER_X + R_HEX * 0.866},${CENTER_Y - R_HEX * 0.5} ` +
  `${CENTER_X - R_HEX * 0.866},${CENTER_Y - R_HEX * 0.5}`;

interface CardBackProps {
  readonly className?: string;
  /** Optional aria override; defaults to a generic "face-down card". */
  readonly ariaLabel?: string;
}

export function CardBack({ className, ariaLabel }: CardBackProps): JSX.Element {
  // Per-instance ids prevent two CardBacks in the same DOM from
  // fighting over a global pattern/gradient reference. One useId()
  // with role suffixes keeps both refs anchored to the same unique
  // instance prefix.
  const uid = useId();
  const gradId = `cardback-bg-${uid}`;
  const patternId = `cardback-grid-${uid}`;
  const label = ariaLabel ?? 'Face-down card (hidden)';
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      data-card="back"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={label}
    >
      <title>{label}</title>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1542" />
          <stop offset="100%" stopColor={GROUND} />
        </linearGradient>
        <pattern
          id={patternId}
          patternUnits="userSpaceOnUse"
          width={20}
          height={20}
          patternTransform="rotate(45)"
        >
          <line x1={0} y1={0} x2={0} y2={20} stroke={VEIL} strokeOpacity={0.06} />
        </pattern>
      </defs>

      {/* Background gradient + outer gold border. */}
      <rect
        x={1}
        y={1}
        width={VIEW_W - 2}
        height={VIEW_H - 2}
        rx={10}
        ry={10}
        fill={`url(#${gradId})`}
        stroke={GOLD}
        strokeOpacity={0.55}
        strokeWidth={1.5}
      />
      {/* Faint diagonal lattice overlay. */}
      <rect
        x={1}
        y={1}
        width={VIEW_W - 2}
        height={VIEW_H - 2}
        rx={10}
        ry={10}
        fill={`url(#${patternId})`}
      />

      {/* Inner gold border, inset 8 px from the outer. */}
      <rect
        x={9}
        y={9}
        width={VIEW_W - 18}
        height={VIEW_H - 18}
        rx={6}
        ry={6}
        fill="none"
        stroke={GOLD}
        strokeOpacity={0.25}
        strokeWidth={0.75}
      />

      {/* Corner flourishes — small 90-degree arcs in each corner. */}
      <CornerFlourish x={18} y={18} rotation={0} />
      <CornerFlourish x={VIEW_W - 18} y={18} rotation={90} />
      <CornerFlourish x={VIEW_W - 18} y={VIEW_H - 18} rotation={180} />
      <CornerFlourish x={18} y={VIEW_H - 18} rotation={270} />

      {/* Concentric circles framing the central seal. */}
      <circle
        cx={CENTER_X}
        cy={CENTER_Y}
        r={56}
        fill="none"
        stroke={GOLD}
        strokeOpacity={0.35}
        strokeWidth={0.75}
      />
      <circle
        cx={CENTER_X}
        cy={CENTER_Y}
        r={48}
        fill="none"
        stroke={GOLD}
        strokeOpacity={0.55}
        strokeWidth={1}
      />

      {/* Hexagram — two overlaid equilateral triangles. */}
      <polygon
        data-cardback-element="hexagram-up"
        points={HEX_UP}
        fill="none"
        stroke={GOLD}
        strokeOpacity={0.7}
        strokeWidth={1.25}
      />
      <polygon
        data-cardback-element="hexagram-down"
        points={HEX_DOWN}
        fill="none"
        stroke={GOLD}
        strokeOpacity={0.7}
        strokeWidth={1.25}
      />

      {/* Tetragrammaton letters at the four cardinal points. */}
      {TETRAGRAMMATON.map(({ letter, x, y }, i) => (
        <text
          key={i}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={22}
          fontFamily="var(--font-hebrew), serif"
          fill={GOLD}
          fillOpacity={0.8}
          lang="he"
          data-tetragrammaton-letter={letter}
        >
          {letter}
        </text>
      ))}
    </svg>
  );
}

/**
 * 90-degree gold arc as a corner ornament. Drawn at `(x, y)`,
 * rotated by `rotation` degrees (0 = top-left, 90 = top-right, etc.).
 */
function CornerFlourish({
  x,
  y,
  rotation,
}: {
  x: number;
  y: number;
  rotation: number;
}): JSX.Element {
  return (
    <g
      data-cardback-element="corner-flourish"
      transform={`translate(${x} ${y}) rotate(${rotation})`}
    >
      <path
        d="M 0 8 A 8 8 0 0 1 8 0"
        fill="none"
        stroke={GOLD}
        strokeOpacity={0.55}
        strokeWidth={1}
      />
      <line x1={8} y1={0} x2={14} y2={0} stroke={GOLD} strokeOpacity={0.55} strokeWidth={1} />
      <line x1={0} y1={8} x2={0} y2={14} stroke={GOLD} strokeOpacity={0.55} strokeWidth={1} />
    </g>
  );
}
