import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotFound from '@/app/not-found';

/**
 * Themed 404 page (#369). Replaces Next.js's default unstyled
 * fallback. Page-level contract:
 *
 *   - Renders an h1 (so the page has a primary heading like every
 *     other route) and a "404" eyebrow.
 *   - Carries a "Codex" CTA and a "Home" link so a user landing
 *     here has a one-click recovery path.
 *   - Sits inside the same `text-veil` colour family as the rest of
 *     the site — the page-level theme contract is "do not break out
 *     of the dark cosmic palette". Pinning this exactly to a
 *     classname is brittle; instead we assert the `<main>` carries
 *     the `data-not-found` marker so a future refactor can swap
 *     classes freely without breaking this test.
 */
describe('NotFound (app/not-found.tsx)', () => {
  it('renders an h1, the 404 eyebrow, and the recovery flavour copy', () => {
    render(<NotFound />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText('404')).toBeInTheDocument();
    // Flavour copy — partial match so a future word choice tweak
    // doesn't snap the test, while still confirming the page isn't
    // empty/silent.
    expect(screen.getByText(/path does not connect/i)).toBeInTheDocument();
  });

  it('renders a Codex CTA and a Home link as recovery affordances', () => {
    render(<NotFound />);
    const codex = screen.getByRole('link', { name: /open the codex/i });
    const home = screen.getByRole('link', { name: /return home/i });
    expect(codex).toHaveAttribute('href', '/codex');
    expect(home).toHaveAttribute('href', '/');
  });

  it('marks the main region with data-not-found so a11y/visual-regression specs can hook in', () => {
    const { container } = render(<NotFound />);
    expect(container.querySelector('main[data-not-found]')).not.toBeNull();
  });
});
