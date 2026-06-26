-- ═══════════════════════════════════════════════════════════════════════════════
-- Pilot fixes — 2026-06-24
--
-- Adds infrastructure for per-student activity assignments, classroom defaults,
-- network fingerprinting (proximity join validation), join auditing, and rate
-- limiting. Designed to be SAFE TO RE-RUN.
--
-- Order of operations:
--   1. Enable pgcrypto
--   2. Create admin helper (_is_admin) if missing
--   3. Create new tables (IF NOT EXISTS)
--   4. Create helper functions (normalize_ip, generate_network_fingerprint)
--   5. Create session network fingerprint functions
--   6. Create assignment functions
--   7. Create join validation + rate limit functions
--   8. UPDATE session_lookup_by_code (add session_code check)
--   9. Create class_join_with_network
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 0. Extension ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 0a. Admin helper (needed by join_audit_log RLS) ─────────────────────────
CREATE OR REPLACE FUNCTION public._is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.platform_admins
        WHERE user_id = auth.uid()
    );
END;
$$;

REVOKE ALL ON FUNCTION public._is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._is_admin() TO authenticated, service_role;


-- ── 1. student_activity_assignments ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_activity_assignments (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      uuid        NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    student_id      uuid        NOT NULL REFERENCES public.session_students(id) ON DELETE CASCADE,
    activity        text        NOT NULL,
    sequence_order  int         NOT NULL DEFAULT 0,
    is_enabled      boolean     NOT NULL DEFAULT true,
    assigned_by     uuid        REFERENCES auth.users(id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (student_id, activity)
);

CREATE INDEX IF NOT EXISTS idx_student_assignments_session_student_seq
    ON public.student_activity_assignments (session_id, student_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_student_assignments_session_activity
    ON public.student_activity_assignments (session_id, activity);
CREATE INDEX IF NOT EXISTS idx_student_assignments_student
    ON public.student_activity_assignments (student_id);

ALTER TABLE public.student_activity_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teacher manages own student assignments" ON public.student_activity_assignments;
CREATE POLICY "Teacher manages own student assignments"
    ON public.student_activity_assignments
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = student_activity_assignments.session_id
              AND s.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = student_activity_assignments.session_id
              AND s.teacher_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Student reads own assignments" ON public.student_activity_assignments;
CREATE POLICY "Student reads own assignments"
    ON public.student_activity_assignments
    FOR SELECT
    TO anon
    USING (student_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_activity_assignments TO authenticated;
GRANT SELECT ON public.student_activity_assignments TO anon;

COMMENT ON TABLE public.student_activity_assignments IS
    'Per-student activity assignments within a classroom session. Teachers assign specific game modes to individual students. RLS: teachers own via session ownership; anon can read own student_id.';


-- ── 2. classroom_default_activities ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.classroom_default_activities (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  uuid        NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    activities  text[]      NOT NULL DEFAULT '{}',
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (session_id)
);

ALTER TABLE public.classroom_default_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teacher manages classroom defaults" ON public.classroom_default_activities;
CREATE POLICY "Teacher manages classroom defaults"
    ON public.classroom_default_activities
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = classroom_default_activities.session_id
              AND s.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = classroom_default_activities.session_id
              AND s.teacher_id = auth.uid()
        )
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.classroom_default_activities TO authenticated;

COMMENT ON TABLE public.classroom_default_activities IS
    'Default activity list for a classroom session. Used as fallback when a student has no per-student assignments. RLS: teacher-owned via session ownership.';


-- ── 3. session_network_fingerprints ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.session_network_fingerprints (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id    uuid        NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE UNIQUE,
    network_hash  text        NOT NULL,
    algorithm     text        NOT NULL DEFAULT 'hmac-sha256',
    created_at    timestamptz NOT NULL DEFAULT now(),
    expires_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_network_fingerprints_hash
    ON public.session_network_fingerprints (network_hash);
CREATE INDEX IF NOT EXISTS idx_network_fingerprints_session
    ON public.session_network_fingerprints (session_id);

ALTER TABLE public.session_network_fingerprints ENABLE ROW LEVEL SECURITY;

-- Only server-side functions should touch this table; no direct grants.
REVOKE ALL ON public.session_network_fingerprints FROM anon, authenticated;
GRANT ALL ON public.session_network_fingerprints TO service_role;

COMMENT ON TABLE public.session_network_fingerprints IS
    'Stores HMAC network fingerprints per session for proximity-based join validation. Only accessible via SECURITY DEFINER functions or service_role.';


-- ── 4. join_audit_log (observability) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.join_audit_log (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  uuid,
    student_id  uuid,
    event       text        NOT NULL
        CHECK (event IN ('join_attempt','join_success','join_failure','network_match','network_mismatch')),
    result_code text,
    metadata    jsonb       DEFAULT '{}'::jsonb,
    created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.join_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role write join audit log" ON public.join_audit_log;
CREATE POLICY "service_role write join audit log"
    ON public.join_audit_log
    FOR INSERT
    TO service_role
    WITH CHECK (true);

DROP POLICY IF EXISTS "Teachers read join audit log for own sessions" ON public.join_audit_log;
CREATE POLICY "Teachers read join audit log for own sessions"
    ON public.join_audit_log
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = join_audit_log.session_id
              AND s.teacher_id = auth.uid()
        )
        OR
        public._is_admin()
    );

REVOKE ALL ON public.join_audit_log FROM anon;
GRANT SELECT ON public.join_audit_log TO authenticated;
GRANT INSERT ON public.join_audit_log TO service_role;

COMMENT ON TABLE public.join_audit_log IS
    'Observability log for classroom join attempts. service_role writes; authenticated teachers/admins read for their sessions. anon has no access.';


-- ── 5. join_rate_limits ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.join_rate_limits (
    ip_hash         text        PRIMARY KEY,
    attempt_count   int         NOT NULL DEFAULT 1,
    window_start    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.join_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.join_rate_limits FROM anon, authenticated;
GRANT ALL ON public.join_rate_limits TO service_role;

COMMENT ON TABLE public.join_rate_limits IS
    'Rate limiting table for classroom join attempts. Keyed by IP hash. Only accessible via SECURITY DEFINER functions.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. Helper functions
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 6a. normalize_ip_for_network ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.normalize_ip_for_network(in_ip text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean text;
    v_match text[];
BEGIN
    IF in_ip IS NULL OR btrim(in_ip) = '' THEN
        RETURN NULL;
    END IF;

    -- Strip port number (IPv6: [::1]:port, IPv4: x.x.x.x:port)
    v_clean := regexp_replace(btrim(in_ip), '^\[([^\]]+)\]:\d+$', '\1');
    v_clean := regexp_replace(v_clean, '^(\d+\.\d+\.\d+\.\d+):\d+$', '\1');

    -- Handle IPv4-mapped IPv6 (::ffff:x.x.x.x)
    SELECT regexp_matches(v_clean, '^::ffff:(\d+\.\d+\.\d+\.\d+)$') INTO v_match;
    IF v_match IS NOT NULL AND array_length(v_match, 1) > 0 THEN
        RETURN v_match[1];
    END IF;

    -- Check if it looks like IPv4 (simple dotted quad)
    IF v_clean ~ '^\d+\.\d+\.\d+\.\d+$' THEN
        RETURN v_clean;
    END IF;

    -- Check if it looks like IPv6 — extract /64 prefix (first 4 hextets)
    SELECT regexp_matches(v_clean, '^([0-9a-fA-F]{1,4}):([0-9a-fA-F]{1,4}):([0-9a-fA-F]{1,4}):([0-9a-fA-F]{1,4}):') INTO v_match;
    IF v_match IS NOT NULL AND array_length(v_match, 1) >= 4 THEN
        RETURN lower(v_match[1] || ':' || v_match[2] || ':' || v_match[3] || ':' || v_match[4] || '::');
    END IF;

    -- If we got here, it's not a recognised format
    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_ip_for_network(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_ip_for_network(text) TO authenticated, service_role;

COMMENT ON FUNCTION public.normalize_ip_for_network(text) IS
    'Normalize an IP address for network comparison. IPv4 returned as-is; IPv6 extracts /64 prefix; IPv4-mapped IPv6 extracts the embedded IPv4. Returns NULL for invalid input.';


-- ── 6b. generate_network_fingerprint ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_network_fingerprint(in_ip text, in_secret text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_normalized text;
BEGIN
    IF in_secret IS NULL OR in_secret = '' THEN
        RETURN NULL;
    END IF;

    -- Dev override: return plaintext normalized IP
    IF in_secret = 'dev-override' THEN
        RETURN public.normalize_ip_for_network(in_ip);
    END IF;

    v_normalized := public.normalize_ip_for_network(in_ip);
    IF v_normalized IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN encode(hmac(v_normalized, in_secret, 'sha256'), 'hex');
END;
$$;

REVOKE ALL ON FUNCTION public.generate_network_fingerprint(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_network_fingerprint(text, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.generate_network_fingerprint(text, text) IS
    'Generate HMAC-SHA256 hex digest of a normalized IP using the provided secret. If secret is NULL/empty returns NULL. If secret equals "dev-override" returns the normalized IP in plaintext for local development.';


-- ── 6c. session_set_network_fingerprint ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.session_set_network_fingerprint(
    in_session_id   uuid,
    in_teacher_ip   text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_fingerprint text;
    v_secret      text;
BEGIN
    -- Assert caller owns the session
    PERFORM public._class_assert_teacher(in_session_id);

    v_secret := current_setting('app.network_fingerprint_secret', true);
    v_fingerprint := public.generate_network_fingerprint(in_teacher_ip, v_secret);

    INSERT INTO public.session_network_fingerprints (session_id, network_hash, algorithm)
    VALUES (in_session_id, COALESCE(v_fingerprint, ''), 'hmac-sha256')
    ON CONFLICT (session_id)
    DO UPDATE SET network_hash = COALESCE(v_fingerprint, EXCLUDED.network_hash),
                  algorithm = 'hmac-sha256',
                  expires_at = NULL;

    RETURN jsonb_build_object(
        'session_id', in_session_id,
        'has_fingerprint', v_fingerprint IS NOT NULL
    );
END;
$$;

REVOKE ALL ON FUNCTION public.session_set_network_fingerprint(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.session_set_network_fingerprint(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.session_set_network_fingerprint(uuid, text) IS
    'SECURITY DEFINER. Sets the network fingerprint for a session based on the teacher IP. Asserts session ownership. Upserts into session_network_fingerprints. Returns { session_id, has_fingerprint }.';


-- ── 6d. session_validate_network ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.session_validate_network(
    in_session_id           uuid,
    in_network_fingerprint  text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_stored_hash  text;
BEGIN
    SELECT snf.network_hash INTO v_stored_hash
    FROM public.session_network_fingerprints snf
    WHERE snf.session_id = in_session_id;

    -- No fingerprint stored (dev mode / not set) — allow
    IF v_stored_hash IS NULL OR v_stored_hash = '' THEN
        RETURN jsonb_build_object('match', true, 'reason', 'no_fingerprint');
    END IF;

    -- No student fingerprint provided — reject
    IF in_network_fingerprint IS NULL OR in_network_fingerprint = '' THEN
        RETURN jsonb_build_object('match', false, 'reason', 'NETWORK_MISMATCH');
    END IF;

    IF in_network_fingerprint = v_stored_hash THEN
        RETURN jsonb_build_object('match', true, 'reason', 'OK');
    END IF;

    RETURN jsonb_build_object('match', false, 'reason', 'NETWORK_MISMATCH');
END;
$$;

REVOKE ALL ON FUNCTION public.session_validate_network(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.session_validate_network(uuid, text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.session_validate_network(uuid, text) IS
    'SECURITY DEFINER. Validates a student network fingerprint against the session stored fingerprint. Returns { match: bool, reason: text }. If no fingerprint stored, returns match=true (dev mode).';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. Assignment functions
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 7a. get_student_assignments ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_student_assignments(
    in_student_id   uuid,
    in_session_id   uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_result jsonb;
BEGIN
    -- 1. Look up per-student assignments
    SELECT jsonb_agg(
        jsonb_build_object(
            'activity', saa.activity,
            'sequence_order', saa.sequence_order,
            'is_enabled', saa.is_enabled
        ) ORDER BY saa.sequence_order
    ) INTO v_result
    FROM public.student_activity_assignments saa
    WHERE saa.student_id = in_student_id
      AND saa.session_id = in_session_id;

    IF v_result IS NOT NULL THEN
        RETURN v_result;
    END IF;

    -- 2. Fallback: classroom defaults
    SELECT jsonb_agg(
        jsonb_build_object(
            'activity', cda_act,
            'sequence_order', row_number() OVER () - 1,
            'is_enabled', true
        )
    ) INTO v_result
    FROM public.classroom_default_activities cda,
         unnest(cda.activities) AS cda_act
    WHERE cda.session_id = in_session_id;

    IF v_result IS NOT NULL THEN
        RETURN v_result;
    END IF;

    -- 3. Final fallback: all standard game modes
    RETURN '[
        {"activity": "calibration",      "sequence_order": 0, "is_enabled": true},
        {"activity": "free",             "sequence_order": 1, "is_enabled": true},
        {"activity": "pre-writing",      "sequence_order": 2, "is_enabled": true},
        {"activity": "sort-and-place",   "sequence_order": 3, "is_enabled": true},
        {"activity": "word-search",      "sequence_order": 4, "is_enabled": true},
        {"activity": "colour-builder",   "sequence_order": 5, "is_enabled": true},
        {"activity": "balloon-math",     "sequence_order": 6, "is_enabled": true},
        {"activity": "rainbow-bridge",   "sequence_order": 7, "is_enabled": true},
        {"activity": "gesture-spelling", "sequence_order": 8, "is_enabled": true}
    ]'::jsonb;
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_assignments(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_assignments(uuid, uuid) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_student_assignments(uuid, uuid) IS
    'SECURITY DEFINER. Returns ordered list of assigned activities for a student in a session. Falls back to classroom defaults then to all standard game modes. Returns [{ activity, sequence_order, is_enabled }].';


-- ── 7b. set_student_assignments ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_student_assignments(
    in_session_id   uuid,
    in_student_id   uuid,
    in_activities   jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_count int;
BEGIN
    -- Assert teacher ownership
    PERFORM public._class_assert_teacher(in_session_id);

    -- Delete existing assignments for this student+session
    DELETE FROM public.student_activity_assignments
    WHERE session_id = in_session_id AND student_id = in_student_id;

    -- Insert new ones
    WITH inserted AS (
        INSERT INTO public.student_activity_assignments (session_id, student_id, activity, sequence_order, assigned_by)
        SELECT
            in_session_id,
            in_student_id,
            item->>'activity',
            (item->>'sequence_order')::int,
            auth.uid()
        FROM jsonb_array_elements(in_activities) AS item
        RETURNING 1
    )
    SELECT count(*) INTO v_count FROM inserted;

    RETURN jsonb_build_object('count', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.set_student_assignments(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_student_assignments(uuid, uuid, jsonb) TO authenticated;

COMMENT ON FUNCTION public.set_student_assignments(uuid, uuid, jsonb) IS
    'SECURITY DEFINER. Replaces all activity assignments for a student in a session. Takes JSON array of [{ activity: text, sequence_order: int }]. Asserts teacher ownership. Returns { count: int }.';


-- ── 7c. set_classroom_default_activities ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_classroom_default_activities(
    in_session_id   uuid,
    in_activities   text[]
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_updated_id uuid;
BEGIN
    -- Assert teacher ownership
    PERFORM public._class_assert_teacher(in_session_id);

    INSERT INTO public.classroom_default_activities (session_id, activities)
    VALUES (in_session_id, in_activities)
    ON CONFLICT (session_id)
    DO UPDATE SET activities = in_activities, updated_at = now()
    RETURNING id INTO v_updated_id;

    RETURN jsonb_build_object(
        'session_id', in_session_id,
        'count', coalesce(array_length(in_activities, 1), 0)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.set_classroom_default_activities(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_classroom_default_activities(uuid, text[]) TO authenticated;

COMMENT ON FUNCTION public.set_classroom_default_activities(uuid, text[]) IS
    'SECURITY DEFINER. Upserts the default activity list for a classroom session. Asserts teacher ownership. Returns { session_id, count: int }.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. Rate limiting
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.check_join_rate_limit(in_ip_hash text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_row      public.join_rate_limits%ROWTYPE;
    v_now      timestamptz := now();
    v_window   interval := '60 seconds';
    v_max_attempts int := 10;
BEGIN
    IF in_ip_hash IS NULL OR in_ip_hash = '' THEN
        RETURN jsonb_build_object('allowed', true, 'retry_after_seconds', 0);
    END IF;

    SELECT * INTO v_row
    FROM public.join_rate_limits
    WHERE ip_hash = in_ip_hash
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.join_rate_limits (ip_hash, attempt_count, window_start)
        VALUES (in_ip_hash, 1, v_now);
        RETURN jsonb_build_object('allowed', true, 'retry_after_seconds', 0);
    END IF;

    -- If window expired, reset
    IF v_now - v_row.window_start > v_window THEN
        UPDATE public.join_rate_limits
        SET attempt_count = 1, window_start = v_now
        WHERE ip_hash = in_ip_hash;
        RETURN jsonb_build_object('allowed', true, 'retry_after_seconds', 0);
    END IF;

    -- Within window — check count
    IF v_row.attempt_count >= v_max_attempts THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'retry_after_seconds', extract(epoch FROM (v_row.window_start + v_window - v_now))::int
        );
    END IF;

    -- Increment
    UPDATE public.join_rate_limits
    SET attempt_count = attempt_count + 1
    WHERE ip_hash = in_ip_hash;

    RETURN jsonb_build_object('allowed', true, 'retry_after_seconds', 0);
END;
$$;

REVOKE ALL ON FUNCTION public.check_join_rate_limit(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_join_rate_limit(text) TO service_role;

COMMENT ON FUNCTION public.check_join_rate_limit(text) IS
    'SECURITY DEFINER. Checks rate limit for join attempts. Allows 10 attempts per IP per 60 seconds. Returns { allowed: bool, retry_after_seconds: int }.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. class_validate_join — authoritative join validation
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.class_validate_join(
    in_code                 text,
    in_network_fingerprint  text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_normalized    text;
    v_session       record;
    v_network       jsonb;
BEGIN
    -- 1. Normalize code: trim
    v_normalized := btrim(in_code);
    IF v_normalized IS NULL OR v_normalized = '' THEN
        RETURN jsonb_build_object('valid', false, 'code', 'INVALID_CODE');
    END IF;

    -- 2. Look up session
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

    -- 3. Check session is joinable (waiting, active, or paused)
    IF v_session.status NOT IN ('waiting', 'active', 'paused')
       AND v_session.class_state NOT IN ('lobby', 'in_activity') THEN
        RETURN jsonb_build_object('valid', false, 'code', 'SESSION_NOT_JOINABLE');
    END IF;

    -- 4. Check session not expired (> 4 hours since started)
    IF v_session.started_at IS NOT NULL AND
       now() - v_session.started_at > interval '4 hours' THEN
        RETURN jsonb_build_object('valid', false, 'code', 'SESSION_EXPIRED');
    END IF;

    -- 5. Check network fingerprint (if set)
    v_network := public.session_validate_network(v_session.id, in_network_fingerprint);
    IF (v_network->>'match')::boolean = false THEN
        RETURN jsonb_build_object('valid', false, 'code', 'NETWORK_MISMATCH');
    END IF;

    -- 6. Rate limit check (advisory lock to prevent race conditions)
    IF NOT pg_try_advisory_xact_lock(hashtext(v_session.id::text)) THEN
        RETURN jsonb_build_object('valid', false, 'code', 'RATE_LIMITED');
    END IF;

    -- 7. All checks passed
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

COMMENT ON FUNCTION public.class_validate_join(text, text) IS
    'SECURITY DEFINER. Authoritative join validation for classroom sessions. Checks code validity, session activity, expiry, network proximity, and rate limiting. Returns { valid: bool, code: string, session?: {...} }.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. UPDATED session_lookup_by_code — also check session_code
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.session_lookup_by_code(in_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    r record;
BEGIN
    -- Hard input shape check. Anything other than exactly 4 digits resolves
    -- to NULL so the caller can't probe with regexes / SQL wildcards.
    IF in_code IS NULL OR in_code !~ '^\d{4}$' THEN
        RETURN NULL;
    END IF;

    SELECT
        s.id,
        s.code,
        s.session_code,
        s.activity,
        s.status,
        s.class_state,
        s.round,
        s.timer_seconds,
        s.max_students,
        s.scoreboard_mode,
        s.class_name
    INTO r
    FROM public.sessions s
    WHERE (s.code = in_code OR s.session_code = in_code)
      AND s.status      IN ('waiting', 'active', 'paused')
      AND s.class_state IN ('lobby', 'in_activity')
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    RETURN to_jsonb(r);
END
$$;

REVOKE ALL ON FUNCTION public.session_lookup_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.session_lookup_by_code(text)
    TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.session_lookup_by_code(text) IS
    'UPDATED: Public student-join lookup. Now also checks s.session_code in addition to s.code. Returns minimal fields (no teacher_id, no school_id, no metadata) and only for active sessions. Includes session_code and class_name.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 11. class_join_with_network — full validate + join
-- ═══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.class_join_with_network(uuid, text, text);
CREATE FUNCTION public.class_join_with_network(
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
    -- Validate inputs
    IF in_session_id IS NULL OR coalesce(btrim(in_name), '') = '' THEN
        RAISE EXCEPTION 'invalid join request' USING ERRCODE = '22023';
    END IF;

    -- Validate session is joinable
    PERFORM 1 FROM public.sessions s
    WHERE s.id = in_session_id
      AND s.status IN ('waiting', 'active', 'paused');
    IF NOT FOUND THEN
        RAISE EXCEPTION 'session not joinable' USING ERRCODE = 'P0002';
    END IF;

    -- Compare network fingerprint against stored hash.
    -- The fingerprint was generated server-side by the edge function
    -- from the trusted client IP. We compare directly (both are HMAC
    -- hashes, or both are normalized IPs in dev-override mode).
    SELECT snf.network_hash INTO v_stored_hash
    FROM public.session_network_fingerprints snf
    WHERE snf.session_id = in_session_id;

    IF v_stored_hash IS NOT NULL AND v_stored_hash != '' THEN
        IF in_network_fingerprint IS NULL OR in_network_fingerprint = ''
           OR in_network_fingerprint != v_stored_hash THEN
            RAISE EXCEPTION 'network mismatch' USING ERRCODE = 'P0002';
        END IF;
    END IF;

    -- Dedupe display name
    v_base  := left(btrim(in_name), 40);
    v_final := v_base;
    WHILE EXISTS (
        SELECT 1 FROM public.session_students ss
        WHERE ss.session_id = in_session_id AND ss.name = v_final
    ) AND v_i <= 50 LOOP
        v_final := v_base || v_i::text;
        v_i := v_i + 1;
    END LOOP;

    -- Insert student
    INSERT INTO public.session_students (session_id, name, avatar_seed)
    VALUES (in_session_id, v_final, in_session_id::text || ':' || lower(btrim(v_final)))
    RETURNING id INTO v_id;

    -- Return the new student row
    SELECT ss.id, ss.session_id, ss.name, ss.avatar_seed, ss.is_active,
           ss.kicked_at, ss.kicked_reason
    INTO r
    FROM public.session_students ss WHERE ss.id = v_id;
    RETURN to_jsonb(r);
END;
$$;

REVOKE ALL ON FUNCTION public.class_join_with_network(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.class_join_with_network(uuid, text, text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.class_join_with_network(uuid, text, text) IS
    'SECURITY DEFINER. Anon-callable class join with network proximity validation. Takes server-generated network fingerprint (HMAC hash), compares against stored session fingerprint, dedupes name, inserts roster row, returns it.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- End of migration
-- ═══════════════════════════════════════════════════════════════════════════════
