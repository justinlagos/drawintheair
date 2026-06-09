-- =====================================================================
-- 0019_school_admin_role.sql   (Auth Framework — Phase 2 RBAC)
--
-- Add a tenant-scoped school_admin role. A school_admin sees ONLY their
-- own school tenant — never platform-wide. Built on the existing
-- tenants / tenant_members tables (migration 0013); no new table.
--
-- tenant_members.member_role already exists (default 'owner'). We:
--   1. Constrain it to a known vocabulary (existing rows are 'owner',
--      so the CHECK is satisfied immediately — no data change).
--   2. Add is_school_admin(tenant_id) — owner OR school_admin of that
--      tenant, OR a platform_admin (who can see everything).
--   3. Extend get_account_roles() to report school_admin + platform_admin
--      alongside the existing parent/teacher/admin booleans. The legacy
--      'admin' boolean now reflects is_admin_user() (the 0018 superset),
--      so existing frontend gates keep working and gain platform_admins.
--
-- Idempotent. Behaviour-preserving: nobody gains school_admin until an
-- operator sets member_role='school_admin' on a school tenant membership.
--
-- ROLLBACK:
--   alter table public.tenant_members drop constraint if exists tenant_members_member_role_chk;
--   drop function if exists public.is_school_admin(uuid);
--   restore get_account_roles() to the 0013/0017 body (parent/teacher/admin only).
-- =====================================================================

-- 1. Constrain member_role vocabulary (existing rows are all 'owner').
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tenant_members_member_role_chk'
      and conrelid = 'public.tenant_members'::regclass
  ) then
    alter table public.tenant_members
      add constraint tenant_members_member_role_chk
      check (member_role in ('owner','school_admin','member'));
  end if;
end $$;

-- 2. Tenant-scoped admin check. Platform admins pass for any tenant.
create or replace function public.is_school_admin(in_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    public.is_admin_user(auth.uid())
    or exists (
      select 1 from tenant_members m
      where m.tenant_id = in_tenant
        and m.user_id = auth.uid()
        and m.member_role in ('owner','school_admin')
    );
$function$;
revoke execute on function public.is_school_admin(uuid) from anon;
grant  execute on function public.is_school_admin(uuid) to authenticated;

-- 3. One round-trip role probe, now five booleans. 'admin' stays for
--    back-compat (= platform admin superset).
create or replace function public.get_account_roles()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select jsonb_build_object(
    'parent',         exists (select 1 from parent_profiles p where p.id = auth.uid()),
    'teacher',        exists (select 1 from teacher_profiles t where t.auth_user_id = auth.uid()),
    'admin',          public.is_admin_user(auth.uid()),
    'platform_admin', public.is_admin_user(auth.uid()),
    'school_admin',   exists (
                        select 1 from tenant_members m
                        join tenants tn on tn.id = m.tenant_id
                        where m.user_id = auth.uid()
                          and tn.kind = 'school'
                          and m.member_role in ('owner','school_admin')
                      )
  );
$function$;
revoke execute on function public.get_account_roles() from anon;
grant  execute on function public.get_account_roles() to authenticated;

comment on function public.is_school_admin(uuid) is
  'True if current user owns/administers the given school tenant, or is a platform_admin (0019).';
