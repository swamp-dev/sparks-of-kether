-- 0003_fix_players_rls_recursion.sql
--
-- Surfaced by the T3 (#89) integration test on PR #127:
--
--   ERROR: infinite recursion detected in policy for relation "players"
--
-- Root cause: `players_member_select` (created in 0001) checks room
-- membership by selecting from `public.players` itself. Postgres
-- evaluates the inner query under the same policy → recursion.
--
--   create policy players_member_select on public.players for select
--     using (
--       exists (
--         select 1 from public.players p
--         where p.room_id = players.room_id and p.id = auth.uid()
--       )
--     );
--
-- Unit tests with mocked Supabase clients had no RLS layer; the bug
-- only surfaced once we ran the policy against real Postgres.
--
-- Fix: a SECURITY DEFINER function bypasses RLS for the membership
-- check, breaking the recursion. The function is otherwise narrow —
-- it only answers "is `auth.uid()` a member of `target_room_id`?" —
-- and is read-only.

-- Helper function. SECURITY DEFINER runs with the function-owner's
-- privileges (postgres / service-role-equivalent), bypassing the
-- caller's RLS. `set search_path = ''` is the recommended hardening
-- for SECURITY DEFINER functions to prevent search_path attacks.
create or replace function public.is_player_in_room(target_room_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists(
    select 1 from public.players
    where room_id = target_room_id and id = auth.uid()
  );
$$;

-- Replace the recursive policy.
drop policy if exists players_member_select on public.players;

create policy players_member_select on public.players
  for select
  using (public.is_player_in_room(room_id));

-- The same recursion lurks in `game_states_member_select` and
-- `game_events_member_select` — both reference `public.players` from
-- a non-players table, which is fine for those tables (no recursion
-- on themselves). But if the FROM-players subquery hits the broken
-- `players_member_select` policy mid-evaluation, Postgres still
-- recurses. Rewriting them to use the helper too is the safe move.
drop policy if exists game_states_member_select on public.game_states;
create policy game_states_member_select on public.game_states
  for select
  using (public.is_player_in_room(room_id));

drop policy if exists game_events_member_select on public.game_events;
create policy game_events_member_select on public.game_events
  for select
  using (public.is_player_in_room(room_id));
