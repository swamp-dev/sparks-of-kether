import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { AxeResults } from 'axe-core';
import { SettingsButton } from '../SettingsButton';
import { SoundSettingsProvider } from '@/lib/sound/settings';
import { PantheonSettingsProvider, PANTHEON_STORAGE_KEY } from '@/lib/settings/pantheon';

/**
 * Pantheon radio group inside SettingsButton (#34).
 *
 * Adds two radios — Greco-Roman (default) and Egyptian — after the
 * Music toggle in the settings popover. Persists the choice to
 * `localStorage` via `usePantheon()`. Arrow keys navigate and
 * immediately select within the group.
 */

function expectNoViolations(results: AxeResults): void {
  if (results.violations.length === 0) return;
  const summary = results.violations
    .map((v) => `  - [${v.id}] ${v.help} (${v.nodes.length} nodes)`)
    .join('\n');
  throw new Error(`axe found ${results.violations.length} violation(s):\n${summary}`);
}

function renderWithProviders(): ReturnType<typeof render> {
  return render(
    <SoundSettingsProvider>
      <PantheonSettingsProvider>
        <SettingsButton />
      </PantheonSettingsProvider>
    </SoundSettingsProvider>,
  );
}

async function openSettings(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
  await user.click(screen.getByRole('button', { name: /settings/i }));
  return screen.getByRole('dialog');
}

function getRadios(dialog: HTMLElement): { grecoRoman: HTMLElement; egyptian: HTMLElement } {
  return {
    grecoRoman: within(dialog).getByRole('radio', { name: /greco-roman/i }),
    egyptian: within(dialog).getByRole('radio', { name: /egyptian/i }),
  };
}

describe('SettingsButton — Pantheon radio group (#34)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders a Pantheon radiogroup inside the settings dialog', async () => {
    const user = userEvent.setup();
    renderWithProviders();
    const dialog = await openSettings(user);
    const group = within(dialog).getByRole('radiogroup', { name: /pantheon/i });
    expect(group).toBeInTheDocument();
  });

  it('shows Greco-Roman and Egyptian as the two radio options', async () => {
    const user = userEvent.setup();
    renderWithProviders();
    const dialog = await openSettings(user);
    const radios = within(dialog).getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(within(dialog).getByRole('radio', { name: /greco-roman/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: /egyptian/i })).toBeInTheDocument();
  });

  it('selects Greco-Roman by default', async () => {
    const user = userEvent.setup();
    renderWithProviders();
    const dialog = await openSettings(user);
    const { grecoRoman, egyptian } = getRadios(dialog);
    expect(grecoRoman).toHaveAttribute('aria-checked', 'true');
    expect(egyptian).toHaveAttribute('aria-checked', 'false');
  });

  it('clicking Egyptian selects it and persists to localStorage', async () => {
    const user = userEvent.setup();
    renderWithProviders();
    const dialog = await openSettings(user);
    const { grecoRoman, egyptian } = getRadios(dialog);
    await user.click(egyptian);
    expect(egyptian).toHaveAttribute('aria-checked', 'true');
    expect(grecoRoman).toHaveAttribute('aria-checked', 'false');
    expect(localStorage.getItem(PANTHEON_STORAGE_KEY)).toBe('egyptian');
  });

  it('clicking Greco-Roman when Egyptian is selected switches back', async () => {
    localStorage.setItem(PANTHEON_STORAGE_KEY, 'egyptian');
    const user = userEvent.setup();
    renderWithProviders();
    const dialog = await openSettings(user);
    const { grecoRoman, egyptian } = getRadios(dialog);
    await user.click(grecoRoman);
    expect(grecoRoman).toHaveAttribute('aria-checked', 'true');
    expect(egyptian).toHaveAttribute('aria-checked', 'false');
    expect(localStorage.getItem(PANTHEON_STORAGE_KEY)).toBe('greco-roman');
  });

  it('ArrowDown from Greco-Roman selects Egyptian', async () => {
    const user = userEvent.setup();
    renderWithProviders();
    const dialog = await openSettings(user);
    const { grecoRoman, egyptian } = getRadios(dialog);
    await user.click(grecoRoman); // focus without changing selection (already selected)
    await user.keyboard('{ArrowDown}');
    expect(egyptian).toHaveAttribute('aria-checked', 'true');
    expect(grecoRoman).toHaveAttribute('aria-checked', 'false');
  });

  it('ArrowRight from Greco-Roman selects Egyptian', async () => {
    const user = userEvent.setup();
    renderWithProviders();
    const dialog = await openSettings(user);
    const { grecoRoman, egyptian } = getRadios(dialog);
    await user.click(grecoRoman);
    await user.keyboard('{ArrowRight}');
    expect(egyptian).toHaveAttribute('aria-checked', 'true');
  });

  it('ArrowUp from Egyptian selects Greco-Roman', async () => {
    localStorage.setItem(PANTHEON_STORAGE_KEY, 'egyptian');
    const user = userEvent.setup();
    renderWithProviders();
    const dialog = await openSettings(user);
    const { grecoRoman, egyptian } = getRadios(dialog);
    await user.click(egyptian); // focus (already selected)
    await user.keyboard('{ArrowUp}');
    expect(grecoRoman).toHaveAttribute('aria-checked', 'true');
    expect(egyptian).toHaveAttribute('aria-checked', 'false');
  });

  it('ArrowDown from Egyptian wraps to Greco-Roman', async () => {
    localStorage.setItem(PANTHEON_STORAGE_KEY, 'egyptian');
    const user = userEvent.setup();
    renderWithProviders();
    const dialog = await openSettings(user);
    const { grecoRoman, egyptian } = getRadios(dialog);
    await user.click(egyptian);
    await user.keyboard('{ArrowDown}');
    expect(grecoRoman).toHaveAttribute('aria-checked', 'true');
  });

  it('ArrowUp from Greco-Roman wraps to Egyptian', async () => {
    const user = userEvent.setup();
    renderWithProviders();
    const dialog = await openSettings(user);
    const { grecoRoman, egyptian } = getRadios(dialog);
    await user.click(grecoRoman);
    await user.keyboard('{ArrowUp}');
    expect(egyptian).toHaveAttribute('aria-checked', 'true');
  });

  it('ArrowLeft from Egyptian selects Greco-Roman', async () => {
    localStorage.setItem(PANTHEON_STORAGE_KEY, 'egyptian');
    const user = userEvent.setup();
    renderWithProviders();
    const dialog = await openSettings(user);
    const { grecoRoman, egyptian } = getRadios(dialog);
    await user.click(egyptian);
    await user.keyboard('{ArrowLeft}');
    expect(grecoRoman).toHaveAttribute('aria-checked', 'true');
  });

  it('selected radio has tabIndex=0 and unselected has tabIndex=-1', async () => {
    const user = userEvent.setup();
    renderWithProviders();
    const dialog = await openSettings(user);
    const { grecoRoman, egyptian } = getRadios(dialog);

    expect(grecoRoman).toHaveAttribute('tabindex', '0');
    expect(egyptian).toHaveAttribute('tabindex', '-1');

    await user.click(egyptian);
    expect(egyptian).toHaveAttribute('tabindex', '0');
    expect(grecoRoman).toHaveAttribute('tabindex', '-1');
  });

  it('unknown stored pantheonId falls back to Greco-Roman having tabIndex=0', async () => {
    localStorage.setItem(PANTHEON_STORAGE_KEY, 'norse'); // future/unknown id
    const user = userEvent.setup();
    renderWithProviders();
    const dialog = await openSettings(user);
    const { grecoRoman, egyptian } = getRadios(dialog);
    // Neither is aria-checked (unknown id doesn't match), but Greco-Roman
    // still holds tabIndex=0 so the group is reachable via Tab.
    expect(grecoRoman).toHaveAttribute('tabindex', '0');
    expect(egyptian).toHaveAttribute('tabindex', '-1');
  });

  it('selected radio is reachable via Tab inside the popover', async () => {
    const user = userEvent.setup();
    renderWithProviders();
    const dialog = await openSettings(user);
    const { grecoRoman } = getRadios(dialog);

    // On open, focus is on the close button. Tab three times: close → sfx → music → radio.
    await user.tab(); // → sfx toggle
    await user.tab(); // → music toggle
    await user.tab(); // → selected radio (Greco-Roman)
    expect(document.activeElement).toBe(grecoRoman);
  });

  it('is axe-clean with both providers', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders();
    expectNoViolations(await axe(container));
    await openSettings(user);
    expectNoViolations(await axe(container));
  });
});
