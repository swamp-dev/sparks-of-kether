import { test, expect } from '@playwright/test';

/**
 * End-to-end integration test for the play flow.
 *
 * Walks through:
 *   home → /play → P1 ritual (10 steps) → P1 aspect pick → P2 ritual
 *   → P2 aspect pick → lobby → Begin → play screen renders
 *
 * This is the test that exists specifically to catch the integration
 * bugs unit tests can't see — prop-shape mismatches between engine
 * output and UI inputs, focus management across phase transitions,
 * SVG sizing, modal stacking. Whatever a real player would notice
 * within the first sixty seconds of pressing Begin.
 *
 * Skip pattern matches the project convention: this test runs only
 * when `PLAYWRIGHT_BROWSERS_INSTALLED=1` is set after running
 * `pnpm exec playwright install chromium`. CI workflows that enable
 * e2e flip the flag.
 */

test.skip(
  !process.env['PLAYWRIGHT_BROWSERS_INSTALLED'],
  'Set PLAYWRIGHT_BROWSERS_INSTALLED=1 after `pnpm exec playwright install chromium`',
);

test('home → setup → lobby → play screen renders', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /sparks of kether/i }),
  ).toBeVisible();
  // Use the hot-seat / single-machine link, not the new
  // multiplayer "New game" button (which depends on Supabase).
  await page.getByRole('link', { name: /Hot-seat/i }).click();

  // Walk both players through the blessing ritual + aspect pick.
  for (let player = 1; player <= 2; player++) {
    await expect(
      page.getByText(new RegExp(`Player ${player} — Sefirot Blessing`)),
    ).toBeVisible();

    // Ten steps: Roll 3d6 → Receive this blessing.
    for (let step = 0; step < 10; step++) {
      await page.getByRole('button', { name: /Roll 3d6/i }).click();
      await page.getByRole('button', { name: /Receive this blessing/i }).click();
    }

    // #215: the ritual now pauses on a Summary screen so the user
    // sees their final stats before advancing. Click Continue to
    // transition to the Soul Aspect picker.
    await expect(
      page.getByRole('heading', { name: /The Tree has spoken/i }),
    ).toBeVisible();
    await page.getByRole('button', { name: /^Continue$/ }).click();

    await expect(
      page.getByRole('heading', { name: /Choose your Soul Aspect/i }),
    ).toBeVisible();

    // Pick the first available aspect (avoids the one taken by P1).
    // Player 1 takes The Heart (Tiferet); Player 2 takes The Giver
    // (Chesed) — both available at their respective steps.
    const aspectName = player === 1 ? 'The Heart' : 'The Giver';
    await page
      .getByRole('button', { name: new RegExp(aspectName, 'i') })
      .first()
      .click();
    await page.getByRole('button', { name: /^Confirm$/ }).click();
  }

  // Lobby: both players ready; Begin enabled.
  await expect(page.getByRole('heading', { name: /^Lobby$/ })).toBeVisible();
  const begin = page.getByRole('button', { name: /^Begin$/ });
  await expect(begin).toBeEnabled();
  await begin.click();

  // Play screen renders. Verify the integration boundary surfaced
  // the things a player would expect: the Tree, a hand, stat sheet,
  // meters, shell panel.
  await expect(page.locator('[data-play-screen]')).toBeVisible();
  await expect(page.locator('[data-team-meters]')).toBeVisible();
  await expect(page.locator('[data-shell-panel]')).toBeVisible();
  await expect(page.locator('[data-hand]')).toBeVisible();
  await expect(page.locator('[data-stat-sheet]')).toBeVisible();
  // Tree is a figure with the right title.
  await expect(
    page.getByRole('figure').filter({ hasText: /Tree of Life/i }).first(),
  ).toBeVisible();

  // Phase machine should land in 'move' for the first turn.
  await expect(page.locator('[data-play-screen]')).toHaveAttribute(
    'data-phase',
    'move',
  );
});
