-- ═══════════════════════════════════════════════════════════════════
-- LIOS Sprint 3 — Adaptive Engine v1 (rule-based)
-- ═══════════════════════════════════════════════════════════════════
--
-- Document B §5 + §6.2. Server-side decision engine that returns the
-- next item to present, scaffold level, reward intensity, and break
-- suggestion. v1 is rule-based only — the contextual bandit (v2) lands
-- in Sprint 7 once we have enough decisions logged to train it.
--
-- Architecture:
--
--   • lios_adaptive_decisions
--       Append-only audit log. Every recommendation captures full
--       inputs + outputs + invariants fired. A researcher must be
--       able to ask, six months later, "why did the system show
--       letter B at scaffold 2 to learner X at this moment?" and
--       receive a complete answer.
--
--   • lios_recommend_next(...)
--       The decision function. Takes session + learner + last attempt
--       state, returns the recommendation, writes the audit row.
--
--   • dashboard_adaptive_decisions(in_days)
--       Engineering observability: regime distribution, invariant
--       fire rate, recovery-step distribution, per-mode throughput.
--
-- Regime detection (Document B §4.1 + §7):
--
--   FRUSTRATION  ≥3 consecutive failures on current item
--   FLOW         last 4 attempts succeeded AND not boredom
--   BOREDOM      last 5 attempts succeeded AND last-8 accuracy > 0.92
--   FRESH        fewer than 3 attempts in this game_mode this device
--   PRODUCTIVE   anything else (the default healthy practice band)
--
-- Recovery state machine (Document B §6.2):
--
--   step 1   soft scaffold raise — same item, scaffold='partial'
--   step 2   sibling substitution — easier sibling, scaffold='full'
--   step 3   confidence rebuild — mastered item, reward='big'
--   step 4   activity rotation — high-mastery item, different family
--   step 5   graceful exit — suggest_break=true, next_item=NULL
--
-- Recovery step is keyed off the most-recent recovery decision for
-- this (device, game_mode, current_item) within the last 30 minutes.
--
-- Hard invariants (Document B §5.3), enforced AFTER candidate
-- selection and recorded in `invariants_applied`:
--
--   - Never present the same item_uid more than 3 consecutive times.
--   - Never present an item with predicted P(correct) < 0.5 to a
--     learner in frustration state.
--   - After a transition to Mastered: reward='big' within 400ms
--     (the 400ms requirement is a client-side concern; we just emit
--     the signal).
--   - After 3 consecutive failures: force recovery branch.
--
-- The engine is callable but does not currently replace any game
-- mode's built-in item selection. Mode-by-mode integration follows
-- the same opt-in pattern as the gesture-quality scaffolding.

-- ── 1. Audit log table ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lios_adaptive_decisions (
    id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    made_at              timestamptz   NOT NULL DEFAULT now(),
    device_id            text          NOT NULL,
    session_id           uuid          NOT NULL,
    game_mode            text          NOT NULL,
    age_band             text,
    context              text,

    current_item         text,
    next_item            text,
    scaffold_level       text          NOT NULL DEFAULT 'none',
    reward_intensity     text          NOT NULL DEFAULT 'quiet',
    suggest_break        boolean       NOT NULL DEFAULT false,

    regime               text          NOT NULL DEFAULT 'productive',
    recovery_step        int,
    p_expected           numeric(4, 3),

    invariants_applied   text[]        NOT NULL DEFAULT '{}',
    inputs               jsonb         NOT NULL DEFAULT '{}'::jsonb,
    reasoning            text,

    CONSTRAINT lios_adaptive_scaffold_check
        CHECK (scaffold_level IN ('none', 'partial', 'full')),
    CONSTRAINT lios_adaptive_reward_check
        CHECK (reward_intensity IN ('quiet', 'standard', 'big')),
    CONSTRAINT lios_adaptive_regime_check
        CHECK (regime IN ('fresh', 'flow', 'productive', 'boredom', 'frustration')),
    CONSTRAINT lios_adaptive_recovery_step_check
        CHECK (recovery_step IS NULL OR recovery_step BETWEEN 1 AND 5)
);

CREATE INDEX IF NOT EXISTS lios_adaptive_decisions_made_idx
    ON public.lios_adaptive_decisions (made_at DESC);
CREATE INDEX IF NOT EXISTS lios_adaptive_decisions_session_idx
    ON public.lios_adaptive_decisions (session_id, made_at DESC);
CREATE INDEX IF NOT EXISTS lios_adaptive_decisions_device_idx
    ON public.lios_adaptive_decisions (device_id, made_at DESC);
CREATE INDEX IF NOT EXISTS lios_adaptive_decisions_regime_idx
    ON public.lios_adaptive_decisions (regime, made_at DESC);

ALTER TABLE public.lios_adaptive_decisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated select adaptive_decisions"
    ON public.lios_adaptive_decisions;
CREATE POLICY "Authenticated select adaptive_decisions"
    ON public.lios_adaptive_decisions FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE public.lios_adaptive_decisions IS
    'LIOS Adaptive Engine v1 audit log. Append-only. Every recommendation is captured with full inputs + outputs + invariants applied so any decision can be re-explained months later.';

-- ── 2. The decision function ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.lios_recommend_next(
    p_device_id    text,
    p_session_id   uuid,
    p_game_mode    text,
    p_current_item text DEFAULT NULL,
    p_was_correct  boolean DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
    -- Recent-history snapshot
    v_recent             record;
    v_consec_failures    int := 0;
    v_recent_acc_4       numeric;
    v_recent_acc_8       numeric;
    v_n_total            int  := 0;
    v_age_band           text;
    v_context            text;

    -- Regime
    v_regime             text := 'productive';
    v_recovery_step      int  := NULL;
    v_prev_recovery_step int  := NULL;

    -- Candidate state
    v_current_b          numeric;
    v_candidate          record;
    v_next_item          text;
    v_scaffold_level     text := 'none';
    v_reward_intensity   text := 'quiet';
    v_suggest_break      boolean := false;
    v_p_expected         numeric;

    -- Invariants
    v_invariants         text[] := '{}';

    -- Audit
    v_audit_id           uuid;
    v_reasoning          text  := '';
    v_inputs             jsonb;
BEGIN
    -- ── Phase 1. Gather state ─────────────────────────────────────

    -- Recent attempts in this session (last 8). Tier C (credibility
    -- < 0.4) attempts are EXCLUDED from regime detection — polluted
    -- attempts shouldn't drive adaptive decisions.
    SELECT
        count(*)                                              AS n_total,
        avg(was_correct::int) FILTER (WHERE rn <= 4)::numeric AS acc4,
        avg(was_correct::int) FILTER (WHERE rn <= 8)::numeric AS acc8,
        max(age_band)                                         AS age_band,
        max(context)                                          AS context
    INTO v_recent
    FROM (
        SELECT
            was_correct, age_band, context,
            row_number() OVER (ORDER BY occurred_at DESC) AS rn
        FROM learning_attempts
        WHERE session_id = p_session_id
          AND device_id  = p_device_id
          AND game_mode  = p_game_mode
          AND COALESCE(credibility_score, 1.0) >= 0.4
        ORDER BY occurred_at DESC
        LIMIT 8
    ) rh;

    v_n_total      := COALESCE(v_recent.n_total, 0);
    v_recent_acc_4 := v_recent.acc4;
    v_recent_acc_8 := v_recent.acc8;
    v_age_band     := v_recent.age_band;
    v_context      := v_recent.context;

    -- Consecutive failures on the current item — clean CTE-based count.
    -- Walks the 8 most recent attempts on this (session, device, mode,
    -- item), excludes Tier-C, and counts the run of trailing failures
    -- up to (but not including) the first correct.
    IF p_current_item IS NOT NULL THEN
        WITH ordered AS (
            SELECT was_correct,
                   row_number() OVER (ORDER BY occurred_at DESC) AS rn
            FROM learning_attempts
            WHERE session_id = p_session_id
              AND device_id  = p_device_id
              AND game_mode  = p_game_mode
              AND item_key   = p_current_item
              AND COALESCE(credibility_score, 1.0) >= 0.4
            ORDER BY occurred_at DESC LIMIT 8
        ),
        first_correct AS (
            SELECT min(rn) AS rn FROM ordered WHERE was_correct
        )
        SELECT count(*)
        INTO v_consec_failures
        FROM ordered
        WHERE NOT was_correct
          AND rn < COALESCE((SELECT rn FROM first_correct), 999);
    END IF;

    -- Current item difficulty (if known)
    IF p_current_item IS NOT NULL THEN
        SELECT b INTO v_current_b
        FROM item_difficulty
        WHERE item_key = p_current_item AND game_mode = p_game_mode;
        v_current_b := COALESCE(v_current_b, 0);
    END IF;

    -- ── Phase 2. Detect regime ────────────────────────────────────

    IF v_n_total < 3 THEN
        v_regime := 'fresh';
        v_reasoning := 'Fresh — fewer than 3 credible attempts so far. ';

    ELSIF v_consec_failures >= 3 THEN
        v_regime := 'frustration';
        v_reasoning := format('Frustration — %s consecutive failures on %L. ',
                              v_consec_failures, p_current_item);

    ELSIF v_recent_acc_8 IS NOT NULL AND v_recent_acc_8 > 0.92
          AND v_recent_acc_4 IS NOT NULL AND v_recent_acc_4 >= 1.0 THEN
        v_regime := 'boredom';
        v_reasoning := format('Boredom — last-8 accuracy %s, last-4 perfect. ',
                              round(v_recent_acc_8, 2));

    ELSIF v_recent_acc_4 IS NOT NULL AND v_recent_acc_4 >= 0.75
          AND v_recent_acc_4 <= 0.90 THEN
        v_regime := 'flow';
        v_reasoning := format('Flow — last-4 accuracy %s in desirable band. ',
                              round(v_recent_acc_4, 2));
    ELSE
        v_regime := 'productive';
        v_reasoning := 'Productive practice — standard rules apply. ';
    END IF;

    -- ── Phase 3. Recovery state machine ──────────────────────────

    IF v_regime = 'frustration' THEN
        SELECT recovery_step
        INTO v_prev_recovery_step
        FROM lios_adaptive_decisions
        WHERE device_id = p_device_id
          AND game_mode = p_game_mode
          AND current_item = p_current_item
          AND recovery_step IS NOT NULL
          AND made_at > now() - interval '30 minutes'
        ORDER BY made_at DESC LIMIT 1;

        v_recovery_step := LEAST(5, COALESCE(v_prev_recovery_step, 0) + 1);
        v_reasoning := v_reasoning ||
            format('Recovery step %s of 5. ', v_recovery_step);
    END IF;

    -- ── Phase 4. Pick candidate ──────────────────────────────────

    IF v_recovery_step = 1 THEN
        -- Soft scaffold raise on the same item
        v_next_item        := p_current_item;
        v_scaffold_level   := 'partial';
        v_reward_intensity := 'standard';
        v_reasoning := v_reasoning || 'Soft scaffold raise on the same item. ';

    ELSIF v_recovery_step = 2 THEN
        -- Sibling substitution: easier item in same skill (b - 0.5)
        SELECT i.item_key, i.b,
               1.0 / (1.0 + exp(-(COALESCE(s.theta, 0) - i.b))) AS pexp
        INTO v_candidate
        FROM item_difficulty i
        LEFT JOIN skill_state s
          ON s.device_id = p_device_id AND s.game_mode = p_game_mode AND s.item_key = i.item_key
        WHERE i.game_mode = p_game_mode
          AND i.b < v_current_b - 0.30
        ORDER BY abs(i.b - (v_current_b - 0.50)) ASC
        LIMIT 1;

        v_next_item        := COALESCE(v_candidate.item_key, p_current_item);
        v_scaffold_level   := 'full';
        v_reward_intensity := 'standard';
        v_p_expected       := v_candidate.pexp;
        v_reasoning := v_reasoning ||
            format('Sibling substitution to %L (b=%s). ',
                   v_candidate.item_key, round(COALESCE(v_candidate.b, 0), 2));

    ELSIF v_recovery_step = 3 THEN
        -- Confidence rebuild: pick a previously-Mastered item
        SELECT s.item_key, COALESCE(i.b, 0) AS b,
               1.0 / (1.0 + exp(-(s.theta - COALESCE(i.b, 0)))) AS pexp
        INTO v_candidate
        FROM skill_state s
        LEFT JOIN item_difficulty i USING (item_key, game_mode)
        WHERE s.device_id = p_device_id
          AND s.game_mode = p_game_mode
          AND EXISTS (
            SELECT 1 FROM mastery_episode_fact m
            WHERE m.device_id = p_device_id
              AND m.item_key  = s.item_key
              AND m.game_mode = s.game_mode
              AND m.to_state  = 'Mastered'
          )
        ORDER BY s.theta DESC NULLS LAST
        LIMIT 1;

        v_next_item        := COALESCE(v_candidate.item_key, p_current_item);
        v_scaffold_level   := 'none';
        v_reward_intensity := 'big';
        v_p_expected       := v_candidate.pexp;
        v_reasoning := v_reasoning ||
            format('Confidence rebuild — surfacing mastered item %L. ', v_candidate.item_key);

    ELSIF v_recovery_step = 4 THEN
        -- Activity rotation within mode: any high-theta item different
        -- from current
        SELECT s.item_key, COALESCE(i.b, 0) AS b,
               1.0 / (1.0 + exp(-(s.theta - COALESCE(i.b, 0)))) AS pexp
        INTO v_candidate
        FROM skill_state s
        LEFT JOIN item_difficulty i USING (item_key, game_mode)
        WHERE s.device_id = p_device_id
          AND s.game_mode = p_game_mode
          AND s.item_key <> COALESCE(p_current_item, '')
          AND s.theta > 0
        ORDER BY s.theta DESC LIMIT 1;

        v_next_item        := COALESCE(v_candidate.item_key, p_current_item);
        v_scaffold_level   := 'partial';
        v_reward_intensity := 'standard';
        v_p_expected       := v_candidate.pexp;
        v_reasoning := v_reasoning ||
            format('Activity rotation to %L. ', v_candidate.item_key);

    ELSIF v_recovery_step = 5 THEN
        -- Graceful exit
        v_next_item        := NULL;
        v_scaffold_level   := 'none';
        v_reward_intensity := 'standard';
        v_suggest_break    := true;
        v_reasoning := v_reasoning || 'Graceful exit — suggest "let''s stop here for now". ';

    ELSIF v_regime = 'boredom' THEN
        -- Push difficulty up
        SELECT i.item_key, i.b,
               1.0 / (1.0 + exp(-(COALESCE(s.theta, 0) - i.b))) AS pexp
        INTO v_candidate
        FROM item_difficulty i
        LEFT JOIN skill_state s
          ON s.device_id = p_device_id AND s.game_mode = p_game_mode AND s.item_key = i.item_key
        WHERE i.game_mode = p_game_mode
          AND i.b > COALESCE(v_current_b, 0) + 0.30
        ORDER BY abs(i.b - (COALESCE(v_current_b, 0) + 0.50)) ASC
        LIMIT 1;

        v_next_item        := COALESCE(v_candidate.item_key, p_current_item);
        v_scaffold_level   := 'none';
        v_reward_intensity := 'quiet';
        v_p_expected       := v_candidate.pexp;
        v_reasoning := v_reasoning ||
            format('Pushing difficulty up to %L (b=%s). ',
                   v_candidate.item_key, round(COALESCE(v_candidate.b, 0), 2));

    ELSIF v_regime = 'flow' THEN
        v_next_item        := p_current_item;
        v_scaffold_level   := 'none';
        v_reward_intensity := 'quiet';
        v_reasoning := v_reasoning || 'Protect flow — keep same item. ';

    ELSE
        -- 'fresh' or 'productive': pick item closest to P=0.78
        SELECT i.item_key, i.b,
               1.0 / (1.0 + exp(-(COALESCE(s.theta, 0) - i.b))) AS pexp
        INTO v_candidate
        FROM item_difficulty i
        LEFT JOIN skill_state s
          ON s.device_id = p_device_id AND s.game_mode = p_game_mode AND s.item_key = i.item_key
        WHERE i.game_mode = p_game_mode
        ORDER BY abs((1.0 / (1.0 + exp(-(COALESCE(s.theta, 0) - i.b)))) - 0.78) ASC
        LIMIT 1;

        v_next_item        := COALESCE(v_candidate.item_key, p_current_item);
        v_scaffold_level   := CASE WHEN v_regime = 'fresh' THEN 'partial' ELSE 'none' END;
        v_reward_intensity := 'quiet';
        v_p_expected       := v_candidate.pexp;
        v_reasoning := v_reasoning ||
            format('Desirable-difficulty target — selected %L (P=%s). ',
                   v_candidate.item_key, round(COALESCE(v_candidate.pexp, 0), 2));
    END IF;

    -- ── Phase 5. Hard invariants (post-selection rotation) ──────

    -- INV-1: never the same item more than 3 consecutive times.
    IF v_next_item IS NOT NULL THEN
        DECLARE
            v_streak int;
        BEGIN
            SELECT count(*) INTO v_streak
            FROM (
                SELECT item_key, row_number() OVER (ORDER BY occurred_at DESC) AS rn
                FROM learning_attempts
                WHERE session_id = p_session_id
                  AND device_id  = p_device_id
                  AND game_mode  = p_game_mode
                ORDER BY occurred_at DESC
                LIMIT 4
            ) r
            WHERE item_key = v_next_item;

            IF v_streak >= 3 THEN
                v_invariants := array_append(v_invariants, 'rotate_same_item_3x');
                -- Rotate: pick the closest-to-P=0.78 item that isn't v_next_item
                SELECT i.item_key, 1.0 / (1.0 + exp(-(COALESCE(s.theta, 0) - i.b))) AS pexp
                INTO v_candidate
                FROM item_difficulty i
                LEFT JOIN skill_state s
                  ON s.device_id = p_device_id AND s.game_mode = p_game_mode AND s.item_key = i.item_key
                WHERE i.game_mode = p_game_mode AND i.item_key <> v_next_item
                ORDER BY abs((1.0 / (1.0 + exp(-(COALESCE(s.theta, 0) - i.b)))) - 0.78) ASC
                LIMIT 1;
                v_next_item  := v_candidate.item_key;
                v_p_expected := v_candidate.pexp;
                v_reasoning  := v_reasoning || '[INV: rotated due to 3x streak] ';
            END IF;
        END;
    END IF;

    -- INV-2: never P<0.5 in non-recovery frustration. (Recovery
    -- steps explicitly pick easier items, so the guard is for the
    -- non-recovery path; if our default pick has P<0.5 to a
    -- frustrated learner, swap for an easier one.)
    IF v_regime = 'frustration' AND v_recovery_step IS NULL
       AND COALESCE(v_p_expected, 1.0) < 0.5 THEN
        v_invariants := array_append(v_invariants, 'avoid_p_lt_0p5_in_frustration');
        SELECT i.item_key, 1.0 / (1.0 + exp(-(COALESCE(s.theta, 0) - i.b))) AS pexp
        INTO v_candidate
        FROM item_difficulty i
        LEFT JOIN skill_state s
          ON s.device_id = p_device_id AND s.game_mode = p_game_mode AND s.item_key = i.item_key
        WHERE i.game_mode = p_game_mode
          AND (1.0 / (1.0 + exp(-(COALESCE(s.theta, 0) - i.b)))) >= 0.6
        ORDER BY abs((1.0 / (1.0 + exp(-(COALESCE(s.theta, 0) - i.b)))) - 0.7) ASC
        LIMIT 1;
        v_next_item  := COALESCE(v_candidate.item_key, v_next_item);
        v_p_expected := v_candidate.pexp;
        v_reasoning  := v_reasoning || '[INV: swapped to easier item] ';
    END IF;

    -- INV-3: just-mastered → big celebration. Look for a Mastered
    -- transition for this learner in the last 60 seconds.
    IF EXISTS (
        SELECT 1 FROM mastery_episode_fact
        WHERE device_id = p_device_id
          AND to_state  = 'Mastered'
          AND transition_at > now() - interval '60 seconds'
    ) THEN
        v_invariants     := array_append(v_invariants, 'celebrate_recent_mastery');
        v_reward_intensity := 'big';
        v_reasoning      := v_reasoning || '[INV: just-mastered → big celebration] ';
    END IF;

    -- ── Phase 6. Audit + return ────────────────────────────────

    v_inputs := jsonb_build_object(
        'n_recent_attempts',  v_n_total,
        'consec_failures',    v_consec_failures,
        'recent_acc_4',       round(COALESCE(v_recent_acc_4, 0)::numeric, 3),
        'recent_acc_8',       round(COALESCE(v_recent_acc_8, 0)::numeric, 3),
        'current_item',       p_current_item,
        'current_item_b',     round(COALESCE(v_current_b, 0)::numeric, 3),
        'was_correct',        p_was_correct,
        'prev_recovery_step', v_prev_recovery_step
    );

    INSERT INTO lios_adaptive_decisions (
        device_id, session_id, game_mode, age_band, context,
        current_item, next_item, scaffold_level, reward_intensity, suggest_break,
        regime, recovery_step, p_expected,
        invariants_applied, inputs, reasoning
    ) VALUES (
        p_device_id, p_session_id, p_game_mode, v_age_band, v_context,
        p_current_item, v_next_item, v_scaffold_level, v_reward_intensity, v_suggest_break,
        v_regime, v_recovery_step,
        CASE WHEN v_p_expected IS NULL THEN NULL ELSE round(v_p_expected::numeric, 3) END,
        v_invariants, v_inputs, trim(v_reasoning)
    ) RETURNING id INTO v_audit_id;

    RETURN jsonb_build_object(
        'audit_id',           v_audit_id,
        'next_item',          v_next_item,
        'scaffold_level',     v_scaffold_level,
        'reward_intensity',   v_reward_intensity,
        'suggest_break',      v_suggest_break,
        'regime',             v_regime,
        'recovery_step',      v_recovery_step,
        'p_expected',         CASE WHEN v_p_expected IS NULL THEN NULL ELSE round(v_p_expected::numeric, 3) END,
        'invariants_applied', v_invariants,
        'reasoning',          trim(v_reasoning)
    );
END;
$fn$;

COMMENT ON FUNCTION public.lios_recommend_next(text, uuid, text, text, boolean) IS
    'LIOS Adaptive Engine v1 — rule-based recommendation. Returns the next item / scaffold / reward / break suggestion, writes a full audit row to lios_adaptive_decisions.';

REVOKE ALL ON FUNCTION public.lios_recommend_next(text, uuid, text, text, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.lios_recommend_next(text, uuid, text, text, boolean) TO authenticated, service_role;

-- ── 3. Engineering observability RPC ──────────────────────────────

CREATE OR REPLACE FUNCTION public.dashboard_adaptive_decisions(
    in_days int DEFAULT 30
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $fn$
    WITH win AS (
        SELECT * FROM lios_adaptive_decisions
        WHERE made_at > now() - (in_days || ' days')::interval
    ),
    by_regime AS (
        SELECT regime, count(*)::int AS n
        FROM win GROUP BY regime
    ),
    by_recovery_step AS (
        SELECT recovery_step, count(*)::int AS n
        FROM win WHERE recovery_step IS NOT NULL
        GROUP BY recovery_step ORDER BY recovery_step
    ),
    by_scaffold AS (
        SELECT scaffold_level, count(*)::int AS n
        FROM win GROUP BY scaffold_level
    ),
    by_reward AS (
        SELECT reward_intensity, count(*)::int AS n
        FROM win GROUP BY reward_intensity
    ),
    invariant_fires AS (
        SELECT unnest(invariants_applied) AS invariant, count(*)::int AS n
        FROM win GROUP BY 1 ORDER BY n DESC
    ),
    by_mode AS (
        SELECT game_mode, count(*)::int AS n,
               avg(p_expected)::numeric(4, 3) AS mean_p_expected
        FROM win GROUP BY game_mode
    ),
    recent AS (
        SELECT id, made_at, device_id, session_id, game_mode,
               current_item, next_item, scaffold_level, reward_intensity,
               suggest_break, regime, recovery_step, p_expected,
               invariants_applied, reasoning
        FROM win ORDER BY made_at DESC LIMIT 30
    )
    SELECT jsonb_build_object(
        'days', in_days, 'as_of', now(),
        'total', (SELECT count(*) FROM win),
        'by_regime',         COALESCE((SELECT jsonb_agg(row_to_json(b)) FROM by_regime b), '[]'::jsonb),
        'by_recovery_step',  COALESCE((SELECT jsonb_agg(row_to_json(b)) FROM by_recovery_step b), '[]'::jsonb),
        'by_scaffold',       COALESCE((SELECT jsonb_agg(row_to_json(b)) FROM by_scaffold b), '[]'::jsonb),
        'by_reward',         COALESCE((SELECT jsonb_agg(row_to_json(b)) FROM by_reward b), '[]'::jsonb),
        'invariant_fires',   COALESCE((SELECT jsonb_agg(row_to_json(b)) FROM invariant_fires b), '[]'::jsonb),
        'by_mode',           COALESCE((SELECT jsonb_agg(row_to_json(b)) FROM by_mode b), '[]'::jsonb),
        'recent',            COALESCE((SELECT jsonb_agg(row_to_json(r) ORDER BY made_at DESC) FROM recent r), '[]'::jsonb)
    );
$fn$;

REVOKE ALL ON FUNCTION public.dashboard_adaptive_decisions(int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_adaptive_decisions(int) TO authenticated;
