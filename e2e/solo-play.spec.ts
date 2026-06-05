import { test, expect } from '@playwright/test';

/**
 * #278 — Solo (1-player) path coverage.
 *
 * Two specs:
 *
 *   1. Play-flow smoke: home → setup (1 player) → sign pick → blessing
 *      ritual → lobby → Begin → play screen renders. Mirrors
 *      `play-flow.spec.ts` but for the solo-player count that was
 *      gated by #275 / #277. Confirms the count-picker accepts "1",
 *      the setup flow skips a second player, and the game starts
 *      cleanly.
 *
 *   2. Final Threshold solo coda: exercises the abbreviated single-
 *      voice coda UI from #277 via the `/demo/final-threshold` route
 *      with `?count=1&subPhase=trial`. Verifies the chorus ribbon is
 *      absent and `data-coda-mode="solo"` is set — without needing to
 *      drive a full solo game to Kether.
 *
 * Skip pattern matches the project convention.
 */

test.skip(
  !process.env['PLAYWRIGHT_BROWSERS_INSTALLED'],
  'Set PLAYWRIGHT_BROWSERS_INSTALLED=1 after `pnpm exec playwright install chromium`',
);

test('solo: home → setup (1 player) → sign → ritual → lobby → play screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /sparks of kether/i })).toBeVisible();
  await page.getByRole('button', { name: /begin the ascent/i }).click();
  const hotseatLink = page.getByRole('link', { name: /Hot-seat/i });
  await hotseatLink.waitFor({ state: 'visible' });
  await hotseatLink.click();
  await page.waitForURL('**/play');

  // Select 1 player.
  await page.getByRole('button', { name: '1 player' }).click();

  // Solo player walks through sign pick + blessing ritual.
  await expect(page.getByRole('heading', { name: /Choose your sign/i })).toBeVisible();
  // Default-focused sign (aries) is already selected — confirm immediately.
  await page.getByRole('button', { name: /^Confirm Aries$/ }).click();

  // Blessing ritual — 10 Sefirot.
  await expect(page.getByText(/Player 1 — Sefirot Blessing/)).toBeVisible();
  for (let step = 0; step < 10; step++) {
    await page.getByRole('button', { name: /Roll 3d6/i }).click();
    await page.getByRole('button', { name: /^Next$/i }).click();
  }
  await expect(page.getByRole('heading', { name: /The Tree has spoken/i })).toBeVisible();
  await page.getByRole('button', { name: /^Continue$/ }).click();

  // Lobby: solo player has no one to wait for — Begin must be enabled.
  await expect(page.getByRole('heading', { name: /^Lobby$/ })).toBeVisible();
  const begin = page.getByRole('button', { name: /^Begin$/ });
  await expect(begin).toBeEnabled();
  await begin.click();

  // Play screen renders for solo.
  await expect(page.locator('[data-play-screen]')).toBeVisible();
  await expect(page.locator('[data-hand]')).toBeVisible();
  await expect(page.locator('[data-stat-sheet]')).toBeVisible();
  await expect(page.locator('[data-play-screen]')).toHaveAttribute('data-phase', 'move');
});

test('solo: Final Threshold coda shows data-coda-mode="solo" and no chorus ribbon', async ({
  page,
}) => {
  // Use the demo route to exercise the solo coda without a full game
  // traversal. The `?count=1&subPhase=trial` params load a 1-player
  // fixture with the ritual already initialised (#278 added this path).
  await page.goto('/demo/final-threshold?count=1&subPhase=trial');

  const screen = page.locator('[data-final-threshold-screen]');
  await expect(screen).toBeVisible();
  await expect(screen).toHaveAttribute('data-sub-phase', 'trial');

  // Solo coda attribute — set by #277's TrialPanel changes.
  const panel = page.locator('[data-trial-panel]');
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('data-coda-mode', 'solo');

  // No chorus ribbon for solo — the round-robin order display is absent.
  await expect(page.locator('[data-trial-order]')).not.toBeVisible();

  // Solo player's Roll button is available (their turn is always active).
  await expect(page.locator('[data-action="kether-trial-resolve"]')).toBeVisible();

  // AC #2 from #277: no "waiting for team" text in the solo coda.
  await expect(page.getByText(/Waiting for the rest of the team/i)).not.toBeVisible();
});
