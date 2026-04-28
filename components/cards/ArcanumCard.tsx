import { useId } from 'react';
import { arcanumByNumber, letterByKey } from '@/data';
import type { Arcanum } from '@/data';
import { GLYPHS } from './glyphs';
import { ARCANUM_GLYPHS } from './glyph-mapping';
import { attributionColor, attributionLabel } from './attribution-colors';
import { GROUND, VEIL } from '@/data/colors';

/**
 * Single Arcanum card, symbolic-minimalist style.
 *
 * Layout (200×320 viewBox, 5:8 portrait):
 *   - Top third (y 0..107): large Hebrew letter, centered.
 *   - Middle third (y 107..213): geometric glyph composition.
 *   - Bottom third (y 213..320): card number, name, attribution line.
 * A thin colored band at the very bottom is keyed to the card's
 * astrological attribution color.
 *
 * No figurative art — every card is built from the same shared glyph
 * vocabulary in `glyphs.tsx`. The per-card composition lives in
 * `glyph-mapping.ts`. Adding/changing a card is one entry there.
 */

const VIEW_W = 200;
const VIEW_H = 320;
const GLYPH_ZONE_X = 0;
const GLYPH_ZONE_Y = 107;

interface ArcanumCardProps {
  /** Either pass an arcanum number 0..21 or a full Arcanum record. */
  readonly number?: number;
  readonly arcanum?: Arcanum;
  readonly className?: string;
}

export function ArcanumCard(props: ArcanumCardProps): JSX.Element {
  const arcanum = resolveArcanum(props);
  const letter = letterByKey(arcanum.letterKey);
  const accent = attributionColor(arcanum.attribution);
  const attrLabel = attributionLabel(arcanum.attribution);
  const placements = ARCANUM_GLYPHS[arcanum.number] ?? [];
  const ariaLabel = `Arcanum ${arcanum.number}, ${arcanum.name} — Hebrew letter ${letter.name}, attribution ${attrLabel}`;
  const gradId = `arcanum-bg-${useId()}`;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="figure"
      data-arcanum={arcanum.number}
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
      aria-label={ariaLabel}
    >
      <title>{ariaLabel}</title>

      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1542" />
          <stop offset="100%" stopColor={GROUND} />
        </linearGradient>
      </defs>

      {/* Card body */}
      <rect
        x={1}
        y={1}
        width={VIEW_W - 2}
        height={VIEW_H - 2}
        rx={10}
        ry={10}
        fill={`url(#${gradId})`}
        stroke={accent}
        strokeOpacity={0.7}
        strokeWidth={1.5}
      />

      {/* Top third: Hebrew letter */}
      <g data-zone="letter">
        <text
          x={VIEW_W / 2}
          y={70}
          textAnchor="middle"
          fontSize={64}
          fontFamily="var(--font-hebrew), serif"
          fill={VEIL}
          lang="he"
          style={{ direction: 'rtl', unicodeBidi: 'isolate' }}
        >
          {letter.glyph}
        </text>
      </g>

      {/* Divider 1 */}
      <line
        x1={20}
        y1={GLYPH_ZONE_Y}
        x2={VIEW_W - 20}
        y2={GLYPH_ZONE_Y}
        stroke={accent}
        strokeOpacity={0.4}
        strokeWidth={0.8}
      />

      {/* Middle third: glyph composition */}
      <g data-zone="glyphs" transform={`translate(${GLYPH_ZONE_X} ${GLYPH_ZONE_Y})`}>
        {placements.map((p) => {
          const Glyph = GLYPHS[p.glyph];
          // Key: glyph name + index-in-list is unique within a card and
          // stable as long as the static mapping isn't reordered. Plain
          // index would also work today; this is forward-friendly for a
          // future variant that might allow conditional placements.
          return (
            <Glyph
              key={`${p.glyph}-${p.cx}-${p.cy}`}
              cx={p.cx}
              cy={p.cy}
              size={p.size}
              color={VEIL}
              opacity={p.opacity ?? 1}
              {...(p.points !== undefined ? { points: p.points } : {})}
              {...(p.rotation !== undefined ? { rotation: p.rotation } : {})}
            />
          );
        })}
      </g>

      {/* Divider 2 */}
      <line
        x1={20}
        y1={213}
        x2={VIEW_W - 20}
        y2={213}
        stroke={accent}
        strokeOpacity={0.4}
        strokeWidth={0.8}
      />

      {/* Bottom third: number, name, attribution */}
      <g data-zone="footer">
        <text
          x={VIEW_W / 2}
          y={245}
          textAnchor="middle"
          fontSize={11}
          fontFamily="var(--font-sans), sans-serif"
          fill={VEIL}
          fillOpacity={0.6}
          letterSpacing={2}
        >
          {arcanum.number.toString().padStart(2, '0')}
        </text>
        <text
          x={VIEW_W / 2}
          y={272}
          textAnchor="middle"
          fontSize={14}
          fontFamily="var(--font-display), serif"
          fill={VEIL}
          letterSpacing={1.5}
          style={{ textTransform: 'uppercase' }}
        >
          {arcanum.name}
        </text>
        <text
          x={VIEW_W / 2}
          y={293}
          textAnchor="middle"
          fontSize={9}
          fontFamily="var(--font-sans), sans-serif"
          fill={VEIL}
          fillOpacity={0.5}
          letterSpacing={1.5}
          style={{ textTransform: 'uppercase' }}
        >
          {attrLabel}
        </text>
      </g>

      {/* Bottom accent band */}
      <rect
        x={20}
        y={306}
        width={VIEW_W - 40}
        height={3}
        rx={1.5}
        fill={accent}
      />
    </svg>
  );
}

function resolveArcanum(props: ArcanumCardProps): Arcanum {
  if (props.arcanum) return props.arcanum;
  if (props.number === undefined) {
    throw new Error('ArcanumCard requires either `number` or `arcanum`');
  }
  return arcanumByNumber(props.number);
}
