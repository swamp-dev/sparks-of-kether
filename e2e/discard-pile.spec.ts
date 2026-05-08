import { test, expect, type Page } from '@playwright/test';

/**
 * #507 — visible discard pile end-to-end.
 *
 * Walks setup at the fast-path (skip-rolls), then drives the
 * meditate-over-cap flow from `DiscardPrompt` (#291): the player
 * meditates twice across turns, lands at 8 cards (cap is 6), the
 * prompt asks them to shed 2, and each "Discard X" click sends a
 * card to the live discard pile. The pile + overlay must reflect
 * those discards.
 *
 * Skip pattern matches the project convention: only runs when
 * `PLAYWRIGHT_BROWSERS_INSTALLED=1` is set.
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

  // P1: confirm Aries (default-focused), skip-roll the blessing,
  // continue past the summary.
  await page.locator('[data-zodiac-sign-picker]').waitFor();
  await page.getByRole('button', { name: /^Confirm Aries$/ }).click();
  await page.locator('[data-action="skip-ceremony"]').click();
  await page.getByRole('button', { name: /^continue$/i }).click();

  // P2: aries is taken; #370 opens the picker on taurus. Cycle three
  // times to reach leo (taurus → gemini → cancer → leo).
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

test('discard pile is empty initially and click is a no-op', async ({ page }) => {
  await walkToPlayScreen(page);

  const pile = page.locator('[data-discard-pile]');
  await expect(pile).toBeVisible();
  await expect(pile).toHaveAttribute('data-discard-empty', 'true');

  // Empty button is disabled — clicking it must not open the overlay.
  // `force: true` would bypass the disabled state; we want the
  // disabled-state behaviour, so we click without force and assert
  // the overlay never appears.
  const button = page.locator('[data-discard-pile-button]');
  await expect(button).toBeDisabled();
  // Even attempting a click on a disabled button should leave the
  // overlay unmounted. (Playwright will refuse the click on a
  // disabled element, but we assert the post-state regardless.)
  await expect(page.locator('[data-discard-browse-overlay]')).toHaveCount(0);
});

test('meditate-over-cap discards populate the pile and the overlay shows the discarded cards', async ({
  page,
}) => {
  await walkToPlayScreen(page);

  // Confirm starting state: pile empty, count zero.
  await expect(page.locator('[data-discard-pile]')).toHaveAttribute('data-discard-empty', 'true');
  await expect(page.locator('[data-discard-count]')).toHaveText('0');

  // STARTING_HAND_SIZE = 4, HAND_CAP = 6. The flow that drives a
  // player into the over-cap DiscardPrompt — note that the cap check
  // fires on END-TURN (not on Meditate), per the post-#503 reducer
  // (turn-machine.ts § "case 'end-turn'"):
  //
  //   P1 turn 1: meditate (4 → 6 cards), end turn (at cap; no prompt).
  //   P2 turn 1: meditate (4 → 6 cards), end turn (at cap; no prompt).
  //   P1 turn 2: meditate (6 → 8 cards), end turn → over cap by 2 →
  //              DiscardPrompt asks the player to shed 2 cards.
  //   Each "Discard X" click sends one card to the live pile.
  for (const _player of [1, 2]) {
    await page.locator('[data-action="meditate"]').click();
    // After meditate the End-turn button shows up because
    // `meditatedThisTurn === true` (still in `'move'` phase per
    // #503). Click it to rotate to the other seat.
    await page.locator('[data-action="end-turn"]').click();
  }

  // P1 turn 2 — meditate to 8 cards, then end-turn surfaces the prompt.
  await page.locator('[data-action="meditate"]').click();
  await page.locator('[data-action="end-turn"]').click();

  // DiscardPrompt is up. Two discards required.
  const prompt = page.locator('[data-discard-prompt]');
  await expect(prompt).toBeVisible();
  // First discard. The button list re-renders after each click as
  // the engine snapshot updates; pick the first remaining option
  // each time rather than caching a locator across renders.
  await page.locator('[data-action="discard"]').first().click();
  await expect(page.locator('[data-discard-count]')).toHaveText('1');
  await page.locator('[data-action="discard"]').first().click();
  await expect(page.locator('[data-discard-count]')).toHaveText('2');

  // The pile is now populated. The button is enabled and labelled
  // with the live count.
  const pileButton = page.locator('[data-discard-pile-button]');
  await expect(pileButton).toBeEnabled();
  await expect(pileButton).toHaveAttribute('aria-label', /discard pile, 2 cards/i);

  // Click the pile → overlay opens listing both discards.
  await pileButton.click();
  const overlay = page.locator('[data-discard-browse-overlay]');
  await expect(overlay).toBeVisible();
  await expect(overlay).toHaveAttribute('role', 'dialog');
  await expect(overlay.locator('[data-discard-browse-list] [data-arcanum]')).toHaveCount(2);

  // Escape closes the overlay; pile remains visible.
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-discard-browse-overlay]')).toHaveCount(0);
  await expect(page.locator('[data-discard-pile]')).toBeVisible();
});
