import { sefirot } from '@/data';
import type { SefirahKey } from '@/data';
import type { ShellStateMap, ShellStatus } from '@/engine/types';
import { ShellIcon } from '@/components/tokens/ShellIcon';
import { SHELL_COPY } from './shell-copy';

/**
 * Visualizes the team's Shell pressure. One slot per Sefirah, ordered
 * by the canonical traditional numbering (Kether → Malkuth) so the
 * panel reads like a stat sheet of the Tree's shadow.
 *
 * Slot states:
 *   - dormant: low-opacity placeholder; the Shell hasn't woken up.
 *   - active: full glyph + effect copy reachable on hover/focus.
 *   - banished: struck-through; this Shell is past tense.
 *
 * The effect copy is shown in a tooltip-style panel that's reachable
 * by both mouse hover and keyboard focus (each slot is a `<button>`
 * with the active effect text in the title attribute and as
 * `aria-describedby` content).
 *
 * Naming rule (per `design/shells.md`): copy never uses traditional
 * Kabbalistic demonology names. Descriptive only.
 */

interface ShellPanelProps {
  readonly shells: ShellStateMap;
  /**
   * Heading level to use for the panel title. Defaults to 3 (the
   * common case where the panel sits two levels into the document
   * hierarchy). Pass an explicit level when the panel is embedded
   * higher or lower in the page so screen readers don't see a
   * heading-order skip.
   */
  readonly headingLevel?: 2 | 3 | 4 | 5 | 6;
  readonly className?: string;
}

export function ShellPanel({
  shells,
  headingLevel = 3,
  className,
}: ShellPanelProps): JSX.Element {
  // Use a level-driven heading element rather than a hardcoded <h3>
  // so the panel slots into the caller's existing heading hierarchy
  // without a skip.
  const Heading = (`h${headingLevel}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6');
  return (
    <section
      aria-label="Shell pressure panel"
      data-shell-panel
      className={className}
    >
      <Heading className="mb-3 font-display text-lg tracking-widest">Shells</Heading>
      <ul className="grid grid-cols-5 gap-3 sm:grid-cols-10">
        {sefirot.map((sefirah) => (
          <li key={sefirah.key}>
            <ShellSlot
              sefirah={sefirah.key}
              status={shells[sefirah.key]}
              keyword={sefirah.shellKeyword}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

interface ShellSlotProps {
  readonly sefirah: SefirahKey;
  readonly status: ShellStatus;
  readonly keyword: string;
}

function ShellSlot({ sefirah, status, keyword }: ShellSlotProps): JSX.Element {
  const copy = SHELL_COPY[sefirah];
  // Compose the full announcement into a single aria-label on the
  // slot's focusable group. AT users tab through the panel and hear
  // title + effect + status on focus — no fragile aria-describedby
  // wiring needed.
  const ariaLabel = `${copy.title}. ${copy.effect}. Status: ${status}.`;
  // Compute opacity once so a banished slot doesn't fight two
  // conflicting Tailwind utilities in the same className string.
  const keywordOpacity = status === 'banished' ? 'opacity-40' : 'opacity-70';
  return (
    <div
      data-shell-slot={sefirah}
      data-status={status}
      role="group"
      tabIndex={0}
      aria-label={ariaLabel}
      className="flex flex-col items-center gap-1 rounded outline-none focus-visible:ring-1 focus-visible:ring-illumination"
    >
      <ShellIcon
        sefirah={sefirah}
        status={status}
        className="h-10 w-10"
      />
      <span
        data-shell-keyword
        className={`text-[10px] uppercase tracking-widest ${keywordOpacity} ${
          status === 'banished' ? 'line-through' : ''
        }`}
        aria-hidden="true"
      >
        {keyword}
      </span>
      {/* On active slots, render the effect copy inline below the
          glyph for the panel-as-readable-summary view. Dormant and
          banished slots stay terse. */}
      {status === 'active' ? (
        <p
          data-shell-effect={sefirah}
          aria-hidden="true"
          className="mt-1 max-w-[14ch] text-center text-[10px] leading-tight opacity-80"
        >
          {copy.effect}
        </p>
      ) : null}
    </div>
  );
}
