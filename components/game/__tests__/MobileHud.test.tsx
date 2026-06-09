import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileHud } from '../MobileHud';
import { EMPTY_SHELL_STATE } from '@/engine/types';

function renderHud(overrides: Partial<React.ComponentProps<typeof MobileHud>> = {}) {
  const defaults = {
    phase: 'move' as const,
    activePlayerName: 'Alice',
    illumination: 3,
    separation: 1,
    shells: EMPTY_SHELL_STATE,
    activeView: 'tree' as const,
    onSetView: vi.fn(),
  };
  return render(<MobileHud {...defaults} {...overrides} />);
}

describe('MobileHud', () => {
  it('shows the phase hint', () => {
    renderHud({ phase: 'move' });
    expect(screen.getByTestId('mobile-phase-hint').textContent).toMatch(/card.*path|meditate/i);
  });

  it('shows the active player name', () => {
    renderHud({ activePlayerName: 'Bob' });
    expect(screen.getByTestId('mobile-player-name').textContent).toMatch(/Bob/);
  });

  it('shows compact Illumination and Separation values', () => {
    renderHud({ illumination: 5, separation: 2 });
    const hud = screen.getByTestId('mobile-hud');
    expect(hud.textContent).toMatch(/5/);
    expect(hud.textContent).toMatch(/2/);
  });

  it('renders tab buttons for Tree and Hand views', () => {
    renderHud({ activeView: 'tree' });
    const treeTab = screen.getByRole('tab', { name: /tree/i });
    const handTab = screen.getByRole('tab', { name: /hand/i });
    expect(treeTab).toBeDefined();
    expect(handTab).toBeDefined();
  });

  it('marks the active tab as selected via aria-selected', () => {
    renderHud({ activeView: 'tree' });
    expect(screen.getByRole('tab', { name: /tree/i }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: /hand/i }).getAttribute('aria-selected')).toBe('false');
  });

  it('marks hand tab as selected when activeView is hand', () => {
    renderHud({ activeView: 'hand' });
    expect(screen.getByRole('tab', { name: /hand/i }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: /tree/i }).getAttribute('aria-selected')).toBe('false');
  });

  it('calls onSetView with "hand" when Hand tab is clicked', async () => {
    const onSetView = vi.fn();
    renderHud({ activeView: 'tree', onSetView });
    await userEvent.click(screen.getByRole('tab', { name: /hand/i }));
    expect(onSetView).toHaveBeenCalledWith('hand');
  });

  it('calls onSetView with "tree" when Tree tab is clicked from hand view', async () => {
    const onSetView = vi.fn();
    renderHud({ activeView: 'hand', onSetView });
    await userEvent.click(screen.getByRole('tab', { name: /tree/i }));
    expect(onSetView).toHaveBeenCalledWith('tree');
  });

  it('tab list has an accessible label', () => {
    renderHud();
    expect(screen.getByRole('tablist', { name: /view/i })).toBeDefined();
  });
});
