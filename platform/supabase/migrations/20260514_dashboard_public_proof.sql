-- Phase 3 . dashboard_public_proof()
--
-- Adds dashboard_public_proof() as the canonical name for the public
-- aggregate-counts RPC. The existing landing_public_proof() function
-- (shipped in 20260513_landing_public_proof.sql) returns identical
-- data; this migration keeps it for backwards compatibility and adds
-- the new name. Both functions are aggregate-only . NO PII, NO child
-- data, NO school data, NO IPs.
--
-- Six numbers in the blueprint:
--   1. distinct_devices_90d   . unique devices over last 90 days
--   2. activities_completed   . count of mode_completed events
--   3. mode_plays             . count of mode_started events
--   4. tracker_success_pct    . % clean MediaPipe inits
--   5. items_touched          . distinct (game_mode, item_key) attempted
--   6. items_mastered         . distinct items mastered (>=5 attempts, >=80% acc)
--
-- Plus a server timestamp (as_of) so clients can show "updated X ago".

CREATE OR REPLACE FUNCTION public.dashboard_public_proof()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
WITH
    win AS (
        SELECT * FROM public.analytics_events
        WHERE occurred_at > now() - interval '90 days'
    ),
    tracker AS (
        SELECT
            count(*) FILTER (WHERE event_name = 'tracker_init_succeeded')                          AS ok,
            count(*) FILTER (WHERE event_name IN ('tracker_init_succeeded','tracker_init_failed')) AS total
        FROM win
    ),
    mastered AS (
        WITH per_device_item AS (
            SELECT game_mode, item_key, device_id,
                count(*) AS attempts,
                avg(CASE WHEN was_correct THEN 1 ELSE 0 END)::numeric * 100 AS acc_pct
            FROM public.learning_attempts
            WHERE occurred_at > now() - interval '90 days'
            GROUP BY game_mode, item_key, device_id
        )
        SELECT count(DISTINCT (game_mode, item_key)) AS items
        FROM per_device_item
        WHERE attempts >= 5 AND acc_pct >= 80
    ),
    touched AS (
        SELECT count(DISTINCT (game_mode, item_key)) AS items
        FROM public.learning_attempts
        WHERE occurred_at > now() - interval '90 days'
    )
SELECT jsonb_build_object(
    'as_of', now(),
    'distinct_devices_90d',  (SELECT count(distinct device_id) FROM win WHERE device_id IS NOT NULL),
    'activities_completed',  (SELECT count(*)                  FROM win WHERE event_name = 'mode_completed'),
    'mode_plays',            (SELECT count(*)                  FROM win WHERE event_name = 'mode_started'),
    'tracker_success_pct',   CASE WHEN (SELECT total FROM tracker) > 0
                                  THEN round(100.0 * (SELECT ok FROM tracker) / (SELECT total FROM tracker), 1)
                                  ELSE 0 END,
    'items_touched',         (SELECT items FROM touched),
    'items_mastered',        (SELECT items FROM mastered)
);
$function$;

GRANT EXECUTE ON FUNCTION public.dashboard_public_proof() TO anon;
GRANT EXECUTE ON FUNCTION public.dashboard_public_proof() TO authenticated;
