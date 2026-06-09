import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobilePlaySurface } from '../MobilePlaySurface';
import { EMPTY_SHELL_STATE } from '@/engine/types';

function renderSurface(overrides: Partial<React.ComponentProps<typeof MobilePlaySurface>> = {}) {
  const defaults = {
    activeView: 'tree' as const,
    onSetView: vi.fn(),
    treeContent: <div data-testid="tree-slot">Tree content</div>,
    handContent: <div data-testid="hand-slot">Hand content</div>,
    phase: 'move' as const,
    activePlayerName: 'Alice',
    illumination: 3,
    separation: 1,
    shells: EMPTY_SHELL_STATE,
  };
  return render(<MobilePlaySurface {...defaults} {...overrides} />);
}

describe('MobilePlaySurface', () => {
  it('shows tree content when activeView is "tree"', () => {
    renderSurface({ activeView: 'tree' });
    expect(screen.getByTestId('tree-slot')).toBeDefined();
    expect(screen.queryByTestId('hand-slot')).toBeNull();
  });

  it('shows hand content when activeView is "hand"', () => {
    renderSurface({ activeView: 'hand' });
    expect(screen.getByTestId('hand-slot')).toBeDefined();
    expect(screen.queryByTestId('tree-slot')).toBeNull();
  });

  it('always renders the MobileHud regardless of view', () => {
    const { rerender } = renderSurface({ activeView: 'tree' });
    expect(screen.getByRole('tablist', { name: /view/i })).toBeDefined();

    rerender(
      <MobilePlaySurface
        activeView="hand"
        onSetView={vi.fn()}
        treeContent={<div data-testid="tree-slot">tree</div>}
        handContent={<div data-testid="hand-slot">hand</div>}
        phase="move"
        activePlayerName="Alice"
        illumination={3}
        separation={1}
        shells={EMPTY_SHELL_STATE}
      />,
    );
    expect(screen.getByRole('tablist', { name: /view/i })).toBeDefined();
  });

  it('switches to tree view when Tree tab is clicked', async () => {
    const onSetView = vi.fn();
    renderSurface({ activeView: 'hand', onSetView });
    await userEvent.click(screen.getByRole('tab', { name: /tree/i }));
    expect(onSetView).toHaveBeenCalledWith('tree');
  });

  it('switches to hand view when Hand tab is clicked', async () => {
    const onSetView = vi.fn();
    renderSurface({ activeView: 'tree', onSetView });
    await userEvent.click(screen.getByRole('tab', { name: /hand/i }));
    expect(onSetView).toHaveBeenCalledWith('hand');
  });
});
