-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK for 20260914000004_parent_trial_anchor.sql (WP2A.4 / DIA-012)
--
-- Lives under migrations/rollbacks/ so the Supabase CLI never applies it as a
-- forward migration. Run by hand only if the forward migration has to be
-- reverted.
--
-- What is NOT reverted, deliberately:
--   * The nine backfilled parent_subscriptions rows. Those are entitlements the
--     accounts were always owed; deleting them would re-create the defect for
--     the exact people it harmed.
--   * The role metadata stamped on those nine accounts. Removing it would put
--     them back in the misclassified state.
-- Reverting the functions is therefore enough to restore the previous
-- behaviour for NEW signups, which is the only thing a rollback needs to do.
-- ═══════════════════════════════════════════════════════════════════════════

drop trigger if exists trg_parent_profile_start_trial on public.parent_profiles;
drop function if exists public._parent_profile_start_trial();

-- Previous handle_new_parent_user: unconditional parent_profiles insert, trial
-- only for role = 'parent'. This is the live production body as of 2026-09-08.
create or replace function public.handle_new_parent_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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

  if (new.raw_user_meta_data ->> 'role') = 'parent' then
    perform public.start_parent_trial(new.id);
  end if;

  return new;
end
$$;

-- Previous register_parent: no eligibility helper, no role stamping.
create or replace function public.register_parent()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare u record; t_id uuid;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select id, email, raw_user_meta_data into u from auth.users where id = auth.uid();
  insert into parent_profiles (id, email, display_name)
  values (
    u.id, u.email,
    coalesce(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name',
             split_part(coalesce(u.email,''), '@', 1))
  )
  on conflict (id) do nothing;
  t_id := public._ensure_tenant('parent', u.id, coalesce(u.raw_user_meta_data->>'display_name', u.email));
  update parent_profiles set tenant_id = t_id where id = u.id and tenant_id is null;
  perform public.start_parent_trial(u.id);
  return jsonb_build_object('ok', true, 'tenant_id', t_id);
end
$$;

drop function if exists public._start_parent_trial_if_eligible(uuid);
drop function if exists public._parent_trial_eligible(uuid);
