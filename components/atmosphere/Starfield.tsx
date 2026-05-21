/**
 * Full-viewport decorative star scattering. Sits behind page content,
 * `pointer-events-none`, `aria-hidden`. Positions are fixed (not
 * `Math.random`) so SSR renders match the client and snapshots stay
 * stable.
 *
 * Density picks one of three pre-baked star sets:
 *   - 'sparse'  — 24 stars, default. Reads as a quiet background.
 *   - 'medium'  — 60 stars. A degree more activity.
 *   - 'dense'   — 120 stars. Used when the route wants the void to
 *     feel populated (e.g. `/demo/ritual`).
 *
 * Twinkle is opt-in (`twinkle={true}`). When enabled, every star
 * pulses via `filter: brightness()` so each star's inline opacity
 * (the per-star variation) is preserved — opacity-keyframed twinkle
 * would override the inline value. The effect is suppressed
 * automatically by `prefers-reduced-motion: reduce` via the
 * `motion-safe:` Tailwind variant — no JS branch needed.
 */

interface StarfieldProps {
  readonly density?: 'sparse' | 'medium' | 'dense';
  readonly twinkle?: boolean;
  readonly className?: string;
}

// Pre-baked star fields. Each entry is [x%, y%, opacity, sizeMultiplier].
// Hand-picked rather than `seededRng` so the layout reads as
// composed rather than statistically uniform.
const SPARSE_STARS: readonly (readonly [number, number, number, number])[] = [
  [4, 8, 0.55, 1],
  [12, 22, 0.4, 0.8],
  [18, 5, 0.7, 1.2],
  [27, 14, 0.5, 1],
  [34, 28, 0.6, 0.9],
  [42, 6, 0.8, 1.1],
  [49, 18, 0.45, 1],
  [56, 32, 0.65, 1],
  [63, 9, 0.55, 1.2],
  [71, 21, 0.7, 0.9],
  [78, 4, 0.5, 1],
  [85, 16, 0.6, 1.1],
  [92, 27, 0.45, 0.9],
  [97, 11, 0.7, 1],
  [8, 45, 0.5, 1],
  [22, 53, 0.65, 1.1],
  [38, 41, 0.55, 0.9],
  [54, 49, 0.7, 1],
  [69, 38, 0.5, 1.2],
  [82, 51, 0.6, 1],
  [15, 68, 0.45, 1],
  [44, 73, 0.65, 1.1],
  [61, 64, 0.55, 0.9],
  [88, 76, 0.6, 1],
];

const MEDIUM_STARS: readonly (readonly [number, number, number, number])[] = [
  ...SPARSE_STARS,
  [2, 35, 0.4, 0.8],
  [11, 88, 0.55, 1],
  [19, 41, 0.5, 1.1],
  [25, 79, 0.65, 0.9],
  [31, 92, 0.45, 1],
  [40, 84, 0.6, 1.2],
  [47, 95, 0.5, 0.9],
  [53, 81, 0.7, 1],
  [59, 90, 0.55, 1.1],
  [66, 86, 0.45, 1],
  [73, 94, 0.6, 0.9],
  [80, 82, 0.5, 1.1],
  [87, 89, 0.65, 1],
  [94, 84, 0.55, 0.9],
  [6, 60, 0.5, 1],
  [17, 33, 0.6, 1.1],
  [29, 62, 0.45, 0.9],
  [36, 11, 0.7, 1],
  [45, 56, 0.55, 1.1],
  [52, 67, 0.5, 0.9],
  [58, 23, 0.65, 1],
  [64, 47, 0.45, 1],
  [70, 56, 0.7, 0.9],
  [77, 30, 0.55, 1.1],
  [83, 64, 0.5, 1],
  [89, 38, 0.65, 0.9],
  [95, 53, 0.55, 1],
  [10, 17, 0.45, 0.9],
  [33, 65, 0.7, 1.1],
  [50, 40, 0.6, 0.9],
  [67, 75, 0.5, 1],
  [86, 19, 0.55, 1.1],
  [3, 71, 0.45, 0.9],
  [21, 27, 0.65, 1],
];

// Dense stars: medium plus a denser fill. Built explicitly rather
// than via `Math.random` so render is deterministic.
const DENSE_STARS: readonly (readonly [number, number, number, number])[] = [
  ...MEDIUM_STARS,
  [5, 15, 0.4, 0.7],
  [9, 30, 0.5, 0.9],
  [14, 47, 0.6, 1],
  [20, 60, 0.45, 0.8],
  [24, 8, 0.55, 1.1],
  [28, 38, 0.7, 0.9],
  [32, 71, 0.5, 1],
  [37, 83, 0.55, 0.9],
  [41, 19, 0.65, 1.1],
  [46, 32, 0.45, 0.8],
  [51, 5, 0.6, 1],
  [55, 78, 0.55, 0.9],
  [60, 14, 0.5, 1.1],
  [65, 28, 0.7, 0.9],
  [72, 49, 0.45, 1],
  [76, 67, 0.6, 0.9],
  [81, 12, 0.55, 1.1],
  [84, 35, 0.5, 1],
  [90, 60, 0.65, 0.9],
  [93, 80, 0.45, 1],
  [99, 25, 0.6, 0.9],
  [1, 50, 0.5, 1],
  [16, 76, 0.55, 0.9],
  [26, 19, 0.45, 1],
  [39, 50, 0.6, 0.9],
  [48, 90, 0.5, 1],
  [57, 6, 0.65, 0.9],
  [62, 36, 0.45, 1],
  [68, 13, 0.55, 0.9],
  [74, 70, 0.5, 1],
  [79, 25, 0.6, 0.9],
  [86, 52, 0.45, 1],
  [91, 45, 0.55, 0.9],
  [96, 67, 0.6, 1],
  [7, 56, 0.45, 0.9],
  [13, 82, 0.5, 1],
  [23, 66, 0.6, 0.9],
  [30, 51, 0.5, 1],
  [43, 28, 0.55, 0.9],
  [49, 71, 0.65, 1],
  [56, 17, 0.5, 0.9],
  [69, 94, 0.55, 1],
  [75, 41, 0.45, 0.9],
  [80, 61, 0.6, 1],
  [85, 45, 0.5, 0.9],
  [88, 14, 0.65, 1],
  [94, 38, 0.5, 0.9],
  [97, 71, 0.55, 1],
  [3, 25, 0.45, 0.9],
  [11, 58, 0.6, 1],
  [19, 91, 0.5, 0.9],
  [27, 47, 0.55, 1],
  [35, 76, 0.65, 0.9],
  [44, 65, 0.5, 1],
  [53, 36, 0.45, 0.9],
  [61, 50, 0.6, 1],
  [70, 21, 0.55, 0.9],
  [78, 88, 0.5, 1],
  [82, 6, 0.6, 0.9],
  [87, 73, 0.45, 1],
];

const STARS_BY_DENSITY = {
  sparse: SPARSE_STARS,
  medium: MEDIUM_STARS,
  dense: DENSE_STARS,
} as const;

export function Starfield({
  density = 'sparse',
  twinkle = false,
  className,
}: StarfieldProps): JSX.Element {
  const stars = STARS_BY_DENSITY[density];
  return (
    <div
      data-atmosphere="starfield"
      data-density={density}
      data-twinkle={twinkle ? 'true' : 'false'}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden${className ? ` ${className}` : ''}`}
    >
      {stars.map(([x, y, opacity, size], i) => (
        <span
          key={i}
          className={twinkle ? 'motion-safe:animate-atmosphere-twinkle' : ''}
          style={{
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            width: `${size * 2}px`,
            height: `${size * 2}px`,
            borderRadius: '50%',
            backgroundColor: '#f8f8ff',
            opacity,
            // Stagger twinkle so they don't all pulse in unison.
            animationDelay: twinkle ? `${(i % 7) * 0.4}s` : undefined,
          }}
        />
      ))}
    </div>
  );
}
