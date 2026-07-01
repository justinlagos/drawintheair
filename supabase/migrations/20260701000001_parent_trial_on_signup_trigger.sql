-- 20260701000001_parent_trial_on_signup_trigger.sql
--
-- Fix the "instant paywall" activation lock.
--
-- Root cause: the 7-day card-free trial is only started by register_parent()
-- (an RPC the client calls explicitly on some sign-in paths). It does NOT fire
-- on the email-confirmation sign-in path, so parents who confirm via the email
-- link land with NO parent_subscriptions row → hasAccess = false → they are
-- dropped straight onto the /parent/billing paywall with no way forward.
--
-- Migration 0014 intended to also start the trial inside the account-creation
-- trigger, but that change never reached the production database (the live
-- handle_new_parent_user() still has no trial call, and 0014 is not recorded in
-- schema_migrations).
--
-- Fix: start the trial server-side in the trigger, so it is reliable and does
-- not depend on any client call. start_parent_trial() is idempotent (its insert
-- is `on conflict (parent_id) do nothing`), so this is safe alongside the
-- existing register_parent() path.

-- 1) Start the trial at account creation, for parent-role signups only.
create or replace function public.handle_new_parent_user()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $function$
begin
  -- Preserve existing behaviour: create the parent_profiles row.
  insert into parent_profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      split_part(coalesce(new.email,''), '@', 1)
    )
  )
  on conflict (id) do nothing;

  -- New: start the card-free 7-day trial so parents are not paywalled the
  -- moment they confirm their email. Gated to parent-role signups so teacher /
  -- admin accounts never get a parent trial. Idempotent.
  if (new.raw_user_meta_data ->> 'role') = 'parent' then
    perform public.start_parent_trial(new.id);
  end if;

  return new;
end;
$function$;

-- 2) Backfill: strand-fix the existing parent-role accounts that have no
--    subscription row at all (6 at time of writing). start_parent_trial is
--    idempotent and only targets parent-role users, so teacher/admin rows that
--    happen to have a parent_profiles record are left untouched.
do $$
declare r record;
begin
  for r in
    select p.id
    from public.parent_profiles p
    join auth.users u on u.id = p.id
    where (u.raw_user_meta_data->>'role') = 'parent'
      and not exists (select 1 from public.parent_subscriptions s where s.parent_id = p.id)
  loop
    perform public.start_parent_trial(r.id);
  end loop;
end $$;
