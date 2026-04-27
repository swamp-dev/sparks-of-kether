import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  GameEventRow,
  GameStateRow,
  PlayerRow,
  RoomRow,
} from '@/lib/supabase';

/**
 * In-memory Supabase shim for integration-style route tests.
 *
 * Replaces the module surface that the production routes consume:
 *   - `createSupabaseServerClient()` → caller-auth client
 *   - `createSupabaseServiceClient()` → service-role client
 *
 * Both factories return clients backed by the SAME `InMemoryDb`
 * object — there is no RLS in this shim, so writes from either
 * client land in the same tables. RLS-correctness lives in the
 * real-Supabase integration suite (T3 / #89).
 *
 * The query builder implements the chain shapes the existing routes
 * actually use; new routes that need different chains should extend
 * `makeFluent` here rather than re-implementing the shim per test.
 *
 * Usage:
 *   const db = makeInMemoryDb();
 *   const browserClient = createMockBrowserClient(db);
 *   // wire via vi.mock('@/lib/supabase', ...)
 */

export interface InMemoryDb {
  rooms: RoomRow[];
  players: PlayerRow[];
  game_states: GameStateRow[];
  game_events: GameEventRow[];
  /** Auto-incremented for `game_events.id`. */
  nextEventId: number;
}

export function makeInMemoryDb(): InMemoryDb {
  return {
    rooms: [],
    players: [],
    game_states: [],
    game_events: [],
    nextEventId: 1,
  };
}

type TableName = keyof Omit<InMemoryDb, 'nextEventId'>;

interface SelectFilters {
  eqs: { col: string; val: unknown }[];
}

function rowsMatching<T>(rows: readonly T[], filters: SelectFilters): T[] {
  return rows.filter((row) =>
    filters.eqs.every(
      (f) => (row as unknown as Record<string, unknown>)[f.col] === f.val,
    ),
  );
}

function nextRowId(table: string): string {
  // game_events.id is numeric in production; the dedicated branch
  // in `insert()` handles that table via `db.nextEventId`. If the
  // counter path is ever bypassed and we land here for a game_events
  // row, fail loudly rather than handing back a string id that will
  // mislead any subsequent assertion.
  if (table === 'game_events') {
    throw new Error(
      'in-memory shim: game_events ids must be assigned via the auto-increment counter, not nextRowId',
    );
  }
  return `${table}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Build a query-builder for one table call. Mirrors the chain shapes
 * the production routes use:
 *   from(t).select().eq().maybeSingle()
 *   from(t).select().eq().order()
 *   from(t).insert(row) — awaitable; insert(row).select().single()
 *   from(t).update(patch).eq()
 *   from(t).delete().eq() — awaitable; delete().eq().select()
 */
function makeFluent(db: InMemoryDb, table: TableName) {
  const filters: SelectFilters = { eqs: [] };
  // The table arrays carry typed Row shapes (`RoomRow`, `PlayerRow`,
  // etc.). The shim treats them generically — push, mutate, search
  // by string column name — so we widen via `unknown` to a generic
  // record-array. The risk is unsafe-by-construction writes; tests
  // catch shape drift via the route assertions.
  const tableRef = db[table] as unknown as Record<string, unknown>[];

  const selectChain = {
    eq(col: string, val: unknown) {
      filters.eqs.push({ col, val });
      return selectChain;
    },
    order(_col: string, _opts?: unknown) {
      const matches = rowsMatching(tableRef, filters);
      return Promise.resolve({ data: matches, error: null });
    },
    async maybeSingle<T = unknown>() {
      const matches = rowsMatching(tableRef, filters);
      if (matches.length === 0) return { data: null, error: null };
      return { data: matches[0] as T, error: null };
    },
    async single<T = unknown>() {
      const matches = rowsMatching(tableRef, filters);
      if (matches.length === 0) {
        return {
          data: null,
          error: { message: 'no rows', code: 'PGRST116' },
        };
      }
      return { data: matches[0] as T, error: null };
    },
  };

  return {
    select(_cols?: string) {
      return selectChain;
    },
    insert(row: Record<string, unknown>) {
      // game_events.id is numeric and uses the dedicated counter
      // (nextRowId throws for that table). Other tables fall back
      // to a string id when the row doesn't supply one.
      const assignedId =
        table === 'game_events'
          ? db.nextEventId
          : (row['id'] ?? nextRowId(table));
      if (table === 'game_events') {
        db.nextEventId += 1;
      }
      const created: Record<string, unknown> = {
        ...row,
        id: assignedId,
        created_at: row['created_at'] ?? new Date().toISOString(),
      };
      // game_states unique constraint on room_id.
      if (table === 'game_states') {
        const existing = tableRef.find(
          (r) => r['room_id'] === created['room_id'],
        );
        if (existing !== undefined) {
          const dup = {
            data: null,
            error: { code: '23505', message: 'duplicate key' },
          };
          // Awaitable + chainable.
          return {
            select: () => ({ single: async () => dup }),
            then: (resolve: (v: typeof dup) => unknown) =>
              Promise.resolve(dup).then(resolve),
          };
        }
      }
      tableRef.push(created);
      const result = { data: created, error: null };
      // Insert returns a builder that is BOTH awaitable (for
      // `await client.from(t).insert(row)`) AND chainable (for
      // `.select().single()`). The `select()` here is intentionally
      // narrow — only `.single()` is supported. If any future route
      // tries another chain (`.eq()`, `.maybeSingle()`, etc.) we
      // throw rather than silently return undefined.
      const insertSelect = new Proxy(
        { single: async () => result },
        {
          get(target, prop) {
            if (prop === 'single') return target.single;
            throw new Error(
              `in-memory shim: unsupported method on insert().select(): ${String(prop)}`,
            );
          },
        },
      );
      return {
        select: () => insertSelect,
        then: (resolve: (v: typeof result) => unknown) =>
          Promise.resolve(result).then(resolve),
      };
    },
    update(patch: Record<string, unknown>) {
      const updateChain = {
        eq(col: string, val: unknown) {
          filters.eqs.push({ col, val });
          return updateChain;
        },
        then(onResolve: (v: unknown) => unknown) {
          const matches = rowsMatching(tableRef, filters);
          for (const row of matches) Object.assign(row, patch);
          return Promise.resolve({ data: matches, error: null }).then(
            onResolve,
          );
        },
      };
      return updateChain;
    },
    delete() {
      const deleteChain = {
        eq(col: string, val: unknown) {
          filters.eqs.push({ col, val });
          return deleteChain;
        },
        select(_cols?: string) {
          const matches = rowsMatching(tableRef, filters);
          for (const row of matches) {
            const idx = tableRef.indexOf(row);
            if (idx >= 0) tableRef.splice(idx, 1);
          }
          return Promise.resolve({ data: matches, error: null });
        },
        then(onResolve: (v: unknown) => unknown) {
          const matches = rowsMatching(tableRef, filters);
          for (const row of matches) {
            const idx = tableRef.indexOf(row);
            if (idx >= 0) tableRef.splice(idx, 1);
          }
          return Promise.resolve({ data: matches, error: null }).then(
            onResolve,
          );
        },
      };
      return deleteChain;
    },
  };
}

export interface MockClientOptions {
  readonly callerId: string;
}

/**
 * Build a mock Supabase client backed by the in-memory db. The
 * client implements `auth.getUser`, `auth.setSession`, and `from(table)`.
 * Use the same `db` for both browser and service clients to share
 * state across reads/writes (the shim does not enforce RLS).
 *
 * `callerId` is required, not derived from the db. Deriving it from
 * the player list created a temporal coupling: the returned identity
 * would depend on insertion order. Tests pass the caller explicitly.
 */
export function createMockBrowserClient(
  db: InMemoryDb,
  opts: MockClientOptions,
): SupabaseClient {
  const { callerId } = opts;
  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: callerId } },
        error: null,
      })),
      setSession: vi.fn(async () => ({
        data: { session: null },
        error: null,
      })),
    },
    from: (table: string) => makeFluent(db, table as TableName),
  } as unknown as SupabaseClient;
}

export function createMockServiceClient(db: InMemoryDb): SupabaseClient {
  return {
    from: (table: string) => makeFluent(db, table as TableName),
  } as unknown as SupabaseClient;
}
