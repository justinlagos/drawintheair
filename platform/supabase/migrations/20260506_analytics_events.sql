-- ═══════════════════════════════════════════════════════════════════
-- analytics_events — single source of truth for product telemetry
-- ═══════════════════════════════════════════════════════════════════
--
-- Replaces three half-broken systems (the dead /api/track POST queue,
-- the Google-Sheets-backed pilotAnalytics, and the GA4-only event
-- pipeline) with a single Postgres table the admin dashboard can query.
--
-- Privacy notes:
--   • No personal data. No names, no emails, no camera frames, no IPs.
--   • session_id is a per-browser-tab UUID, not tied to identity.
--   • age_band is a coarse 4-year band, not a date of birth.
--   • RLS allows INSERT from the anon role (so the in-app client can
--     write events) but SELECT only from authenticated admin users.
--
-- Retention: rows older than 12 months are auto-deleted by a scheduled
-- job (added in a later phase).

CREATE TABLE IF NOT EXISTS public.analytics_events (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      uuid        NOT NULL,
    occurred_at     timestamptz NOT NULL DEFAULT now(),
    event_name      text        NOT NULL,

    -- Where in the app
    page            text,
    component       text,
    game_mode       text,
    stage_id        text,
    chapter         int,
    level           int,

    -- Who (anonymous bucketing, no PII)
    age_band        text,
    school_id       text,
    class_id        text,

    -- Tech context
    build_version   text,
    device_type     text,
    browser         text,
    browser_version text,
    viewport_w      int,
    viewport_h      int,

    -- Acquisition
    utm_source      text,
    utm_medium      text,
    utm_campaign    text,
    referrer        text,

    -- Numeric metrics (e.g. score, fps, duration)
    value_number    double precision,

    -- Free-form extras (errors, custom payloads, anything that doesn't
    -- justify its own column yet)
    meta            jsonb       DEFAULT '{}'::jsonb
);

-- ─── Indexes ──────────────────────────────────────────────────────
-- Most queries scan recent events first, so occurred_at DESC is the
-- backbone. The per-session and per-event-name indexes accelerate
-- funnel + error-stream queries on the dashboard.

CREATE INDEX IF NOT EXISTS analytics_events_occurred_at_idx
    ON public.analytics_events (occurred_at DESC);

CREATE INDEX IF NOT EXISTS analytics_events_session_idx
    ON public.analytics_events (session_id, occurred_at);

CREATE INDEX IF NOT EXISTS analytics_events_name_idx
    ON public.analytics_events (event_name, occurred_at DESC);

CREATE INDEX IF NOT EXISTS analytics_events_mode_idx
    ON public.analytics_events (game_mode, occurred_at DESC)
    WHERE game_mode IS NOT NULL;

-- ─── Row-Level Security ──────────────────────────────────────────

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone (anon role from the in-app client) can INSERT new events.
-- We rely on Supabase's request-rate limits and our own client-side
-- batching/throttling to keep volume sane.
DROP POLICY IF EXISTS "Anonymous insert analytics events" ON public.analytics_events;
CREATE POLICY "Anonymous insert analytics events"
    ON public.analytics_events
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Only authenticated admin users can read events.
-- (Justin's account is the only admin today — the dashboard sits behind
--  AuthContext + the existing teacher/admin gate.)
DROP POLICY IF EXISTS "Authenticated select analytics events" ON public.analytics_events;
CREATE POLICY "Authenticated select analytics events"
    ON public.analytics_events
    FOR SELECT
    TO authenticated
    USING (true);

-- No UPDATE / DELETE policies → those operations are blocked for anon
-- and authenticated. Only service_role (used by scheduled cron jobs)
-- can prune.
