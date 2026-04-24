import { test, expect } from '@playwright/test';

/**
 * Playwright smoke test. Serves as the template for richer end-to-end
 * flows once multiplayer and room-join land (Phase 5).
 *
 * The browser download is optional for CI; this spec will simply be
 * skipped if playwright install hasn't been run.
 */

test.skip(
  !process.env['PLAYWRIGHT_BROWSERS_INSTALLED'],
  'Set PLAYWRIGHT_BROWSERS_INSTALLED=1 after `pnpm exec playwright install chromium`',
);

test('home page renders the title', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /sparks of kether/i })).toBeVisible();
});
