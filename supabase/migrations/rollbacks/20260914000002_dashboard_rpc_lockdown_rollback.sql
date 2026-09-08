-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK for 20260914000002_dashboard_rpc_lockdown.sql (WP2A.2 / DIA-006)
--
-- Lives under migrations/rollbacks/ so the Supabase CLI never applies it as a
-- forward migration. Run by hand (psql or the SQL editor) only if the forward
-- migration has to be reverted.
--
-- Restores every wrapped function to its original name and body by renaming
-- _<name>_impl back. No personal data is touched.
--
-- Two things are NOT restored, deliberately:
--   * anon EXECUTE on the admin-only functions. WP0.5.2 revoked anon on four of
--     them in production before this package; re-granting anon here would undo
--     a change that is already live and approved separately. Every admin-only
--     function comes back with EXECUTE for authenticated and service_role only.
--   * the four dropped unused functions (dashboard_classrooms,
--     dashboard_gesture_quality, dashboard_ingest_latency,
--     dashboard_pipeline_status). If they are ever needed again, restore them
--     from supabase/baseline/prod_public_schema.sql.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. The three public functions ──────────────────────────────────────────

drop function if exists public.dashboard_transparency_signals(integer);
alter function public._dashboard_transparency_signals_impl(integer) rename to dashboard_transparency_signals;
grant execute on function public.dashboard_transparency_signals(integer) to anon, authenticated, service_role;

drop function if exists public.dashboard_transparency_report(integer);
alter function public._dashboard_transparency_report_impl(integer) rename to dashboard_transparency_report;
grant execute on function public.dashboard_transparency_report(integer) to anon, authenticated, service_role;

drop function if exists public.dashboard_public_proof();
alter function public._dashboard_public_proof_impl() rename to dashboard_public_proof;
grant execute on function public.dashboard_public_proof() to public, anon, authenticated, service_role;

drop table if exists public.dashboard_public_cache;

-- ── 2. Restore the daily digest body that calls dashboard_classrooms ───────
-- Only meaningful if dashboard_classrooms has also been restored from the
-- baseline; left commented so the rollback does not fail on a missing function.
--
-- create or replace function public.dashboard_daily_digest() ... 'classrooms',
--   (select public.dashboard_classrooms(30)) ...

-- ── 3. The 29 admin-only wrappers ──────────────────────────────────────────
-- Note: _dashboard_daily_digest_impl carries the forward migration's body (the
-- 'classrooms' key is a literal empty shape instead of a call to the dropped
-- dashboard_classrooms). Renaming it back restores a working digest with the
-- same key set, not the byte-identical original.

do $$
declare
  f      record;
  v_orig text;
begin
  for f in
    select p.proname,
           pg_get_function_identity_arguments(p.oid) as ident_args
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname ~ '^_dashboard_.*_impl$'
     order by p.proname
  loop
    -- '_dashboard_today_impl' -> 'dashboard_today'
    v_orig := substr(f.proname, 2, length(f.proname) - 6);
    execute format('drop function if exists public.%I(%s)', v_orig, f.ident_args);
    execute format('alter function public.%I(%s) rename to %I', f.proname, f.ident_args, v_orig);
    execute format('revoke all on function public.%I(%s) from public', v_orig, f.ident_args);
    execute format('revoke all on function public.%I(%s) from anon', v_orig, f.ident_args);
    execute format('grant execute on function public.%I(%s) to authenticated, service_role',
                   v_orig, f.ident_args);
  end loop;
end $$;

drop function if exists public._dashboard_guard();

notify pgrst, 'reload schema';
