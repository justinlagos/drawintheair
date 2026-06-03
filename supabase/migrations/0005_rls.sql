-- 0005_rls.sql
-- Strict Row Level Security for the parent subscription layer.
--
-- Principles:
--   * A parent can read/write ONLY their own profile, children, controls, consent.
--   * No anonymous access to child profiles or child learning data.
--   * No cross-parent leakage (every policy is scoped by auth.uid()).
--   * Subscriptions & billing_events are READ-ONLY to clients; only the service
--     role (Stripe webhook / edge functions) writes them. The service role
--     bypasses RLS, so we simply grant no write policy to clients.
--   * pricing_config is public read (pricing must be visible pre-login).
--   * The pre-existing school `learners` model (rows with child_profile_id IS NULL)
--     keeps its prior open behaviour so school licensing is NOT broken. Those rows
--     will be hardened when school auth is implemented.

-- Helper: does the current auth user own this child profile?
-- SECURITY DEFINER avoids RLS recursion when referenced inside other policies.
create or replace function auth_owns_child(child uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $body$
  select exists (
    select 1 from child_profiles c
    where c.id = child and c.parent_id = auth.uid()
  );
$body$;
revoke all on function auth_owns_child(uuid) from public;
grant execute on function auth_owns_child(uuid) to authenticated;

-- =========================================================================
-- pricing_config : public read, no client write
-- =========================================================================
alter table pricing_config enable row level security;
drop policy if exists pricing_config_read on pricing_config;
create policy pricing_config_read on pricing_config
  for select to anon, authenticated using (true);

-- =========================================================================
-- parent_profiles : self only
-- =========================================================================
alter table parent_profiles enable row level security;

drop policy if exists parent_profiles_select on parent_profiles;
create policy parent_profiles_select on parent_profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists parent_profiles_insert on parent_profiles;
create policy parent_profiles_insert on parent_profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists parent_profiles_update on parent_profiles;
create policy parent_profiles_update on parent_profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- =========================================================================
-- parent_subscriptions : read own; writes are service-role only
-- =========================================================================
alter table parent_subscriptions enable row level security;
drop policy if exists parent_subscriptions_select on parent_subscriptions;
create policy parent_subscriptions_select on parent_subscriptions
  for select to authenticated using (parent_id = auth.uid());

-- =========================================================================
-- child_profiles : parent owns
-- =========================================================================
alter table child_profiles enable row level security;

drop policy if exists child_profiles_select on child_profiles;
create policy child_profiles_select on child_profiles
  for select to authenticated using (parent_id = auth.uid());

drop policy if exists child_profiles_insert on child_profiles;
create policy child_profiles_insert on child_profiles
  for insert to authenticated with check (parent_id = auth.uid());

drop policy if exists child_profiles_update on child_profiles;
create policy child_profiles_update on child_profiles
  for update to authenticated using (parent_id = auth.uid()) with check (parent_id = auth.uid());

drop policy if exists child_profiles_delete on child_profiles;
create policy child_profiles_delete on child_profiles
  for delete to authenticated using (parent_id = auth.uid());

-- =========================================================================
-- child_learning_state : parent owns child
-- =========================================================================
alter table child_learning_state enable row level security;

drop policy if exists cls_select on child_learning_state;
create policy cls_select on child_learning_state
  for select to authenticated using (auth_owns_child(child_profile_id));

drop policy if exists cls_write on child_learning_state;
create policy cls_write on child_learning_state
  for all to authenticated
  using (auth_owns_child(child_profile_id))
  with check (auth_owns_child(child_profile_id));

-- =========================================================================
-- child_activity_summary : parent owns child
-- =========================================================================
alter table child_activity_summary enable row level security;

drop policy if exists cas_select on child_activity_summary;
create policy cas_select on child_activity_summary
  for select to authenticated using (auth_owns_child(child_profile_id));

drop policy if exists cas_write on child_activity_summary;
create policy cas_write on child_activity_summary
  for all to authenticated
  using (auth_owns_child(child_profile_id))
  with check (auth_owns_child(child_profile_id));

-- =========================================================================
-- parent_controls : parent owns
-- =========================================================================
alter table parent_controls enable row level security;

drop policy if exists controls_select on parent_controls;
create policy controls_select on parent_controls
  for select to authenticated using (parent_id = auth.uid());

drop policy if exists controls_write on parent_controls;
create policy controls_write on parent_controls
  for all to authenticated
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid() and auth_owns_child(child_profile_id));

-- =========================================================================
-- billing_events : read own; writes service-role only
-- =========================================================================
alter table billing_events enable row level security;
drop policy if exists billing_events_select on billing_events;
create policy billing_events_select on billing_events
  for select to authenticated using (parent_id = auth.uid());

-- =========================================================================
-- consent_records : parent owns
-- =========================================================================
alter table consent_records enable row level security;

drop policy if exists consent_select on consent_records;
create policy consent_select on consent_records
  for select to authenticated using (parent_id = auth.uid());

drop policy if exists consent_insert on consent_records;
create policy consent_insert on consent_records
  for insert to authenticated with check (parent_id = auth.uid());

drop policy if exists consent_update on consent_records;
create policy consent_update on consent_records
  for update to authenticated using (parent_id = auth.uid()) with check (parent_id = auth.uid());

-- =========================================================================
-- data_deletion_requests : parent owns (insert + read; processing by service role)
-- =========================================================================
alter table data_deletion_requests enable row level security;

drop policy if exists deletion_select on data_deletion_requests;
create policy deletion_select on data_deletion_requests
  for select to authenticated using (parent_id = auth.uid());

drop policy if exists deletion_insert on data_deletion_requests;
create policy deletion_insert on data_deletion_requests
  for insert to authenticated with check (parent_id = auth.uid());

-- =========================================================================
-- Shared learning tables: lock down CHILD rows, preserve school rows.
-- (These tables had no RLS before; we keep school/anonymous rows open so the
--  existing classroom flow is not broken, while protecting parent child data.)
--
-- Defensive: lios_state may not exist in every environment. Skip its
-- policies entirely if it doesn't. learning_attempts always exists.
-- =========================================================================
alter table learning_attempts enable row level security;
drop policy if exists attempts_school_rows on learning_attempts;
create policy attempts_school_rows on learning_attempts
  for all to anon, authenticated
  using (child_profile_id is null)
  with check (child_profile_id is null);
drop policy if exists attempts_child_rows on learning_attempts;
create policy attempts_child_rows on learning_attempts
  for all to authenticated
  using (child_profile_id is not null and auth_owns_child(child_profile_id))
  with check (child_profile_id is not null and auth_owns_child(child_profile_id));

do $body$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='lios_state'
  ) then
    execute 'alter table lios_state enable row level security';
    execute 'drop policy if exists lios_school_rows on lios_state';
    execute 'create policy lios_school_rows on lios_state '
            || 'for all to anon, authenticated '
            || 'using (child_profile_id is null) '
            || 'with check (child_profile_id is null)';
    execute 'drop policy if exists lios_child_rows on lios_state';
    execute 'create policy lios_child_rows on lios_state '
            || 'for all to authenticated '
            || 'using (child_profile_id is not null and auth_owns_child(child_profile_id)) '
            || 'with check (child_profile_id is not null and auth_owns_child(child_profile_id))';
  end if;
end $body$;
