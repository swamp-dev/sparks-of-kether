import { useId } from 'react';
import { letterByKey, paths, sefirahByKey, sefirot } from '@/data';
import type { SefirahKey } from '@/data';

/**
 * Static SVG of the Tree of Life — 10 Sefirot + 22 paths laid out in
 * the traditional three-pillar geometry. Pure presentation, no game
 * state. Interactivity (move highlighting, click handlers) lands in
 * Phase 3's `Tree board interactive` ticket.
 *
 * Coordinate system: 400×600 viewBox. Pillars are anchored at x=80
 * (Severity, viewer's left), x=200 (Balance, center), x=320 (Mercy,
 * viewer's right). Vertical positions are tuned for readability
 * rather than reproducing any specific historical diagram exactly.
 *
 * Pillar orientation note: the project's reference materials label
 * Mercy as "(R)" and Severity as "(L)" — that convention is followed
 * here (Mercy on the viewer's right). Other Tree diagrams mirror this;
 * the choice is consistent within this codebase.
 */

const VIEW_W = 400;
// 620 not 600: gives Malkuth's label below the bottom node room to render
// without clipping (label baseline sits at malkuth.y + radius + 14 = 602).
const VIEW_H = 620;
const NODE_RADIUS = 28;

interface NodeLayout {
  readonly x: number;
  readonly y: number;
}

const nodeLayout: Readonly<Record<SefirahKey, NodeLayout>> = {
  kether: { x: 200, y: 60 },
  chokmah: { x: 320, y: 150 },
  binah: { x: 80, y: 150 },
  chesed: { x: 320, y: 280 },
  gevurah: { x: 80, y: 280 },
  tiferet: { x: 200, y: 340 },
  netzach: { x: 320, y: 430 },
  hod: { x: 80, y: 430 },
  yesod: { x: 200, y: 490 },
  malkuth: { x: 200, y: 560 },
};

/**
 * Per-Sefirah glyph foreground color. Hardcoded rather than derived
 * from luminance so contrast can be hand-tuned where the math is
 * borderline (Yesod's violet / Malkuth's russet).
 */
const glyphForeground: Readonly<Record<SefirahKey, string>> = {
  kether: '#1a1a1a',
  chokmah: '#1a1a1a',
  binah: '#f8f8ff',
  chesed: '#f8f8ff',
  gevurah: '#f8f8ff',
  tiferet: '#1a1a1a',
  netzach: '#f8f8ff',
  hod: '#1a1a1a',
  yesod: '#f8f8ff',
  malkuth: '#f8f8ff',
};

interface TreeBoardProps {
  readonly className?: string;
}

export function TreeBoard({ className }: TreeBoardProps): JSX.Element {
  // Scope the gradient ID per render so two TreeBoards in the same DOM
  // don't fight over a global #treeBackground reference.
  const gradientId = `tree-bg-${useId()}`;
  // Map-style accessibility: the SVG carries `role="figure"` with a
  // `<title>` describing the whole. Each Sefirah and path then exposes
  // its own `aria-label` so screen-reader users can navigate the tree
  // node-by-node. (Phase 3 interactivity assumes per-node AT focus.)
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="figure"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <title>Tree of Life — ten Sefirot connected by twenty-two paths</title>
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#1a1542" />
          <stop offset="100%" stopColor="#0e0a1f" />
        </radialGradient>
      </defs>

      <rect width={VIEW_W} height={VIEW_H} fill={`url(#${gradientId})`} />

      <Starfield />

      <g data-layer="paths">
        {paths.map((path) => {
          const a = nodeLayout[path.from];
          const b = nodeLayout[path.to];
          const letter = letterByKey(path.letterKey);
          const fromName = sefirahByKey(path.from).englishName;
          const toName = sefirahByKey(path.to).englishName;
          // Prose, not "↔" — screen readers announce the arrow as
          // "left right arrow" which clutters every label.
          const label = `Path ${path.number} (${letter.name}) — Arcanum ${path.arcanumNumber}, between ${fromName} and ${toName}`;
          return (
            <line
              key={path.number}
              data-path={path.number}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#f8f8ff"
              strokeOpacity={0.35}
              strokeWidth={1.5}
              role="img"
              aria-label={label}
            >
              <title>{label}</title>
            </line>
          );
        })}
      </g>

      <g data-layer="nodes">
        {sefirot.map((sefirah) => {
          const pos = nodeLayout[sefirah.key];
          const fg = glyphForeground[sefirah.key];
          const label = `${sefirah.englishName} (${sefirah.hebrewName}), Sefirah ${sefirah.number}`;
          return (
            <g
              key={sefirah.key}
              data-sefirah={sefirah.key}
              role="img"
              aria-label={label}
            >
              <circle
                cx={pos.x}
                cy={pos.y}
                r={NODE_RADIUS}
                fill={sefirah.color}
                stroke="#f8f8ff"
                strokeOpacity={0.6}
                strokeWidth={1.5}
              />
              <text
                x={pos.x}
                y={pos.y + 6}
                textAnchor="middle"
                fontSize={20}
                fontFamily="var(--font-hebrew), serif"
                fill={fg}
                lang="he"
                style={{ direction: 'rtl', unicodeBidi: 'isolate' }}
              >
                {sefirah.hebrewName}
              </text>
              <text
                x={pos.x}
                y={pos.y + NODE_RADIUS + 14}
                textAnchor="middle"
                fontSize={11}
                fontFamily="var(--font-display), serif"
                fill="#f8f8ff"
                letterSpacing={1.5}
                style={{ textTransform: 'uppercase' }}
              >
                {sefirah.englishName}
              </text>
              <text
                x={pos.x - NODE_RADIUS - 2}
                y={pos.y - NODE_RADIUS - 2}
                textAnchor="end"
                fontSize={10}
                fontFamily="var(--font-sans), sans-serif"
                fill="#f8f8ff"
                fillOpacity={0.5}
              >
                {sefirah.number}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

const STARS: readonly (readonly [number, number, number])[] = [
  [40, 80, 0.6],
  [340, 50, 0.4],
  [120, 30, 0.5],
  [260, 110, 0.3],
  [60, 220, 0.4],
  [355, 350, 0.5],
  [30, 380, 0.3],
  [380, 220, 0.4],
  [180, 600, 0.3],
  [10, 540, 0.4],
  [390, 510, 0.5],
  [140, 380, 0.3],
];

/**
 * Light scattering of background stars. Positions are a fixed list,
 * not seeded `Math.random()`, so snapshot tests stay stable.
 * Decorative; aria-hidden so AT skips it.
 */
function Starfield(): JSX.Element {
  return (
    <g aria-hidden="true">
      {STARS.map(([cx, cy, opacity], i) => (
        <circle key={i} cx={cx} cy={cy} r={0.8} fill="#f8f8ff" fillOpacity={opacity} />
      ))}
    </g>
  );
}
