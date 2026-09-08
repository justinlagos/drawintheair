-- FUNCTION app_private.run_billing_health()
CREATE OR REPLACE FUNCTION app_private.run_billing_health()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'app_private', 'net', 'public'
AS $function$
declare k text;
begin
  select value into k from app_private.secrets where name = 'email_cron_key';
  perform net.http_post(
    url := 'https://dcivdrhxeaiulbbhsgfv.supabase.co/functions/v1/billing-health',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', k),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end;
$function$
;

-- FUNCTION app_private.run_email_dispatch()
CREATE OR REPLACE FUNCTION app_private.run_email_dispatch()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'app_private', 'net', 'public'
AS $function$
declare k text;
begin
  select value into k from app_private.secrets where name = 'email_cron_key';
  perform net.http_post(
    url := 'https://dcivdrhxeaiulbbhsgfv.supabase.co/functions/v1/email-dispatch',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', k),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end;
$function$
;

-- FUNCTION public.ingest_analytics_events(in_events jsonb)
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
$function$
;

-- FUNCTION public.ingest_learning_attempts(in_attempts jsonb)
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
      AND (r.child_profile_id IS NULL OR public.auth_owns_child(r.child_profile_id))
    ON CONFLICT (event_uid) DO NOTHING
    RETURNING 1
  )
  SELECT count(*)::integer INTO inserted FROM ins;

  RETURN inserted;
END;
$function$
;

-- FUNCTION public.lios_detect_mastery_episodes_v1()
CREATE OR REPLACE FUNCTION public.lios_detect_mastery_episodes_v1()
 RETURNS TABLE(pairs_processed bigint, transitions_emitted bigint, by_to_state jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_pairs       bigint := 0;
    v_emitted     bigint := 0;
    v_by_state    jsonb;
BEGIN
    WITH current_state AS (
        SELECT
            s.device_id,
            s.item_key,
            s.game_mode,
            s.age_band,
            s.theta,
            s.n_attempts,
            s.n_credible_attempts,
            i.b,
            (SELECT avg(was_correct::int)
             FROM (
                SELECT was_correct
                FROM learning_attempts
                WHERE device_id = s.device_id
                  AND item_key  = s.item_key
                  AND game_mode = s.game_mode
                  AND credibility_score >= 0.4
                ORDER BY occurred_at DESC
                LIMIT 6
             ) x) AS last6_acc,
            (SELECT avg(was_correct::int)
             FROM (
                SELECT was_correct
                FROM learning_attempts
                WHERE device_id = s.device_id
                  AND item_key  = s.item_key
                  AND game_mode = s.game_mode
                ORDER BY occurred_at DESC
                LIMIT 5
             ) x) AS last5_acc,
            (SELECT count(DISTINCT session_id)
             FROM learning_attempts
             WHERE device_id = s.device_id
               AND item_key  = s.item_key
               AND game_mode = s.game_mode) AS distinct_sessions,
            (SELECT EXTRACT(EPOCH FROM (now() - min(occurred_at)))/86400
             FROM learning_attempts
             WHERE device_id = s.device_id
               AND item_key  = s.item_key
               AND game_mode = s.game_mode) AS days_active
        FROM skill_state s
        LEFT JOIN item_difficulty i USING (item_key, game_mode)
        WHERE NOT public.lios_is_technical_item_key(s.item_key)
    ),
    scored AS (
        SELECT
            cs.*,
            CASE cs.age_band
                WHEN '4-5'   THEN 0.65
                WHEN '6-7'   THEN 0.75
                WHEN '8-9'   THEN 0.80
                WHEN '10-11' THEN 0.80
                WHEN '12+'   THEN 0.85
                ELSE              0.75
            END AS acc_threshold
        FROM current_state cs
    ),
    classified AS (
        SELECT
            s.*,
            (SELECT to_state FROM mastery_episode_fact m
             WHERE m.device_id = s.device_id
               AND m.item_key  = s.item_key
               AND m.game_mode = s.game_mode
             ORDER BY m.transition_at DESC
             LIMIT 1) AS previous_state,
            EXISTS (
                SELECT 1 FROM mastery_episode_fact m
                WHERE m.device_id = s.device_id
                  AND m.item_key  = s.item_key
                  AND m.game_mode = s.game_mode
                  AND m.to_state  = 'Mastered'
            ) AS ever_mastered,
            CASE
                WHEN EXISTS (
                    SELECT 1 FROM mastery_episode_fact m
                    WHERE m.device_id = s.device_id
                      AND m.item_key  = s.item_key
                      AND m.game_mode = s.game_mode
                      AND m.to_state  = 'Mastered'
                ) AND COALESCE(s.last5_acc, 0) < 0.60 THEN 'Decayed'

                WHEN s.n_credible_attempts >= 6
                     AND COALESCE(s.last6_acc, 0) >= s.acc_threshold
                     AND s.theta > COALESCE(s.b, 0)
                     AND s.distinct_sessions >= 2
                     AND s.days_active >= 1 THEN 'Mastered'

                WHEN s.n_credible_attempts >= 6
                     AND COALESCE(s.last6_acc, 0) >= s.acc_threshold
                     AND s.theta > COALESCE(s.b, 0) THEN 'Acquired'

                ELSE 'Exposed'
            END AS current_state
        FROM scored s
    ),
    transitions AS (
        SELECT *
        FROM classified
        WHERE current_state IS DISTINCT FROM previous_state
    ),
    inserted AS (
        INSERT INTO mastery_episode_fact (
            device_id, item_key, game_mode,
            from_state, to_state, transition_at,
            age_band, theta_at_event, b_at_event, evidence
        )
        SELECT
            t.device_id, t.item_key, t.game_mode,
            t.previous_state, t.current_state, now(),
            t.age_band,
            t.theta::numeric(6, 3),
            t.b::numeric(6, 3),
            jsonb_build_object(
                'n_attempts',           t.n_attempts,
                'n_credible_attempts',  t.n_credible_attempts,
                'last6_accuracy',       round(COALESCE(t.last6_acc, 0)::numeric, 3),
                'last5_accuracy',       round(COALESCE(t.last5_acc, 0)::numeric, 3),
                'distinct_sessions',    t.distinct_sessions,
                'days_active',          round(t.days_active::numeric, 2),
                'acc_threshold',        t.acc_threshold,
                'theta_minus_b',        round((t.theta - COALESCE(t.b, 0))::numeric, 3),
                'ever_mastered',        t.ever_mastered
            )
        FROM transitions t
        RETURNING to_state
    )
    SELECT
        (SELECT count(*) FROM classified),
        (SELECT count(*) FROM inserted),
        (SELECT jsonb_object_agg(to_state, n)
         FROM (SELECT to_state, count(*) AS n FROM inserted GROUP BY to_state) g)
    INTO v_pairs, v_emitted, v_by_state;

    RETURN QUERY SELECT v_pairs, v_emitted, COALESCE(v_by_state, '{}'::jsonb);
END;
$function$
;

-- FUNCTION public.lios_is_technical_item_key(k text)
CREATE OR REPLACE FUNCTION public.lios_is_technical_item_key(k text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
AS $function$
    SELECT k IS NULL
        OR k ~ '^(mode|stage|session)_'
        OR k = ANY (ARRAY[
            'bubblepop_round_complete',
            'balloonmath_balloon_popped',
            'rainbowbridge_match_made',
            'colourbuilder_match_made',
            'wordsearch_word_found',
            'wordsearch_level_complete',
            'spellingstars_word_complete',
            'build_object_completed',
            'successful_snap',
            'tracing_letter_completed'
        ]);
$function$
;

-- FUNCTION public.class_join(in_session_id uuid, in_name text)
CREATE OR REPLACE FUNCTION public.class_join(in_session_id uuid, in_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_status     text;
  v_state      text;
  v_teacher    uuid;
  v_base       text;
  v_candidate  text;
  v_i          int := 2;
  v_id         uuid;
  v_child      uuid;
  v_matches    int;
  existing     record;
  r            record;
begin
  if in_session_id is null or coalesce(btrim(in_name), '') = '' then
    raise exception 'invalid join request' using errcode = '22023';
  end if;

  select s.status, s.class_state, s.teacher_id
    into v_status, v_state, v_teacher
  from public.sessions s where s.id = in_session_id limit 1;
  if not found or v_status = 'ended' or v_state = 'ended' then
    raise exception 'session not joinable' using errcode = 'P0002';
  end if;

  v_base := left(btrim(in_name), 40);

  -- Roster match: exactly one unarchived child of this teacher, else NULL.
  select count(*), min(cc.id::text)::uuid
    into v_matches, v_child
  from public.class_children cc
  where cc.teacher_id = v_teacher
    and cc.archived = false
    and lower(btrim(v_base)) in (
          lower(btrim(coalesce(cc.first_name,   ''))),
          lower(btrim(coalesce(cc.nickname,     ''))),
          lower(btrim(coalesce(cc.display_name, '')))
        )
    and lower(btrim(v_base)) <> '';
  if v_matches is distinct from 1 then
    v_child := null;
  end if;

  -- Candidate walk: base, base2, base3 ... reclaim stale rows, skip
  -- kicked identities, suffix only when the name is actively in use.
  v_candidate := v_base;
  loop
    select ss.id, ss.kicked_at, ss.updated_at, ss.class_child_id
      into existing
    from public.session_students ss
    where ss.session_id = in_session_id
      and lower(btrim(ss.name)) = lower(btrim(v_candidate))
    order by ss.joined_at asc
    limit 1;

    if not found then
      insert into public.session_students (session_id, name, avatar_seed, class_child_id)
      values (
        in_session_id,
        v_candidate,
        in_session_id::text || ':' || lower(btrim(v_candidate)),
        v_child
      )
      returning id into v_id;
      exit;
    end if;

    if existing.kicked_at is null
       and existing.updated_at < now() - interval '25 seconds' then
      update public.session_students ss
      set updated_at     = now(),
          is_connected   = true,
          left_at        = null,
          class_child_id = coalesce(ss.class_child_id, v_child)
      where ss.id = existing.id
      returning ss.id into v_id;
      exit;
    end if;

    if v_i > 50 then
      raise exception 'no free name available' using errcode = 'P0003';
    end if;
    v_candidate := v_base || v_i::text;
    v_i := v_i + 1;
  end loop;

  select ss.id, ss.session_id, ss.name, ss.avatar_seed, ss.is_active,
         ss.kicked_at, ss.kicked_reason
    into r
  from public.session_students ss where ss.id = v_id;
  return to_jsonb(r);
end $function$
;

-- FUNCTION public.class_student_heartbeat(in_student_id uuid)
CREATE OR REPLACE FUNCTION public.class_student_heartbeat(in_student_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
    update public.session_students ss
    set updated_at   = now(),
        is_connected = true,
        left_at      = null
    where ss.id = in_student_id
      and ss.kicked_at is null
      and exists (
          select 1 from public.sessions s
          where s.id = ss.session_id
            and s.status <> 'ended'
            and (s.class_state is null or s.class_state <> 'ended')
      );
    -- Silently a no-op for unknown ids, kicked students or ended sessions.
end;
$function$
;

-- FUNCTION public.dashboard_executive_summary(in_days integer)
CREATE OR REPLACE FUNCTION public.dashboard_executive_summary(in_days integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
 SET statement_timeout TO '30s'
AS $function$
WITH
  curr_range AS (SELECT now() - make_interval(days => in_days) AS lo, now() AS hi),
  prev_range AS (SELECT now() - make_interval(days => in_days * 2) AS lo, now() - make_interval(days => in_days) AS hi),

  eligible AS (
    SELECT e.session_id, e.device_id, e.event_name, e.occurred_at
    FROM public.analytics_events e
    WHERE (e.traffic_type IS NULL OR e.traffic_type NOT IN ('internal', 'qa', 'bot'))
  ),

  noise AS (
    SELECT unnest(ARRAY[
      'session_heartbeat', 'tracker_quality_sample',
      'tab_hidden', 'tab_visible', 'csp_violation'
    ]) AS event_name
  ),

  curr AS (
    SELECT e.* FROM eligible e, curr_range r
    WHERE e.occurred_at >= r.lo AND e.occurred_at < r.hi
  ),
  prev AS (
    SELECT e.* FROM eligible e, prev_range r
    WHERE e.occurred_at >= r.lo AND e.occurred_at < r.hi
  ),

  curr_metrics AS (
    SELECT
      count(distinct session_id) FILTER (WHERE event_name NOT IN (SELECT event_name FROM noise)) AS sessions_started,
      count(distinct device_id)  FILTER (WHERE event_name NOT IN (SELECT event_name FROM noise)) AS distinct_devices,
      count(distinct session_id) FILTER (WHERE event_name = 'mode_completed') AS sessions_completed,
      count(*) FILTER (WHERE event_name = 'mode_completed') AS mode_completions,
      count(*) FILTER (WHERE event_name = 'mode_started') AS mode_starts,
      count(distinct session_id) FILTER (WHERE event_name = 'mode_started') AS mode_start_sessions,
      count(*) FILTER (WHERE event_name = 'camera_granted') AS cam_granted,
      count(*) FILTER (WHERE event_name = 'camera_denied') AS cam_denied,
      count(*) FILTER (WHERE event_name = 'tracker_init_succeeded') AS tracker_ok,
      count(*) FILTER (WHERE event_name = 'tracker_init_failed') AS tracker_fail,
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
      count(distinct session_id) FILTER (WHERE event_name NOT IN (SELECT event_name FROM noise)) AS sessions_started,
      count(distinct device_id)  FILTER (WHERE event_name NOT IN (SELECT event_name FROM noise)) AS distinct_devices,
      count(distinct session_id) FILTER (WHERE event_name = 'mode_completed') AS sessions_completed,
      count(*) FILTER (WHERE event_name = 'mode_completed') AS mode_completions,
      count(*) FILTER (WHERE event_name = 'mode_started') AS mode_starts,
      count(distinct session_id) FILTER (WHERE event_name = 'mode_started') AS mode_start_sessions,
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
    FROM eligible
    WHERE occurred_at > now() - interval '14 days'
      AND event_name NOT IN (SELECT event_name FROM noise)
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
    'traffic_filter', 'internal/qa/bot excluded; NULL (pre-stamping legacy clients) and demo kept',
    'sessions_started', 'distinct session_id with at least one NON-noise event in a ROLLING window ending now(); noise = heartbeat/tracker_quality_sample/tab_*/csp_violation',
    'sparkline_sessions_14d', 'same filters as sessions_started, per CALENDAR day (UTC); may not sum to the rolling-window headline',
    'median_session_s', 'median active span per session; session_heartbeat/tab_hidden/tab_visible excluded',
    'mode_completions', 'mode_completed EVENTS (pre-writing emits one per traced path, not one per mode run)',
    'mode_start_sessions', 'distinct sessions with a mode_started — use this for per-session funnel steps, mode_starts is raw event count'
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
$function$
;

-- FUNCTION public.dashboard_export_headline(in_days integer)
CREATE OR REPLACE FUNCTION public.dashboard_export_headline(in_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT jsonb_build_object(
        'export_version',     'lios-v1',
        'generated_at',       now(),
        'window_days',        in_days,
        'product',            'draw-in-the-air',
        'environment',        'production',
        'headline', jsonb_build_object(
            'attempts_in_window',  (SELECT count(*) FROM learning_attempts WHERE occurred_at > now() - (in_days || ' days')::interval),
            'sessions_in_window',  (SELECT count(DISTINCT session_id) FROM analytics_events WHERE occurred_at > now() - (in_days || ' days')::interval),
            'learners_in_window',  (SELECT count(DISTINCT device_id) FROM learning_attempts WHERE occurred_at > now() - (in_days || ' days')::interval AND device_id IS NOT NULL),
            'mastered_skills',     (SELECT count(*) FROM (
                                        SELECT DISTINCT ON (device_id, item_key, game_mode) to_state
                                        FROM mastery_episode_fact
                                        WHERE NOT public.lios_is_technical_item_key(item_key)
                                        ORDER BY device_id, item_key, game_mode, transition_at DESC
                                    ) latest WHERE latest.to_state = 'Mastered'),
            'mastered_semantics',  'learner_item_states_curriculum_only',
            'observations_in_window', (SELECT count(*) FROM human_observation_fact WHERE recorded_at > now() - (in_days || ' days')::interval),
            'adaptive_decisions_in_window', (SELECT count(*) FROM lios_adaptive_decisions WHERE made_at > now() - (in_days || ' days')::interval),
            'cron_runs_24h',       (SELECT count(*) FROM lios_pipeline_runs WHERE run_at > now() - interval '24 hours'),
            'cron_failed_24h',     (SELECT count(*) FROM lios_pipeline_runs WHERE run_at > now() - interval '24 hours' AND error_message IS NOT NULL)
        )
    );
$function$
;

-- FUNCTION public.dashboard_funnel(in_days integer)
CREATE OR REPLACE FUNCTION public.dashboard_funnel(in_days integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
 SET statement_timeout TO '30s'
AS $function$
WITH eligible AS (
    SELECT e.session_id, e.event_name
    FROM public.analytics_events e
    WHERE e.occurred_at > now() - make_interval(days => in_days)
      AND (e.traffic_type IS NULL OR e.traffic_type NOT IN ('internal', 'qa', 'bot'))
),
sessions_top AS (
    SELECT count(distinct session_id) AS n
    FROM eligible
    WHERE event_name NOT IN (
        'session_heartbeat', 'tracker_quality_sample',
        'tab_hidden', 'tab_visible', 'csp_violation'
    )
),
steps(step_order, step_name) AS (
    VALUES
        (2,  'camera_requested'),
        (3,  'camera_granted'),
        (4,  'tracker_init_started'),
        (5,  'tracker_init_succeeded'),
        (6,  'wave_screen_view'),
        (7,  'wave_first_hand_seen'),
        (8,  'wave_completed'),
        (9,  'mode_started'),
        (10, 'mode_completed')
),
counted AS (
    SELECT 1 AS step_order, 'session_started' AS step_name,
           (SELECT n FROM sessions_top)::bigint AS sessions
    UNION ALL
    SELECT s.step_order, s.step_name,
           (SELECT count(distinct e.session_id)
              FROM eligible e
              WHERE e.event_name = s.step_name) AS sessions
    FROM steps s
),
with_pct AS (
    SELECT step_order, step_name, sessions,
           CASE WHEN max(sessions) OVER () = 0 THEN 0
                ELSE round(100.0 * sessions / max(sessions) OVER (), 1)
           END AS pct_of_top
    FROM counted
)
SELECT jsonb_build_object(
    'days', in_days,
    'as_of', now(),
    'semantics', jsonb_build_object(
        'traffic_filter', 'internal/qa/bot excluded; NULL (pre-stamping legacy) and demo kept — matches dashboard_executive_summary',
        'session_started', 'distinct sessions with ≥1 non-noise event (same as the executive sessions_started card), NOT the retired session_started event',
        'steps', 'each step = distinct sessions that emitted the event at least once in the window'
    ),
    'steps', coalesce(jsonb_agg(
        jsonb_build_object(
            'step_order', step_order,
            'step_name', step_name,
            'sessions', sessions,
            'pct_of_top', pct_of_top
        ) ORDER BY step_order
    ), '[]'::jsonb)
) FROM with_pct;
$function$
;

-- FUNCTION public.dashboard_mastery_summary(in_days integer)
CREATE OR REPLACE FUNCTION public.dashboard_mastery_summary(in_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
WITH per_device_item AS (
    SELECT game_mode, item_key, device_id,
        count(*) AS attempts,
        avg(CASE WHEN was_correct THEN 1 ELSE 0 END)::numeric * 100 AS acc_pct
    FROM public.learning_attempts
    WHERE occurred_at > now() - make_interval(days => in_days)
      AND NOT public.lios_is_technical_item_key(item_key)
    GROUP BY game_mode, item_key, device_id
), classified AS (
    SELECT game_mode, item_key, device_id, attempts, acc_pct,
        CASE WHEN attempts >= 5 AND acc_pct >= 80 THEN 'strong'
             WHEN attempts >= 3 AND acc_pct >= 50 THEN 'practising'
             ELSE 'new' END AS bucket
    FROM per_device_item
), per_item AS (
    SELECT game_mode, item_key,
        count(*) FILTER (WHERE bucket = 'strong') AS strong,
        count(*) FILTER (WHERE bucket = 'practising') AS practising,
        count(*) FILTER (WHERE bucket = 'new') AS new_,
        count(*) AS total_devices,
        round(avg(acc_pct)::numeric, 1) AS mean_acc_pct,
        round(percentile_cont(0.5) WITHIN GROUP (ORDER BY acc_pct)::numeric, 1) AS median_acc_pct,
        round(avg(attempts)::numeric, 1) AS mean_attempts
    FROM classified GROUP BY game_mode, item_key
), totals AS (
    SELECT count(*) FILTER (WHERE strong > 0) AS items_with_mastery,
        sum(strong)::int AS total_strong, sum(practising)::int AS total_practising,
        sum(new_)::int AS total_new,
        count(DISTINCT (game_mode, item_key))::int AS distinct_items,
        count(DISTINCT game_mode)::int AS distinct_modes
    FROM per_item
)
SELECT jsonb_build_object(
    'days', in_days, 'as_of', now(),
    'item_scope', 'curriculum_only',
    'totals', (SELECT to_jsonb(t) FROM totals t),
    'items', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'game_mode', game_mode, 'item_key', item_key,
        'strong', strong, 'practising', practising, 'new', new_,
        'total_devices', total_devices, 'mean_acc_pct', mean_acc_pct,
        'median_acc_pct', median_acc_pct, 'mean_attempts', mean_attempts
    ) ORDER BY total_devices DESC, mean_acc_pct DESC) FROM per_item), '[]'::jsonb),
    'struggling', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'game_mode', game_mode, 'item_key', item_key,
        'total_devices', total_devices, 'median_acc_pct', median_acc_pct,
        'mean_attempts', mean_attempts
    ) ORDER BY median_acc_pct ASC, total_devices DESC) FROM per_item
       WHERE median_acc_pct < 60 AND total_devices >= 3 LIMIT 12), '[]'::jsonb),
    'top_strong', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'game_mode', game_mode, 'item_key', item_key, 'strong', strong,
        'total_devices', total_devices, 'mean_acc_pct', mean_acc_pct
    ) ORDER BY strong DESC, mean_acc_pct DESC) FROM per_item
       WHERE strong >= 1 LIMIT 12), '[]'::jsonb)
);
$function$
;

-- FUNCTION public.dashboard_mastery_v2(in_days integer)
CREATE OR REPLACE FUNCTION public.dashboard_mastery_v2(in_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    WITH latest AS (
        SELECT DISTINCT ON (device_id, item_key, game_mode)
            device_id, item_key, game_mode, to_state AS current_state,
            transition_at, age_band, theta_at_event, b_at_event
        FROM mastery_episode_fact
        WHERE NOT public.lios_is_technical_item_key(item_key)
        ORDER BY device_id, item_key, game_mode, transition_at DESC
    ),
    totals AS (
        SELECT
            count(*) FILTER (WHERE current_state = 'Exposed')  AS exposed,
            count(*) FILTER (WHERE current_state = 'Acquired') AS acquired,
            count(*) FILTER (WHERE current_state = 'Mastered') AS mastered,
            count(*) FILTER (WHERE current_state = 'Decayed')  AS decayed,
            count(*)                                           AS total_pairs
        FROM latest
    ),
    by_state_mode AS (
        SELECT game_mode, current_state, count(*)::int AS n
        FROM latest
        WHERE game_mode IS NOT NULL
        GROUP BY game_mode, current_state
    ),
    by_age_state AS (
        SELECT age_band, current_state, count(*)::int AS n
        FROM latest
        WHERE age_band IS NOT NULL
        GROUP BY age_band, current_state
    ),
    recent_transitions AS (
        SELECT device_id, item_key, game_mode,
               from_state, to_state, transition_at,
               age_band, evidence
        FROM mastery_episode_fact
        WHERE transition_at > now() - (in_days || ' days')::interval
          AND NOT public.lios_is_technical_item_key(item_key)
        ORDER BY transition_at DESC
        LIMIT 20
    ),
    top_mastered_items AS (
        SELECT item_key, game_mode, count(*)::int AS n_learners
        FROM latest
        WHERE current_state = 'Mastered'
        GROUP BY item_key, game_mode
        ORDER BY n_learners DESC
        LIMIT 15
    )
    SELECT jsonb_build_object(
        'days',  in_days,
        'as_of', now(),
        'item_scope', 'curriculum_only',
        'count_semantics', 'learner_item_states',
        'totals', (SELECT row_to_json(t) FROM totals t),
        'by_state_mode',   COALESCE((SELECT jsonb_agg(row_to_json(b)) FROM by_state_mode b), '[]'::jsonb),
        'by_age_state',    COALESCE((SELECT jsonb_agg(row_to_json(a)) FROM by_age_state a), '[]'::jsonb),
        'recent_transitions', COALESCE((SELECT jsonb_agg(row_to_json(r) ORDER BY transition_at DESC) FROM recent_transitions r), '[]'::jsonb),
        'top_mastered',    COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM top_mastered_items t), '[]'::jsonb)
    );
$function$
;

-- FUNCTION public.handle_new_parent_user()
CREATE OR REPLACE FUNCTION public.handle_new_parent_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into parent_profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      split_part(coalesce(new.email,''), '@', 1)
    )
  )
  on conflict (id) do nothing;

  if (new.raw_user_meta_data ->> 'role') = 'parent' then
    perform public.start_parent_trial(new.id);
  end if;

  return new;
end;
$function$
;