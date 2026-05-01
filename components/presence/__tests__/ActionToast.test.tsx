import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ActionToast, type PeerAction } from '../ActionToast';

/**
 * Action-toast contract (#322): when a peer signals a pre-action state
 * ("choosing-card", "rolling", "targeting"), surface a small toast at
 * top-center with their nickname. Auto-dismiss after 6s of staleness.
 * Reduce-motion skips the slide-in animation but keeps the toast
 * itself.
 */

function action(overrides: Partial<PeerAction> = {}): PeerAction {
  return {
    playerId: 'p2',
    name: 'Brae',
    kind: 'choosing-card',
    ts: 0,
    ...overrides,
  };
}

describe('<ActionToast>', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a toast for a peer in pre-action state', () => {
    render(<ActionToast actions={[action({ kind: 'choosing-card' })]} />);
    const toast = screen.getByTestId('action-toast-p2');
    expect(toast.textContent).toMatch(/Brae/);
    expect(toast.textContent).toMatch(/choosing a card/i);
  });

  it('renders different copy for each action kind', () => {
    const { rerender } = render(
      <ActionToast actions={[action({ kind: 'rolling' })]} />,
    );
    expect(screen.getByTestId('action-toast-p2').textContent).toMatch(
      /rolling/i,
    );

    rerender(<ActionToast actions={[action({ kind: 'targeting' })]} />);
    expect(screen.getByTestId('action-toast-p2').textContent).toMatch(
      /targeting/i,
    );
  });

  it('omits a toast when the peer is idle (kind=null)', () => {
    render(<ActionToast actions={[action({ kind: null })]} />);
    expect(screen.queryByTestId('action-toast-p2')).toBeNull();
  });

  it('auto-dismisses after the 6s timeout if the action does not refresh', () => {
    vi.setSystemTime(0);
    render(<ActionToast actions={[action({ kind: 'choosing-card', ts: 0 })]} />);
    expect(screen.queryByTestId('action-toast-p2')).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(6500);
    });
    expect(screen.queryByTestId('action-toast-p2')).toBeNull();
  });

  it('drops the slide-in animation class when reduceMotion is on', () => {
    render(
      <ActionToast
        actions={[action({ kind: 'choosing-card' })]}
        reduceMotion
      />,
    );
    const toast = screen.getByTestId('action-toast-p2');
    expect(toast.getAttribute('data-slide-in')).toBe('false');
  });

  it('renders one toast per peer in pre-action state', () => {
    render(
      <ActionToast
        actions={[
          action({ playerId: 'p2', kind: 'choosing-card' }),
          action({ playerId: 'p3', name: 'Cael', kind: 'rolling' }),
        ]}
      />,
    );
    expect(screen.getAllByTestId(/action-toast-p\d/)).toHaveLength(2);
  });

  it('uses a polite live region so SR users hear the announcement', () => {
    render(<ActionToast actions={[action({ kind: 'choosing-card' })]} />);
    const region = screen.getByTestId('action-toast-region');
    expect(region.getAttribute('role')).toBe('status');
    expect(region.getAttribute('aria-live')).toBe('polite');
  });
});
