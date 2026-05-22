import { useId } from 'react';
import { arcanumByNumber, attributionColor, attributionLabel, letterByKey } from '@/data';
import type { Arcanum } from '@/data';
import { GROUND, VEIL } from '@/data/colors';
import { RW_IMAGE_FILE } from './rw-image-map';

/**
 * Single Arcanum card — Rider-Waite art, dark-filtered to the void aesthetic.
 *
 * Layout (200×320 viewBox, 5:8 portrait):
 *   - Top zone  (y 0..88):   large Hebrew letter with radial accent glow.
 *   - Art zone  (y 88..230): Rider-Waite JPG, desaturated + darkened + accent tint.
 *   - Footer    (y 230..320): card name (display font) + attribution (small-caps).
 *
 * The arcana number is omitted — the Hebrew letter uniquely identifies each card
 * and the card numbers (0–21) don't align with Kabbalistic path numbers (11–32).
 */

const VIEW_W = 200;
const VIEW_H = 320;
const LETTER_ZONE_BOTTOM = 88;
const ART_ZONE_BOTTOM    = 230;
const ART_ZONE_HEIGHT    = ART_ZONE_BOTTOM - LETTER_ZONE_BOTTOM; // 142px
const ART_ZONE_W         = VIEW_W - 20;                          // 180px (10px margin each side)
const ART_ZONE_X         = 10;

// Amount to shift the RW image upward so the original card's top border and
// roman numeral scroll out above the clip rect.
const CROP_TOP_PX = 10;

interface ArcanumCardProps {
  /** Either pass an arcanum number 0..21 or a full Arcanum record. */
  readonly number?: number;
  readonly arcanum?: Arcanum;
  readonly className?: string;
}

export function ArcanumCard(props: ArcanumCardProps): JSX.Element {
  const arcanum   = resolveArcanum(props);
  const letter    = letterByKey(arcanum.letterKey);
  const accent    = attributionColor(arcanum.attribution);
  const attrLabel = attributionLabel(arcanum.attribution);
  const ariaLabel = `Arcanum ${arcanum.number}, ${arcanum.name} — Hebrew letter ${letter.name}, attribution ${attrLabel}`;

  const gradId = `arcanum-bg-${useId()}`;
  const filtId = `arcanum-filt-${useId()}`;
  const clipId = `arcanum-clip-${useId()}`;
  const glowId = `arcanum-glow-${useId()}`;

  const imageFile = RW_IMAGE_FILE[arcanum.number];
  if (!imageFile) throw new Error(`No Rider-Waite image mapped for arcanum ${arcanum.number}`);

  // Scale image so its width fills ART_ZONE_W; RW cards are ~1:1.74 (w:h).
  const imgW = ART_ZONE_W;
  const imgH = Math.round(ART_ZONE_W * 1.74);

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
        {/* Card body gradient */}
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1542" />
          <stop offset="100%" stopColor={GROUND} />
        </linearGradient>

        {/* Dark duotone filter: near-monochrome + darken with cool blue tint */}
        <filter id={filtId} colorInterpolationFilters="sRGB" x="0" y="0" width="1" height="1">
          <feColorMatrix type="saturate" values="0.2" result="desat" />
          <feComponentTransfer in="desat">
            <feFuncR type="linear" slope="0.5" />
            <feFuncG type="linear" slope="0.48" />
            <feFuncB type="linear" slope="0.62" />
          </feComponentTransfer>
        </filter>

        {/* Clip art zone to its rect */}
        <clipPath id={clipId}>
          <rect
            x={ART_ZONE_X}
            y={LETTER_ZONE_BOTTOM}
            width={ART_ZONE_W}
            height={ART_ZONE_HEIGHT}
          />
        </clipPath>

        {/* Radial glow behind the Hebrew letter */}
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity={0.22} />
          <stop offset="100%" stopColor={accent} stopOpacity={0} />
        </radialGradient>
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

      {/* Top zone: Hebrew letter with accent glow behind it */}
      <g data-zone="letter">
        <ellipse
          cx={VIEW_W / 2}
          cy={48}
          rx={56}
          ry={44}
          fill={`url(#${glowId})`}
        />
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
        y1={LETTER_ZONE_BOTTOM}
        x2={VIEW_W - 20}
        y2={LETTER_ZONE_BOTTOM}
        stroke={accent}
        strokeOpacity={0.4}
        strokeWidth={0.8}
      />

      {/* Art zone: Rider-Waite image, dark-filtered and tinted */}
      <image
        href={`/rider-waite-cards/${imageFile}`}
        x={ART_ZONE_X}
        y={LETTER_ZONE_BOTTOM - CROP_TOP_PX}
        width={imgW}
        height={imgH}
        preserveAspectRatio="xMidYMin slice"
        clipPath={`url(#${clipId})`}
        filter={`url(#${filtId})`}
      />
      {/* Accent tint overlay — ties the image to this card's colour identity */}
      <rect
        x={ART_ZONE_X}
        y={LETTER_ZONE_BOTTOM}
        width={ART_ZONE_W}
        height={ART_ZONE_HEIGHT}
        fill={accent}
        fillOpacity={0.12}
        clipPath={`url(#${clipId})`}
        style={{ mixBlendMode: 'screen' }}
      />

      {/* Divider 2 */}
      <line
        x1={20}
        y1={ART_ZONE_BOTTOM}
        x2={VIEW_W - 20}
        y2={ART_ZONE_BOTTOM}
        stroke={accent}
        strokeOpacity={0.4}
        strokeWidth={0.8}
      />

      {/* Footer: name + attribution (number removed) */}
      <g data-zone="footer">
        <text
          x={VIEW_W / 2}
          y={262}
          textAnchor="middle"
          fontSize={15}
          fontFamily="var(--font-display), serif"
          fill={VEIL}
          letterSpacing={1.5}
          style={{ textTransform: 'uppercase' }}
        >
          {arcanum.name}
        </text>
        <text
          x={VIEW_W / 2}
          y={284}
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
      <rect x={20} y={306} width={VIEW_W - 40} height={3} rx={1.5} fill={accent} />
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
