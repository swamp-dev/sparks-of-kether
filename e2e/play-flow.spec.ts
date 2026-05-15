import { test, expect } from '@playwright/test';

/**
 * End-to-end integration test for the play flow.
 *
 * Walks through:
 *   home → /play → P1 sign pick → P1 ritual (10 steps) →
 *   P2 sign pick → P2 ritual → lobby → Begin → play screen renders
 *
 * #237 (Epic #212 T8): the Soul Aspect phase has been removed; the
 * zodiac-sign pick alone supplies the player's class.
 *
 * #255 (Voices Epic T4): the sign pick now happens BEFORE the blessing
 * ritual so the per-Sefirah blessing voice can address the player in
 * sign-aware tone (Mercury at Hod = ruler-tier voice for Virgo, etc.).
 * Order: sign → ritual → next player. Was: ritual → sign → next.
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
  await expect(page.getByRole('heading', { level: 1, name: /sparks of kether/i })).toBeVisible();
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

  // Walk both players through the sign pick + blessing ritual.
  // Order is sign-first per #255 (the ritual needs the sign for
  // sign-aware blessing copy).
  for (let player = 1; player <= 2; player++) {
    // #236: zodiac-sign picker — first phase.
    await expect(page.getByRole('heading', { name: /Choose your sign/i })).toBeVisible();
    // P1 picks Aries; P2 picks Leo — both available, both distinct.
    // #314: the picker is a carousel. With nothing taken, aries is
    // the default-focused stage, so P1's confirm is one click. For
    // P2 (aries already taken by P1), #370 makes the picker open on
    // the first available sign (taurus, idx 1), so we cycle three
    // times to reach leo (idx 4): taurus → gemini → cancer → leo.
    if (player === 2) {
      // Sequence after #370 with aries taken by P1:
      //   start: taurus (auto-skipped past aries) → 1st next: gemini
      //   → 2nd: cancer → 3rd: leo.
      const nextArrow = page.getByRole('button', { name: /^Next sign$/ }).first();
      for (let i = 0; i < 3; i++) {
        await nextArrow.click();
      }
    }
    const signLabel = player === 1 ? 'Aries' : 'Leo';
    await page.getByRole('button', { name: new RegExp(`^Confirm ${signLabel}$`) }).click();

    // Then the blessing ritual.
    await expect(page.getByText(new RegExp(`Player ${player} — Sefirot Blessing`))).toBeVisible();

    // Ten steps: Roll 3d6 → Next.
    for (let step = 0; step < 10; step++) {
      await page.getByRole('button', { name: /Roll 3d6/i }).click();
      await page.getByRole('button', { name: /^Next$/i }).click();
    }

    // #215: the ritual pauses on a Summary screen. Click Continue
    // to advance to the next player (or the lobby for player 2).
    await expect(page.getByRole('heading', { name: /The Tree has spoken/i })).toBeVisible();
    await page.getByRole('button', { name: /^Continue$/ }).click();
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
    page
      .getByRole('figure')
      .filter({ hasText: /Tree of Life/i })
      .first(),
  ).toBeVisible();

  // Phase machine should land in 'move' for the first turn.
  await expect(page.locator('[data-play-screen]')).toHaveAttribute('data-phase', 'move');

  // #368: clicking the leftmost card must succeed without force-click.
  // Pre-fix, the SVG of card 1 occluded card 0's bounding-box centre,
  // and `page.locator('[data-card-slot="0"]').click()` failed with
  // "subtree intercepts pointer events". The unit test in Hand.test
  // pins the zIndex order; this assertion proves the actual hit-test
  // resolves to card 0's button so the regression cannot silently
  // reappear (e.g. if a future overlap rule re-orders the stack).
  const card0 = page.locator('[data-card-slot="0"]');
  await expect(card0).toBeVisible();
  await card0.click({ timeout: 5_000 });
  await expect(card0).toHaveAttribute('data-selected', 'true');
});
