-- ═══════════════════════════════════════════════════════════════════
-- LIOS Sprint 2 Day 1 — credibility-weighted Elo (v1)
-- ═══════════════════════════════════════════════════════════════════
--
-- Builds the first longitudinal layer on top of Trust v1:
--
--   • item_difficulty           per (item_key, game_mode)     → b
--   • skill_state               per (device_id, item_key,
--                                    game_mode)               → θ
--   • skill_state_history       append-only daily snapshot     → θ(t)
--   • learning_attempts.elo_processed_at  — idempotency cursor
--   • lios_update_elo_v1(...)   — the credibility-weighted job
--
-- Math (natural-log Elo, not chess-style 400-pt scale):
--
--   P_expected = 1 / (1 + exp(-(θ − b)))
--   Δθ         = K · c · (outcome − P_expected)
--   Δb         = -Δθ · k_b
--
--   where:
--     K   = 0.40    learner update rate
--     k_b = 0.10    item difficulty moves 10x slower than learner θ
--     c   = credibility_score from Trust v1 in [0, 1]
--
-- Credibility weighting (Document A §4, Document B §3): low-credibility
-- attempts move the rating LESS. A Tier-A attempt with c=1.0 produces a
-- full Δθ; a Tier-B attempt with c=0.6 produces 60% of Δθ; a Tier-C
-- attempt below 0.4 produces almost no movement. This is the entire
-- point — the measurement layer is now protected from polluted data
-- automatically.
--
-- Backwards safety: the function ONLY processes attempts that already
-- carry a credibility_score (i.e. Trust v1 ran first). Attempts whose
-- score is still NULL are skipped — they'll be picked up on the next
-- run once Trust v1 has scored them. This makes the two jobs
-- composable and order-tolerant.

-- ── 1. Item difficulty table ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.item_difficulty (
    item_key     text          NOT NULL,
    game_mode    text          NOT NULL,
    b            numeric(6, 3) NOT NULL DEFAULT 0,
    n_attempts   bigint        NOT NULL DEFAULT 0,
    last_updated timestamptz   NOT NULL DEFAULT now(),
    PRIMARY KEY (item_key, game_mode)
);

COMMENT ON TABLE public.item_difficulty IS
    'LIOS Elo item difficulty parameter b per (item_key, game_mode). Initialised at 0, moves slowly with the inverse of every learner update.';
COMMENT ON COLUMN public.item_difficulty.b IS
    'Difficulty (natural-log Elo logits). Higher b = harder item. A learner with θ = b has P_expected = 0.5 on that item.';

-- ── 2. Skill state (current θ per (learner, skill)) ────────────────

CREATE TABLE IF NOT EXISTS public.skill_state (
    device_id            uuid           NOT NULL,
    item_key             text           NOT NULL,
    game_mode            text           NOT NULL,
    theta                numeric(6, 3)  NOT NULL DEFAULT 0,
    n_attempts           bigint         NOT NULL DEFAULT 0,
    n_credible_attempts  numeric(8, 2)  NOT NULL DEFAULT 0,
    last_attempt_at      timestamptz,
    age_band             text,
    PRIMARY KEY (device_id, item_key, game_mode)
);

COMMENT ON TABLE public.skill_state IS
    'LIOS Elo skill state — current rating θ per pseudonymous learner per (item, game_mode). n_credible_attempts is the sum of credibility scores, not a count, so it reflects effective practice volume.';
COMMENT ON COLUMN public.skill_state.theta IS
    'Learner rating (natural-log Elo logits). Higher θ = stronger on this item. θ − b > 0 means expected to succeed.';
COMMENT ON COLUMN public.skill_state.n_credible_attempts IS
    'Sum of credibility_score across attempts, not the raw count. A learner with 20 attempts at c=0.5 each has effective practice volume of 10.';

CREATE INDEX IF NOT EXISTS skill_state_device_idx
    ON public.skill_state (device_id, last_attempt_at DESC);
CREATE INDEX IF NOT EXISTS skill_state_item_idx
    ON public.skill_state (item_key, game_mode, theta DESC);

-- ── 3. Skill state history (append-only daily snapshot) ────────────

CREATE TABLE IF NOT EXISTS public.skill_state_history (
    device_id   uuid          NOT NULL,
    item_key    text          NOT NULL,
    game_mode   text          NOT NULL,
    day         date          NOT NULL,
    theta       numeric(6, 3) NOT NULL,
    n_attempts  bigint        NOT NULL,
    PRIMARY KEY (device_id, item_key, game_mode, day)
);

COMMENT ON TABLE public.skill_state_history IS
    'LIOS daily snapshot of skill_state. Powers learning-velocity, mastery-curve, and decay-probe analytics. Append-only; the row for "today" is updated as attempts arrive, prior days are immutable.';

CREATE INDEX IF NOT EXISTS skill_state_history_day_idx
    ON public.skill_state_history (day DESC);

-- ── 4. Idempotency cursor on learning_attempts ─────────────────────

ALTER TABLE public.learning_attempts
    ADD COLUMN IF NOT EXISTS elo_processed_at timestamptz;

COMMENT ON COLUMN public.learning_attempts.elo_processed_at IS
    'When the Elo updater processed this attempt. NULL = not yet processed. The bulk scorer keys off this for idempotent replays.';

-- Partial index for the bulk scorer's "find unprocessed scored
-- attempts" query — only indexes the small subset of pending rows.
CREATE INDEX IF NOT EXISTS learning_attempts_elo_pending_idx
    ON public.learning_attempts (occurred_at)
    WHERE elo_processed_at IS NULL AND credibility_score IS NOT NULL;

-- ── 5. RLS for the new tables ──────────────────────────────────────

ALTER TABLE public.skill_state           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_state_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_difficulty       ENABLE ROW LEVEL SECURITY;

-- Authenticated admin users can SELECT; INSERT/UPDATE only via the
-- SECURITY DEFINER function below — no direct write path from anon.
DROP POLICY IF EXISTS "Authenticated select skill_state"     ON public.skill_state;
CREATE POLICY "Authenticated select skill_state"
    ON public.skill_state         FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated select skill_state_history" ON public.skill_state_history;
CREATE POLICY "Authenticated select skill_state_history"
    ON public.skill_state_history FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated select item_difficulty" ON public.item_difficulty;
CREATE POLICY "Authenticated select item_difficulty"
    ON public.item_difficulty     FOR SELECT TO authenticated USING (true);

-- ── 6. The credibility-weighted Elo updater ────────────────────────

CREATE OR REPLACE FUNCTION public.lios_update_elo_v1(
    p_lookback interval DEFAULT '24 hours'
) RETURNS TABLE(
    processed_attempts  bigint,
    distinct_learners   bigint,
    distinct_items      bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
    K_LEARNER     constant numeric := 0.40;   -- learner θ update rate
    K_ITEM_FACTOR constant numeric := 0.10;   -- item b moves 10x slower
    THETA_CLAMP   constant numeric := 5.00;   -- safety: |θ|, |b| ≤ 5
    rec           record;
    v_theta       numeric;
    v_b           numeric;
    v_p_expected  numeric;
    v_outcome     numeric;
    v_c           numeric;
    v_delta_theta numeric;
    v_new_theta   numeric;
    v_new_b       numeric;
    v_new_n       bigint;
    v_processed   bigint := 0;
BEGIN
    -- Iterate in strict time order so item difficulties and learner
    -- ratings evolve causally. We process across all learners in one
    -- chronological pass — that's the only correct order for a shared
    -- item-difficulty model.
    FOR rec IN
        SELECT id, device_id, item_key, game_mode, was_correct,
               credibility_score, age_band, occurred_at
        FROM learning_attempts
        WHERE elo_processed_at IS NULL
          AND credibility_score IS NOT NULL
          AND device_id IS NOT NULL
          AND occurred_at > now() - p_lookback
        ORDER BY occurred_at, id
    LOOP
        v_c       := rec.credibility_score;
        v_outcome := CASE WHEN rec.was_correct THEN 1.0 ELSE 0.0 END;

        -- Current learner θ (default 0 for first exposure)
        SELECT theta INTO v_theta
        FROM skill_state
        WHERE device_id = rec.device_id
          AND item_key  = rec.item_key
          AND game_mode = rec.game_mode;
        IF v_theta IS NULL THEN v_theta := 0; END IF;

        -- Current item b (default 0)
        SELECT b INTO v_b
        FROM item_difficulty
        WHERE item_key  = rec.item_key
          AND game_mode = rec.game_mode;
        IF v_b IS NULL THEN v_b := 0; END IF;

        -- Logistic expected probability of success
        v_p_expected := 1.0 / (1.0 + exp(-(v_theta - v_b)));

        -- Credibility-weighted Elo delta. This is the line that
        -- protects every downstream learning claim — Tier-A attempts
        -- move θ fully, Tier-B partially, Tier-C barely at all.
        v_delta_theta := K_LEARNER * v_c * (v_outcome - v_p_expected);
        v_new_theta   := LEAST(THETA_CLAMP, GREATEST(-THETA_CLAMP, v_theta + v_delta_theta));
        v_new_b       := LEAST(THETA_CLAMP, GREATEST(-THETA_CLAMP, v_b - v_delta_theta * K_ITEM_FACTOR));

        -- Upsert learner state
        INSERT INTO skill_state
            (device_id, item_key, game_mode, theta, n_attempts, n_credible_attempts, last_attempt_at, age_band)
        VALUES
            (rec.device_id, rec.item_key, rec.game_mode, v_new_theta, 1, v_c, rec.occurred_at, rec.age_band)
        ON CONFLICT (device_id, item_key, game_mode) DO UPDATE
            SET theta               = EXCLUDED.theta,
                n_attempts          = skill_state.n_attempts + 1,
                n_credible_attempts = skill_state.n_credible_attempts + EXCLUDED.n_credible_attempts,
                last_attempt_at     = EXCLUDED.last_attempt_at,
                age_band            = COALESCE(skill_state.age_band, EXCLUDED.age_band);

        -- Upsert item difficulty
        INSERT INTO item_difficulty (item_key, game_mode, b, n_attempts, last_updated)
        VALUES (rec.item_key, rec.game_mode, v_new_b, 1, rec.occurred_at)
        ON CONFLICT (item_key, game_mode) DO UPDATE
            SET b            = EXCLUDED.b,
                n_attempts   = item_difficulty.n_attempts + 1,
                last_updated = EXCLUDED.last_updated;

        -- Read back the new attempt count for the history row
        SELECT n_attempts INTO v_new_n
        FROM skill_state
        WHERE device_id = rec.device_id
          AND item_key  = rec.item_key
          AND game_mode = rec.game_mode;

        -- Daily snapshot — overwritten for "today", immutable for past
        INSERT INTO skill_state_history
            (device_id, item_key, game_mode, day, theta, n_attempts)
        VALUES
            (rec.device_id, rec.item_key, rec.game_mode, rec.occurred_at::date, v_new_theta, v_new_n)
        ON CONFLICT (device_id, item_key, game_mode, day) DO UPDATE
            SET theta      = EXCLUDED.theta,
                n_attempts = EXCLUDED.n_attempts;

        -- Mark this attempt Elo-processed (idempotency)
        UPDATE learning_attempts
        SET elo_processed_at = now()
        WHERE id = rec.id;

        v_processed := v_processed + 1;
    END LOOP;

    RETURN QUERY
        SELECT v_processed,
               (SELECT count(DISTINCT device_id) FROM skill_state)::bigint,
               (SELECT count(*) FROM item_difficulty)::bigint;
END;
$fn$;

COMMENT ON FUNCTION public.lios_update_elo_v1(interval) IS
    'LIOS Sprint 2 credibility-weighted Elo updater. Iterates pending attempts in chronological order, updates skill_state and item_difficulty using K · credibility · (outcome − P_expected), writes daily snapshots to skill_state_history. Idempotent — never re-processes a row.';

REVOKE ALL ON FUNCTION public.lios_update_elo_v1(interval) FROM public;
REVOKE ALL ON FUNCTION public.lios_update_elo_v1(interval) FROM anon;
GRANT EXECUTE ON FUNCTION public.lios_update_elo_v1(interval) TO authenticated, service_role;

-- ── 7. Convenience view: learners ordered by progression on a skill

CREATE OR REPLACE VIEW public.dashboard_learner_progression AS
SELECT
    s.device_id,
    s.item_key,
    s.game_mode,
    s.theta,
    s.n_attempts,
    s.n_credible_attempts,
    s.last_attempt_at,
    s.age_band,
    i.b                  AS item_difficulty,
    s.theta - i.b        AS expected_strength,  -- positive = expected to succeed
    1.0 / (1.0 + exp(-(s.theta - i.b))) AS p_expected
FROM skill_state s
LEFT JOIN item_difficulty i USING (item_key, game_mode);

COMMENT ON VIEW public.dashboard_learner_progression IS
    'Per-(learner, item, mode) current Elo state plus computed expected probability of success. Used by the Learner Progression Dashboard.';

GRANT SELECT ON public.dashboard_learner_progression TO authenticated;
