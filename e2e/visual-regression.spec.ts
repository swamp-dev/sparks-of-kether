import { test, expect, type Page } from '@playwright/test';

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

// Walk the full setup pipeline (#255 sign-picker → ritual → lobby →
// PlayScreen) so the `play-mid-game` baseline lands on the live play
// surface, not the default ZodiacSignPicker (#492). Picked signs are
// stable (Aries / Leo) and the ritual is skipped via the
// "skip — roll all remaining" button so the walker is deterministic.
// Mirrors `walkToPlayScreen` in `e2e/screenshots.review.spec.ts`;
// kept inline here rather than extracted because the screenshots
// review spec is dev-tooling-only (gated on `PLAYWRIGHT_RUN_REVIEW=1`)
// and shouldn't be imported from a CI-gated spec.
async function walkToPlayScreen(page: Page): Promise<void> {
  // P1 sign → P1 ritual → P1 summary continue.
  await page.locator('[data-zodiac-sign-picker]').waitFor();
  await page.getByRole('button', { name: /^Confirm Aries$/ }).click();
  await page.locator('[data-action="skip-ceremony"]').click();
  await page.getByRole('button', { name: /^continue$/i }).click();

  // P2 sign: Aries taken; #370 opens picker on first available
  // (taurus). Three Next clicks reach leo: taurus → gemini → cancer → leo.
  await page.locator('[data-zodiac-sign-picker]').waitFor();
  const nextArrow = page.getByRole('button', { name: /^Next sign$/ }).first();
  for (let i = 0; i < 3; i++) {
    await nextArrow.click();
  }
  await page.getByRole('button', { name: /^Confirm Leo$/ }).click();

  // P2 ritual → P2 summary continue.
  await page.locator('[data-action="skip-ceremony"]').click();
  await page.getByRole('button', { name: /^continue$/i }).click();

  // Lobby: click Begin to land on the live PlayScreen.
  await page.getByRole('button', { name: /^begin$/i }).click();
  await page.waitForLoadState('networkidle');

  // Park the cursor at viewport corner. After `click()` Playwright
  // leaves the pointer over the Begin button's coordinates; on the
  // mobile viewport (375×667) those coordinates fall on top of a
  // hand card after the PlayScreen mounts, which fires the card's
  // `mouseenter` and triggers the #579 magnify lift. The screenshot
  // then captures a magnified card instead of the rest-band layout
  // we want to baseline. Moving the pointer to (0, 0) clears any
  // active card hover and makes the capture position-independent.
  await page.mouse.move(0, 0);
}

interface Route {
  readonly path: string;
  readonly slug: string;
  /**
   * Expected HTTP status. Defaults to "any 2xx/3xx" (`< 400`). Set
   * explicitly only for routes that are expected to render at a
   * non-2xx status — currently the 404 page (#369), where the whole
   * point of the baseline is "this status code surfaces the themed
   * page, not the framework default".
   */
  readonly expectedStatus?: number;
  /**
   * Optional setup driver run after `goto` and before capture. Used
   * to walk a route past its default landing into a more meaningful
   * state (e.g. mid-game PlayScreen for #492 — the default `/play`
   * route lands on the ZodiacSignPicker; without a walker the
   * baseline never sees the live play surface).
   */
  readonly setup?: (page: Page) => Promise<void>;
}

const ROUTES: readonly Route[] = [
  { path: '/', slug: 'home' },
  { path: '/about', slug: 'about' },
  { path: '/play', slug: 'play' },
  // /play after the full setup pipeline → live PlayScreen (#492).
  // The default `play` baseline above lands on the ZodiacSignPicker;
  // this entry walks through to the live play surface so a regression
  // that breaks the `lg+` PlayScreen layout (e.g. reverting #411's
  // `lg:gap-3` to `gap-3`) actually trips a CI gate.
  //
  // `?seed=1492` pins the play-stream RNG (per `lib/play-seed.ts`)
  // so the StatSheet stat values + Hand card draw are deterministic
  // run-to-run. Without the query param `Date.now()` provides the
  // seed and every CI run produces a different baseline.
  {
    path: '/play?seed=1492',
    slug: 'play-mid-game',
    setup: walkToPlayScreen,
  },
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
  // #369 themed 404. Hit a deliberately-bogus URL so the framework
  // serves `app/not-found.tsx`. Pinning the baseline guarantees a
  // regression to the bare Next.js default surfaces here, not in
  // production.
  {
    path: '/this-route-does-not-exist-369',
    slug: 'not-found',
    expectedStatus: 404,
  },
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
        if (route.expectedStatus !== undefined) {
          expect(
            response?.status(),
            `expected status ${route.expectedStatus} from ${route.path} (${viewport.name})`,
          ).toBe(route.expectedStatus);
        } else {
          expect(
            response?.status(),
            `expected a 2xx response from ${route.path} (${viewport.name})`,
          ).toBeLessThan(400);
        }

        if (route.setup) {
          // The outer `waitForLoadState('networkidle')` above only
          // covers the initial `goto` landing page. Setup walkers
          // drive React-state transitions (no second navigation), so
          // any post-walker stabilization must happen inside the
          // walker itself (e.g. `walkToPlayScreen` ends with its own
          // `waitForLoadState('networkidle')`).
          await route.setup(page);
        }

        await expect(page).toHaveScreenshot(`${route.slug}-${viewport.name}.png`, {
          fullPage: true,
          animations: 'disabled',
          // Allow a few percent of pixel variance — anti-aliasing
          // on font glyphs and SVG strokes is real and the diff
          // between local Linux and the GitHub Actions
          // ubuntu-latest runner is consistently ~1–2% per page on
          // text-heavy routes (codex / sefirah / about / tokens).
          // The previous 0.005 (0.5%) threshold was tight enough
          // to fail roughly every PR on hosted CI for reasons
          // unrelated to the diff — see Journal entries for #366
          // and the `project_hosted_ci_billing_blocked` memory.
          //
          // 0.025 (2.5%) absorbs the documented font-AA delta
          // (largest observed: 21 687 px / 1 280×800 = 2.12%) with
          // a thin headroom, while still surfacing a real layout
          // regression (a 4 px padding shift or a colour swap
          // diffs ≥ 5% easily). If hosted CI starts producing
          // diffs > 0.025 the right move is to root-cause the
          // renderer divergence (font loading, freetype version,
          // device-pixel-ratio) rather than bump the threshold
          // further; this number is meant to absorb noise, not
          // mask real changes.
          maxDiffPixelRatio: 0.025,
        });
      });
    }
  });
}
