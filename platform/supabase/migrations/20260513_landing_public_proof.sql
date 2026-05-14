-- Landing v3 — public proof RPC.
-- Returns aggregate, anonymous platform-level counts ONLY.
-- NO personal data, NO child data, NO school data, NO IPs.
-- Granted to anon (PostgREST exposes it without auth) — landing
-- page calls this on every load.
--
-- Migration already applied to production; this commit pins it.

CREATE OR REPLACE FUNCTION public.landing_public_proof()
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
            count(*) FILTER (WHERE event_name = 'tracker_init_succeeded')                                  AS ok,
            count(*) FILTER (WHERE event_name IN ('tracker_init_succeeded','tracker_init_failed'))         AS total
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

GRANT EXECUTE ON FUNCTION public.landing_public_proof() TO anon;
GRANT EXECUTE ON FUNCTION public.landing_public_proof() TO authenticated;
