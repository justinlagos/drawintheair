-- ═══════════════════════════════════════════════════════════════════
-- analytics_events — traffic classification (internal-traffic exclusion)
-- ═══════════════════════════════════════════════════════════════════
--
-- STATUS: additive + reversible. Safe to apply at any time; NOT YET
-- APPLIED to production (apply only with explicit approval).
--
-- WHY
--   The client (src/lib/analytics.ts) already stamps every event with
--   meta.traffic_type and meta.environment via the trafficClassifier
--   module, so internal/QA/bot exclusion works TODAY by reading the
--   jsonb (see the convenience view below). This migration promotes
--   those two fields to first-class columns so the Insights RPCs can
--   filter and index on them cheaply instead of scanning jsonb.
--
--   Headline KPIs were contaminated: the Clarity 100-recording sample
--   was 84% internal (localhost + /admin), and the admin dashboard
--   pools founders, QA and bots with real users — which is how you get
--   105.7% activation and 100% Tier A.
--
-- TAXONOMY (mirrors src/lib/trafficClassifier.ts):
--   environment   ∈ {'local','staging','production'}
--   traffic_type  ∈ {'real','internal','qa','demo','bot'}
--   Only 'real' (production) feeds headline KPIs by default.

-- ─── 1. Columns (nullable, additive) ──────────────────────────────
ALTER TABLE public.analytics_events
    ADD COLUMN IF NOT EXISTS environment  text,
    ADD COLUMN IF NOT EXISTS traffic_type text;

-- ─── 2. Backfill from the meta the client already writes ──────────
-- Rows written before this migration carry the values in meta. Newer
-- client builds keep writing meta too, so this is forward-safe; a
-- follow-up can flip analytics.ts to populate the columns directly and
-- drop them from meta.
UPDATE public.analytics_events
SET traffic_type = COALESCE(traffic_type, meta->>'traffic_type'),
    environment  = COALESCE(environment,  meta->>'environment')
WHERE (traffic_type IS NULL AND meta ? 'traffic_type')
   OR (environment  IS NULL AND meta ? 'environment');

-- Historic rows with no signal at all: leave NULL. Insights treats
-- NULL traffic_type conservatively (NOT counted as 'real').

-- ─── 3. Index for the default real-only production scan ───────────
CREATE INDEX IF NOT EXISTS analytics_events_real_prod_idx
    ON public.analytics_events (occurred_at DESC)
    WHERE traffic_type = 'real' AND environment = 'production';

-- ─── 4. Canonical real-only view ──────────────────────────────────
-- The single definition of "real traffic". Every headline metric / RPC
-- should read from this view (or apply the identical predicate) so the
-- exclusion rule lives in exactly one place.
--   Demo is intentionally excluded here — report it on its own panel,
--   never folded into the real denominator.
CREATE OR REPLACE VIEW public.analytics_events_real AS
SELECT *
FROM public.analytics_events
WHERE traffic_type = 'real'
  AND environment  = 'production';

COMMENT ON VIEW public.analytics_events_real IS
    'Real production traffic only. Internal/QA/demo/bot excluded. Source of truth for headline KPIs.';

-- ─── 5. attempt_id keystone (Workstream A1) ───────────────────────
-- One id per activity attempt (mode_started → terminal), stamped on
-- every event in the journey + mirrored to learning_attempts. The
-- client already writes it into meta.attempt_id; promote to a column
-- so honest per-attempt funnels / completion / learning joins are
-- cheap and indexable. Additive + nullable; historic rows stay valid.
ALTER TABLE public.analytics_events
    ADD COLUMN IF NOT EXISTS attempt_id uuid;
ALTER TABLE public.learning_attempts
    ADD COLUMN IF NOT EXISTS attempt_id uuid;

UPDATE public.analytics_events
SET attempt_id = (meta->>'attempt_id')::uuid
WHERE attempt_id IS NULL
  AND meta ? 'attempt_id'
  AND meta->>'attempt_id' ~ '^[0-9a-f-]{36}$';

UPDATE public.learning_attempts
SET attempt_id = (meta->>'attempt_id')::uuid
WHERE attempt_id IS NULL
  AND meta ? 'attempt_id'
  AND meta->>'attempt_id' ~ '^[0-9a-f-]{36}$';

-- Per-attempt event lookups (funnel + completion reconstruction).
CREATE INDEX IF NOT EXISTS analytics_events_attempt_idx
    ON public.analytics_events (attempt_id, occurred_at)
    WHERE attempt_id IS NOT NULL;

-- ─── 6. Follow-up (next slice, NOT in this migration) ─────────────
-- traffic_type/environment also belong on learning_attempts so
-- learning/mastery metrics share the internal-traffic exclusion (they
-- are reachable today by joining on event_uid). Tracked in
-- docs/EXECUTION_PLAN_DATA_TO_GROWTH.md (Workstream A2/A3).

-- ─── ROLLBACK ─────────────────────────────────────────────────────
-- DROP VIEW IF EXISTS public.analytics_events_real;
-- DROP INDEX IF EXISTS public.analytics_events_real_prod_idx;
-- DROP INDEX IF EXISTS public.analytics_events_attempt_idx;
-- ALTER TABLE public.learning_attempts DROP COLUMN IF EXISTS attempt_id;
-- ALTER TABLE public.analytics_events
--     DROP COLUMN IF EXISTS traffic_type,
--     DROP COLUMN IF EXISTS environment,
--     DROP COLUMN IF EXISTS attempt_id;
