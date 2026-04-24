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

  it('renders the coming-soon line', () => {
    render(<HomePage />);
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });
});
