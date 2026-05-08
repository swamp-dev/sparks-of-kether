import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { AxeResults } from 'axe-core';
import { SettingsButton } from '../SettingsButton';
import { SoundSettingsProvider, SOUND_ENABLED_STORAGE_KEY } from '@/lib/sound/settings';

// Mirrors the helper in components/__tests__/a11y.test.tsx —
// vitest-axe 0.1.0's matcher fights vitest 4's expect-context, so
// assert on .violations directly. (Same coverage, simpler surface.)
function expectNoViolations(results: AxeResults): void {
  if (results.violations.length === 0) return;
  const summary = results.violations
    .map((v) => `  - [${v.id}] ${v.help} (${v.nodes.length} nodes)`)
    .join('\n');
  throw new Error(`axe found ${results.violations.length} violation(s):\n${summary}`);
}

/**
 * Settings button + popover for the play surface (#321).
 *
 * - Floating cog button bottom-right of game pages.
 * - Opens a popover with Sound on/off + reduced-motion read-out.
 * - Reduced-motion is read-only (system-driven); copy reflects the
 *   user's current `prefers-reduced-motion` value.
 * - Toggling Sound persists to `localStorage` (already covered by
 *   the settings test; this spec checks the wiring at the UI layer).
 * - Esc closes the popover.
 * - Focus trap: Tab cycles within the popover.
 * - Axe-clean.
 */

function renderWithProvider(): ReturnType<typeof render> {
  return render(
    <SoundSettingsProvider>
      <SettingsButton />
    </SoundSettingsProvider>,
  );
}

const setReducedMotion = (reduce: boolean): void => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion: reduce') ? reduce : false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }));
};

describe('SettingsButton', () => {
  beforeEach(() => {
    localStorage.clear();
    setReducedMotion(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders a labeled cog button by default', () => {
    renderWithProvider();
    const button = screen.getByRole('button', { name: /settings/i });
    expect(button).toBeInTheDocument();
    // The popover is closed initially.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the popover when the cog is clicked', async () => {
    const user = userEvent.setup();
    renderWithProvider();
    await user.click(screen.getByRole('button', { name: /settings/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('toggles soundEnabled when the sound switch is flipped', async () => {
    const user = userEvent.setup();
    renderWithProvider();
    await user.click(screen.getByRole('button', { name: /settings/i }));
    const dialog = screen.getByRole('dialog');
    const soundSwitch = within(dialog).getByRole('switch', { name: /sound/i });
    expect(soundSwitch).toHaveAttribute('aria-checked', 'false');
    await user.click(soundSwitch);
    expect(soundSwitch).toHaveAttribute('aria-checked', 'true');
    expect(localStorage.getItem(SOUND_ENABLED_STORAGE_KEY)).toBe('true');
  });

  it('shows reduced-motion as a read-only system-driven status', async () => {
    setReducedMotion(true);
    const user = userEvent.setup();
    renderWithProvider();
    await user.click(screen.getByRole('button', { name: /settings/i }));
    const dialog = screen.getByRole('dialog');
    // The reduced-motion row shows "On" or similar status copy and is
    // not interactive (no role="switch", just a status reading).
    const status = within(dialog).getByTestId('reduced-motion-status');
    expect(status).toHaveTextContent(/on|reduce/i);
  });

  it('closes the popover when Escape is pressed', async () => {
    const user = userEvent.setup();
    renderWithProvider();
    await user.click(screen.getByRole('button', { name: /settings/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the popover when the close button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProvider();
    await user.click(screen.getByRole('button', { name: /settings/i }));
    const dialog = screen.getByRole('dialog');
    const close = within(dialog).getByRole('button', { name: /close/i });
    await user.click(close);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('returns focus to the trigger when the popover closes', async () => {
    const user = userEvent.setup();
    renderWithProvider();
    const trigger = screen.getByRole('button', { name: /settings/i });
    await user.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it('is axe-clean when closed and when open', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProvider();
    expectNoViolations(await axe(container));
    await user.click(screen.getByRole('button', { name: /settings/i }));
    expectNoViolations(await axe(container));
  });
});
