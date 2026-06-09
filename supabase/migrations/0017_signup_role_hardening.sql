-- =====================================================================
-- 0017_signup_role_hardening.sql   (Auth Framework — Phase 1)
--
-- Server-side hardening of the auth.users signup triggers.
--
-- Context (audited 2026-06-09):
--   * Parent signup sets raw_user_meta_data.role = 'parent' from the
--     client; handle_new_parent_user() trusts it.
--   * Teacher signup sets role = 'teacher'; handle_new_user() trusts it.
--   * "admin" is NOT a metadata role — it is the teachers.is_admin
--     boolean, which neither trigger ever writes. So a hostile client
--     setting role:'admin' already creates nothing. This migration makes
--     that guarantee explicit and permanent rather than incidental.
--
-- What changes (behaviour-preserving for legitimate users):
--   1. Role match is normalised: lower(trim(role)) so " Parent " etc.
--      still provision, and ONLY the exact strings 'parent'/'teacher'
--      are ever honoured.
--   2. The teacher trigger writes is_admin = false EXPLICITLY on insert,
--      so privilege can never ride in on signup metadata even if the
--      teachers default ever changes.
--   3. Neither trigger reads any 'role','is_admin','admin' value into a
--      privileged column. Admin is granted ONLY via 0018's
--      platform_admins table or the legacy teachers.is_admin flag set by
--      a privileged operator.
--
-- Idempotent: CREATE OR REPLACE only. No data is modified.
--
-- ROLLBACK: re-run 0007/0008 trigger bodies (the prior definitions are
--   preserved verbatim in those migrations); this file only replaces the
--   function bodies, the triggers themselves are unchanged.
-- =====================================================================

-- Parent provisioning trigger (was migration 0007).
create or replace function public.handle_new_parent_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare claimed_role text := lower(trim(coalesce(new.raw_user_meta_data ->> 'role', '')));
begin
  -- Only the exact, normalised 'parent' role provisions a parent. Any
  -- other value (including 'admin', 'platform_admin', NULL) is ignored.
  if claimed_role = 'parent' then
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
$function$;

-- Teacher provisioning trigger (was migration 0008). Note search_path ''
-- (schema-qualified) preserved from the original definition.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare claimed_role text := lower(trim(coalesce(new.raw_user_meta_data ->> 'role', '')));
begin
  if claimed_role = 'teacher' then
    insert into public.teachers (id, email, name, avatar_url, is_admin)
    values (
      new.id,
      coalesce(new.email, ''),
      coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
      coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', ''),
      false  -- privilege NEVER rides in on signup metadata
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$function$;

-- Belt-and-braces: no signup path should ever be able to elevate via
-- metadata. This documents intent for future readers / audits.
comment on function public.handle_new_parent_user() is
  'Provisions parent_profiles only for normalised role=parent. Never writes privileged columns. Hardened in 0017.';
comment on function public.handle_new_user() is
  'Provisions teachers only for normalised role=teacher, is_admin forced false. Never elevates via metadata. Hardened in 0017.';
