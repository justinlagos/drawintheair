# Production apply, 9 September 2026 — Gate 2A database packages

Justin's written go, in chat: "number 1 go for it", authorising WP2A.4, WP2A.5
and WP2A.2. Applied by Claude via the Supabase MCP against
`fmrsfjxwswzhvicylaph`. Each file was transcribed and, where the tooling
allowed, proved byte-identical to the repo copy by sha256 before applying.

## Pre-flight, taken immediately before

| | value |
|---|---|
| dashboard_* functions | 37 |
| anon-executable | 3 |
| authenticated-executable | 37 |
| guarded | 1 |
| accounts with a parent profile and no trial | 9 |
| parent_subscriptions | 33 (active 2, trialing 31) |
| trialing rows eligible to expire | 31 |
| `/transparency` | 200 |
| anon `dashboard_transparency_report` | 200 |
| anon `dashboard_transparency_signals` | 200, `"days": 90` |
| anon `dashboard_public_proof` | **500, 57014 statement timeout** |

Every pre-flight number matched the staging rehearsal exactly.

Also confirmed before applying, because the guard could have locked the founder
out of his own dashboard: `platform_admins` is empty and exactly one teacher row
carries `is_admin`, and it is Justin's account, so `is_platform_admin()` is true
for him.

## 1. WP2A.4 parent trial anchor — APPLIED, verified

sha256 `7294ce03…a0161`, transcription proved identical by diff before applying.

| check | before | after | expected |
|---|---|---|---|
| accounts missing a trial | 9 | **0** | 0 |
| parent_subscriptions | 33 | **42** | 42 |
| trials ending in 7 days | 0 | **9** | 9 |
| anchor trigger present | no | **yes** | yes |

**One number needed investigating.** A stricter check than the rehearsal used
(`teachers` OR `teacher_profiles`, rather than `teachers` alone) showed 7
subscriptions belonging to teacher accounts. Checked their `created_at`: 28 May
to 18 June, none within 30 minutes of the apply. They are pre-existing damage
from the period before any guard existed, not something this migration created.
Two of the seven are `active`. Logged for cleanup; not touched here.

## 2. WP2A.5 expired trials — APPLIED, verified

sha256 `745cadde…c39ed`, transcription proved identical by diff before applying.

| status | before | after |
|---|---|---|
| active | 2 | **2** |
| trialing | 31 | **9** (the new ones, ending in 7 days) |
| trial_expired | 0 | **31** |

`still_eligible` 0. `stripe_managed_touched` 0. Nightly job
`expire-parent-trials-nightly` active at `30 1 * * *`.

## 3. WP2A.2 dashboard lock-down — APPLIED, verified, then two follow-ups

| check | before | after | expected |
|---|---|---|---|
| dashboard_* functions | 37 | **33** | 33 |
| anon-executable | 3 | **3** | 3 |
| guarded | 1 | **30** | 30 |
| `_impl` functions | 0 | **32** | 32 |
| `_impl` reachable by anon or authenticated | n/a | **0** | 0 |

Anon-executable are exactly the three intended: `dashboard_public_proof`,
`dashboard_transparency_report`, `dashboard_transparency_signals`.

Security win confirmed from a real browser as an anonymous visitor:
`dashboard_latest_sessions` and `dashboard_progression_top_learners` now return
**401 / 42501 permission denied**. Those returned per-learner rows to any
signed-in account before.

### Follow-up 1 — `20260914000007`, a regression I introduced and fixed

`dashboard_public_proof` went from failing about one anon call in three to
failing **every** call. Cause: the `anon` role has `statement_timeout = 3s`, the
underlying query scans ~813k rows at 1.4s to 3.1s, and the 60-second memo in
WP2A.2 is written by the very call that has to succeed first. Once the compute
consistently exceeded 3s the cache could never populate. Two consecutive anon
calls, both 500 at ~3.07s.

Fixed by removing computation from the anonymous path entirely: a cron job
refreshes the cache every minute as the job owner, where the 3s limit does not
apply, and the function serves whatever is cached however old. Cache warmed
inside the migration. After: four consecutive anon calls, all **200 in 50ms to
278ms** — better than the pre-release state.

### Follow-up 2 — `20260914000008`, the real mistake

WP2A.2's small-cohort suppression nulls four fields. The **deployed** client
types `classrooms_engaged` as a number and calls `.toLocaleString()` on it. The
null-tolerant client exists on `release/new-term` but is not deployed. So
applying the database half alone put the public `/transparency` page into its
error boundary: "Something got stuck."

This is exactly the coupling the brief's expand-and-contract rule exists to
prevent, and the rehearsal had flagged the client dependency. I applied a
schema-side change ahead of the client change it depends on. The database half
was reverted within minutes and the page confirmed rendering again by
screenshot.

The suppression is preserved as `20261001000001`, **not applied**, with a header
requiring the client to be live and `/transparency` verified before it runs.

Residual exposure until Gate 3: a count of distinct classroom join codes and
three mode names, below the k=5 threshold. No child identifier. A broken public
page was the larger harm.

## What is now true in production

- No signed-in account can reach the admin analytics RPCs. Three per-learner
  functions closed.
- 9 families have a working trial, running from today, not backdated.
- 31 stale trials correctly marked expired, with a nightly job to keep it so.
- The public proof endpoint is healthy and fast for the first time in a while.
- `/transparency` renders.

## Lesson recorded

Rehearsing on staging proved the SQL correct in isolation. It did not catch the
coupling, because staging has no deployed client of its own to break. Any
migration that changes a **response shape** an existing client reads must ship
in the same release as that client, or behind a flag, whatever the staging
rehearsal says. The three still-pending database changes were checked against
this rule afterwards: none of them alters a response shape the live client
reads.
