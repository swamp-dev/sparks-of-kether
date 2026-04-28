'use client';
import { ColorBloom } from '@/components/atmosphere/ColorBloom';

/**
 * Ambient layer for the Blessing Ritual. Wraps the per-route
 * atmosphere primitives (`ColorBloom`) keyed to the active
 * Sefirah's colour so the room shifts hue as the player descends
 * Kether → Malkuth.
 *
 * Decorative — the bloom is `pointer-events-none` and `aria-hidden`,
 * inherited from `ColorBloom`. Paints at the page level (fixed
 * inset-0 -z-10) so it sits behind both the ritual UI and any
 * page-level chrome (header, etc.).
 *
 * Static: no animation, so reduced-motion is honoured implicitly.
 * The Sefirah-to-Sefirah transition is a discrete colour swap.
 */

interface RitualSceneProps {
  /**
   * Active Sefirah colour (hex). Pass `null` after the ritual
   * completes so the scene clears (the route's per-route bloom
   * from `#161` will paint the summary background).
   */
  readonly color: string | null;
  readonly sefirahKey: string | null;
}

export function RitualScene({ color, sefirahKey }: RitualSceneProps): JSX.Element | null {
  if (color === null || sefirahKey === null) return null;
  return (
    <div data-ritual-scene data-active-sefirah={sefirahKey}>
      <ColorBloom color={color} position="center" intensity={0.18} radius={70} />
    </div>
  );
}
