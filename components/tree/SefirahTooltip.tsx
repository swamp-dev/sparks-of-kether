import { sefirahByKey } from '@/data';
import type { SefirahKey } from '@/data';
import { SEFIRAH_MEANINGS } from './sefirah-meanings';

/**
 * Hover-tooltip card for a Sefirah node on the Tree of Life (#312).
 *
 * Surfaces, in one compact panel:
 *   - English Sefirah name (display face).
 *   - Hebrew name with `lang="he"` so AT pronounces it correctly and
 *     browser fallback fonts pick the Hebrew face.
 *   - One-line meaning sourced from `reference/sefirot.md` via the
 *     `SEFIRAH_MEANINGS` mirror table.
 *   - Team Sparks count for this Sefirah — how many players currently
 *     hold this Sefirah's spark in `sparksHeld`. Computed by the
 *     parent (`TreeBoard`) so the tooltip stays presentational.
 *
 * Rendered as an HTML overlay rather than SVG so Fraunces (display)
 * and Frank Ruhl Libre (Hebrew) land at proper line-height and
 * weight — none of which is reliably available in SVG `<text>` across
 * browsers.
 *
 * Click-through to `/sefirah/[name]` (Codex pages, #320) is wired by
 * `TreeBoard` (the wrapping link). The tooltip itself is purely
 * presentational, so this component carries no `onClick` and no
 * navigation logic — it just renders the panel content.
 *
 * `role="tooltip"` so AT users see it referenced from the Sefirah
 * node via `aria-describedby`. Without this the hover affordance is
 * purely visual; with it, screen readers read the meaning + Sparks
 * count when the focus lands on the node.
 */
interface SefirahTooltipProps {
  readonly sefirahKey: SefirahKey;
  /** Number of player Sparks currently held for this Sefirah. */
  readonly teamSparks: number;
  readonly className?: string;
  /** Tooltip's accessible id, so the Sefirah node can reference it via `aria-describedby`. */
  readonly id?: string;
}

export function SefirahTooltip({
  sefirahKey,
  teamSparks,
  className,
  id,
}: SefirahTooltipProps): JSX.Element {
  const sefirah = sefirahByKey(sefirahKey);
  const meaning = SEFIRAH_MEANINGS[sefirahKey];
  return (
    <div
      data-sefirah-tooltip={sefirahKey}
      role="tooltip"
      {...(id !== undefined ? { id } : {})}
      className={[
        // Visual frame: dark indigo card with veil text, faint
        // Sefirah-coloured top accent. `pointer-events-none` so the
        // tooltip itself never steals clicks from the underlying
        // node — the parent `<a>` owns navigation.
        'pointer-events-none flex flex-col gap-1 rounded-md border border-veil/25 bg-ground/95 px-3 py-2 text-veil shadow-lg',
        'min-w-[10rem] max-w-[14rem] text-xs leading-snug',
        className ?? '',
      ].join(' ')}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-sm tracking-wide" data-tooltip-name>
          {sefirah.englishName}
        </span>
        <span lang="he" className="font-hebrew text-sm opacity-90" data-tooltip-hebrew>
          {sefirah.hebrewName}
        </span>
      </div>
      <p className="italic opacity-80" data-tooltip-meaning>
        {meaning}
      </p>
      <p className="opacity-70" data-tooltip-sparks>
        {/*
          Team Sparks count: how many players currently hold this
          Sefirah's spark. Plural-aware (1 spark / N sparks) so the
          copy reads cleanly at every count.
        */}
        {teamSparks === 1 ? '1 spark held' : `${teamSparks} sparks held`}
      </p>
    </div>
  );
}
