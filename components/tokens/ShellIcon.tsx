import { sefirahByKey, sefirahMarkLetter } from '@/data';
import type { SefirahKey } from '@/data';
import { TIFERET_GOLD, VEIL } from '@/data/colors';

/**
 * Shell icon — the visual shorthand for Qliphothic pressure on a
 * Sefirah. A 12-pointed jagged starburst seal with a central disc
 * carrying that Sefirah's first Hebrew letter.
 *
 * Status drives a distinct visual register, per #317:
 *
 *   - `dormant`  → faded hairline ring (~25 % opacity) in the
 *                  Sefirah's colour, letter rendered as a stroke-only
 *                  outline, slow ~30s rotation under `motion-safe:`.
 *                  Reads as a sigil that hasn't bloomed.
 *   - `active`   → full opacity in the Sefirah's colour, letter
 *                  filled, paired with a coloured halo and a slow
 *                  ~8 s wobble. Reads as a present threat. (The
 *                  halo + tilt live on the panel slot's wrapper, not
 *                  on the icon itself, so the icon's bounding box
 *                  stays predictable.)
 *   - `banished` → metallic-gold hairline outline (Tiferet token), a
 *                  thin diagonal binding line crossing the seal like
 *                  a wax-seal stamp, neutral mid-grey Hebrew letter.
 *                  Reads as defeated and sealed.
 *
 * The icon is geometry only — animations and halos are applied by
 * the parent slot via Tailwind tokens (see `ShellPanel.tsx`). This
 * keeps the SVG geometry straightforward and lets the panel
 * compose hover / focus state on top.
 *
 * Naming rule (`design/shells.md`): traditional Qliphothic
 * intelligence names are NEVER used in code or UI. Shells are
 * referred to descriptively — "Shell of Chesed", not the proper
 * noun.
 */

const VIEW = 28;

export type ShellRenderStatus = 'dormant' | 'active' | 'banished';

interface ShellIconProps {
  readonly sefirah: SefirahKey;
  readonly status?: ShellRenderStatus;
  readonly className?: string;
}

/**
 * Build a 12-pointed jagged polygon path centred on (cx,cy). Outer
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

export function ShellIcon({ sefirah, status = 'active', className }: ShellIconProps): JSX.Element {
  const data = sefirahByKey(sefirah);
  const sefirahColor = data.color;
  const glyph = sefirahMarkLetter[sefirah];
  const label = `Shell of ${data.englishName} — ${data.shellKeyword} (${status})`;
  const cx = VIEW / 2;
  const cy = VIEW / 2;

  const outerR = VIEW / 2 - 1;
  const innerR = VIEW / 2 - 4;
  const discR = VIEW / 2 - 7;

  // ── Per-state visual recipe ────────────────────────────────────
  // Dormant:  faded hairline ring in Sefirah colour, hollow letter.
  // Active:   full-opacity ring in Sefirah colour, filled letter.
  // Banished: gold engraved ring + diagonal binding line, grey letter.
  let ringFill: string;
  let ringStroke: string;
  let ringStrokeWidth: number;
  let ringOpacity: number;
  let discStroke: string;
  let letterFill: string;
  let letterStroke: string;
  let letterStrokeWidth: number;
  let letterOpacity: number;

  if (status === 'dormant') {
    // Faded outline. The ring is essentially invisible at rest;
    // `discStroke` carries the Sefirah identity at low alpha.
    ringFill = 'transparent';
    ringStroke = sefirahColor;
    ringStrokeWidth = 0.6;
    ringOpacity = 0.25;
    discStroke = sefirahColor;
    // Hairline outline letter — no fill, just a thin stroke.
    letterFill = 'none';
    letterStroke = sefirahColor;
    letterStrokeWidth = 0.6;
    letterOpacity = 0.55;
  } else if (status === 'active') {
    // Full presence. The ring is the Sefirah's colour at full
    // opacity; the letter is filled in the same colour so it reads
    // as fully bloomed.
    ringFill = 'transparent';
    ringStroke = sefirahColor;
    ringStrokeWidth = 1.1;
    ringOpacity = 1;
    discStroke = sefirahColor;
    letterFill = sefirahColor;
    letterStroke = 'none';
    letterStrokeWidth = 0;
    letterOpacity = 0.95;
  } else {
    // Banished — engraved gold hairline + neutral grey letter.
    ringFill = 'transparent';
    ringStroke = TIFERET_GOLD;
    ringStrokeWidth = 0.6;
    ringOpacity = 0.85;
    discStroke = TIFERET_GOLD;
    letterFill = '#7a7a85';
    letterStroke = 'none';
    letterStrokeWidth = 0;
    letterOpacity = 0.85;
  }

  // ── Animation surface ──────────────────────────────────────────
  // Dormant Shells rotate barely-perceptibly (~30 s full turn) so
  // the seal feels asleep-not-static; banished Shells are still;
  // active Shells get their wobble at the panel-slot level (so the
  // icon's bounding box stays calm). All animation utilities are
  // gated on `motion-safe:` and so degrade to static for the
  // reduced-motion preference.
  const rootClass = [
    className,
    status === 'dormant' ? 'motion-safe:animate-shell-dormant-spin' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      role="img"
      data-token="shell"
      data-sefirah={sefirah}
      data-status={status}
      data-shell-state={status}
      xmlns="http://www.w3.org/2000/svg"
      className={rootClass}
      aria-label={label}
    >
      <title>{label}</title>
      {/* Group opacity composites ring + disc + letter together so a
          single per-state alpha drives the whole sigil. */}
      <g opacity={ringOpacity}>
        {/* Jagged outer ring */}
        <polygon
          points={jaggedRing(cx, cy, outerR, innerR)}
          fill={ringFill}
          stroke={ringStroke}
          strokeWidth={ringStrokeWidth}
          strokeLinejoin="round"
        />
        {/* Inner disc — a hairline boundary just inside the ring.
            Fill is transparent (the parent slot's halo/colour shows
            through and the substrate's void carries the letter
            ground); the stroke is the visible delimiter. */}
        <circle
          cx={cx}
          cy={cy}
          r={discR}
          fill="transparent"
          stroke={discStroke}
          strokeWidth={0.5}
        />
      </g>
      {/* Hebrew letter mark. Rendered outside the ring's opacity
          group so its own opacity drives independently — a hollow
          outline letter stays legible even when the ring is
          ghosted. */}
      <text
        x={cx}
        y={cy + 5}
        textAnchor="middle"
        fontSize={13}
        fontFamily="var(--font-hebrew), serif"
        fill={letterFill}
        stroke={letterStroke}
        strokeWidth={letterStrokeWidth}
        fillOpacity={letterOpacity}
        strokeOpacity={letterOpacity}
        lang="he"
        style={{ direction: 'rtl', unicodeBidi: 'isolate' }}
      >
        {glyph}
      </text>
      {status === 'banished' ? (
        // Diagonal wax-seal binding line. Not a strikethrough — it's
        // a stamp across the seal that signals "sealed shut". Slight
        // shadow simulates the indentation of a pressed seal.
        <g data-shell-banished-binding>
          <line
            x1={3}
            y1={6}
            x2={VIEW - 3}
            y2={VIEW - 6}
            stroke={TIFERET_GOLD}
            strokeOpacity={0.85}
            strokeWidth={1.1}
            strokeLinecap="round"
          />
          <line
            x1={3}
            y1={6}
            x2={VIEW - 3}
            y2={VIEW - 6}
            stroke={VEIL}
            strokeOpacity={0.18}
            strokeWidth={0.4}
            strokeLinecap="round"
            transform="translate(0.4, 0.4)"
          />
        </g>
      ) : null}
    </svg>
  );
}
