import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { AxeResults } from 'axe-core';
import { SettingsButton } from '../SettingsButton';
import {
  SoundSettingsProvider,
  SFX_ENABLED_STORAGE_KEY,
  MUSIC_ENABLED_STORAGE_KEY,
} from '@/lib/sound/settings';

function expectNoViolations(results: AxeResults): void {
  if (results.violations.length === 0) return;
  const summary = results.violations
    .map((v) => `  - [${v.id}] ${v.help} (${v.nodes.length} nodes)`)
    .join('\n');
  throw new Error(`axe found ${results.violations.length} violation(s):\n${summary}`);
}

/**
 * Settings button + popover (#321, #76, #77).
 *
 * - Floating cog button bottom-right of game pages.
 * - Opens a popover with two toggles: Sound effects (SFX) + Music.
 * - SFX defaults ON; Music defaults OFF.
 * - Reduced-motion is read-only (system-driven).
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
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
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
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the popover when the cog is clicked', async () => {
    const user = userEvent.setup();
    renderWithProvider();
    await user.click(screen.getByRole('button', { name: /settings/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('SFX toggle defaults ON and persists to localStorage', async () => {
    const user = userEvent.setup();
    renderWithProvider();
    await user.click(screen.getByRole('button', { name: /settings/i }));
    const dialog = screen.getByRole('dialog');
    const sfxSwitch = within(dialog).getByRole('switch', { name: /sound effects/i });
    expect(sfxSwitch).toHaveAttribute('aria-checked', 'true');

    await user.click(sfxSwitch);
    expect(sfxSwitch).toHaveAttribute('aria-checked', 'false');
    expect(localStorage.getItem(SFX_ENABLED_STORAGE_KEY)).toBe('false');
  });

  it('Music toggle defaults OFF and persists to localStorage', async () => {
    const user = userEvent.setup();
    renderWithProvider();
    await user.click(screen.getByRole('button', { name: /settings/i }));
    const dialog = screen.getByRole('dialog');
    const musicSwitch = within(dialog).getByRole('switch', { name: /music/i });
    expect(musicSwitch).toHaveAttribute('aria-checked', 'false');

    await user.click(musicSwitch);
    expect(musicSwitch).toHaveAttribute('aria-checked', 'true');
    expect(localStorage.getItem(MUSIC_ENABLED_STORAGE_KEY)).toBe('true');
  });

  it('shows reduced-motion as a read-only system-driven status', async () => {
    setReducedMotion(true);
    const user = userEvent.setup();
    renderWithProvider();
    await user.click(screen.getByRole('button', { name: /settings/i }));
    const dialog = screen.getByRole('dialog');
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
