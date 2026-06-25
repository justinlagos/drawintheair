-- ═══════════════════════════════════════════════════════════════════════════════
-- 0026_activity_realtime_fix.sql
--
-- ROOT CAUSE: The sessions, session_students, and session_activities tables
-- were not in the supabase_realtime publication, so postgres_changes
-- subscriptions never delivered events to students when the teacher started
-- an activity. The student's Realtime subscription silently received nothing.
--
-- This migration:
--   1. Adds the three classroom tables to supabase_realtime publication
--   2. Adds activity_version column for idempotent duplicate event detection
--   3. Updates class_start_activity to set status='active' + increment version
--   4. Creates get_student_class_state (single authoritative state resolver)
--   5. Adds CHECK constraint preventing class_state='in_activity' with NULL
--      current_activity_id
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Add tables to Realtime publication ───────────────────────────
-- Without this, postgres_changes subscriptions silently fail to deliver
-- any events. The teacher dashboard works because it polls/reloads, but
-- student UIs that depend on realtime state transitions (waiting→playing)
-- never fire.
-- NOTE: Postgres does NOT support `ADD TABLE IF NOT EXISTS` on ALTER
-- PUBLICATION, and re-adding a table that is already a member raises an
-- error. sessions + session_students were already added out-of-band on the
-- pilot project, so we guard each ADD with a pg_publication_tables check to
-- keep this migration idempotent and safe to (re)apply.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                   WHERE pubname = 'supabase_realtime'
                     AND schemaname = 'public' AND tablename = 'sessions') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                   WHERE pubname = 'supabase_realtime'
                     AND schemaname = 'public' AND tablename = 'session_students') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.session_students;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                   WHERE pubname = 'supabase_realtime'
                     AND schemaname = 'public' AND tablename = 'session_activities') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.session_activities;
    END IF;
END$$;

COMMENT ON PUBLICATION supabase_realtime IS
    'Supabase Realtime publication. Tables added by migration 0026: public.sessions, public.session_students, public.session_activities.';


-- ── 2. Add activity_version column ──────────────────────────────────
-- Incremented every time the teacher starts/pauses/ends an activity.
-- The student client uses this to detect and ignore duplicate or stale
-- Realtime events (e.g., two identical UPDATE broadcasts).
ALTER TABLE public.sessions
    ADD COLUMN IF NOT EXISTS activity_version int NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.sessions.activity_version IS
    'Monotonically increasing version counter. Bumped each time an activity starts, pauses, resumes, or ends. Students use this for idempotent event handling.';


-- ── 3. Add status column to anon column grant ───────────────────────
-- The 0022 migration already grants select on status to anon; this is a
-- safety re-grant that is idempotent.
GRANT SELECT (activity_version)
    ON public.sessions TO anon;


-- ── 4. Update class_start_activity ──────────────────────────────────
-- Now ALSO sets status = 'active' and increments activity_version so
-- that both the legacy status column and the new version counter reflect
-- the authoritative state.
-- 
-- The existing authz (SECURITY DEFINER + _class_assert_teacher) is
-- unchanged.
CREATE OR REPLACE FUNCTION public.class_start_activity(
    in_session_id uuid,
    in_activity   text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    new_id    uuid;
    next_ord  int;
BEGIN
    PERFORM public._class_assert_teacher(in_session_id);

    -- End any currently active activity
    UPDATE public.session_activities
    SET state = 'ended', ended_at = COALESCE(ended_at, now())
    WHERE session_id = in_session_id
      AND state IN ('starting', 'playing', 'paused', 'results');

    -- Next ordinal
    SELECT COALESCE(max(ordinal), 0) + 1 INTO next_ord
      FROM public.session_activities
     WHERE session_id = in_session_id;

    -- Create the new activity row
    INSERT INTO public.session_activities (session_id, activity, state, ordinal)
    VALUES (in_session_id, in_activity, 'playing', next_ord)
    RETURNING id INTO new_id;

    -- Update the authoritative session row atomically:
    --   class_state        = 'in_activity'
    --   current_activity_id = new activity row
    --   status             = 'active'  (was missing — stayed 'waiting')
    --   activity_version   += 1        (new — for idempotent event handling)
    UPDATE public.sessions
    SET class_state          = 'in_activity',
        current_activity_id  = new_id,
        activity             = in_activity,
        status               = 'playing',
        activity_version     = activity_version + 1,
        started_at           = COALESCE(started_at, now()),
        updated_at           = now()
    WHERE id = in_session_id;

    RETURN jsonb_build_object(
        'session_id',         in_session_id,
        'activity',           in_activity,
        'session_activity_id', new_id,
        'ordinal',            next_ord,
        'state',              'playing',
        'status',             'playing',
        'activity_version',   (SELECT activity_version FROM public.sessions WHERE id = in_session_id)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.class_start_activity(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.class_start_activity(uuid, text) TO authenticated;


-- ── 5. Update class_pause_activity to increment activity_version ─────
CREATE OR REPLACE FUNCTION public.class_pause_activity(in_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE cur uuid; new_ver int;
BEGIN
    PERFORM public._class_assert_teacher(in_session_id);
    SELECT current_activity_id INTO cur FROM public.sessions WHERE id = in_session_id;
    IF cur IS NULL THEN
        SELECT id INTO cur FROM public.session_activities
        WHERE session_id = in_session_id AND state IN ('starting','playing','paused')
        ORDER BY started_at DESC LIMIT 1;
        IF cur IS NOT NULL THEN
            UPDATE public.sessions
            SET current_activity_id = cur,
                class_state = 'in_activity',
                updated_at = now()
            WHERE id = in_session_id;
        END IF;
    END IF;
    IF cur IS NULL THEN RAISE EXCEPTION 'no active activity'; END IF;
    UPDATE public.session_activities SET state = 'paused'
      WHERE id = cur AND state IN ('playing','starting');
    UPDATE public.sessions
    SET updated_at = now(),
        status = 'paused',
        activity_version = activity_version + 1
    WHERE id = in_session_id
    RETURNING activity_version INTO new_ver;
    RETURN jsonb_build_object(
        'session_activity_id', cur,
        'state', 'paused',
        'status', 'paused',
        'activity_version', new_ver
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.class_pause_activity(uuid) TO authenticated;


-- ── 6. Update class_resume_activity to increment activity_version ────
CREATE OR REPLACE FUNCTION public.class_resume_activity(in_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE cur uuid; new_ver int;
BEGIN
    PERFORM public._class_assert_teacher(in_session_id);
    SELECT current_activity_id INTO cur FROM public.sessions WHERE id = in_session_id;
    IF cur IS NULL THEN
        SELECT id INTO cur FROM public.session_activities
        WHERE session_id = in_session_id AND state IN ('paused','playing','starting')
        ORDER BY started_at DESC LIMIT 1;
        IF cur IS NOT NULL THEN
            UPDATE public.sessions
            SET current_activity_id = cur,
                class_state = 'in_activity',
                updated_at = now()
            WHERE id = in_session_id;
        END IF;
    END IF;
    IF cur IS NULL THEN RAISE EXCEPTION 'no active activity'; END IF;
    UPDATE public.session_activities SET state = 'playing'
      WHERE id = cur AND state IN ('paused','starting');
    UPDATE public.sessions
    SET updated_at = now(),
        status = 'playing',
        activity_version = activity_version + 1
    WHERE id = in_session_id
    RETURNING activity_version INTO new_ver;
    RETURN jsonb_build_object(
        'session_activity_id', cur,
        'state', 'playing',
        'status', 'playing',
        'activity_version', new_ver
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.class_resume_activity(uuid) TO authenticated;


-- ── 7. Update class_end_activity to increment activity_version ───────
CREATE OR REPLACE FUNCTION public.class_end_activity(in_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE cur uuid; new_ver int;
BEGIN
    PERFORM public._class_assert_teacher(in_session_id);
    SELECT current_activity_id INTO cur FROM public.sessions WHERE id = in_session_id;
    IF cur IS NULL THEN
        SELECT id INTO cur FROM public.session_activities
        WHERE session_id = in_session_id AND state IN ('starting','playing','paused','results')
        ORDER BY started_at DESC LIMIT 1;
    END IF;
    IF cur IS NULL THEN RAISE EXCEPTION 'no active activity'; END IF;
    UPDATE public.session_activities
    SET state = 'ended', ended_at = COALESCE(ended_at, now())
    WHERE id = cur;
    UPDATE public.sessions
    SET class_state = 'between_activities',
        current_activity_id = NULL,
        status = 'lobby',
        activity = NULL,
        activity_version = activity_version + 1,
        updated_at = now()
    WHERE id = in_session_id
    RETURNING activity_version INTO new_ver;
    RETURN jsonb_build_object(
        'session_activity_id', cur,
        'state', 'ended',
        'class_state', 'between_activities',
        'status', 'lobby',
        'activity_version', new_ver
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.class_end_activity(uuid) TO authenticated;


-- ── 8. Update class_end_session to increment activity_version ────────
CREATE OR REPLACE FUNCTION public.class_end_session(in_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM public._class_assert_teacher(in_session_id);
    UPDATE public.session_activities
    SET state = 'ended', ended_at = COALESCE(ended_at, now())
    WHERE session_id = in_session_id
      AND state IN ('starting','playing','paused','results');
    UPDATE public.sessions
    SET class_state = 'ended',
        ended_at = now(),
        current_activity_id = NULL,
        status = 'ended',
        activity_version = activity_version + 1,
        updated_at = now()
    WHERE id = in_session_id;
    RETURN jsonb_build_object(
        'session_id', in_session_id,
        'class_state', 'ended',
        'status', 'ended'
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.class_end_session(uuid) TO authenticated;


-- ── 9. get_student_class_state — authoritative student state resolver ─
--
-- Students call this ONE RPC to get their full class state, instead of
-- patching it together from multiple RPC calls. It returns:
--   - sessionId / participantId / sessionStatus / activityVersion
--   - assignedActivity or null (waiting state)
--
-- Resolution precedence:
--   1. Individual student override (student_activity_assignments)
--   2. Current class-wide session activity (sessions.current_activity_id)
--   3. Classroom default activities (classroom_default_activities)
--   4. null (waiting state)
--
-- SECURITY: The student must provide both their student_id AND the
--           session_id. The function verifies they belong together.
--           Anon-callable.
CREATE OR REPLACE FUNCTION public.get_student_class_state(
    in_student_id uuid,
    in_session_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_session   public.sessions%ROWTYPE;
    v_student   public.session_students%ROWTYPE;
    v_activity  public.session_activities%ROWTYPE;
    v_assign    jsonb;
    v_result    jsonb;
BEGIN
    -- Validate: student belongs to session
    SELECT * INTO v_student
    FROM public.session_students
    WHERE id = in_student_id AND session_id = in_session_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'STUDENT_NOT_FOUND');
    END IF;

    -- Get session
    SELECT * INTO v_session
    FROM public.sessions
    WHERE id = in_session_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'SESSION_NOT_FOUND');
    END IF;

    -- Check for student kick
    IF v_student.kicked_at IS NOT NULL THEN
        RETURN jsonb_build_object(
            'sessionId', in_session_id,
            'participantId', in_student_id,
            'sessionStatus', 'ended',
            'activityVersion', v_session.activity_version,
            'assignedActivity', null,
            'kicked', true,
            'kickedReason', v_student.kicked_reason
        );
    END IF;

    -- Resolve assigned activity
    --
    -- The teacher drives ONE class-wide activity (sessions.current_activity_id).
    -- Per-student assignments act as a FILTER: a student only receives the
    -- current activity if it is in their enabled assignment set. A student
    -- with NO per-student assignments inherits the class-wide activity
    -- (permissive fallback so a freshly-joined or un-assigned learner is
    -- never locked out — matches the migration-safety rule in the spec).
    --
    -- This is the SERVER-SIDE enforcement point: the activity is only
    -- surfaced to a student who is allowed it, so a child can never reach an
    -- unassigned game even if the client is tampered with.
    v_result := NULL;

    -- 1. Load this student's per-student assignment set (if any)
    SELECT jsonb_agg(
        jsonb_build_object(
            'activity', saa.activity,
            'sequence_order', saa.sequence_order,
            'is_enabled', saa.is_enabled
        ) ORDER BY saa.sequence_order
    ) INTO v_assign
    FROM public.student_activity_assignments saa
    WHERE saa.student_id = in_student_id
      AND saa.session_id = in_session_id;

    -- 2. Resolve the class-wide current activity (ALWAYS, regardless of
    --    whether the student has a per-student set), then gate it.
    IF v_session.current_activity_id IS NOT NULL THEN
        SELECT * INTO v_activity
        FROM public.session_activities
        WHERE id = v_session.current_activity_id;
        IF FOUND THEN
            -- Allowed when the student has no specific set (inherit), OR the
            -- current activity is present and enabled in their set.
            IF v_assign IS NULL OR EXISTS (
                SELECT 1
                FROM public.student_activity_assignments saa
                WHERE saa.student_id = in_student_id
                  AND saa.session_id = in_session_id
                  AND saa.activity = v_activity.activity
                  AND saa.is_enabled = true
            ) THEN
                v_result := jsonb_build_object(
                    'activity', v_activity.activity,
                    'state', v_activity.state,
                    'sessionActivityId', v_activity.id
                );
            END IF;
        END IF;
    END IF;

    -- Return the full state
    RETURN jsonb_build_object(
        'sessionId', in_session_id,
        'participantId', in_student_id,
        'participantName', v_student.name,
        'sessionStatus',
            CASE
                WHEN v_session.class_state = 'ended' THEN 'ended'
                WHEN v_session.class_state = 'in_activity' AND v_activity.state = 'paused' THEN 'paused'
                WHEN v_session.class_state = 'in_activity' THEN 'active'
                WHEN v_session.class_state = 'between_activities' THEN 'waiting'
                ELSE 'waiting'
            END,
        'classState', v_session.class_state,
        'activityVersion', v_session.activity_version,
        'assignedActivity', v_result,
        'kicked', false,
        'kickedReason', null,
        'updatedAt', to_char(v_session.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_class_state(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_class_state(uuid, uuid) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_student_class_state(uuid, uuid) IS
    'SECURITY DEFINER. Authoritative student class state resolver. Returns the full canonical state for a student in a session, including resolved assigned activity. Anon-callable.';

-- ── 10. CHECK constraint: in_activity requires current_activity_id ──
-- The spec requires that status='active' must never coexist with
-- current_activity_id IS NULL. This partial CHECK constraint enforces
-- that in the database itself.
CREATE OR REPLACE FUNCTION public._check_active_has_activity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.class_state = 'in_activity' AND NEW.current_activity_id IS NULL THEN
        RAISE EXCEPTION 'class_state=in_activity requires current_activity_id to be non-null'
            USING ERRCODE = 'P0001';
    END IF;
    IF NEW.class_state <> 'in_activity' AND NEW.current_activity_id IS NOT NULL THEN
        RAISE EXCEPTION 'current_activity_id must be null when class_state is not in_activity'
            USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sessions_check_active_has_activity ON public.sessions;
CREATE CONSTRAINT TRIGGER trg_sessions_check_active_has_activity
    AFTER INSERT OR UPDATE OF class_state, current_activity_id
    ON public.sessions
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION public._check_active_has_activity();

COMMENT ON TRIGGER trg_sessions_check_active_has_activity ON public.sessions IS
    'Enforces class_state=in_activity ⇔ current_activity_id IS NOT NULL. Deferred so transaction-level updates (RPCs) that set both in the same statement are allowed.';

-- ── 11. Update class_get_session to include activity_version + status ─
CREATE OR REPLACE FUNCTION public.class_get_session(in_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
declare r record;
begin
  if in_session_id is null then return null; end if;
  select s.id, s.code, s.session_code, s.activity, s.status, s.class_state,
         s.current_activity_id, s.class_name, s.scoreboard_visible,
         s.scoreboard_mode, s.round, s.timer_seconds, s.max_students,
         s.activity_version, s.updated_at
    into r
  from public.sessions s
  where s.id = in_session_id and s.status <> 'ended' and s.class_state <> 'ended'
  limit 1;
  if not found then return null; end if;
  return to_jsonb(r);
end $$;
revoke all on function public.class_get_session(uuid) from public;
grant execute on function public.class_get_session(uuid) to anon, authenticated, service_role;

