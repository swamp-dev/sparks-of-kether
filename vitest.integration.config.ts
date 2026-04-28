import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

/**
 * Integration test config (T3 / #89). Runs against a real local
 * Supabase stack (`supabase start`) — Postgres + GoTrue + PostgREST
 * + Realtime in Docker. The standard `pnpm test` config explicitly
 * does NOT include this directory; integration tests run separately
 * via `pnpm test:integration`.
 *
 * What integration tests catch that the in-memory shim cannot:
 *   - RLS policy denial / approval (real Postgres + GoTrue JWT).
 *   - FK violations (`players.room_id → rooms.id`).
 *   - Unique-constraint violations (real `23505` from Postgres).
 *   - Schema drift between TypeScript types and migration SQL.
 *   - JSON column round-trips through `jsonb`.
 *
 * Local setup (one-time):
 *   pnpm dlx supabase init   # only if config.toml missing — already there
 *   pnpm dlx supabase start  # spins up Docker stack
 *
 * Then:
 *   pnpm test:integration
 *
 * `supabase status` prints the local URL + anon/service keys; the
 * test suite reads them from env vars set by the script (or by the
 * `setup-cli` action in CI).
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./tests/integration/setup.ts'],
    // Integration tests need real network calls + DB writes; serialize
    // by default so test-data isolation is straightforward (each test
    // file owns its own rows). Parallel can come later once cleanup
    // hooks are battle-tested.
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});
