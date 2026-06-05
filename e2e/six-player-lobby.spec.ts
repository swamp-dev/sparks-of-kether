import { test, expect } from '@playwright/test';

/**
 * #278 — Six-player lobby path coverage.
 *
 * Drives the maximum-player-count path end-to-end: home → setup
 * (6 players) → all 6 players through sign pick + blessing ritual →
 * lobby → Begin → play screen renders.
 *
 * This confirms that:
 *   - The count-picker accepts "6".
 *   - The setup flow loops correctly for all 6 players.
 *   - Sign uniqueness is enforced by cycling past taken signs.
 *   - The lobby renders with all 6 players ready and Begin enabled.
 *   - `initializeGame` with 6 players produces a play screen without
 *     crashing (engine was gated to 4 before #272).
 *
 * Skip pattern matches the project convention.
 */

test.skip(
  !process.env['PLAYWRIGHT_BROWSERS_INSTALLED'],
  'Set PLAYWRIGHT_BROWSERS_INSTALLED=1 after `pnpm exec playwright install chromium`',
);

/**
 * Sign pick sequences for each of the 6 players.
 *
 * Carousel order (indices 0–11):
 *   0:aries 1:taurus 2:gemini 3:cancer 4:leo 5:virgo
 *   6:libra 7:scorpio 8:sagittarius 9:capricorn 10:aquarius 11:pisces
 *
 * #370: carousel opens at first un-taken sign (wrapping).
 *
 * P1 → aries (0): default, 0 clicks.
 * P2 → opens at taurus (1). Want leo (4): +3 clicks.
 * P3 → opens at taurus (1) (aries+leo taken). Want gemini (2): +1 click.
 * P4 → opens at taurus (1) (aries+leo+gemini taken). Want cancer (3): +1 click.
 *      Next skips taken signs, so taurus→(skip gemini)→cancer in one click.
 * P5 → opens at taurus (1) (aries+leo+gemini+cancer taken). Want taurus: 0 clicks.
 * P6 → opens at virgo (5) (aries+taurus+gemini+cancer+leo taken). Want virgo: 0 clicks.
 */
const SIX_PLAYERS: Array<{ label: string; nextClicks: number }> = [
  { label: 'Aries', nextClicks: 0 },
  { label: 'Leo', nextClicks: 3 },
  { label: 'Gemini', nextClicks: 1 },
  { label: 'Cancer', nextClicks: 1 },
  { label: 'Taurus', nextClicks: 0 },
  { label: 'Virgo', nextClicks: 0 },
];

test('6-player: home → setup (6 players) → all sign + ritual → lobby → play screen', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /sparks of kether/i })).toBeVisible();
  await page.getByRole('button', { name: /begin the ascent/i }).click();
  const hotseatLink = page.getByRole('link', { name: /Hot-seat/i });
  await hotseatLink.waitFor({ state: 'visible' });
  await hotseatLink.click();
  await page.waitForURL('**/play');

  // Select 6 players.
  await page.getByRole('button', { name: '6' }).click();

  // Walk all 6 players through sign pick + blessing ritual.
  for (let i = 0; i < SIX_PLAYERS.length; i++) {
    const { label, nextClicks } = SIX_PLAYERS[i]!;

    // Sign pick.
    await expect(page.getByRole('heading', { name: /Choose your sign/i })).toBeVisible();
    if (nextClicks > 0) {
      const nextArrow = page.getByRole('button', { name: /^Next sign$/ }).first();
      for (let c = 0; c < nextClicks; c++) {
        await nextArrow.click();
      }
    }
    await page.getByRole('button', { name: new RegExp(`^Confirm ${label}$`) }).click();

    // Blessing ritual — 10 Sefirot.
    await expect(page.getByText(new RegExp(`Player ${i + 1} — Sefirot Blessing`))).toBeVisible();
    for (let step = 0; step < 10; step++) {
      await page.getByRole('button', { name: /Roll 3d6/i }).click();
      await page.getByRole('button', { name: /^Next$/i }).click();
    }
    await expect(page.getByRole('heading', { name: /The Tree has spoken/i })).toBeVisible();
    await page.getByRole('button', { name: /^Continue$/ }).click();
  }

  // Lobby: all 6 players ready; Begin enabled.
  await expect(page.getByRole('heading', { name: /^Lobby$/ })).toBeVisible();
  const begin = page.getByRole('button', { name: /^Begin$/ });
  await expect(begin).toBeEnabled();
  await begin.click();

  // Play screen renders for a 6-player game.
  await expect(page.locator('[data-play-screen]')).toBeVisible();
  await expect(page.locator('[data-hand]')).toBeVisible();
  await expect(page.locator('[data-play-screen]')).toHaveAttribute('data-phase', 'move');
});
