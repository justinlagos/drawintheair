-- ═══════════════════════════════════════════════════════════════════════════
-- Security lockdown — 2026-05-21
--
-- Closes the four highest-severity findings from
-- docs/SECURITY_AUDIT_2026-05-21.md:
--   • C1 — anon-readable sessions table exposes live classroom join codes
--   • C2 — every "auth-gated" dashboard RPC is granted to anon
--   • C4 — form_submissions / newsletter_subscribers RLS is world-permissive
--           (misleading policy names; no TO role; bodies are USING (true))
--   • H7 — admin email allow-list shipped in the public bundle (mitigated by
--           making the server-side check authoritative)
--
-- Designed to be SAFE TO RE-RUN.  Every statement is idempotent
-- (DROP IF EXISTS, CREATE OR REPLACE, REVOKE/GRANT are naturally idempotent).
--
-- Order of operations:
--   1. Admin helpers (_is_admin, _assert_admin) — required by everything else.
--   2. Lock down form_submissions / newsletter_subscribers.
--   3. Lock down sessions + provide session_lookup_by_code for the student
--      join flow.
--   4. Revoke EXECUTE on every dashboard_* / lios_* RPC from anon, except the
--      two intentional public-proof functions.
--   5. Tighten lios_record_observation (require auth + observer role check).
--
-- WHAT THIS MIGRATION DOES NOT YET DO (tracked as follow-ups, this week):
--   • Add public._assert_admin() calls inside each dashboard_* function body
--     (so authenticated-but-not-admin teachers cannot read each other's data).
--     That's per-function work; see audit findings C2 + H1.
--   • Replace `USING (true)` SELECT policies on analytics_events /
--     learning_attempts / LIOS tables with `USING (_is_admin())`.
--     Tracked as audit finding H1.
--
-- Verify after deploy with scripts/verify-security-lockdown.sh.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── 1. Admin helpers ──────────────────────────────────────────────────────

-- public._is_admin() — boolean, SECURITY DEFINER so it can read public.teachers
-- regardless of the caller's role. Returns false (not null) for anon, so it's
-- safe to use in policy bodies.
CREATE OR REPLACE FUNCTION public._is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT COALESCE(
        (SELECT is_admin FROM public.teachers WHERE id = auth.uid()),
        false
    )
$$;

REVOKE ALL ON FUNCTION public._is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._is_admin() TO authenticated, service_role;

COMMENT ON FUNCTION public._is_admin() IS
    'Authoritative admin check. Returns false for anon and for signed-in non-admin teachers. Used by RLS policies and by dashboard RPC bodies (this-week migration).';


-- public._assert_admin() — RAISE on non-admin. Helper for SECURITY DEFINER
-- function bodies that want a one-liner.
CREATE OR REPLACE FUNCTION public._assert_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public._is_admin() THEN
        RAISE EXCEPTION 'admin access required'
            USING ERRCODE = '42501';   -- insufficient_privilege
    END IF;
END
$$;

REVOKE ALL ON FUNCTION public._assert_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._assert_admin() TO authenticated, service_role;


-- ── 2. form_submissions / newsletter_subscribers ──────────────────────────
-- The original policies were named "Service role can …" but had no TO clause
-- and bodies of (true). That meant anon could read everything once rows
-- existed. Drop the misnamed policies, enforce RLS, and revoke all access
-- from anon/authenticated. service_role bypasses RLS automatically; the
-- Next.js /api/form-submission route uses the service-role key.

ALTER TABLE public.form_submissions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions       FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can insert form submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Service role can read form submissions"   ON public.form_submissions;
DROP POLICY IF EXISTS "Service role can insert subscribers"      ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Service role can read subscribers"        ON public.newsletter_subscribers;

REVOKE ALL ON public.form_submissions       FROM anon, authenticated;
REVOKE ALL ON public.newsletter_subscribers FROM anon, authenticated;

-- Admins may read for inbox review through the platform UI.
CREATE POLICY "Admins read form submissions"
    ON public.form_submissions
    FOR SELECT
    TO authenticated
    USING (public._is_admin());

CREATE POLICY "Admins read newsletter subscribers"
    ON public.newsletter_subscribers
    FOR SELECT
    TO authenticated
    USING (public._is_admin());

GRANT SELECT ON public.form_submissions       TO authenticated;
GRANT SELECT ON public.newsletter_subscribers TO authenticated;

COMMENT ON TABLE public.form_submissions IS
    'School-pack / pilot / parent-trial / feedback / newsletter / contact form submissions. RLS: service_role writes (via Next.js /api/form-submission); admins read; anon has no access.';

COMMENT ON TABLE public.newsletter_subscribers IS
    'Newsletter subscribers + unsubscribe tokens. RLS: service_role writes; admins read; anon has no access. Unsubscribe must go via a SECURITY DEFINER RPC, not direct SELECT.';


-- ── 3. sessions — close the cross-correlation leak ───────────────────────
-- BACKGROUND. The sessions table currently allows anon to SELECT every
-- column of every active classroom (`?select=*` returns code, teacher_id,
-- school_id, metadata, …). The live student flow
-- (src/pages/classmode/StudentClassClient.tsx) also reads this table
-- directly to poll state, so we cannot REVOKE ALL anon access without
-- a parallel client refactor.
--
-- WHAT THIS MIGRATION DOES NOW. Close the actual leak: anon can no longer
-- see teacher_id, school_id, playlist_id, metadata, class_name, or
-- ended_at. They can still see the small set of columns the in-progress
-- student client needs (id, code, status, class_state, activity, round,
-- timer_seconds, max_students, current_activity_id, scoreboard fields,
-- timestamps), and only for non-ended sessions.
--
-- WHAT'S NEXT (this week, separate migration). Once StudentClassClient is
-- migrated to call public.session_lookup_by_code (added below) + a small
-- per-session state RPC, we can drop ALL anon column grants on
-- public.sessions and gate every read through SECURITY DEFINER. Tracked
-- against audit C1.

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teacher reads own sessions"      ON public.sessions;
DROP POLICY IF EXISTS "Anon reads active sessions"      ON public.sessions;
DROP POLICY IF EXISTS "Teacher writes own sessions"     ON public.sessions;
DROP POLICY IF EXISTS "Teacher inserts own sessions"    ON public.sessions;

-- Teachers see every row they own; admins see everything.
CREATE POLICY "Teacher reads own sessions"
    ON public.sessions
    FOR SELECT
    TO authenticated
    USING (teacher_id = auth.uid() OR public._is_admin());

-- Anon can SELECT (subject to column grants below) only for active sessions.
-- This preserves the running student client while denying access to ended
-- sessions and to any session whose status row would reveal nothing useful.
CREATE POLICY "Anon reads active sessions"
    ON public.sessions
    FOR SELECT
    TO anon
    USING (status <> 'ended' AND class_state <> 'ended');

-- Column-level: anon gets a tight allow-list. Everything else (teacher_id,
-- school_id, playlist_id, metadata, class_name, ended_at, created_at,
-- updated_at, etc.) is denied at the GRANT layer regardless of RLS.
REVOKE ALL ON public.sessions FROM anon;
GRANT SELECT (
    id,
    code,
    activity,
    status,
    class_state,
    round,
    timer_seconds,
    max_students,
    scoreboard_mode,
    scoreboard_visible,
    current_activity_id,
    started_at,
    session_code
) ON public.sessions TO anon;

-- Authenticated teachers / admins keep full SELECT on the table; the RLS
-- policy above scopes which rows they actually see.
GRANT SELECT ON public.sessions TO authenticated;

-- (Writes continue to go through the SECURITY DEFINER class_* RPCs, which
--  already assert auth.uid() = teacher_id. We do not grant INSERT/UPDATE
--  on the table itself to anon or authenticated, so direct PostgREST
--  mutations are blocked.)
REVOKE INSERT, UPDATE, DELETE ON public.sessions FROM anon, authenticated;

COMMENT ON TABLE public.sessions IS
    'Classroom sessions. RLS: teachers see their own rows; admins see all; anon sees a tight column projection for active sessions only (no teacher_id, no school_id, no metadata). Writes go through SECURITY DEFINER class_* RPCs.';


-- session_lookup_by_code — the only anon-callable way to find a session.
-- Returns a tightly-scoped projection (no teacher_id, no school_id, no
-- metadata) and only resolves codes that are still active.
DROP FUNCTION IF EXISTS public.session_lookup_by_code(text);
CREATE FUNCTION public.session_lookup_by_code(in_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    r record;
BEGIN
    -- Hard input shape check. Anything other than exactly 4 digits resolves
    -- to NULL so the caller can't probe with regexes / SQL wildcards.
    IF in_code IS NULL OR in_code !~ '^\d{4}$' THEN
        RETURN NULL;
    END IF;

    SELECT
        s.id,
        s.code,
        s.activity,
        s.status,
        s.class_state,
        s.round,
        s.timer_seconds,
        s.max_students,
        s.scoreboard_mode
    INTO r
    FROM public.sessions s
    WHERE s.code = in_code
      AND s.status      IN ('waiting', 'active', 'paused')
      AND s.class_state IN ('lobby', 'in_activity')
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    RETURN to_jsonb(r);
END
$$;

REVOKE ALL ON FUNCTION public.session_lookup_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.session_lookup_by_code(text)
    TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.session_lookup_by_code(text) IS
    'Public student-join lookup. Returns minimal fields (no teacher_id, no school_id, no metadata) and only for active sessions. Used by src/pages/classmode/StudentJoin.tsx in place of a direct SELECT on public.sessions.';


-- ── 4. Revoke EXECUTE on every dashboard_* / lios_* RPC from anon ────────
-- The two functions explicitly designed to be anon-callable are kept:
--   • landing_public_proof   — landing-page social proof (k-anon aggregate)
--   • dashboard_public_proof — same data, different shape
-- Everything else is admin-internal and must require a Supabase session.
--
-- This is the LIVE-EXPOSURE fix. Per-function _assert_admin() calls
-- (so a signed-in non-admin teacher also can't read) are scheduled for
-- the next migration — they require per-function rewrites we don't want
-- to bundle with this hotfix.

DO $do$
DECLARE
    fn_ident text;
BEGIN
    FOR fn_ident IN
        SELECT format(
                   '%I.%I(%s)',
                   n.nspname,
                   p.proname,
                   pg_catalog.pg_get_function_identity_arguments(p.oid)
               )
        FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND (p.proname LIKE 'dashboard\_%' ESCAPE '\'
            OR p.proname LIKE 'lios\_%'      ESCAPE '\')
          AND p.proname NOT IN (
                'dashboard_public_proof',
                'landing_public_proof'
          )
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn_ident);
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn_ident);
        EXECUTE format('GRANT  EXECUTE ON FUNCTION %s TO authenticated', fn_ident);
        RAISE NOTICE 'locked: %', fn_ident;
    END LOOP;
END
$do$;


-- ── 5. lios_record_observation — require auth ────────────────────────────
-- Observation writes were anon-callable, which lets outsiders pollute the
-- dashboards with arbitrary device_id / tags. We lock to authenticated
-- callers. (Stricter "observer role" check is a follow-up; the immediate
-- exposure is the anon path.)

DO $do$
DECLARE
    fn_ident text;
BEGIN
    FOR fn_ident IN
        SELECT format(
                   '%I.%I(%s)',
                   n.nspname,
                   p.proname,
                   pg_catalog.pg_get_function_identity_arguments(p.oid)
               )
        FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'lios_record_observation'
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn_ident);
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn_ident);
        EXECUTE format('GRANT  EXECUTE ON FUNCTION %s TO authenticated', fn_ident);
    END LOOP;
END
$do$;


-- ═══════════════════════════════════════════════════════════════════════════
-- End of migration. Verification: scripts/verify-security-lockdown.sh.
-- ═══════════════════════════════════════════════════════════════════════════
