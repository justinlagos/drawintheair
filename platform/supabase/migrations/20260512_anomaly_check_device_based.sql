-- Anomaly check: device-based counts + sane thresholds
--
-- 2026-05-12: the camera_denied alert fired 4× in 1 hour because a
-- SINGLE device (de5f4209-…) generated 46 denial events in 9 minutes
-- via the new CameraRecovery "Try again" retry loop on a browser with
-- permanently-blocked permission. The old check counted raw events,
-- so one looping device looked like an outage to the cron.
--
-- This rewrite changes the count to COUNT(DISTINCT device_id) for
-- every metric where one device can plausibly spam events (denials,
-- CSP, init failures). system_error still uses COUNT(*) — an uncaught
-- exception that fires a lot from one device IS notable.
--
-- Thresholds revised:
--   tracker_init_failed   3 → 5 distinct devices
--   camera_denied         5 → 10 distinct devices
--   csp_violation         5 → 10 distinct devices
--   system_error          1 → 3 events (unchanged metric, mild bump)
--
-- Paired with a src/lib/analytics.ts change in the same commit:
-- camera_denied is deduped to once per session (subsequent fires log
-- camera_retry_failed instead), so even before this RPC change the
-- inflation stops at the source for new clients. The RPC change is
-- belt-and-braces so the alert email can never again misread a single
-- looping browser as a platform-wide event.

CREATE OR REPLACE FUNCTION public.dashboard_anomaly_check()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
WITH window15 AS (
    SELECT * FROM public.analytics_events
    WHERE occurred_at > now() - interval '15 minutes'
), counts AS (
    SELECT
        count(distinct device_id) filter (where event_name = 'tracker_init_failed') AS init_fail_devices,
        count(distinct device_id) filter (where event_name = 'camera_denied')        AS cam_denied_devices,
        count(distinct device_id) filter (where event_name = 'csp_violation')        AS csp_devices,
        count(*)                   filter (where event_name = 'system_error')         AS sys_err,
        count(*)                   filter (where event_name = 'tracker_init_succeeded') AS init_ok,
        count(*)                   filter (where event_name = 'camera_denied')        AS cam_denied_raw,
        count(*)                   filter (where event_name = 'camera_retry_failed')  AS cam_retry_failed_raw,
        count(distinct session_id) filter (where event_name = 'session_started')      AS new_sessions
    FROM window15
), checks AS (
    SELECT * FROM (VALUES
        ('tracker_init_failed_devices', (SELECT init_fail_devices FROM counts)::int, 5,
         'tracker_init_failed seen on N distinct devices in last 15 min'),
        ('camera_denied_devices',       (SELECT cam_denied_devices FROM counts)::int, 10,
         'camera_denied (first-time per session) on N distinct devices'),
        ('csp_violation_devices',       (SELECT csp_devices FROM counts)::int, 10,
         'csp_violation on N distinct devices — something is being blocked'),
        ('system_error',                (SELECT sys_err FROM counts)::int, 3,
         'uncaught system_error events in last 15 min')
    ) AS t(metric, observed, threshold, message)
)
SELECT jsonb_build_object(
    'as_of', now(),
    'breaches', coalesce(jsonb_agg(
        jsonb_build_object(
            'metric', metric,
            'observed', observed,
            'threshold', threshold,
            'message', message
        )
    ) FILTER (WHERE observed >= threshold), '[]'::jsonb),
    'window_summary', (SELECT to_jsonb(c) FROM counts c)
) FROM checks;
$function$;
