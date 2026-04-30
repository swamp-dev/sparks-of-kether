-- 0006_join_room_seat_rpc.sql
--
-- #325: multi-player join was broken end-to-end. `joinRoom` in
-- `lib/rooms.ts` calculated the next seat by reading `players` under
-- the JOINER's auth scope. The `players_member_select` RLS policy
-- (introduced in 0001 and reshaped in 0003 to break recursion via
-- `is_player_in_room`) denies that read because the joiner isn't yet
-- a member of the room — they see an empty list, pick seat 0, and
-- collide with the host on `players_seat_per_room_unique`.
--
-- #265's integration test side-stepped this with a service-role
-- helper (`seedSecondPlayer`) but the production browser flow
-- (`components/setup/HomeRoomForms.tsx`) hits the same constraint
-- violation. This migration adds a narrow `security definer` RPC that
-- bypasses RLS just for the seat-pick read; `joinRoom` then inserts
-- via the existing `players_join` RLS path with the seat pre-baked.
--
-- Pattern mirrors `is_player_in_room` (0003) and `publication_tables`
-- (0005): `security definer`, `set search_path = ''`, no grants to
-- `public`, explicit revokes from anon/authenticated before the
-- targeted grants.

-- Returns the next free seat (0..3) for `target_room_id`, or NULL if
-- the room doesn't exist or is already at the player ceiling.
--
-- Locking semantics: the function takes no row lock — a true race
-- between two concurrent joiners can hand both the same seat. The
-- `players_seat_per_room_unique` constraint catches that at insert
-- time; the joiner that loses sees an `insert-failed` and can retry.
-- For the lobby-join scale (4 players, human-paced clicks) that's
-- acceptable. If we later see real contention we can switch to
-- `select ... for update` on `rooms` to serialize the read+pick.
--
-- The RPC returns the assigned seat; a `null` return means the room
-- was full at the time of the read. The caller (`joinRoom`) maps
-- that to the existing `room-full` Result variant for caller
-- compatibility.
--
-- ROOM-FULL TIE-BREAK: if `target_room_id` doesn't exist, the
-- function also returns NULL. Callers can disambiguate by doing the
-- room lookup first (which `joinRoom` already does for the lobby /
-- non-lobby state check). This keeps the RPC narrow — it answers
-- only "what seat should I take?", not "does the room exist?".
--
-- IDEMPOTENCY: if `auth.uid()` already has a row for `target_room_id`,
-- return that row's seat (caller is already a member; no new seat to
-- pick). This matches `joinRoom`'s "already in this room" branch and
-- keeps the round-trip count down.
create or replace function public.join_room_next_seat(target_room_id uuid)
returns int
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  caller_uid uuid := auth.uid();
  existing_seat int;
  used_count int;
  next_seat int;
begin
  -- Must be authenticated; anonymous Supabase sessions still have a
  -- non-null uid (the anon JWT carries it), so this also rejects
  -- unauthenticated callers cleanly.
  if caller_uid is null then
    return null;
  end if;

  -- Idempotent: if the caller already has a row for this room, hand
  -- back their existing seat.
  select seat
    into existing_seat
    from public.players
    where room_id = target_room_id
      and id = caller_uid
    limit 1;
  if existing_seat is not null then
    return existing_seat;
  end if;

  -- Room ceiling check. Mirrors `MAX_PLAYERS_PER_ROOM` in
  -- `lib/rooms.ts` (4) and the `players_seat_range_chk` constraint
  -- in 0001 (`seat between 0 and 3`).
  select count(*)
    into used_count
    from public.players
    where room_id = target_room_id;
  if used_count >= 4 then
    return null;
  end if;

  -- Smallest non-negative seat not already taken in this room. Using
  -- `generate_series(0, 3)` + `EXCEPT` keeps the function tiny and
  -- avoids the `max(seat) + 1` shape that would re-use a freed seat
  -- only by accident (and would skip past gaps from a kicked
  -- player). Pick the lowest available seat, deterministic.
  select s
    into next_seat
    from generate_series(0, 3) as s
    where s not in (
      select seat from public.players where room_id = target_room_id
    )
    order by s
    limit 1;

  return next_seat;
end;
$$;

-- Lock down the function surface. `security definer` runs with the
-- function-owner's privileges (postgres / service-role-equivalent),
-- so we revoke from the broad roles and grant ONLY to the auth
-- principals that legitimately call it: `anon` (pre-sign-in browsers
-- — not used today, kept symmetric) and `authenticated` (the anon
-- session that the browser produces after `signInAnonymously`).
-- `service_role` always has execute by default but we make it
-- explicit for parity with 0005's pattern.
revoke all on function public.join_room_next_seat(uuid) from public;
revoke all on function public.join_room_next_seat(uuid) from anon;
revoke all on function public.join_room_next_seat(uuid) from authenticated;
grant execute on function public.join_room_next_seat(uuid) to anon;
grant execute on function public.join_room_next_seat(uuid) to authenticated;
grant execute on function public.join_room_next_seat(uuid) to service_role;
