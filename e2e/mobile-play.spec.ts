import { test, expect, type Page } from '@playwright/test';

/**
 * Mobile play flow — #15.
 *
 * Verifies the tab pattern at 375×667 (iPhone SE viewport). Walks the
 * full setup flow, enters the play screen, then exercises the Tree / Hand
 * tab toggle and the card-select → auto-switch-to-tree behaviour.
 *
 * Skip pattern matches the project convention: only runs when
 * `PLAYWRIGHT_BROWSERS_INSTALLED=1` is set after `pnpm exec playwright install chromium`.
 */

test.skip(
  !process.env['PLAYWRIGHT_BROWSERS_INSTALLED'],
  'Set PLAYWRIGHT_BROWSERS_INSTALLED=1 after `pnpm exec playwright install chromium`',
);

test.use({ viewport: { width: 375, height: 667 } });

async function reachPlayScreen(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /begin the ascent/i }).click();
  const hotseatLink = page.getByRole('link', { name: /Hot-seat/i });
  await hotseatLink.waitFor({ state: 'visible' });
  await hotseatLink.click();
  await page.waitForURL('**/play');

  // 2-player hot-seat setup.
  await page.getByRole('button', { name: '2' }).click();

  for (let player = 1; player <= 2; player++) {
    await expect(page.getByRole('heading', { name: /Choose your sign/i })).toBeVisible();
    if (player === 2) {
      const nextArrow = page.getByRole('button', { name: /^Next sign$/ }).first();
      for (let i = 0; i < 3; i++) {
        await nextArrow.click();
      }
    }
    const signLabel = player === 1 ? 'Aries' : 'Leo';
    await page.getByRole('button', { name: new RegExp(`^Confirm ${signLabel}$`) }).click();

    await expect(page.getByText(new RegExp(`Player ${player} — Sefirot Blessing`))).toBeVisible();
    for (let step = 0; step < 10; step++) {
      await page.getByRole('button', { name: /Roll 3d6/i }).click();
      await page.getByRole('button', { name: /^Next$/i }).click();
    }
    await expect(page.getByRole('heading', { name: /The Tree has spoken/i })).toBeVisible();
    await page.getByRole('button', { name: /^Continue$/ }).click();
  }

  await expect(page.getByRole('heading', { name: /^Lobby$/ })).toBeVisible();
  const begin = page.getByRole('button', { name: /^Begin$/ });
  await expect(begin).toBeEnabled();
  await begin.click();

  // Wait for MobilePlaySurface to be visible (isMobile flips after mount).
  await page.locator('[data-testid="mobile-play-surface"]').waitFor({ state: 'visible' });
}

test('mobile: MobilePlaySurface renders with Tree and Hand tabs', async ({ page }) => {
  await reachPlayScreen(page);

  // Tab list is present with Tree and Hand tabs.
  const tablist = page.getByRole('tablist', { name: /view/i });
  await expect(tablist).toBeVisible();
  const treeTab = page.getByRole('tab', { name: /tree/i });
  const handTab = page.getByRole('tab', { name: /hand/i });
  await expect(treeTab).toBeVisible();
  await expect(handTab).toBeVisible();

  // Tree tab is selected by default.
  await expect(treeTab).toHaveAttribute('aria-selected', 'true');
  await expect(handTab).toHaveAttribute('aria-selected', 'false');
});

test('mobile: Hand tab shows the hand; Tree tab shows the tree', async ({ page }) => {
  await reachPlayScreen(page);

  // Tree view is active by default — tree board is visible.
  const treeFigure = page
    .getByRole('figure')
    .filter({ hasText: /Tree of Life/i })
    .first();
  await expect(treeFigure).toBeVisible();

  // Switch to Hand view.
  await page.getByRole('tab', { name: /hand/i }).click();
  await expect(page.getByRole('tab', { name: /hand/i })).toHaveAttribute('aria-selected', 'true');

  // Hand panel is now visible; tree panel is hidden.
  await expect(page.locator('[data-hand]')).toBeVisible();
  await expect(treeFigure).not.toBeVisible();

  // Switch back to Tree view.
  await page.getByRole('tab', { name: /tree/i }).click();
  await expect(page.getByRole('tab', { name: /tree/i })).toHaveAttribute('aria-selected', 'true');
  await expect(treeFigure).toBeVisible();
});

test('mobile: selecting a card auto-switches to Tree view', async ({ page }) => {
  await reachPlayScreen(page);

  // Switch to Hand view first.
  await page.getByRole('tab', { name: /hand/i }).click();
  await expect(page.locator('[data-hand]')).toBeVisible();

  // Tap the first card.
  const card0 = page.locator('[data-card-slot="0"]');
  await expect(card0).toBeVisible();
  await card0.click({ timeout: 5_000 });

  // Should auto-switch to Tree view.
  await expect(page.getByRole('tab', { name: /tree/i })).toHaveAttribute('aria-selected', 'true');
  // Card remains selected.
  await expect(card0).toHaveAttribute('data-selected', 'true');
});

test('mobile: HUD phase hint and player name are visible', async ({ page }) => {
  await reachPlayScreen(page);

  const hud = page.locator('[data-testid="mobile-hud"]');
  await expect(hud).toBeVisible();
  await expect(page.locator('[data-testid="mobile-phase-hint"]')).toBeVisible();
  await expect(page.locator('[data-testid="mobile-player-name"]')).toBeVisible();
});
