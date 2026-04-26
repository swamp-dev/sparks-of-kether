'use client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlayerRow, RoomRow } from './supabase';
import { generateRoomCode } from './room-code';

/**
 * Local type alias for the Supabase client. We don't pass the
 * `Database` generic through here — Supabase 2.x's overload
 * resolution collapses Insert types to `never` when readonly Row
 * shapes feed Insert via Omit/Pick, even with `Mutable<>` strip.
 * Routes that need typed reads explicitly call `.single<RowType>()`.
 */
type Client = SupabaseClient;

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
  | { readonly kind: 'players-fetch-failed'; readonly cause: string }
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
    const roomInsert = await client
      .from('rooms')
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
    const playerInsert = await client
      .from('players')
      .insert({
        id: userId,
        room_id: room.id,
        nickname,
        soul_aspect: null,
        ready: false,
        seat: 0,
      })
      .select()
      .single<PlayerRow>();
    if (playerInsert.error) {
      // Roll back the orphan room so a stuck code doesn't persist.
      await client.from('rooms').delete().eq('id', room.id);
      return {
        ok: false,
        error: { kind: 'insert-failed', cause: playerInsert.error.message },
      };
    }
    return {
      ok: true,
      value: { code: room.code, roomId: room.id, playerId: playerInsert.data.id },
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
 * state and not full, then assigns the next free seat (max-existing
 * seat + 1). Race condition with another concurrent join is mitigated
 * by the `players_seat_per_room_unique` constraint — on conflict the
 * caller can retry, but for now we surface a clean error.
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

  const players = await client
    .from('players')
    .select('id, room_id, nickname, soul_aspect, ready, seat, joined_at')
    .eq('room_id', room.id);
  if (players.error) {
    return {
      ok: false,
      error: { kind: 'players-fetch-failed', cause: players.error.message },
    };
  }
  // Cast at the boundary — Supabase's chained `.select(cols)` is
  // typed structurally and our cols match `PlayerRow`. Explicit
  // cast keeps `existing` strongly typed for the seat math below.
  const existing = (players.data ?? []) as readonly PlayerRow[];
  if (existing.length >= MAX_PLAYERS_PER_ROOM) {
    return { ok: false, error: { kind: 'room-full' } };
  }
  // If the current user is already in this room, return their existing seat.
  const self = existing.find((p) => p.id === userId);
  if (self) {
    return {
      ok: true,
      value: { roomId: room.id, playerId: self.id, seat: self.seat },
    };
  }
  const nextSeat =
    existing.reduce((max, p) => Math.max(max, p.seat), -1) + 1;

  const playerInsert = await client
    .from('players')
    .insert({
      id: userId,
      room_id: room.id,
      nickname,
      soul_aspect: null,
      ready: false,
      seat: nextSeat,
    })
    .select('id, room_id, nickname, soul_aspect, ready, seat, joined_at')
    .single();
  if (playerInsert.error) {
    return {
      ok: false,
      error: { kind: 'insert-failed', cause: playerInsert.error.message },
    };
  }
  return {
    ok: true,
    value: {
      roomId: room.id,
      playerId: playerInsert.data.id,
      seat: playerInsert.data.seat,
    },
  };
}
