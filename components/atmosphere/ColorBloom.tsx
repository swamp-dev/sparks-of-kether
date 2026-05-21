/**
 * Soft radial-gradient bloom anchored to one of nine board positions.
 * Sits behind page content as a fixed-position layer; aria-hidden,
 * pointer-events-none.
 *
 * Used to lend a Sefirah-keyed warmth to a route that would
 * otherwise be a flat indigo void. e.g. `/play` carries a subtle
 * tiferet bloom from centre, `/demo/ritual` shifts the bloom to
 * track the active Sefirah.
 *
 * Static — no animation. Reduced-motion users see the same render
 * (no movement to suppress).
 */

interface ColorBloomProps {
  /**
   * Bloom colour as a CSS hex string (`#rrggbb`). Consumer typically
   * passes a Sefirah hex from `tailwind.config.ts`. Hex-only because
   * the implementation builds gradient stops via `color-mix(...)`
   * with the raw string — non-hex inputs (rgb(), named colors) work
   * too because `color-mix` is colour-format-agnostic.
   */
  readonly color: string;
  readonly position?:
    | 'top-left'
    | 'top'
    | 'top-right'
    | 'left'
    | 'center'
    | 'right'
    | 'bottom-left'
    | 'bottom'
    | 'bottom-right';
  /** Bloom radius as % of the viewport. Defaults to 60. */
  readonly radius?: number;
  /** Opacity of the inner stop. Defaults to 0.18 — restrained. */
  readonly intensity?: number;
  readonly className?: string;
}

const POSITION_MAP: Record<NonNullable<ColorBloomProps['position']>, string> = {
  'top-left': '15% 15%',
  top: '50% 10%',
  'top-right': '85% 15%',
  left: '15% 50%',
  center: '50% 50%',
  right: '85% 50%',
  'bottom-left': '15% 85%',
  bottom: '50% 90%',
  'bottom-right': '85% 85%',
};

export function ColorBloom({
  color,
  position = 'bottom',
  radius = 60,
  intensity = 0.18,
  className,
}: ColorBloomProps): JSX.Element {
  const center = POSITION_MAP[position];
  // Three-stop gradient: full-intensity colour at the centre, half
  // by mid-radius, transparent at the edge. `color-mix` keeps the
  // gradient colour-format-agnostic — consumers can pass hex,
  // rgb(), or named colours and the alpha lands correctly.
  const inner = mixWithTransparent(color, intensity);
  const middle = mixWithTransparent(color, intensity / 2);
  const background = `radial-gradient(circle ${radius}% at ${center}, ${inner} 0%, ${middle} 35%, transparent 70%)`;
  return (
    <div
      data-atmosphere="color-bloom"
      data-bloom-position={position}
      // Mirror the gradient on a data attribute so tests can assert
      // the colour/position resolved correctly. jsdom's CSS engine
      // discards `background: radial-gradient(...)` when read back,
      // so we cannot rely on `style.background` from a test.
      data-bloom-css={background}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 -z-10${className ? ` ${className}` : ''}`}
      style={{ background }}
    />
  );
}

// `color-mix(in srgb, <color> <alpha%>, transparent)` produces a
// faded version of any CSS colour. Modern-browser CSS (Chrome 111+,
// Firefox 113+, Safari 16.2+) — sufficient for this app's target.
function mixWithTransparent(color: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha));
  const percent = (clamped * 100).toFixed(1);
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}
