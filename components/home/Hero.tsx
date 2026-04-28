import { TIFERET_GOLD, VEIL } from '@/data/colors';

/**
 * Simplified Tree of Life silhouette for the home page hero band.
 * Decorative: 10 circles connected by 22 paths in faint gold/veil
 * tones, sized to fill the gap between the title and the room
 * forms. Aria-hidden because the home page already names the game
 * in copy ("A cooperative ascent up the Kabbalistic Tree of Life").
 *
 * Not interactive — this is a still illustration, not the play
 * board (`components/tree/TreeBoard.tsx`). The play board carries
 * `role="figure"`, click handlers, and per-node ARIA — none of
 * that belongs on a marketing surface.
 *
 * Positions mirror `nodeLayout` in TreeBoard so the visual reads as
 * the same Tree the player will navigate.
 */

interface HeroProps {
  readonly className?: string;
}

const NODES: readonly { x: number; y: number }[] = [
  { x: 200, y: 60 }, // kether
  { x: 320, y: 150 }, // chokmah
  { x: 80, y: 150 }, // binah
  { x: 320, y: 280 }, // chesed
  { x: 80, y: 280 }, // gevurah
  { x: 200, y: 340 }, // tiferet
  { x: 320, y: 430 }, // netzach
  { x: 80, y: 430 }, // hod
  { x: 200, y: 490 }, // yesod
  { x: 200, y: 560 }, // malkuth
];

// 22 paths between Sefirot, indexed into NODES. Mirrors the canonical
// Hermetic-Qabalah path arrangement (paths 11–32 in the traditional
// numbering).
const PATHS: readonly [number, number][] = [
  [0, 1], [0, 2], [0, 5],          // kether → chokmah, binah, tiferet
  [1, 2], [1, 3], [1, 5],          // chokmah → binah, chesed, tiferet
  [2, 4], [2, 5],                  // binah → gevurah, tiferet
  [3, 4], [3, 5], [3, 6],          // chesed → gevurah, tiferet, netzach
  [4, 5], [4, 7],                  // gevurah → tiferet, hod
  [5, 6], [5, 7], [5, 8],          // tiferet → netzach, hod, yesod
  [6, 7], [6, 8], [6, 9],          // netzach → hod, yesod, malkuth
  [7, 8], [7, 9],                  // hod → yesod, malkuth
  [8, 9],                          // yesod → malkuth
];

export function Hero({ className }: HeroProps): JSX.Element {
  return (
    <div
      data-home-hero
      aria-hidden="true"
      className={`pointer-events-none w-full ${className ?? ''}`}
    >
      <svg
        viewBox="0 40 400 540"
        className="mx-auto h-48 w-auto sm:h-56 md:h-64"
        preserveAspectRatio="xMidYMid meet"
        role="presentation"
      >
        {/* Faint paths first so the nodes overlay them. */}
        {PATHS.map(([a, b], i) => {
          const from = NODES[a];
          const to = NODES[b];
          if (!from || !to) return null;
          return (
            <line
              key={`path-${i}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={VEIL}
              strokeOpacity={0.18}
              strokeWidth={1.5}
            />
          );
        })}
        {/* Outer halo on Tiferet for warm focal point. */}
        {NODES[5] ? (
          <circle
            cx={NODES[5].x}
            cy={NODES[5].y}
            r={32}
            fill={TIFERET_GOLD}
            fillOpacity={0.08}
          />
        ) : null}
        {/* Sefirot dots. */}
        {NODES.map((n, i) => (
          <circle
            key={`node-${i}`}
            cx={n.x}
            cy={n.y}
            r={i === 5 ? 12 : 7}
            fill={i === 5 ? TIFERET_GOLD : VEIL}
            fillOpacity={i === 5 ? 0.85 : 0.5}
            stroke={VEIL}
            strokeOpacity={0.25}
            strokeWidth={1}
          />
        ))}
      </svg>
    </div>
  );
}
