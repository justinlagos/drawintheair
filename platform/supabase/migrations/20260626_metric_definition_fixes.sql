-- ═══════════════════════════════════════════════════════════════════
-- Metric definition fixes — honest denominators
-- ═══════════════════════════════════════════════════════════════════
--
-- STATUS: NOT YET APPLIED. Validate on a Supabase preview branch before
-- applying to production. Apply AFTER 20260626_analytics_traffic_type.sql
-- (this file references the environment/traffic_type columns + the
-- analytics_events_real view that migration adds).
--
-- Fixes three dashboard lies called out in the data review:
--   • Abandonment: 100% abandon shown next to 60–71% completion, because
--     abandon/complete/stuck were independent bool_or flags over the SAME
--     `started` denominator (a session counted as both completed AND
--     abandoned). Now abandon = exited WITHOUT completing.
--   • Latency: P50/P95/P99 = 0 ms because occurred_at and client_ts are
--     the same client clock. We add a SERVER-stamped received_at and
--     compute real ingestion latency from it.
--   • (Activation ≤100% is fixed client-side in activationFunnel.ts —
--     it used mode_completions [events] over sessions [distinct]; the
--     SQL already returns the correct sessions_completed.)
--
-- NB: dashboard_observability (the Observability tab's latency block) has
-- NO source in git — its body lives only in the production DB. Dump it
-- (SELECT pg_get_functiondef('public.dashboard_observability(integer)'::regprocedure))
-- and switch its latency CTE to dashboard_ingest_latency() below.

-- ═══════════════════════════════════════════════════════════════════
-- 1. Server-stamped ingest time → real client→server latency
-- ═══════════════════════════════════════════════════════════════════
-- received_at is set by the DATABASE default on insert, so it is a true
-- server clock independent of the client's occurred_at/client_ts (which
-- the client sets equal to each other). latency = received_at - client_ts.
-- For events that sit in the offline queue this is genuine end-to-end
-- INGESTION latency, exactly what the SLO ("ingestion latency p99 <
-- 2000ms") is meant to measure. Historic rows have received_at NULL and
-- are correctly reported as "not measured".
-- Add WITHOUT a default first (metadata-only, no table rewrite) so the
-- 179k existing rows stay NULL = "not measured" rather than being
-- backfilled to migration time (which would invent days-long latencies).
-- Then set the default so only FUTURE inserts get a server timestamp.
ALTER TABLE public.analytics_events
    ADD COLUMN IF NOT EXISTS received_at timestamptz;
ALTER TABLE public.analytics_events
    ALTER COLUMN received_at SET DEFAULT now();

CREATE OR REPLACE FUNCTION public.dashboard_ingest_latency(in_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH lat AS (
    SELECT EXTRACT(EPOCH FROM (received_at - client_ts)) * 1000.0 AS ms
    FROM public.analytics_events
    WHERE occurred_at > now() - make_interval(days => in_days)
      AND received_at IS NOT NULL
      AND client_ts  IS NOT NULL
      -- guard clock skew: a negative delta means the client clock ran
      -- ahead of the server; clamp those out rather than report negatives.
      AND received_at >= client_ts
  )
  SELECT jsonb_build_object(
    'days', in_days,
    'as_of', now(),
    'measurable', (SELECT count(*) FROM lat) > 0,
    'rows_with_latency', (SELECT count(*) FROM lat),
    'p50_latency_ms', (SELECT round(percentile_cont(0.50) WITHIN GROUP (ORDER BY ms)::numeric, 1) FROM lat),
    'p95_latency_ms', (SELECT round(percentile_cont(0.95) WITHIN GROUP (ORDER BY ms)::numeric, 1) FROM lat),
    'p99_latency_ms', (SELECT round(percentile_cont(0.99) WITHIN GROUP (ORDER BY ms)::numeric, 1) FROM lat)
  );
$function$;

GRANT EXECUTE ON FUNCTION public.dashboard_ingest_latency(integer) TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- 2. Friction map — honest abandonment
-- ═══════════════════════════════════════════════════════════════════
-- CREATE OR REPLACE of the existing dashboard_engagement_deep
-- (20260512_insights_v2_deep_dives.sql). ONE change only, on the
-- ORIGINAL 1-arg signature (a true replace — no overload, so the
-- frontend's 1-arg call benefits immediately and PostgREST can't see an
-- ambiguous candidate):
--   abandon_rate_pct now counts sessions that abandoned AND did NOT
--   complete, over all starters — so a completed or teacher-ended session
--   is no longer double-counted as "abandoned" (the source of 100% abandon
--   shown next to 71% completion).
-- Everything else (completion/stuck rates, durations, daily trend) is
-- byte-for-byte the original. The internal-traffic (real_only) filter is
-- deferred to a post-deploy slice — traffic_type isn't populated until the
-- updated client ships, so filtering now would just empty the panel.
CREATE OR REPLACE FUNCTION public.dashboard_engagement_deep(in_days integer DEFAULT 7)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
WITH win AS (
    SELECT * FROM public.analytics_events
    WHERE occurred_at > now() - make_interval(days => in_days)
      AND game_mode IS NOT NULL
), per_session AS (
    SELECT game_mode, session_id,
        bool_or(event_name = 'mode_started') AS did_start,
        bool_or(event_name = 'mode_completed') AS did_complete,
        bool_or(event_name = 'mode_abandoned') AS did_abandon,
        bool_or(event_name = 'stuck_detected') AS did_stuck,
        extract(epoch from (max(occurred_at) - min(occurred_at))) AS dur_s
    FROM win GROUP BY game_mode, session_id
), per_mode AS (
    SELECT game_mode,
        count(*) FILTER (WHERE did_start) AS started,
        count(*) FILTER (WHERE did_complete AND did_start) AS completed,
        -- ★ FIX: abandonment = started, did not complete, and left.
        count(*) FILTER (WHERE did_abandon AND did_start AND NOT did_complete) AS abandoned,
        count(*) FILTER (WHERE did_stuck AND did_start) AS stuck,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY dur_s) FILTER (WHERE did_start AND dur_s > 0) AS median_s,
        percentile_cont(0.9) WITHIN GROUP (ORDER BY dur_s) FILTER (WHERE did_start AND dur_s > 0) AS p90_s,
        count(DISTINCT session_id) FILTER (WHERE did_start) AS distinct_starters,
        (game_mode IN ('free')) AS is_open_ended
    FROM per_session GROUP BY game_mode
), daily AS (
    SELECT game_mode, date_trunc('day', occurred_at)::date AS day, count(distinct session_id) AS sessions
    FROM win WHERE event_name = 'mode_started' GROUP BY game_mode, day
), daily_array AS (
    SELECT game_mode, jsonb_agg(jsonb_build_object('day', day, 'n', sessions) ORDER BY day) AS trend
    FROM daily GROUP BY game_mode
)
SELECT jsonb_build_object(
    'days', in_days, 'as_of', now(),
    'abandon_definition', 'started, did not complete, fired mode_abandoned',
    'modes', coalesce(jsonb_agg(jsonb_build_object(
        'game_mode', m.game_mode, 'started', m.started, 'completed', m.completed,
        'abandoned', m.abandoned, 'stuck', m.stuck,
        'median_seconds', round(coalesce(m.median_s, 0)::numeric, 0),
        'p90_seconds', round(coalesce(m.p90_s, 0)::numeric, 0),
        'distinct_devices', m.distinct_starters, 'is_open_ended', m.is_open_ended,
        'completion_rate_pct', CASE WHEN m.is_open_ended THEN NULL
                                    WHEN m.started > 0 THEN round(100.0 * m.completed / m.started, 1) ELSE NULL END,
        'stuck_rate_pct',   CASE WHEN m.started > 0 THEN round(100.0 * m.stuck / m.started, 1) ELSE 0 END,
        'abandon_rate_pct', CASE WHEN m.started > 0 THEN round(100.0 * m.abandoned / m.started, 1) ELSE 0 END,
        'daily', coalesce(d.trend, '[]'::jsonb)
    ) ORDER BY m.started DESC), '[]'::jsonb)
) FROM per_mode m LEFT JOIN daily_array d USING (game_mode);
$function$;

GRANT EXECUTE ON FUNCTION public.dashboard_engagement_deep(integer) TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- 3. Executive summary — honest session duration + explicit semantics
-- ═══════════════════════════════════════════════════════════════════
-- Two problems verified in the 2026-07-02 export review:
--   • median_session_s was max(occurred_at)-min(occurred_at) over ALL
--     events. The client emits session_heartbeat every 30s and
--     tab_hidden/tab_visible while a tab is merely OPEN, so a parked
--     idle tab inflates "session duration" indefinitely (median jumped
--     16m → 24m49s while completions collapsed — an idle artefact, not
--     deeper engagement). Duration now spans ACTIVE events only.
--   • "sessions_started" is count(distinct session_id) over all events
--     in a ROLLING window, while the sparkline buckets by CALENDAR day
--     over 14 days — so the sparkline's last-7-day bars can legitimately
--     sum higher than the headline (rolling boundary cuts a day in
--     half; a session spanning midnight counts in two buckets). These
--     are different concepts; they are now labelled instead of forced
--     to agree.
CREATE OR REPLACE FUNCTION public.dashboard_executive_summary(in_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
SET statement_timeout TO '30s'
AS $function$
WITH
  curr_range AS (SELECT now() - make_interval(days => in_days) AS lo, now() AS hi),
  prev_range AS (SELECT now() - make_interval(days => in_days * 2) AS lo, now() - make_interval(days => in_days) AS hi),

  curr AS (
    SELECT e.session_id, e.device_id, e.event_name, e.occurred_at
    FROM public.analytics_events e, curr_range r
    WHERE e.occurred_at >= r.lo AND e.occurred_at < r.hi
  ),
  prev AS (
    SELECT e.session_id, e.device_id, e.event_name, e.occurred_at
    FROM public.analytics_events e, prev_range r
    WHERE e.occurred_at >= r.lo AND e.occurred_at < r.hi
  ),

  curr_metrics AS (
    SELECT
      count(distinct session_id) AS sessions_started,
      count(distinct device_id)  AS distinct_devices,
      count(distinct session_id) FILTER (WHERE event_name = 'mode_completed') AS sessions_completed,
      count(*) FILTER (WHERE event_name = 'mode_completed') AS mode_completions,
      count(*) FILTER (WHERE event_name = 'mode_started') AS mode_starts,
      count(*) FILTER (WHERE event_name = 'camera_granted') AS cam_granted,
      count(*) FILTER (WHERE event_name = 'camera_denied') AS cam_denied,
      count(*) FILTER (WHERE event_name = 'tracker_init_succeeded') AS tracker_ok,
      count(*) FILTER (WHERE event_name = 'tracker_init_failed') AS tracker_fail,
      -- ★ FIX: ACTIVE span only — passive keep-alive events no longer
      --   stretch the measured session.
      (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY dur_s)
         FROM (
           SELECT extract(epoch FROM (max(occurred_at)-min(occurred_at))) AS dur_s
           FROM curr
           WHERE event_name NOT IN ('session_heartbeat', 'tab_hidden', 'tab_visible')
           GROUP BY session_id
           HAVING extract(epoch FROM (max(occurred_at)-min(occurred_at))) > 0
         ) s) AS median_session_s
    FROM curr
  ),
  prev_metrics AS (
    SELECT
      count(distinct session_id) AS sessions_started,
      count(distinct device_id) AS distinct_devices,
      count(distinct session_id) FILTER (WHERE event_name = 'mode_completed') AS sessions_completed,
      count(*) FILTER (WHERE event_name = 'mode_completed') AS mode_completions,
      count(*) FILTER (WHERE event_name = 'camera_granted') AS cam_granted,
      count(*) FILTER (WHERE event_name = 'camera_denied') AS cam_denied,
      count(*) FILTER (WHERE event_name = 'tracker_init_succeeded') AS tracker_ok,
      count(*) FILTER (WHERE event_name = 'tracker_init_failed') AS tracker_fail,
      (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY dur_s)
         FROM (
           SELECT extract(epoch FROM (max(occurred_at)-min(occurred_at))) AS dur_s
           FROM prev
           WHERE event_name NOT IN ('session_heartbeat', 'tab_hidden', 'tab_visible')
           GROUP BY session_id
           HAVING extract(epoch FROM (max(occurred_at)-min(occurred_at))) > 0
         ) s) AS median_session_s
    FROM prev
  ),
  spark AS (
    SELECT date_trunc('day', occurred_at) AS day,
           count(distinct session_id) AS sessions
    FROM public.analytics_events
    WHERE occurred_at > now() - interval '14 days'
    GROUP BY 1 ORDER BY 1
  ),
  spark_array AS (
    SELECT coalesce(jsonb_agg(jsonb_build_object('day', day, 'n', sessions) ORDER BY day), '[]'::jsonb) AS arr
    FROM spark
  )
SELECT jsonb_build_object(
  'days', in_days,
  'as_of', now(),
  'semantics', jsonb_build_object(
    'sessions_started', 'distinct session_id with ANY event in a ROLLING window ending now()',
    'sparkline_sessions_14d', 'distinct session_id per CALENDAR day (UTC); may not sum to the rolling-window headline',
    'median_session_s', 'median active span per session; session_heartbeat/tab_hidden/tab_visible excluded',
    'mode_completions', 'mode_completed EVENTS (pre-writing emits one per traced path, not one per mode run)'
  ),
  'sparkline_sessions_14d', (SELECT arr FROM spark_array),
  'current', (SELECT to_jsonb(c) FROM curr_metrics c),
  'previous', (SELECT to_jsonb(p) FROM prev_metrics p),
  'deltas', jsonb_build_object(
    'sessions_started_pct', CASE WHEN (SELECT sessions_started FROM prev_metrics) > 0
                                 THEN round(100.0 * ((SELECT sessions_started FROM curr_metrics) - (SELECT sessions_started FROM prev_metrics))::numeric
                                            / (SELECT sessions_started FROM prev_metrics)::numeric, 1) ELSE NULL END,
    'distinct_devices_pct', CASE WHEN (SELECT distinct_devices FROM prev_metrics) > 0
                                 THEN round(100.0 * ((SELECT distinct_devices FROM curr_metrics) - (SELECT distinct_devices FROM prev_metrics))::numeric
                                            / (SELECT distinct_devices FROM prev_metrics)::numeric, 1) ELSE NULL END,
    'mode_completions_pct', CASE WHEN (SELECT mode_completions FROM prev_metrics) > 0
                                 THEN round(100.0 * ((SELECT mode_completions FROM curr_metrics) - (SELECT mode_completions FROM prev_metrics))::numeric
                                            / (SELECT mode_completions FROM prev_metrics)::numeric, 1) ELSE NULL END,
    'median_session_s_delta_s', CASE WHEN (SELECT median_session_s FROM prev_metrics) IS NOT NULL
                                          AND (SELECT median_session_s FROM curr_metrics) IS NOT NULL
                                     THEN round(((SELECT median_session_s FROM curr_metrics) - (SELECT median_session_s FROM prev_metrics))::numeric, 0) ELSE NULL END,
    'cam_grant_rate_curr_pct', CASE WHEN ((SELECT cam_granted FROM curr_metrics) + (SELECT cam_denied FROM curr_metrics)) > 0
                                    THEN round(100.0 * (SELECT cam_granted FROM curr_metrics)::numeric
                                               / ((SELECT cam_granted FROM curr_metrics) + (SELECT cam_denied FROM curr_metrics))::numeric, 1) ELSE NULL END,
    'cam_grant_rate_prev_pct', CASE WHEN ((SELECT cam_granted FROM prev_metrics) + (SELECT cam_denied FROM prev_metrics)) > 0
                                    THEN round(100.0 * (SELECT cam_granted FROM prev_metrics)::numeric
                                               / ((SELECT cam_granted FROM prev_metrics) + (SELECT cam_denied FROM prev_metrics))::numeric, 1) ELSE NULL END,
    'tracker_success_curr_pct', CASE WHEN ((SELECT tracker_ok FROM curr_metrics) + (SELECT tracker_fail FROM curr_metrics)) > 0
                                     THEN round(100.0 * (SELECT tracker_ok FROM curr_metrics)::numeric
                                                / ((SELECT tracker_ok FROM curr_metrics) + (SELECT tracker_fail FROM curr_metrics))::numeric, 1) ELSE NULL END,
    'completion_rate_curr_pct', CASE WHEN (SELECT sessions_started FROM curr_metrics) > 0
                                     THEN round(100.0 * (SELECT sessions_completed FROM curr_metrics)::numeric
                                                / (SELECT sessions_started FROM curr_metrics)::numeric, 1) ELSE NULL END,
    'completion_rate_prev_pct', CASE WHEN (SELECT sessions_started FROM prev_metrics) > 0
                                     THEN round(100.0 * (SELECT sessions_completed FROM prev_metrics)::numeric
                                                / (SELECT sessions_started FROM prev_metrics)::numeric, 1) ELSE NULL END
  )
);
$function$;

GRANT EXECUTE ON FUNCTION public.dashboard_executive_summary(integer) TO anon, authenticated;

-- ─── ROLLBACK ─────────────────────────────────────────────────────
-- DROP FUNCTION IF EXISTS public.dashboard_ingest_latency(integer);
-- ALTER TABLE public.analytics_events DROP COLUMN IF EXISTS received_at;
-- (To revert the abandonment fix, restore the original
--  dashboard_engagement_deep(integer) verbatim from
--  20260512_insights_v2_deep_dives.sql.
--  To revert the executive-summary duration/semantics fix, restore
--  dashboard_executive_summary(integer) verbatim from
--  20260513_executive_summary_perf.sql.)
