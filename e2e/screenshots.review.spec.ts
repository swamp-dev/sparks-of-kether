import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Multi-viewport screenshot capture for the Epic #118 UI review.
 * Walks every route the regular `screenshots.spec.ts` covers, but
 * captures each at three viewport sizes — desktop, tablet, mobile —
 * so the review doc can spot screens that work at one size and
 * break at another.
 *
 * Output: `e2e/__screenshots__/baselines/<slug>-<viewport>.png`.
 *
 * Run with `pnpm screenshots`. Same `PLAYWRIGHT_BROWSERS_INSTALLED`
 * gate as the rest of the e2e suite — CI does NOT run this spec
 * (it lives separately so heavy review captures don't slow PR CI).
 */

// Two skip gates. `PLAYWRIGHT_BROWSERS_INSTALLED` is the global
// e2e gate (every spec uses it). `PLAYWRIGHT_RUN_REVIEW` is local
// to this file: it keeps the multi-viewport review out of the
// regular CI e2e run. CI runs `pnpm e2e` without this flag → the
// review captures all skip silently (the same way the rest of e2e
// silently skips when browsers aren't installed); developers who
// want the review run `pnpm screenshots`, which sets both flags.
test.skip(
  !process.env['PLAYWRIGHT_BROWSERS_INSTALLED'],
  'Set PLAYWRIGHT_BROWSERS_INSTALLED=1 after `pnpm exec playwright install chromium`',
);
test.skip(
  !process.env['PLAYWRIGHT_RUN_REVIEW'],
  'Set PLAYWRIGHT_RUN_REVIEW=1 to run the multi-viewport review captures (use `pnpm screenshots`)',
);

const BASELINES_DIR = resolve(
  process.cwd(),
  'e2e/__screenshots__/baselines',
);

test.beforeAll(async () => {
  await mkdir(BASELINES_DIR, { recursive: true });
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
  { path: '/demo/cards', slug: 'demo-cards' },
  { path: '/demo/challenge', slug: 'demo-challenge' },
  { path: '/demo/hand', slug: 'demo-hand' },
  { path: '/demo/icons', slug: 'demo-icons' },
  { path: '/demo/meters', slug: 'demo-meters' },
  { path: '/demo/ritual', slug: 'demo-ritual' },
  { path: '/demo/shell-panel', slug: 'demo-shell-panel' },
  { path: '/demo/soul-aspect', slug: 'demo-soul-aspect' },
  { path: '/demo/stat-sheet', slug: 'demo-stat-sheet' },
  { path: '/demo/tokens', slug: 'demo-tokens' },
  { path: '/demo/tree', slug: 'demo-tree' },
];

interface Viewport {
  readonly name: string;
  readonly width: number;
  readonly height: number;
}

/**
 * Per Epic #118 sub-ticket 1: desktop / tablet / mobile. The mobile
 * size matches an iPhone SE (375 × 667) — narrow enough to surface
 * 320 px breaks if any survived #38, and tall enough to spot fold
 * issues.
 */
const VIEWPORTS: readonly Viewport[] = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 667 },
];

for (const viewport of VIEWPORTS) {
  test.describe(`viewport ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of ROUTES) {
      test(`screenshot ${route.slug}`, async ({ page }) => {
        const response = await page.goto(route.path);
        await page.waitForLoadState('networkidle');
        await page.screenshot({
          path: resolve(BASELINES_DIR, `${route.slug}-${viewport.name}.png`),
          fullPage: true,
        });
        expect(
          response?.status(),
          `expected a 2xx response from ${route.path} (${viewport.name})`,
        ).toBeLessThan(400);
        expect(
          page.url(),
          `expected to remain on ${route.path}, was redirected`,
        ).toContain(route.path);
      });
    }
  });
}
