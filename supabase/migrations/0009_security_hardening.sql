-- 0009_security_hardening.sql
--
-- Findings from the Supabase security advisor run dated 2026-06-03.
-- Audit reference: docs/SECURITY_AUDIT_2026-06-03.md (parent layer audit).
--
-- 1. SECURITY DEFINER views run as the view-owner role (postgres),
--    bypassing the caller's RLS. Convert to security_invoker so the
--    caller's policies apply.
-- 2. Tighten analytics_events SELECT to admin-only (was open to any
--    signed-in user). The advisor doesn't flag this because it has a
--    policy, but the policy qual is `true`, which lets any logged-in
--    parent / teacher read the platform-wide event stream.
-- 3. Lock function search_path to public on the three flagged routines
--    so a malicious schema can't shadow built-in functions.
--
-- All ALTERs use IF EXISTS so the migration is idempotent and safe on
-- branches where some objects were already adjusted manually.

-- ── 1. SECURITY DEFINER views ───────────────────────────────────────
do $$
begin
  if exists (select 1 from pg_views where schemaname='public' and viewname='dashboard_trust_composition') then
    execute 'alter view public.dashboard_trust_composition set (security_invoker = true)';
  end if;
  if exists (select 1 from pg_views where schemaname='public' and viewname='dashboard_learner_progression') then
    execute 'alter view public.dashboard_learner_progression set (security_invoker = true)';
  end if;
end$$;

-- ── 2. Lock down analytics_events SELECT ───────────────────────────
-- The previous policy let every signed-in user read every event row.
-- Restrict reads to admins; inserts stay open to anon for telemetry.
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='analytics_events'
      and policyname='Authenticated select analytics events'
  ) then
    execute 'drop policy "Authenticated select analytics events" on public.analytics_events';
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='analytics_events'
      and policyname='analytics_events_select_admin'
  ) then
    execute $p$create policy analytics_events_select_admin on public.analytics_events
              for select to authenticated
              using (public.is_admin_user(auth.uid()))$p$;
  end if;
end$$;

-- Same treatment for human_observation_fact (research-only data; should
-- not be globally readable by every signed-in user).
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='human_observation_fact'
      and policyname='Authenticated select observations'
  ) then
    execute 'drop policy "Authenticated select observations" on public.human_observation_fact';
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='human_observation_fact'
      and policyname='observations_select_admin'
  ) then
    execute $p$create policy observations_select_admin on public.human_observation_fact
              for select to authenticated
              using (public.is_admin_user(auth.uid()))$p$;
  end if;
end$$;

-- ── 3. Function search_path lock-down ──────────────────────────────
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
             where n.nspname='public' and p.proname='set_updated_at') then
    execute 'alter function public.set_updated_at() set search_path = public, pg_temp';
  end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
             where n.nspname='public' and p.proname='pricing_amount_cents') then
    execute 'alter function public.pricing_amount_cents(text, integer) set search_path = public, pg_temp';
  end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
             where n.nspname='public' and p.proname='compute_billing_preview') then
    execute 'alter function public.compute_billing_preview(text, integer) set search_path = public, pg_temp';
  end if;
end$$;
