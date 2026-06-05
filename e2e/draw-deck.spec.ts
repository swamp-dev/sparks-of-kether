import { test, expect, type Page } from '@playwright/test';

/**
 * #25 — visible draw deck end-to-end.
 *
 * Walks setup at the fast-path (skip-rolls), then verifies the draw deck
 * is visible and reflects live engine state:
 *   - Initial count: 2-player game starts with 22 cards − 6 dealt = 16 in deck.
 *   - After each Meditate (which draws HAND_CAP − current_hand cards), deck
 *     count decreases accordingly.
 *
 * Since #502 shipped, there is no 'draw' phase — Meditate is the draw action.
 * The deck is informational only; no click-to-draw.
 *
 * Skip pattern matches the project convention.
 */

test.skip(
  !process.env['PLAYWRIGHT_BROWSERS_INSTALLED'],
  'Set PLAYWRIGHT_BROWSERS_INSTALLED=1 after `pnpm exec playwright install chromium`',
);

async function walkToPlayScreen(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /begin the ascent/i }).click();
  const hotseatLink = page.getByRole('link', { name: /Hot-seat/i });
  await hotseatLink.waitFor({ state: 'visible' });
  await hotseatLink.click();
  await page.waitForURL('**/play');

  // #275: count-picker is now the first phase — select 2 players before sign.
  await page.getByRole('button', { name: '2' }).click();

  // P1: confirm Aries (default-focused), skip-roll the blessing, continue.
  await page.locator('[data-zodiac-sign-picker]').waitFor();
  await page.getByRole('button', { name: /^Confirm Aries$/ }).click();
  await page.locator('[data-action="skip-ceremony"]').click();
  await page.getByRole('button', { name: /^continue$/i }).click();

  // P2: skip to Leo (taurus → gemini → cancer → leo).
  await page.locator('[data-zodiac-sign-picker]').waitFor();
  const nextArrow = page.getByRole('button', { name: /^Next sign$/ }).first();
  for (let i = 0; i < 3; i++) {
    await nextArrow.click();
  }
  await page.getByRole('button', { name: /^Confirm Leo$/ }).click();
  await page.locator('[data-action="skip-ceremony"]').click();
  await page.getByRole('button', { name: /^continue$/i }).click();

  // Lobby → Begin → live PlayScreen.
  await page.getByRole('button', { name: /^begin$/i }).click();
  await expect(page.locator('[data-play-screen]')).toBeVisible();
}

test('draw deck is visible initially with the correct starting count', async ({ page }) => {
  await walkToPlayScreen(page);

  const deck = page.locator('[data-draw-deck]');
  await expect(deck).toBeVisible();
  // 2 players: 22 cards − (2 × 3 dealt) = 16 in the draw deck.
  await expect(deck).toHaveAttribute('data-deck-empty', 'false');
  await expect(page.locator('[data-deck-count]')).toHaveText('16');
  // Stack shadow: 16 > 1.
  await expect(page.locator('[data-deck-stack-shadow]')).toBeVisible();
});

test('draw deck count decreases after Meditate draws cards', async ({ page }) => {
  await walkToPlayScreen(page);

  // Starting: P1 has 3 cards, deck has 16. Meditate draws up to HAND_CAP (5),
  // so it draws 2 cards → deck drops from 16 to 14.
  await expect(page.locator('[data-deck-count]')).toHaveText('16');

  await page.locator('[data-action="meditate"]').click();
  await page.locator('[data-meditate-confirm-confirm]').click();

  await expect(page.locator('[data-deck-count]')).toHaveText('14');
  await expect(page.locator('[data-draw-deck]')).toHaveAttribute('data-deck-empty', 'false');
});
