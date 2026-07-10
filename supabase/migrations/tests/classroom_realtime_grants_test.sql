-- classroom_realtime_grants_test.sql
-- Verifies migration 0025: Realtime policy evaluation must be able to
-- execute every function referenced by SELECT policies on the
-- realtime-published classroom tables, for every subscriber role.
--
-- Run with: psql "$DB_URL" -f supabase/migrations/tests/classroom_realtime_grants_test.sql
-- All rows must show ok = t. The DO block raises if any check fails.

SELECT 'anon can execute is_admin_user' AS check,
       has_function_privilege('anon', 'public.is_admin_user(uuid)', 'EXECUTE') AS ok
UNION ALL
SELECT 'authenticated can execute is_admin_user',
       has_function_privilege('authenticated', 'public.is_admin_user(uuid)', 'EXECUTE');

DO $$
BEGIN
    IF NOT has_function_privilege('anon', 'public.is_admin_user(uuid)', 'EXECUTE') THEN
        RAISE EXCEPTION 'FAIL: anon lacks EXECUTE on public.is_admin_user(uuid) — Realtime apply_rls will crash for student subscriptions';
    END IF;
    IF NOT has_function_privilege('authenticated', 'public.is_admin_user(uuid)', 'EXECUTE') THEN
        RAISE EXCEPTION 'FAIL: authenticated lacks EXECUTE on public.is_admin_user(uuid)';
    END IF;

    -- Guard against regressions: scan every SELECT policy on the four
    -- realtime-published tables for function calls that anon cannot
    -- execute. is_admin_user is the only function referenced today; this
    -- catches any future policy that reintroduces the failure mode.
    IF EXISTS (
        SELECT 1
        FROM pg_policies p
        WHERE p.schemaname = 'public'
          AND p.tablename IN ('sessions','session_students','session_activities','round_scores')
          AND p.cmd = 'SELECT'
          AND p.qual LIKE '%is_admin_user%'
          AND NOT has_function_privilege('anon', 'public.is_admin_user(uuid)', 'EXECUTE')
    ) THEN
        RAISE EXCEPTION 'FAIL: a realtime-published SELECT policy references is_admin_user but anon cannot execute it';
    END IF;

    RAISE NOTICE 'PASS: classroom realtime grants verified';
END $$;
