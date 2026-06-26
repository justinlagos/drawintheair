-- ═══════════════════════════════════════════════════════════════════════════════
-- 0027_join_pilot_hardening.sql
--
-- Pilot blocker fixes for the classroom student-join + activity flow.
--
-- Additive and idempotent (CREATE OR REPLACE + guarded GRANTs). Safe to apply
-- after 0025 (live) and 0026 (must be applied first — defines
-- get_student_class_state / class_get_session / sessions.activity_version).
--
-- What this adds:
--   1. class_get_self(uuid)      — student reads their own session_students row
--   2. class_get_activity(uuid)  — student reads a session_activities row
--      (StudentClassClient calls both; they were referenced but defined
--       nowhere, so the post-join state hydrate failed and bounced the child
--       out of the class. THIS is the core "join does not proceed" bug.)
--   3. class_validate_join_by_ip(text, text)  — server-IP validate wrapper
--   4. class_join_by_ip(uuid, text, text)     — server-IP join wrapper
--      The join-class Edge Function passes only the trusted client IP it
--      resolves server-side; ALL fingerprint hashing/normalisation stays in
--      SQL (generate_network_fingerprint + GUC app.network_fingerprint_secret),
--      so teacher-set and student-compare hashes can never drift across
--      languages. service_role-only so students cannot supply their own IP.
--   5. GRANT get_student_assignments TO anon — so an anonymous student can read
--      their OWN ordered assignments (keyed by their unguessable student UUID),
--      enabling correct per-student activity gating on the client.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. class_get_self ────────────────────────────────────────────────────────
-- Returns the caller's own session_students row. The student UUID is an
-- unguessable capability handed back at join time; we still scope the select
-- to that single row and never expose other students.
CREATE OR REPLACE FUNCTION public.class_get_self(in_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE r record;
BEGIN
    IF in_student_id IS NULL THEN RETURN NULL; END IF;
    SELECT ss.id, ss.session_id, ss.name, ss.avatar_seed, ss.joined_at,
           ss.left_at, ss.is_active, ss.is_connected, ss.kicked_at, ss.kicked_reason
      INTO r
      FROM public.session_students ss
     WHERE ss.id = in_student_id
     LIMIT 1;
    IF NOT FOUND THEN RETURN NULL; END IF;
    RETURN to_jsonb(r);
END $$;

REVOKE ALL ON FUNCTION public.class_get_self(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.class_get_self(uuid) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.class_get_self(uuid) IS
    'SECURITY DEFINER. Returns the caller''s own session_students row (by unguessable student UUID). Anon-callable. Used by StudentClassClient state hydrate.';


-- ── 2. class_get_activity ────────────────────────────────────────────────────
-- Returns a single session_activities row. Used by the student client to
-- render the live activity. The student already holds the activity id from
-- get_student_class_state, which is gated server-side, so this is a plain read.
CREATE OR REPLACE FUNCTION public.class_get_activity(in_activity_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE r record;
BEGIN
    IF in_activity_id IS NULL THEN RETURN NULL; END IF;
    SELECT sa.id, sa.session_id, sa.activity, sa.state, sa.ordinal,
           sa.started_at, sa.ended_at, COALESCE(sa.metadata, '{}'::jsonb) AS metadata
      INTO r
      FROM public.session_activities sa
     WHERE sa.id = in_activity_id
     LIMIT 1;
    IF NOT FOUND THEN RETURN NULL; END IF;
    RETURN to_jsonb(r);
END $$;

REVOKE ALL ON FUNCTION public.class_get_activity(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.class_get_activity(uuid) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.class_get_activity(uuid) IS
    'SECURITY DEFINER. Returns a single session_activities row. Anon-callable. Used by StudentClassClient to render the live activity.';


-- ── 3. class_validate_join_by_ip ─────────────────────────────────────────────
-- Server-IP validate wrapper. The Edge Function resolves the trusted client
-- IP and passes it raw; we compute the network fingerprint here using the
-- SAME function + secret the teacher-arm path uses, then delegate to the
-- existing class_validate_join. service_role only.
CREATE OR REPLACE FUNCTION public.class_validate_join_by_ip(
    in_code      text,
    in_client_ip text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_secret text := current_setting('app.network_fingerprint_secret', true);
    v_fp     text := public.generate_network_fingerprint(in_client_ip, v_secret);
BEGIN
    RETURN public.class_validate_join(in_code, v_fp);
END $$;

REVOKE ALL ON FUNCTION public.class_validate_join_by_ip(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.class_validate_join_by_ip(text, text) TO service_role;

COMMENT ON FUNCTION public.class_validate_join_by_ip(text, text) IS
    'SECURITY DEFINER, service_role only. Computes the network fingerprint server-side from a trusted client IP (GUC app.network_fingerprint_secret) and delegates to class_validate_join. Single source of truth for fingerprint hashing.';


-- ── 4. class_join_by_ip ──────────────────────────────────────────────────────
-- Server-IP join wrapper — same fingerprint derivation, delegates to the
-- existing class_join_with_network (validate joinable + network compare +
-- name dedupe + insert, all atomic). service_role only.
CREATE OR REPLACE FUNCTION public.class_join_by_ip(
    in_session_id uuid,
    in_name       text,
    in_client_ip  text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_secret text := current_setting('app.network_fingerprint_secret', true);
    v_fp     text := public.generate_network_fingerprint(in_client_ip, v_secret);
BEGIN
    RETURN public.class_join_with_network(in_session_id, in_name, v_fp);
END $$;

REVOKE ALL ON FUNCTION public.class_join_by_ip(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.class_join_by_ip(uuid, text, text) TO service_role;

COMMENT ON FUNCTION public.class_join_by_ip(uuid, text, text) IS
    'SECURITY DEFINER, service_role only. Computes the network fingerprint server-side from a trusted client IP and delegates to class_join_with_network (atomic validate + network compare + dedupe + insert).';


-- ── 4b. FIX generate_network_fingerprint — schema-qualify hmac ───────────────
-- BUG (shipped in 0025): the body calls bare hmac(), but on Supabase pgcrypto
-- lives in the `extensions` schema and the function pins
-- search_path = public, pg_temp. So with a REAL secret set,
-- generate_network_fingerprint raised `function hmac(text, text, unknown)
-- does not exist`, which would hard-fail BOTH the teacher-arm path and every
-- student join the instant same-network enforcement was switched on.
-- Fix: call extensions.hmac() explicitly. Behaviour is otherwise identical
-- (NULL secret → NULL, 'dev-override' → normalized plaintext, else HMAC-SHA256
-- of the normalized IP).
CREATE OR REPLACE FUNCTION public.generate_network_fingerprint(in_ip text, in_secret text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_normalized text;
BEGIN
    IF in_secret IS NULL OR in_secret = '' THEN
        RETURN NULL;
    END IF;

    IF in_secret = 'dev-override' THEN
        RETURN public.normalize_ip_for_network(in_ip);
    END IF;

    v_normalized := public.normalize_ip_for_network(in_ip);
    IF v_normalized IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN encode(extensions.hmac(v_normalized, in_secret, 'sha256'), 'hex');
END;
$$;


-- ── 4c. Align class_join_with_network joinable check with validate ───────────
-- BUG: class_validate_join treats a lobby session as joinable (status='lobby'
-- OR class_state IN ('lobby','in_activity')), but class_join_with_network only
-- accepted status IN ('waiting','active','paused'). So a student passed the
-- validate step, reached the name screen, then failed to join a lobby class
-- with SESSION_NOT_JOINABLE. Re-create it with the SAME joinable condition.
CREATE OR REPLACE FUNCTION public.class_join_with_network(
    in_session_id           uuid,
    in_name                 text,
    in_network_fingerprint  text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_stored_hash   text;
    v_base          text;
    v_final         text;
    v_i             int := 2;
    v_id            uuid;
    r               record;
BEGIN
    IF in_session_id IS NULL OR coalesce(btrim(in_name), '') = '' THEN
        RAISE EXCEPTION 'invalid join request' USING ERRCODE = '22023';
    END IF;

    -- Joinable status vocabulary must match sessions_status_check
    -- ('lobby','playing','paused','results','ended') — NOT 'waiting'/'active'.
    PERFORM 1 FROM public.sessions s
    WHERE s.id = in_session_id
      AND (s.status IN ('lobby', 'playing', 'paused')
           OR s.class_state IN ('lobby', 'in_activity'));
    IF NOT FOUND THEN
        RAISE EXCEPTION 'session not joinable' USING ERRCODE = 'P0002';
    END IF;

    SELECT snf.network_hash INTO v_stored_hash
    FROM public.session_network_fingerprints snf
    WHERE snf.session_id = in_session_id;

    IF v_stored_hash IS NOT NULL AND v_stored_hash != '' THEN
        IF in_network_fingerprint IS NULL OR in_network_fingerprint = ''
           OR in_network_fingerprint != v_stored_hash THEN
            RAISE EXCEPTION 'network mismatch' USING ERRCODE = 'P0002';
        END IF;
    END IF;

    v_base  := left(btrim(in_name), 40);
    v_final := v_base;
    WHILE EXISTS (
        SELECT 1 FROM public.session_students ss
        WHERE ss.session_id = in_session_id AND ss.name = v_final
    ) AND v_i <= 50 LOOP
        v_final := v_base || v_i::text;
        v_i := v_i + 1;
    END LOOP;

    INSERT INTO public.session_students (session_id, name, avatar_seed)
    VALUES (in_session_id, v_final, in_session_id::text || ':' || lower(btrim(v_final)))
    RETURNING id INTO v_id;

    SELECT ss.id, ss.session_id, ss.name, ss.avatar_seed, ss.is_active,
           ss.kicked_at, ss.kicked_reason
    INTO r
    FROM public.session_students ss WHERE ss.id = v_id;
    RETURN to_jsonb(r);
END;
$$;


-- ── 5. Let anonymous students read their OWN assignments ─────────────────────
-- get_student_assignments takes (student_id, session_id) and returns only that
-- student's ordered, enabled activities. The student UUID is an unguessable
-- capability, so granting anon is safe and is required for correct per-student
-- activity gating on the (anonymous) student client.
GRANT EXECUTE ON FUNCTION public.get_student_assignments(uuid, uuid) TO anon;


-- ── 6. Align class_validate_join joinable check with sessions_status_check ────
-- The status vocabulary is ('lobby','playing','paused','results','ended').
-- 0025 listed 'waiting'/'active', which never match a real row; realign so the
-- status clause actually works (lobby/playing/paused) alongside class_state.
CREATE OR REPLACE FUNCTION public.class_validate_join(in_code text, in_network_fingerprint text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_normalized    text;
    v_session       record;
    v_network       jsonb;
BEGIN
    v_normalized := btrim(in_code);
    IF v_normalized IS NULL OR v_normalized = '' THEN
        RETURN jsonb_build_object('valid', false, 'code', 'INVALID_CODE');
    END IF;

    SELECT s.id, s.code, s.session_code, s.activity, s.status, s.class_state,
           s.current_activity_id, s.timer_seconds, s.class_name, s.started_at,
           s.ended_at
    INTO v_session
    FROM public.sessions s
    WHERE s.code = v_normalized OR s.session_code = v_normalized
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('valid', false, 'code', 'INVALID_CODE');
    END IF;

    IF v_session.status NOT IN ('lobby', 'playing', 'paused')
       AND v_session.class_state NOT IN ('lobby', 'in_activity') THEN
        RETURN jsonb_build_object('valid', false, 'code', 'SESSION_NOT_JOINABLE');
    END IF;

    IF v_session.started_at IS NOT NULL AND
       now() - v_session.started_at > interval '4 hours' THEN
        RETURN jsonb_build_object('valid', false, 'code', 'SESSION_EXPIRED');
    END IF;

    v_network := public.session_validate_network(v_session.id, in_network_fingerprint);
    IF (v_network->>'match')::boolean = false THEN
        RETURN jsonb_build_object('valid', false, 'code', 'NETWORK_MISMATCH');
    END IF;

    IF NOT pg_try_advisory_xact_lock(hashtext(v_session.id::text)) THEN
        RETURN jsonb_build_object('valid', false, 'code', 'RATE_LIMITED');
    END IF;

    RETURN jsonb_build_object(
        'valid', true,
        'code', 'OK',
        'session', jsonb_build_object(
            'id', v_session.id,
            'code', v_session.code,
            'activity', v_session.activity,
            'class_state', v_session.class_state,
            'current_activity_id', v_session.current_activity_id,
            'timer_seconds', v_session.timer_seconds,
            'class_name', v_session.class_name
        )
    );
END;
$$;
REVOKE ALL ON FUNCTION public.class_validate_join(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.class_validate_join(text, text) TO anon, authenticated, service_role;
