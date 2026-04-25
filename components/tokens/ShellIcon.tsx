import { sefirahByKey, sefirahMarkLetter } from '@/data';
import type { SefirahKey } from '@/data';

/**
 * Shell icon — visual inverse of `SparkIcon`. Same Hebrew first-letter,
 * but the disc is darkened (color mixed toward black) and the outer
 * ring is jagged rather than smooth, reading as "Qliphothic pressure
 * has awakened in this Sefirah".
 *
 * Status drives intensity:
 *   - `dormant`  → low-opacity placeholder (slot-only).
 *   - `active`   → full jagged ring + dark disc.
 *   - `banished` → strikethrough overlay; the Shell is past tense.
 */

const VIEW = 28;

export type ShellRenderStatus = 'dormant' | 'active' | 'banished';

interface ShellIconProps {
  readonly sefirah: SefirahKey;
  readonly status?: ShellRenderStatus;
  readonly className?: string;
}

/**
 * Mix the Sefirah's hex color toward black to produce its Shell color,
 * with a per-channel floor so already-dark Sefirot (Binah ≈ #1a1a1a)
 * don't darken into the page background and vanish.
 *
 * Input contract: `hex` is a `#rrggbb` string. Anything else is
 * returned unchanged (defensive — call sites only pass typed
 * `Sefirah.color` values).
 */
function darken(hex: string, factor: number): string {
  const m = /^#?([\da-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const raw = m[1];
  if (raw === undefined) return hex;
  const num = parseInt(raw, 16);
  // Floor at 0x30 (48) per channel so Binah-class blacks stay visible
  // against the bg-ground (#0e0a1f).
  const FLOOR = 0x30;
  const clamp = (c: number) => Math.max(FLOOR, Math.round(c * (1 - factor)));
  const r = clamp((num >> 16) & 0xff);
  const g = clamp((num >> 8) & 0xff);
  const b = clamp(num & 0xff);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Build a 12-pointed jagged polygon path centered on (cx,cy). Outer
 * vertices on radius `outer`, inner vertices on radius `inner`. The
 * jagged ring reads as "broken / corrupted" against the Spark icon's
 * smooth ring.
 */
function jaggedRing(cx: number, cy: number, outer: number, inner: number): string {
  const verts: string[] = [];
  const points = 12;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    verts.push(`${(cx + Math.cos(angle) * r).toFixed(2)},${(cy + Math.sin(angle) * r).toFixed(2)}`);
  }
  return verts.join(' ');
}

export function ShellIcon({
  sefirah,
  status = 'active',
  className,
}: ShellIconProps): JSX.Element {
  const data = sefirahByKey(sefirah);
  const dark = darken(data.color, 0.55);
  const glyph = sefirahMarkLetter[sefirah];
  const label = `Shell of ${data.englishName} — ${data.shellKeyword} (${status})`;
  const cx = VIEW / 2;
  const cy = VIEW / 2;
  const opacity = status === 'dormant' ? 0.2 : 1;
  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      role="img"
      data-token="shell"
      data-sefirah={sefirah}
      data-status={status}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={label}
    >
      <title>{label}</title>
      {/* Group opacity composites ring + disc together so a future
          translucent fill can't introduce a stacking artefact. */}
      <g opacity={opacity}>
        {/* Jagged outer ring */}
        <polygon
          points={jaggedRing(cx, cy, VIEW / 2 - 1, VIEW / 2 - 4)}
          fill={dark}
          stroke="#f8f8ff"
          strokeOpacity={0.3}
          strokeWidth={0.8}
        />
        {/* Inner disc — darker still */}
        <circle
          cx={cx}
          cy={cy}
          r={VIEW / 2 - 7}
          fill="#0e0a1f"
          stroke={dark}
          strokeWidth={0.8}
        />
      </g>
      {/* Hebrew letter mark, dim */}
      <text
        x={cx}
        y={cy + 5}
        textAnchor="middle"
        fontSize={13}
        fontFamily="var(--font-hebrew), serif"
        fill="#f8f8ff"
        fillOpacity={status === 'dormant' ? 0.2 : 0.7}
        lang="he"
        style={{ direction: 'rtl', unicodeBidi: 'isolate' }}
      >
        {glyph}
      </text>
      {status === 'banished' ? (
        <line
          x1={4}
          y1={4}
          x2={VIEW - 4}
          y2={VIEW - 4}
          stroke="#f8f8ff"
          strokeOpacity={0.7}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
}
