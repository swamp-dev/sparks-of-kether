import type { ZodiacSignKey } from './types';

/**
 * Per-sign asterism geometry for the sign picker (#314).
 *
 * Each entry carries:
 *   - `stars` — list of points in normalised [0..1] space. `0,0` is
 *     top-left of the SVG viewBox; `1,1` is bottom-right. The picker
 *     scales these to the rendered viewBox at draw time.
 *   - `edges` — pairs of indices into `stars` describing the line-art
 *     of the canonical asterism. Each edge is rendered as a faint line.
 *
 * The shapes are stylised line-art, not astronomical-grade plots —
 * the goal is "evocative + recognisable", not "matches Stellarium at
 * civil twilight". We keep the star count low (3..7) per sign so the
 * rendered art reads at a glance behind the foreground glyph.
 *
 * The data tests in `__tests__/zodiac-constellations.test.ts` pin
 * the integrity invariants (every sign keyed; coordinates inside the
 * unit square; edges reference valid star indices; no self-loops).
 *
 * Why hand-tuned rather than from a star catalogue: the picker draws
 * the asterism as faint background art. A literal RA/Dec projection
 * tends to flatten the recognisable shapes (Leo's "sickle", Scorpius's
 * tail, Cassiopeia-style W of Aquarius) once you scale them into a
 * portrait-orientation viewBox. The hand-tuned coordinates trade
 * astronomical accuracy for shape-legibility.
 */

interface ConstellationEntry {
  /** Stars in normalised [0..1] space; `0,0` top-left, `1,1` bottom-right. */
  readonly stars: ReadonlyArray<{ readonly x: number; readonly y: number }>;
  /** Edges of the asterism, each `[fromIdx, toIdx]` indexing into `stars`. */
  readonly edges: ReadonlyArray<readonly [number, number]>;
}

export const ZODIAC_CONSTELLATIONS: Readonly<
  Record<ZodiacSignKey, ConstellationEntry>
> = {
  // Aries — the "ram's horn" curve. Three principal stars: Hamal,
  // Sheratan, Mesarthim. Two edges form a bent line.
  aries: {
    stars: [
      { x: 0.22, y: 0.62 }, // Mesarthim
      { x: 0.42, y: 0.5 }, // Sheratan
      { x: 0.7, y: 0.32 }, // Hamal
    ],
    edges: [
      [0, 1],
      [1, 2],
    ],
  },

  // Taurus — the V-shape of the Hyades plus the Pleiades (compressed
  // to a single bright cluster). Aldebaran is the eye.
  taurus: {
    stars: [
      { x: 0.18, y: 0.28 }, // Pleiades cluster (collapsed to one point)
      { x: 0.4, y: 0.42 }, // Tauri ε
      { x: 0.5, y: 0.55 }, // Aldebaran (the eye)
      { x: 0.72, y: 0.58 }, // Tauri γ
      { x: 0.82, y: 0.78 }, // El Nath (horn tip)
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },

  // Gemini — the "twins" Castor and Pollux with the bodies extending
  // down into Alhena.
  gemini: {
    stars: [
      { x: 0.32, y: 0.18 }, // Castor
      { x: 0.48, y: 0.22 }, // Pollux
      { x: 0.36, y: 0.5 }, // body / waist
      { x: 0.54, y: 0.55 }, // body / waist
      { x: 0.45, y: 0.78 }, // Alhena (foot)
    ],
    edges: [
      [0, 2],
      [1, 3],
      [2, 4],
      [3, 4],
      [0, 1],
    ],
  },

  // Cancer — the "manger" with two donkey-stars (Asellus Borealis +
  // Australis) and a small four-pointed cross.
  cancer: {
    stars: [
      { x: 0.5, y: 0.22 }, // top (ι Cnc)
      { x: 0.32, y: 0.5 }, // left (γ Cnc Asellus Borealis)
      { x: 0.68, y: 0.5 }, // right (δ Cnc Asellus Australis)
      { x: 0.42, y: 0.78 }, // bottom-left (β Cnc)
      { x: 0.6, y: 0.82 }, // bottom-right (α Cnc Acubens)
    ],
    edges: [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 4],
    ],
  },

  // Leo — the "sickle" (head + mane) plus the body line down to
  // Denebola. Regulus at the heart.
  leo: {
    stars: [
      { x: 0.18, y: 0.28 }, // top of sickle (ε Leo)
      { x: 0.28, y: 0.38 }, // mid-sickle
      { x: 0.34, y: 0.55 }, // Regulus (heart)
      { x: 0.55, y: 0.62 }, // body
      { x: 0.78, y: 0.5 }, // hindquarters
      { x: 0.88, y: 0.3 }, // Denebola (tail tip)
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
    ],
  },

  // Virgo — the "maiden" laid out diagonally with Spica at the foot.
  virgo: {
    stars: [
      { x: 0.18, y: 0.22 }, // head (ε Vir)
      { x: 0.32, y: 0.4 }, // shoulder
      { x: 0.5, y: 0.5 }, // chest
      { x: 0.42, y: 0.66 }, // hip
      { x: 0.66, y: 0.7 }, // knee
      { x: 0.62, y: 0.88 }, // Spica (foot)
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
    ],
  },

  // Libra — the "scales", a classic four-star quadrilateral.
  libra: {
    stars: [
      { x: 0.34, y: 0.3 }, // beam-left (Zubenelgenubi)
      { x: 0.66, y: 0.3 }, // beam-right (Zubeneschamali)
      { x: 0.22, y: 0.7 }, // pan-left
      { x: 0.78, y: 0.7 }, // pan-right
    ],
    edges: [
      [0, 1],
      [0, 2],
      [1, 3],
    ],
  },

  // Scorpio — the "scorpion": claws, body curve, tail, sting. Antares
  // at the heart.
  scorpio: {
    stars: [
      { x: 0.2, y: 0.22 }, // claw (β Sco)
      { x: 0.34, y: 0.34 }, // claw join
      { x: 0.46, y: 0.46 }, // Antares (heart)
      { x: 0.52, y: 0.62 }, // body
      { x: 0.62, y: 0.74 }, // tail-1
      { x: 0.78, y: 0.78 }, // tail-2
      { x: 0.88, y: 0.62 }, // Shaula (sting)
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
    ],
  },

  // Sagittarius — the "teapot" asterism (the most legible part of
  // Sagittarius for the modern reader).
  sagittarius: {
    stars: [
      { x: 0.2, y: 0.32 }, // lid
      { x: 0.36, y: 0.5 }, // top-left
      { x: 0.62, y: 0.5 }, // top-right (handle root)
      { x: 0.84, y: 0.62 }, // handle tip
      { x: 0.32, y: 0.78 }, // bottom-left
      { x: 0.66, y: 0.78 }, // bottom-right (spout root)
      { x: 0.84, y: 0.86 }, // spout tip
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [1, 4],
      [2, 5],
      [4, 5],
      [5, 6],
    ],
  },

  // Capricorn — the "sea-goat" triangle with a long tail.
  capricorn: {
    stars: [
      { x: 0.2, y: 0.32 }, // head (Algedi α Cap)
      { x: 0.32, y: 0.28 }, // head pair (Dabih β Cap)
      { x: 0.6, y: 0.62 }, // body
      { x: 0.82, y: 0.4 }, // back
      { x: 0.78, y: 0.78 }, // tail (δ Cap Deneb Algedi)
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [2, 4],
      [3, 4],
    ],
  },

  // Aquarius — water-bearer's "Y" shape: top-bowl + downward stream.
  aquarius: {
    stars: [
      { x: 0.32, y: 0.22 }, // top-left
      { x: 0.52, y: 0.18 }, // top-mid (Sadalmelik)
      { x: 0.72, y: 0.28 }, // top-right
      { x: 0.5, y: 0.45 }, // junction
      { x: 0.4, y: 0.7 }, // stream-1
      { x: 0.62, y: 0.85 }, // stream-2
    ],
    edges: [
      [0, 1],
      [1, 2],
      [1, 3],
      [3, 4],
      [3, 5],
    ],
  },

  // Pisces — the "two fish" tied by Alrescha; a long V-shape with
  // two fish-loops at the ends, simplified.
  pisces: {
    stars: [
      { x: 0.18, y: 0.32 }, // fish-1 head
      { x: 0.34, y: 0.5 }, // fish-1 join
      { x: 0.5, y: 0.62 }, // Alrescha (knot)
      { x: 0.7, y: 0.55 }, // fish-2 join
      { x: 0.82, y: 0.32 }, // fish-2 head
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
};
