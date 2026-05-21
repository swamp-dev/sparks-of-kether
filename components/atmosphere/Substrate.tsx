/**
 * Full-viewport atmospheric substrate. Three layers, all decorative,
 * stacked in a single fixed-position container that sits behind every
 * other atmosphere layer (Starfield, ColorBloom, GlyphWash):
 *
 *   1. Deep-indigo void (token: `bg-void`, `#0b0a1f`).
 *   2. Subtle Tiferet-gold radial-gradient bloom (~6% alpha) — gives
 *      the page a centred warmth so the substrate doesn't read as a
 *      flat black wall.
 *   3. Procedural SVG-noise grain overlay at very low opacity, mixed
 *      with `screen` so it brightens midtones rather than darkening
 *      shadows.
 *
 * The component is `aria-hidden`, `pointer-events-none`, and
 * `-z-20` (one layer deeper than `Starfield` at `-z-10`). Routes opt
 * out by not rendering it; in practice it lives once at
 * `app/layout.tsx` so every route gets it for free.
 *
 * Static — no animation. Reduced-motion users see the same render.
 *
 * Per ticket #311: NO `filter: blur` on the substrate. Blur is
 * extremely expensive on mobile; the bloom achieves softness via
 * gradient stops alone. See `docs/motion.md` for the rationale.
 */

interface SubstrateProps {
  readonly className?: string;
}

// The bloom: tiferet gold (#ffd700) at 6% alpha at the centre,
// decaying to transparent. `color-mix` keeps the gradient
// colour-format-agnostic and matches the convention used in
// `ColorBloom.tsx`.
//
// Sizing note: per CSS Images Level 3, `circle` accepts only a
// `<length>` radius (or a sizing keyword like `farthest-corner`);
// `circle <percentage>` is invalid CSS and silently drops the entire
// gradient declaration in every browser. Use `<length>` units (or
// the `ellipse <pct> <pct>` form). 70vmin gives a ~70%-of-shorter-axis
// radius — visually equivalent to the originally-intended sizing,
// stable across portrait + landscape viewports.
const BLOOM_COLOR = '#ffd700';
const BLOOM_INTENSITY = 0.06; // ~6% alpha per ticket
const BLOOM_INTENSITY_PCT = (BLOOM_INTENSITY * 100).toFixed(1);
const BLOOM_HALF_INTENSITY_PCT = ((BLOOM_INTENSITY / 2) * 100).toFixed(1);
const BLOOM_GRADIENT = `radial-gradient(circle 70vmin at 50% 30%, color-mix(in srgb, ${BLOOM_COLOR} ${BLOOM_INTENSITY_PCT}%, transparent) 0%, color-mix(in srgb, ${BLOOM_COLOR} ${BLOOM_HALF_INTENSITY_PCT}%, transparent) 35%, transparent 70%)`;

// Inline SVG-turbulence noise as a data: URL. Avoids shipping a
// separate static asset and keeps the substrate self-contained.
// `baseFrequency=0.9` produces fine-grained pixel-sized noise;
// `numOctaves=2` keeps the cost low. The SVG renders at 200×200
// CSS pixels and tiles via `background-repeat`.
const NOISE_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>
  <filter id='n'>
    <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>
    <feColorMatrix values='0 0 0 0 0.95
                           0 0 0 0 0.95
                           0 0 0 0 1
                           0 0 0 0.5 0'/>
  </filter>
  <rect width='100%' height='100%' filter='url(#n)'/>
</svg>`;
const NOISE_DATA_URL = `url("data:image/svg+xml;utf8,${encodeURIComponent(NOISE_SVG)}")`;

const GRAIN_OPACITY = 0.05; // very low — texture, not pattern
const GRAIN_BLEND_MODE = 'screen' as const;

export function Substrate({ className }: SubstrateProps): JSX.Element {
  return (
    <div
      data-atmosphere="substrate"
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 -z-20 overflow-hidden${className ? ` ${className}` : ''}`}
    >
      {/* Layer 1: indigo void. The body itself paints this colour
          (see app/globals.css), but rendering it explicitly inside
          the substrate keeps the layer self-describing for tests
          and for routes that want to suppress / replace it. */}
      <div data-substrate-layer="void" className="absolute inset-0 bg-void" />

      {/* Layer 2: Tiferet-gold radial bloom. */}
      <div
        data-substrate-layer="bloom"
        // Mirror the gradient on a data attribute so tests can assert
        // the colour/position resolved correctly. Same pattern as
        // ColorBloom.tsx.
        data-bloom-css={BLOOM_GRADIENT}
        className="absolute inset-0"
        style={{ background: BLOOM_GRADIENT }}
      />

      {/* Layer 3: grain. `mix-blend-mode: screen` brightens the
          midtones (so the noise reads as a warm dust rather than
          pepper). Opacity is intentionally very low — texture, not
          pattern. */}
      <div
        data-substrate-layer="grain"
        data-blend-mode={GRAIN_BLEND_MODE}
        className="absolute inset-0"
        style={{
          backgroundImage: NOISE_DATA_URL,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px',
          opacity: GRAIN_OPACITY,
          mixBlendMode: GRAIN_BLEND_MODE,
        }}
      />
    </div>
  );
}
