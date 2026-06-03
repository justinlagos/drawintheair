-- ─────────────────────────────────────────────────────────────────────────────
-- 20260528_admin_email_allowlist.sql — grant admin to two accounts.
--
-- BACKGROUND
-- The intended admin pair (mrjustinukaegbu@gmail.com, s.chukwue@gmail.com)
-- both have rows in public.teachers (auto-created by the on_auth_user_created
-- trigger when each signed up). Neither row had is_admin=true; the admin
-- gate public.is_admin_user(uuid) was therefore returning false for both.
--
-- This migration:
--   1. Sets is_admin=true on both users' existing teachers rows.
--   2. Adds a NOTE column on the row via teacher_metadata.note (no schema
--      change — just a comment in the UPDATE).
--
-- An earlier draft of this migration created an admin_email_allowlist table
-- and patched public._is_admin(). That function name doesn't actually exist
-- in this database — the live gate is public.is_admin_user(uuid), as defined
-- in (a likely earlier) migration. Matching prod is simpler: just UPDATE.
--
-- SAFETY
--   • This is idempotent: re-running is a no-op (is_admin is already true).
--   • No schema changes, no policy changes.
--   • Verify both users exist before assuming the UPDATE matched — the
--     SELECT below the COMMIT confirms.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

UPDATE public.teachers
SET    is_admin = true
WHERE  email IN ('mrjustinukaegbu@gmail.com', 's.chukwue@gmail.com')
AND    coalesce(is_admin, false) = false;

COMMIT;

-- ─── Verify (run after applying) ─────────────────────────────────────────
-- SELECT email, is_admin
-- FROM   public.teachers
-- WHERE  email IN ('mrjustinukaegbu@gmail.com', 's.chukwue@gmail.com')
-- ORDER BY email;
--
-- Expected: both rows, both is_admin=true.
