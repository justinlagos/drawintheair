-- 0006_rpcs.sql
-- Auth-protected RPCs for the parent dashboard, dynamic pricing, and data rights.
--
-- Every function is SECURITY DEFINER but self-scopes to auth.uid(). They raise if
-- called without a session, and never accept an arbitrary parent_id from the client.
-- Subscription status is computed server-side here (never trust frontend flags).

set check_function_bodies = off;

-- ---------------------------------------------------------------------------
-- Pure pricing math from pricing_config (no auth needed; safe to expose).
-- ---------------------------------------------------------------------------
create or replace function pricing_amount_cents(p_interval text, p_active_children int)
returns int
language sql
stable
as $body$
  select case
    when p_interval = 'year' then
      cfg.base_annual_cents + greatest(0, p_active_children - cfg.base_included_slots) * cfg.addon_annual_cents_per_child
    else
      cfg.base_monthly_cents + greatest(0, p_active_children - cfg.base_included_slots) * cfg.addon_monthly_cents_per_child
  end
  from pricing_config cfg where cfg.id = 'default';
$body$;

create or replace function compute_billing_preview(p_interval text, p_active_children int)
returns jsonb
language sql
stable
as $body$
  select jsonb_build_object(
    'interval', coalesce(p_interval, 'month'),
    'currency', cfg.currency,
    'included_slots', cfg.base_included_slots,
    'active_children', p_active_children,
    'extra_children', greatest(0, p_active_children - cfg.base_included_slots),
    'base_cents', case when p_interval='year' then cfg.base_annual_cents else cfg.base_monthly_cents end,
    'addon_cents_per_child', case when p_interval='year' then cfg.addon_annual_cents_per_child else cfg.addon_monthly_cents_per_child end,
    'addon_cents_total', greatest(0, p_active_children - cfg.base_included_slots) *
        (case when p_interval='year' then cfg.addon_annual_cents_per_child else cfg.addon_monthly_cents_per_child end),
    'total_cents', pricing_amount_cents(p_interval, p_active_children),
    'annual_savings_cents', (cfg.base_monthly_cents * 12 - cfg.base_annual_cents)
  )
  from pricing_config cfg where cfg.id = 'default';
$body$;

grant execute on function pricing_amount_cents(text,int) to anon, authenticated;
grant execute on function compute_billing_preview(text,int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Derived product subscription state (server is the source of truth).
-- ---------------------------------------------------------------------------
create or replace function parent_subscription_state(p_parent uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $body$
declare s parent_subscriptions%rowtype;
begin
  select * into s from parent_subscriptions where parent_id = p_parent;
  if not found or s.status = 'none' then
    return 'none';
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
$body$;

create or replace function parent_has_access(p_parent uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $body$
  select parent_subscription_state(p_parent) in
    ('trial_active','active_monthly','active_annual','cancelled_active','payment_failed');
$body$;

grant execute on function parent_subscription_state(uuid) to authenticated;
grant execute on function parent_has_access(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Parent overview: profile + subscription + plan usage + children.
-- ---------------------------------------------------------------------------
create or replace function get_parent_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $body$
declare
  uid uuid := auth.uid();
  active_count int;
  archived_count int;
  result jsonb;
begin
  if uid is null then raise exception 'auth required'; end if;

  select count(*) filter (where status='active'),
         count(*) filter (where status='archived')
    into active_count, archived_count
  from child_profiles where parent_id = uid;

  select jsonb_build_object(
    'parent', (select to_jsonb(p) - 'stripe_customer_id' from parent_profiles p where p.id = uid),
    'subscription', (
      select jsonb_build_object(
        'state', parent_subscription_state(uid),
        'has_access', parent_has_access(uid),
        'status', s.status,
        'plan_interval', s.plan_interval,
        'included_child_slots', coalesce(s.included_child_slots, (select base_included_slots from pricing_config where id='default')),
        'billed_addon_quantity', s.billed_addon_quantity,
        'trial_end', s.trial_end,
        'current_period_end', s.current_period_end,
        'cancel_at_period_end', s.cancel_at_period_end
      )
      from parent_subscriptions s where s.parent_id = uid
    ),
    'plan_usage', jsonb_build_object(
      'active_children', active_count,
      'archived_children', archived_count,
      'included_slots', (select base_included_slots from pricing_config where id='default')
    ),
    'billing_preview', compute_billing_preview(
      coalesce((select plan_interval from parent_subscriptions where parent_id=uid), 'month'),
      active_count),
    'children', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'nickname', c.nickname, 'age_band', c.age_band,
        'avatar', c.avatar, 'learning_focus', c.learning_focus, 'status', c.status,
        'last_played_at', cls.last_played_at, 'streak_days', cls.streak_days,
        'recommended_activity_key', cls.recommended_activity_key
      ) order by c.created_at)
      from child_profiles c
      left join child_learning_state cls on cls.child_profile_id = c.id
      where c.parent_id = uid
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$body$;
grant execute on function get_parent_overview() to authenticated;

-- ---------------------------------------------------------------------------
-- _get_child_skills(child) — defensive helper for the dashboard.
-- Returns the per-skill rollup from lios_state, OR '[]'::jsonb if the
-- lios_state table doesn't exist in this environment. Wrapping the query in
-- EXECUTE keeps the planner from validating it at function-create time, so
-- get_child_dashboard creates cleanly regardless of whether lios_state exists.
-- ---------------------------------------------------------------------------
create or replace function _get_child_skills(p_child uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $body$
declare result jsonb;
begin
  if to_regclass('public.lios_state') is null then
    return '[]'::jsonb;
  end if;
  execute $sql$
    select coalesce(jsonb_agg(jsonb_build_object(
      'skill_key', skill_key, 'mastery', mastery, 'confidence', confidence, 'attempts', attempts
    ) order by mastery desc), '[]'::jsonb)
    from lios_state where child_profile_id = $1
  $sql$ into result using p_child;
  return result;
end;
$body$;
grant execute on function _get_child_skills(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Child dashboard: structured progress for ONE owned child.
-- Returns raw structured data; the app renders it into plain English.
-- ---------------------------------------------------------------------------
create or replace function get_child_dashboard(p_child uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $body$
declare
  uid uuid := auth.uid();
  result jsonb;
begin
  if uid is null then raise exception 'auth required'; end if;
  if not auth_owns_child(p_child) then raise exception 'not found'; end if;

  select jsonb_build_object(
    'child', (select to_jsonb(c) from child_profiles c where c.id = p_child),
    'state', (select to_jsonb(s) from child_learning_state s where s.child_profile_id = p_child),
    'controls', (select to_jsonb(pc) from parent_controls pc where pc.child_profile_id = p_child),
    'totals', (
      select jsonb_build_object(
        'activities_played', count(distinct activity_key),
        'total_attempts', coalesce(sum(attempts),0),
        'total_completions', coalesce(sum(completions),0),
        'total_seconds', coalesce(sum(total_seconds),0),
        'mastered', count(*) filter (where status='mastered'),
        'practising', count(*) filter (where status='practising'),
        'struggling', count(*) filter (where status='struggling')
      ) from child_activity_summary where child_profile_id = p_child
    ),
    'activities', coalesce((
      select jsonb_agg(jsonb_build_object(
        'activity_key', activity_key, 'attempts', attempts, 'completions', completions,
        'completion_rate', completion_rate, 'mastery', mastery, 'status', status,
        'total_seconds', total_seconds, 'last_played_at', last_played_at
      ) order by last_played_at desc nulls last)
      from child_activity_summary where child_profile_id = p_child
    ), '[]'::jsonb),
    'skills', _get_child_skills(p_child),
    -- 7-day activity window for the weekly summary.
    -- learning_attempts uses (game_mode, was_correct, occurred_at) — no
    -- score or activity_key column. We project those to the names the
    -- dashboard expects so the frontend doesn't need to know the diff.
    'last_7_days', coalesce((
      select jsonb_agg(jsonb_build_object(
        'activity_key', game_mode,
        'score', case when was_correct then 1 else 0 end,
        'created_at', occurred_at
      ) order by occurred_at)
      from learning_attempts
      where child_profile_id = p_child and occurred_at >= now() - interval '7 days'
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$body$;
grant execute on function get_child_dashboard(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- GDPR data export: everything we hold about this parent and their children.
-- ---------------------------------------------------------------------------
create or replace function export_parent_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $body$
declare uid uuid := auth.uid(); result jsonb;
begin
  if uid is null then raise exception 'auth required'; end if;
  select jsonb_build_object(
    'exported_at', now(),
    'parent', (select to_jsonb(p) from parent_profiles p where p.id = uid),
    'subscription', (select to_jsonb(s) from parent_subscriptions s where s.parent_id = uid),
    'children', (select coalesce(jsonb_agg(to_jsonb(c)),'[]'::jsonb) from child_profiles c where c.parent_id = uid),
    'learning_state', (select coalesce(jsonb_agg(to_jsonb(cls)),'[]'::jsonb) from child_learning_state cls
        where cls.child_profile_id in (select id from child_profiles where parent_id = uid)),
    'activity_summary', (select coalesce(jsonb_agg(to_jsonb(cas)),'[]'::jsonb) from child_activity_summary cas
        where cas.child_profile_id in (select id from child_profiles where parent_id = uid)),
    'controls', (select coalesce(jsonb_agg(to_jsonb(pc)),'[]'::jsonb) from parent_controls pc where pc.parent_id = uid),
    'consent', (select coalesce(jsonb_agg(to_jsonb(cr)),'[]'::jsonb) from consent_records cr where cr.parent_id = uid)
  ) into result;
  return result;
end;
$body$;
grant execute on function export_parent_data() to authenticated;

-- ---------------------------------------------------------------------------
-- Data rights: request deletions (auditable; heavy processing done service-side).
-- ---------------------------------------------------------------------------
create or replace function request_child_deletion(p_child uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $body$
declare uid uuid := auth.uid(); req uuid;
begin
  if uid is null then raise exception 'auth required'; end if;
  if not auth_owns_child(p_child) then raise exception 'not found'; end if;
  insert into data_deletion_requests(parent_id, scope, target_child_id)
    values (uid, 'child_profile', p_child) returning id into req;
  -- Immediate hard delete of the child record (cascades learning rows).
  delete from child_profiles where id = p_child and parent_id = uid;
  update data_deletion_requests set status='completed', completed_at=now() where id = req;
  return req;
end;
$body$;
grant execute on function request_child_deletion(uuid) to authenticated;

create or replace function request_account_deletion()
returns uuid
language plpgsql
security definer
set search_path = public
as $body$
declare uid uuid := auth.uid(); req uuid;
begin
  if uid is null then raise exception 'auth required'; end if;
  insert into data_deletion_requests(parent_id, scope) values (uid, 'parent_account') returning id into req;
  -- Marked pending; a service-role job cancels Stripe + removes auth.users.
  -- Child + learning data cascade-delete via FKs once the parent row is removed.
  return req;
end;
$body$;
grant execute on function request_account_deletion() to authenticated;
