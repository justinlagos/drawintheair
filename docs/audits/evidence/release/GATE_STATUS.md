# Gate status, 7 September 2026

Live production at time of writing: `cca72f5` on `master`, Vercel project `drawintheair`, deployed 25 Aug 2026. Supabase `fmrsfjxwswzhvicylaph`. Release branch `release/new-term`.

## Gate 0, baseline and freeze: PASS
Baseline re-verified today against Vercel and the live database, not from notes. One deviation from the freeze recorded: the 25 Aug push of PR #14 to master deployed while the freeze was nominally in force. Content was equivalent to the audited commit plus two files, so the risk was low. Logged, not repeated.

## Gate 0.5, immediate containment: CLOSED
- WP0.5.1 stale sessions ended 20 Aug. Re-verified today: 0 non-ended sessions.
- WP0.5.2 anon EXECUTE revoked 7 Sept on `dashboard_engagement_deep`, `dashboard_executive_summary`, `dashboard_mastery_summary`, `dashboard_ingest_latency`. External anon probe returns 401 on all four. `/transparency` still 200. Evidence: `WP0.5/WP0.5.2-applied.md`. Migration file recorded in the repo.

## Gate 1A, recovery position and staging: FOUNDER-RUN, IN PROGRESS
Runbook at `WP1A/RUNBOOK.md`. Steps 1 to 6 are Justin's: encrypted nightly dump to storage he owns, monitored by a Better Stack heartbeat, retention window 35 days, restore drill into a temporary project which is then destroyed, staging unpaused with schema only, Vercel preview env repointed. WP1A.3 migration reconciliation is analysed (`WP1A.3/reconciliation-analysis.md`) and blocked on staging existing.

Standing rule confirmed: never run `supabase db push` against production until reconciliation completes. 33 of 39 production migrations read as unapplied to the CLI.

## Gate 1B, canonical release branch and CI: PASS
- WP1B.1: PRs #11, #12, #13 restored onto the master baseline by cherry-pick, not by merging the pre-squash branch. File-level verification in `WP1B.1/merge-train.md`. Lint ratchet set and `check-task.sh` exits 0.
- WP1B.2: `npm ci` in Vercel, Node 20 pinned across local, CI and Vercel, `check-env-safety` fatal in prebuild, CI mirrors the production build and asserts 93 prerendered routes. A production build that is not a Git build of master now fails. Evidence: `WP1B.2/reproducible-builds.md`.

## Gate 2A, database and privacy: DESIGNED, NOT APPLIED
Designs with runnable SQL and rollback in `WP2A.1` to `WP2A.5`. Nothing has been applied. Each is to be rehearsed on staging, dry-run counted, and applied only on written go.
- WP2A.1 retention: anonymity definition written; contract change proposed (delete the row after verified aggregate archive rather than nulling `sessions.code`); k<5 suppression; fixed `class_end_stale_sessions`; sweep for stale `is_connected` rows.
- WP2A.2: 37 dashboard functions classified, 31 admin-only, 3 public, 4 unused. Three of them return per-child rows today to any signed-in account.
- WP2A.3, the release blocker: scoped-claim design using a short-lived signed token minted by an Edge Function, additive RLS, expand and contract sequence. Note the finding that the current client sends no token on realtime at all, so ordering matters.
- WP2A.4: 9 affected accounts, not the 4 the audit estimated. Backfill asserts the count and aborts on mismatch.
- WP2A.5: 31 of 31 `trialing` rows are expired.

## Gate 2B, client packages: COMPLETE ON THE RELEASE BRANCH
All eight merged into `release/new-term`, integrated checks green: type-check pass, lint 0 errors and 160 warnings, 37 test files and 403 tests pass, build writes 93 full-body routes, `check-task.sh` exits 0.

| Package | DIA | State |
|---|---|---|
| WP2B.1 child-route analytics | 009 | merged, 23 new tests |
| WP2B.2 lead capture | 013 | merged, Edge Function and migration pending staging |
| WP2B.3 self-hosted MediaPipe | 020 | merged, own origin first with CDN fallback |
| WP2B.4 camera disconnect recovery | 022 | merged, 26 new tests, hardware test outstanding |
| WP2B.5 entitlement at mode mount | 014 | merged, 14 new tests |
| WP2B.6 ingest canary | 029, 031 | merged, migrations pending staging |
| WP2B.7 retire stale app host | 016 | merged, founder DNS step outstanding |
| WP2B.8 measurement repair | 030, 032 | merged; idle timeout was already in production |
| WP2B.9 robots and Track P text | 017, 038 | merged, 93 routes crawlable, false claims corrected |

## Track P, claims correction: REGISTER COMPLETE, TEXT FIXES MERGED
68 claims registered. Text-only fixes applied in WP2B.9. Three corrections are deferred until their package is live in production, listed in `TRACK-P/README.md`. Do not send `docs/pitch/*` to a school until those ship.

## Gate 3, one controlled deployment: NOT STARTED
Blocked on Gate 1A (no recovery position, no staging rehearsal) and Gate 2A (release blocker WP2A.3 not implemented).

## Gate 4, production proof: NOT STARTED
Needs at least three calendar nights and the 15-item manual matrix on real hardware.

## Gate 5, controlled rollout: NOT STARTED
School onboarding and paid acquisition stay paused.
