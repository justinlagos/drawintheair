-- ═══════════════════════════════════════════════════════════════════
-- LIOS Sprint 1 hotfix — full unique index on event_uid
-- ═══════════════════════════════════════════════════════════════════
--
-- The previous migration (20260519_lios_event_envelope.sql) created a
-- PARTIAL unique index on event_uid (WHERE event_uid IS NOT NULL).
--
-- Postgres requires the predicate of a partial index to match the
-- ON CONFLICT clause for the index to be eligible as an arbiter.
-- PostgREST's `Prefer: resolution=ignore-duplicates` emits
--   INSERT ... ON CONFLICT (event_uid) DO NOTHING
-- without a predicate, which fails with 42P10 against a partial
-- index. Tested against the live db on 2026-05-19 and confirmed.
--
-- Fix: drop the partial unique index and recreate it as a regular
-- (non-partial) unique index. This is safe because Postgres treats
-- NULLs as distinct by default — legacy rows with event_uid IS NULL
-- coexist without any unique-constraint collision risk.
--
-- This migration is idempotent: re-runnable in any environment.

DROP INDEX IF EXISTS public.analytics_events_event_uid_uidx;
DROP INDEX IF EXISTS public.learning_attempts_event_uid_uidx;

CREATE UNIQUE INDEX analytics_events_event_uid_uidx
    ON public.analytics_events (event_uid);

CREATE UNIQUE INDEX learning_attempts_event_uid_uidx
    ON public.learning_attempts (event_uid);

COMMENT ON INDEX public.analytics_events_event_uid_uidx IS
    'LIOS idempotency arbiter. Non-partial so PostgREST resolution=ignore-duplicates can use it. Multiple NULLs allowed (Postgres default) so legacy rows without an event_uid coexist.';
COMMENT ON INDEX public.learning_attempts_event_uid_uidx IS
    'Mirrors analytics_events_event_uid_uidx. Non-partial so PostgREST ON CONFLICT works.';
