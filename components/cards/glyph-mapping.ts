import type { GlyphName } from './glyphs';

/**
 * Per-Arcanum glyph composition.
 *
 * Each card gets 1–3 glyphs from the shared vocabulary in `glyphs.tsx`.
 * The choice for each card is documented in a comment — the symbolism
 * is loose by design (these are keys to a feeling, not pictograms),
 * but the mapping is fixed at build time so visuals are consistent.
 *
 * Coordinates here are in the card's "glyph zone" — a 200×106 box in
 * the middle third of the card. (0,0) is top-left of the zone,
 * (200,106) is bottom-right. Sizes are full extents (not radii).
 */

export interface GlyphPlacement {
  readonly glyph: GlyphName;
  readonly cx: number;
  readonly cy: number;
  readonly size: number;
  /** 5/6/8 only; default 8. Used by `star` glyph. */
  readonly points?: number;
  /** Degrees; default 0. Used by `star` to invert (e.g. Devil pentagram). */
  readonly rotation?: number;
  /** 0–1; defaults to 1. */
  readonly opacity?: number;
}

/**
 * Index by arcanum number (0..21). Order matters — readers can scan
 * the file top-to-bottom and follow the deck.
 */
export const ARCANUM_GLYPHS: Readonly<Record<number, readonly GlyphPlacement[]>> = {
  // 0 — The Fool. The leap. A single point poised above an upward-
  // pointing triangle (air, aspiration). Innocence about to take flight.
  0: [
    { glyph: 'triangle', cx: 100, cy: 60, size: 60 },
    { glyph: 'circle', cx: 100, cy: 18, size: 8 },
  ],
  // 1 — The Magician. Vesica (the lens through which form emerges)
  // bisected by a cross (axis: as above, so below).
  1: [
    { glyph: 'vesica', cx: 100, cy: 50, size: 56 },
    { glyph: 'cross', cx: 100, cy: 50, size: 70 },
  ],
  // 2 — The High Priestess. Crescent moon over a vesica — the veil
  // between waking and dream.
  2: [
    { glyph: 'crescent', cx: 100, cy: 32, size: 36 },
    { glyph: 'vesica', cx: 100, cy: 70, size: 40 },
  ],
  // 3 — The Empress. Circle (Venus, abundance) above a triangle
  // (manifestation, growth from earth).
  3: [
    { glyph: 'circle', cx: 100, cy: 30, size: 40 },
    { glyph: 'triangle', cx: 100, cy: 72, size: 36 },
  ],
  // 4 — The Emperor. Square (form, order) crowned.
  4: [
    { glyph: 'square', cx: 100, cy: 60, size: 50 },
    { glyph: 'crown', cx: 100, cy: 22, size: 36 },
  ],
  // 5 — The Hierophant. Triangle (transmission, ascent) bridged by a
  // horizontal cross-bar (continuity across generations).
  5: [
    { glyph: 'triangle', cx: 100, cy: 55, size: 56 },
    { glyph: 'cross', cx: 100, cy: 35, size: 36, opacity: 0.7 },
  ],
  // 6 — The Lovers. Vesica again, but here it is the meeting of two
  // distinct circles — choice as union of opposites.
  6: [{ glyph: 'vesica', cx: 100, cy: 50, size: 56 }],
  // 7 — The Chariot. Crescent (lunar emotion) yoked above a square
  // (worldly form). Will yoking opposites.
  7: [
    { glyph: 'crescent', cx: 100, cy: 28, size: 32 },
    { glyph: 'square', cx: 100, cy: 68, size: 36 },
  ],
  // 8 — Strength. Hexagram — fire over water, the gentle taming of
  // primal force.
  8: [{ glyph: 'hexagram', cx: 100, cy: 50, size: 56 }],
  // 9 — The Hermit. A six-pointed star (lamp) raised above the path.
  9: [{ glyph: 'star', cx: 100, cy: 50, size: 56, points: 6 }],
  // 10 — Wheel of Fortune. Wheel with four spokes plus diagonals.
  10: [{ glyph: 'wheel', cx: 100, cy: 50, size: 60 }],
  // 11 — Justice. Scales — the visible weighing.
  11: [{ glyph: 'scales', cx: 100, cy: 36, size: 60 }],
  // 12 — The Hanged Man. Inverted triangle (water, surrender) crossed
  // by a horizontal axis (the new perspective).
  12: [
    { glyph: 'invertedTriangle', cx: 100, cy: 50, size: 56 },
    { glyph: 'cross', cx: 100, cy: 50, size: 70, opacity: 0.5 },
  ],
  // 13 — Death. Spiral — transformation as turning, not ending.
  13: [{ glyph: 'spiral', cx: 100, cy: 50, size: 64 }],
  // 14 — Temperance. Hexagram again (alchemical conjunction) but
  // smaller, with a circle of containment.
  14: [
    { glyph: 'circle', cx: 100, cy: 50, size: 70, opacity: 0.5 },
    { glyph: 'hexagram', cx: 100, cy: 50, size: 44 },
  ],
  // 15 — The Devil. Inverted pentagram (point-down) — the microcosm
  // flipped, matter over spirit, the chains we forget we can remove.
  15: [{ glyph: 'star', cx: 100, cy: 50, size: 56, points: 5, rotation: 180 }],
  // 16 — The Tower. Lightning splitting a square (the structure
  // breaking open).
  16: [
    { glyph: 'square', cx: 100, cy: 55, size: 52 },
    { glyph: 'lightning', cx: 100, cy: 50, size: 64 },
  ],
  // 17 — The Star. Eight-pointed star — hope, navigation by light.
  17: [{ glyph: 'star', cx: 100, cy: 50, size: 60, points: 8 }],
  // 18 — The Moon. Crescent over wave — illusion, tides of the
  // unconscious.
  18: [
    { glyph: 'crescent', cx: 100, cy: 32, size: 40 },
    { glyph: 'wave', cx: 100, cy: 72, size: 80 },
  ],
  // 19 — The Sun. Sun glyph — clarity, joy.
  19: [{ glyph: 'sun', cx: 100, cy: 50, size: 64 }],
  // 20 — Judgement. Triangle (fire, awakening) struck by lightning.
  20: [
    { glyph: 'triangle', cx: 100, cy: 55, size: 56 },
    { glyph: 'lightning', cx: 100, cy: 50, size: 64 },
  ],
  // 21 — The World. Square within circle — completion, integration of
  // form and spirit.
  21: [
    { glyph: 'circle', cx: 100, cy: 50, size: 70 },
    { glyph: 'square', cx: 100, cy: 50, size: 40 },
  ],
};
