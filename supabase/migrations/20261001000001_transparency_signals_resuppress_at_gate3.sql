-- ═══════════════════════════════════════════════════════════════════════════
-- DO NOT APPLY BEFORE THE NULL-TOLERANT CLIENT IS LIVE IN PRODUCTION.
--
-- Restores the small-cohort suppression that 20260914000002 introduced and
-- 20260914000008 backed out. It nulls four fields when the cohort is small, and
-- the client must tolerate nulls in all four before this runs:
--   impact.classrooms_engaged   (rendered with .toLocaleString())
--   top_engaging_mode, strongest_signal, calibration_in_progress
--
-- Gate 3 order: deploy the client, load /transparency and confirm it renders,
-- and only then apply this. Verify again immediately after.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.dashboard_transparency_signals(in_days integer default 90)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_days  int := greatest(7, least(coalesce(in_days, 90), 365));
  v       jsonb;
  n_modes int;
  n_class int;
begin
  v := public._dashboard_transparency_signals_impl(v_days);

  select count(*) into n_modes
    from (
      select game_mode
        from public.learning_attempts
       where occurred_at > now() - make_interval(days => v_days)
         and device_id is not null
       group by game_mode
      having count(distinct device_id) >= 5
    ) m;

  n_class := coalesce((v #>> '{impact,classrooms_engaged}')::int, 0);
  if n_class < 5 then
    v := jsonb_set(v, '{impact,classrooms_engaged}', 'null'::jsonb);
  end if;

  if n_modes < 2 then
    v := v || jsonb_build_object(
                'top_engaging_mode', null,
                'strongest_signal', null,
                'calibration_in_progress', null,
                'suppressed', true);
  end if;

  return v;
end
$$;
grant execute on function public.dashboard_transparency_signals(integer) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
