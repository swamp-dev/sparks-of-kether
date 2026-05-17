'use client';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useSoundEnabled } from '@/lib/sound/settings';

function Toggle({
  checked,
  label,
  onChange,
  testId,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
  testId: string;
}): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      data-action={testId}
      className={`relative h-6 w-11 overflow-hidden rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-illumination ${
        checked ? 'border-illumination bg-illumination/70' : 'border-veil/40 bg-ground'
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-transform ${
          checked ? 'translate-x-[1.375rem] bg-ground' : 'translate-x-1 bg-veil'
        }`}
      />
    </button>
  );
}

/**
 * SettingsButton — floating cog button + popover for the play surface
 * (#321 — Epic #310 phase 6).
 *
 * Renders a cog button anchored bottom-right of the page (the caller
 * controls the surrounding layout). Clicking opens a small popover
 * with:
 *
 *   - **Sound** — interactive toggle. Persists to `localStorage` via
 *     `useSoundEnabled()`. Default OFF (auto-playing audio is hostile
 *     by default).
 *   - **Reduced motion** — read-only status. The OS-level
 *     `prefers-reduced-motion` value is system-driven; we surface
 *     it here so the player knows the game is honoring their
 *     setting. There is no in-game override.
 *
 * A11y:
 *   - The cog has `aria-label="Settings"` and reflects the open state
 *     via `aria-expanded` + `aria-haspopup`.
 *   - The popover renders inside a `role="dialog"` with
 *     `aria-modal="true"` and a `aria-labelledby` reference to the
 *     heading.
 *   - Esc closes the popover and returns focus to the trigger.
 *   - A simple Tab loop keeps focus inside the popover while open
 *     (the close button anchors the front of the loop).
 */

export function SettingsButton({ onQuit }: { readonly onQuit?: () => void } = {}): JSX.Element {
  const { sfxEnabled, setSfxEnabled, musicEnabled, setMusicEnabled } = useSoundEnabled();
  const [open, setOpen] = useState(false);
  const [confirmingQuit, setConfirmingQuit] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // OS-level reduced-motion read-out. Refreshed on every popover
  // open so a user toggling their system setting between sessions
  // sees the right value when they next look. The popover is
  // ephemeral; a media-query listener for the closed-popover case
  // would be wasted work.
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (!open) return;
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mql.matches);
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    setConfirmingQuit(false);
    // Return focus to the trigger for screen-reader / keyboard users
    // — without this, focus would land on document.body after the
    // dialog unmounts.
    triggerRef.current?.focus();
  }, []);

  // Esc closes and returns focus. We attach to the dialog ref so the
  // listener auto-cleans on unmount.
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e: globalThis.KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener('keydown', handler);
    return (): void => document.removeEventListener('keydown', handler);
  }, [open, close]);

  // On open, move focus into the dialog so screen readers announce
  // it correctly and so Esc / Tab work without the user clicking
  // inside first.
  useEffect(() => {
    if (open) {
      closeBtnRef.current?.focus();
    }
  }, [open]);

  // Minimal focus trap: Tab from the last focusable element loops
  // back to the close button; Shift+Tab from the close button loops
  // to the last focusable element. Two interactive elements only
  // (close + sound switch), so the trap is two-stop and shipping a
  // full focus-trap library would be overkill.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key !== 'Tab') return;
    if (!dialogRef.current) return;
    const focusables = dialogRef.current.querySelectorAll<HTMLElement>('button, [role="switch"]');
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!first || !last) return;
    const active = document.activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div data-settings-anchor className="fixed bottom-4 right-4 z-40">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Settings"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        data-action="open-settings"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-veil/40 bg-ground/80 text-veil opacity-80 shadow-lg backdrop-blur-sm transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-illumination"
      >
        <CogGlyph />
      </button>

      {open ? (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-heading"
          data-settings-popover
          onKeyDown={onKeyDown}
          className="absolute bottom-12 right-0 w-64 rounded border border-veil/30 bg-ground/95 p-4 text-veil shadow-xl backdrop-blur"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 id="settings-heading" className="font-display text-sm uppercase tracking-widest">
              Settings
            </h2>
            <button
              ref={closeBtnRef}
              type="button"
              aria-label="Close settings"
              onClick={close}
              data-action="close-settings"
              className="flex h-8 w-8 items-center justify-center rounded text-veil opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-illumination"
            >
              ×
            </button>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm">Sound effects</span>
            <Toggle
              checked={sfxEnabled}
              label="Toggle sound effects"
              onChange={() => setSfxEnabled(!sfxEnabled)}
              testId="toggle-sfx"
            />
          </div>

          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm">Music</span>
            <Toggle
              checked={musicEnabled}
              label="Toggle music"
              onChange={() => setMusicEnabled(!musicEnabled)}
              testId="toggle-music"
            />
          </div>

          {/* Reduced motion — system-driven, read-only. Surface the
              current state so the player knows the game is honoring
              the setting; copy explicitly says "follows your system". */}
          <div className="mb-1 flex items-center justify-between text-sm">
            <span>Reduced motion</span>
            <span
              data-testid="reduced-motion-status"
              className="text-xs uppercase tracking-widest opacity-70"
            >
              {reducedMotion ? 'On (system)' : 'Off (system)'}
            </span>
          </div>
          <p className="text-xs italic opacity-60">Reduced motion follows your system setting.</p>

          {onQuit !== undefined ? (
            <div className="mt-4 border-t border-veil/20 pt-3">
              {confirmingQuit ? (
                <div className="flex flex-col gap-2">
                  <p className="text-center text-xs opacity-60">Leave this game?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onQuit()}
                      data-action="confirm-quit"
                      className="flex-1 rounded bg-pillar-severity/80 px-3 py-2 text-xs uppercase tracking-widest text-ground hover:bg-pillar-severity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pillar-severity"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingQuit(false)}
                      data-action="cancel-quit"
                      className="flex-1 rounded border border-veil/30 px-3 py-2 text-xs uppercase tracking-widest opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-illumination"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingQuit(true)}
                  data-action="leave-game"
                  className="w-full rounded border border-veil/30 px-3 py-2 text-xs uppercase tracking-widest opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-illumination"
                >
                  Leave Game
                </button>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Inline cog glyph. SVG so we don't ship an icon font for a single
 * symbol. `currentColor` so the surrounding `text-veil` class wins.
 */
function CogGlyph(): JSX.Element {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
