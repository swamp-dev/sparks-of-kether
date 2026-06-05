-- 0009_extend_seats_to_six.sql
--
-- #273: extend the players.seat range from 0–3 to 0–5 to support up
-- to 6 players per room (from the original 4).
--
-- Two changes:
--   1. Drop the players_seat_range_chk CHECK constraint (seat between
--      0 and 3) and replace it with seat between 0 and 5.
--   2. Replace the join_room_next_seat RPC body — change the room
--      ceiling from 4 to 6 and the generate_series upper bound from
--      3 to 5.

-- 1. Extend seat constraint from 0–3 to 0–5.
alter table public.players
  drop constraint players_seat_range_chk;

alter table public.players
  add constraint players_seat_range_chk check (seat between 0 and 5);

-- 2. Replace join_room_next_seat RPC with 6-seat ceiling.
--    Function signature is unchanged so existing grants on the
--    function OID persist; revoke/grant block below makes the
--    permissions explicit for parity with migration 0006.
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

  -- Room ceiling check. Mirrors MAX_PLAYERS_PER_ROOM in lib/rooms.ts
  -- (6) and the players_seat_range_chk constraint (seat between 0 and 5).
  select count(*)
    into used_count
    from public.players
    where room_id = target_room_id;
  if used_count >= 6 then
    return null;
  end if;

  -- Smallest non-negative seat not already taken in this room.
  select s
    into next_seat
    from generate_series(0, 5) as s
    where s not in (
      select seat from public.players where room_id = target_room_id
    )
    order by s
    limit 1;

  return next_seat;
end;
$$;

-- Revoke/grant pattern mirrors migration 0006.
revoke all on function public.join_room_next_seat(uuid) from public;
revoke all on function public.join_room_next_seat(uuid) from anon;
revoke all on function public.join_room_next_seat(uuid) from authenticated;
grant execute on function public.join_room_next_seat(uuid) to anon;
grant execute on function public.join_room_next_seat(uuid) to authenticated;
grant execute on function public.join_room_next_seat(uuid) to service_role;
