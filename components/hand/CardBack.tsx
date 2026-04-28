import { useId } from 'react';
import { GROUND, VEIL } from '@/data/colors';

/**
 * Face-down card. Same 200×320 footprint as `ArcanumCard` so the two
 * are interchangeable in any hand layout.
 *
 * Visual: the deep-indigo gradient (matches the Tree background) plus
 * a centered Hebrew letter ת (Tav, "completion") inside a lattice of
 * faint diagonal lines. Tav is the final letter of the alphabet —
 * "the seal" — and reads as "this is hidden until revealed".
 */

const VIEW_W = 200;
const VIEW_H = 320;

interface CardBackProps {
  readonly className?: string;
  /** Optional aria override; defaults to a generic "face-down card". */
  readonly ariaLabel?: string;
}

export function CardBack({ className, ariaLabel }: CardBackProps): JSX.Element {
  const gradId = `cardback-bg-${useId()}`;
  const patternId = `cardback-grid-${useId()}`;
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
          <line x1={0} y1={0} x2={0} y2={20} stroke={VEIL} strokeOpacity={0.08} />
        </pattern>
      </defs>
      <rect
        x={1}
        y={1}
        width={VIEW_W - 2}
        height={VIEW_H - 2}
        rx={10}
        ry={10}
        fill={`url(#${gradId})`}
        stroke="#d4af37"
        strokeOpacity={0.5}
        strokeWidth={1.5}
      />
      <rect
        x={1}
        y={1}
        width={VIEW_W - 2}
        height={VIEW_H - 2}
        rx={10}
        ry={10}
        fill={`url(#${patternId})`}
      />
      <text
        x={VIEW_W / 2}
        y={VIEW_H / 2 + 28}
        textAnchor="middle"
        fontSize={84}
        fontFamily="var(--font-hebrew), serif"
        fill="#d4af37"
        fillOpacity={0.6}
        lang="he"
        style={{ direction: 'rtl', unicodeBidi: 'isolate' }}
      >
        ת
      </text>
    </svg>
  );
}
