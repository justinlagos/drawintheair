# WP1A.3 — Migration reconciliation analysis (READ-ONLY, nothing applied)

**Executed:** 2026-08-20 UTC · Prod history: 39 entries · Repo files: 40 `.sql` (root `supabase/migrations/`)
**Method:** per founder correction — preserve history, extract live definitions, prove object equivalence. **No migration bodies invented, no versions renamed.**

## Four-way classification

### A. Exact match — version AND name agree (7)
`0004_parent_subscriptions`, `0005_rls`, `0006_rpcs`, `0007_parent_subscriptions_v2`, `0008_teacher_profiles`, `0009_security_hardening`, `0010_revoke_anon_execute_internal_rpcs`

### B. Name matches, VERSION DOES NOT (16) — the practical blocker
| Repo file | Prod version |
|---|---|
| `0025_classroom_realtime_restore_is_admin_user_execute` | `20260710101104` |
| `0026_class_student_heartbeat` | `20260710111421` |
| `0028_fix_session_lookup_status_vocab` | `20260626055435` |
| `0029_restore_class_join_function` | `20260626060611` |
| `0031_broadcast_log` | `20260626075729` |
| `20260629000001…p1_class_children_pii_minimise` | `20260629180319` |
| `20260629000002…p2_readiness_state` | `20260629180322` |
| `20260629000003…p3a_set_readiness_rpc` | `20260629180329` |
| `20260629000004…p3b_token_join` | `20260629180351` |
| `20260629000005…p4_deletion` | `20260629180357` |
| `20260629000006…p5_consolidation` | `20260629180400` |
| `20260629000007_fix_class_end_activity_idempotent` | `20260629203559` |
| `20260701000001_parent_trial_on_signup_trigger` | `20260701151623` |
| `20260703000001_dashboard_funnel_honesty` | `20260703074707` |
| `20260709000001_analytics_ingest_rpc` | `20260709132926` |
| `20260709000002_dashboard_funnel_real_ladder` | `20260709132946` |

**Consequence:** the CLI matches on version, not name. These 16 read as *unapplied*.

### C. Repo-only — no prod history row (17), but **ALL PROVEN APPLIED**
`0011`–`0024`, including the duplicated numbers `0022`×2, `0023`×2, `0024`×2.

Object-equivalence probe — 20 marker objects across all 17 files, **every one present in production**:

| Migration | Marker probed | In prod |
|---|---|---|
| 0011_rls_perf_and_indexes | index `sessions_current_activity_id_idx` | ✅ |
| 0012_learning_attempts_policy_consolidation | policy `attempts_insert` | ✅ |
| 0013_tenant_isolation | fn `_ensure_tenant` | ✅ |
| 0014_parent_trial_7_days | fn `start_parent_trial` | ✅ |
| 0015_email_dispatch_cron | cron `email-dispatch-15m` | ✅ |
| 0016_email_cron_key_rpc | fn `get_email_cron_key` | ✅ |
| 0017_signup_role_hardening | fn `handle_new_parent_user` | ✅ |
| 0018_platform_admins | fn `is_platform_admin` + table `platform_admins` | ✅ ✅ |
| 0019_school_admin_role | fn `is_school_admin`, `get_account_roles` | ✅ ✅ |
| 0020_security_audit_log | fn `log_security_event` | ✅ |
| 0021_consent_and_deletion_flow | fn `export_family_data`, `process_account_deletion_requests` | ✅ ✅ |
| 0022_parent_subscriptions_last_event_at | col `parent_subscriptions.last_event_at` | ✅ |
| 0022_session_read_hardening | fn `class_get_session` | ✅ |
| 0023_billing_activation_email_flag | col `parent_subscriptions.activated_sent_at` | ✅ |
| 0023_learning_attempts_write_hardening | policy `attempts_update` | ✅ |
| 0024_billing_health_cron | cron `billing-health-15m` | ✅ |
| 0024_subscription_event_ordering | col `parent_subscriptions.last_event_at` | ✅ |

**This is the good outcome: no schema is missing. The gap is bookkeeping only.** These may be marked applied — the equivalence proof the method requires is now on file.

### D. Prod-only — applied, no repo file (16)
`20260625154825` activity_realtime_fix_part1 · `20260625154854` part2 · `20260625154917` join_pilot_hardening · `20260625155315` join_align_joinable_states · `20260625160025` fix_session_status_vocabulary · `20260626074159` analytics_traffic_type · `20260626074253` metric_definition_fixes · `20260626074513` metric_fixes_security_hardening · `20260626074546` latency_authenticated_only · `20260626100551` promote_meta_to_columns_trigger · `20260626100723` observability_real_latency · `20260626100832` executive_summary_exclude_internal · `20260702200020` metric_definition_fixes · `20260702200123` mastery_item_eligibility · **`20260716110907` classroom_reclaim_roster_link** · **`20260716111014` dashboard_growth`**

Note `metric_definition_fixes` appears **twice** (`20260626074253`, `20260702200020`) — same name, different versions.

## Headline risk
**33 of 39 prod migrations (B + D) would be treated as unapplied by the CLI**, and 17 repo files are untracked. A naive `supabase db push` against production would attempt to re-run ~33 migrations. Several are `CREATE OR REPLACE` (tolerant), but the `CREATE TABLE` / `CREATE POLICY` / `cron.schedule` ones would error or duplicate.

**Do not run `db push` against production under any circumstances until this is reconciled.**

## Proposed approach (NOT executed — for approval at Gate 1A)
1. **Preserve** the 39 prod history rows verbatim. Snapshot them to `docs/audits/evidence/release/WP1A.3/prod_migration_history.json` first.
2. **Category C (17):** mark applied via repair, citing this equivalence table. No file changes.
3. **Category B (16):** align the repo filename version to the prod version — a **rename only**, no body edits. This is the opposite of inventing history: it makes the repo agree with what the database records.
4. **Category D (16):** extract current live definitions and write them into **new timestamped reconciliation migrations** clearly labelled as baselines reconstructed from live state on 2026-08-20 — explicitly *not* claimed to be the original SQL.
5. **Duplicates:** resolve `0022/0023/0024` collisions during the category-C repair.
6. **Scope the diff** to application-owned schemas (`public`, `app_private`). Differences in `auth`, `storage`, `realtime`, `extensions`, `cron` are Supabase-managed and are **not** findings.
7. **Acceptance:** a database built from repo migrations matches production across `public` + `app_private`, or every residual difference is listed with justification.

**Blocked on:** staging (WP1A.2) and the dump routine (WP1A.1) — both founder-credentialed. This analysis is the read-only half and is complete.
