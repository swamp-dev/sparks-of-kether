import { test, expect } from '@playwright/test';

/**
 * End-to-end integration test for the play flow.
 *
 * Walks through:
 *   home → /play → P1 ritual (10 steps) → P1 sign pick →
 *   P2 ritual → P2 sign pick → lobby → Begin → play screen renders
 *
 * #237 (Epic #212 T8): the Soul Aspect phase has been removed; the
 * zodiac-sign pick alone supplies the player's class.
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
  // #313: the home page was redesigned. The h1 is unique; pin it
  // by level=1 so the assertion is unambiguous against the
  // PitchColumns sr-only h2 which also names the game.
  await expect(
    page.getByRole('heading', { level: 1, name: /sparks of kether/i }),
  ).toBeVisible();
  // #313: the three entry points (New game / Join game / Hot-seat)
  // sit behind a single "Begin the ascent" disclosure trigger. Click
  // the trigger first to reveal them; wait for the panel to be in
  // the DOM (parallel-worker dev server compile can lag the panel's
  // first paint) before reaching for the hot-seat link.
  await page.getByRole('button', { name: /begin the ascent/i }).click();
  const hotseatLink = page.getByRole('link', { name: /Hot-seat/i });
  await hotseatLink.waitFor({ state: 'visible' });
  await hotseatLink.click();
  // Wait for the navigation to /play to complete before asserting
  // the next-screen content. Without this, parallel dev-server
  // compile of /play can race with the test's `getByText` lookup
  // and time out before the page has loaded.
  await page.waitForURL('**/play');

  // Walk both players through the blessing ritual + sign pick.
  for (let player = 1; player <= 2; player++) {
    await expect(
      page.getByText(new RegExp(`Player ${player} — Sefirot Blessing`)),
    ).toBeVisible();

    // Ten steps: Roll 3d6 → Next.
    for (let step = 0; step < 10; step++) {
      await page.getByRole('button', { name: /Roll 3d6/i }).click();
      await page.getByRole('button', { name: /^Next$/i }).click();
    }

    // #215: the ritual now pauses on a Summary screen so the user
    // sees their final stats before advancing. Click Continue to
    // transition to the zodiac-sign picker.
    await expect(
      page.getByRole('heading', { name: /The Tree has spoken/i }),
    ).toBeVisible();
    await page.getByRole('button', { name: /^Continue$/ }).click();

    // #236: zodiac-sign picker. (#237 removed the intermediate Soul
    // Aspect picker; the sign pick alone supplies the class.)
    await expect(
      page.getByRole('heading', { name: /Choose your sign/i }),
    ).toBeVisible();
    // P1 picks Aries; P2 picks Leo — both available, both distinct.
    // #314: the picker is a carousel. Aries is the default-focused
    // stage, so P1's confirm is one click. For P2, cycle the
    // carousel forward to leo (idx 4, four steps from aries) by
    // clicking the on-screen "Next sign" arrow four times. The
    // arrow's cycle helper skips taken signs, so when aries is
    // already taken by P1 the first ArrowRight lands on taurus
    // (idx 1) and four total nexts land on leo.
    if (player === 2) {
      // First Next from default-focus aries (taken) lands on taurus,
      // then 3 more lands on leo. Each click advances exactly one
      // available sign. With aries taken, sequence is:
      //   start: aries(taken) → 1st next: taurus → 2nd: gemini →
      //   3rd: cancer → 4th: leo.
      const nextArrow = page
        .getByRole('button', { name: /^Next sign$/ })
        .first();
      for (let i = 0; i < 4; i++) {
        await nextArrow.click();
      }
    }
    const signLabel = player === 1 ? 'Aries' : 'Leo';
    await page
      .getByRole('button', { name: new RegExp(`^Confirm ${signLabel}$`) })
      .click();
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
