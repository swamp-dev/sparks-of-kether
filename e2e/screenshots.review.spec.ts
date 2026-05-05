import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Multi-viewport screenshot capture for marketing/tour curation.
 * Walks every public + dev route and writes
 * `e2e/__screenshots__/baselines/<slug>-<viewport>.png` (gitignored).
 *
 * Run with `pnpm screenshots`. Same `PLAYWRIGHT_BROWSERS_INSTALLED`
 * gate as the rest of the e2e suite — CI does NOT run this spec
 * (it lives separately so heavy review captures don't slow PR CI).
 *
 * Two extension hooks per route:
 *
 * - `setup(page)` — Playwright actions to run after `goto` and before
 *   capture. Used to drive a route into a more evocative state than
 *   its default render (e.g. mid-flow ritual instead of STEP 1, or
 *   walking the full setup pipeline to land on the live play surface).
 *
 * - `captureLocator` — when set, capture only this locator's bounding
 *   box (via `page.locator(...).screenshot()`), not the full page.
 *   The /demo/* routes wrap their inner content in a `[data-demo-canvas]`
 *   div so screenshots can drop the dev-tooling header strip.
 *
 * If a route omits both hooks it captures full-page from the default
 * landing state, matching the original Wave-1 behaviour.
 */

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

// ─── Setup helpers ──────────────────────────────────────────────────
//
// Each helper drives a route past its default state. They're written
// to be idempotent within a single test (one fresh page per test).

/**
 * /play default lands on STEP 1 OF 10 with the ledger empty. The
 * BlessingRitual flow per step is `awaiting → rolled` — clicking
 * "Roll 3d6" reveals the d20 result + a "Next" button; clicking
 * "Next" advances to the next Sefirah and re-shows "Roll 3d6". So
 * five completed rolls = five (Roll → Next) pairs. After the 5th
 * Next, the page is on STEP 6 OF 10 with five ledger entries filled
 * and the "Roll 3d6" button visible — exactly the "in motion" framing
 * we want.
 *
 * Fragile: matches button labels by literal text. If the BlessingRitual
 * UI ever changes either button's copy, the helper hangs until the
 * Playwright timeout. Guarded by exact-match `^...$` regexes so a
 * label rename (rather than a substring change) fails fast.
 */
async function rollFiveTimes(page: Page): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: /^roll 3d6$/i }).click();
    await page.getByRole('button', { name: /^next$/i }).click();
  }
}

/**
 * /play default lands on the BlessingRitual. Skip past it to land on
 * the ZodiacSignPicker — Epic #212's headline UI, otherwise invisible
 * in any current capture.
 */
async function skipRitualToSignPicker(page: Page): Promise<void> {
  // Skip rolls all remaining stats + lands on the Summary panel.
  // Continue (#215 gate) calls onComplete and the parent transitions
  // to the sign phase.
  await page
    .getByRole('button', { name: /skip.*roll all remaining/i })
    .click();
  await page.getByRole('button', { name: /^continue$/i }).click();
  await page.locator('[data-zodiac-sign-picker]').waitFor();
}

/**
 * /play default lands on the BlessingRitual. Walk the full setup
 * pipeline (ritual P1 → sign P1 → ritual P2 → sign P2 → lobby → Begin)
 * to land on the live PlayScreen. The picked signs are stable so the
 * capture is reproducible.
 */
async function walkToPlayScreen(page: Page): Promise<void> {
  // Player 1: skip ritual, click Continue past the Summary, pick Aries.
  await page
    .getByRole('button', { name: /skip.*roll all remaining/i })
    .click();
  await page.getByRole('button', { name: /^continue$/i }).click();
  await page.locator('[data-zodiac-sign-picker]').waitFor();
  // #314: the carousel renders the focused sign at the centre stage.
  // Aries is the default-focused stage on first mount — Player 1
  // confirms it directly without cycling.
  await page.getByRole('button', { name: /^Confirm Aries$/ }).click();

  // Player 2: ritual, then cycle to Leo. Aries is taken; #370 makes
  // the picker open on the first available sign (taurus), so three
  // clicks of Next reach leo (taurus → gemini → cancer → leo).
  await page
    .getByRole('button', { name: /skip.*roll all remaining/i })
    .click();
  await page.getByRole('button', { name: /^continue$/i }).click();
  await page.locator('[data-zodiac-sign-picker]').waitFor();
  const nextArrow = page.getByRole('button', { name: /^Next sign$/ }).first();
  for (let i = 0; i < 3; i++) {
    await nextArrow.click();
  }
  await page.getByRole('button', { name: /^Confirm Leo$/ }).click();

  // Lobby: click Begin to land on the live PlayScreen.
  await page.getByRole('button', { name: /^begin$/i }).click();
  await page.waitForLoadState('networkidle');
}

/**
 * /demo/meters defaults to illum=5 / sep=3 — a balanced low state
 * that's unevocative as a marketing shot. Bump illumination to ~12/15
 * via the demo's `+` stepper so the gold fill dominates and the visual
 * tension between the two pillars reads at a glance.
 */
async function bumpMeters(page: Page): Promise<void> {
  // The page has exactly two `+` buttons in DOM order:
  // [0] increments Illumination, [1] increments Separation. Click [0]
  // seven times to bump Illumination from 5 to 12 (≥ 12/15 per the
  // rating doc).
  for (let i = 0; i < 7; i++) {
    await page.getByRole('button', { name: '+' }).first().click();
  }
}

// ─── Routes ─────────────────────────────────────────────────────────

interface Route {
  readonly path: string;
  readonly slug: string;
  readonly setup?: (page: Page) => Promise<void>;
  readonly captureLocator?: string;
}

const ROUTES: readonly Route[] = [
  { path: '/', slug: 'home' },
  { path: '/about', slug: 'about' },

  // /play default — STEP 6 OF 10 with five Sefirot rolled, partial ledger.
  { path: '/play', slug: 'play', setup: rollFiveTimes },
  // /play after the ritual completes → ZodiacSignPicker (Epic #212).
  {
    path: '/play',
    slug: 'play-sign-picker',
    setup: skipRitualToSignPicker,
  },
  // /play after the full setup pipeline → live PlayScreen.
  { path: '/play', slug: 'play-mid-game', setup: walkToPlayScreen },

  { path: '/tokens', slug: 'tokens' },

  // /demo/* routes — capture the inner [data-demo-canvas] div to drop
  // the dev-tooling header strip (h1 + caption paragraph) from
  // marketing-tier captures.
  {
    path: '/demo/cards',
    slug: 'demo-cards',
    captureLocator: '[data-demo-canvas]',
  },
  {
    path: '/demo/challenge',
    slug: 'demo-challenge',
    captureLocator: '[data-demo-canvas]',
  },
  // Soul Door callout (Epic #240) — seeded via search param.
  {
    path: '/demo/challenge?door=open',
    slug: 'demo-challenge-soul-door',
    captureLocator: '[data-demo-canvas]',
  },
  {
    path: '/demo/hand',
    slug: 'demo-hand',
    captureLocator: '[data-demo-canvas]',
  },
  {
    path: '/demo/icons',
    slug: 'demo-icons',
    captureLocator: '[data-demo-canvas]',
  },
  {
    path: '/demo/meters',
    slug: 'demo-meters',
    setup: bumpMeters,
    captureLocator: '[data-demo-canvas]',
  },
  {
    path: '/demo/ritual',
    slug: 'demo-ritual',
    captureLocator: '[data-demo-canvas]',
  },
  {
    path: '/demo/shell-panel',
    slug: 'demo-shell-panel',
    captureLocator: '[data-demo-canvas]',
  },
  {
    path: '/demo/stat-sheet',
    slug: 'demo-stat-sheet',
    captureLocator: '[data-demo-canvas]',
  },
  {
    path: '/demo/tokens',
    slug: 'demo-tokens',
    captureLocator: '[data-demo-canvas]',
  },
  {
    path: '/demo/tree',
    slug: 'demo-tree',
    captureLocator: '[data-demo-canvas]',
  },

  // #320 Codex captures — index + one representative detail per
  // category. The other 51 detail pages share the same component
  // shells; capturing one Sefirah / Arcanum / Path is enough for
  // the curated visual tour.
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
      test(`screenshot ${route.slug}`, async ({ page }) => {
        const response = await page.goto(route.path);
        await page.waitForLoadState('networkidle');

        // Assert response health BEFORE setup/capture so a 404/500
        // doesn't silently contaminate `BASELINES_DIR` with an error
        // page. Strip query string before checking the URL — `?door=open`
        // would break a naive `toContain(route.path)`.
        expect(
          response?.status(),
          `expected a 2xx response from ${route.path} (${viewport.name})`,
        ).toBeLessThan(400);
        const expectedPath = route.path.split('?')[0];
        expect(
          page.url(),
          `expected to remain on ${expectedPath}, was redirected`,
        ).toContain(expectedPath);

        if (route.setup) {
          await route.setup(page);
          // Re-settle after setup actions in case they triggered fetches.
          await page.waitForLoadState('networkidle').catch(() => {});
        }

        const outputPath = resolve(
          BASELINES_DIR,
          `${route.slug}-${viewport.name}.png`,
        );

        if (route.captureLocator !== undefined) {
          // Wait for the locator to be visible before screenshotting —
          // a missing/hidden element here gives a meaningful failure
          // ("waiting for locator to be visible") rather than a cryptic
          // screenshot timeout. `.first()` is a safety net in case a
          // page accidentally renders multiple matches (each demo
          // wraps exactly one canvas, but this is cheap insurance).
          const locator = page.locator(route.captureLocator).first();
          await locator.waitFor({ state: 'visible' });
          await locator.screenshot({ path: outputPath });
        } else {
          await page.screenshot({ path: outputPath, fullPage: true });
        }
      });
    }
  });
}
