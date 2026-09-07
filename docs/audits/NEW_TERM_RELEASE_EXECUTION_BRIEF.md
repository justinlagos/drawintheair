# New-Term Readiness Release — Execution Brief (v2, corrected)

**Status:** **APPROVED for execution by Justin, 7 September 2026** (parallel execution authorised; Gate 2 code waits for the Gate 1B canonical branch). Gate 0.5 closed 7 Sept.
**Authored:** 15 August 2026 · **Owner:** Justin (founder, sole approver) · **Supersedes:** v1 (retained as `NEW_TERM_RELEASE_EXECUTION_BRIEF.v1.md`)
**Companions:** `NEW_TERM_READINESS_AUDIT_2026-08-15.md` · `NEW_TERM_ISSUE_REGISTER_2026-08-15.csv` · `evidence/`

**Operating decision:** marketing site and anonymous free play stay online; new classroom pilots and paid acquisition are paused; one controlled release is built and proven; school onboarding reopens only when the gates pass.

## What changed in v2, and why

v1 contained four defects that would have reproduced the failures it was written to prevent:

1. **Gate-order contradiction.** Gate 0 froze production deploys until Gate 3, while Gate 2 required consent, lead capture and trial fixes to be *verified in production*. Impossible as written. More importantly, v1 had Gate 2 code written against `feat/ssg-prerender` and *then* merged the release lineage in — which is the DIA-001 failure mode exactly. **The release branch now exists before any package is written against it.**
2. **Backup/staging conflict.** WP1.1 restored production into staging; WP1.2 forbade production data in staging. Beyond the contradiction, putting real child records into a long-lived staging project is itself a data-protection failure. **Recovery drill and development staging are now separate environments with different data rules.**
3. **Impossible retention rollback.** Standing rule 5 demanded a rollback migration for every change, including a purge whose entire purpose is irreversibility. **Rollback is now split three ways: code rollback permitted, data recovery prohibited, failure safety by same-transaction archive verification.**
4. **DIA-007 was both deferrable and a gate condition.** **Stage B is now a release blocker; if no safe capability model completes, Class Mode stays disabled and rollout stays paused.**

Also corrected: migration reconciliation method, analytics alarm replaced by a canary, DIA-005 and DIA-016 promoted into the release, expanded live matrix with conditional blockers.

**New information since v1:** Supabase **free-plan projects receive no automated backups** (Supabase's own guidance is to run `db dump` regularly and hold off-site copies). DIA-037 therefore cannot be closed by verification — WP1A.1 must *build* a recovery position. Production child and school data currently has none.

---

## 0. Standing rules — every session, every package

1. **Fresh clone.** Never start from `drawintheair-master.zip` (`1b5abae`, stale master).
2. **Re-verify the production SHA from Vercel before touching anything.** At authoring time `6a81fdf6eb84495e1a42f7f48a6a0e4f466c6880`. If it differs, stop and re-baseline.
3. **One work package = one PR**, within the stated scope boundary.
4. **Log, don't fix.** Out-of-scope discoveries go to `docs/audits/RELEASE_FINDINGS_LOG.md` untouched.
5. **Change protocol — replaces v1's blanket "rollback first" rule.** Every database change requires, in order: rehearsal on staging → dry-run counts → founder go in writing → apply → verify with the same counts → migration file lands in the repo in the same PR. Additionally:
   - **Reversible changes** (grants, policies, function definitions, additive structures): write the rollback migration before the forward one.
   - **Irreversible changes** (destruction of personal data): a data rollback is *prohibited by design*. Safety comes from same-transaction archive verification with abort on failure, plus code rollback of the function definition. See WP2A.1.
6. **Evidence** to `docs/audits/evidence/release/<package-id>/`. No evidence, no pass.
7. **Gate exits are binary.**
8. **Source-of-truth precedence:** live Vercel metadata > deployed commit > observed production behaviour > live database > branches > findings files > historical documents. **Where the live database contradicts a findings file, the database wins.**
9. **Expand and contract** wherever code and schema are coupled: add backwards-compatible structures → deploy the compatible client → verify in production → only then remove old structures. Never ship a policy change and its dependent client change as one irreversible step.
10. **One package per Claude Dev session.** Never "fix all 39 issues".

---

## Decisions taken — do not re-litigate

| Decision | Choice | Consequence |
|---|---|---|
| Retention contract (DIA-008) | Archive anonymised aggregates; irreversibly destroy identifiers | Larger migration; requires an anonymity definition (WP2A.1) |
| Staging spend | **Zero additional spend** | No Supabase branching. Free plan, 2 active project slots — see slot arithmetic in Gate 1A |
| Recovery position (DIA-037) | **Self-run scheduled dumps to storage you own** | You own and must monitor it; an unmonitored dump job is another DIA-008 |
| Containment | **Immediate carve-out for zero-coupling database fixes** | Gate 0.5 exists; exposure closes in hours, not weeks |
| Document claims | Parallel non-code track | Track P; nothing outward-facing ships until it signs off |

---

## Gate 0 — Fresh baseline

### WP0.1 — Re-baseline (read-only, ~1 hour)
Re-establish, fresh, rather than trusting this brief: active production deployment ID/SHA/timestamp; count and age of non-ended sessions; `cron.job_run_details` status for all jobs over 7 days; newest analytics event timestamp; signups since 15 July versus trials created; Supabase project statuses and plan.

Tag the current production commit: `git tag production-2026-08-15-preaudit 6a81fdf && git push origin --tags`.

**Freeze:** no manual Vercel promotes by anyone until the Gate 3 deployment. This freeze governs *client deployments only* — it does not block the Gate 0.5 database containment below.

**Exit:** one verified baseline, tagged, freeze in force.

---

## Gate 0.5 — Immediate containment (database only, no deployment)

**Purpose:** stop live child-data exposure now rather than in seven to twelve days. **Strictly limited to changes with provably zero coupling to the deployed client.** Coupling is proven by grepping the deployed commit for call sites — not assumed.

### WP0.5.1 — End and expire stale sessions (DIA-007 Stage A)
End the non-ended sessions identified in WP0.1; schedule the existing `class_end_stale_sessions()` so sessions expire automatically. No classroom has run since 14 July, so no live lesson can be interrupted — **confirm that from WP0.1 data before applying**.

### WP0.5.2 — Revoke provably unused anonymous execute grants (part of DIA-006)
For each of the seven anon-executable `dashboard_*` functions, grep the deployed commit for an anonymous call site. **Revoke only those with none.** Functions the marketing site genuinely calls anonymously (the public-proof and transparency family are the likely ones) are *not* touched here — they go to WP2A.2 for rewriting as aggregate-only. Guessing wrong here breaks the live marketing site.

**Exit:** stale-session exposure closed; anonymous execute surface reduced to functions with a proven caller; production client untouched and unredeployed.

---

## Gate 1A — Recovery position and synthetic staging

**Slot arithmetic (free plan, 2 active projects, production occupies 1):** run the recovery drill first using the second slot for a temporary target, destroy it, then bring up staging in that slot. The two cannot coexist.

### WP1A.1 — Build a recovery position (DIA-037) — founder-run
Free-plan projects have **no automated backups**. Build one:
- Scheduled `supabase db dump` (schema and data) to storage you control.
- **Encrypted at rest, access-controlled** — these dumps contain child first names and customer records.
- **Monitored.** A silent dump failure is DIA-008 again. The job reports success to the same channel as the analytics canary (WP2B.5).
- **Retention on the dumps themselves.** Purged identifiers survive in old backups; a backup kept forever silently defeats WP2A.1. Define and enforce a dump retention window as part of the retention contract.
- **Drill:** restore one dump into a temporary isolated project, verify table counts, then **destroy that project**. The drill proves the routine, since there is no platform feature to verify.

### WP1A.2 — Synthetic staging (DIA-036)
Unpause `dcivdrhxeaiulbbhsgfv` in the freed slot. Seed **production schema only** — no production rows. Generate synthetic children, teachers, subscriptions and sessions. No real child names, emails or customer records enter staging at any point.

Re-point **Vercel preview** environment variables at staging so previews stop writing to production.

**Free-tier caveat:** projects auto-pause after ~7 days idle. Touch staging regularly or plan for unpause delay.

**Acceptance:** a preview deployment writes to staging and leaves production untouched, proven by row counts on both.

### WP1A.3 — Migration reconciliation (DIA-004)
**Do not "export the 16 production migrations".** Original historical SQL cannot be reconstructed from final database state, and inventing migration bodies or renaming applied versions creates a false history that is worse than an honest gap. Method:

1. **Preserve** the production migration-history records as-is.
2. **Extract current definitions** for affected tables, policies, triggers and functions from the live database.
3. **Compare** every supposedly-applied repo migration against the live object it was meant to create.
4. **Create timestamped reconciliation/baseline migrations** representing the verified current state.
5. **Mark earlier migrations applied only after proving object equivalence** — never on assumption.
6. **Scope the comparison to application-owned schemas.** Do not expect a clean diff across Supabase-managed `auth`, `storage` and internal schemas; differences there are expected and are not findings.

**Acceptance:** a database built from repo migrations matches production across application-owned schemas, or every remaining difference is listed with written justification.

**Gate 1A exit:** a monitored, encrypted, drill-proven recovery routine exists · staging holds schema plus synthetic data only · previews are isolated from production · repo migrations reproduce production's application schema.

---

## Gate 1B — Canonical release branch, CI and deployment governance

**This gate exists so that every Gate 2 package is written against the lineage that will actually ship.**

### WP1B.1 — Merge train (DIA-001, 002, 003, 026, 033) — highest risk, run alone
Production (`6a81fdf`, PR #14) and `fix/commercial-day1-leaks` (`99b7e91`, PR #10) both descend from `579b8e6`. PR #10 carries the classroom rejoin/nav UX and insights work that the 20 July promote removed. The database already holds their migrations, so restoring the client moves it *toward* the database — the safer direction.

**Expected conflicts:** the insights CSS re-tokening (broad `insights.css` change plus an app-wide `box-sizing` scoping change), tracing engine selection, SSG prerender entry point.

Merge into `master`; make `master` the only branch Vercel deploys production from; enable branch protection with CI as required checks; repair `check-task.sh` so the documented gate can pass (fix the 11 lint errors or set an explicit ratcheted baseline); close stale PRs; correct `CLAUDE.md`'s deploy contract.

**Acceptance:** every commit from PRs #11, #12 and #13 present in `master`, verified by file-level check rather than trust in the merge; `check-task.sh` exits clean; a deliberately failing PR is blocked.

### WP1B.2 — Reproducible builds (DIA-005) — promoted from deferred
Deferring this contradicts the release's purpose, and it is a **direct dependency of WP1A.2**: repointing preview environment variables is precisely when a silently-empty-env build bites.
- `npm ci` in Vercel, not `npm install`.
- One tested Node major pinned across local, CI and Vercel.
- Missing required production environment variables **fail the build** (`check:env-safety` becomes fatal in prebuild).
- CI runs the same checks production's build runs.

**Gate 1B exit:** one canonical release branch · CI enforced as required checks · builds reproducible and fatal on missing configuration.

---

## Gate 2 — Implement every package against the release branch and staging

Nothing here deploys. Everything is rehearsed on staging, reviewed, and shipped once at Gate 3.

### Gate 2A — Database and privacy

**WP2A.1 — Retention (DIA-008).** Do not make `sessions.code` nullable to stop the error; that silently redefines the contract.
- **Define anonymity explicitly before writing SQL.** Retaining teacher, school, session or rare-event identifiers leaves data **pseudonymous, not anonymous** — still in scope under UK GDPR. State which fields survive, and justify why the residual set cannot re-identify a child (be especially careful with small classes and unique timestamps, where a "aggregate" of one is not an aggregate).
- **Failure safety:** archive verified aggregates and delete identifiers **in the same transaction**; abort if archive verification fails.
- **Rollback:** code rollback of the previous function definition is permitted. **Data recovery of correctly purged identifiers is prohibited by design.**
- **Dump interaction:** ensure the WP1A.1 retention window prevents purged identifiers surviving indefinitely in backups.
- **Acceptance:** dry-run counts reviewed → manual run with before/after counts → **three consecutive successful nightly runs** (Gate 4) → induced failure raises an alert.

**WP2A.2 — Dashboard RPC access (DIA-006).** Classify before gating; do not apply one blanket guard:
- **Admin-only** → in-body `is_platform_admin()` guard, revoke anon.
- **Deliberately public** → rewrite as narrow aggregation-only outputs that cannot return per-account or per-learner rows.
- **Unused** → revoke or drop.
Inspect `dashboard_latest_sessions` and `dashboard_progression_top_learners` first; they are the likeliest to expose learner-level rows.

**WP2A.3 — Session-scoped roster access (DIA-007 Stage B) — RELEASE BLOCKER.**
Stage A shipped at Gate 0.5. Stage B replaces broad anonymous SELECT with a session-scoped capability. **The reconciliation poll is a fallback for state delivery, not permission to leave live child rosters anonymously readable.**

**Hazard:** Realtime evaluates RLS as the subscriber role, so naive revocation may kill `postgres_changes` to students — the same class of failure as the July `is_admin_user` incident. Two designs that keep delivery working:
- **Scoped claim:** students join via a short-lived signed token carrying `session_id`; RLS becomes `session_id = auth.jwt() ->> 'session_id'` instead of `status <> 'ended'`. Preserves realtime, scopes access to one session.
- **Server-authored broadcast:** move classroom state to Realtime Broadcast with authorisation on the channel; students never read the tables at all. Cleaner target architecture, larger change.

**If neither completes safely, Class Mode stays disabled and school rollout stays paused.** That is an acceptable outcome; leaving rosters readable is not.

**WP2A.4 — Signup trials (DIA-012).** Do not default role-less accounts to `parent` — that gives teacher accounts parent trials. Trace every signup path, find which stopped stamping role metadata, and anchor trial creation to **verified parent-profile creation**.

**WP2A.5 — Expired trial states (DIA-015).** Transition the 29 expired `trialing` rows; add the transition to a nightly job.

### Gate 2B — Client and release

**WP2B.1 — Child-route analytics (DIA-009).** Masking is insufficient. No cookie banner on `/play` or `/join`; optional analytics default off on child routes; **no Clarity session recording on child routes at all**. Keep privacy-safe first-party learning telemetry and scrubbed error reporting. Separately, founder reviews and deletes existing child-route recordings in Clarity.

**WP2B.2 — Lead capture (DIA-013).** Move the endpoint off `app.drawintheair.com` onto a live owned endpoint. **Must precede WP2B.7.**

**WP2B.3 — Self-hosted tracking runtime (DIA-020).** Serve MediaPipe WASM and model from your own origin, immutable-cached, CDN as fallback; update CSP.

**WP2B.4 — Camera disconnect recovery (DIA-022).** Handle `track.onended` and `devicechange` → existing `CameraRecovery` with a "camera lost" cause.

**WP2B.5 — Entitlement at mode mount (DIA-014).** Enforce entitlement and parental controls where a mode mounts, closing the `?screen=game&mode=…` bypass.

**WP2B.6 — Observability: canary, not silence alarm (DIA-029, DIA-031).**
A "zero real events in 24 hours" alarm false-alarms every quiet weekend — the audit itself could not distinguish a quiet Saturday from a dead pipe at 3–13 sessions/day. Replace with a **scheduled synthetic ingest canary** that writes a clearly marked internal health event, is **excluded from product and pilot analytics** (reuse the existing internal-traffic exclusion mechanism), must appear within a defined interval, and alerts when missing. A separate low-traffic *notification* can report zero genuine users without treating it as a broken pipeline. Also fix or retire the broken materialized-view refresh job, and correct the anomaly check that still references a retired `session_started` event.

**WP2B.7 — Retire the stale app host (DIA-016) — promoted from deferred.** After WP2B.2, redirect or retire `app.drawintheair.com` and remove every remaining product link to it. A known-obsolete child-facing build left online is a support and confusion risk.

**WP2B.8 — Measurement repair (DIA-030, DIA-032).** Mirror learning attempts from the per-item content events the deployed activities actually emit; ship the completed idle-timeout work. **Required before any progression or efficacy claim** — not before the release itself.

**WP2B.9 — robots.txt (DIA-017).** Fix the `/school` and `/parent` prefix rules blocking `/schools`, `/schools/training` and `/parents`.

**Gate 2 exit:** every package merged to the release branch, rehearsed on staging, reviewed — with **no production deployment yet**.

---

## Gate 3 — One controlled deployment

Deploy the release once, applying database changes in **expand-and-contract** order wherever client and schema are coupled (notably WP2A.3 and WP2A.4):

1. Add backwards-compatible database structures.
2. Deploy the compatible client.
3. Verify in production.
4. Remove old policies and structures only afterwards.

**Exit:** release live, old structures removed only after the new client is verified, rollback point recorded.

---

## Gate 4 — Production proof

**Minimum three calendar nights**, because retention health cannot be proven faster.

**Automated/scheduled:** production smoke (home, `/play` tracker, one ingested event, billing health) · **three consecutive successful retention nights** · canary appearing on schedule · stats job clean.

**Manual matrix:**
1. Classroom end to end, two separate browser contexts on real hardware: create → join → assign → pause → resume → change activity → refresh both → network drop → complete → end → results persisted. No drift; pause reaches the student within five seconds. *(DIA-025)*
2. **Two people in frame** — does a background hand steal the cursor? *(DIA-021)*
3. **Two teacher tabs** issuing conflicting controls. *(DIA-027)*
4. **30-learner synthetic join/load smoke.**
5. **Muted-device Rainbow Bridge play-through** — sound-independent instruction check.
6. **Limited-mobility and unusual hand-orientation wave test.**
7. Camera: first permission → wave → first gesture on a Chromebook-class device; denial → recovery → retry; unplug mid-game → recovery.
8. Filtered network: both CDN hosts blocked → product still starts.
9. Privacy: full camera-session network capture shows zero pixel or frame payloads leaving the browser; Clarity shows no child-route recordings.
10. **Signup-to-trial verification**, every path.
11. **Lead-form production submission** produces a stored row and notification.
12. **`app.drawintheair.com` redirect check.**
13. Billing: Stripe test-mode event → billing row → entitlement change → UI, plus DIA-040 dashboard verification.
14. Rollback drill: promote-to-previous executed once; database restore path tested.
15. Keyboard pass on teacher and parent flows.

**Conditional blockers:**
- If background-hand interference is severe, **DIA-021 becomes a blocker** despite its P2 classification.
- If two teacher tabs create state instability, either implement single-writer control or **enforce and communicate a temporary one-controller rule** before any school session.

**Exit:** completed evidence pack, signed off by you.

---

## Gate 5 — Controlled rollout

One teacher and two student devices → one small class → full pilot class. **Reopen school onboarding and paid acquisition only after three to five real sessions with no state drift.**

---

## Track P — Claims correction (parallel, non-code)

Nothing goes to a school, investor or DPO until corrected. Contradicted by audit evidence: production described as `main` on `drawintheair.app` (false — `6a81fdf` on `feat/ssg-prerender` at `drawintheair.com`); described as Next.js with active staging (false — root Vite SPA, staging paused); file storage and verified backups claimed (**zero storage buckets; no automated backups exist on the free plan**); certificate pinning, CSRF controls and rate limits presented as implemented (unevidenced); "COPPA compliant" and "no PII for under-13s" (too strong — Class Mode stores child first names by design); pilot deck's no-children's-data and no-third-party-trackers claim (contradicted until WP2B.1 ships); "open hand to pause" presented as universal (often pen-up, not application pause); Class Mode presented as needing only an initial download (needs ongoing connectivity); hand raising, heatmaps, CSV export, seat billing, school invoicing presented as live (unproven); flyer contains `wwww.drawintheair.com`; design system's absolute "No mouse. No touch." conflicts with the accessible fallback the product needs (DIA-023); `og:image:alt` says ages 3–11 against 3–7 elsewhere; "up to 30 learners" unenforced.

**Method:** rewrite from the shipped term release, not the older architecture vision. Every corrected claim cites the code, database object or test that proves it.

---

## Deferred until after the release

DIA-010 (auth hardening), DIA-011 (CSP tightening), DIA-018/019 (SEO orphans, soft-404), DIA-021 (proper primary-player lock — implement properly or correct the contract; **conditional blocker per Gate 4**), DIA-023 (non-camera input path), DIA-024 (dead code), DIA-027 (**conditional blocker per Gate 4**), DIA-034 (dependency bumps — own PR, never inside the merge train), DIA-035, DIA-039.

**Realistic duration: seven to twelve focused working days**, with at least three calendar nights inside Gate 4 to prove retention health.

---

## Appendix — issue coverage map

| Issue | Sev | Destination |
|---|---|---|
| DIA-001 | P1 | WP1B.1 merge train |
| DIA-002 | P2 | WP1B.1 (branch/docs contract) |
| DIA-003 | P2 | WP1B.1 (CI as required checks, check-task.sh) |
| DIA-026 | P2 | WP1B.1 (restored by the merge; verify by file-level check) |
| DIA-033 | P3 | WP1B.1 (lint must be clean for the gate to pass) |
| DIA-004 | P2 | WP1A.3 reconciliation (definition-comparison method) |
| DIA-005 | P3 | **WP1B.2 — promoted; dependency of WP1A.2** |
| DIA-006 | P1 | WP0.5.2 (proven-unused revokes) + WP2A.2 (classification) |
| DIA-007 | P1 | WP0.5.1 Stage A + **WP2A.3 Stage B — release blocker** |
| DIA-008 | P1 | WP2A.1 + three nights at Gate 4 |
| DIA-009 | P1 | WP2B.1 |
| DIA-012 | P1 | WP2A.4 |
| DIA-013 | P1 | WP2B.2 (precedes WP2B.7) |
| DIA-014 | P2 | WP2B.5 |
| DIA-015 | P2 | WP2A.5 |
| DIA-016 | P2 | **WP2B.7 — promoted into the release** |
| DIA-017 | P2 | WP2B.9 |
| DIA-020 | P1 | WP2B.3 |
| DIA-021 | P2 | Deferred — **conditional blocker, Gate 4 item 2** |
| DIA-022 | P2 | WP2B.4 |
| DIA-025 | P1 | Gate 4 item 1 — the live classroom test is the gate |
| DIA-027 | P2 | Deferred — **conditional blocker, Gate 4 item 3** |
| DIA-029 | P2 | WP2B.6 canary (replaces the false-alarming silence alarm) |
| DIA-031 | P2 | WP2B.6 (matview refresh job) |
| DIA-030 | P2 | WP2B.8 — blocks efficacy claims |
| DIA-032 | P2 | WP2B.8 — blocks efficacy claims |
| DIA-036 | P2 | WP1A.2 synthetic staging |
| DIA-037 | P2 | **WP1A.1 — build, not verify; no free-plan backups exist** |
| DIA-038 | P3 | Track P |
| DIA-040 | P2 | Gate 4 item 13 |
| DIA-010 | P3 | Deferred (auth hardening) |
| DIA-011 | P3 | Deferred (CSP tightening) |
| DIA-018 | P2 | Deferred (PAGE_META orphans, /parents prerender) |
| DIA-019 | P2 | Deferred (soft-404 catch-all) |
| DIA-023 | P2 | Deferred (non-camera input) — conflicting design-system claim corrected in Track P now |
| DIA-024 | P3 | Deferred (dead code, hidden modes) |
| DIA-034 | P3 | Deferred — own PR, never inside the merge train |
| DIA-035 | P3 | Deferred (service-worker cache version) |
| DIA-039 | P3 | Deferred (image weight) |

---

## Session prompt template for Claude Dev

> Work package **<WP-ID>** from `docs/audits/NEW_TERM_RELEASE_EXECUTION_BRIEF.md` only.
> Start from a fresh clone. Verify the production SHA from Vercel before touching anything.
> Read standing rules §0 and the package's approach notes — they are binding, including where they tell you **not** to take the obvious mechanical fix.
> Rehearse any database change on staging first, follow the §0.5 change protocol for the change class involved, produce dry-run counts, and stop for my written go before applying to production.
> Anything you find outside this package goes in `docs/audits/RELEASE_FINDINGS_LOG.md`. Do not fix it.
> Finish by writing evidence to `docs/audits/evidence/release/<WP-ID>/` and opening one PR.
