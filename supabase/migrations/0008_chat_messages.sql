-- Migration 0008: chat_messages for real-time in-game chat
--
-- Adds a chat_messages table so players can discuss strategy in
-- multiplayer rooms. Chat persists in Postgres so late-joiners see
-- history on refresh. The table is added to supabase_realtime so
-- INSERT events stream to all room members via postgres_changes.
--
-- RLS contract mirrors game_events:
--   SELECT — room members via is_player_in_room() (defined in 0003).
--   INSERT — player_id = auth.uid() AND is_player_in_room(room_id).
--             No UPDATE or DELETE — chat is append-only from the client.
--
-- Idempotent: CREATE TABLE IF NOT EXISTS guards the table; the DO
-- block guards the publication add (matching the 0007 pattern).

create table if not exists public.chat_messages (
  id         bigserial primary key,
  room_id    uuid not null references public.rooms(id) on delete cascade,
  -- player_id MUST equal auth.uid() for every insert. RLS enforces it
  -- via the INSERT policy; we do NOT use gen_random_uuid() here for the
  -- same reason as players.id (see 0001_init.sql). ON DELETE CASCADE
  -- mirrors game_events so messages are cleaned up when a player is removed.
  player_id  uuid not null references public.players(id) on delete cascade,
  -- Denormalized from players.nickname at insert time so the client
  -- doesn't need a join for rendering. Acceptable tradeoff: nickname
  -- changes are not supported post-join, so old messages always show
  -- the name the player had when they joined.
  nickname   text not null,
  body       text not null,
  created_at timestamptz not null default now(),
  constraint chat_messages_body_length_chk check (char_length(body) <= 280)
);

-- Composite index on (room_id, id DESC) satisfies the common query:
-- "last 50 messages for this room ordered newest-last."
create index if not exists chat_messages_room_idx
  on public.chat_messages (room_id, id desc);

-- ──────────────── RLS ────────────────
alter table public.chat_messages enable row level security;

-- Members can read all chat in their room.
-- is_player_in_room is SECURITY DEFINER (0003) — no recursion.
create policy chat_messages_member_select on public.chat_messages
  for select
  using (public.is_player_in_room(room_id));

-- A player may insert their own messages only, and only if they are
-- already a member of the room.
create policy chat_messages_member_insert on public.chat_messages
  for insert
  with check (
    player_id = auth.uid()
    and public.is_player_in_room(room_id)
  );

-- Publish to Realtime so INSERT events reach all room members.
-- Idempotent DO block — mirrors 0007_pause_state.sql pattern exactly.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'chat_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.chat_messages';
  end if;
end $$;
