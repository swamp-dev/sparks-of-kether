import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration skeleton.
 *
 * Browsers are NOT installed by default, and the dev-server webServer
 * is only launched when the user opts in. This keeps `pnpm e2e` cheap
 * in CI and local gate runs until end-to-end tests actually matter.
 *
 * To run e2e tests locally:
 *   pnpm exec playwright install chromium
 *   PLAYWRIGHT_BROWSERS_INSTALLED=1 pnpm e2e
 *
 * Individual specs use `test.skip(!PLAYWRIGHT_BROWSERS_INSTALLED, …)` so
 * the command still exits 0 when the flag is unset — the runner simply
 * reports all tests as skipped.
 */
const browsersEnabled = Boolean(process.env['PLAYWRIGHT_BROWSERS_INSTALLED']);

// Loud guard for CI: if e2e runs with browsers disabled, every test skips
// and the run exits 0 — easy to mistake for a passing e2e suite. Print a
// warning so the CI log makes the green-wash explicit.
if (process.env['CI'] && !browsersEnabled) {
  // eslint-disable-next-line no-console
  console.warn(
    '[playwright] CI is set but PLAYWRIGHT_BROWSERS_INSTALLED is not — ' +
      'all e2e tests will skip. To actually run them, the workflow must ' +
      'run `pnpm exec playwright install chromium` AND export ' +
      'PLAYWRIGHT_BROWSERS_INSTALLED=1 before `pnpm e2e`.',
  );
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 1 : 0,
  ...(process.env['CI'] ? { workers: 1 } : {}),
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : 'html',
  use: {
    baseURL: process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Only spin up the dev server if browsers are installed. Otherwise every
  // spec skips and there is no point paying the startup cost.
  ...(browsersEnabled
    ? {
        webServer: {
          command: 'pnpm dev',
          url: 'http://localhost:3000',
          reuseExistingServer: !process.env['CI'],
          stdout: 'ignore' as const,
          stderr: 'pipe' as const,
          // Dev-server first-compile can be slow when the bundler has
          // never seen the play route — Tree SVG, all the icons, every
          // arcanum component. 60s is too tight; 180s gives headroom
          // without making CI hang on a real wedge.
          timeout: 180_000,
        },
      }
    : {}),
});
