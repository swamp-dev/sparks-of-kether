import type { StatKey } from '@/data';

/**
 * Stat icon — small geometric glyph identifying one of the 10 stats.
 * Each stat has a thematic glyph that connects to its Sefirah without
 * literally redrawing the Sefirah's symbol (so a stat label can sit
 * alongside its parent Sefirah without redundancy).
 */

const VIEW = 24;

interface StatIconProps {
  readonly stat: StatKey;
  readonly className?: string;
}

const STAT_LABELS: Readonly<Record<StatKey, string>> = {
  unity: 'Unity (Kether)',
  insight: 'Insight (Chokmah)',
  understanding: 'Understanding (Binah)',
  lovingkindness: 'Lovingkindness (Chesed)',
  strength: 'Strength (Gevurah)',
  harmony: 'Harmony (Tiferet)',
  passion: 'Passion (Netzach)',
  intellect: 'Intellect (Hod)',
  intuition: 'Intuition (Yesod)',
  body: 'Body (Malkuth)',
};

export function StatIcon({ stat, className }: StatIconProps): JSX.Element {
  const label = STAT_LABELS[stat];
  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      role="img"
      data-stat={stat}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={label}
    >
      <title>{label}</title>
      <Glyph stat={stat} />
    </svg>
  );
}

/**
 * One geometric primitive per stat. Stroke-only, color "currentColor"
 * so the consumer sets the hue via CSS — keeps the icon themable.
 */
function Glyph({ stat }: { stat: StatKey }): JSX.Element {
  const stroke = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (stat) {
    case 'unity':
      // Single circle around a dot — the One.
      return (
        <g {...stroke}>
          <circle cx={12} cy={12} r={9} />
          <circle cx={12} cy={12} r={1.2} fill="currentColor" />
        </g>
      );
    case 'insight':
      // Sudden flash — a stylized lightning glyph.
      return (
        <path
          d="M 14,3 L 7,12 L 11,12 L 8,21 L 16,11 L 12,11 Z"
          {...stroke}
        />
      );
    case 'understanding':
      // Nested squares — form within form.
      return (
        <g {...stroke}>
          <rect x={4} y={4} width={16} height={16} />
          <rect x={9} y={9} width={6} height={6} />
        </g>
      );
    case 'lovingkindness':
      // Open downward arc cradling a small circle — gift, holding.
      return (
        <g {...stroke}>
          <path d="M 5,8 Q 12,20 19,8" />
          <circle cx={12} cy={6} r={2} />
        </g>
      );
    case 'strength':
      // Single chevron mountain — a peak rising from a base. Two
      // separate triangles sharing an edge double-stroked the seam,
      // which read as a glitch at small sizes.
      return (
        <polygon
          points="4,18 12,6 20,18"
          {...stroke}
        />
      );
    case 'harmony':
      // Six-pointed star — alchemical balance, Tiferet.
      return (
        <g {...stroke}>
          <polygon points="12,3 19,16 5,16" />
          <polygon points="12,21 5,8 19,8" />
        </g>
      );
    case 'passion':
      // Flame — upward leaping curve with a teardrop tip.
      return (
        <path
          d="M 12,3 Q 6,11 12,21 Q 18,11 12,3 Z"
          {...stroke}
        />
      );
    case 'intellect':
      // Caduceus-ish / DNA strand — interweaving precision.
      return (
        <g {...stroke}>
          <path d="M 8,4 C 16,9 8,15 16,20" />
          <path d="M 16,4 C 8,9 16,15 8,20" />
        </g>
      );
    case 'intuition':
      // Crescent moon — Yesod, dream-bearing.
      return (
        <path
          d="M 16,4 A 8,8 0 1 0 16,20 A 6,6 0 1 1 16,4 Z"
          {...stroke}
        />
      );
    case 'body':
      // A simple grounded square with a vertical axis — embodiment,
      // standing on the earth.
      return (
        <g {...stroke}>
          <rect x={5} y={13} width={14} height={7} />
          <line x1={12} y1={3} x2={12} y2={13} />
          <line x1={8} y1={6} x2={16} y2={6} />
        </g>
      );
  }
}
