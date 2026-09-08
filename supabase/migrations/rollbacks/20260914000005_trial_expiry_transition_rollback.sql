-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK for 20260914000005_trial_expiry_transition.sql (WP2A.5 / DIA-015)
--
-- Lives under migrations/rollbacks/ so the Supabase CLI never applies it as a
-- forward migration. Run by hand only if the forward migration has to be
-- reverted.
--
-- The status flip is fully reversible: parent_subscription_state() derives the
-- same 'trial_expired' answer from either representation, so no parent sees a
-- different screen before or after. 'trial_expired' is written only by
-- app_private.expire_parent_trials(), so reversing every such row is exact.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Stop the job first, so it cannot re-flip rows mid-rollback.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'expire-parent-trials-nightly') then
    perform cron.unschedule('expire-parent-trials-nightly');
  end if;
end $$;

drop function if exists app_private.expire_parent_trials(interval);

-- 2. Reverse the flip.
update public.parent_subscriptions
   set status = 'trialing', updated_at = now()
 where status = 'trial_expired';

-- 3. Previous parent_subscription_state: no 'trial_expired' status branch.
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
  if not found or s.status = 'none' then return 'none'; end if;
  if s.status = 'trialing' then
    if s.trial_end is not null and s.trial_end <= now() then return 'trial_expired'; end if;
    return 'trial_active';
  end if;
  if s.status in ('past_due','unpaid') then return 'payment_failed'; end if;
  if s.status = 'active' then
    if s.cancel_at_period_end then return 'cancelled_active'; end if;
    return case when s.plan_interval = 'year' then 'active_annual' else 'active_monthly' end;
  end if;
  if s.status = 'canceled' then
    if s.current_period_end is not null and s.current_period_end > now() then return 'cancelled_active'; end if;
    return 'expired';
  end if;
  return 'expired';
end;
$$;

-- 4. dashboard_growth: restore the trial_lapsed predicate that knows only
--    'trialing'. Only the two changed expressions are listed here; run the
--    corresponding CREATE OR REPLACE from the forward migration with these two
--    lines swapped back, or restore the function from
--    supabase/baseline/prod_public_schema.sql.
--
--      subs.trial_lapsed:
--        (ps.status = 'trialing' and ps.trial_end is not null and ps.trial_end < now())
--      subscriptions.canceled:
--        (select count(*) from subs where status not in ('active', 'trialing'))
--
--    Leaving the forward version in place is also safe: with no 'trial_expired'
--    rows left after step 2, both predicates give identical answers.
