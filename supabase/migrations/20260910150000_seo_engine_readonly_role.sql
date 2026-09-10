-- 20260910150000_seo_engine_readonly_role.sql
--
-- Read-only Postgres role for the autonomous SEO engine (docs/SEO_ENGINE.md).
-- Least privilege by construction: it can SELECT the two analytics funnel
-- tables and nothing else, every transaction is read-only, statements are
-- time-bounded, and it can never bypass RLS or write, even if a future grant
-- slips. This is the alternative to handing the engine the service_role key.
--
-- The password is NEVER stored in this file or the repo. After applying, set
-- it out-of-band in the Supabase SQL editor (not committed anywhere):
--   alter role seo_engine_ro password '<strong-secret>';
-- The engine connects through the session pooler as:
--   postgresql://seo_engine_ro.<project-ref>:<password>@aws-1-eu-west-2.pooler.supabase.com:5432/postgres
--
-- Idempotent: safe to re-run. ALREADY APPLIED to production on 2026-09-10 and
-- verified; this file records it in the repo's migration history.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'seo_engine_ro') then
    create role seo_engine_ro
      login noinherit nocreatedb nocreaterole nosuperuser nobypassrls noreplication;
  end if;
end $$;

-- Read-only sessions, bounded queries, no idle-in-transaction pile-ups.
alter role seo_engine_ro set default_transaction_read_only = on;
alter role seo_engine_ro set statement_timeout = '30s';
alter role seo_engine_ro set idle_in_transaction_session_timeout = '60s';

grant usage on schema public to seo_engine_ro;
grant select on public.analytics_events   to seo_engine_ro;
grant select on public.learning_attempts  to seo_engine_ro;

-- RLS is enabled on both tables, so a grant alone is still subject to policies.
-- Aggregation needs every row, so this role gets an explicit read policy.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'analytics_events' and policyname = 'seo_engine_ro_read'
  ) then
    create policy seo_engine_ro_read on public.analytics_events
      for select to seo_engine_ro using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'learning_attempts' and policyname = 'seo_engine_ro_read'
  ) then
    create policy seo_engine_ro_read on public.learning_attempts
      for select to seo_engine_ro using (true);
  end if;
end $$;

-- Belt and braces: never a writer.
revoke insert, update, delete, truncate on all tables in schema public from seo_engine_ro;
