import { afterAll, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Integration test setup. Reads connection details from env vars set
 * by `supabase start` (locally) or by the `supabase/setup-cli` GH
 * Action (in CI). The standard env var names are:
 *
 *   SUPABASE_URL              — REST/Realtime base URL
 *   SUPABASE_ANON_KEY         — anonymous-session JWT
 *   SUPABASE_SERVICE_ROLE_KEY — service-role JWT (bypasses RLS)
 *
 * No `.env.local` fallback: integration tests should refuse to run
 * if the stack isn't up. A clear failure is better than tests that
 * silently hit production by mistake.
 */

function readEnv(): {
  url: string;
  anonKey: string;
  serviceKey: string;
} {
  const url = process.env['SUPABASE_URL'];
  const anonKey = process.env['SUPABASE_ANON_KEY'];
  const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!url || !anonKey || !serviceKey) {
    throw new Error(
      'integration: missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY. Run `supabase start` (locally) or check the GH workflow setup-cli step (CI).',
    );
  }
  return { url, anonKey, serviceKey };
}

/** Service-role client — bypasses RLS. Used for cleanup + admin paths. */
export function getServiceClient(): SupabaseClient {
  const { url, serviceKey } = readEnv();
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Anonymous client — fresh anonymous session per call. Mirrors what
 * the browser-side `getSupabaseBrowserClient` produces in production.
 * Each call creates a NEW anon user (so RLS-scoped rows don't bleed
 * across tests).
 */
export async function makeAnonClient(): Promise<{
  client: SupabaseClient;
  userId: string;
  accessToken: string;
}> {
  const { url, anonKey } = readEnv();
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signIn = await client.auth.signInAnonymously();
  if (signIn.error || !signIn.data.user || !signIn.data.session) {
    throw new Error(
      `integration: signInAnonymously failed: ${signIn.error?.message ?? 'no session'}`,
    );
  }
  return {
    client,
    userId: signIn.data.user.id,
    accessToken: signIn.data.session.access_token,
  };
}

/**
 * Per-suite cleanup: wipe all rows in the four schema tables. Uses
 * service-role so RLS isn't a barrier. Safe to run between tests
 * because we never share state across test files.
 *
 * FK ordering: game_events → game_states → players → rooms. All FKs
 * are declared `ON DELETE CASCADE` in the migration so dropping
 * `rooms` first would also clean the children — the manual order is
 * defensive against a future migration that removed cascade. Errors
 * are surfaced rather than swallowed; a silent cleanup failure
 * leaves the next test running on dirty state with no diagnostic.
 */
export async function wipeAllTables(): Promise<void> {
  const svc = getServiceClient();
  for (const table of ['game_events', 'game_states', 'players', 'rooms'] as const) {
    const { error } = await svc.from(table).delete().not('id', 'is', null);
    if (error) {
      throw new Error(`wipeAllTables: ${table}: ${error.message}`);
    }
  }
}

/**
 * Reset DB before AND after each test file. Belt + braces against
 * a previous run leaving rows behind (e.g. from a panicked test).
 */
beforeAll(async () => {
  await wipeAllTables();
});
afterAll(async () => {
  await wipeAllTables();
});
