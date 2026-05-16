import { test, expect } from '@playwright/test';

/**
 * Codex e2e smoke (#320). Pins the cross-link contract: the Codex
 * index renders all categories, clicking a Sefirah link lands on
 * the right detail page, and the detail page surfaces expected
 * symbolic content.
 */

test.skip(
  !process.env['PLAYWRIGHT_BROWSERS_INSTALLED'],
  'Set PLAYWRIGHT_BROWSERS_INSTALLED=1 after `pnpm exec playwright install chromium`',
);

test('Codex: index links to Tiferet detail page with expected content', async ({ page }) => {
  await page.goto('/codex');
  await expect(page.getByRole('heading', { level: 1, name: /codex/i })).toBeVisible();

  // Click the Tiferet link (transliteration is in the link text via
  // the data-codex-sefirah-link attribute we render in the index).
  const tiferetLink = page.locator('[data-codex-sefirah-link="tiferet"]');
  await expect(tiferetLink).toBeVisible();
  await tiferetLink.click();

  // Land on the Sefirah detail page.
  await page.waitForURL('**/sefirah/tiferet');
  await expect(page.getByRole('heading', { level: 1, name: /^beauty$/i })).toBeVisible();

  // Spot-check expected symbolic content.
  await expect(page.getByText(/know yourself/i)).toBeVisible();
  await expect(page.getByText(/sun/i).first()).toBeVisible();
  // Strict-mode-safe: match the heading specifically (the descriptive
  // paragraph below it ALSO contains "Vanity — the Tiferet Soul …").
  await expect(page.getByRole('heading', { name: /shell of beauty — vanity/i })).toBeVisible();

  // Hebrew element with proper lang/dir.
  const hebrew = page.locator('[lang="he"][dir="rtl"]').first();
  await expect(hebrew).toBeVisible();
});

test('Codex: Path 22 detail links back to Justice arcanum and both endpoint Sefirot', async ({
  page,
}) => {
  await page.goto('/path/22');
  await expect(page.getByRole('heading', { level: 1, name: /path 22/i })).toBeVisible();

  // Path 22 (Lamed) walks Justice (arcanum 11), connecting Gevurah
  // and Tiferet.
  await expect(page.locator('a[href="/arcana/11"]').first()).toBeVisible();
  await expect(page.locator('a[href="/sefirah/gevurah"]').first()).toBeVisible();
  await expect(page.locator('a[href="/sefirah/tiferet"]').first()).toBeVisible();
});
