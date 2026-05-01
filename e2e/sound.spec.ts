import { test, expect } from '@playwright/test';

/**
 * e2e for the sound design system (#321).
 *
 * Pins the structural contract:
 *   - The settings cog button is reachable on `/play`.
 *   - The popover opens, exposes the Sound switch + reduced-motion
 *     status, and closes via Esc.
 *   - The Sound toggle persists to `localStorage` under the agreed
 *     key so a reload preserves the user's choice.
 *
 * Driving an actual audio playback through Playwright is brittle —
 * autoplay policy, decoded-buffer state, browser-specific timing —
 * so the spec asserts on the wiring (DOM + storage) rather than on
 * an `<audio>` event. The unit tests in `lib/sound/__tests__/` pin
 * the throttling + lazy-load behaviour against a stubbed Audio
 * constructor, which is the right level for that detail.
 */

test.skip(
  !process.env['PLAYWRIGHT_BROWSERS_INSTALLED'],
  'Set PLAYWRIGHT_BROWSERS_INSTALLED=1 after `pnpm exec playwright install chromium`',
);

test('settings cog opens, toggles sound, persists to localStorage, closes via Esc', async ({
  page,
}) => {
  // Walk the standard hot-seat onboarding so we land on the play
  // screen — that's where the settings cog is mounted.
  await page.goto('/');
  await page.getByRole('button', { name: /begin the ascent/i }).click();
  const hotseatLink = page.getByRole('link', { name: /Hot-seat/i });
  await hotseatLink.waitFor({ state: 'visible' });
  await hotseatLink.click();
  await page.waitForURL('**/play');

  for (let player = 1; player <= 2; player++) {
    await expect(
      page.getByText(new RegExp(`Player ${player} — Sefirot Blessing`)),
    ).toBeVisible();
    for (let step = 0; step < 10; step++) {
      await page.getByRole('button', { name: /Roll 3d6/i }).click();
      await page.getByRole('button', { name: /^Next$/i }).click();
    }
    await expect(
      page.getByRole('heading', { name: /The Tree has spoken/i }),
    ).toBeVisible();
    await page.getByRole('button', { name: /^Continue$/ }).click();
    await expect(
      page.getByRole('heading', { name: /Choose your sign/i }),
    ).toBeVisible();
    if (player === 2) {
      const nextArrow = page
        .getByRole('button', { name: /^Next sign$/ })
        .first();
      for (let i = 0; i < 4; i++) {
        await nextArrow.click();
      }
    }
    const signLabel = player === 1 ? 'Aries' : 'Leo';
    await page
      .getByRole('button', { name: new RegExp(`^Confirm ${signLabel}$`) })
      .click();
  }

  await expect(page.getByRole('heading', { name: /^Lobby$/ })).toBeVisible();
  await page.getByRole('button', { name: /^Begin$/ }).click();
  await expect(page.locator('[data-play-screen]')).toBeVisible();

  // Settings cog. The popover is closed by default.
  const cog = page.getByRole('button', { name: /^Settings$/ });
  await expect(cog).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // Open. Switch is OFF (the design default — auto-playing audio is
  // a UX trap; opt-in only).
  await cog.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const soundSwitch = dialog.getByRole('switch', { name: /toggle sound/i });
  await expect(soundSwitch).toHaveAttribute('aria-checked', 'false');

  // Toggle ON.
  await soundSwitch.click();
  await expect(soundSwitch).toHaveAttribute('aria-checked', 'true');

  // localStorage persisted under the agreed key.
  const stored = await page.evaluate(() => window.localStorage.getItem('sok.soundEnabled'));
  expect(stored).toBe('true');

  // Reduced motion is read-only and reflects the system setting
  // (Playwright's default browser reports prefers-reduced-motion:
  // no-preference, so the surfaced status reads "off" — the row is
  // present either way). Match the heading exactly so we don't
  // strict-mode-collide with the descriptive paragraph below it
  // ("Reduced motion follows your system setting.").
  await expect(
    dialog.getByText(/^reduced motion$/i),
  ).toBeVisible();

  // Esc closes the popover.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
