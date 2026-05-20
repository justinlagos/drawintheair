-- ═══════════════════════════════════════════════════════════════════
-- LIOS Sprint 6 — Observability + SLOs
-- ═══════════════════════════════════════════════════════════════════
--
-- Four artifacts:
--   1. lios_anomaly_fact          — append-only anomaly log
--   2. lios_detect_anomalies_v1   — z-score detector
--   3. dashboard_observability    — engineering RPC: ingestion rate,
--                                   idempotency, latency, SLO status
--   4. dashboard_transparency_report — PUBLIC quarterly trust report
--                                   (anon-readable, k≥5 anonymised)
--
-- Note on idempotent inserts: an earlier draft used a partial unique
-- index on (metric, date_trunc('hour', detected_at)) to dedupe. That
-- failed because date_trunc is STABLE, not IMMUTABLE, and Postgres
-- requires immutability for index expressions. We dedupe in the
-- function body instead (NOT EXISTS check before INSERT).

CREATE TABLE IF NOT EXISTS public.lios_anomaly_fact (
    id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    detected_at   timestamptz   NOT NULL DEFAULT now(),
    metric        text          NOT NULL,
    severity      text          NOT NULL DEFAULT 'warn',
    current_value numeric,
    baseline_mean numeric,
    baseline_sd   numeric,
    z_score       numeric,
    context       jsonb         NOT NULL DEFAULT '{}'::jsonb,
    reason        text,
    CONSTRAINT lios_anomaly_severity_check CHECK (severity IN ('info', 'warn', 'critical'))
);

CREATE INDEX IF NOT EXISTS lios_anomaly_detected_idx ON public.lios_anomaly_fact (detected_at DESC);
CREATE INDEX IF NOT EXISTS lios_anomaly_metric_idx   ON public.lios_anomaly_fact (metric, detected_at DESC);
CREATE INDEX IF NOT EXISTS lios_anomaly_severity_idx ON public.lios_anomaly_fact (severity, detected_at DESC);

ALTER TABLE public.lios_anomaly_fact ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated select anomalies" ON public.lios_anomaly_fact;
CREATE POLICY "Authenticated select anomalies"
    ON public.lios_anomaly_fact FOR SELECT TO authenticated USING (true);

-- Full function bodies are in the production database — see
-- supabase apply_migration history for lios_observability_v2 and
-- lios_observability_rpcs. The v1 dedupe uses NOT EXISTS inside
-- the function rather than a partial unique index.
