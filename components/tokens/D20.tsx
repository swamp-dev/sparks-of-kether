import { GROUND, VEIL } from '@/data/colors';

/**
 * d20 icon — the icosahedron silhouette used in the roll UI. Renders
 * a hexagonal outline with internal triangulation that suggests the
 * 20-sided geometry without trying to be photorealistic.
 *
 * Optional `value` prop overlays the rolled number in the central
 * triangle. When omitted, the die reads as "ready to roll".
 */

const VIEW = 40;

interface D20Props {
  /** Result to display, 1..20. Omit to show empty die. */
  readonly value?: number;
  /** Hex stroke color; defaults to a near-white. */
  readonly color?: string;
  readonly className?: string;
}

export function D20({ value, color = VEIL, className }: D20Props): JSX.Element {
  const cx = VIEW / 2;
  const cy = VIEW / 2;
  const r = VIEW / 2 - 2;
  // Outer hexagon (point-up)
  const hex = (() => {
    const pts: string[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 - Math.PI / 2;
      pts.push(`${(cx + Math.cos(angle) * r).toFixed(2)},${(cy + Math.sin(angle) * r).toFixed(2)}`);
    }
    return pts.join(' ');
  })();
  // Inner upward triangle (the "front face" of an icosahedron viewed
  // from a vertex projection).
  const innerR = r * 0.55;
  const tri = (() => {
    const pts: string[] = [];
    for (let i = 0; i < 3; i++) {
      const angle = (i * 2 * Math.PI) / 3 - Math.PI / 2;
      pts.push(`${(cx + Math.cos(angle) * innerR).toFixed(2)},${(cy + Math.sin(angle) * innerR).toFixed(2)}`);
    }
    return pts.join(' ');
  })();
  const label = value !== undefined ? `d20 showing ${value}` : 'd20 die';
  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      role="img"
      data-token="d20"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={label}
    >
      <title>{label}</title>
      <polygon
        points={hex}
        fill={GROUND}
        stroke={color}
        strokeOpacity={0.85}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* Spokes from outer vertices to inner triangle vertices: gives
          the icosahedron-projection feel without overcomplicating. */}
      {Array.from({ length: 6 }, (_, i) => {
        const outerAngle = (i * Math.PI) / 3 - Math.PI / 2;
        const ox = cx + Math.cos(outerAngle) * r;
        const oy = cy + Math.sin(outerAngle) * r;
        const innerIdx = i % 3;
        const innerAngle = (innerIdx * 2 * Math.PI) / 3 - Math.PI / 2;
        const ix = cx + Math.cos(innerAngle) * innerR;
        const iy = cy + Math.sin(innerAngle) * innerR;
        return (
          <line
            key={i}
            x1={ox}
            y1={oy}
            x2={ix}
            y2={iy}
            stroke={color}
            strokeOpacity={0.5}
            strokeWidth={0.8}
          />
        );
      })}
      <polygon
        points={tri}
        fill="none"
        stroke={color}
        strokeOpacity={0.85}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      {value !== undefined ? (
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={11}
          fontFamily="var(--font-display), serif"
          fontWeight={700}
          fill={color}
          data-d20-value
        >
          {value}
        </text>
      ) : null}
    </svg>
  );
}
