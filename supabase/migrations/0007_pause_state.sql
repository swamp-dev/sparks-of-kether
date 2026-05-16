-- Migration 0007: pause state for save-and-resume
--
-- Adds 'paused' to the rooms.state enum so games can be suspended and
-- resumed without losing progress. Also publishes the rooms table to the
-- Realtime publication so clients can reactively observe room-state changes
-- (lobby→playing redirect, playing→paused overlay, paused→playing dismissal).

-- Extend the state constraint to include 'paused'.
-- Using text + CHECK (not a Postgres enum type) was a deliberate choice in
-- 0001_init.sql so that adding states only requires a constraint swap, not
-- an ALTER TYPE sequence.
alter table public.rooms
  drop constraint rooms_state_chk;

alter table public.rooms
  add constraint rooms_state_chk
    check (state in ('lobby', 'playing', 'paused', 'finished'));

-- Timestamp recorded when the room transitions to 'paused'.
-- Null in all other states.
alter table public.rooms
  add column paused_at timestamptz;

-- Publish rooms to the Realtime supabase_realtime publication so
-- postgres_changes listeners on the 'rooms' table fire for all members.
-- Without this, the pause overlay and lobby redirect never receive room-state
-- updates without a manual poll.
--
-- If rooms is already in the publication (re-run scenario), this will error
-- with "relation already exists in publication". On Supabase Cloud the
-- dashboard migration runner handles idempotency; on local `supabase db push`
-- re-runs are not expected. Adding a plain statement avoids wrapping DDL in
-- a PL/pgSQL DO block, which can conflict with implicit transaction handling
-- for DDL in some Postgres versions.
alter publication supabase_realtime add table public.rooms;
