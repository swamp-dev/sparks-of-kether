import { GROUND, VEIL } from '@/data/colors';

/**
 * d6 icon — a square die face with pip dots. Visual language mirrors
 * D20.tsx: geometric, minimalist, same colour tokens.
 *
 * Pip positions are hardcoded per face value. The `rolled` prop applies
 * the same `animate-d20-roll-settle` gold-glow keyframe used by D20,
 * so both dice share the same settle visual language.
 */

const VIEW = 40;
const SIZE = VIEW - 4;
const OFFSET = (VIEW - SIZE) / 2;
const RADIUS = 3;
const PIP_R = 2.2;

const PIPS_BY_VALUE: readonly (readonly [number, number])[][] = [
  /* 1 */ [[0.5, 0.5]],
  /* 2 */ [
    [0.75, 0.25],
    [0.25, 0.75],
  ],
  /* 3 */ [
    [0.75, 0.25],
    [0.5, 0.5],
    [0.25, 0.75],
  ],
  /* 4 */ [
    [0.25, 0.25],
    [0.75, 0.25],
    [0.25, 0.75],
    [0.75, 0.75],
  ],
  /* 5 */ [
    [0.25, 0.25],
    [0.75, 0.25],
    [0.5, 0.5],
    [0.25, 0.75],
    [0.75, 0.75],
  ],
  /* 6 */ [
    [0.25, 0.2],
    [0.75, 0.2],
    [0.25, 0.5],
    [0.75, 0.5],
    [0.25, 0.8],
    [0.75, 0.8],
  ],
];

interface D6Props {
  /** Face value 1..6. Omit to show an empty die. */
  readonly value?: number;
  /** Hex stroke/pip colour; defaults to near-white. */
  readonly color?: string;
  readonly className?: string;
  /**
   * When true, plays the gold-glow `d20-roll-settle` keyframe once
   * (~600 ms). Re-triggers on consecutive identical values via `key`.
   * Honours `prefers-reduced-motion: reduce`.
   */
  readonly rolled?: boolean;
}

export function D6({ value, color = VEIL, className, rolled = false }: D6Props): JSX.Element {
  const pips =
    value !== undefined && value >= 1 && value <= 6 ? (PIPS_BY_VALUE[value - 1] ?? []) : [];
  const label = value !== undefined ? `d6 showing ${value}` : 'd6 die';
  const settleClass = rolled ? 'animate-d20-roll-settle motion-reduce:animate-none' : '';
  const composedClass = [className, settleClass].filter(Boolean).join(' ');

  return (
    <svg
      key={rolled ? `rolled-${value ?? 'empty'}` : undefined}
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      role="img"
      data-token="d6"
      data-rolled={rolled ? 'true' : 'false'}
      xmlns="http://www.w3.org/2000/svg"
      className={composedClass}
      aria-label={label}
    >
      <title>{label}</title>
      <rect
        x={OFFSET}
        y={OFFSET}
        width={SIZE}
        height={SIZE}
        rx={RADIUS}
        ry={RADIUS}
        fill={GROUND}
        stroke={color}
        strokeOpacity={0.85}
        strokeWidth={1.5}
      />
      {pips.map(([fx, fy], i) => (
        <circle
          key={i}
          cx={OFFSET + fx * SIZE}
          cy={OFFSET + fy * SIZE}
          r={PIP_R}
          fill={color}
          fillOpacity={0.9}
        />
      ))}
    </svg>
  );
}
