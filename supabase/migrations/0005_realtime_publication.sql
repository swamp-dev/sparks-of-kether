-- 0005_realtime_publication.sql
--
-- #265: surface `public.players` and `public.game_states` to the
-- Supabase Realtime broadcast channel. Without this the lobby and
-- game-state subscriptions silently never fire — the postgres_changes
-- listener attaches happily, the channel reaches SUBSCRIBED, but no
-- INSERT/UPDATE/DELETE payloads arrive because Postgres logical
-- replication isn't capturing those tables.
--
-- The Supabase platform creates the `supabase_realtime` publication
-- empty by default (it ships with `supabase_realtime_messages_publication`
-- pre-loaded for the websocket presence/broadcast surface, but app
-- tables have to be added explicitly). The local CLI mirrors that
-- behaviour, which is why the integration test for #265's player
-- Realtime subscription caught this — every previous broadcast
-- consumer in the codebase relied on Supabase Realtime presence
-- (which goes through the messages publication) or only ran in
-- environments where the publication was hand-curated.
--
-- `add table` is idempotent — Postgres errors with "table already
-- in publication" if we try a second time, so wrapping in a DO block
-- with an exception swallow makes the migration safe to re-apply.

do $$
begin
  alter publication supabase_realtime add table public.players;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.game_states;
exception when duplicate_object then null;
end $$;

-- Diagnostic helper used by the integration test
-- (`tests/integration/setZodiacSign.test.ts`) to verify the publication
-- still carries the lobby's tables. Service-role-only — no grants to
-- `anon` or `authenticated`. Without this, regression on the
-- publication membership would silently break Realtime; the test
-- catches it.
create or replace function public.publication_tables()
returns table(tablename text)
language sql
security definer
set search_path = ''
stable
as $$
  select tablename::text
  from pg_catalog.pg_publication_tables
  where pubname = 'supabase_realtime'
    and schemaname = 'public';
$$;
-- The function ships with `security definer` so the runtime
-- privilege is the function-owner's; the GRANT to `service_role`
-- is what lets the integration suite call the RPC. No grant to
-- `anon` or `authenticated` — only the test harness needs this.
revoke all on function public.publication_tables() from public;
revoke all on function public.publication_tables() from anon;
revoke all on function public.publication_tables() from authenticated;
grant execute on function public.publication_tables() to service_role;
