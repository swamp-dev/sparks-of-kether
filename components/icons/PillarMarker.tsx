import { TIFERET_GOLD } from '@/data/colors';
import type { Pillar } from '@/data';

/**
 * Pillar marker — small banner-style glyph identifying a Sefirah's
 * pillar membership (Mercy / Severity / Balance). Used in the stat
 * sheet header, the Tree's pillar legends, and any UI that wants to
 * call out which side of the Tree an action belongs to.
 *
 * Visual language: an upward chevron for Mercy (right pillar, mercy
 * flowing down toward generosity), a downward chevron for Severity
 * (left pillar, judgment falling), and a pair of facing chevrons for
 * Balance (the central pillar mediating the two).
 */

const VIEW_W = 36;
const VIEW_H = 28;

interface PillarMarkerProps {
  readonly pillar: Pillar;
  readonly className?: string;
}

const PILLAR_COLOR: Readonly<Record<Pillar, string>> = {
  mercy: '#4169e1',
  severity: '#dc143c',
  balance: TIFERET_GOLD,
};

const PILLAR_LABEL: Readonly<Record<Pillar, string>> = {
  mercy: 'Pillar of Mercy',
  severity: 'Pillar of Severity',
  balance: 'Pillar of Balance',
};

export function PillarMarker({ pillar, className }: PillarMarkerProps): JSX.Element {
  const color = PILLAR_COLOR[pillar];
  const label = PILLAR_LABEL[pillar];
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      data-pillar={pillar}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={label}
    >
      <title>{label}</title>
      {pillar === 'mercy' ? <ChevronUp color={color} /> : null}
      {pillar === 'severity' ? <ChevronDown color={color} /> : null}
      {pillar === 'balance' ? <DoubleChevron color={color} /> : null}
    </svg>
  );
}

function ChevronUp({ color }: { color: string }): JSX.Element {
  return (
    <polyline
      points="6,22 18,8 30,22"
      fill="none"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function ChevronDown({ color }: { color: string }): JSX.Element {
  return (
    <polyline
      points="6,8 18,22 30,8"
      fill="none"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function DoubleChevron({ color }: { color: string }): JSX.Element {
  return (
    <g
      fill="none"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6,18 18,6 30,18" />
      <polyline points="6,22 18,10 30,22" />
    </g>
  );
}
