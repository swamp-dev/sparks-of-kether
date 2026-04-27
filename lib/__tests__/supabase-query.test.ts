import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { query } from '../supabase-query';
import type { Database } from '../supabase';

/**
 * `query()` is a single-cast helper that wraps a typed Supabase
 * client to the untyped surface. The runtime is a pass-through —
 * it forwards `from(table)` to the underlying client. The value
 * the helper adds is at the TYPE layer (bypassing the Insert
 * overload collapse to `never`); this test pins the runtime
 * passthrough so a regression in the helper's cast logic surfaces
 * here rather than at every route call site.
 */

describe('query', () => {
  it('forwards the table name to the underlying client.from()', () => {
    const fromSpy = vi.fn().mockReturnValue({ kind: 'fluent-builder-stub' });
    const client = { from: fromSpy } as unknown as SupabaseClient<Database>;
    const result = query(client, 'rooms');
    expect(fromSpy).toHaveBeenCalledWith('rooms');
    // Pass-through: whatever from() returned IS what query()
    // returned — no wrapping, no transformation.
    expect(result).toEqual({ kind: 'fluent-builder-stub' });
  });

  it('accepts every table name the Database schema declares', () => {
    // Compile-time exhaustiveness: a `Record<keyof Tables, true>`
    // forces every key in `Database['public']['Tables']` to appear
    // exactly once. Adding a new table without updating this map
    // fails to typecheck. (An array of strings, by contrast, would
    // accept any subset — the previous version of this test was
    // not actually exhaustive; reviewer caught this on #114.)
    const allTables: Record<keyof Database['public']['Tables'], true> = {
      rooms: true,
      players: true,
      game_states: true,
      game_events: true,
    };
    const fromSpy = vi.fn().mockReturnValue({});
    const client = { from: fromSpy } as unknown as SupabaseClient<Database>;
    const tableNames = Object.keys(allTables) as (keyof Database['public']['Tables'] & string)[];
    for (const t of tableNames) query(client, t);
    expect(fromSpy).toHaveBeenCalledTimes(tableNames.length);
    // Spot-check first + last to confirm passthrough, not order.
    expect(fromSpy.mock.calls.flat()).toEqual(
      expect.arrayContaining(tableNames),
    );
  });
});
