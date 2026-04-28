/**
 * Structural colour token constants for SVG components.
 *
 * Tailwind exposes `bg-ground` / `text-veil` / etc as CSS classes,
 * but SVG presentation attributes (`fill`, `stroke`, gradient
 * `stopColor`) take colour literals, not classes. Centralise the
 * literals here so a single source of truth feeds both the
 * `tailwind.config.ts` token table and the SVG layer.
 *
 * If a value here changes, the matching `tailwind.config.ts` entry
 * MUST change in the same commit (and vice-versa). The colocation
 * comments document the dependency.
 *
 * Per-Sefirah colours are in `data/sefirot.ts`. This file owns the
 * structural / chrome tokens only.
 */

/** Deep-indigo app background. Mirrors `tailwind.config.ts:ground`. */
export const GROUND = '#0e0a1f';

/** Off-white text on indigo. Mirrors `tailwind.config.ts:veil`. */
export const VEIL = '#f8f8ff';

/**
 * Tiferet gold — used as the highlight accent across the project
 * (illumination meter, valid path stroke, primary CTA button,
 * focus rings). Mirrors `tailwind.config.ts:tiferet` (and its
 * aliases `illumination`, `pillar-balance`).
 */
export const TIFERET_GOLD = '#ffd700';
