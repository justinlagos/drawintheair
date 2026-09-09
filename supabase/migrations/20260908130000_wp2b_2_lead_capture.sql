-- WP2B.2 (DIA-013): lead capture moves off app.drawintheair.com onto the
-- Supabase edge function `lead-capture` (supabase/functions/lead-capture).
--
-- NOT applied to production by the authoring session. Rehearse on staging
-- first (standing rule 5), then apply with founder go in writing.
-- Evidence: docs/audits/evidence/release/WP2B.2/README.md
--
-- What this does (all additive or tightening, reversible):
--   1. Reuses the existing public.form_submissions table (2 rows in
--      production on 2026-09-07, latest 2026-05-21). Creates it only if a
--      fresh environment lacks it, with the same shape as production.
--   2. Adds founder_notified_at so email-dispatch can tell the founder
--      about new leads without ever sending twice.
--   3. Replaces the public "Service role can insert form submissions"
--      policy (WITH CHECK true for every role, which let the anon key
--      insert directly) with a service_role-only insert policy, and
--      revokes anon and authenticated table privileges. Reads stay
--      admin-only via admin_read_form_submissions (migration 0011).
--   4. Adds public.lead_rate_limits plus the service_role-only RPC
--      public.lead_capture_rate_check(ip_hash, limit, window_seconds).
--
-- Rollback (reverse order):
--   drop function if exists public.lead_capture_rate_check(text, integer, integer);
--   drop table if exists public.lead_rate_limits;
--   drop policy if exists "form_submissions_insert_service_role" on public.form_submissions;
--   create policy "Service role can insert form submissions" on public.form_submissions
--     for insert with check (true);
--   grant all on public.form_submissions to anon, authenticated;
--   drop index if exists public.form_submissions_pending_notify_idx;
--   alter table public.form_submissions drop column if exists founder_notified_at;

-- 1. Table (no-op in production; shape matches the live table)
create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_type text not null,
  email text,
  name text,
  school text,
  role text,
  message text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  ip_hash text,
  tenant_id uuid
);
alter table public.form_submissions enable row level security;

-- 2. Founder notification bookkeeping
alter table public.form_submissions
  add column if not exists founder_notified_at timestamptz;

create index if not exists form_submissions_pending_notify_idx
  on public.form_submissions (created_at)
  where founder_notified_at is null and form_type <> 'feedback';

-- 3. Insert only through the edge function (service role)
drop policy if exists "Service role can insert form submissions" on public.form_submissions;
drop policy if exists "form_submissions_insert_service_role" on public.form_submissions;
create policy "form_submissions_insert_service_role" on public.form_submissions
  for insert to service_role with check (true);

revoke all on public.form_submissions from anon, authenticated;
-- Admin dashboard reads go through admin_read_form_submissions (0011);
-- keep SELECT for authenticated so that policy can still apply.
grant select on public.form_submissions to authenticated;

-- 4. Rate limiting by hashed IP (service role only)
create table if not exists public.lead_rate_limits (
  ip_hash text primary key,
  attempt_count integer not null default 0,
  window_start timestamptz not null default now()
);
alter table public.lead_rate_limits enable row level security;
revoke all on public.lead_rate_limits from anon, authenticated, public;

create or replace function public.lead_capture_rate_check(
  p_ip_hash text,
  p_limit integer default 5,
  p_window_seconds integer default 3600
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_start timestamptz;
begin
  -- Returns true when the caller is still within its allowance.
  insert into public.lead_rate_limits (ip_hash, attempt_count, window_start)
  values (p_ip_hash, 1, now())
  on conflict (ip_hash) do update
    set attempt_count = case
          when public.lead_rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
            then 1
          else public.lead_rate_limits.attempt_count + 1
        end,
        window_start = case
          when public.lead_rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
            then now()
          else public.lead_rate_limits.window_start
        end
  returning attempt_count, window_start into v_count, v_start;

  -- Opportunistic cleanup so the table never grows unbounded.
  delete from public.lead_rate_limits
   where window_start < now() - make_interval(secs => p_window_seconds * 2)
     and random() < 0.05;

  return v_count <= p_limit;
end;
$$;

revoke execute on function public.lead_capture_rate_check(text, integer, integer) from anon, authenticated, public;
grant execute on function public.lead_capture_rate_check(text, integer, integer) to service_role;
