-- 20260716000002_dashboard_growth.sql
-- ============================================================================
-- dashboard_growth(in_days) - signups + engagement for the admin insights
-- dashboard's new Growth tab. Single RPC, one round-trip.
--
-- Unlike the older dashboard_* functions (granted to all authenticated users
-- with no in-body check), this one asserts platform-admin membership because
-- it exposes masked account emails and business figures.
--
-- Metric honesty:
--  * subscriptions are reported by status (trialing vs active vs canceled),
--    never as one flattering number; lapsed trials (trial_end in the past
--    while status still 'trialing') are broken out.
--  * "active kids (7d)" = children who actually joined/heartbeat a classroom
--    session, plus home child profiles with learning attempts - not page hits.
--
-- Rollback: drop function public.dashboard_growth(int);
-- ============================================================================

create or replace function public.dashboard_growth(in_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_days  int := greatest(1, least(coalesce(in_days, 30), 365));
  v_from  timestamptz := now() - make_interval(days => greatest(1, least(coalesce(in_days, 30), 365)));
  result  jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with
  au as (
    select u.id, u.email, u.created_at,
           exists (select 1 from public.teachers t where t.id = u.id)          as is_teacher,
           exists (select 1 from public.parent_profiles pp where pp.id = u.id) as is_parent
    from auth.users u
    where u.deleted_at is null
  ),
  subs as (
    select ps.*, (ps.status = 'trialing' and ps.trial_end is not null and ps.trial_end < now()) as trial_lapsed
    from public.parent_subscriptions ps
  ),
  weekly as (
    select date_trunc('week', gs)::date as week_start
    from generate_series(date_trunc('week', now() - interval '11 weeks'), now(), interval '1 week') gs
  ),
  weekly_signups as (
    select w.week_start,
           count(a.id)                                   as signups,
           count(a.id) filter (where a.is_teacher)       as teachers,
           count(a.id) filter (where a.is_parent)        as parents
    from weekly w
    left join au a on date_trunc('week', a.created_at)::date = w.week_start
    group by w.week_start
  ),
  weekly_activity as (
    select w.week_start,
           (select count(distinct ss.id) from public.session_students ss
             where date_trunc('week', greatest(ss.joined_at, ss.updated_at))::date = w.week_start) as classroom_kids,
           (select count(*) from public.sessions s
             where date_trunc('week', s.created_at)::date = w.week_start)                          as classes_started,
           (select count(distinct ae.session_id) from public.analytics_events ae
             where date_trunc('week', ae.occurred_at)::date = w.week_start)                        as play_sessions
    from weekly w
  ),
  latest as (
    select a.created_at,
           case when a.is_teacher then 'teacher'
                when a.is_parent  then 'parent'
                else 'account' end as role,
           -- mask: first 2 chars + *** + domain
           left(split_part(coalesce(a.email, ''), '@', 1), 2) || '***@' || split_part(coalesce(a.email, ''), '@', 2) as email_masked,
           exists (select 1 from subs s2 where s2.parent_id = a.id and s2.status in ('trialing', 'active')) as has_subscription
    from au a
    order by a.created_at desc
    limit 12
  )
  select jsonb_build_object(
    'as_of', now(),
    'range_days', v_days,
    'totals', jsonb_build_object(
      'accounts',        (select count(*) from au),
      'parents',         (select count(*) from au where is_parent),
      'teachers',        (select count(*) from au where is_teacher),
      'child_profiles',  (select count(*) from public.child_profiles),
      'roster_children', (select count(*) from public.class_children where archived = false),
      'schools',         (select count(*) from public.schools)
    ),
    'new_in_range', jsonb_build_object(
      'accounts', (select count(*) from au where created_at >= v_from),
      'parents',  (select count(*) from au where is_parent and created_at >= v_from),
      'teachers', (select count(*) from au where is_teacher and created_at >= v_from)
    ),
    'last_signup_at', (select max(created_at) from au),
    'subscriptions', jsonb_build_object(
      'active',          (select count(*) from subs where status = 'active'),
      'trialing',        (select count(*) from subs where status = 'trialing' and not trial_lapsed),
      'trial_lapsed',    (select count(*) from subs where trial_lapsed),
      'canceled',        (select count(*) from subs where status not in ('active', 'trialing')),
      'new_in_range',    (select count(*) from subs where created_at >= v_from),
      'paying_conversion_pct',
        (select round(100.0 * count(*) filter (where status = 'active')
                / nullif((select count(*) from au where is_parent), 0), 1) from subs)
    ),
    'engagement_7d', jsonb_build_object(
      'events',          (select count(*) from public.analytics_events where occurred_at >= now() - interval '7 days'),
      'play_sessions',   (select count(distinct session_id) from public.analytics_events where occurred_at >= now() - interval '7 days'),
      'learning_attempts', (select count(*) from public.learning_attempts where occurred_at >= now() - interval '7 days'),
      'classroom_kids',  (select count(distinct ss.id) from public.session_students ss
                           where greatest(ss.joined_at, ss.updated_at) >= now() - interval '7 days'),
      'live_classes',    (select count(*) from public.sessions
                           where status <> 'ended' and coalesce(class_state, '') <> 'ended'),
      'last_event_at',   (select max(occurred_at) from public.analytics_events)
    ),
    'weekly_signups', (select coalesce(jsonb_agg(jsonb_build_object(
                         'week', week_start, 'signups', signups,
                         'teachers', teachers, 'parents', parents) order by week_start), '[]'::jsonb)
                       from weekly_signups),
    'weekly_activity', (select coalesce(jsonb_agg(jsonb_build_object(
                          'week', week_start, 'classroom_kids', classroom_kids,
                          'classes_started', classes_started, 'play_sessions', play_sessions) order by week_start), '[]'::jsonb)
                        from weekly_activity),
    'latest_signups', (select coalesce(jsonb_agg(jsonb_build_object(
                         'created_at', created_at, 'role', role,
                         'email_masked', email_masked, 'has_subscription', has_subscription) order by created_at desc), '[]'::jsonb)
                       from latest)
  ) into result;

  return result;
end $function$;

revoke all on function public.dashboard_growth(int) from public, anon;
grant execute on function public.dashboard_growth(int) to authenticated, service_role;
