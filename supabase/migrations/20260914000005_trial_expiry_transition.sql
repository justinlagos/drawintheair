-- ═══════════════════════════════════════════════════════════════════════════
-- WP2A.5 / DIA-015 — transition expired trials out of `trialing`
--
-- Nothing ever moved a local card-free trial out of status 'trialing'.
-- parent_subscription_state() derives 'trial_expired' at read time, so parents
-- see the right thing, but every report or job that filters on the raw status
-- column counts a months-old lapsed trial as live. Production: 31 of 31
-- 'trialing' rows have trial_end in the past.
--
-- The new terminal status is 'trial_expired' rather than 'expired' so the
-- client keeps the "Trial ended" copy instead of "Subscription expired".
--
-- Ordering constraint: email-dispatch selects status = 'trialing' and sends the
-- "your trial has ended" email. Flipping the status before that email goes out
-- would lose it permanently. The transition therefore waits for
-- reminder_expired_sent_at, or for a grace period to pass if the dispatcher is
-- down.
--
-- Stripe-managed subscriptions are never touched here; billing-health
-- reconciles those against Stripe. Local trials have stripe_subscription_id
-- NULL (verified: 0 of the 31 expired rows carry one).
--
-- The Supabase CLI runs each migration inside a single transaction, so this
-- file deliberately has no explicit begin/commit.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Read model ──────────────────────────────────────────────────────────
-- 'trial_expired' is mapped explicitly. The derived branch stays so rows the
-- nightly job has not reached yet still read correctly, which also means this
-- function can be deployed before or after the data transition.

create or replace function public.parent_subscription_state(p_parent uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare s parent_subscriptions%rowtype;
begin
  select * into s from parent_subscriptions where parent_id = p_parent;
  if not found or s.status = 'none' then
    return 'none';
  end if;

  if s.status = 'trial_expired' then
    return 'trial_expired';
  end if;

  if s.status = 'trialing' then
    if s.trial_end is not null and s.trial_end <= now() then
      return 'trial_expired';
    end if;
    return 'trial_active';
  end if;

  if s.status in ('past_due','unpaid') then
    return 'payment_failed';
  end if;

  if s.status = 'active' then
    if s.cancel_at_period_end then
      return 'cancelled_active';
    end if;
    return case when s.plan_interval = 'year' then 'active_annual' else 'active_monthly' end;
  end if;

  if s.status = 'canceled' then
    if s.current_period_end is not null and s.current_period_end > now() then
      return 'cancelled_active';
    end if;
    return 'expired';
  end if;

  return 'expired';
end;
$$;

-- ── 2. The transition ──────────────────────────────────────────────────────
-- Lives in app_private and refuses to run in a request context, so it is
-- reachable from pg_cron and psql but not over the REST API.

create or replace function app_private.expire_parent_trials(in_grace interval default interval '48 hours')
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_n int;
begin
  if nullif(current_setting('request.jwt.claims', true), '') is not null then
    raise exception 'not callable over the API' using errcode = '42501';
  end if;

  update public.parent_subscriptions ps
     set status        = 'trial_expired',
         updated_at    = now(),
         last_event_at = coalesce(ps.last_event_at, now())
   where ps.status = 'trialing'
     and ps.trial_end is not null
     and ps.trial_end <= now()
     and ps.stripe_subscription_id is null
     and (ps.reminder_expired_sent_at is not null
          or ps.trial_end <= now() - in_grace);
  get diagnostics v_n = row_count;

  return jsonb_build_object('transitioned', v_n, 'at', now());
end
$$;
revoke all on function app_private.expire_parent_trials(interval) from public;
revoke all on function app_private.expire_parent_trials(interval) from anon, authenticated;

-- ── 3. Nightly job ─────────────────────────────────────────────────────────
-- 01:30 UTC: after the last email-dispatch tick of the day and before the
-- 02:00 retention purge.

do $$
begin
  if exists (select 1 from cron.job where jobname = 'expire-parent-trials-nightly') then
    perform cron.unschedule('expire-parent-trials-nightly');
  end if;
  perform cron.schedule(
    'expire-parent-trials-nightly',
    '30 1 * * *',
    $cron$select app_private.expire_parent_trials(interval '48 hours')$cron$
  );
end $$;

-- ── 4. Growth reporting keeps counting these as lapsed trials ──────────────
-- dashboard_growth is the one dashboard_* function that already carried its own
-- admin guard, so WP2A.2 left it unwrapped and it is edited directly here. The
-- only change from the live body is the trial_lapsed predicate.

create or replace function public.dashboard_growth(in_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
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
    select ps.*,
           (ps.status = 'trial_expired'
            or (ps.status = 'trialing' and ps.trial_end is not null and ps.trial_end < now())) as trial_lapsed
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
      'canceled',        (select count(*) from subs where status not in ('active', 'trialing', 'trial_expired')),
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
end
$$;

-- ── 5. One-off catch-up for the current backlog ────────────────────────────
-- Same predicate, same 48 h grace. Every production row expired weeks ago, so
-- all of them qualify; the assertion below records what actually moved.

do $$
declare
  v_before int;
  v_res    jsonb;
  v_after  int;
begin
  select count(*) into v_before
    from public.parent_subscriptions
   where status = 'trialing' and trial_end is not null and trial_end <= now()
     and stripe_subscription_id is null
     and (reminder_expired_sent_at is not null or trial_end <= now() - interval '48 hours');

  v_res := app_private.expire_parent_trials(interval '48 hours');

  if (v_res->>'transitioned')::int <> v_before then
    raise exception 'WP2A.5: transitioned % but % rows matched the predicate',
      v_res->>'transitioned', v_before;
  end if;

  select count(*) into v_after
    from public.parent_subscriptions
   where status = 'trialing' and trial_end is not null and trial_end <= now()
     and stripe_subscription_id is null
     and (reminder_expired_sent_at is not null or trial_end <= now() - interval '48 hours');
  if v_after <> 0 then
    raise exception 'WP2A.5: % eligible rows still trialing after the catch-up', v_after;
  end if;

  raise notice 'WP2A.5 catch-up transitioned % rows', v_res->>'transitioned';
end $$;

-- ── 6. Post-conditions ─────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'expire-parent-trials-nightly' and active) then
    raise exception 'WP2A.5: nightly job is missing or inactive';
  end if;
end $$;
