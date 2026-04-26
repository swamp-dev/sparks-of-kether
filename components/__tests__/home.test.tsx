import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from '@/app/page';

/**
 * Smoke test for the React Testing Library toolchain. Renders the placeholder
 * home page and asserts on its visible content. Replace with richer tests
 * once the game UI lands in Phase 3.
 */
describe('HomePage', () => {
  it('renders the game title', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { name: /sparks of kether/i })).toBeInTheDocument();
  });

  it('renders the Begin link to /play', () => {
    render(<HomePage />);
    const link = screen.getByRole('link', { name: /Begin the ascent/i });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toBe('/play');
  });
});
