/**
 * Faint Hebrew-letter wash anchored to one half of the viewport.
 * Decorative; aria-hidden, pointer-events-none. The letters are pulled
 * from the path's Hebrew assignments and rendered at very low opacity
 * so they read as texture rather than text.
 *
 * Routes pick a single anchor letter (e.g. `/demo/ritual` uses the
 * active Sefirah's letter). The component scatters subtle copies
 * around the anchor, decreasing in size and opacity outward.
 *
 * Static — no animation.
 */

interface GlyphWashProps {
  /**
   * Hebrew letter (single character) to wash. Pass any UTF-8
   * Hebrew glyph; component does not validate.
   */
  readonly letter: string;
  /** Anchor side. Default 'right'. */
  readonly side?: 'left' | 'right';
  /** Tint colour for the letters. Default veil at low opacity. */
  readonly color?: string;
  readonly className?: string;
}

// Pre-computed positions for the wash. Anchor is the largest;
// subsequent entries scatter outward at decreasing size/opacity.
// Coordinates are % of viewport. `side` flips x for the left anchor.
const WASH_POSITIONS: readonly {
  x: number;
  y: number;
  size: number;
  opacity: number;
}[] = [
  { x: 80, y: 50, size: 28, opacity: 0.08 }, // anchor — biggest, lowest
  { x: 65, y: 30, size: 16, opacity: 0.06 },
  { x: 92, y: 25, size: 14, opacity: 0.05 },
  { x: 60, y: 65, size: 12, opacity: 0.04 },
  { x: 88, y: 75, size: 18, opacity: 0.06 },
  { x: 72, y: 85, size: 10, opacity: 0.04 },
  { x: 95, y: 50, size: 11, opacity: 0.03 },
];

export function GlyphWash({
  letter,
  side = 'right',
  color = '#f8f8ff',
  className,
}: GlyphWashProps): JSX.Element {
  return (
    <div
      data-atmosphere="glyph-wash"
      data-wash-side={side}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden${className ? ` ${className}` : ''}`}
    >
      {WASH_POSITIONS.map((p, i) => (
        <span
          key={i}
          className="font-hebrew"
          style={{
            position: 'absolute',
            left: `${side === 'left' ? 100 - p.x : p.x}%`,
            top: `${p.y}%`,
            transform: 'translate(-50%, -50%)',
            fontSize: `${p.size}vw`,
            color,
            opacity: p.opacity,
            userSelect: 'none',
          }}
        >
          {letter}
        </span>
      ))}
    </div>
  );
}
