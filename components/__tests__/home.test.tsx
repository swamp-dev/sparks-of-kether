import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from '@/app/page';

// HomePage now renders HomeRoomForms which calls `useRouter`. Mock
// next/navigation so a static-render test doesn't need an app-router
// provider.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

describe('HomePage', () => {
  it('renders the game title', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { name: /sparks of kether/i })).toBeInTheDocument();
  });

  it('renders the New game and Join game buttons', () => {
    render(<HomePage />);
    expect(screen.getByRole('button', { name: /^New game$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Join game$/i })).toBeInTheDocument();
  });

  it('renders the hot-seat fallback link to /play', () => {
    render(<HomePage />);
    const link = screen.getByRole('link', { name: /Hot-seat/i });
    expect(link.getAttribute('href')).toBe('/play');
  });
});
