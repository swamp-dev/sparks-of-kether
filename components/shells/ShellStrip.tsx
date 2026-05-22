'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { sefirot, sefirahByKey } from '@/data';
import type { SefirahKey } from '@/data';
import type { ShellStateMap, ShellStatus } from '@/engine/types';
import { ShellIcon } from '@/components/tokens/ShellIcon';
import { SHELL_COPY } from './shell-copy';

/**
 * ShellStrip — collapses dormant/banished Shells to a compact strip
 * with per-slot expand, while keeping active Shells at full size.
 *
 * Replaces `ShellPanel` on `PlayScreen` (#14 — Epic #411).
 *
 * Layout:
 *   - Active / awakened Shells: rendered at full panel size (icon +
 *     keyword + effect copy) above the compact strip.
 *   - Dormant + banished Shells: compact icon strip. Each marker is a
 *     button that expands a detail panel below the strip on click /
 *     Enter / Space. One panel open at a time. Esc collapses.
 *
 * `prefers-reduced-motion`: all transitions are gated `motion-safe:` so
 * reduced-motion users see static icons and instant panel appearance.
 *
 * Sound hooks: same `onShellAwakened` / `onShellBanished` interface as
 * `ShellPanel` — fires once per transition.
 */

// Colour maps — same axes as ShellPanel; kept local to avoid coupling
// to ShellPanel internals.
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
  binah: 'text-chokmah', // Binah's near-black is unreadable on the void; lift to chokmah's silver.
  chesed: 'text-chesed',
  gevurah: 'text-gevurah',
  tiferet: 'text-tiferet',
  netzach: 'text-netzach',
  hod: 'text-hod',
  yesod: 'text-yesod',
  malkuth: 'text-malkuth',
};

const COMPACT_ICON_CLASS: Readonly<Record<ShellStatus, string>> = {
  dormant: 'h-5 w-5',
  active: 'h-10 w-10',
  banished: 'h-7 w-7',
};

export interface ShellStripProps {
  readonly shells: ShellStateMap;
  readonly headingLevel?: 2 | 3 | 4 | 5 | 6;
  readonly onShellAwakened?: (sefirah: SefirahKey) => void;
  readonly onShellBanished?: (sefirah: SefirahKey) => void;
  readonly className?: string;
}

export function ShellStrip({
  shells,
  headingLevel = 3,
  onShellAwakened,
  onShellBanished,
  className,
}: ShellStripProps): JSX.Element {
  const [expandedShell, setExpandedShell] = useState<SefirahKey | null>(null);
  const expandBtnRefs = useRef<Map<SefirahKey, HTMLButtonElement | null>>(new Map());
  const sectionRef = useRef<HTMLElement | null>(null);

  // Transition hooks — same pattern as ShellPanel.
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
          // Covers active → banished (normal) and dormant → banished (stillborn).
          onShellBanished?.(s.key);
        }
      }
    }
    prevShellsRef.current = shells;
  }, [shells, onShellAwakened, onShellBanished]);

  const toggle = useCallback((key: SefirahKey) => {
    setExpandedShell((prev) => (prev === key ? null : key));
  }, []);

  // Esc collapses the open panel and returns focus to its trigger.
  // Scoped to the section element so multiple ShellStrip instances on the
  // same page don't cross-collapse each other.
  useEffect(() => {
    if (!expandedShell) return undefined;
    const section = sectionRef.current;
    if (!section) return undefined;
    const handler = (e: globalThis.KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        const btn = expandBtnRefs.current.get(expandedShell);
        setExpandedShell(null);
        btn?.focus();
      }
    };
    section.addEventListener('keydown', handler);
    return (): void => section.removeEventListener('keydown', handler);
  }, [expandedShell]);

  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  const expandPanelId = expandedShell !== null ? `shell-expand-${expandedShell}` : undefined;

  const activeShells = sefirot.filter((s) => shells[s.key] === 'active');
  const compactShells = sefirot.filter((s) => shells[s.key] !== 'active');

  return (
    <section
      ref={sectionRef}
      role="region"
      aria-label="Shell pressure panel"
      data-shell-panel
      data-shell-mode="strip"
      className={className}
    >
      <Heading className="mb-3 font-display text-lg tracking-widest">Shells</Heading>

      {/* Active shells — rendered at full panel size with effect copy */}
      {activeShells.length > 0 && (
        <div className="mb-3 space-y-3">
          {activeShells.map((sefirah) => (
            <FullShellSlot key={sefirah.key} sefirah={sefirah.key} />
          ))}
        </div>
      )}

      {/* Compact strip — dormant + banished shells */}
      {compactShells.length > 0 && (
        <div>
          <div className="flex flex-row flex-wrap items-end gap-2" data-shell-strip>
            {compactShells.map((sefirah) => {
              const status = shells[sefirah.key];
              const isExpanded = expandedShell === sefirah.key;
              const copy = SHELL_COPY[sefirah.key];
              return (
                <div
                  key={sefirah.key}
                  data-shell-slot={sefirah.key}
                  data-status={status}
                  data-strip-mode="compact"
                  className="flex flex-col items-center gap-1"
                >
                  <button
                    type="button"
                    ref={(el) => {
                      expandBtnRefs.current.set(sefirah.key, el);
                    }}
                    aria-label={copy.title}
                    aria-expanded={isExpanded}
                    aria-controls={isExpanded ? expandPanelId : undefined}
                    onClick={() => {
                      toggle(sefirah.key);
                    }}
                    className="rounded outline-none focus-visible:ring-1 focus-visible:ring-illumination"
                  >
                    <ShellIcon
                      sefirah={sefirah.key}
                      status={status}
                      className={COMPACT_ICON_CLASS[status]}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Expand panel — appears below the strip when a slot is open */}
          {expandedShell !== null && expandPanelId !== undefined && (
            <ExpandPanel
              id={expandPanelId}
              sefirah={expandedShell}
              status={shells[expandedShell]}
            />
          )}
        </div>
      )}
    </section>
  );
}

/** Full-size slot for active shells — mirrors ShellPanel's panel-mode rendering. */
function FullShellSlot({ sefirah }: { readonly sefirah: SefirahKey }): JSX.Element {
  const data = sefirahByKey(sefirah);
  const copy = SHELL_COPY[sefirah];
  return (
    <div
      data-shell-slot={sefirah}
      data-status="active"
      data-strip-mode="full"
      role="group"
      aria-label={`${copy.title}. Status: active. ${copy.effect}`}
      className="flex flex-col items-center gap-1 rounded outline-none focus-visible:ring-1 focus-visible:ring-illumination"
    >
      <div
        data-shell-halo
        className={`relative flex items-center justify-center rounded-full ${HALO_GLOW[sefirah]} motion-safe:animate-shell-awaken`}
      >
        <div data-shell-wobble className="motion-safe:animate-shell-active-wobble">
          <ShellIcon sefirah={sefirah} status="active" className="h-10 w-10" />
        </div>
      </div>
      <span
        data-shell-keyword
        aria-hidden="true"
        className="text-[10px] uppercase tracking-widest opacity-70"
      >
        {data.shellKeyword}
      </span>
      <p
        data-shell-effect={sefirah}
        data-shell-color={sefirah}
        aria-hidden="true"
        className={`mt-1 max-w-[14ch] text-center text-[10px] leading-tight opacity-90 ${SEFIRAH_TEXT[sefirah]}`}
      >
        {copy.effect}
      </p>
    </div>
  );
}

/** Detail panel shown below the compact strip when a slot is expanded. */
function ExpandPanel({
  id,
  sefirah,
  status,
}: {
  readonly id: string;
  readonly sefirah: SefirahKey;
  readonly status: ShellStatus;
}): JSX.Element {
  const data = sefirahByKey(sefirah);
  const copy = SHELL_COPY[sefirah];
  return (
    <div
      id={id}
      data-shell-expand-panel={sefirah}
      role="region"
      aria-label={copy.title}
      className="mt-2 rounded border border-veil/20 bg-ground/60 p-3 motion-safe:transition-opacity motion-safe:duration-150"
    >
      <p className="mb-1 text-sm font-semibold">{copy.title}</p>
      <p className="mb-1 text-[10px] uppercase tracking-widest opacity-60">{data.shellKeyword}</p>
      {status === 'banished' ? (
        <p className="text-xs opacity-60">Banished at {data.englishName}.</p>
      ) : (
        <>
          <p className="mb-1 text-xs opacity-60">Dormant — not yet awakened.</p>
          <p className="text-xs opacity-50 italic">{copy.effect}</p>
        </>
      )}
    </div>
  );
}
