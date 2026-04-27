-- 0002_player_kick.sql
--
-- Lets the host of a room remove a player from it. Used by ticket #36
-- (presence + disconnect): after the 60s grace timer expires for a
-- disconnected active player, the host can kick them out. Without an
-- explicit DELETE policy, RLS silently denies the delete.
--
-- Scoped tightly:
--   - Only the room's host (`rooms.host_id = auth.uid()`) may delete.
--   - Hosts cannot delete themselves (would orphan the room with no
--     owner; lobby rollback path is the only legitimate self-delete
--     case and that's the room delete, not the player delete).
--
-- Phase / state guard:
--   No state restriction — a kick is legitimate during 'playing' too.
--   The grace-timer flow only surfaces the option during disconnects,
--   but RLS shouldn't second-guess that — the UI is the gate.

create policy players_host_delete on public.players
  for delete
  using (
    id <> auth.uid()
    and exists (
      select 1 from public.rooms r
      where r.id = players.room_id
        and r.host_id = auth.uid()
    )
  );
