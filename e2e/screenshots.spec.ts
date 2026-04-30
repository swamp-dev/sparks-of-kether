import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Screenshot capture for manual review. Walks every static route +
 * each demo page, takes a full-page PNG, writes it to
 * `e2e/__screenshots__/`. Output is NOT asserted — these are images
 * for a human reviewer to skim. Visual regression baselines (with
 * `expect(page).toHaveScreenshot()`) are a follow-up once we have a
 * stable set.
 *
 * Run with `pnpm e2e:screenshots` (which sets the right project +
 * env). Skips when browsers aren't installed, same convention as the
 * other e2e specs.
 */

test.skip(
  !process.env['PLAYWRIGHT_BROWSERS_INSTALLED'],
  'Set PLAYWRIGHT_BROWSERS_INSTALLED=1 after `pnpm exec playwright install chromium`',
);

// Output path is resolved relative to `process.cwd()`, which is
// always the project root when invoked through `pnpm e2e:screenshots`
// (pnpm scripts run from package root). A developer running
// `npx playwright test` from inside `e2e/` would write to the wrong
// place — but Playwright's `testDir: './e2e'` config implicitly
// requires invocation from the project root anyway, so the existing
// invocation convention is the authoritative gate. `import.meta.url`
// would be cwd-invariant but Playwright's CJS-mode test loader does
// not handle `import.meta` cleanly in `.ts` specs.
const SCREENSHOT_DIR = resolve(process.cwd(), 'e2e/__screenshots__');

test.beforeAll(async () => {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
});

interface Route {
  readonly path: string;
  readonly slug: string;
}

const ROUTES: readonly Route[] = [
  { path: '/', slug: 'home' },
  { path: '/about', slug: 'about' },
  { path: '/play', slug: 'play' },
  { path: '/tokens', slug: 'tokens' },
  // Demo pages (one per directory under `app/demo/`).
  { path: '/demo/cards', slug: 'demo-cards' },
  { path: '/demo/challenge', slug: 'demo-challenge' },
  { path: '/demo/hand', slug: 'demo-hand' },
  { path: '/demo/icons', slug: 'demo-icons' },
  { path: '/demo/meters', slug: 'demo-meters' },
  { path: '/demo/ritual', slug: 'demo-ritual' },
  { path: '/demo/shell-panel', slug: 'demo-shell-panel' },
  { path: '/demo/stat-sheet', slug: 'demo-stat-sheet' },
  { path: '/demo/tokens', slug: 'demo-tokens' },
  { path: '/demo/tree', slug: 'demo-tree' },
];

for (const route of ROUTES) {
  test(`screenshot ${route.slug} (${route.path})`, async ({ page }) => {
    // Smoke-check before screenshotting: 14 silent green tests of
    // error pages would tell us nothing. We assert the navigation
    // succeeded with a 200-class status AND landed on the requested
    // path (not redirected away). If either fails the screenshot
    // is still useful for debugging, so it's taken regardless.
    const response = await page.goto(route.path);
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, `${route.slug}.png`),
      fullPage: true,
    });
    expect(
      response?.status(),
      `expected a 2xx response from ${route.path}`,
    ).toBeLessThan(400);
    expect(
      page.url(),
      `expected to remain on ${route.path}, was redirected`,
    ).toContain(route.path);
  });
}
