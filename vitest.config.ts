import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // No `globals: true`: test files import describe/it/expect explicitly
    // from 'vitest'. Keeping it off avoids the "half-configured" trap
    // (globals flag + explicit imports is confusing for contributors).
    setupFiles: ['./test/setup.ts'],
    // Playwright owns e2e/; that single glob is sufficient. Do NOT add
    // `**/*.spec.ts` here — it would silently swallow any future unit
    // test named `*.spec.ts` under engine/ or lib/.
    exclude: [
      '**/node_modules/**',
      '**/.next/**',
      '**/e2e/**',
      // Stryker copies the source tree into `.stryker-tmp/sandbox-*/`
      // when running mutation tests. Without this exclude, vitest
      // discovers the duplicated test files and reports double the
      // expected test count.
      '**/.stryker-tmp/**',
    ],
    include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}', '**/*.{test,spec}.{ts,tsx}'],
    css: false,
    coverage: {
      reporter: ['text', 'html'],
      include: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'engine/**/*.ts', 'lib/**/*.ts'],
      exclude: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/__tests__/**'],
      // Global aggregate thresholds across ALL included files
      // (vitest's default mode — `perFile: false`). Set slightly
      // below the current baseline so normal variance does not
      // trip CI but a real regression does.
      //
      // Baseline at the time of writing (post-#86):
      //   Statements 77.14% · Branches 70.47% · Functions 76.16% · Lines 78.20%
      //
      // Why not glob-keyed thresholds (e.g. `'engine/**'`)? Those
      // enforce PER-FILE in vitest 4.x — every file matching the
      // glob must individually clear the floor. A few load-bearing
      // files (`lib/use-turn.ts` at 67%/41%, `lib/supabase.ts` at
      // 79%/60%) trip any meaningful per-directory floor. The
      // testability audit (T8 / #94) + the test additions that
      // follow it are the path to tighter per-directory thresholds.
      // A follow-up ticket will ratchet these up once T8 lands.
      //
      // The branches floor (68%) is intentionally a wider margin
      // than the others — branches are the most volatile metric as
      // conditional logic is added, and `lib/use-turn.ts` /
      // `lib/presence.ts` (47% branches each) drag the aggregate.
      thresholds: {
        lines: 75,
        branches: 68,
        functions: 74,
        statements: 75,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});
