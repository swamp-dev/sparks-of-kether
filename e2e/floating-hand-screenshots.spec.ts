import { test, type Page } from '@playwright/test';

/**
 * #579 — manual visual capture of the floating-Hand magnified state.
 * The visual-regression spec captures rest state only (no hover);
 * this spec is dev-tooling-only (gated on PLAYWRIGHT_RUN_REVIEW=1)
 * and produces an interactive-state snapshot under
 * `e2e/__screenshots__/floating-hand-*.png` that the implementer
 * eyeballs to verify the magnify + path-light visual feel.
 *
 * Not committed as a baseline — these snapshots are reproducible by
 * running `PLAYWRIGHT_RUN_REVIEW=1 pnpm exec playwright test
 * floating-hand-screenshots`.
 */

test.skip(
  !process.env['PLAYWRIGHT_RUN_REVIEW'],
  'Set PLAYWRIGHT_RUN_REVIEW=1 to capture interactive snapshots.',
);

async function walkToPlayScreen(page: Page): Promise<void> {
  await page.locator('[data-zodiac-sign-picker]').waitFor();
  await page.getByRole('button', { name: /^Confirm Aries$/ }).click();
  await page.locator('[data-action="skip-ceremony"]').click();
  await page.getByRole('button', { name: /^continue$/i }).click();
  await page.locator('[data-zodiac-sign-picker]').waitFor();
  const nextArrow = page.getByRole('button', { name: /^Next sign$/ }).first();
  for (let i = 0; i < 3; i++) {
    await nextArrow.click();
  }
  await page.getByRole('button', { name: /^Confirm Leo$/ }).click();
  await page.locator('[data-action="skip-ceremony"]').click();
  await page.getByRole('button', { name: /^continue$/i }).click();
  await page.getByRole('button', { name: /^begin$/i }).click();
  await page.waitForLoadState('networkidle');
}

test.describe('floating-hand visuals', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('rest state (no hover)', async ({ page }) => {
    await page.goto('/play?seed=1492');
    await walkToPlayScreen(page);
    await page.waitForTimeout(300);
    await page.screenshot({
      path: 'e2e/__screenshots__/floating-hand-rest.png',
      fullPage: false,
    });
  });

  test('magnified state (first card focused)', async ({ page }) => {
    // Focus reliably fires React's onFocus handler regardless of any
    // pointer-routing quirks of headless Chromium against the
    // `pointer-events-none` outer overlay + scaled fan child. The
    // keyboard path and the mouse path share the same `activeIndex`
    // derivation in Hand.tsx, so a focused card produces the same
    // magnified visual a hovered card would in a real interactive
    // session.
    await page.goto('/play?seed=1492');
    await walkToPlayScreen(page);
    await page.waitForTimeout(300);
    const card = page.locator('[data-card-slot]').first();
    await card.focus();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'e2e/__screenshots__/floating-hand-focused.png',
      fullPage: false,
    });
  });
});
