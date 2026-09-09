-- ═══════════════════════════════════════════════════════════════════════════
-- WP2A.2 follow-up 2 — back out the transparency_signals suppression until the
-- null-tolerant client is deployed.
--
-- APPLIED TO PRODUCTION 2026-09-09, minutes after 20260914000002.
--
-- What happened: 20260914000002 nulled four fields when the cohort is small:
--   impact.classrooms_engaged, top_engaging_mode, strongest_signal,
--   calibration_in_progress
-- The deployed production client types classrooms_engaged as a number and calls
-- .toLocaleString() on it, and reads the three signal objects without a null
-- check. The client that tolerates nulls exists on release/new-term but has NOT
-- been deployed, so applying the database half on its own put the public
-- /transparency page into its error boundary ("Something got stuck").
--
-- This is precisely the coupling the release brief's expand-and-contract rule
-- exists to prevent: a schema-side change shipped ahead of the client change it
-- depends on. The database half is therefore reverted, not the client.
--
-- Retained from 20260914000002: the day-window clamp (7..365), which is a pure
-- input guard with no effect on the response shape.
--
-- Re-apply via 20261001000001 at Gate 3, in the same release as the client.
--
-- The k<5 exposure this leaves standing is a count of distinct classroom join
-- codes and three mode names. No child identifier is involved. A broken public
-- page is the larger harm for the few days until Gate 3.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.dashboard_transparency_signals(in_days integer default 90)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_days int := greatest(7, least(coalesce(in_days, 90), 365));
begin
  -- Pass the impl output through unchanged. Suppression returns at Gate 3
  -- together with the null-tolerant client.
  return public._dashboard_transparency_signals_impl(v_days);
end
$$;
grant execute on function public.dashboard_transparency_signals(integer) to anon, authenticated, service_role;

do $$
declare v jsonb;
begin
  v := public.dashboard_transparency_signals(90);
  if v #> '{impact,classrooms_engaged}' = 'null'::jsonb then
    raise exception 'transparency_signals still returns a null classrooms_engaged';
  end if;
  if v ? 'suppressed' then
    raise exception 'transparency_signals still returns the suppressed flag';
  end if;
end $$;

notify pgrst, 'reload schema';
