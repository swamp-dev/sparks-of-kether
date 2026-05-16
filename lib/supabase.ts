import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { GameState } from '@/engine/types';

/**
 * Database row types — mirror the schema in
 * `supabase/migrations/0001_init.sql`. Keep field-by-field parity so
 * the typed client surfaces the right shape to call sites.
 */
export interface RoomRow {
  readonly id: string;
  readonly code: string;
  readonly host_id: string;
  readonly state: 'lobby' | 'playing' | 'paused' | 'finished';
  readonly created_at: string;
  readonly started_at: string | null;
  readonly finished_at: string | null;
  readonly paused_at: string | null;
}

export interface PlayerRow {
  /**
   * Player id. By migration contract this MUST equal `auth.uid()` of
   * the inserting client — RLS membership checks key off it. The
   * schema deliberately has no default; client supplies it.
   */
  readonly id: string;
  readonly room_id: string;
  readonly nickname: string;
  readonly zodiac_sign: string | null;
  readonly ready: boolean;
  readonly seat: number;
  readonly joined_at: string;
}

export interface GameStateRow {
  readonly id: string;
  readonly room_id: string;
  /** GameState serialized through `serializeGameState`. */
  readonly snapshot: SerializedGameState;
  readonly last_event_id: number;
  readonly updated_at: string;
}

export interface GameEventRow {
  readonly id: number;
  readonly room_id: string;
  readonly player_id: string;
  readonly event_type: string;
  readonly payload: unknown;
  readonly created_at: string;
}

// Strip `readonly` from a row type for use in Insert/Update slots.
// Supabase's generic types expect mutable shapes; carrying readonly
// from the Row would collapse the inferred parameter to `never` at
// the `from(...).insert(...)` call site.
type Mutable<T> = { -readonly [K in keyof T]: T[K] };

interface RoomInsert
  extends Omit<
    Mutable<RoomRow>,
    'id' | 'created_at' | 'started_at' | 'finished_at' | 'paused_at' | 'state'
  > {
  id?: string;
  state?: RoomRow['state'];
}

type PlayerInsert = Omit<Mutable<PlayerRow>, 'joined_at'>;

interface GameStateInsert
  extends Omit<Mutable<GameStateRow>, 'id' | 'updated_at'> {
  id?: string;
}

type GameEventInsert = Omit<Mutable<GameEventRow>, 'id' | 'created_at'>;

/**
 * Database type passed to `createClient` so its `from()` calls return
 * the right row shape. This is the canonical place to wire new tables
 * into the typed client.
 *
 * Mutable on purpose: Supabase's generics infer `never` for readonly
 * Insert types at the `from(...).insert(...)` call site.
 */
export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: RoomRow;
        Insert: RoomInsert;
        Update: Partial<Mutable<RoomRow>>;
      };
      players: {
        Row: PlayerRow;
        Insert: PlayerInsert;
        Update: Partial<Mutable<PlayerRow>>;
      };
      game_states: {
        Row: GameStateRow;
        Insert: GameStateInsert;
        Update: Partial<Mutable<GameStateRow>>;
      };
      game_events: {
        Row: GameEventRow;
        Insert: GameEventInsert;
        Update: Partial<Mutable<GameEventRow>>;
      };
    };
    // Postgres functions exposed via PostgREST `/rpc/*`. The typed
    // client routes `client.rpc(name, args)` through this map; the
    // `Args` shape is the named-param object PostgREST expects and
    // `Returns` is the function's return type.
    //
    // Keep entries narrow — one per function the application calls.
    // The generic in `rpc<>` collapses to `never` if the function
    // name isn't listed here (TS will reject the call site).
    Functions: {
      // #325: server-side seat picker for joinRoom. The function is
      // SECURITY DEFINER so the read bypasses RLS for the
      // pre-membership joiner. Returns the assigned seat (0..3) or
      // null if the room is full / doesn't exist / caller is
      // unauthenticated. See migration 0006.
      join_room_next_seat: {
        Args: { target_room_id: string };
        Returns: number | null;
      };
    };
  };
}

/**
 * GameState serializes cleanly except for two fields that are runtime
 * `Set`/`ReadonlySet` instances: `clearedSefirot`, `sparksHeld` (per
 * player) and `revealedCards` (top-level). These don't survive
 * `JSON.stringify`. `serializeGameState` / `deserializeGameState`
 * convert to/from arrays at the persistence boundary.
 */
export interface SerializedGameState
  extends Omit<GameState, 'players' | 'revealedCards'> {
  readonly players: readonly SerializedPlayerState[];
  readonly revealedCards: readonly number[];
}

export interface SerializedPlayerState
  extends Omit<
    GameState['players'][number],
    'clearedSefirot' | 'sparksHeld'
  > {
  readonly clearedSefirot: readonly string[];
  readonly sparksHeld: readonly string[];
}

export function serializeGameState(state: GameState): SerializedGameState {
  return {
    ...state,
    revealedCards: [...state.revealedCards],
    players: state.players.map((p) => ({
      ...p,
      clearedSefirot: [...p.clearedSefirot],
      sparksHeld: [...p.sparksHeld],
    })),
  };
}

/**
 * Inverse of `serializeGameState`. Restores Set instances. Trusts the
 * caller (the row came from the engine's own `serializeGameState`).
 */
export function deserializeGameState(
  serialized: SerializedGameState,
): GameState {
  return {
    ...serialized,
    revealedCards: new Set(serialized.revealedCards),
    players: serialized.players.map((p) => ({
      ...p,
      clearedSefirot: new Set(p.clearedSefirot) as GameState['players'][number]['clearedSefirot'],
      sparksHeld: new Set(p.sparksHeld) as GameState['players'][number]['sparksHeld'],
    })),
  };
}

/**
 * Read environment variables. Reads `NEXT_PUBLIC_SUPABASE_URL` and
 * `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the public anon key is safe to
 * ship to the browser; service-role keys never leave the server.
 *
 * Throws if missing. Production should fail loudly at startup rather
 * than first-request, so this lives at module level.
 */
function readEnv(): { readonly url: string; readonly anonKey: string } {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const anonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  if (!url || !anonKey) {
    throw new Error(
      'Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local. See .env.example.',
    );
  }
  return { url, anonKey };
}

/**
 * Browser-side typed client. Persists the session in localStorage so
 * a page refresh keeps the same anonymous player identity (the auth
 * UID becomes the `players.id` for join + write authorization).
 *
 * Lazy + singleton — tests and build-time tools that don't need the
 * client don't trigger `readEnv()`.
 */
let cachedBrowser: SupabaseClient<Database> | null = null;

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (cachedBrowser !== null) return cachedBrowser;
  const { url, anonKey } = readEnv();
  cachedBrowser = createClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return cachedBrowser;
}

/**
 * Server-side typed client (RSC, route handlers, edge functions).
 * NEVER persists a session — there's no localStorage on the server,
 * and a server component shouldn't be sharing a cached auth state
 * across requests anyway. Each server invocation gets a fresh
 * client; the auth subject is determined by the request's cookies
 * (handled separately by the caller via `auth.setSession`).
 */
export function createSupabaseServerClient(): SupabaseClient<Database> {
  const { url, anonKey } = readEnv();
  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Server-only client authenticated with the service role key. Bypasses
 * RLS — used for the authoritative `game_states` snapshot write inside
 * the events route, since the table intentionally has no UPDATE policy
 * (the engine is the only legitimate writer).
 *
 * Throws if `SUPABASE_SERVICE_ROLE_KEY` is missing. The variable is
 * deliberately unprefixed so Next won't bundle it into client code.
 * NEVER call this from a Client Component or any code that ships to
 * the browser.
 */
export function createSupabaseServiceClient(): SupabaseClient<Database> {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!url || !serviceKey) {
    throw new Error(
      'Service-role Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local. See .env.example.',
    );
  }
  return createClient<Database>(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Back-compat alias for the browser client. New code should call
 * `getSupabaseBrowserClient` explicitly so the surface name reflects
 * the intent (browser-only).
 */
export const getSupabaseClient = getSupabaseBrowserClient;

/**
 * Test-only: reset the cached browser client. Production never needs
 * this — the singleton is fine for the lifetime of the page.
 */
export function __resetSupabaseClientForTests(): void {
  cachedBrowser = null;
}
