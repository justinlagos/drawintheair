-- ═══════════════════════════════════════════════════════════════════════════
-- 0023_learning_attempts_write_hardening.sql
--
-- M1: anonymous users could INSERT/UPDATE/DELETE any learning_attempts row
-- whose child_profile_id IS NULL. School-session learners also have
-- child_profile_id IS NULL (they key off session_id), so anon could delete or
-- overwrite school learning data.
--
-- Root cause: the 0012 policies used `child_profile_id IS NULL` as a blanket
-- "anonymous free-play" predicate, which unintentionally also matched every
-- school-session row.
--
-- Fix:
--   • INSERT (anon + authenticated): allow only
--       - a parent's own child row (auth_owns_child), OR
--       - a truly sessionless free-play row (child_profile_id IS NULL AND
--         session_id IS NULL), OR
--       - a school-session row tied to an ACTIVE session.
--   • UPDATE / DELETE: authenticated only; admin or the owning parent.
--     learning_attempts are append-only telemetry — the client never updates
--     or deletes them (verified across src/), so removing anon write here is
--     behaviour-preserving.
--
-- Read policy (attempts_select_scoped, authenticated, admin-or-owner) is left
-- unchanged.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── INSERT ────────────────────────────────────────────────────────────────
drop policy if exists "attempts_insert" on public.learning_attempts;
create policy "attempts_insert" on public.learning_attempts
  for insert to anon, authenticated
  with check (
    (child_profile_id is not null and auth_owns_child(child_profile_id))
    or (child_profile_id is null and session_id is null)
    or (
      child_profile_id is null
      and session_id is not null
      and exists (
        select 1 from public.sessions s
        where s.id = learning_attempts.session_id
          and s.status = any (array['active', 'playing'])
      )
    )
  );

-- ── UPDATE ────────────────────────────────────────────────────────────────
-- Remove anon entirely. Telemetry is write-once; only admin or the owning
-- parent may amend a parent-child row.
drop policy if exists "attempts_update" on public.learning_attempts;
create policy "attempts_update" on public.learning_attempts
  for update to authenticated
  using (
    is_admin_user((select auth.uid()))
    or (child_profile_id is not null and auth_owns_child(child_profile_id))
  )
  with check (
    is_admin_user((select auth.uid()))
    or (child_profile_id is not null and auth_owns_child(child_profile_id))
  );

-- ── DELETE ────────────────────────────────────────────────────────────────
drop policy if exists "attempts_delete" on public.learning_attempts;
create policy "attempts_delete" on public.learning_attempts
  for delete to authenticated
  using (
    is_admin_user((select auth.uid()))
    or (child_profile_id is not null and auth_owns_child(child_profile_id))
  );
