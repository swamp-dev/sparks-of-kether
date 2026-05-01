import { test, expect } from '@playwright/test';

/**
 * Visual regression — pixel-diff every public route at three viewport
 * sizes against committed baselines. A future "tighten this padding by
 * 4 px" or "swap a gold for a different gold" that breaks the wave-3
 * polish established by Epic #118 fails this test.
 *
 * Routes mirror `screenshots.review.spec.ts`. Viewports mirror that
 * file's desktop / tablet / mobile triple. Baselines live under
 * `e2e/__screenshots__/visual-regression.spec.ts-snapshots/` (Playwright's
 * default location keyed off the spec filename) and are committed.
 *
 * Update workflow when an intentional UI change ships:
 *
 *   1. Make the change.
 *   2. Run `PLAYWRIGHT_BROWSERS_INSTALLED=1 pnpm e2e visual-regression --update-snapshots`.
 *   3. Inspect the new baselines visually.
 *   4. Commit them as part of the same PR as the UI change.
 *
 * Platform note: Playwright auto-suffixes baseline filenames with
 * `{browserName}-{platform}` (e.g. `home-desktop-chromium-linux.png`).
 * CI runs `ubuntu-latest`, so only the `-linux.png` baselines are
 * checked. Contributors on macOS / Windows generate `-darwin.png` /
 * `-win32.png` files locally; those are gitignored at the snapshot
 * directory level and must NOT be committed (CI will never check
 * them and they'd add silent dead weight).
 *
 * Test assertions use `animations: 'disabled'` so CSS transitions don't
 * cause spurious diffs. `maxDiffPixelRatio: 0.005` allows for the
 * fraction of a percent of anti-aliasing variance Playwright permits
 * by default.
 *
 * Pages with realtime / long-poll connections may flake on
 * `waitForLoadState('networkidle')` (the connection never goes idle).
 * If a future page uses Supabase Realtime or SSE in its baseline
 * render, switch its sentinel to `page.waitForSelector('[data-testid="page-ready"]')`
 * or equivalent rather than networkidle.
 */

test.skip(
  !process.env['PLAYWRIGHT_BROWSERS_INSTALLED'],
  'Set PLAYWRIGHT_BROWSERS_INSTALLED=1 after `pnpm exec playwright install chromium`',
);

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
  { path: '/demo/stat-sheet', slug: 'demo-stat-sheet' },
  { path: '/demo/tokens', slug: 'demo-tokens' },
  { path: '/demo/tree', slug: 'demo-tree' },
  // #320 Codex baselines. Per the ticket's acceptance criteria the
  // four landing surfaces are covered: index, one Sefirah (Tiferet —
  // most-connected), one Arcanum (Death — high-symbol-content), one
  // Path (22 / Justice — Lamed). The other 51 detail pages share the
  // same component shells so a regression on one would surface on
  // these four.
  { path: '/codex', slug: 'codex' },
  { path: '/sefirah/tiferet', slug: 'sefirah-tiferet' },
  { path: '/arcana/13', slug: 'arcana-13' },
  { path: '/path/22', slug: 'path-22' },
];

interface Viewport {
  readonly name: string;
  readonly width: number;
  readonly height: number;
}

const VIEWPORTS: readonly Viewport[] = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 667 },
];

for (const viewport of VIEWPORTS) {
  test.describe(`viewport ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of ROUTES) {
      test(`regression ${route.slug}`, async ({ page }) => {
        const response = await page.goto(route.path);
        await page.waitForLoadState('networkidle');
        expect(
          response?.status(),
          `expected a 2xx response from ${route.path} (${viewport.name})`,
        ).toBeLessThan(400);

        await expect(page).toHaveScreenshot(
          `${route.slug}-${viewport.name}.png`,
          {
            fullPage: true,
            animations: 'disabled',
            // Allow a fraction of a percent of pixel variance —
            // anti-aliasing on font glyphs and SVG strokes is real
            // and varies slightly even between identical headless
            // chromium runs.
            maxDiffPixelRatio: 0.005,
          },
        );
      });
    }
  });
}
