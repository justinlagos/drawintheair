-- ═══════════════════════════════════════════════════════════════════
-- LIOS Sprint 4 — Human Observation Layer
-- ═══════════════════════════════════════════════════════════════════
--
-- Document B §9. The qualitative companion to the telemetry stack:
-- teachers tag classroom sessions with what they observed (focus,
-- affect, independence, social, notable behaviour). Tags train the
-- Trust v1 → v2 classifier, calibrate friction detection, and ground
-- adaptive engine validation against teacher intuition.
--
-- Design constraints:
--   • Sub-30-second teacher UX (tag distribution must be SHORT).
--   • Pseudonymous learner — never names, only learner_uid (device_id).
--   • Joins cleanly to session_id, device_id, classroom code.
--   • RLS allows authenticated INSERT (teacher console) and SELECT
--     (admin dashboards). No anon write surface.

CREATE TABLE IF NOT EXISTS public.human_observation_fact (
    id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    recorded_at     timestamptz   NOT NULL DEFAULT now(),
    recorded_by     text,                       -- teacher's email or pseudonymous id
    observer_role   text          NOT NULL DEFAULT 'teacher',  -- teacher | parent | researcher
    device_id       text          NOT NULL,     -- pseudonymous learner (joins to skill_state etc.)
    session_id      uuid,                       -- nullable: end-of-session tags
    classroom_code  text,                       -- joins to ?join= flow when present
    age_band        text,

    -- ── Tags (small enum sets, multi-select allowed) ────────────
    -- Each is a TEXT[] so a child can be tagged 'focused' AND
    -- 'collaborated' in one row. CHECK constraints validate values.
    focus_tags         text[]   NOT NULL DEFAULT '{}',
    affect_tags        text[]   NOT NULL DEFAULT '{}',
    independence_tags  text[]   NOT NULL DEFAULT '{}',
    social_tags        text[]   NOT NULL DEFAULT '{}',
    notable_tags       text[]   NOT NULL DEFAULT '{}',

    -- 20-char free-text "anything else?" — kept short by design.
    note            text,

    -- Source of truth for the dashboard's correlation analyses
    meta            jsonb         NOT NULL DEFAULT '{}'::jsonb,

    CONSTRAINT human_observation_observer_role_check
        CHECK (observer_role IN ('teacher', 'parent', 'researcher')),
    CONSTRAINT human_observation_focus_check
        CHECK (focus_tags <@ ARRAY['focused', 'distracted', 'disengaged']::text[]),
    CONSTRAINT human_observation_affect_check
        CHECK (affect_tags <@ ARRAY['confident', 'calm', 'hesitant', 'frustrated']::text[]),
    CONSTRAINT human_observation_independence_check
        CHECK (independence_tags <@ ARRAY['independent', 'supported', 'required_intervention']::text[]),
    CONSTRAINT human_observation_social_check
        CHECK (social_tags <@ ARRAY['alone', 'collaborated', 'disrupted_by_peer']::text[]),
    CONSTRAINT human_observation_notable_check
        CHECK (notable_tags <@ ARRAY['new_behaviour_good', 'new_behaviour_concern', 'help_needed', 'breakthrough', 'avoided_activity']::text[]),
    CONSTRAINT human_observation_note_length
        CHECK (note IS NULL OR char_length(note) <= 200)
);

CREATE INDEX IF NOT EXISTS human_observation_recorded_idx
    ON public.human_observation_fact (recorded_at DESC);
CREATE INDEX IF NOT EXISTS human_observation_device_idx
    ON public.human_observation_fact (device_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS human_observation_session_idx
    ON public.human_observation_fact (session_id, recorded_at DESC)
    WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS human_observation_classroom_idx
    ON public.human_observation_fact (classroom_code, recorded_at DESC)
    WHERE classroom_code IS NOT NULL;

ALTER TABLE public.human_observation_fact ENABLE ROW LEVEL SECURITY;

-- Authenticated users can INSERT (the teacher tagging UI) and SELECT
-- (the admin dashboards). UPDATE / DELETE are blocked → tags are
-- immutable once recorded (audit invariant). A teacher can re-tag a
-- learner by writing a new row; the dashboard takes the most recent.
DROP POLICY IF EXISTS "Authenticated insert observations" ON public.human_observation_fact;
CREATE POLICY "Authenticated insert observations"
    ON public.human_observation_fact FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated select observations" ON public.human_observation_fact;
CREATE POLICY "Authenticated select observations"
    ON public.human_observation_fact FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE public.human_observation_fact IS
    'LIOS Human Observation Layer (Document B §9). Teacher / parent / researcher tags joined to pseudonymous learner sessions. Immutable — a re-tag writes a new row.';

-- ── Recording RPC — the teacher console calls this ────────────────

CREATE OR REPLACE FUNCTION public.lios_record_observation(
    p_device_id        text,
    p_focus_tags        text[] DEFAULT '{}',
    p_affect_tags       text[] DEFAULT '{}',
    p_independence_tags text[] DEFAULT '{}',
    p_social_tags       text[] DEFAULT '{}',
    p_notable_tags      text[] DEFAULT '{}',
    p_session_id        uuid   DEFAULT NULL,
    p_classroom_code    text   DEFAULT NULL,
    p_age_band          text   DEFAULT NULL,
    p_note              text   DEFAULT NULL,
    p_observer_role     text   DEFAULT 'teacher'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
    v_id        uuid;
    v_recorder  text;
BEGIN
    -- Authenticated caller; we capture their email if available.
    v_recorder := COALESCE(
        nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'email',
        nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub',
        NULL
    );

    INSERT INTO human_observation_fact (
        device_id, session_id, classroom_code, age_band,
        focus_tags, affect_tags, independence_tags, social_tags, notable_tags,
        note, observer_role, recorded_by
    ) VALUES (
        p_device_id, p_session_id, p_classroom_code, p_age_band,
        COALESCE(p_focus_tags, '{}'),
        COALESCE(p_affect_tags, '{}'),
        COALESCE(p_independence_tags, '{}'),
        COALESCE(p_social_tags, '{}'),
        COALESCE(p_notable_tags, '{}'),
        p_note, p_observer_role, v_recorder
    ) RETURNING id INTO v_id;

    RETURN jsonb_build_object('id', v_id, 'recorded_at', now(), 'recorded_by', v_recorder);
END;
$fn$;

REVOKE ALL ON FUNCTION public.lios_record_observation(text, text[], text[], text[], text[], text[], uuid, text, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.lios_record_observation(text, text[], text[], text[], text[], text[], uuid, text, text, text, text) TO authenticated;

-- ── Engineering / admin RPC for the Observations tab ──────────────

CREATE OR REPLACE FUNCTION public.dashboard_observations(
    in_days int DEFAULT 30
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $fn$
    WITH win AS (
        SELECT * FROM human_observation_fact
        WHERE recorded_at > now() - (in_days || ' days')::interval
    ),
    tag_counts AS (
        SELECT 'focus' AS family, unnest(focus_tags) AS tag, count(*)::int AS n FROM win GROUP BY 2
        UNION ALL
        SELECT 'affect', unnest(affect_tags), count(*)::int FROM win GROUP BY 2
        UNION ALL
        SELECT 'independence', unnest(independence_tags), count(*)::int FROM win GROUP BY 2
        UNION ALL
        SELECT 'social', unnest(social_tags), count(*)::int FROM win GROUP BY 2
        UNION ALL
        SELECT 'notable', unnest(notable_tags), count(*)::int FROM win GROUP BY 2
    ),
    by_classroom AS (
        SELECT classroom_code,
               count(*)::int AS n_observations,
               count(DISTINCT device_id)::int AS n_learners
        FROM win WHERE classroom_code IS NOT NULL
        GROUP BY classroom_code
        ORDER BY n_observations DESC LIMIT 25
    ),
    -- Engagement-vs-mastery scatter (Document B §7.2): for each
    -- observed learner, what's their attempt count + Mastered count?
    -- This is the chart that turns the qualitative + quantitative
    -- correlation into a teacher-readable picture.
    eng_vs_mast AS (
        SELECT
            w.device_id,
            (array_agg(w.focus_tags))[1]   AS focus,
            (array_agg(w.affect_tags))[1]  AS affect,
            (SELECT count(*) FROM learning_attempts a
             WHERE a.device_id = w.device_id) AS n_attempts,
            (SELECT count(*) FROM (
                SELECT DISTINCT ON (item_key, game_mode) to_state
                FROM mastery_episode_fact
                WHERE device_id = w.device_id
                ORDER BY item_key, game_mode, transition_at DESC
             ) latest WHERE latest.to_state = 'Mastered')::int AS n_mastered
        FROM win w
        GROUP BY w.device_id
        LIMIT 100
    ),
    recent AS (
        SELECT id, recorded_at, recorded_by, observer_role,
               device_id, session_id, classroom_code, age_band,
               focus_tags, affect_tags, independence_tags,
               social_tags, notable_tags, note
        FROM win
        ORDER BY recorded_at DESC LIMIT 30
    )
    SELECT jsonb_build_object(
        'days', in_days, 'as_of', now(),
        'total', (SELECT count(*) FROM win),
        'distinct_learners_observed', (SELECT count(DISTINCT device_id) FROM win),
        'distinct_classrooms', (SELECT count(DISTINCT classroom_code) FROM win WHERE classroom_code IS NOT NULL),
        'by_tag', COALESCE((SELECT jsonb_agg(row_to_json(t) ORDER BY family, n DESC) FROM tag_counts t), '[]'::jsonb),
        'by_classroom', COALESCE((SELECT jsonb_agg(row_to_json(b)) FROM by_classroom b), '[]'::jsonb),
        'engagement_vs_mastery', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM eng_vs_mast e), '[]'::jsonb),
        'recent', COALESCE((SELECT jsonb_agg(row_to_json(r) ORDER BY recorded_at DESC) FROM recent r), '[]'::jsonb)
    );
$fn$;

REVOKE ALL ON FUNCTION public.dashboard_observations(int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_observations(int) TO authenticated;
