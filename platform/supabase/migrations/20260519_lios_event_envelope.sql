-- ═══════════════════════════════════════════════════════════════════
-- LIOS Sprint 1 — event envelope hardening
-- ═══════════════════════════════════════════════════════════════════
--
-- First database change for the Learning Intelligence Operating
-- System. Adds four additive fields to analytics_events (and the
-- learning_attempts mirror) so the event stream is:
--
--   • idempotent          — event_uid + unique index. The client
--                           generates a UUID at event creation and
--                           PostgREST is told to ignore duplicates
--                           on retry. Without this, an offline-queue
--                           flush that races with the next flush can
--                           double-insert and silently inflate all
--                           downstream learning aggregates.
--
--   • monotonically       — client_seq is a per-session monotonic
--     ordered              integer; used to reconstruct the true
--                           order of events on a session even when
--                           the offline queue flushes out of order.
--
--   • clock-skew aware    — client_ts is the client's wall clock at
--                           event creation. occurred_at remains the
--                           server's view (effectively arrival time
--                           now that the client sets it on the wire,
--                           we leave the column as the canonical
--                           server-side ingestion timestamp via the
--                           default — see note below). The two
--                           together let downstream jobs estimate
--                           clock skew per session and reconcile
--                           latency / hesitation timings.
--
--   • context-aware       — context ∈ {'home', 'classroom',
--                           'unknown'}. Powers the home-vs-classroom
--                           dimension the strategy needs without
--                           reaching for school_id (which is text
--                           today and unreliable). Every event
--                           carries the active context for its
--                           session.
--
-- Backwards compatibility: all columns nullable. Existing rows stay
-- valid. The Insights v2 dashboards continue to function. The new
-- fields are read by future migrations (LIOS sprint 2+) without
-- breaking the current ones.
--
-- Idempotency model: PostgREST clients send
--   Prefer: resolution=ignore-duplicates
-- on bulk inserts so duplicate event_uid rows are silently skipped
-- rather than aborting the whole batch.

-- ── analytics_events ─────────────────────────────────────────────

ALTER TABLE public.analytics_events
    ADD COLUMN IF NOT EXISTS event_uid  uuid,
    ADD COLUMN IF NOT EXISTS client_seq bigint,
    ADD COLUMN IF NOT EXISTS client_ts  timestamptz,
    ADD COLUMN IF NOT EXISTS context    text;

-- Partial unique index: enforces uniqueness only on rows that have
-- an event_uid. Older rows (and any code path that hasn't been
-- updated yet) still insert cleanly with event_uid = NULL.
CREATE UNIQUE INDEX IF NOT EXISTS analytics_events_event_uid_uidx
    ON public.analytics_events (event_uid)
    WHERE event_uid IS NOT NULL;

-- Optional sanity index on (session_id, client_seq) for ordered
-- session reconstruction queries. Cheap, predictable selectivity.
CREATE INDEX IF NOT EXISTS analytics_events_session_seq_idx
    ON public.analytics_events (session_id, client_seq)
    WHERE client_seq IS NOT NULL;

-- Cheap index on context for the home-vs-classroom dashboards.
CREATE INDEX IF NOT EXISTS analytics_events_context_idx
    ON public.analytics_events (context, occurred_at DESC)
    WHERE context IS NOT NULL;

COMMENT ON COLUMN public.analytics_events.event_uid IS
    'Client-generated UUID at event creation. UNIQUE — used for idempotent inserts when the offline queue retries a batch. NULL on legacy rows; populated on every row written by the LIOS client (May 2026+).';

COMMENT ON COLUMN public.analytics_events.client_seq IS
    'Per-session monotonic sequence number assigned at event creation. Used to reconstruct true event order independent of flush/arrival order.';

COMMENT ON COLUMN public.analytics_events.client_ts IS
    'Client wall clock at event creation (ISO 8601). Together with occurred_at, lets downstream jobs estimate clock skew and reconcile latency calculations per session.';

COMMENT ON COLUMN public.analytics_events.context IS
    'Session context: home / classroom / unknown. First-class dimension for the home-vs-classroom analytics demanded by school adoption and grant reporting.';

-- ── learning_attempts ───────────────────────────────────────────
-- The same envelope upgrade. learning_attempts is the fact table
-- behind every mastery / accuracy claim; idempotency here is just
-- as load-bearing as on the raw event log.

ALTER TABLE public.learning_attempts
    ADD COLUMN IF NOT EXISTS event_uid  uuid,
    ADD COLUMN IF NOT EXISTS client_seq bigint,
    ADD COLUMN IF NOT EXISTS client_ts  timestamptz,
    ADD COLUMN IF NOT EXISTS context    text;

CREATE UNIQUE INDEX IF NOT EXISTS learning_attempts_event_uid_uidx
    ON public.learning_attempts (event_uid)
    WHERE event_uid IS NOT NULL;

CREATE INDEX IF NOT EXISTS learning_attempts_session_seq_idx
    ON public.learning_attempts (session_id, client_seq)
    WHERE client_seq IS NOT NULL;

CREATE INDEX IF NOT EXISTS learning_attempts_context_idx
    ON public.learning_attempts (context, occurred_at DESC)
    WHERE context IS NOT NULL;

COMMENT ON COLUMN public.learning_attempts.event_uid IS
    'Mirrors analytics_events.event_uid for the corresponding item_dropped event. UNIQUE — guards the mastery-fact pipeline against duplicate attempts under offline-queue retries.';

COMMENT ON COLUMN public.learning_attempts.client_seq IS
    'Per-session monotonic sequence number from the originating event.';

COMMENT ON COLUMN public.learning_attempts.client_ts IS
    'Client wall clock at attempt resolution.';

COMMENT ON COLUMN public.learning_attempts.context IS
    'Session context (home / classroom / unknown) inherited from the originating event.';
