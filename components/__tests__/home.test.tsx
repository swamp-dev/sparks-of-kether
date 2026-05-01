import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import HomePage from '@/app/page';

/**
 * Home page — page-level assertions for the first-impression hero
 * redesign (#313). The brief's accessibility contract:
 *
 *   - Hero CTA is keyboard-reachable.
 *   - The three options (New / Join / Hot-seat) are reachable in
 *     ≤2 taps from the closed state and keyboard-accessible.
 *   - Mobile layout doesn't drop any of the three CTAs from the
 *     DOM (i.e. there's no viewport-conditional render path that
 *     hides an option on a small viewport).
 *
 * `next/navigation` is mocked because `HomeRoomForms` (rendered
 * inside the expanded portal panel) calls `useRouter()`. The mock
 * supplies a stub router so a static-render test doesn't need an
 * app-router provider.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

describe('HomePage', () => {
  it('renders the game title and the evocative subtitle', () => {
    render(<HomePage />);
    // Pin the h1 specifically — there's also an sr-only h2 inside
    // PitchColumns whose name matches the same regex, so a `level: 1`
    // filter is required for unambiguous selection.
    expect(
      screen.getByRole('heading', { level: 1, name: /sparks of kether/i }),
    ).toBeInTheDocument();
    // The subtitle is plain text, not a heading; pin its presence
    // by partial match. The exact wording is "The lightning descends.
    // The serpent ascends." — a couplet, not a marketing tagline.
    expect(screen.getByText(/lightning descends/i)).toBeInTheDocument();
    expect(screen.getByText(/serpent ascends/i)).toBeInTheDocument();
  });

  it('renders the single primary CTA in the closed state', () => {
    render(<HomePage />);
    const trigger = screen.getByRole('button', { name: /begin the ascent/i });
    expect(trigger).toBeInTheDocument();
    // Keyboard-reachable by default — a real <button>, no tabindex
    // override that could pull it out of the natural tab order.
    expect(trigger.tagName.toLowerCase()).toBe('button');
    expect(trigger.getAttribute('tabindex')).toBeNull();
  });

  it('expanding the portal reveals the three entry points (New / Join / Hot-seat)', async () => {
    render(<HomePage />);
    const trigger = screen.getByRole('button', { name: /begin the ascent/i });
    fireEvent.click(trigger);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /^new game$/i }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: /^join game$/i }),
    ).toBeInTheDocument();
    const hotseat = screen.getByRole('link', { name: /hot-seat/i });
    expect(hotseat).toBeInTheDocument();
    expect(hotseat.getAttribute('href')).toBe('/play');
  });

  it('renders the three pitch columns', () => {
    render(<HomePage />);
    // Each column carries `data-pitch-column="<key>"`. Pinning by
    // attribute is more durable than pinning by glyph or copy — the
    // glyphs may evolve, the structural contract should not.
    const cooperative = document.querySelector(
      '[data-pitch-column="cooperative"]',
    );
    const symbolic = document.querySelector(
      '[data-pitch-column="symbolic"]',
    );
    const short = document.querySelector(
      '[data-pitch-column="short"]',
    );
    expect(cooperative).not.toBeNull();
    expect(symbolic).not.toBeNull();
    expect(short).not.toBeNull();
  });

  it('renders the four filmstrip frames', () => {
    render(<HomePage />);
    const frames = document.querySelectorAll('[data-filmstrip-frame]');
    expect(frames.length).toBe(4);
  });

  it('renders the footer micro-block (rules / source / codex)', () => {
    render(<HomePage />);
    expect(screen.getByRole('link', { name: /read the rules/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view source/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^codex$/i })).toBeInTheDocument();
  });

  it('mobile layout does not drop any of the three CTAs from the DOM', async () => {
    // Pinning the contract that there's NO viewport-conditional
    // render path that strips an option on small screens. We render
    // the page once, expand the portal, and assert all three are in
    // the DOM. The CSS for the page uses Tailwind's responsive
    // classes (`sm:` / `md:` prefixes) for layout adjustments only —
    // never `hidden sm:block` or equivalent on the CTAs themselves.
    // If a future change introduces such a conditional, this test
    // fails because one of the three options would be missing from
    // the DOM in the default (mobile-first) Tailwind cascade.
    render(<HomePage />);
    const trigger = screen.getByRole('button', { name: /begin the ascent/i });
    fireEvent.click(trigger);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /^new game$/i }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: /^join game$/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /hot-seat/i })).toBeInTheDocument();

    // No CTA carries a `hidden sm:` or `sm:hidden` class — these are
    // the most-common Tailwind ways to drop an element from one
    // breakpoint's DOM. The DOM-query above already covers absence,
    // but pinning the className shape gives a clearer failure
    // message if a future refactor reaches for those utilities.
    for (const role of [
      screen.getByRole('button', { name: /^new game$/i }),
      screen.getByRole('button', { name: /^join game$/i }),
      screen.getByRole('link', { name: /hot-seat/i }),
    ]) {
      const cls = role.getAttribute('class') ?? '';
      expect(cls).not.toMatch(/\bhidden\b/);
      expect(cls).not.toMatch(/\bsm:hidden\b/);
    }
  });
});
