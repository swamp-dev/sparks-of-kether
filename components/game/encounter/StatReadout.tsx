import type { StatKey } from '@/data';
import { StatIcon } from '@/components/icons/StatIcon';

/**
 * Dramatized stat readout for the EncounterScreen (#315). Replaces
 * the old `[Strength 12]` pill with a stat icon at large size, a
 * subtle breath halo, and the number rendered in display face. The
 * projected total animates into view via `ease-emerge` when
 * allies/burns are staged — `transitionTimingFunction.emerge` per
 * `docs/motion.md`.
 *
 * Visual hierarchy: stat icon (large, with halo) → label (small) →
 * stat number (display face, prominent) → projected-total readout
 * (smaller, tabular).
 *
 * Out of scope: per-stat colour theming. The readout follows the
 * encounter's Sefirah colour for breath halo (passed in via
 * `glowClass`) so the stat block reads as part of the same dramatic
 * frame.
 */

interface StatReadoutProps {
  readonly stat: StatKey;
  readonly statLabel: string;
  readonly statValue: number;
  /** Pre-d20 projected total = stat + assists + burns. */
  readonly projectedTotal: number;
  readonly effectiveDC: number;
  /** Sefirah-coloured glow class (e.g. `shadow-glow-gevurah`) for the icon halo. */
  readonly glowClass: string;
}

export function StatReadout({
  stat,
  statLabel,
  statValue,
  projectedTotal,
  effectiveDC,
  glowClass,
}: StatReadoutProps): JSX.Element {
  return (
    <div
      data-stat-readout
      className="flex items-center gap-4 rounded border border-veil/15 bg-veil/5 px-4 py-3"
    >
      <div
        // The icon halo is opt-in to motion (only animates under
        // `motion-safe:`) and uses `transition-shadow` so future
        // states (e.g. an ally addition pulse) can layer in without
        // the breath cycle interfering. Currently static breath only.
        className={`flex h-10 w-10 items-center justify-center rounded-full transition-shadow duration-700 ease-emerge ${glowClass} motion-safe:animate-breath`}
        data-stat-readout-halo
      >
        <StatIcon stat={stat} className="h-7 w-7" />
      </div>
      <div className="flex flex-1 flex-col">
        <span className="text-xs uppercase tracking-widest opacity-60">
          {statLabel}
        </span>
        <span
          // The stat number is the dramatic readout — display face,
          // tabular nums so the digits don't dance under projected-
          // total animation.
          data-stat-readout-value
          className="font-display text-3xl tabular-nums leading-none"
        >
          {statValue}
        </span>
      </div>
      <div
        className="flex flex-col items-end text-right"
        data-stat-readout-projected
      >
        <span className="text-[10px] uppercase tracking-widest opacity-50">
          Projected
        </span>
        <span
          // `transition-all duration-300 ease-emerge` so the total
          // animates upward when the player stages allies/burns —
          // the eye reads the upward count as "stat is rising
          // toward the DC". `ease-emerge` is the right curve per
          // docs/motion.md (the new total "arrives", it doesn't
          // continuously flow).
          className="font-display text-lg tabular-nums transition-all duration-300 ease-emerge"
          data-projected-total
        >
          {projectedTotal} vs DC {effectiveDC}
        </span>
      </div>
    </div>
  );
}
