import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { AxeResults } from 'axe-core';
import { SettingsButton } from '../SettingsButton';
import { SoundSettingsProvider } from '@/lib/sound/settings';

function expectNoViolations(results: AxeResults): void {
  if (results.violations.length === 0) return;
  const summary = results.violations
    .map((v) => `  - [${v.id}] ${v.help} (${v.nodes.length} nodes)`)
    .join('\n');
  throw new Error(`axe found ${results.violations.length} violation(s):\n${summary}`);
}

function renderWithQuit(onQuit?: () => void): ReturnType<typeof render> {
  return render(
    <SoundSettingsProvider>
      <SettingsButton {...(onQuit !== undefined ? { onQuit } : {})} />
    </SoundSettingsProvider>,
  );
}

describe('SettingsButton — quit flow', () => {
  it('does not show Leave Game when onQuit is not provided', async () => {
    const user = userEvent.setup();
    renderWithQuit();
    await user.click(screen.getByRole('button', { name: /settings/i }));
    expect(screen.queryByRole('button', { name: /leave game/i })).not.toBeInTheDocument();
  });

  it('shows Leave Game button in popover when onQuit is provided', async () => {
    const user = userEvent.setup();
    renderWithQuit(vi.fn());
    await user.click(screen.getByRole('button', { name: /settings/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: /leave game/i })).toBeInTheDocument();
  });

  it('shows confirmation prompt after clicking Leave Game', async () => {
    const user = userEvent.setup();
    renderWithQuit(vi.fn());
    await user.click(screen.getByRole('button', { name: /settings/i }));
    await user.click(screen.getByRole('button', { name: /leave game/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls onQuit when the confirmation button is clicked', async () => {
    const onQuit = vi.fn();
    const user = userEvent.setup();
    renderWithQuit(onQuit);
    await user.click(screen.getByRole('button', { name: /settings/i }));
    await user.click(screen.getByRole('button', { name: /leave game/i }));
    await user.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onQuit).toHaveBeenCalledOnce();
    // The popover deliberately stays open after onQuit fires — the component
    // does not call close() itself. In production onQuit triggers navigation
    // which unmounts the whole component. If the quit behaviour ever changes
    // to a soft transition (fade-out animation) where the component remains mounted,
    // add an assertion here that the confirm/cancel buttons are no longer
    // visible to catch dangling confirm-state regressions.
  });

  it('returns to normal state when Cancel is clicked', async () => {
    const onQuit = vi.fn();
    const user = userEvent.setup();
    renderWithQuit(onQuit);
    await user.click(screen.getByRole('button', { name: /settings/i }));
    await user.click(screen.getByRole('button', { name: /leave game/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: /leave game/i })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument();
    expect(onQuit).not.toHaveBeenCalled();
  });

  it('resets confirmation state when the popover is closed and reopened', async () => {
    const user = userEvent.setup();
    renderWithQuit(vi.fn());
    await user.click(screen.getByRole('button', { name: /settings/i }));
    await user.click(screen.getByRole('button', { name: /leave game/i }));
    // Confirmation showing — close with Escape
    await user.keyboard('{Escape}');
    // Reopen — should show Leave Game, not Confirm
    await user.click(screen.getByRole('button', { name: /settings/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: /leave game/i })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument();
  });

  it('confirmation state has no axe violations', async () => {
    const user = userEvent.setup();
    const { container } = renderWithQuit(vi.fn());
    await user.click(screen.getByRole('button', { name: /settings/i }));
    await user.click(screen.getByRole('button', { name: /leave game/i }));
    expectNoViolations((await axe(container)) as AxeResults);
  });
});
