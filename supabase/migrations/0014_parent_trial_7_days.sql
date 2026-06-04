-- 0014_parent_trial_7_days.sql
-- Applied to production 2026-06-04 via Supabase MCP. See migration of the
-- same name in the remote schema_migrations table. The 14-day "free
-- trial" was never actually started (it only began via Stripe Checkout,
-- which is not configured), so every new parent hit the paywall
-- immediately. A local card-free trial now starts the moment a parent
-- account is created, and the platform trial length is 7 days.

update public.pricing_config set trial_days = 7, updated_at = now() where id = 'default';

create or replace function public.start_parent_trial(p_parent uuid)
returns void language plpgsql security definer set search_path = public as $$
declare d int;
begin
  select coalesce(trial_days, 7) into d from pricing_config where id = 'default';
  insert into parent_subscriptions (parent_id, status, trial_start, trial_end)
  values (p_parent, 'trialing', now(), now() + make_interval(days => coalesce(d, 7)))
  on conflict (parent_id) do nothing;
end;
$$;
revoke all on function public.start_parent_trial(uuid) from public, anon, authenticated;

create or replace function public.handle_new_parent_user()
returns trigger language plpgsql security definer set search_path = 'public' as $$
begin
  if (new.raw_user_meta_data ->> 'role') = 'parent' then
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
    perform public.start_parent_trial(new.id);
  end if;
  return new;
end;
$$;

create or replace function public.register_parent() returns jsonb
language plpgsql security definer set search_path = public as $$
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
end;
$$;

insert into public.parent_subscriptions (parent_id, status, trial_start, trial_end)
select p.id, 'trialing', now(), now() + interval '7 days'
from public.parent_profiles p
where not exists (select 1 from public.parent_subscriptions s where s.parent_id = p.id);

alter table public.parent_subscriptions
  add column if not exists reminder_2d_sent_at timestamptz,
  add column if not exists reminder_expired_sent_at timestamptz,
  add column if not exists welcome_sent_at timestamptz;
