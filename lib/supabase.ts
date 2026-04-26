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
  readonly state: 'lobby' | 'playing' | 'finished';
  readonly created_at: string;
  readonly started_at: string | null;
  readonly finished_at: string | null;
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
  readonly soul_aspect: string | null;
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

/**
 * Database type passed to `createClient` so its `from()` calls return
 * the right row shape. This is the canonical place to wire new tables
 * into the typed client.
 */
export interface Database {
  readonly public: {
    readonly Tables: {
      readonly rooms: {
        readonly Row: RoomRow;
        readonly Insert: Omit<RoomRow, 'id' | 'created_at' | 'started_at' | 'finished_at' | 'state'> &
          Partial<Pick<RoomRow, 'id' | 'state'>>;
        readonly Update: Partial<RoomRow>;
      };
      readonly players: {
        readonly Row: PlayerRow;
        // `id` is required on insert (no DB default) — the client
        // must supply `auth.uid()` per the RLS contract.
        readonly Insert: Omit<PlayerRow, 'joined_at'>;
        readonly Update: Partial<PlayerRow>;
      };
      readonly game_states: {
        readonly Row: GameStateRow;
        readonly Insert: Omit<GameStateRow, 'id' | 'updated_at'> & {
          readonly id?: string;
        };
        readonly Update: Partial<GameStateRow>;
      };
      readonly game_events: {
        readonly Row: GameEventRow;
        readonly Insert: Omit<GameEventRow, 'id' | 'created_at'>;
        readonly Update: Partial<GameEventRow>;
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
