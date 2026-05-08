/**
 * `#rrggbb` → `"r, g, b"` — strict shape. Feeds `rgba()` stacks (e.g.
 * the per-row glow in `Lobby.tsx`, mirroring `tailwind.config.ts`'s
 * `shadow-glow-{key}` recipe of three stacked shadows at 8 / 18 / 36 px).
 *
 * Anything other than strict `#rrggbb` (3-digit shorthand, `rgb(...)`,
 * CSS color names) used to silently produce `rgba(NaN, NaN, NaN, …)` —
 * browsers ignore that and the glow vanishes with no error. Throws at
 * call time so a future palette change surfaces the break loudly.
 */
const HEX_RRGGBB_RE = /^#[0-9a-fA-F]{6}$/;

export function hexToRgbTriplet(hex: string): string {
  if (!HEX_RRGGBB_RE.test(hex)) {
    throw new Error(`hexToRgbTriplet: expected #rrggbb, got ${JSON.stringify(hex)}`);
  }
  const c = hex.slice(1);
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}
