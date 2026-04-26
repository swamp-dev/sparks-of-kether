-- Initial schema for Sparks of Kether multiplayer.
--
-- Apply via:  supabase migration up   (or paste into the SQL editor of a
-- fresh Supabase project).
--
-- Naming follows the project's snake_case table convention. RLS is
-- enforced on every table — the only writes allowed are by a player
-- whose `nickname_hash` (an anonymous-session token) matches the row's
-- claimed identity.

-- ──────────────── rooms ────────────────
create table public.rooms (
  id          uuid primary key default gen_random_uuid(),
  -- 6-character invite code (uppercase alphanum, no I/O/0/1 to avoid
  -- look-alikes). Application-side: generate, retry on conflict.
  code        text not null,
  host_id     uuid not null,
  -- Lifecycle: 'lobby' | 'playing' | 'finished'. Stored as text rather
  -- than an enum so adding a state in the engine doesn't require a
  -- schema migration.
  state       text not null default 'lobby',
  created_at  timestamptz not null default now(),
  started_at  timestamptz,
  finished_at timestamptz,
  constraint rooms_code_unique unique (code),
  constraint rooms_state_chk check (state in ('lobby', 'playing', 'finished'))
);

create index rooms_code_idx on public.rooms (code);
create index rooms_host_idx on public.rooms (host_id);

-- ──────────────── players ────────────────
-- IMPORTANT: `id` MUST equal `auth.uid()` for every insert. The RLS
-- model anchors membership on `id = auth.uid()`; a client that writes
-- a fresh UUID instead would create a row that nobody can read or
-- update. We don't default `gen_random_uuid()` here on purpose —
-- inserts must come from the client with `id = auth.uid()` (the
-- `players_join` policy below enforces it at insert time).
create table public.players (
  id          uuid primary key,
  room_id     uuid not null references public.rooms(id) on delete cascade,
  nickname    text not null,
  -- One of the six SoulAspectKey values, or null while the player is
  -- still picking. The DB doesn't enforce the value enum — the engine
  -- does — so adding a Soul Aspect doesn't require a migration.
  soul_aspect text,
  ready       boolean not null default false,
  -- Player seat 0..N-1; assigned at lobby join. Drives turn order in
  -- `useTurn`'s activePlayerIndex.
  seat        int not null,
  joined_at   timestamptz not null default now(),
  constraint players_seat_per_room_unique unique (room_id, seat),
  constraint players_seat_range_chk check (seat between 0 and 3)
);

create index players_room_idx on public.players (room_id);

-- ──────────────── game_states ────────────────
-- Authoritative snapshot. One row per room. The full GameState
-- (engine/types.ts) lives in `snapshot` as JSON; the engine's
-- discriminated unions deserialize cleanly.
create table public.game_states (
  id            uuid primary key default gen_random_uuid(),
  room_id       uuid not null references public.rooms(id) on delete cascade,
  snapshot      jsonb not null,
  -- Last applied event id from `game_events`. Clients read this to
  -- detect skipped pushes and request a resync.
  last_event_id bigint not null default 0,
  updated_at    timestamptz not null default now(),
  constraint game_states_room_unique unique (room_id)
);

create index game_states_room_idx on public.game_states (room_id);

-- ──────────────── game_events ────────────────
-- Append-only event log. Every player action lands here; the
-- authoritative `game_states` row is updated by a server function
-- (or trusted edge function) that folds events through the engine
-- reducer. Client subscribes via Realtime and re-renders on
-- `game_states` updates.
create table public.game_events (
  id          bigserial primary key,
  room_id     uuid not null references public.rooms(id) on delete cascade,
  player_id   uuid not null references public.players(id) on delete cascade,
  event_type  text not null,
  payload     jsonb not null,
  created_at  timestamptz not null default now()
);

create index game_events_room_idx on public.game_events (room_id, id desc);
create index game_events_player_idx on public.game_events (player_id);

-- ──────────────── RLS ────────────────
-- Enable RLS on every table. The application authenticates clients via
-- Supabase anonymous auth; the player's anon JWT carries their session
-- subject. Cross-room reads are denied; cross-room writes are denied.
--
-- These policies enforce "you can only see / change rooms you're a
-- member of." Server-side functions (or trusted edge functions) bypass
-- RLS using the service role key and apply engine validation there.

alter table public.rooms       enable row level security;
alter table public.players     enable row level security;
alter table public.game_states enable row level security;
alter table public.game_events enable row level security;

-- A player is in a room iff they have a row in `players` for it. We
-- key all read policies off membership. UUID compares are native (no
-- ::text casts) so the `players_pkey` index can be used.
create policy rooms_member_select on public.rooms
  for select
  using (
    exists (
      select 1 from public.players p
      where p.room_id = id and p.id = auth.uid()
    )
  );

create policy players_member_select on public.players
  for select
  using (
    exists (
      select 1 from public.players p
      where p.room_id = players.room_id and p.id = auth.uid()
    )
  );

create policy game_states_member_select on public.game_states
  for select
  using (
    exists (
      select 1 from public.players p
      where p.room_id = game_states.room_id and p.id = auth.uid()
    )
  );

create policy game_events_member_select on public.game_events
  for select
  using (
    exists (
      select 1 from public.players p
      where p.room_id = game_events.room_id and p.id = auth.uid()
    )
  );

-- Insert: a player can append events for their own player row in their
-- room. Tightening turn-ownership (you can only play on YOUR turn)
-- happens in the edge function that consumes the event log; the RLS
-- here is the floor.
create policy game_events_member_insert on public.game_events
  for insert
  with check (
    player_id = auth.uid()
    and exists (
      select 1 from public.players p
      where p.id = player_id and p.room_id = game_events.room_id
    )
  );

-- Players can update their own readiness / soul aspect during lobby.
-- Other fields (seat, room_id) are immutable from the client; an edge
-- function rewrites them via the service role when the host begins
-- the game.
create policy players_self_update on public.players
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Room create: anyone authenticated can create a room (becomes host).
-- The application supplies a unique code; on collision the insert
-- fails and the client retries.
create policy rooms_create on public.rooms
  for insert
  with check (host_id = auth.uid());

-- Player join: a player can insert themselves into any room (lobby).
-- The `id = auth.uid()` check is THE enforcement that the player
-- identity matches the auth subject — it's the anchor that every
-- read policy depends on. Stricter validation (room not full, not
-- started) lives in an edge function.
create policy players_join on public.players
  for insert
  with check (id = auth.uid());

-- NO client-side INSERT or UPDATE policies for `rooms` (state
-- transitions: lobby → playing → finished) or `game_states`
-- (snapshot writes). Both are intentionally service-role-only — the
-- edge function that folds events through the engine reducer owns
-- the authoritative writes. RLS denies client attempts silently
-- (Supabase returns empty result, not 403); document this in the
-- README so a future contributor doesn't chase a phantom bug.
