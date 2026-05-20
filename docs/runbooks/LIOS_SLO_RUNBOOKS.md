# LIOS On-Call Runbooks

These runbooks cover the seven SLOs defined in Document B §11.2 and surfaced live on the **Observability** tab of `/admin/insights`. Each section follows the same shape:

1. The SLO target
2. The symptom (what the dashboard shows when this fires)
3. Diagnostic queries (copy-paste into the Supabase SQL editor)
4. Remediation steps (ordered: cheapest first, escalation last)
5. Postmortem template (if the incident is customer-visible or persistent)

The seven SLOs:

| # | SLO | Target | Where it surfaces |
|---|---|---|---|
| 1 | Event durability | ≥ 99.5% of attempts ingested with envelope | Observability tab → SLO tile |
| 2 | Idempotency | ≤ 0.1% duplicate event_uid acceptance | Observability tab → SLO tile |
| 3 | Ingestion latency | p99 < 2s online | Observability tab → SLO tile |
| 4 | Session quality | ≥ 85% of attempts above credibility publication threshold | Observability tab → SLO tile |
| 5 | Tracker init success | ≥ 95% | Executive tab → Tracker health |
| 6 | Adaptive engine availability | ≥ 99.9% decisions < 200ms | Adaptive tab + Observability anomalies |
| 7 | Schema integrity | ≥ 99.99% events conform to active schema | Observability tab + Errors tab |

Plus two derived health metrics that the anomaly detector also watches:

| # | Metric | Target | Detector |
|---|---|---|---|
| 8 | Cron pipeline health | 0 failed runs / 24h | `lios_anomaly_fact` |
| 9 | Trust composition drift | Tier-A% within 2.5σ of 7-day mean | `lios_anomaly_fact` |

---

## SLO 1 — Event Durability

**Target:** ≥ 99.5% of events in the window carry the LIOS envelope (`event_uid IS NOT NULL`).

**Symptom on the dashboard.** Observability tab → "Event durability" tile turns amber (< 99.5%) or red (< 95%). The number is `events_with_envelope ÷ events_total`. A drop almost always means a build deployed without the LIOS-envelope client code, or a third-party integration is firing events through a non-LIOS path.

**Diagnostic queries:**

```sql
-- 1. How bad is it, and how recent?
SELECT
  date_trunc('hour', occurred_at) AS h,
  count(*) AS total,
  count(*) FILTER (WHERE event_uid IS NOT NULL) AS with_envelope,
  round(100.0 * count(*) FILTER (WHERE event_uid IS NOT NULL) / nullif(count(*), 0), 2) AS pct_envelope
FROM analytics_events
WHERE occurred_at > now() - interval '6 hours'
GROUP BY 1 ORDER BY 1 DESC;

-- 2. Which build is missing the envelope?
SELECT build_version, count(*) AS n,
       count(*) FILTER (WHERE event_uid IS NULL) AS legacy
FROM analytics_events
WHERE occurred_at > now() - interval '24 hours'
GROUP BY build_version
ORDER BY legacy DESC;
```

**Remediation:**

1. If a recent build has legacy=100%, roll back the deploy. The envelope client code was likely tree-shaken or a `package.json` regression.
2. If legacy is concentrated in one event name, find the call site that's still using a raw fetch instead of `analytics.logEvent` and fix it.
3. If the issue is gradual (week-over-week drift), it's likely third-party scripts firing into `analytics_events` directly without the envelope. Add a check in the ingestion path to reject envelope-less inserts from non-allowed sources.

**Escalation:** If durability is < 80% for more than 2 hours, treat as a P1 — every downstream metric (Trust, Elo, Mastery, Adaptive) is silently being computed on contaminated data.

---

## SLO 2 — Idempotency

**Target:** ≤ 0.1% duplicate `event_uid` acceptance.

**Symptom.** Observability tab → "Idempotency" tile shows non-zero duplicates. The exact value is `events_with_envelope - distinct_event_uids`.

**Diagnostic queries:**

```sql
-- Which event_uids appear more than once?
SELECT event_uid, count(*) AS dup_count
FROM analytics_events
WHERE event_uid IS NOT NULL
  AND occurred_at > now() - interval '24 hours'
GROUP BY event_uid
HAVING count(*) > 1
ORDER BY dup_count DESC
LIMIT 20;

-- Are the duplicates clustered around a particular session or build?
SELECT build_version, session_id, count(DISTINCT event_uid) AS uids,
       count(*) AS rows
FROM analytics_events
WHERE event_uid IS NOT NULL
  AND occurred_at > now() - interval '24 hours'
GROUP BY 1, 2
HAVING count(*) > count(DISTINCT event_uid)
ORDER BY rows - uids DESC
LIMIT 20;
```

**Remediation:**

1. **Confirm the unique index is intact:**
   ```sql
   SELECT indexname, indexdef FROM pg_indexes
   WHERE tablename='analytics_events' AND indexname LIKE '%event_uid%';
   ```
   It should be a non-partial unique index. If missing or partial, re-run migration `20260519_lios_event_envelope_full_unique.sql`.

2. **Check the client PostgREST insert path.** It must send `Prefer: resolution=ignore-duplicates`. If duplicates are slipping through, the header is missing or PostgREST is mis-routing.

3. **Audit the `sendBeacon` last-gasp path** in `src/lib/analytics.ts` — it uses an `on_conflict=event_uid` URL hint instead of a Prefer header. Verify the URL is being built correctly.

**Escalation:** Any duplicate count > 0 is a P2 — the system relies on event_uid uniqueness for safe replay. If duplicate count > 100 / hour, P1.

---

## SLO 3 — Ingestion Latency

**Target:** p99 client→server latency < 2000 ms.

**Symptom.** Observability tab → "Ingestion latency p99" tile amber (≥ 2000 ms) or red (≥ 5000 ms). Computed as `occurred_at - client_ts` in milliseconds across all events with a populated `client_ts`.

**Diagnostic queries:**

```sql
-- Which hour saw the latency spike?
SELECT date_trunc('hour', occurred_at) AS h,
       percentile_cont(0.50) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (occurred_at - client_ts)) * 1000) AS p50_ms,
       percentile_cont(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (occurred_at - client_ts)) * 1000) AS p99_ms,
       count(*) AS n
FROM analytics_events
WHERE client_ts IS NOT NULL
  AND occurred_at > now() - interval '12 hours'
GROUP BY 1 ORDER BY 1 DESC;

-- Is it concentrated in a region/browser?
SELECT browser, device_type, count(*),
       percentile_cont(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (occurred_at - client_ts)) * 1000) AS p99_ms
FROM analytics_events
WHERE client_ts IS NOT NULL AND occurred_at > now() - interval '6 hours'
GROUP BY 1, 2
ORDER BY p99_ms DESC NULLS LAST
LIMIT 10;
```

**Remediation:**

1. **Check the offline queue depth.** A few thousand backlog events flushing at once will inflate p99. If `client_ts` is more than 30s before `occurred_at` for a fraction of rows, that's normal offline-recovery — not a real-time latency problem.
2. **Check Supabase status** (`status.supabase.com`). Postgres or PostgREST degradation is the most common cause of a real p99 spike.
3. **Check the network path** — if one browser/region dominates, the issue may be upstream (CDN, school network, etc.).

**Escalation:** If p99 > 30s for more than 1 hour, P1. Customer-visible (slow UI). Open Supabase support ticket.

---

## SLO 4 — Session Quality

**Target:** ≥ 85% of credibility-scored attempts at credibility ≥ 0.6 (publication-eligible).

**Symptom.** Observability tab → "Session quality" tile shows current pct. Dashboards may also feel sparser because more attempts are below the publication threshold.

**Diagnostic queries:**

```sql
-- What's driving the drop? Look at tier distribution by day.
SELECT date_trunc('day', occurred_at) AS d,
       count(*) AS n,
       round(100.0 * count(*) FILTER (WHERE credibility_tier='A') / nullif(count(*),0), 1) AS pct_a,
       round(100.0 * count(*) FILTER (WHERE credibility_tier='B') / nullif(count(*),0), 1) AS pct_b,
       round(100.0 * count(*) FILTER (WHERE credibility_tier='C') / nullif(count(*),0), 1) AS pct_c
FROM learning_attempts
WHERE credibility_tier IS NOT NULL
  AND occurred_at > now() - interval '14 days'
GROUP BY 1 ORDER BY 1 DESC;

-- Which reason codes are firing most?
SELECT reason, count(*) AS n
FROM (
  SELECT jsonb_array_elements_text(credibility_reasons) AS reason
  FROM learning_attempts
  WHERE credibility_tier <> 'A'
    AND occurred_at > now() - interval '7 days'
) r
GROUP BY 1 ORDER BY n DESC LIMIT 20;
```

**Remediation:**

1. If a specific reason code surged, investigate the upstream cause. e.g. a tracker regression causing `stuck_recent` to fire on every session.
2. If the cause is a new game mode with a different attempt-cadence than the calibration window, recalibrate Trust v1 thresholds.
3. Never adjust the threshold "to make the SLO green." Threshold drift is a versioning event — bump to `trust_v2` and document.

**Escalation:** If session quality < 70% for 24h+, treat as a credibility incident — publish a transparency-report note before any new external claim ships.

---

## SLO 5 — Tracker Init Success

**Target:** ≥ 95% of sessions reach tracker-ready state within 8 seconds.

**Symptom.** Executive tab → Tracker health shows GPU + CPU success rate. A drop usually means a browser update broke MediaPipe.

**Diagnostic queries:**

```sql
-- Tracker outcomes per browser, last 24h
SELECT browser, browser_version,
       count(*) FILTER (WHERE event_name = 'tracker_init_succeeded') AS ok,
       count(*) FILTER (WHERE event_name = 'tracker_init_failed') AS failed
FROM analytics_events
WHERE event_name LIKE 'tracker_init_%'
  AND occurred_at > now() - interval '24 hours'
GROUP BY 1, 2
ORDER BY failed DESC;

-- Failure codes
SELECT meta->>'code' AS code, count(*) AS n
FROM analytics_events
WHERE event_name = 'tracker_init_failed'
  AND occurred_at > now() - interval '24 hours'
GROUP BY 1 ORDER BY n DESC;
```

**Remediation:**

1. Replicate on the affected browser version. Update MediaPipe if a release fixes it.
2. If the cause is a stale dependency in `index.html`, force-bump the CDN version.
3. Ship a fallback to CPU delegate if GPU consistently fails on a browser/OS combo.

**Escalation:** Tracker failure > 30% on Chrome stable = P1 (most users affected).

---

## SLO 6 — Adaptive Engine Availability

**Target:** ≥ 99.9% of decisions returned within 200ms (client-side measurement).

**Symptom.** Adaptive tab shows recent decisions volume drop; Observability tab anomaly log includes `pipeline_failure_rate_24h` if errors come from the engine call within the cron.

**Diagnostic queries:**

```sql
-- How many decisions in the last hour by regime?
SELECT regime, count(*) AS n
FROM lios_adaptive_decisions
WHERE made_at > now() - interval '1 hour'
GROUP BY 1;

-- Has the function been failing?
SELECT *
FROM lios_pipeline_runs
WHERE run_at > now() - interval '6 hours'
  AND error_message LIKE '%anomaly%' OR error_message LIKE '%recommend%'
ORDER BY run_at DESC LIMIT 20;
```

**Remediation:**

1. Check the function definition still exists: `\df lios_recommend_next`.
2. Confirm GRANT EXECUTE to `authenticated` and `service_role` is intact.
3. If RPC errors are 401s, an upstream auth change broke the JWT path — fix the client's `getAccessToken` rather than the engine.

**Escalation:** If decisions volume drops to zero for > 1 hour during active hours, P1. The shadow-mode audit log goes dark.

---

## SLO 7 — Schema Integrity

**Target:** ≥ 99.99% of events conform to the active schema (no orphan columns, no constraint violations).

**Symptom.** Errors tab shows constraint-violation events; cron pipeline starts failing inserts.

**Diagnostic queries:**

```sql
-- Constraint violations in the last day
SELECT event_name, count(*)
FROM analytics_events
WHERE event_name LIKE 'system_error%'
  AND meta->>'kind' = 'constraint_violation'
  AND occurred_at > now() - interval '24 hours'
GROUP BY 1;

-- Are there orphaned event_uids in learning_attempts?
SELECT count(*) FROM learning_attempts
WHERE event_uid IS NOT NULL
  AND event_uid NOT IN (SELECT event_uid FROM analytics_events WHERE event_uid IS NOT NULL);
```

**Remediation:**

1. Add the missing column or relax the constraint via a numbered migration. Never patch-edit a deployed migration file.
2. If the violation is a CHECK on credibility_tier or mastery state, the producing function is wrong — fix the function.

**Escalation:** Schema integrity < 99% = P1. Stop the cron pipeline (`SELECT cron.unschedule('lios-pipeline-every-5min')`) until the issue is fixed to prevent cascading bad writes.

---

## Cron + Anomaly health (derived)

The cron pipeline runs every 5 minutes via `pg_cron`. The Observability dashboard's "Cron health" tile shows the last-24h failure count + average duration. The anomaly detector also fires `pipeline_failure_rate_24h` and `cron_pipeline_duration_ms` warnings to `lios_anomaly_fact`.

**Diagnostic queries:**

```sql
-- Last 12 pipeline runs
SELECT run_at, duration_ms, trust_scored, elo_processed,
       mastery_transitions, friction_detectors_fired, anomaly_detected,
       error_message
FROM lios_pipeline_runs
ORDER BY run_at DESC LIMIT 12;

-- Is the cron job itself active?
SELECT * FROM cron.job WHERE jobname = 'lios-pipeline-every-5min';

-- Recent anomalies
SELECT * FROM lios_anomaly_fact ORDER BY detected_at DESC LIMIT 20;
```

**Remediation:** Read `error_message`. The error string includes the failing stage name prefix (`trust=…`, `elo=…`, `mastery=…`, `friction=…`, `anomaly=…`).

**Manual recovery:** Run `SELECT public.lios_run_pipeline('1 hour'::interval)` to force a sweep over any backlog.

---

## Postmortem template

Use this when an incident is customer-visible or persists > 30 minutes.

```markdown
# Postmortem — [SLO that breached] — YYYY-MM-DD

## Summary
[Two-sentence what-happened and impact.]

## Timeline (UTC)
- HH:MM — alarm fired on dashboard
- HH:MM — first investigation
- HH:MM — root cause identified
- HH:MM — fix deployed
- HH:MM — SLO back to green

## Root cause
[Single-paragraph technical explanation.]

## Impact
- Window: [time range]
- Surface: [which dashboards / numbers were affected]
- Customer-visible? [yes / no, and how]
- Did any external claim ship on affected data? [yes / no — if yes, what corrective communication is needed]

## Detection
[How the alarm/dashboard caught it. If detection was slow, propose an anomaly detector rule.]

## Response
[Actions taken, in order.]

## What went well
[2–3 bullets.]

## What went badly
[2–3 bullets — process, tooling, escalation paths.]

## Action items
- [ ] [Specific, assignable, dated.]
- [ ] …

## References
- Affected migrations: …
- Anomaly rows: SELECT … FROM lios_anomaly_fact WHERE …
- Public communication: link if any
```

---

**Distribution.** Save copies of this runbook in `docs/runbooks/LIOS_SLO_RUNBOOKS.md` (already done) and pin in #engineering. Update the diagnostic queries when the SLO definitions change so on-call doesn't run stale SQL during an incident.
