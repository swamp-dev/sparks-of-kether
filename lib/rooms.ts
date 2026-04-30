'use client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ZodiacSignKey } from '@/data';
import type { Database, RoomRow } from './supabase';
import { generateRoomCode } from './room-code';
import { query } from './supabase-query';

/**
 * Local type alias for the Supabase client. The Database generic IS
 * carried through so callers get typed `auth.*` etc., but writes go
 * via `query(client, table)` from `./supabase-query` — that helper
 * centralizes the cast to plain `SupabaseClient` needed to bypass
 * the Insert-overload-collapses-to-`never` issue documented there.
 */
type Client = SupabaseClient<Database>;

/**
 * Maximum players per room. Mirrors the design ceiling
 * (`design/mechanics.md` § Player count scaling) and the engine's
 * `initializeGame` upper bound.
 */
export const MAX_PLAYERS_PER_ROOM = 4;

/**
 * Number of times to retry on a unique-code collision before giving
 * up. With a 32^6 ≈ 1B alphabet, even five active rooms collide with
 * probability ~5×10^-9; ten retries is paranoia-grade.
 */
const CODE_GEN_MAX_RETRIES = 10;

export type CreateRoomError =
  | { readonly kind: 'auth-failed'; readonly cause: string }
  | { readonly kind: 'code-generation-exhausted' }
  | { readonly kind: 'insert-failed'; readonly cause: string };

export type JoinRoomError =
  | { readonly kind: 'auth-failed'; readonly cause: string }
  | { readonly kind: 'room-not-found'; readonly code: string }
  | { readonly kind: 'room-not-joinable'; readonly state: RoomRow['state'] }
  | { readonly kind: 'room-full' }
  | { readonly kind: 'seat-rpc-failed'; readonly cause: string }
  | { readonly kind: 'self-lookup-failed'; readonly cause: string }
  | { readonly kind: 'insert-failed'; readonly cause: string };

export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/**
 * Sign in anonymously if not already signed in. Supabase anon
 * sessions are persisted in localStorage by the browser client, so a
 * page refresh keeps the same identity. The returned `userId` is the
 * `auth.uid()` that becomes `players.id` and `rooms.host_id` per the
 * RLS contract documented in `supabase/migrations/0001_init.sql`.
 */
async function ensureAnonymousSession(
  client: Client,
): Promise<Result<{ readonly userId: string }, { readonly cause: string }>> {
  const existing = await client.auth.getUser();
  if (existing.data.user) {
    return { ok: true, value: { userId: existing.data.user.id } };
  }
  const signed = await client.auth.signInAnonymously();
  if (signed.error || !signed.data.user) {
    return {
      ok: false,
      error: { cause: signed.error?.message ?? 'anonymous sign-in returned no user' },
    };
  }
  return { ok: true, value: { userId: signed.data.user.id } };
}

export interface CreateRoomInput {
  readonly nickname: string;
  readonly client: Client;
}

export interface CreateRoomSuccess {
  readonly code: string;
  readonly roomId: string;
  readonly playerId: string;
}

/**
 * Create a new room and seat the caller as host (seat 0). Generates
 * a unique 6-char code with retry on collision. Two writes (room +
 * player) — on player insert failure we delete the orphan room so a
 * stuck code doesn't persist.
 */
export async function createRoom(
  input: CreateRoomInput,
): Promise<Result<CreateRoomSuccess, CreateRoomError>> {
  const { client, nickname } = input;
  const auth = await ensureAnonymousSession(client);
  if (!auth.ok) {
    return { ok: false, error: { kind: 'auth-failed', cause: auth.error.cause } };
  }
  const userId = auth.value.userId;

  // Try a few times in case of a code collision.
  for (let attempt = 0; attempt < CODE_GEN_MAX_RETRIES; attempt++) {
    const code = generateRoomCode();
    // `.select().single()` here is safe because `rooms.id` has a
    // server-side default (`gen_random_uuid()`), so we genuinely need
    // the RETURNING payload. The same pattern on `players` triggers
    // a PostgREST 12 RLS false-positive — see the comment on the
    // players insert below.
    const roomInsert = await query(client, 'rooms')
      .insert({ code, host_id: userId })
      .select()
      .single<RoomRow>();
    if (roomInsert.error) {
      // 23505 = unique_violation; retry.
      if (roomInsert.error.code === '23505') continue;
      return {
        ok: false,
        error: { kind: 'insert-failed', cause: roomInsert.error.message },
      };
    }
    const room = roomInsert.data;
    // Plain insert (no `.select()` chain) on purpose. Chaining
    // `.select()` makes supabase-js send `Prefer: return=representation`,
    // and PostgREST 12.2 rejects that combination against the
    // `players_join` RLS policy (`WITH CHECK (id = auth.uid())`) with
    // a 42501 RLS error — even though every input matches and the
    // identical pattern works for `rooms` (where `id` has a server
    // default). Investigation log: T3 (#89) PR #127. The inserted
    // row's id is `userId` by construction, so we can return it
    // without needing the RETURNING payload.
    const playerInsert = await query(client, 'players').insert({
      id: userId,
      room_id: room.id,
      nickname,
      zodiac_sign: null,
      ready: false,
      seat: 0,
    });
    if (playerInsert.error) {
      // Roll back the orphan room so a stuck code doesn't persist.
      await query(client, 'rooms').delete().eq('id', room.id);
      return {
        ok: false,
        error: { kind: 'insert-failed', cause: playerInsert.error.message },
      };
    }
    return {
      ok: true,
      value: { code: room.code, roomId: room.id, playerId: userId },
    };
  }
  return { ok: false, error: { kind: 'code-generation-exhausted' } };
}

export interface JoinRoomInput {
  readonly code: string;
  readonly nickname: string;
  readonly client: Client;
}

export interface JoinRoomSuccess {
  readonly roomId: string;
  readonly playerId: string;
  readonly seat: number;
}

/**
 * Join an existing room by code. Validates the room is in lobby
 * state, then asks Postgres for the next free seat via the
 * `join_room_next_seat` RPC (migration 0006), and finally inserts
 * the player row via the existing `players_join` RLS path with the
 * seat pre-baked.
 *
 * **Why an RPC for seat-pick.** The original implementation read
 * `players` under the joiner's auth scope and computed
 * `max(seat) + 1` client-side. The `players_member_select` RLS
 * policy denies that read because the joiner isn't yet a member —
 * they see an empty list, pick seat 0, and collide with the host on
 * `players_seat_per_room_unique`. The RPC is `security definer` and
 * runs as the function owner, bypassing RLS for the read while
 * keeping the insert authorization on the joiner's auth principal
 * (so `id = auth.uid()` is still enforced at write time).
 *
 * Concurrency: the RPC takes no row lock. Two concurrent joiners can
 * race and be handed the same seat; the loser's insert hits the
 * unique constraint and surfaces as `insert-failed`. For the
 * lobby-join scale (4 players, human-paced clicks) that's
 * acceptable; if real contention shows up later we can switch the
 * RPC to `select ... for update` on `rooms`.
 */
export async function joinRoom(
  input: JoinRoomInput,
): Promise<Result<JoinRoomSuccess, JoinRoomError>> {
  const { client, code, nickname } = input;
  const auth = await ensureAnonymousSession(client);
  if (!auth.ok) {
    return { ok: false, error: { kind: 'auth-failed', cause: auth.error.cause } };
  }
  const userId = auth.value.userId;

  // Reads use the typed client directly — the Insert-overload-
  // collapse issue that `query()` works around only affects writes.
  // Mixing query() into reads creates two patterns in this file
  // (reviewer flagged on #114).
  //
  // The room read passes RLS via `rooms_find_by_code` (any
  // authenticated user can resolve a code → row). It's the
  // *players* read that the joiner can't do pre-membership; that's
  // why the seat-pick has moved to the RPC below.
  const roomLookup = await client
    .from('rooms')
    .select('id, code, host_id, state, created_at, started_at, finished_at')
    .eq('code', code)
    .maybeSingle<RoomRow>();
  if (roomLookup.error || !roomLookup.data) {
    return { ok: false, error: { kind: 'room-not-found', code } };
  }
  const room: RoomRow = roomLookup.data;
  if (room.state !== 'lobby') {
    return { ok: false, error: { kind: 'room-not-joinable', state: room.state } };
  }

  // Service-role-equivalent (security definer) seat pick. Returns
  // the assigned seat 0..3, or null if the room is full / doesn't
  // exist. We've already established the room exists via the lookup
  // above, so a null return here means the room is full.
  //
  // The RPC is also idempotent: if `auth.uid()` already has a row
  // for this room it returns the existing seat. That keeps the
  // "already in this room" branch from needing a separate read.
  // The typed `client.rpc(name, args)` overload in supabase-js 2.104
  // collapses `Args` to `never` unless the call site provides a
  // matching `Schema['Functions'][name]['Args']`, but the schema
  // resolution doesn't reliably reach our Database type once the
  // client type parameter is captured (the same Insert-overload-
  // collapse pattern documented in `supabase-query.ts`). Cast at
  // the boundary so the args object is accepted; the runtime path
  // is unaffected, and the return value is read through our
  // Database type below.
  const seatRpc = await (
    client as unknown as {
      rpc: (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{
        data: Database['public']['Functions']['join_room_next_seat']['Returns'];
        error: { message: string } | null;
      }>;
    }
  ).rpc('join_room_next_seat', {
    target_room_id: room.id,
  });
  if (seatRpc.error) {
    return {
      ok: false,
      error: { kind: 'seat-rpc-failed', cause: seatRpc.error.message },
    };
  }
  // The Database['public']['Functions'] type pins `Returns` as
  // `number | null`; the typed `.rpc()` surfaces that without a cast.
  const assignedSeat = seatRpc.data;
  if (assignedSeat === null) {
    return { ok: false, error: { kind: 'room-full' } };
  }

  // If the RPC handed back an existing seat (idempotent re-join),
  // we still need to skip the insert. Detect that by reading our
  // own row — under `players_member_select` the joiner CAN read
  // their own row when the RPC has confirmed they're already a
  // member, because the RLS membership check
  // (`is_player_in_room(room_id)`) succeeds.
  const selfLookup = await client
    .from('players')
    .select('id, seat')
    .eq('room_id', room.id)
    .eq('id', userId)
    .maybeSingle<{ id: string; seat: number }>();
  // Guard against PostgREST errors falling through to the insert path.
  // Without this, a transient self-lookup error (e.g. connection lost)
  // would silently drop into `.insert()`, which then either hits
  // `players_seat_per_room_unique` for a re-joining player (surfaces
  // confusingly as `insert-failed` with a constraint-violation cause)
  // or, if the previous row was somehow removed, creates a ghost row
  // that doesn't match what the RPC returned. Fail fast instead.
  if (selfLookup.error) {
    return {
      ok: false,
      error: { kind: 'self-lookup-failed', cause: selfLookup.error.message },
    };
  }
  if (selfLookup.data) {
    return {
      ok: true,
      value: {
        roomId: room.id,
        playerId: selfLookup.data.id,
        seat: selfLookup.data.seat,
      },
    };
  }

  // Plain insert (no `.select()` chain). See createRoom for the
  // PostgREST 12 + RLS interaction that motivates this — same fix.
  // Inserted row's id and seat are known client-side; the RLS
  // `players_join` policy still enforces `id = auth.uid()`.
  const playerInsert = await query(client, 'players').insert({
    id: userId,
    room_id: room.id,
    nickname,
    zodiac_sign: null,
    ready: false,
    seat: assignedSeat,
  });
  if (playerInsert.error) {
    return {
      ok: false,
      error: { kind: 'insert-failed', cause: playerInsert.error.message },
    };
  }
  return {
    ok: true,
    value: { roomId: room.id, playerId: userId, seat: assignedSeat },
  };
}

export type KickPlayerError =
  | { readonly kind: 'self-kick-forbidden' }
  | { readonly kind: 'delete-failed'; readonly cause: string }
  | { readonly kind: 'no-row-deleted' };

/**
 * Remove a player from a room. The DB-side `players_host_delete` RLS
 * policy enforces both "caller is the room's host" and "target is
 * not the caller themselves". We pre-check the self-kick case for a
 * faster, more informative client error.
 *
 * Used by ticket #36's grace-timer flow: after the active player has
 * been disconnected past the grace window, the host can kick them.
 *
 * Note: kicking does NOT advance the engine's `activePlayerId` — the
 * snapshot still names the kicked player as active. The next normal
 * `end-turn` event rotates past them. A future ticket may add a
 * dedicated `kick-and-rotate` server action; for now the simpler
 * primitive is enough.
 */
export async function kickPlayer(
  client: Client,
  input: {
    readonly roomId: string;
    readonly targetPlayerId: string;
    readonly callerId: string;
  },
): Promise<Result<{ readonly playerId: string }, KickPlayerError>> {
  if (input.callerId === input.targetPlayerId) {
    return { ok: false, error: { kind: 'self-kick-forbidden' } };
  }
  const del = await query(client, 'players')
    .delete()
    .eq('room_id', input.roomId)
    .eq('id', input.targetPlayerId)
    .select('id');
  if (del.error) {
    return {
      ok: false,
      error: { kind: 'delete-failed', cause: del.error.message },
    };
  }
  // RLS denial returns success-with-empty-result rather than an
  // error — surface that as a distinct case so callers can tell
  // "the host policy didn't match" apart from a transient failure.
  const rows = (del.data ?? []) as readonly { id: string }[];
  if (rows.length === 0) {
    return { ok: false, error: { kind: 'no-row-deleted' } };
  }
  return { ok: true, value: { playerId: input.targetPlayerId } };
}

export interface UpdatePlayerError {
  readonly kind: 'update-failed';
  readonly cause: string;
}

/**
 * Update the caller's `players.zodiac_sign`. Used by the multiplayer
 * lobby's ZodiacSignPicker to record the chosen sign in Supabase.
 *
 * RLS contract: `players_self_update` (migration 0001) gates updates
 * to rows where `id = auth.uid()`, so callers can only mutate their
 * own row. We pass `playerId` explicitly rather than reading
 * `auth.uid()` here because the browser flow already knows it from
 * `useLobby.currentPlayerId` and a redundant round-trip is wasted.
 *
 * Plain update (no `.select()` chain) for the same PostgREST 12 + RLS
 * + `Prefer: return=representation` interaction documented in
 * `createRoom`. The Realtime channel surfaces the new value to other
 * tabs without us needing the row back.
 *
 * Sign uniqueness across players is enforced by
 * `validateAndBuildSetup` at Begin-time (and the picker disables
 * already-taken signs client-side). The DB column has no UNIQUE
 * constraint — two players could in theory race to claim the same
 * sign, and the host's Begin would reject with `duplicate-zodiac-signs`.
 */
export async function setZodiacSign(
  client: Client,
  input: { readonly playerId: string; readonly sign: ZodiacSignKey },
): Promise<Result<{ readonly playerId: string }, UpdatePlayerError>> {
  const update = await query(client, 'players')
    .update({ zodiac_sign: input.sign })
    .eq('id', input.playerId);
  if (update.error) {
    return {
      ok: false,
      error: { kind: 'update-failed', cause: update.error.message },
    };
  }
  return { ok: true, value: { playerId: input.playerId } };
}

/**
 * Update the caller's `players.ready` flag. Used by the multiplayer
 * lobby's per-player Ready toggle. The host's Begin gate watches every
 * player's `ready` and `zodiac_sign` (plus the server-side check in
 * `validateAndBuildSetup`).
 *
 * Same RLS / no-`.select()` rationale as `setZodiacSign`.
 */
export async function setReady(
  client: Client,
  input: { readonly playerId: string; readonly ready: boolean },
): Promise<Result<{ readonly playerId: string }, UpdatePlayerError>> {
  const update = await query(client, 'players')
    .update({ ready: input.ready })
    .eq('id', input.playerId);
  if (update.error) {
    return {
      ok: false,
      error: { kind: 'update-failed', cause: update.error.message },
    };
  }
  return { ok: true, value: { playerId: input.playerId } };
}
