'use client';
import { useEffect, useRef } from 'react';
import { sefirot, sefirahByKey } from '@/data';
import type { SefirahKey } from '@/data';
import type { ShellStateMap, ShellStatus } from '@/engine/types';
import { ShellIcon } from '@/components/tokens/ShellIcon';
import { SHELL_COPY } from './shell-copy';

/**
 * Visualises the team's Shell pressure. One slot per Sefirah,
 * ordered by the canonical traditional numbering (Kether → Malkuth)
 * so the panel reads like a stat sheet of the Tree's shadow.
 *
 * Slot states (per `design/shells.md` and #317):
 *   - `dormant`  — faded hairline ring in the Sefirah's colour, slow
 *                  ~30 s rotation. The Shell hasn't bloomed.
 *   - `active`   — full-opacity ring + filled letter in the Sefirah's
 *                  colour, paired with a coloured halo and a slow
 *                  ~8 s wobble. Descriptive effect copy renders
 *                  inline below the seal in the Sefirah's colour.
 *   - `banished` — gold engraved hairline ring, diagonal wax-seal
 *                  binding line, neutral-grey letter. A small
 *                  "Banished at <Sefirah>" caption renders below.
 *
 * Two modes:
 *   - panel mode (default) — ten slots in a 5-up grid (2 rows) with
 *     full effect copy on active slots, ideal for the side aside on
 *     `PlayScreen`. Five columns hold the keyword labels (FRAGMENTATION,
 *     STAGNATION, etc.) without horizontal collision (fixed in #383).
 *   - `compact` mode — single-row strip with size hierarchy
 *     (dormant 50 %, active 100 %, banished 75 %) so the strip stays
 *     scannable mid-game. No inline effect copy in compact mode;
 *     the focus group's `aria-label` carries the full description
 *     for assistive tech.
 *
 * All animation utilities are authored under the `motion-safe:`
 * variant so reduced-motion users see the static seals.
 *
 * Sound hooks: `onShellAwakened` and `onShellBanished` fire once per
 * transition (dormant → active and {dormant,active} → banished
 * respectively). Default to no-ops; the audio system (#321) wires
 * these up later.
 *
 * Naming rule (`design/shells.md`): copy never uses traditional
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
  /**
   * `compact` switches to a single-row strip with size hierarchy
   * (dormant smaller, active full, banished medium). Effect copy
   * is suppressed in this mode — the strip is for scanning, not
   * reading.
   */
  readonly compact?: boolean;
  /**
   * Fires once when a Shell transitions dormant → active. Wired
   * by the audio system (#321); defaults to a no-op so callers can
   * omit it until then.
   */
  readonly onShellAwakened?: (sefirah: SefirahKey) => void;
  /**
   * Fires once when a Shell transitions to banished from any other
   * state (active or dormant — the latter is the stillborn case
   * from `design/shells.md`).
   */
  readonly onShellBanished?: (sefirah: SefirahKey) => void;
  readonly className?: string;
}

export function ShellPanel({
  shells,
  headingLevel = 3,
  compact = false,
  onShellAwakened,
  onShellBanished,
  className,
}: ShellPanelProps): JSX.Element {
  // ── Transition hooks ────────────────────────────────────────────
  // Track the previous state map so we can fire onShellAwakened /
  // onShellBanished once per transition. We compare deeply by
  // Sefirah key — the engine returns a fresh map reference on every
  // event, so a shallow ref check would miss the same-keys-different-
  // ref case.
  const prevShellsRef = useRef<ShellStateMap | null>(null);
  useEffect(() => {
    const prev = prevShellsRef.current;
    if (prev !== null) {
      for (const s of sefirot) {
        const before = prev[s.key];
        const after = shells[s.key];
        if (before === after) continue;
        if (after === 'active' && before === 'dormant') {
          onShellAwakened?.(s.key);
        } else if (after === 'banished' && before !== 'banished') {
          // Both active → banished AND dormant → banished count as
          // a banishment. The stillborn case (dormant → banished)
          // is documented in design/shells.md: a Shell whose
          // Sefirah is already cleared at the moment it would have
          // woken goes straight to banished.
          onShellBanished?.(s.key);
        }
      }
    }
    prevShellsRef.current = shells;
  }, [shells, onShellAwakened, onShellBanished]);

  const Heading = (`h${headingLevel}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6');
  const listLayout = compact ? 'compact' : 'panel';
  const listClass = compact
    ? 'flex flex-row flex-wrap items-end justify-center gap-2'
    : // #383: stay at 5 columns × 2 rows on every breakpoint. The
      // previous `sm:grid-cols-10` collapsed to a single row at sm:
      // and up, but in the live PlayScreen the panel sits in a fixed
      // 400 px aside — at 10 columns each cell was ~36 px, and the
      // 8–13-character uppercase keywords (FRAGMENTATION, STAGNATION,
      // …) overflowed and ran together. Two rows of 5 reads cleanly
      // at every panel surface (the demo page and the PlayScreen
      // sidebar both have ample horizontal room for a 5-up grid).
      'grid grid-cols-5 gap-3';
  return (
    <section
      aria-label="Shell pressure panel"
      data-shell-panel
      data-shell-mode={compact ? 'compact' : 'panel'}
      className={className}
    >
      <Heading className="mb-3 font-display text-lg tracking-widest">
        Shells
      </Heading>
      <ul data-shell-layout={listLayout} className={listClass}>
        {sefirot.map((sefirah) => (
          <li key={sefirah.key}>
            <ShellSlot
              sefirah={sefirah.key}
              status={shells[sefirah.key]}
              keyword={sefirah.shellKeyword}
              compact={compact}
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
  readonly compact: boolean;
}

/**
 * Per-Sefirah Tailwind class lookups. Tailwind's content scanner
 * cannot read dynamic strings (`shadow-glow-${sefirah}`) — the
 * utilities have to appear as literal substrings in the source.
 * One static map per visual axis keeps the JIT-generation honest.
 */
const HALO_GLOW: Readonly<Record<SefirahKey, string>> = {
  kether: 'shadow-glow-kether',
  chokmah: 'shadow-glow-chokmah',
  binah: 'shadow-glow-binah',
  chesed: 'shadow-glow-chesed',
  gevurah: 'shadow-glow-gevurah',
  tiferet: 'shadow-glow-tiferet',
  netzach: 'shadow-glow-netzach',
  hod: 'shadow-glow-hod',
  yesod: 'shadow-glow-yesod',
  malkuth: 'shadow-glow-malkuth',
};

const SEFIRAH_TEXT: Readonly<Record<SefirahKey, string>> = {
  kether: 'text-kether',
  chokmah: 'text-chokmah',
  binah: 'text-chokmah', // Binah's near-black is unreadable on the void; lift to chokmah's silver for the descriptive copy. Shell glyph keeps the canonical Binah identity.
  chesed: 'text-chesed',
  gevurah: 'text-gevurah',
  tiferet: 'text-tiferet',
  netzach: 'text-netzach',
  hod: 'text-hod',
  yesod: 'text-yesod',
  malkuth: 'text-malkuth',
};

// Compact-row size tiers (% of full size). Numeric so the data
// attribute can be asserted against the spec without re-deriving
// from CSS. Maps to fixed Tailwind sizes below.
const SIZE_TIER: Readonly<Record<ShellStatus, '50' | '75' | '100'>> = {
  dormant: '50',
  active: '100',
  banished: '75',
};

// Compact-mode icon sizes per tier. Spec: dormant 50 %, banished
// 75 %, active 100 %. Concrete sizes are h-5 (20 px) / h-7 (28 px) /
// h-10 (40 px) — readable at a glance, distinct from the panel-mode
// uniform h-10.
const COMPACT_ICON_CLASS: Readonly<Record<ShellStatus, string>> = {
  dormant: 'h-5 w-5',
  active: 'h-10 w-10',
  banished: 'h-7 w-7',
};

function ShellSlot({
  sefirah,
  status,
  keyword,
  compact,
}: ShellSlotProps): JSX.Element {
  const data = sefirahByKey(sefirah);
  const copy = SHELL_COPY[sefirah];
  const sefirahName = data.englishName;

  // ── Aria-label per state ───────────────────────────────────────
  // The accessible name carries the role context (descriptive Shell
  // name) plus the state plus, on active slots, the effect copy.
  // Banished slots additionally announce the Sefirah whose
  // clearance banished them.
  let ariaLabel: string;
  if (status === 'dormant') {
    ariaLabel = `${copy.title}. Status: dormant.`;
  } else if (status === 'active') {
    ariaLabel = `${copy.title}. Status: active. ${copy.effect}`;
  } else {
    ariaLabel = `${copy.title}. Status: banished at ${sefirahName}.`;
  }

  // ── Per-state slot classes ─────────────────────────────────────
  // Active slots get the Sefirah-coloured halo (on the halo wrapper)
  // and a continuous wobble (on the inner wobble wrapper). Banished
  // slots get the wax-seal awakening-in-reverse animation on the
  // halo wrapper. Dormant slots stay quiet. The split across two
  // wrappers is intentional: applying both `animate-shell-awaken`
  // (one-shot on enter) and `animate-shell-active-wobble`
  // (continuous) to the same element collides on the `animation`
  // shorthand and only the last-listed wins. With two wrappers,
  // the outer plays the one-shot enter animation and settles to
  // identity transform; the inner runs the wobble forever. All
  // motion is gated `motion-safe:`.
  const haloClass =
    status === 'active'
      ? `${HALO_GLOW[sefirah]} motion-safe:animate-shell-awaken`
      : status === 'banished'
        ? 'motion-safe:animate-shell-banish'
        : '';
  // For non-active states the wrapper uses `display: contents` so it
  // disappears from the box model — `ShellIcon` stays a direct flex
  // child of the halo wrapper, matching the pre-fix layout. Active
  // state replaces this with the wobble animation, which needs a
  // real box for `transform: rotate` to apply.
  const wobbleClass =
    status === 'active' ? 'motion-safe:animate-shell-active-wobble' : 'contents';

  // Compact mode applies the size tier directly to the icon. Panel
  // mode uses a uniform h-10 so the grid stays tidy.
  const iconClass = compact ? COMPACT_ICON_CLASS[status] : 'h-10 w-10';

  // The keyword opacity / strikethrough tracks status in panel
  // mode; in compact mode the keyword is hidden (the strip is for
  // scanning, not reading).
  const keywordOpacity = status === 'banished' ? 'opacity-40' : 'opacity-70';

  return (
    <div
      data-shell-slot={sefirah}
      data-status={status}
      data-shell-state={status}
      data-size-tier={compact ? SIZE_TIER[status] : '100'}
      role="group"
      tabIndex={0}
      aria-label={ariaLabel}
      className="flex flex-col items-center gap-1 rounded outline-none focus-visible:ring-1 focus-visible:ring-illumination"
    >
      <div
        // Halo wrapper: glow + one-shot awaken/banish animation. The
        // icon's bounding box stays predictable here.
        data-shell-halo
        className={`relative flex items-center justify-center rounded-full ${haloClass}`}
      >
        <div
          // Wobble wrapper: nested so its `transform: rotate` doesn't
          // collide with the halo wrapper's awaken `transform: scale`.
          // No-op (empty class) for non-active states.
          data-shell-wobble
          className={wobbleClass}
        >
          <ShellIcon sefirah={sefirah} status={status} className={iconClass} />
        </div>
      </div>

      {/* Keyword caption. Hidden in compact mode (no room for
          letterforms at half-size). Aria-hidden because the
          accessible name on the focus group already carries the
          descriptive Shell title. */}
      {compact ? null : (
        <span
          data-shell-keyword
          className={`text-[10px] uppercase tracking-widest ${keywordOpacity} ${
            status === 'banished' ? 'line-through' : ''
          }`}
          aria-hidden="true"
        >
          {keyword}
        </span>
      )}

      {/* Active-slot effect copy. Renders in the Sefirah's colour
          token so the player connects the rule (Cruelty drops
          Strength) to the place on the Tree (Gevurah-red). Only in
          panel mode — compact mode keeps the strip scannable. */}
      {status === 'active' && !compact ? (
        <p
          data-shell-effect={sefirah}
          data-shell-color={sefirah}
          aria-hidden="true"
          className={`mt-1 max-w-[14ch] text-center text-[10px] leading-tight opacity-90 ${SEFIRAH_TEXT[sefirah]}`}
        >
          {copy.effect}
        </p>
      ) : null}

      {/* Banished caption. Tells the player (and an inspecting
          reviewer) which Sefirah's clearance banished this Shell.
          By design's rule (clearing X banishes X's Shell), the
          caption is always the Shell's own Sefirah name; we surface
          it explicitly so the strip / panel reads as instructional
          rather than cryptic. */}
      {status === 'banished' && !compact ? (
        <p
          data-shell-banished-caption
          aria-hidden="true"
          className="mt-1 text-[9px] uppercase tracking-widest opacity-60"
        >
          Banished at {sefirahName}
        </p>
      ) : null}
    </div>
  );
}
