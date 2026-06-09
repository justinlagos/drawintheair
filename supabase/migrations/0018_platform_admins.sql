-- =====================================================================
-- 0018_platform_admins.sql   (Auth Framework — Phase 2 RBAC)
--
-- Introduce a first-class platform_admin role, separate from "teacher
-- with is_admin = true". Today the only admin concept is the
-- teachers.is_admin boolean, which conflates platform operators with
-- classroom teachers. This migration adds a dedicated allow-list.
--
-- BACK-COMPAT GUARANTEE: is_admin_user() becomes a strict SUPERSET —
--   admin == (legacy teachers.is_admin = true) OR (row in platform_admins)
-- so every current admin keeps access. New grants should go ONLY to
-- platform_admins; the legacy flag is frozen for later migration.
--
-- Idempotent. No existing rows changed. New table starts EMPTY, so
-- behaviour is identical until you insert a platform_admins row.
--
-- ROLLBACK:
--   drop function if exists public.is_platform_admin();
--   create or replace is_admin_user with the 0009 body (teachers-only);
--   drop table if exists public.platform_admins;
-- =====================================================================

create table if not exists public.platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  granted_by uuid references auth.users(id) on delete set null,
  note       text,
  granted_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;

-- Clients may never read or write this table directly. All reads go
-- through the SECURITY DEFINER helpers below; all grants are done by a
-- privileged operator via service-role / SQL console.
drop policy if exists platform_admins_no_client on public.platform_admins;
create policy platform_admins_no_client on public.platform_admins
  for all to authenticated using (false) with check (false);

revoke all on table public.platform_admins from anon, authenticated;

-- is_admin_user: legacy flag OR new allow-list. Superset = no lockout.
create or replace function public.is_admin_user(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    coalesce((select is_admin from teachers where id = check_user_id), false)
    or exists (select 1 from platform_admins pa where pa.user_id = check_user_id);
$function$;

-- Convenience no-arg helper for the current user (frontend gates + RPCs).
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select public.is_admin_user(auth.uid());
$function$;

revoke execute on function public.is_platform_admin() from anon;
grant  execute on function public.is_platform_admin() to authenticated;

comment on table public.platform_admins is
  'First-class platform operator allow-list (0018). is_admin_user = legacy teachers.is_admin OR membership here.';
