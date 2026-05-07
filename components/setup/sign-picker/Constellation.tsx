import { ZODIAC_CONSTELLATIONS } from '@/data/zodiac-constellations';
import type { ZodiacSignKey } from '@/data';

/**
 * Faint per-sign asterism rendered behind the focused sign on the
 * carousel center stage (#314 / #406). Decorative — `aria-hidden="true"`.
 *
 * Geometry comes from `data/zodiac-constellations.ts`. Coordinates are
 * normalised to `[0..1]`; we scale them into the SVG viewBox at draw
 * time. Stars are small filled circles at low alpha so the foreground
 * glyph and Hebrew letter remain dominant; edges are 1px lines at
 * even lower alpha that sketch the asterism shape.
 *
 * Motion: the whole svg rotates slowly via
 * `motion-safe:animate-constellation-rotate` (60s full turn, linear,
 * infinite — Tailwind variant, so reduced-motion users get the static
 * constellation). The SVG element's default transform-origin is its
 * own centre (50% 50%), so rotation pivots on the asterism's middle
 * inside its square containing box without explicit `transform-origin`
 * styling. Picked rotation over the prior `animate-breath` opacity
 * cycle because #406's acceptance criterion is "Slow rotation visible
 * at default motion settings" — opacity pulse alone wasn't enough; the
 * spin reads as the night sky drifting overhead.
 */

const VIEW = 320;
const STAR_RADIUS = 2.5;
const HUB_RADIUS = 4; // slightly larger first star (the "lead" of the asterism)

interface ConstellationProps {
  readonly sign: ZodiacSignKey;
  readonly className?: string;
}

export function Constellation({ sign, className }: ConstellationProps): JSX.Element {
  const { stars, edges } = ZODIAC_CONSTELLATIONS[sign];
  return (
    <svg
      data-constellation={sign}
      aria-hidden="true"
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      xmlns="http://www.w3.org/2000/svg"
      className={`pointer-events-none motion-safe:animate-constellation-rotate ${className ?? ''}`}
    >
      <g stroke="currentColor" strokeWidth={1} strokeOpacity={0.18} fill="none">
        {edges.map(([from, to], i) => {
          // Index-safety: the edge data is fixture-stable (the test
          // pin in `data/__tests__/zodiac-constellations.test.ts` keeps
          // every edge index in `[0, stars.length)`), so an out-of-range
          // index here is a fixture bug — throwing is the right floor.
          const a = stars[from];
          const b = stars[to];
          if (a === undefined || b === undefined) {
            throw new Error(`Constellation: edge ${i} references missing star (${from}→${to})`);
          }
          return (
            <line
              key={`${from}-${to}-${i}`}
              data-edge
              x1={a.x * VIEW}
              y1={a.y * VIEW}
              x2={b.x * VIEW}
              y2={b.y * VIEW}
            />
          );
        })}
      </g>
      <g fill="currentColor">
        {stars.map((star, i) => (
          <circle
            key={`star-${i}`}
            data-star
            cx={star.x * VIEW}
            cy={star.y * VIEW}
            r={i === 0 ? HUB_RADIUS : STAR_RADIUS}
            fillOpacity={i === 0 ? 0.55 : 0.4}
          />
        ))}
      </g>
    </svg>
  );
}
