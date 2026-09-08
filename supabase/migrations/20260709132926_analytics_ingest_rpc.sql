-- ════════════════════════════════════════════════════════════════════
-- 20260709000001_analytics_ingest_rpc.sql
--
-- Fix: client analytics flush has been failing 100% since the LIOS
-- idempotency change shipped (2026-06-26 deploy).
--
-- Root cause (verified empirically against prod on 2026-07-09):
--   The client flush sends `Prefer: resolution=ignore-duplicates`,
--   which makes PostgREST emit INSERT ... ON CONFLICT DO NOTHING.
--   Postgres requires conflict-arbitration to see existing rows, and
--   the anon role has NO SELECT policy on analytics_events /
--   learning_attempts (by design — child data stays unreadable from
--   the browser). Every such insert therefore fails with 42501
--   ("new row violates row-level security policy"), even though the
--   INSERT policy is WITH CHECK (true).
--
--   Observed effect: zero events delivered via fetch since 26 Jun.
--   The only rows that landed came from the beforeunload sendBeacon
--   (a plain insert, no conflict clause), which ships whatever is in
--   the queue at unload — minus the front batch a failed flush had
--   in flight. Result: sessions in the dashboard "start" mid-flow
--   (first stored row was client_seq 21 in both 4-Jul sessions) and
--   the activation funnel showed 0 for every pre-wave step.
--
-- Fix: dedicated SECURITY DEFINER ingest RPCs that perform the
-- idempotent insert server-side. The tables stay locked down (no anon
-- SELECT), and the RPCs grant no read access — they return only the
-- count of rows inserted.
--
-- Security notes:
--   • ingest_analytics_events mirrors the existing anon INSERT policy
--     (WITH CHECK true) — no privilege expansion.
--   • ingest_learning_attempts re-implements the anon INSERT policy
--     check in SQL (child_profile_id IS NULL, or the caller owns the
--     child profile) because SECURITY DEFINER bypasses RLS.
--   • Both cap the batch at 200 rows (client FLUSH_BATCH_SIZE is 20;
--     the unload beacon can carry more) and only write whitelisted
--     columns — server-managed columns (id, received_at, tenant_id,
--     credibility_*, elo_*) cannot be supplied by the client.
--   • The BEFORE INSERT trigger trg_analytics_events_promote_meta
--     still runs for RPC inserts, so traffic_type/environment
--     promotion from meta is unchanged.
--
-- Reversible: DROP FUNCTION public.ingest_analytics_events(jsonb);
--             DROP FUNCTION public.ingest_learning_attempts(jsonb);
-- (Clients fall back to plain inserts when the RPC is absent.)
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.ingest_analytics_events(in_events jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
SET statement_timeout TO '10s'
AS $function$
DECLARE
  inserted integer;
BEGIN
  IF in_events IS NULL OR jsonb_typeof(in_events) <> 'array' THEN
    RAISE EXCEPTION 'in_events must be a jsonb array';
  END IF;
  IF jsonb_array_length(in_events) > 200 THEN
    RAISE EXCEPTION 'batch too large (max 200)';
  END IF;

  WITH ins AS (
    INSERT INTO public.analytics_events (
      session_id, device_id, occurred_at, event_name, page, component,
      game_mode, stage_id, chapter, level, age_band, school_id, class_id,
      build_version, device_type, browser, browser_version,
      viewport_w, viewport_h, utm_source, utm_medium, utm_campaign,
      referrer, value_number, meta,
      event_uid, client_seq, client_ts, context
    )
    SELECT
      r.session_id, r.device_id, coalesce(r.occurred_at, now()), r.event_name,
      r.page, r.component, r.game_mode, r.stage_id, r.chapter, r.level,
      r.age_band, r.school_id, r.class_id, r.build_version, r.device_type,
      r.browser, r.browser_version, r.viewport_w, r.viewport_h,
      r.utm_source, r.utm_medium, r.utm_campaign, r.referrer,
      r.value_number, coalesce(r.meta, '{}'::jsonb),
      r.event_uid, r.client_seq, r.client_ts, r.context
    FROM jsonb_to_recordset(in_events) AS r(
      session_id uuid, device_id text, occurred_at timestamptz,
      event_name text, page text, component text, game_mode text,
      stage_id text, chapter integer, level integer, age_band text,
      school_id text, class_id text, build_version text, device_type text,
      browser text, browser_version text, viewport_w integer,
      viewport_h integer, utm_source text, utm_medium text,
      utm_campaign text, referrer text, value_number double precision,
      meta jsonb, event_uid uuid, client_seq bigint, client_ts timestamptz,
      context text
    )
    WHERE r.session_id IS NOT NULL AND r.event_name IS NOT NULL
    ON CONFLICT (event_uid) DO NOTHING
    RETURNING 1
  )
  SELECT count(*)::integer INTO inserted FROM ins;

  RETURN inserted;
END;
$function$;

REVOKE ALL ON FUNCTION public.ingest_analytics_events(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ingest_analytics_events(jsonb) TO anon, authenticated, service_role;


CREATE OR REPLACE FUNCTION public.ingest_learning_attempts(in_attempts jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
SET statement_timeout TO '10s'
AS $function$
DECLARE
  inserted integer;
BEGIN
  IF in_attempts IS NULL OR jsonb_typeof(in_attempts) <> 'array' THEN
    RAISE EXCEPTION 'in_attempts must be a jsonb array';
  END IF;
  IF jsonb_array_length(in_attempts) > 200 THEN
    RAISE EXCEPTION 'batch too large (max 200)';
  END IF;

  WITH ins AS (
    INSERT INTO public.learning_attempts (
      occurred_at, session_id, device_id, game_mode, stage_id, stage_index,
      item_key, age_band, was_correct, attempt_number, ms_to_attempt,
      expected_value, actual_value, meta,
      event_uid, client_seq, client_ts, context, child_profile_id,
      gq_path_accuracy_pct, gq_path_efficiency, gq_spatial_error_mean_px,
      gq_velocity_variance, gq_pause_count, gq_directional_changes,
      gq_time_to_first_movement_ms, gq_time_to_completion_ms,
      gq_corrections_in_stroke, gq_n_samples
    )
    SELECT
      coalesce(r.occurred_at, now()), r.session_id, r.device_id,
      r.game_mode, r.stage_id, r.stage_index, r.item_key, r.age_band,
      r.was_correct, r.attempt_number, r.ms_to_attempt,
      r.expected_value, r.actual_value, coalesce(r.meta, '{}'::jsonb),
      r.event_uid, r.client_seq, r.client_ts, r.context, r.child_profile_id,
      r.gq_path_accuracy_pct, r.gq_path_efficiency, r.gq_spatial_error_mean_px,
      r.gq_velocity_variance, r.gq_pause_count, r.gq_directional_changes,
      r.gq_time_to_first_movement_ms, r.gq_time_to_completion_ms,
      r.gq_corrections_in_stroke, r.gq_n_samples
    FROM jsonb_to_recordset(in_attempts) AS r(
      occurred_at timestamptz, session_id uuid, device_id text,
      game_mode text, stage_id text, stage_index integer, item_key text,
      age_band text, was_correct boolean, attempt_number integer,
      ms_to_attempt integer, expected_value text, actual_value text,
      meta jsonb, event_uid uuid, client_seq bigint, client_ts timestamptz,
      context text, child_profile_id uuid,
      gq_path_accuracy_pct numeric, gq_path_efficiency numeric,
      gq_spatial_error_mean_px numeric, gq_velocity_variance numeric,
      gq_pause_count integer, gq_directional_changes integer,
      gq_time_to_first_movement_ms integer, gq_time_to_completion_ms integer,
      gq_corrections_in_stroke integer, gq_n_samples integer
    )
    WHERE r.session_id IS NOT NULL
      AND r.game_mode IS NOT NULL
      AND r.item_key IS NOT NULL
      AND r.was_correct IS NOT NULL
      -- Mirror of the anon/authenticated INSERT policy `attempts_insert`
      -- (SECURITY DEFINER bypasses RLS, so the check moves here):
      -- anonymous / school rows carry NULL child_profile_id; a row for a
      -- specific child is only accepted from that child's owner.
      AND (r.child_profile_id IS NULL OR public.auth_owns_child(r.child_profile_id))
    ON CONFLICT (event_uid) DO NOTHING
    RETURNING 1
  )
  SELECT count(*)::integer INTO inserted FROM ins;

  RETURN inserted;
END;
$function$;

REVOKE ALL ON FUNCTION public.ingest_learning_attempts(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ingest_learning_attempts(jsonb) TO anon, authenticated, service_role;
