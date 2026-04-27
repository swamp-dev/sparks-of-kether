import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration.
 *
 * Browsers are not installed by default. CI installs them in the e2e
 * job (see `.github/workflows/ci.yml`). The
 * `PLAYWRIGHT_BROWSERS_INSTALLED=1` env var must be set when actually
 * running — without it the spec-level `test.skip(...)` opts every
 * test out so the command exits 0 even with nothing executed.
 *
 * To run e2e tests locally:
 *   pnpm exec playwright install chromium
 *   PLAYWRIGHT_BROWSERS_INSTALLED=1 pnpm e2e
 *
 * In CI, this config will throw if the env var is missing — see the
 * guard below — so the green-wash mode (everything skipped, exit 0)
 * is impossible to reach by accident.
 */
const browsersEnabled = Boolean(process.env['PLAYWRIGHT_BROWSERS_INSTALLED']);

// Loud guard for CI: if e2e runs in CI without browsers installed,
// every test skips and the run exits 0 — easy to mistake for a
// passing e2e suite. (We hit this exact gap for #34/#35/#36/#81.)
// Hard-fail in CI rather than warn: a green-wash is worse than a
// loud red.
if (process.env['CI'] && !browsersEnabled) {
  throw new Error(
    '[playwright] CI is set but PLAYWRIGHT_BROWSERS_INSTALLED is not. ' +
      'The e2e suite would silently skip — refusing to run. The CI ' +
      'workflow must run `pnpm exec playwright install --with-deps ' +
      'chromium` AND export PLAYWRIGHT_BROWSERS_INSTALLED=1 before ' +
      '`pnpm e2e`.',
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
