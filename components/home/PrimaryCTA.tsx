'use client';
import { useEffect, useRef, useState } from 'react';
import { HomeRoomForms } from '@/components/setup/HomeRoomForms';
import Link from 'next/link';

/**
 * Single-CTA portal for the home page (#313). Renders one dramatic
 * "Begin the ascent" button; on click (or keyboard activation), the
 * button collapses and reveals the three actual entry points:
 *
 *   - New game    → routes to `/rooms/<code>/lobby` after creating a room
 *   - Join game   → routes to `/rooms/<code>/lobby` after joining
 *   - Hot-seat    → routes to `/play` for single-machine play
 *
 * Keyboard:
 * - The CTA button is a real `<button>`; it's reachable by Tab and
 *   activatable by Enter / Space (no manual key-handling needed).
 * - Once expanded, the three entry points are all `<button>` /
 *   `<input>` / `<a>` elements inside the same panel; tab order
 *   walks through them naturally.
 * - Pressing Escape while the panel is open collapses it and returns
 *   focus to the trigger.
 *
 * ARIA:
 * - The CTA button carries `aria-expanded` and `aria-controls`
 *   pointing at the panel ID (`home-portal-panel`).
 * - The panel is a normal region (no role="dialog" — this isn't a
 *   modal, just a disclosure expansion).
 *
 * Accessibility: the brief requires all three options reachable in
 * ≤2 taps and keyboard-accessible. One tap on the CTA opens; one
 * tap (or Tab + Enter) on any of the three options activates. Within
 * the AT layer the panel's content is the same `HomeRoomForms` (New
 * game + Join game) and the Hot-seat link, so existing room-creation
 * tests in `components/setup/__tests__` apply unchanged.
 *
 * The DOM always contains the CTA button. The expanded panel is only
 * rendered when `isOpen` is true — in collapsed state the panel is
 * absent from the DOM. Tests asserting the three entry points exist
 * must first activate the CTA. The `data-portal-state` attribute on
 * the wrapper makes the open / closed state inspectable from tests
 * and from e2e screenshots.
 */

interface PrimaryCTAProps {
  readonly className?: string;
  /**
   * Render the panel expanded on first paint instead of waiting for
   * the trigger click. Test-affordance only — used by tests that
   * need to audit the expanded DOM directly (e.g. the axe sweep
   * over the open-state panel) without the extra click step. The
   * production home page never sets it.
   *
   * Defaults to `false` (closed).
   */
  readonly defaultOpen?: boolean;
}

const PANEL_ID = 'home-portal-panel';
const TRIGGER_ID = 'home-portal-trigger';

export function PrimaryCTA({ className, defaultOpen = false }: PrimaryCTAProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Tracks whether the panel was open on the previous render so the
  // close-side focus-return useEffect can fire only on the
  // open → closed transition (not on initial mount when defaultOpen
  // is false). Refs are appropriate here because we don't need the
  // value to drive a render — just to gate a focus side effect.
  const wasOpenRef = useRef(defaultOpen);

  // When the panel opens, move focus into the first text input
  // (the nickname field rendered by HomeRoomForms) so a keyboard
  // user can start typing immediately instead of staying on the
  // now-collapsed trigger. We deliberately scope the selector to
  // `input` rather than including buttons / links — the Close
  // button is the first button-typed focusable in DOM order, and
  // landing the user on Close on every open is hostile.
  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    if (panel === null) return;
    const firstInput = panel.querySelector<HTMLInputElement>('input:not([disabled])');
    firstInput?.focus();
  }, [isOpen]);

  // When the panel closes (open → closed transition), return focus to
  // the trigger. We use a useEffect rather than calling .focus()
  // synchronously alongside setIsOpen(false) because under React 18
  // automatic batching the DOM is not flushed before the next line —
  // the trigger still has `hidden`/`display:none` and the .focus()
  // call is a silent no-op, leaving keyboard users stranded on
  // <body>. The effect runs after render, by which time the trigger
  // is visible again.
  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      return;
    }
    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  // Escape key: close the panel. Focus return is handled by the
  // close-side useEffect above. Listener is window-scoped while open
  // so it catches keys typed into nested inputs as well.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: globalThis.KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return (): void => {
      window.removeEventListener('keydown', handler);
    };
  }, [isOpen]);

  return (
    <div
      data-home-portal
      data-portal-state={isOpen ? 'open' : 'closed'}
      className={`flex flex-col items-stretch ${className ?? ''}`}
    >
      {/* Closed state: the dramatic single button. The button stays
          mounted across state changes so focus management is stable
          (no remount-induced focus loss). When open, it's hidden
          behind the panel via display:none rather than removed from
          the DOM. */}
      <button
        type="button"
        id={TRIGGER_ID}
        ref={triggerRef}
        onClick={() => setIsOpen(true)}
        aria-expanded={isOpen}
        aria-controls={PANEL_ID}
        data-home-cta="begin"
        // `hidden` removes the button from the visual flow and the
        // tab order when the panel is open. The button stays mounted
        // so the ref is stable across the open/close cycle. (The
        // panel uses `aria-labelledby={TRIGGER_ID}` to name itself —
        // ARIA name computation reads the hidden trigger's text
        // content even though the user can't see or focus it; this
        // is allowed by the ARIA spec.)
        hidden={isOpen}
        className="group mx-auto inline-flex items-center justify-center gap-3 rounded-full border-2 border-illumination/70 bg-ground/40 px-10 py-5 font-display text-xl tracking-widest text-illumination shadow-glow-tiferet transition-all duration-300 ease-emerge hover:border-illumination hover:bg-ground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-illumination focus-visible:ring-offset-2 focus-visible:ring-offset-void motion-safe:animate-breath"
      >
        <span aria-hidden="true" className="text-2xl">
          ✦
        </span>
        Begin the ascent
        <span aria-hidden="true" className="text-2xl">
          ✦
        </span>
      </button>

      {isOpen ? (
        <div
          id={PANEL_ID}
          ref={panelRef}
          role="region"
          aria-labelledby={TRIGGER_ID}
          data-home-portal-panel
          className="mx-auto w-full max-w-md rounded-lg border border-veil/15 bg-ground/60 p-6 backdrop-blur-sm transition-opacity duration-300 ease-emerge"
          // No `aria-hidden` here — the panel is the active region.
        >
          {/* Header inside the open panel — affords a way back to the
              closed-state entry-point button (the trigger), so the
              user always has a way to "unfold". */}
          <div className="mb-4 flex items-center justify-between">
            <h2
              className="font-display text-base tracking-widest text-veil"
              id={`${PANEL_ID}-heading`}
            >
              Choose your entry
            </h2>
            <button
              type="button"
              data-home-portal-close
              onClick={() => setIsOpen(false)}
              className="rounded text-xs uppercase tracking-widest text-veil/70 hover:text-veil focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-veil/60"
              aria-label="Collapse and return to the portal"
            >
              Close
            </button>
          </div>

          {/* New game / Join game — the existing room CTAs. */}
          <HomeRoomForms />

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-veil/40">
            <span className="h-px flex-1 bg-veil/15" />
            <span>or</span>
            <span className="h-px flex-1 bg-veil/15" />
          </div>

          {/* Hot-seat — third option, equal weight per the brief. */}
          <Link
            href="/play"
            data-home-hotseat
            data-home-cta="hotseat"
            className="block w-full rounded border border-veil/30 px-6 py-3 text-center font-display tracking-widest text-veil transition-colors duration-200 ease-flow hover:border-veil/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-veil/60"
          >
            Hot-seat / single-machine
          </Link>
        </div>
      ) : null}
    </div>
  );
}

// Re-export the panel ID so tests and any sibling components can
// reference it without duplicating the literal.
export { PANEL_ID as HOME_PORTAL_PANEL_ID, TRIGGER_ID as HOME_PORTAL_TRIGGER_ID };
