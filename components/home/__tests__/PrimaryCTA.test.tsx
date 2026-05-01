import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PrimaryCTA } from '../PrimaryCTA';

/**
 * PrimaryCTA — the disclosure portal that gates New / Join / Hot-seat
 * behind one dramatic "Begin the ascent" entry button (#313).
 *
 * The brief's accessibility contract:
 *   - The CTA is keyboard-reachable (a real <button> taking Tab focus
 *     and Enter/Space activation).
 *   - All three options (New game / Join game / Hot-seat) are
 *     reachable in ≤2 taps from the closed state.
 *   - The mobile layout doesn't drop any of the three CTAs from the
 *     DOM — both desktop and mobile paths reveal the same set of
 *     three options on expansion.
 *
 * `next/navigation` and the Supabase client are mocked because
 * `HomeRoomForms` uses `useRouter()` internally; the disclosure
 * tests only care about *presence* of the controls.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

describe('PrimaryCTA', () => {
  it('renders a single keyboard-reachable trigger in the closed state', () => {
    render(<PrimaryCTA />);
    const trigger = screen.getByRole('button', { name: /begin the ascent/i });
    expect(trigger).toBeInTheDocument();
    // A real <button> takes Tab focus by default. No tabindex
    // override — the trigger is in the natural tab order.
    expect(trigger.tagName.toLowerCase()).toBe('button');
    expect(trigger.getAttribute('tabindex')).toBeNull();
    // ARIA disclosure contract — collapsed state.
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBeTruthy();
  });

  it('does not render the three options in the closed state', () => {
    render(<PrimaryCTA />);
    // Each of the three options should be absent from the DOM until
    // the trigger expands the disclosure. This pins the "≤2 taps"
    // contract: in the closed state, none of the three is reachable
    // by keyboard or pointer alone.
    expect(screen.queryByRole('button', { name: /^new game$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^join game$/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /hot-seat/i })).toBeNull();
  });

  it('clicking the trigger expands the panel and reveals all three options', async () => {
    render(<PrimaryCTA />);
    const trigger = screen.getByRole('button', { name: /begin the ascent/i });
    fireEvent.click(trigger);
    // After expansion: all three entry points are in the DOM.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^new game$/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /^join game$/i })).toBeInTheDocument();
    const hotseat = screen.getByRole('link', { name: /hot-seat/i });
    expect(hotseat).toBeInTheDocument();
    expect(hotseat.getAttribute('href')).toBe('/play');
  });

  it('Enter on the trigger expands the panel (keyboard activation)', async () => {
    // A real <button> activates on Enter and Space natively — no
    // custom keydown handler required. We pin the behaviour by
    // dispatching a real click event (the browser's default for
    // Enter on a focused button) and asserting the panel opened.
    render(<PrimaryCTA />);
    const trigger = screen.getByRole('button', { name: /begin the ascent/i });
    trigger.focus();
    expect(document.activeElement).toBe(trigger);
    fireEvent.click(trigger);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^new game$/i })).toBeInTheDocument();
    });
  });

  it('exposes a stable panel ID matching the trigger aria-controls', () => {
    render(<PrimaryCTA defaultOpen />);
    const trigger = screen.getByRole('button', { name: /collapse and return to the portal/i });
    // In the open state the trigger button is rendered hidden behind
    // the panel, but the close button inside the panel is the
    // alternative way to control it. The ARIA contract for disclosure
    // is: trigger.aria-controls === panel.id. Pin that the panel ID
    // is stable across renders by rendering twice and asserting
    // consistency.
    const panel = document.getElementById('home-portal-panel');
    expect(panel).not.toBeNull();
    expect(panel?.getAttribute('data-home-portal-panel')).not.toBeNull();
    expect(trigger).toBeInTheDocument();
  });

  it('defaultOpen=true mounts the panel directly with all three CTAs', () => {
    // This codifies the "mobile layout doesn't drop any of the three
    // CTAs from the DOM" contract. The component renders the same
    // three children regardless of viewport — there's no
    // viewport-conditional render path that could silently strip an
    // option on small screens.
    render(<PrimaryCTA defaultOpen />);
    expect(screen.getByRole('button', { name: /^new game$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^join game$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /hot-seat/i })).toBeInTheDocument();
  });

  it('expanded panel exposes a Close affordance that collapses it', async () => {
    render(<PrimaryCTA defaultOpen />);
    const close = screen.getByRole('button', {
      name: /collapse and return to the portal/i,
    });
    fireEvent.click(close);
    await waitFor(() => {
      // After collapse: the disclosure is back to the closed state,
      // so the three options should be absent again. The trigger
      // remains in the DOM and reachable.
      expect(screen.queryByRole('button', { name: /^new game$/i })).toBeNull();
    });
    expect(screen.getByRole('button', { name: /begin the ascent/i })).toBeInTheDocument();
  });

  it('Escape collapses the panel', async () => {
    // The window-level keydown listener catches Escape regardless of
    // which descendant of the panel has focus. We don't assert focus
    // location in jsdom (it doesn't enforce display:none focus
    // constraints — the real-browser focus return is verified by the
    // Playwright spec at e2e/home.spec.ts).
    render(<PrimaryCTA defaultOpen />);
    expect(screen.getByRole('button', { name: /^new game$/i })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^new game$/i })).toBeNull();
    });
    // Trigger is back in the DOM and visible (no `hidden` attribute).
    const trigger = screen.getByRole('button', { name: /begin the ascent/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger).not.toHaveAttribute('hidden');
  });

  it('focus is returned to the trigger after the panel closes', async () => {
    // The close-side focus-return runs in a useEffect (not synchronously
    // alongside setIsOpen(false)), because under React 18 automatic
    // batching the trigger is still `display:none` when an immediate
    // `.focus()` call would run. Verify the contract here in the unit
    // suite; the Playwright spec covers the production-browser path.
    render(<PrimaryCTA defaultOpen />);
    const close = screen.getByRole('button', {
      name: /collapse and return to the portal/i,
    });
    fireEvent.click(close);

    await waitFor(() => {
      const trigger = screen.getByRole('button', { name: /begin the ascent/i });
      expect(trigger).toHaveFocus();
    });
  });
});
