# Database Security / Realtime Audit — Draw in the Air (prod)

- Project: `fmrsfjxwswzhvicylaph` (draw-in-the-air, PG17)
- Audit date: 2026-08-15 · Lookback: 2026-07-15 → 2026-08-15
- Mode: STRICTLY READ-ONLY (mcp__Supabase read tools only; no DDL/DML executed)
- Repo reference: `/home/claude/dia-audit/repo` (supabase/migrations/)
- Label key: VERIFIED = confirmed against live prod · INFERENCE = reasoned from verified data · HISTORICAL = past claim, current state noted · UNVERIFIED · ACCESS BLOCKED

---

## 1. Migration history vs repo — DRIFT FOUND [VERIFIED]

Query: `list_migrations` vs `ls repo/supabase/migrations/`.

Prod has **39 tracked migrations** (0004–0010 numbered, then timestamped 20260625154825 → 20260716111014). Repo has **41 migration files**.

### 1a. Prod migrations with NO repo file — 16 [VERIFIED]
`20260625154825 activity_realtime_fix_part1`, `20260625154854 activity_realtime_fix_part2`, `20260625154917 join_pilot_hardening`, `20260625155315 join_align_joinable_states`, `20260625160025 fix_session_status_vocabulary`, `20260626074159 analytics_traffic_type`, `20260626074253 metric_definition_fixes`, `20260626074513 metric_fixes_security_hardening`, `20260626074546 latency_authenticated_only`, `20260626100551 promote_meta_to_columns_trigger`, `20260626100723 observability_real_latency`, `20260626100832 executive_summary_exclude_internal`, `20260702200020 metric_definition_fixes` (duplicate name), `20260702200123 mastery_item_eligibility`, **`20260716110907 classroom_reclaim_roster_link`**, **`20260716111014 dashboard_growth`**.

Notably the two 16-Jul migrations (claim b) are applied in prod but absent from the repo checkout — `grep -r 'reclaim_roster|dashboard_growth|20260716' repo/` returns nothing. Either the deployed checkout predates the 16-Jul merge or the files were never committed. **The repo cannot currently reproduce prod schema.**

### 1b. Repo migrations NOT in prod tracked history — 17 files [VERIFIED]
`0011`–`0024` series (17 files: 0011_rls_perf_and_indexes, 0012, 0013_tenant_isolation, 0014, 0015, 0016, 0017, 0018_platform_admins, 0019, 0020_security_audit_log, 0021_consent_and_deletion_flow, 0022×2, 0023×2, 0024×2). Their **objects DO exist in prod** (tenants, platform_admins, security_audit_log, consent_records, billing cron functions), so they were applied outside tracked migration history (SQL editor / untracked apply). [INFERENCE from object existence + absent history rows]

### 1c. Conflicts [VERIFIED]
- Repo has duplicate version numbers: `0022_*` ×2, `0023_*` ×2, `0024_*` ×2 (different files sharing a version). Numbers 0027 and 0030 are missing entirely.
- Name drift: repo `20260629000006_persistent_learner_p5_consolidation` vs prod `persistent_learner_p5a_teacher_consolidation`.
- Consequence: `supabase db push`/`db diff` against prod is unreliable until history is repaired. Severity: **MEDIUM** (operational, blocks safe new-term schema work).

---

## 2. RLS coverage map [VERIFIED]

Query: `SELECT c.relname, c.relrowsecurity FROM pg_class c JOIN pg_namespace n ... WHERE n.nspname='public' AND c.relkind IN ('r','p')` + `pg_policies`.

**All 50 public tables have RLS enabled. Zero tables with RLS disabled.** All 8 public views (`analytics_events_real`, `dashboard_learner_progression`, `dashboard_trust_composition`, `v_activity_performance`, `v_engagement_metrics`, `v_growth_metrics`, `v_school_overview`, `v_teacher_session_stats`) are `security_invoker=true`/`on` — no definer-view RLS bypass. [VERIFIED via pg_class.reloptions]

Coverage summary (policy style per table; expressions trimmed):

| Table group | Tables | Policy pattern |
|---|---|---|
| Teacher-owned | sessions, session_students, round_scores, class_children, class_session_tokens, classroom_default_activities, student_activity_assignments, playlists, teacher_insights, teachers, teacher_profiles | owner `teacher_id/auth_user_id = auth.uid()` (+ admin leg); child-side legs discussed in §4 |
| Parent/child | parent_profiles, parent_subscriptions, child_profiles, child_learning_state, child_activity_summary, parent_controls, consent_records, data_deletion_requests, billing_events | `parent_id = auth.uid()` / `auth_owns_child()` — clean |
| Admin-only read | analytics_events, skill_state, skill_state_history, mastery_episode_fact, lios_* , human_observation_fact, security_audit_log, admin_alerts, client_errors, form_submissions, newsletter_subscribers, platform_insights | `is_admin_user(auth.uid())` |
| Public read | pricing_config (`USING true`), stripe_price_map (`USING active`), item_difficulty (authenticated `true`), session_activities (`USING true`, public) |
| Deny-all / service-role | platform_admins (`false/false`), broadcast_log, join_rate_limits, session_network_fingerprints (no policies = deny), join_audit_log (service_role insert, teacher read) |
| Tenancy | tenants, tenant_members, schools, school_teachers, school_invites — membership-scoped |

Flags:
- Policies with `USING(true)` reachable by anon: `session_activities` "Read session activities by session" (SELECT, roles {public}) and INSERT `WITH CHECK(true)` on `analytics_events` (anon+authenticated), `client_errors`, `form_submissions`, `newsletter_subscribers`, `human_observation_fact` (authenticated). Inserts are intentional telemetry sinks; `session_activities` SELECT-true leaks activity state of all sessions to anon — LOW on its own, see §4.
- 3 tables RLS-enabled with NO policies (deny-by-default, fine): broadcast_log, join_rate_limits, session_network_fingerprints. [VERIFIED, matches advisor INFO `rls_enabled_no_policy`]

---

## 3. Grants [VERIFIED]

Query: `information_schema.role_table_grants` for anon/authenticated.

- Nearly every public table grants **DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE to both anon and authenticated** (Supabase default broad grant). RLS mediates DML, but **TRUNCATE, TRIGGER, REFERENCES are NOT subject to RLS**. PostgREST doesn't expose TRUNCATE, so exploitability is low, yet this violates least-privilege for a child-data product. Severity: LOW (hardening). Exceptions: `security_audit_log` (no INSERT/UPDATE/DELETE for anon/auth — good), `join_audit_log` (no anon grants — good), `platform_admins` (no anon/auth grants visible in filtered listing + deny-all policy).
- Proposed (do NOT run; for a future PR): `REVOKE TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;` plus targeted `REVOKE DELETE/UPDATE` where no policy ever grants it.

### Function grants / SECURITY DEFINER inventory [VERIFIED]
Query: `pg_proc` + `has_function_privilege(...)` + body scans (`pg_get_functiondef`).

- ~110 public functions are SECURITY DEFINER, owner `postgres`; ~124 executable by authenticated, **28 executable by anon** (matches security advisor WARN `anon_security_definer_function_executable` ×28). Anon-executable set is dominated by intended class-mode RPCs: `class_join`, `class_join_by_ip`, `class_join_with_token`, `class_validate_join*`, `class_get_session/self/activity`, `class_student_heartbeat`, `class_set_readiness`, `session_lookup_by_code`, `get_student_assignments`, `get_student_class_state`, `ingest_analytics_events`, `ingest_learning_attempts`, `landing_public_proof`, `is_admin_user` — plus the dashboard_* leaks below.
- `class_assign_token`, `class_child_anonymise`, `class_child_archive`, `class_child_delete` are anon-EXECUTE. Their bodies reference `auth.uid()` (so anon calls should fail on a null uid teacher check), but anon EXECUTE is unnecessary surface. [VERIFIED grants; body-gating INFERENCE]
- 3 functions with mutable search_path (advisor WARN): `_check_active_has_activity`, `touch_class_children_updated_at`, `lios_is_technical_item_key`.

---

## Claim re-verification

### Claim a — is_admin_user anon EXECUTE (10 Jul) — [VERIFIED, still true]
Query: `SELECT proacl FROM pg_proc WHERE proname='is_admin_user'` → `{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres,anon=X/postgres}`; `has_function_privilege('anon', ..., 'EXECUTE') = true`. Body: `teachers.is_admin OR platform_admins membership`, SECURITY DEFINER, `search_path=public`. Regression test (§5) also clean.

### Claim b — 16 Jul fixes applied — [VERIFIED in prod / DRIFT in repo]
- `20260716110907 classroom_reclaim_roster_link` and `20260716111014 dashboard_growth` are in prod migration history. `class_join` and `class_student_heartbeat` exist and are anon+authenticated EXECUTE.
- `dashboard_growth` IS admin-gated in-body: `if not public.is_platform_admin() then raise exception 'forbidden' using errcode='42501'` [VERIFIED via pg_get_functiondef]. Its EXECUTE is authenticated+service_role only (no anon).
- BUT: neither migration file exists in the repo (§1a) — the repo does not reflect these prod changes.

### Claim c — older dashboard_* RPCs ungated — [VERIFIED, STILL UNRESOLVED]
Query: body scan of all `dashboard_*` functions for admin/auth/jwt/raise + full def heads of dashboard_funnel/today/executive_summary/public_proof.
- **33 dashboard_* functions are SECURITY DEFINER with NO in-body auth check** (no admin call, no auth.uid, no jwt, no raise). All are EXECUTE-granted to `authenticated`. **7 are also EXECUTE-granted to `anon`**: `dashboard_engagement_deep`, `dashboard_executive_summary`, `dashboard_ingest_latency`, `dashboard_mastery_summary`, `dashboard_public_proof`, `dashboard_transparency_report`, `dashboard_transparency_signals` (public_proof/transparency_* may be intentionally public for the landing page).
- Only `dashboard_growth` (new) is gated. The rest read `analytics_events`/`learning_attempts`/`skill_state` etc. as definer, bypassing the admin-only RLS on those tables. Exposure is platform-wide aggregates (funnels, retention, latest sessions, top learners — `dashboard_progression_top_learners` and `dashboard_latest_sessions` may surface per-learner/session-level rows) to ANY authenticated account (any parent/teacher signup). Severity: **HIGH** (cross-account data exposure; product/telemetry data, not direct child PII, but `dashboard_latest_sessions`/`dashboard_classrooms` warrant content review).
- Proposed fix (findings only, not executed): add the same `is_platform_admin()` guard to each dashboard_* plpgsql body, or `REVOKE EXECUTE ON FUNCTION public.dashboard_… FROM authenticated, anon;` keeping only intentionally-public ones.

---

## 5. Realtime [VERIFIED]

- `pg_publication_tables` for `supabase_realtime`: exactly 4 tables — `public.sessions`, `public.session_students`, `public.round_scores`, `public.session_activities`.
- SELECT-policy functions on published tables: `is_admin_user` (anon+auth EXECUTE ✓), `auth.uid()` (built-in ✓); `session_activities` is `USING(true)`. No policy on published tables references a function anon cannot execute → the 10-Jul apply_rls failure mode cannot recur with current policies. [VERIFIED]
- `query_logs` last 24h (`event_message ILIKE '%permission denied%' OR '%apply_rls%'` across all sources): **0 rows**. [VERIFIED — window limited to 24h by the API; the full 15 Jul–15 Aug window is ACCESS BLOCKED by the 24h log-window cap]

---

## 4+5. Classroom state integrity [VERIFIED]

Query (single SELECT of counts):
- `sessions` by status: `{ended: 2, lobby: 3, playing: 1}` — 0 rows outside vocab (lobby/active/playing/paused/ended).
- **Stale live sessions: 4** — i.e. *every* non-ended session (3 lobby + 1 playing) was created >14 days ago and never ended. `class_end_stale_sessions()` exists but **no cron job calls it** (cron.job list §8 has no such job). [INFERENCE: stale cleanup not scheduled]
- `session_students`: 32 total; `is_active` is a GENERATED ALWAYS column mirroring `is_connected` (also `student_name` generated from `name`) [VERIFIED via information_schema.columns]. 26/32 linked to `class_children` via `class_child_id`, 6 unlinked.
- Duplicate-name suffix rows (`name ~ '^[A-Za-z]+[0-9]+$'`): **0** — the pre-reclaim suffix artifacts are gone.
- `round_scores` orphans (no matching session): **0**.

**Security consequence of stale sessions [HIGH, INFERENCE from verified policies + counts]:** `sessions_select` USING includes `OR (status <> 'ended')` and `session_students_select_scoped` includes the same leg — so **any holder of the anon key can SELECT every non-ended session (including its join `code`) and every student row (child first names, 32 rows incl. the 4 stale sessions' rosters)**. This is the mechanism that lets un-authenticated pupils see the lobby, but combined with never-ending sessions it becomes a persistent anon-readable roster of child first names and joinable class codes. Proposed direction (findings only): scope the anon leg to a session the client can name (code-based RPC like `session_lookup_by_code`/`class_get_session` already exist), or at minimum schedule `class_end_stale_sessions()` (e.g. hourly cron) so the exposure window closes.

---

## 6. Advisors [VERIFIED]

Security (159 lints, **0 ERROR**): WARN `anon_security_definer_function_executable` ×28; WARN `authenticated_security_definer_function_executable` ×124; WARN `function_search_path_mutable` ×3 (`_check_active_has_activity`, `touch_class_children_updated_at`, `lios_is_technical_item_key`); WARN `auth_leaked_password_protection` ×1 (**HaveIBeenPwned check disabled** — enable in Auth settings; remediation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); INFO `rls_enabled_no_policy` ×3 (deny-by-default tables, OK).

Performance (106 lints, 0 ERROR): WARN `auth_rls_initplan` ×24 (per-row `auth.uid()` re-eval — parent_profiles, child_profiles, class_session_tokens, parent_controls…); WARN `multiple_permissive_policies` ×20 (child_activity_summary, child_learning_state, learning_attempts, parent_controls — overlapping `*_write` ALL + per-cmd policies, see §2); INFO unindexed FKs ×40, unused indexes ×21, table_bloat ×1 (`_http_response`). Parsed lint dumps saved: `findings/advisors_security.json`, `findings/advisors_performance.json`.

---

## 7. Edge functions [VERIFIED]

16 functions, all ACTIVE. Latest `updated_at` values (ms epoch → date): join-class v7 (2026-06-25), announce v2 (2026-06-26), pilot-welcome v1 (2026-06-30) are the newest. **No edge function was created or updated during 15 Jul–15 Aug 2026** — consistent with "nothing changed" for functions. Non-JWT (`verify_jwt=false`) functions: analytics-digest, stripe-webhook, email-dispatch, billing-health, send-laptop-link, billing-diagnostics, announce, pilot-welcome — expected for webhook/cron endpoints, but `billing-diagnostics` and `send-laptop-link` being publicly invokable deserves an app-layer auth check review (out of scope here). [INFERENCE]

## 8. Storage [VERIFIED]

`SELECT ... FROM storage.buckets` → **0 buckets**, `storage.objects` → 0 rows. No storage at all; therefore no public bucket holding child data. Consistent with the "no video/image storage" product rule.

## 9. Auth / profile drift [VERIFIED]

Counts only: auth.users total **43**; teachers 8; teacher_profiles 8; parent_profiles 41; auth users with no row in teachers/teacher_profiles/parent_profiles: **0**. (8+41=49 > 43 → ~6 accounts hold both teacher and parent rows — dual-role, not orphaned. [INFERENCE]) Dual profile models confirmed: legacy `teachers` + newer `teacher_profiles` both live (8/8). Lookback signups (created_at ≥ 2026-07-15): auth.users **3**, parent_profiles **3**, i.e. all 3 new signups are parents; no new teachers in window.

## 10. Backups / PITR — ACCESS BLOCKED

No read tool in the permitted set (list_tables/migrations/edge_functions/extensions, get_advisors, execute_sql, query_logs) exposes backup or PITR configuration. Needs: Supabase Management API (`GET /v1/projects/{ref}/database/backups`) or dashboard Settings → Database → Backups. Flag for a human check before term start.

## 11. Retention / PII surfaces [VERIFIED]

- Child free-text/PII columns: `class_children.first_name` (34/34 populated; notes 0, nickname 0 — PII-minimisation holding), `session_students.name` (32/32, child first names — anon-readable while session not ended, see §4/5). No image/blob columns; no storage buckets.
- `analytics_events.meta` keys, 3-row sample (keys only): `fps, attempt_id, environment, missing_pct, window_size, traffic_type` — technical telemetry, no PII keys observed. Top-level columns include `device_id`, `referrer`, `utm_*` (pseudonymous, expected).
- Retention crons exist: prune analytics_events + learning_attempts >365d (jobs 3,4 — succeeding daily).

## BONUS — Failing nightly cron jobs [VERIFIED, HIGH operational]

Query: `cron.job` + `cron.job_run_details` (7 days).
- **Job 2 `retention-purge` (0 2 * * *): FAILED all 7 of last 7 nights** — `ERROR: null value in column "code" of relation "sessions" violates not-null constraint`. The purge transaction (expired teacher_insights/platform_insights deletes + apparently a sessions anonymisation step that nulls `code`) rolls back entirely, so **no retention purge has completed for at least a week** on a child-data product with stated retention commitments. Proposed direction: make the sessions step set a sentinel (`code = 'ENDED-'||id`) or drop the NOT NULL, in a dedicated migration.
- **Job 1 `refresh-materialized-views` (0 3 * * *): FAILED all 7 nights** — `"v_teacher_session_stats" is not a table or materialized view`: the v_* objects were converted to plain security-invoker views but the cron was never updated. Harmless per-run, but masks real failures and pollutes job history.
- Jobs 3–9 (prunes, digest, anomaly check, lios pipeline, email-dispatch, billing-health) all succeeding.

---

## Top findings (severity suggestions)

1. **HIGH — retention-purge cron failing nightly for ≥7 days** (rolls back on sessions.code NOT NULL); retention/deletion commitments not being executed. [VERIFIED]
2. **HIGH — claim c confirmed: 33 ungated SECURITY DEFINER dashboard_* RPCs** executable by all authenticated (7 by anon), bypassing admin-only RLS on analytics/learning tables; only dashboard_growth is gated. [VERIFIED]
3. **HIGH — anon can read all non-ended sessions (join codes) + child first-name rosters** via `status <> 'ended'` policy legs, amplified by 4 stale live sessions >14 days old and no scheduled `class_end_stale_sessions`. [VERIFIED policies/counts, INFERENCE on impact]
4. **MEDIUM — migration drift**: 16 prod migrations missing from repo (incl. both 16-Jul fixes), 17 repo files (0011–0024) never tracked in prod, duplicate repo versions 0022/0023/0024 — schema tooling unreliable before new-term changes. [VERIFIED]
5. **MEDIUM — auth leaked-password protection disabled** (advisor WARN); plus LOW hardening items: broad anon TRUNCATE/TRIGGER table grants, 3 mutable-search_path functions, failing matview-refresh cron, anon EXECUTE on class_child_delete/anonymise/archive.

Claim a: VERIFIED still in place; no apply_rls/permission-denied errors in last-24h logs; realtime publication policies reference only anon-executable functions.
