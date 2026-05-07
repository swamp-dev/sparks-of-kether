import { sefirot } from '@/data/sefirot';
import { paths } from '@/data/paths';
import { TREE_VIEW_H, TREE_VIEW_W, treeNodeLayout } from '@/data/tree-layout';
import { VEIL } from '@/data/colors';

/**
 * Faint Tree-of-Life silhouette behind the Lobby content (#403). Reuses
 * the canonical geometry from `data/tree-layout` (same node positions
 * as `TreeBoard.tsx` and `Hero.tsx`) and the `data/paths` graph; renders
 * it as decorative backdrop only — no halos, no labels, no path numbers,
 * no interactivity. The whole layer sits at ~12% opacity so it reads as
 * atmosphere rather than focal point.
 *
 * The SVG runs `motion-safe:animate-breath` (6s symmetric opacity loop
 * from `tailwind.config.ts`); composed with the parent's static
 * opacity, the silhouette breathes between ~12% and ~8% effective
 * opacity. Reduced-motion users see it static at 12% — the same brief
 * as the home Hero (#313): a static lit Tree, never a flickering one.
 *
 * `aria-hidden`, `pointer-events-none`. Positioned via the consumer's
 * own `relative` container — defaults to `absolute inset-0` so it
 * fills whatever ancestor it's placed in.
 *
 * Composition note: this is intentionally NOT a sibling of the
 * layout-level `Substrate` / `Starfield` (those live at app-level
 * z-indices `-z-20` / `-z-10`). The Lobby backdrop is per-section, so
 * it sits inside the Lobby's own stacking context and lets the rest of
 * the route's atmospheric stack continue to paint behind it.
 */

interface LobbyBackdropProps {
  readonly className?: string;
}

const NODE_RADIUS = 14;

export function LobbyBackdrop({ className }: LobbyBackdropProps): JSX.Element {
  return (
    <div
      data-atmosphere="lobby-backdrop"
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.12] ${className ?? ''}`}
    >
      <svg
        viewBox={`0 0 ${TREE_VIEW_W} ${TREE_VIEW_H}`}
        className="block h-full max-h-[80vh] w-auto motion-safe:animate-breath"
        preserveAspectRatio="xMidYMid meet"
      >
        <g data-layer="paths">
          {paths.map((path) => {
            const a = treeNodeLayout[path.from];
            const b = treeNodeLayout[path.to];
            return (
              <line
                key={path.number}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={VEIL}
                strokeOpacity={0.55}
                strokeWidth={1.25}
              />
            );
          })}
        </g>

        <g data-layer="nodes">
          {sefirot.map((sefirah) => {
            const pos = treeNodeLayout[sefirah.key];
            return (
              <circle
                key={sefirah.key}
                data-node={sefirah.key}
                cx={pos.x}
                cy={pos.y}
                r={NODE_RADIUS}
                fill={sefirah.color}
                fillOpacity={0.7}
                stroke={VEIL}
                strokeOpacity={0.5}
                strokeWidth={1}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
