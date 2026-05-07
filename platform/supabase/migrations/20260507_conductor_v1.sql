-- ════════════════════════════════════════════════════════════════════
-- Conductor v1 — class-mode redesign foundation
-- ════════════════════════════════════════════════════════════════════
--
-- One join code = one whole class. The teacher orchestrates multiple
-- activities inside that class. Students lock in for the duration.
--
-- Already applied to production via apply_migration. This file is
-- captured for git history and fresh-project rebuilds.
--
-- See src/pages/classmode/TeacherClassConsole.tsx and
--     src/pages/classmode/StudentClassClient.tsx for the consumers.

-- ── 1. session_activities ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.session_activities (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      uuid        NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    activity        text        NOT NULL,
    state           text        NOT NULL DEFAULT 'starting'
                                  CHECK (state IN ('starting','playing','paused','results','ended')),
    ordinal         int         NOT NULL,
    started_at      timestamptz NOT NULL DEFAULT now(),
    ended_at        timestamptz,
    metadata        jsonb       DEFAULT '{}'::jsonb,
    UNIQUE (session_id, ordinal)
);

CREATE INDEX IF NOT EXISTS session_activities_session_idx
    ON public.session_activities (session_id, started_at DESC);

ALTER TABLE public.session_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read session activities by session" ON public.session_activities;
CREATE POLICY "Read session activities by session"
    ON public.session_activities
    FOR SELECT
    TO public
    USING (true);

-- ── 2. sessions.class_state + current_activity_id ─────────────────
ALTER TABLE public.sessions
    ADD COLUMN IF NOT EXISTS class_state text NOT NULL DEFAULT 'lobby'
        CHECK (class_state IN ('lobby','in_activity','between_activities','ended')),
    ADD COLUMN IF NOT EXISTS current_activity_id uuid REFERENCES public.session_activities(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS class_name text,
    ADD COLUMN IF NOT EXISTS scoreboard_visible boolean NOT NULL DEFAULT false;

-- ── 3. session_students kick + avatar fields ──────────────────────
ALTER TABLE public.session_students
    ADD COLUMN IF NOT EXISTS kicked_at timestamptz,
    ADD COLUMN IF NOT EXISTS kicked_reason text,
    ADD COLUMN IF NOT EXISTS avatar_seed text;

CREATE INDEX IF NOT EXISTS session_students_active_idx
    ON public.session_students (session_id)
    WHERE kicked_at IS NULL;

-- ── 4. round_scores → session_activities FK ──────────────────────
ALTER TABLE public.round_scores
    ADD COLUMN IF NOT EXISTS session_activity_id uuid REFERENCES public.session_activities(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS round_scores_activity_idx
    ON public.round_scores (session_activity_id);

-- ════════════════════════════════════════════════════════════════════
-- RPCs — teacher controls the flow
-- ════════════════════════════════════════════════════════════════════

-- Helper: assert caller owns this session.
CREATE OR REPLACE FUNCTION public._class_assert_teacher(in_session_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE owner uuid;
BEGIN
    SELECT teacher_id INTO owner FROM public.sessions WHERE id = in_session_id;
    IF owner IS NULL THEN RAISE EXCEPTION 'session not found' USING ERRCODE = 'P0002'; END IF;
    IF auth.uid() IS NULL OR auth.uid() <> owner THEN
        RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
    END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.class_start_activity(uuid, text);
CREATE FUNCTION public.class_start_activity(in_session_id uuid, in_activity text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE new_id uuid; next_ord int;
BEGIN
    PERFORM public._class_assert_teacher(in_session_id);
    UPDATE public.session_activities
    SET state = 'ended', ended_at = COALESCE(ended_at, now())
    WHERE session_id = in_session_id AND state IN ('starting','playing','paused','results');

    SELECT COALESCE(max(ordinal), 0) + 1 INTO next_ord
      FROM public.session_activities WHERE session_id = in_session_id;

    INSERT INTO public.session_activities (session_id, activity, state, ordinal)
    VALUES (in_session_id, in_activity, 'playing', next_ord)
    RETURNING id INTO new_id;

    UPDATE public.sessions
    SET class_state = 'in_activity', current_activity_id = new_id, activity = in_activity,
        started_at = COALESCE(started_at, now()), updated_at = now()
    WHERE id = in_session_id;

    RETURN jsonb_build_object('session_id', in_session_id, 'activity', in_activity,
        'session_activity_id', new_id, 'ordinal', next_ord, 'state', 'playing');
END;
$$;
GRANT EXECUTE ON FUNCTION public.class_start_activity(uuid, text) TO authenticated;

DROP FUNCTION IF EXISTS public.class_pause_activity(uuid);
CREATE FUNCTION public.class_pause_activity(in_session_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE cur uuid;
BEGIN
    PERFORM public._class_assert_teacher(in_session_id);
    SELECT current_activity_id INTO cur FROM public.sessions WHERE id = in_session_id;
    IF cur IS NULL THEN RAISE EXCEPTION 'no active activity'; END IF;
    UPDATE public.session_activities SET state = 'paused' WHERE id = cur AND state = 'playing';
    UPDATE public.sessions SET updated_at = now() WHERE id = in_session_id;
    RETURN jsonb_build_object('session_activity_id', cur, 'state', 'paused');
END;
$$;
GRANT EXECUTE ON FUNCTION public.class_pause_activity(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.class_resume_activity(uuid);
CREATE FUNCTION public.class_resume_activity(in_session_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE cur uuid;
BEGIN
    PERFORM public._class_assert_teacher(in_session_id);
    SELECT current_activity_id INTO cur FROM public.sessions WHERE id = in_session_id;
    IF cur IS NULL THEN RAISE EXCEPTION 'no active activity'; END IF;
    UPDATE public.session_activities SET state = 'playing' WHERE id = cur AND state = 'paused';
    UPDATE public.sessions SET updated_at = now() WHERE id = in_session_id;
    RETURN jsonb_build_object('session_activity_id', cur, 'state', 'playing');
END;
$$;
GRANT EXECUTE ON FUNCTION public.class_resume_activity(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.class_end_activity(uuid);
CREATE FUNCTION public.class_end_activity(in_session_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE cur uuid;
BEGIN
    PERFORM public._class_assert_teacher(in_session_id);
    SELECT current_activity_id INTO cur FROM public.sessions WHERE id = in_session_id;
    IF cur IS NULL THEN RAISE EXCEPTION 'no active activity'; END IF;
    UPDATE public.session_activities SET state = 'ended', ended_at = COALESCE(ended_at, now()) WHERE id = cur;
    UPDATE public.sessions SET class_state = 'between_activities', current_activity_id = NULL, updated_at = now() WHERE id = in_session_id;
    RETURN jsonb_build_object('session_activity_id', cur, 'state', 'ended', 'class_state', 'between_activities');
END;
$$;
GRANT EXECUTE ON FUNCTION public.class_end_activity(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.class_kick_student(uuid, uuid, text);
CREATE FUNCTION public.class_kick_student(in_session_id uuid, in_student_id uuid, in_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE name_at_kick text;
BEGIN
    PERFORM public._class_assert_teacher(in_session_id);
    UPDATE public.session_students
    SET kicked_at = now(), kicked_reason = in_reason, is_active = false, is_connected = false,
        left_at = COALESCE(left_at, now())
    WHERE id = in_student_id AND session_id = in_session_id RETURNING name INTO name_at_kick;
    IF name_at_kick IS NULL THEN RAISE EXCEPTION 'student not found in session'; END IF;
    RETURN jsonb_build_object('student_id', in_student_id, 'name', name_at_kick, 'kicked_at', now());
END;
$$;
GRANT EXECUTE ON FUNCTION public.class_kick_student(uuid, uuid, text) TO authenticated;

DROP FUNCTION IF EXISTS public.class_end_session(uuid);
CREATE FUNCTION public.class_end_session(in_session_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    PERFORM public._class_assert_teacher(in_session_id);
    UPDATE public.session_activities SET state = 'ended', ended_at = COALESCE(ended_at, now())
    WHERE session_id = in_session_id AND state IN ('starting','playing','paused','results');
    UPDATE public.sessions SET class_state = 'ended', ended_at = now(), current_activity_id = NULL, updated_at = now(), status = 'ended'
    WHERE id = in_session_id;
    RETURN jsonb_build_object('session_id', in_session_id, 'class_state', 'ended');
END;
$$;
GRANT EXECUTE ON FUNCTION public.class_end_session(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.class_student_stats(uuid, uuid);
CREATE FUNCTION public.class_student_stats(in_session_id uuid, in_student_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    PERFORM public._class_assert_teacher(in_session_id);
    RETURN (
        SELECT jsonb_build_object(
            'student_id', s.id, 'name', s.name, 'avatar_seed', s.avatar_seed,
            'joined_at', s.joined_at,
            'is_active', s.is_active AND s.kicked_at IS NULL,
            'kicked_at', s.kicked_at, 'kicked_reason', s.kicked_reason,
            'activities', COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'session_activity_id', sa.id, 'activity', sa.activity, 'ordinal', sa.ordinal,
                    'state', sa.state, 'started_at', sa.started_at, 'ended_at', sa.ended_at,
                    'rounds', (SELECT jsonb_agg(jsonb_build_object(
                        'round', r.round, 'stars', r.stars, 'raw_score', r.raw_score,
                        'duration_seconds', r.duration_seconds, 'completed', r.completed,
                        'submitted_at', r.submitted_at) ORDER BY r.round)
                        FROM public.round_scores r WHERE r.session_activity_id = sa.id AND r.student_id = in_student_id)
                ) ORDER BY sa.ordinal) FROM public.session_activities sa WHERE sa.session_id = in_session_id
            ), '[]'::jsonb),
            'totals', (SELECT jsonb_build_object(
                'rounds', count(*)::int, 'stars', COALESCE(sum(stars), 0)::int,
                'time_on_task_s', COALESCE(sum(duration_seconds), 0)::int)
                FROM public.round_scores WHERE session_id = in_session_id AND student_id = in_student_id)
        ) FROM public.session_students s WHERE s.id = in_student_id AND s.session_id = in_session_id
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.class_student_stats(uuid, uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.class_summary(uuid);
CREATE FUNCTION public.class_summary(in_session_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    PERFORM public._class_assert_teacher(in_session_id);
    RETURN (
        SELECT jsonb_build_object(
            'session', jsonb_build_object('id', s.id, 'class_name', s.class_name, 'code', s.code,
                'started_at', s.started_at, 'ended_at', s.ended_at,
                'duration_minutes', CASE WHEN s.started_at IS NULL OR s.ended_at IS NULL THEN NULL
                    ELSE round(extract(epoch from (s.ended_at - s.started_at)) / 60.0)::int END),
            'students', (SELECT jsonb_agg(jsonb_build_object(
                'student_id', ss.id, 'name', ss.name, 'avatar_seed', ss.avatar_seed,
                'kicked', ss.kicked_at IS NOT NULL,
                'rounds', (SELECT count(*)::int FROM public.round_scores r WHERE r.student_id = ss.id AND r.session_id = s.id),
                'stars', (SELECT COALESCE(sum(stars), 0)::int FROM public.round_scores r WHERE r.student_id = ss.id AND r.session_id = s.id),
                'time_on_task_s', (SELECT COALESCE(sum(duration_seconds), 0)::int FROM public.round_scores r WHERE r.student_id = ss.id AND r.session_id = s.id)
            ) ORDER BY ss.name) FROM public.session_students ss WHERE ss.session_id = s.id),
            'activities', (SELECT jsonb_agg(jsonb_build_object(
                'activity', sa.activity, 'ordinal', sa.ordinal,
                'started_at', sa.started_at, 'ended_at', sa.ended_at,
                'duration_seconds', CASE WHEN sa.ended_at IS NULL THEN NULL
                    ELSE extract(epoch from (sa.ended_at - sa.started_at))::int END,
                'rounds_count', (SELECT count(*)::int FROM public.round_scores r WHERE r.session_activity_id = sa.id),
                'avg_stars', (SELECT round(avg(stars)::numeric, 1) FROM public.round_scores r WHERE r.session_activity_id = sa.id)
            ) ORDER BY sa.ordinal) FROM public.session_activities sa WHERE sa.session_id = s.id),
            'totals', (SELECT jsonb_build_object(
                'rounds_completed', count(*)::int, 'total_stars', COALESCE(sum(stars), 0)::int,
                'avg_stars', round(avg(stars)::numeric, 1),
                'students_active', (SELECT count(*) FROM public.session_students WHERE session_id = s.id AND kicked_at IS NULL),
                'students_total', (SELECT count(*) FROM public.session_students WHERE session_id = s.id)
            ) FROM public.round_scores WHERE session_id = s.id)
        ) FROM public.sessions s WHERE s.id = in_session_id
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.class_summary(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.class_set_scoreboard_visibility(uuid, boolean);
CREATE FUNCTION public.class_set_scoreboard_visibility(in_session_id uuid, in_visible boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    PERFORM public._class_assert_teacher(in_session_id);
    UPDATE public.sessions SET scoreboard_visible = in_visible, updated_at = now() WHERE id = in_session_id;
    RETURN jsonb_build_object('scoreboard_visible', in_visible);
END;
$$;
GRANT EXECUTE ON FUNCTION public.class_set_scoreboard_visibility(uuid, boolean) TO authenticated;
