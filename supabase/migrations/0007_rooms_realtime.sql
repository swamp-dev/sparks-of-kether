-- 0007_rooms_realtime.sql
--
-- #95: surface `public.rooms` to the Supabase Realtime broadcast channel.
-- Without this the lobby's rooms subscription silently never fires —
-- non-hosts never see room state changes (e.g., playing → lobby after
-- the host resets). Mirrors the idempotent pattern from migration 0005
-- which added `players` and `game_states`.

do $$
begin
  alter publication supabase_realtime add table public.rooms;
exception when duplicate_object then null;
end $$;
