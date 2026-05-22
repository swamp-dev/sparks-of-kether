import { test, expect } from '@playwright/test';

/**
 * End-to-end tests for ShellStrip (#14 — collapse dormant Shells to compact
 * strip). Exercises the expand/collapse interaction that unit tests cover at
 * the component level; this file proves the behaviour survives in the real
 * DOM with Playwright event dispatch.
 *
 * Navigation reuses the same sign-pick → ritual → lobby → Begin flow as
 * play-flow.spec.ts. Test descriptions are intentionally terse — the e2e
 * suite documents integration boundaries, not spec prose.
 */

test.skip(
  !process.env['PLAYWRIGHT_BROWSERS_INSTALLED'],
  'Set PLAYWRIGHT_BROWSERS_INSTALLED=1 after `pnpm exec playwright install chromium`',
);

/** Navigate to the play screen via the hot-seat flow, return the page. */
async function goToPlayScreen(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /begin the ascent/i }).click();
  const hotseatLink = page.getByRole('link', { name: /Hot-seat/i });
  await hotseatLink.waitFor({ state: 'visible' });
  await hotseatLink.click();
  await page.waitForURL('**/play');

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

  await page.getByRole('button', { name: /^Begin$/ }).click();
  await expect(page.locator('[data-play-screen]')).toBeVisible();
}

test('shell strip renders with dormant shells in compact mode', async ({ page }) => {
  await goToPlayScreen(page);
  const strip = page.locator('[data-shell-strip]');
  await expect(strip).toBeVisible();
  // All 10 shells are dormant at game start — each gets a compact button.
  const buttons = strip.locator('button');
  await expect(buttons).toHaveCount(10);
});

test('clicking a compact shell button expands its detail panel', async ({ page }) => {
  await goToPlayScreen(page);
  const kether = page.getByRole('button', { name: /fragmentation/i });
  await expect(kether).toBeVisible();
  await expect(kether).toHaveAttribute('aria-expanded', 'false');

  await kether.click();

  await expect(kether).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('[data-shell-expand-panel="kether"]')).toBeVisible();
});

test('clicking the same shell button again collapses the panel', async ({ page }) => {
  await goToPlayScreen(page);
  const kether = page.getByRole('button', { name: /fragmentation/i });
  await kether.click();
  await expect(page.locator('[data-shell-expand-panel="kether"]')).toBeVisible();
  await kether.click();
  await expect(page.locator('[data-shell-expand-panel="kether"]')).not.toBeVisible();
});

test('opening a second shell closes the first', async ({ page }) => {
  await goToPlayScreen(page);
  const kether = page.getByRole('button', { name: /fragmentation/i });
  const chokmah = page.getByRole('button', { name: /paralysis/i });

  await kether.click();
  await expect(page.locator('[data-shell-expand-panel="kether"]')).toBeVisible();

  await chokmah.click();
  await expect(page.locator('[data-shell-expand-panel="kether"]')).not.toBeVisible();
  await expect(page.locator('[data-shell-expand-panel="chokmah"]')).toBeVisible();
});
