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
  // #313 redesign: there are now two headings whose names match
  // `/sparks of kether/i` — the visible h1 and the sr-only h2 that
  // names the PitchColumns section ("What is Sparks of Kether?").
  // Pin the level explicitly so the assertion remains unambiguous.
  await expect(
    page.getByRole('heading', { level: 1, name: /sparks of kether/i }),
  ).toBeVisible();
});

test('PrimaryCTA: Escape and Close return focus to the trigger', async ({ page }) => {
  // The unit suite asserts focus return in jsdom, which doesn't
  // enforce display:none focus constraints. This Playwright spec is
  // the only place the production-browser contract is exercised:
  // `setIsOpen(false)` does NOT flush before a synchronous .focus()
  // would run, and the trigger has `hidden` (display:none) while the
  // panel is open — so a synchronous focus call would silently no-op
  // and leave focus on <body>. The fix uses a useEffect on isOpen.
  await page.goto('/');

  const trigger = page.getByRole('button', { name: /begin the ascent/i });
  await expect(trigger).toBeVisible();

  // Open via click. The first focusable inside the panel (nickname
  // input) should receive focus.
  await trigger.click();
  const nickname = page.getByLabel(/nickname/i);
  await expect(nickname).toBeFocused();

  // Close via Escape. Focus must return to the trigger (now visible
  // again because `hidden` is removed when isOpen flips to false).
  await page.keyboard.press('Escape');
  await expect(trigger).toBeVisible();
  await expect(trigger).toBeFocused();

  // Re-open and verify the Close button path returns focus too.
  await trigger.click();
  const close = page.getByRole('button', { name: /collapse and return to the portal/i });
  await close.click();
  await expect(trigger).toBeVisible();
  await expect(trigger).toBeFocused();
});
