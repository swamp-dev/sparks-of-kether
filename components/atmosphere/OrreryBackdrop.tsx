import { VEIL } from '@/data/colors';

/**
 * Viewport-spanning solar-system backdrop for the play screen. A
 * central sun, faint concentric orbit rings, and six planets that
 * orbit at different cadences (mercurial → outer-gas-giant). Renders
 * as a `position: fixed` SVG covering the viewport, sitting behind
 * page content but in front of the deepest Substrate layer.
 *
 * Each orbit's rotation lives on its own `<g>` wrapper via the
 * `motion-safe:animate-orrery-orbit-{n}` Tailwind animations (Tailwind
 * config). Alternating directions keep the rings visually distinct.
 * `prefers-reduced-motion: reduce` users see a static orrery — the
 * `motion-safe:` variant is the load-bearing gate.
 *
 * `aria-hidden`, `pointer-events-none` — purely decorative. Sits at
 * `-z-[15]` so it paints above the deeper Substrate (`-z-20`, indigo
 * void) and below the Starfield (`-z-10`, twinkling stars) — the
 * three atmosphere layers occupy distinct z-tiers so DOM reordering
 * can't silently change the visual stacking. With
 * `preserveAspectRatio="xMinYMax slice"` the viewBox's bottom-left
 * corner anchors to the viewport's bottom-left corner (the orrery's
 * sun); excess viewBox extends up and right, with clipping on
 * widescreen displays — that's intentional, the cosmos extends past
 * the frame.
 */

interface OrreryBackdropProps {
  readonly className?: string;
}

interface Orbit {
  readonly index: 1 | 2 | 3 | 4 | 5 | 6;
  readonly radius: number;
  readonly planetRadius: number;
  readonly planetColor: string;
  readonly animationClass: string;
  readonly hasRing?: boolean;
}

// Square viewBox centred at (0,0). Outermost orbit reaches radius
// 2000 — beyond the viewBox edges — so the corresponding arc sweeps
// from the sun at the bottom-left corner clear past the upper-right
// of any widescreen viewport. ViewBox is translated to bottom-left
// anchor at render time (see the `<g>` wrapping all orbital content
// below). Content beyond the viewBox is allowed; only the wrapper's
// `overflow-hidden` clips it at the viewport edge.
const VIEWBOX_HALF = 900;

const SUN_RADIUS = 55;

// Monochrome veil palette: every planet is the same off-white as the
// orbit rings. The visual interest comes from size, opacity, and
// orbital cadence — not hue. Anchoring the whole orrery in one tone
// keeps it ambient instead of competing with the foreground Tree's
// colourful Sefirot.
const PLANET_FILL = VEIL;

const ORBITS: readonly Orbit[] = [
  {
    index: 1,
    radius: 220,
    planetRadius: 8,
    planetColor: PLANET_FILL,
    animationClass: 'motion-safe:animate-orrery-orbit-1',
  },
  {
    index: 2,
    radius: 430,
    planetRadius: 12,
    planetColor: PLANET_FILL,
    animationClass: 'motion-safe:animate-orrery-orbit-2',
  },
  {
    index: 3,
    radius: 700,
    planetRadius: 18,
    planetColor: PLANET_FILL,
    animationClass: 'motion-safe:animate-orrery-orbit-3',
  },
  {
    index: 4,
    radius: 1020,
    planetRadius: 14,
    planetColor: PLANET_FILL,
    animationClass: 'motion-safe:animate-orrery-orbit-4',
  },
  {
    index: 5,
    radius: 1450,
    planetRadius: 26,
    planetColor: PLANET_FILL,
    animationClass: 'motion-safe:animate-orrery-orbit-5',
  },
  {
    index: 6,
    radius: 1980,
    planetRadius: 20,
    planetColor: PLANET_FILL,
    animationClass: 'motion-safe:animate-orrery-orbit-6',
    hasRing: true,
  },
];

export function OrreryBackdrop({ className }: OrreryBackdropProps): JSX.Element {
  return (
    <div
      data-atmosphere="orrery-backdrop"
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 -z-[15] overflow-hidden ${className ?? ''}`.trim()}
    >
    <svg
      viewBox={`-${VIEWBOX_HALF} -${VIEWBOX_HALF} ${VIEWBOX_HALF * 2} ${VIEWBOX_HALF * 2}`}
      // `xMinYMax slice` anchors the viewBox's bottom-left corner to
      // the viewport's bottom-left corner; the rest of the viewBox
      // extends up + right, with any excess clipped beyond the
      // viewport's right/top edges on widescreen displays.
      preserveAspectRatio="xMinYMax slice"
      xmlns="http://www.w3.org/2000/svg"
      className="block h-full w-full"
    >
      {/* All orbit content is wrapped in a single translate so the
          orrery's logical centre (0, 0) sits at the viewBox's
          bottom-left corner — i.e. the viewport's bottom-left. From
          there the circular orbits sweep diagonally up + right across
          the screen. No 3D tilt needed: the off-corner anchor IS the
          diagonal. */}
      <g transform={`translate(-${VIEWBOX_HALF} ${VIEWBOX_HALF})`}>
        {/* Faint orbit guide lines — the rings the planets travel. */}
        <g data-layer="orbit-rings" stroke={VEIL} strokeOpacity={0.06} fill="none">
          {ORBITS.map((o) => (
            <circle key={`ring-${o.index}`} data-ring={o.index} cx={0} cy={0} r={o.radius} />
          ))}
        </g>

        {/* Central sun anchored at the bottom-left corner. Kept gold
            (warmer than the veil planets) as the symbolic source of
            the orbital procession. */}
        <g data-layer="sun">
          <circle data-sun-glow cx={0} cy={0} r={SUN_RADIUS * 2.6} fill="#ffd700" fillOpacity={0.05} />
          <circle data-sun-glow cx={0} cy={0} r={SUN_RADIUS * 1.6} fill="#ffd700" fillOpacity={0.1} />
          <circle data-sun cx={0} cy={0} r={SUN_RADIUS} fill="#ffd700" fillOpacity={0.32} />
        </g>

        {/* One rotating group per orbit. Each `<g>` rotates around
            (0,0) via the named animation; the planet sits at
            (radius, 0) inside the group, so the rotation sweeps it
            along its ring. */}
        {ORBITS.map((o) => (
          <g key={`orbit-${o.index}`} data-orbit={o.index} className={o.animationClass}>
            <circle
              data-planet={o.index}
              cx={o.radius}
              cy={0}
              r={o.planetRadius}
              fill={o.planetColor}
              fillOpacity={0.32}
            />
            {o.hasRing ? (
              <ellipse
                data-planet-ring={o.index}
                cx={o.radius}
                cy={0}
                rx={o.planetRadius * 2}
                ry={o.planetRadius * 0.55}
                stroke={o.planetColor}
                strokeOpacity={0.2}
                strokeWidth={1.2}
                fill="none"
              />
            ) : null}
          </g>
        ))}
      </g>
    </svg>
    </div>
  );
}
