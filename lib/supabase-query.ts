import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabase';

/**
 * Single-cast helper that wraps the `SupabaseClient<Database>` surface
 * down to plain `SupabaseClient` for write call sites.
 *
 * **Why this exists.** Supabase JS 2.x's typed client collapses
 * `Insert` overloads to `never` when the row type carries `readonly`
 * modifiers (which our schema-mirror types do). Writes via
 * `client.from('rooms').insert({...})` then fail to typecheck even
 * though the runtime accepts them. The historical workaround was to
 * cast the client to `SupabaseClient` (no Database generic) at each
 * write site — `lib/rooms.ts` documented this and the route files
 * carried the same pattern.
 *
 * `query(client, 'table').insert(...)` does the cast once. Adding a
 * new route does not require knowing the gotcha; the type-collapse
 * fix is centralized here. Read sites that want typed rows still use
 * the typed client directly with `.maybeSingle<RowType>()` / `.single<RowType>()`.
 *
 * Tradeoff: the returned builder is `SupabaseClient['from']` — i.e.
 * untyped. That is intentional. Tests catch shape drift via the route
 * assertions; the type collapse this helper bypasses is a known
 * upstream issue, not a real safety problem.
 */
export function query(
  client: SupabaseClient<Database>,
  table: keyof Database['public']['Tables'] & string,
): ReturnType<SupabaseClient['from']> {
  return (client as SupabaseClient).from(table);
}
