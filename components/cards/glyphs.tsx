/**
 * Shared geometric-glyph vocabulary for the 22 Arcana cards.
 *
 * Each glyph is a tiny stateless component that draws one symbolic
 * primitive at a given (cx, cy) center inside the card's SVG. Cards
 * compose 1–3 glyphs to suggest the archetype without depicting it
 * literally — the symbolic-minimalist constraint chosen for this game.
 *
 * Conventions:
 *   - All glyphs accept `cx`, `cy`, `size` (full extent, not radius),
 *     `color` (stroke), and `opacity`.
 *   - Stroke-only by default; filled variants belong in the consumer
 *     when needed.
 *   - Vectors are pure: no random jitter, no animation. Snapshot
 *     stability is a hard requirement.
 */

interface GlyphProps {
  readonly cx: number;
  readonly cy: number;
  readonly size: number;
  readonly color: string;
  readonly opacity?: number;
  readonly strokeWidth?: number;
}

const DEFAULT_STROKE = 1.6;

function strokeProps({ color, opacity = 1, strokeWidth = DEFAULT_STROKE }: GlyphProps) {
  return {
    stroke: color,
    strokeOpacity: opacity,
    strokeWidth,
    fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
}

/** Equilateral triangle, point-up. Fire / aspiration / active force. */
export function Triangle(props: GlyphProps): JSX.Element {
  const { cx, cy, size } = props;
  const h = (size * Math.sqrt(3)) / 2;
  const top = `${cx},${cy - h / 2}`;
  const left = `${cx - size / 2},${cy + h / 2}`;
  const right = `${cx + size / 2},${cy + h / 2}`;
  return <polygon points={`${top} ${left} ${right}`} {...strokeProps(props)} />;
}

/** Equilateral triangle, point-down. Water / receptivity / passive force. */
export function InvertedTriangle(props: GlyphProps): JSX.Element {
  const { cx, cy, size } = props;
  const h = (size * Math.sqrt(3)) / 2;
  const bottom = `${cx},${cy + h / 2}`;
  const left = `${cx - size / 2},${cy - h / 2}`;
  const right = `${cx + size / 2},${cy - h / 2}`;
  return <polygon points={`${bottom} ${left} ${right}`} {...strokeProps(props)} />;
}

/** Square. Earth / form / stability. */
export function Square(props: GlyphProps): JSX.Element {
  const { cx, cy, size } = props;
  return (
    <rect x={cx - size / 2} y={cy - size / 2} width={size} height={size} {...strokeProps(props)} />
  );
}

/** Circle. Spirit / wholeness / unity. */
export function CircleGlyph(props: GlyphProps): JSX.Element {
  const { cx, cy, size } = props;
  return <circle cx={cx} cy={cy} r={size / 2} {...strokeProps(props)} />;
}

/** Crescent. Moon / receptive / cycle. */
export function Crescent(props: GlyphProps): JSX.Element {
  const { cx, cy, size, color, opacity = 1, strokeWidth = DEFAULT_STROKE } = props;
  const r = size / 2;
  // Outer arc minus an offset arc to carve the crescent shape.
  const path = `
    M ${cx + r * 0.3},${cy - r}
    A ${r},${r} 0 1 0 ${cx + r * 0.3},${cy + r}
    A ${r * 0.85},${r * 0.85} 0 1 1 ${cx + r * 0.3},${cy - r}
    Z
  `;
  return (
    <path
      d={path}
      stroke={color}
      strokeOpacity={opacity}
      strokeWidth={strokeWidth}
      fill="none"
      strokeLinejoin="round"
    />
  );
}

/** Sun: filled circle with radial rays. Light / clarity / joy. */
export function SunGlyph(props: GlyphProps): JSX.Element {
  const { cx, cy, size, color, opacity = 1, strokeWidth = DEFAULT_STROKE } = props;
  const r = size / 3;
  const rayInner = r + 2;
  const rayOuter = size / 2;
  const rays = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * Math.PI) / 4;
    const x1 = cx + Math.cos(angle) * rayInner;
    const y1 = cy + Math.sin(angle) * rayInner;
    const x2 = cx + Math.cos(angle) * rayOuter;
    const y2 = cy + Math.sin(angle) * rayOuter;
    return (
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeOpacity={opacity}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    );
  });
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} {...strokeProps(props)} />
      {rays}
    </g>
  );
}

/** Cross. Intersection / four directions / axis mundi. */
export function Cross(props: GlyphProps): JSX.Element {
  const { cx, cy, size } = props;
  const half = size / 2;
  return (
    <g>
      <line x1={cx - half} y1={cy} x2={cx + half} y2={cy} {...strokeProps(props)} />
      <line x1={cx} y1={cy - half} x2={cx} y2={cy + half} {...strokeProps(props)} />
    </g>
  );
}

/** Wave. Water flow / change / current. */
export function Wave(props: GlyphProps): JSX.Element {
  const { cx, cy, size, color, opacity = 1, strokeWidth = DEFAULT_STROKE } = props;
  const half = size / 2;
  const amp = size / 6;
  const path = `
    M ${cx - half},${cy}
    Q ${cx - half / 2},${cy - amp} ${cx},${cy}
    T ${cx + half},${cy}
  `;
  return (
    <path
      d={path}
      stroke={color}
      strokeOpacity={opacity}
      strokeWidth={strokeWidth}
      fill="none"
      strokeLinecap="round"
    />
  );
}

/** Spiral. Evolution / cosmic order / transformation. */
export function Spiral(props: GlyphProps): JSX.Element {
  const { cx, cy, size, color, opacity = 1, strokeWidth = DEFAULT_STROKE } = props;
  const turns = 2.5;
  const points: string[] = [];
  const steps = 64;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = t * turns * Math.PI * 2;
    const r = (size / 2) * t;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return (
    <path
      d={points.join(' ')}
      stroke={color}
      strokeOpacity={opacity}
      strokeWidth={strokeWidth}
      fill="none"
      strokeLinecap="round"
    />
  );
}

/** Lightning bolt. Sudden insight / breakdown / liberation. */
export function Lightning(props: GlyphProps): JSX.Element {
  const { cx, cy, size, color, opacity = 1, strokeWidth = DEFAULT_STROKE } = props;
  const w = size / 2;
  const h = size / 2;
  const path = `
    M ${cx - w * 0.3},${cy - h}
    L ${cx + w * 0.2},${cy - h * 0.2}
    L ${cx - w * 0.1},${cy - h * 0.05}
    L ${cx + w * 0.3},${cy + h}
  `;
  return (
    <path
      d={path}
      stroke={color}
      strokeOpacity={opacity}
      strokeWidth={strokeWidth}
      fill="none"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  );
}

/**
 * N-pointed star (default 8). Guidance / hope / inspiration.
 * `rotation` is in degrees; default 0 places the first point at 12
 * o'clock. Pass `rotation={180}` to invert (e.g., a Devil pentagram).
 */
export function Star(props: GlyphProps & { points?: number; rotation?: number }): JSX.Element {
  const { cx, cy, size, points = 8, rotation = 0 } = props;
  const outer = size / 2;
  const inner = outer * 0.4;
  const rotRad = (rotation * Math.PI) / 180;
  const verts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const angle = (i * Math.PI) / points - Math.PI / 2 + rotRad;
    verts.push(`${(cx + Math.cos(angle) * r).toFixed(2)},${(cy + Math.sin(angle) * r).toFixed(2)}`);
  }
  return <polygon points={verts.join(' ')} {...strokeProps(props)} />;
}

/** Vesica piscis (two overlapping circles). Portal / lens / mystery. */
export function Vesica(props: GlyphProps): JSX.Element {
  const { cx, cy, size } = props;
  const r = size / 2;
  const offset = r * 0.5;
  return (
    <g>
      <circle cx={cx - offset} cy={cy} r={r} {...strokeProps(props)} />
      <circle cx={cx + offset} cy={cy} r={r} {...strokeProps(props)} />
    </g>
  );
}

/** Wheel: circle with 4 spokes. Cycles / fortune / movement. */
export function Wheel(props: GlyphProps): JSX.Element {
  const { cx, cy, size } = props;
  const r = size / 2;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} {...strokeProps(props)} />
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} {...strokeProps(props)} />
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} {...strokeProps(props)} />
      <line
        x1={cx - r * 0.707}
        y1={cy - r * 0.707}
        x2={cx + r * 0.707}
        y2={cy + r * 0.707}
        {...strokeProps(props)}
      />
      <line
        x1={cx - r * 0.707}
        y1={cy + r * 0.707}
        x2={cx + r * 0.707}
        y2={cy - r * 0.707}
        {...strokeProps(props)}
      />
    </g>
  );
}

/** Scales (justice). Balance / truth / weighing. */
export function Scales(props: GlyphProps): JSX.Element {
  const { cx, cy, size } = props;
  const beam = size * 0.7;
  const stem = size * 0.3;
  const panR = size * 0.16;
  const panY = cy + stem;
  return (
    <g>
      {/* Vertical stem */}
      <line x1={cx} y1={cy - stem} x2={cx} y2={cy} {...strokeProps(props)} />
      {/* Horizontal beam */}
      <line x1={cx - beam / 2} y1={cy} x2={cx + beam / 2} y2={cy} {...strokeProps(props)} />
      {/* Suspension lines + pans */}
      <line
        x1={cx - beam / 2}
        y1={cy}
        x2={cx - beam / 2}
        y2={panY - panR}
        {...strokeProps(props)}
      />
      <line
        x1={cx + beam / 2}
        y1={cy}
        x2={cx + beam / 2}
        y2={panY - panR}
        {...strokeProps(props)}
      />
      <path
        d={`M ${cx - beam / 2 - panR},${panY - panR} A ${panR},${panR * 0.7} 0 0 1 ${cx - beam / 2 + panR},${panY - panR}`}
        {...strokeProps(props)}
      />
      <path
        d={`M ${cx + beam / 2 - panR},${panY - panR} A ${panR},${panR * 0.7} 0 0 1 ${cx + beam / 2 + panR},${panY - panR}`}
        {...strokeProps(props)}
      />
    </g>
  );
}

/** Hexagram (Star of David). Union of opposites — fire ▽ over water △. */
export function Hexagram(props: GlyphProps): JSX.Element {
  return (
    <g>
      <Triangle {...props} />
      <InvertedTriangle {...props} />
    </g>
  );
}

/** Crown: three points above an arc. Sovereignty / authority / Kether. */
export function Crown(props: GlyphProps): JSX.Element {
  const { cx, cy, size } = props;
  const w = size;
  const h = size * 0.5;
  const path = `
    M ${cx - w / 2},${cy + h / 2}
    L ${cx - w / 2},${cy}
    L ${cx - w / 4},${cy + h / 4}
    L ${cx},${cy - h / 2}
    L ${cx + w / 4},${cy + h / 4}
    L ${cx + w / 2},${cy}
    L ${cx + w / 2},${cy + h / 2}
    Z
  `;
  return <path d={path} {...strokeProps(props)} />;
}

/**
 * Name → component map. Used by `glyph-mapping.ts` to keep per-card
 * compositions data-driven rather than spelling out JSX in 22 places.
 */
export type GlyphName =
  | 'triangle'
  | 'invertedTriangle'
  | 'square'
  | 'circle'
  | 'crescent'
  | 'sun'
  | 'cross'
  | 'wave'
  | 'spiral'
  | 'lightning'
  | 'star'
  | 'vesica'
  | 'wheel'
  | 'scales'
  | 'hexagram'
  | 'crown';

type GlyphComponent = (props: GlyphProps & { points?: number; rotation?: number }) => JSX.Element;

export const GLYPHS: Readonly<Record<GlyphName, GlyphComponent>> = {
  triangle: Triangle,
  invertedTriangle: InvertedTriangle,
  square: Square,
  circle: CircleGlyph,
  crescent: Crescent,
  sun: SunGlyph,
  cross: Cross,
  wave: Wave,
  spiral: Spiral,
  lightning: Lightning,
  star: Star,
  vesica: Vesica,
  wheel: Wheel,
  scales: Scales,
  hexagram: Hexagram,
  crown: Crown,
};
