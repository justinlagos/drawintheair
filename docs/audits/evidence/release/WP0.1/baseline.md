# WP0.1 — Fresh baseline (Gate 0)

**Executed:** 2026-08-20 12:25–12:40 UTC · **Method:** read-only (Vercel metadata, git ls-remote, Supabase SELECT only) · **No writes performed.**

> Note: the audit was authored under a nominal date of 15 August. Real elapsed time to this baseline is **5 days**. All figures below supersede the audit's.

## 1. Code / deployment — UNCHANGED
| Item | Value |
|---|---|
| Production deployment | `dpl_9GNY6QoBhvLEg7n375RgEgKJCwHi`, promoted 2026-07-20 19:48 UTC |
| Production SHA | `6a81fdf6eb84495e1a42f7f48a6a0e4f466c6880` (feat/ssg-prerender, PR #14) |
| Deployments since | **None.** Query for deployments after 2026-08-06 returned count 0 |
| Git remote heads | Identical to audit; **no new commits on any branch since 2026-07-20** |
| Tags | Only `production-before-release-workflow-20260625`; new tag `production-2026-08-20-prerelease` created LOCALLY — **needs founder push** |

Freeze status: holding by default — nobody has deployed.

## 2. Scheduled jobs — 2 failing, 7 healthy
| Job | 7d runs | 7d fail | Last success | Error |
|---|---|---|---|---|
| retention-purge | 7 | **7** | 2026-06-06 | `null value in column "code" of relation "sessions" violates not-null constraint` |
| refresh-materialized-views | 7 | **7** | 2026-03-10 | `"v_teacher_session_stats" is not a table or materialized view` |
| billing-health-15m | 672 | 0 | 2026-08-20 12:22 | — |
| dita-anomaly-check | 672 | 0 | 2026-08-20 12:15 | — |
| dita-daily-digest | 7 | 0 | 2026-08-20 07:00 | — |
| dita-prune-analytics-events | 7 | 0 | 2026-08-20 03:00 | — |
| dita-prune-learning-attempts | 7 | 0 | 2026-08-20 03:05 | — |
| email-dispatch-15m | 672 | 0 | 2026-08-20 12:15 | — |
| lios-pipeline-every-5min | 2016 | 0 | 2026-08-20 12:25 | — |

**ESCALATION (DIA-008):** grouping every failed run by error message returns **one row: 104 failed nights, first 2026-04-09, last 2026-08-20**, identical error throughout. The audit reported ~30 nights; the true figure is **104 nights across 4.5 months**. (`last_success` of 2026-06-06 indicates one night with no in-scope rows.)

**Mitigating nuance:** `dita-prune-analytics-events` and `dita-prune-learning-attempts` succeed nightly, so analytics/attempt-level pruning IS running. The dead job is session-level retention — which is where child names live.

Today's blocking row: session `84352bde…`, created and ended 2026-07-14. The purge sets `code = NULL` on it; the NOT NULL constraint rejects it; the whole transaction rolls back.

## 3. Session exposure — CONCRETE
6 sessions total. **4 non-ended, every one carrying a live join code, all >14 days old:**

| Session | Status | Created | Students | Named children | Roster-linked |
|---|---|---|---|---|---|
| cc8f85fc… | lobby | 2026-05-08 | 0 | 0 | 0 |
| 0b666ae4… | lobby | 2026-06-06 | 0 | 0 | 0 |
| ca2bf24e… | lobby | 2026-06-24 | 0 | 0 | 0 |
| **4ce5fd6c…** | **playing** | **2026-06-30** | **29** | **29** | **26** |

`4ce5fd6c` is the pilot class. Last student activity **2026-07-13** — idle **38 days** — yet all 29 rows are still flagged `is_connected = true` (stale presence, the heartbeat consequence).

**Consequence:** because the anon RLS leg is `status <> 'ended'`, 29 real children's first names have been anonymously readable for 51 days. No lesson has touched this session in 38 days, so ending it cannot interrupt anyone.

## 4. Analytics ingest — ALIVE (audit ambiguity resolved benign)
| Metric | Value |
|---|---|
| Newest event | 2026-08-20 07:41 UTC (**4h44m old**) |
| Last 24h | 579 events |
| Last 7 days | 12,324 events across **7/7 active days** |

The audit's ~28h silence was a quiet weekend, as hypothesised — **not** a dead pipe. DIA-029 loses urgency as an outage but the **detection gap stands**: nothing would have distinguished these two cases. The canary (WP2B.6) remains required.

## 5. Signup → trial — DIAGNOSIS CORRECTED
| Signed up | role metadata | parent_profile | subscription |
|---|---|---|---|
| 2026-07-01 ×3 | `parent` | yes | **yes** (trialing) |
| 2026-07-01 ×1 | `(none)` | yes | **no** |
| 2026-07-19 | `(none)` | yes | **no** |
| 2026-07-27 | `(none)` | yes | **no** |
| 2026-07-28 | `(none)` | yes | **no** |
| **2026-08-19** | `parent` | yes | **yes** (trial_end 2026-08-26) |

**The trigger is not broken.** It fires correctly whenever role metadata is present — including a new signup on 19 August. The defect is that **one signup path stamps `role` and another does not**, and both are live. Affected accounts: **4** (not 3).

**Decisive for WP2A.4:** all four role-less accounts DO have a `parent_profiles` row. Anchoring trial creation to verified parent-profile creation — your proposed fix — would have caught every one. Defaulting role-less accounts to `parent` would have been wrong for a different reason: it is unnecessary.

Subscriptions now: **30 trialing** (only 1 with a future `trial_end`), **2 active**, 0 canceled/past_due. 29 zombies confirmed (DIA-015).

## 6. Dashboard RPC surface — live count
37 `dashboard_*` functions, all SECURITY DEFINER. **36 carry no admin guard; only `dashboard_growth` does. 7 are anon-executable.** (Audit said 33 ungated; live database supersedes it per precedence rule §0.8.)
