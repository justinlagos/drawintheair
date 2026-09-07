# Draw in the Air — New-Term Readiness Audit

**Date:** 15 August 2026 · **Lookback:** 15 July – 15 August 2026 · **Auditor:** Claude (coordinated specialist audit, lead + 5 domain auditors, all read-only)
**Companion issue register:** `NEW_TERM_ISSUE_REGISTER_2026-08-15.csv` (same issue IDs)

---

## 1. Executive decision

### CONDITIONAL GO

Production is up, stable and serving the correct build; the billing chain is sound and self-healing; RLS coverage is complete; the no-video promise holds at code level; and the classroom client at the deployed commit contains the strongest sync logic the product has ever shipped. But the platform has been running unattended on an unmerged feature branch for 26 days, during which a child-data retention job failed silently every night, every new signup got no trial, the school lead-capture endpoint 404'd, and anonymously readable live-session rosters (child first names) accumulated. None of these is an active breach or outage — which is why this is not a NO-GO — but nine P1 issues must be closed, and one live classroom end-to-end test must pass on real hardware, before the first school uses it in September.

**Issue counts: P0 = 0 · P1 = 9 · P2 = 21 · P3 = 9** (39 deduplicated issues)

**Five highest risks:**
1. **Child-data exposure surface** — live session join codes and child first-name rosters are anon-readable (`status <> 'ended'` policies) with 4 stale "live" sessions >14 days old, and 33 ungated `dashboard_*` SECURITY DEFINER RPCs, 7 executable by `anon` (DIA-006, DIA-007).
2. **Retention silently not executing** — the nightly `retention-purge` cron has failed and rolled back every night for ≥30 nights on a children's product (DIA-008).
3. **Release governance failure** — production is an unmerged PR branch; the 20 Jul promote silently reverted classroom/insights fixes that were live 16–20 Jul; master is stale; CI does not gate deploys; the documented local gate (`check-task.sh`) cannot pass (DIA-001/002/003).
4. **Commercial funnel broken end-to-end** — all lookback signups received no trial (instant paywall) and the default lead-form endpoint returns 404 (DIA-012, DIA-013).
5. **School-term readiness unproven** — zero classroom usage since 14 Jul, no live teacher↔student E2E in a month, and the entire hand-tracking runtime (~19 MB) loads from two third-party CDNs that school web filters commonly block, with no fallback (DIA-025, DIA-020).

**Minimum actions before the first school uses it:** fix the retention-purge SQL bug and re-run the purge; gate or remove the anon-executable dashboard RPCs and narrow the anon session/roster policies (or schedule `class_end_stale_sessions`); repair the signup→trial trigger and the lead-form endpoint; merge production back into master and re-deploy from a governed branch (restoring PR #11–13); decide and implement the Clarity/consent posture on child routes; then run the mandatory manual test matrix in §10 (live classroom two-context test on a school-class device and network, camera onboarding, filtered-network check) and capture the evidence.

---

## 2. Audit scope and limitations

**Dates:** audit executed 15 August 2026, ~20:45–23:00 UTC. Primary operational lookback 15 Jul–15 Aug 2026; comparison window 14 Jun–15 Jul 2026.

**Environments and systems inspected:**
- GitHub `justinlagos/drawintheair` — fresh clone, all remote branches/tags/PR refs; production SHA checked out detached at `/home/claude/dia-audit/repo`.
- Vercel team `withinafricas-projects`: projects `drawintheair` (prj_AmvVJ8qowbPNoQlrEGw0SciqZgIC) and `drawintheair-m34j` (prj_aMcfIE9EHCyCNAWvRrnmx4FkNGzz) — deployment metadata, runtime error clusters.
- Live production `https://drawintheair.com` (+ www, vercel.app alias, app.drawintheair.com) — 57 read-only HTTP requests, 2026-08-15 21:23–21:30 UTC.
- Supabase production `fmrsfjxwswzhvicylaph` (draw-in-the-air, eu-west-2, PG 17.6.1.063, ACTIVE_HEALTHY) — read-only SQL, migrations, advisors, edge functions, cron state, 24 h unified logs.
- Full local execution of the repository's build/test/check suite on the exact production commit.

**Accounts/roles:** no interactive login sessions were used; auth flows were assessed at code + schema + HTTP level. No test accounts were created; no real child/customer data was modified. Anonymised counts only; identifiers redacted.

**Access blocked / tests not possible (gaps are recorded, not assumed):**
- **Stripe dashboard** (endpoint config, delivery log, live/test key scoping) — derived from code + `billing_events` only.
- **Supabase backups/PITR configuration** — not exposed via available read tools.
- **GitHub branch-protection settings** — API returned 403 in this sandbox; PR open/closed state inferred from merge refs.
- **PostHog / Sentry / Clarity / GA4 dashboards** — client-side config verified in code; server-side receipt unverified.
- **Real camera/hardware/classroom testing** — impossible in this environment. Twelve explicit manual device tests are listed in §10; classroom E2E (DIA-025) is a release gate.
- Supabase unified logs are limited to a 24 h window; full-lookback log analysis was reconstructed from database state (cron run history, event tables) instead.

---

## 3. Verified system baseline

### 3.1 What is actually live (all VERIFIED 15 Aug 2026)

| Property | Value |
|---|---|
| Production app | Root **Vite React SPA** (`src/`), served at drawintheair.com via Vercel project `drawintheair` |
| Production deployment | `dpl_9GNY6QoBhvLEg7n375RgEgKJCwHi`, promoted **2026-07-20 19:48 UTC**, state READY |
| **Production commit** | **`6a81fdf6eb84495e1a42f7f48a6a0e4f466c6880`** — head of `feat/ssg-prerender`, open PR #14 |
| Deploys since 20 Jul | **None** (Vercel deployment history is empty after 20 Jul for the production project) |
| Data plane | Supabase `fmrsfjxwswzhvicylaph` (matches CSP `connect-src`), ACTIVE_HEALTHY |
| Billing | Stripe via Supabase edge function `stripe-webhook`; `billing-health` cron every 15 min (2,880/2,880 successful runs in 30 days) |
| Staging | Supabase project `draw-in-the-air-staging` (dcivdrhxeaiulbbhsgfv) is **INACTIVE/paused** — no working staging environment |
| Secondary host | `app.drawintheair.com` → Vercel project `drawintheair-m34j` (configured framework "nextjs" but currently serving a **stale Vite build of the kid app**), unauthenticated |

The 11 Aug `Last-Modified` header that prompted suspicion of a newer deploy is a CDN artefact (Cloudflare fronts Vercel): Vercel metadata shows no production deployment after 20 Jul; the served homepage is full-body prerendered HTML that only exists in the SSG commit; the served CSS bundle hash (`index-ChgqAf54.css`) is byte-identical to a local build of `6a81fdf`. JS chunk hashes differ from the local build solely because production bakes real `VITE_*` env values (the local build ran with empty env, which also tree-shakes the Sentry chunk). **Conclusion (VERIFIED): production serves `6a81fdf`.**

### 3.2 Branch/deployment drift (the central governance finding)

```
d355bbf (20 Jun, tag production-before-release-workflow) … master 1b5abae (26 Jun) [stale]
579b8e6 (10 Jul) ── merge-base of production and fix/commercial-day1-leaks
  ├─ fix/commercial-day1-leaks 99b7e91 (16 Jul) = PR #11 (classroom rejoin/nav) + PR #12/13 (insights)  ← WAS production 16–20 Jul
  └─ feat/ssg-prerender 6a81fdf (20 Jul) = 579b8e6 + one SSG commit                                      ← IS production now
```

- Production is **not an ancestor of master** (23 commits ahead; master has 1 commit production lacks — a lint fix).
- The 20 Jul promote of `feat/ssg-prerender` **silently removed** from production the PR #11 classroom client fixes (rejoin-reclaim UX, roster-link UI, console↔dashboard nav, live-class banner) and the PR #12/#13 admin insights (Calm 2.0, Growth tab) that had been live since 16 Jul. The corresponding **database migrations stayed applied**, so prod DB (class_join v2, dashboard_growth) is ahead of the prod client. Server-side reclaim/roster-link still works with the deployed client (RPC signature unchanged) — the loss is teacher-facing UX and the admin Growth tab.
- `origin/main` is 5 months stale (14 Mar). `CLAUDE.md` states "Production deploys from master" — contradicted by Vercel. Open PRs (merge refs present): #2, #3, #5, #6, #7, #8, #9, #10, #14.
- **The repository has had zero commits since 20 Jul 2026** — the entire lookback period is a code freeze; every change in behaviour since then is environmental (data, crons, third parties).

### 3.3 Environment matrix

| Environment | Frontend | Database | Status |
|---|---|---|---|
| Production | drawintheair.com (Vercel, `6a81fdf`) | fmrsfjxwswzhvicylaph | VERIFIED healthy |
| Preview | per-push Vercel previews (both projects) | **same production DB** | VERIFIED — previews point at prod data (risk noted, DIA-036) |
| Staging | none active | dcivdrhxeaiulbbhsgfv INACTIVE | VERIFIED absent |
| Local | Vite dev | env-dependent | Not exercised |
| Rogue prod-like | app.drawintheair.com (stale build) | fmrsfjxwswzhvicylaph | VERIFIED exposed (DIA-016) |

**Required env vars (names only, from code):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`(+host), GA4/Clarity/Meta IDs (build-injected), and edge-function secrets `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND/email` keys, `SUPABASE_SERVICE_ROLE_KEY` (edge only — verified absent from client bundle). Presence in Vercel/Supabase confirmed indirectly (features function in prod); scoping = ACCESS BLOCKED.

### 3.4 External dependency inventory (production runtime)

Supabase (auth/DB/realtime/edge), Stripe, MediaPipe hand tracking from **cdn.jsdelivr.net + storage.googleapis.com** (~19 MB WASM+model, version-pinned 0.10.32, reachable; no self-hosted fallback — DIA-020), Google Fonts, GA4/GTM, Microsoft Clarity, Meta Pixel, PostHog (EU/US hosts), Sentry, Cloudflare (DNS/proxy), Vercel (hosting, region iad1).

---

## 4. Readiness scorecard

| Domain | Rating | One-line basis |
|---|---|---|
| Availability / release delivery | **Ready** | Site up, correct build, clean redirects, strong headers, assets cached correctly; zero Vercel runtime errors in 7 d |
| Release governance | **At risk** | Unmerged-branch production, reverted fixes, non-gating CI, unpassable local gate (DIA-001/002/003) |
| Classroom / realtime | **At risk** | Infra verified healthy (grant present, publications correct, 0 apply_rls errors in 24 h logs); client logic strong at this commit; **but zero real usage since 14 Jul and no live E2E in a month** (DIA-025); PR #11 UX gaps live |
| Camera / tracking | **At risk** | Good state-machine coverage; no player lock (DIA-021), no mid-session disconnect recovery (DIA-022), hard CDN dependency (DIA-020); hardware tests outstanding |
| Gameplay / learning | **At risk (near Ready)** | All 8 menu modes complete and emit `mode_completed`; playful tracing is engine of record; premium bypass via URL (DIA-014); learning_attempts starved (DIA-030) |
| Teacher experience | **At risk** | Deployed console lacks the merged nav/rejoin UX (DIA-026); two-tab conflicts unguarded; guides not re-verified against UI |
| Parent / billing | **At risk** | Webhook chain solid + self-healing (VERIFIED); but signup→trial broken (DIA-012) and 29 zombie "trialing" rows (DIA-015) |
| Security / privacy | **At risk** | Full RLS coverage, no secrets in bundle, no video egress; but DIA-006/007/008/009 are open child-data/compliance exposures |
| Accessibility / compatibility | **At risk** | Adult surfaces broadly usable; child gameplay camera-only with no alternative input except Magic Canvas (DIA-023); formal WCAG pass not performed |
| Analytics / observability | **At risk** | Ingest worked until 14 Aug 17:03 UTC then 0 events in ~28 h (unconfirmed cause); outages not self-detecting (DIA-029); two crons failing nightly (DIA-008/031) |
| Operational readiness | **Not verified** | Backups/restore ACCESS BLOCKED (DIA-037); no staging; single-founder alerting partial (billing yes, ingest no) |

Ratings are categorical per the brief; no percentage scores are used.

---

## 5. Critical user-journey results (test matrix)

| Area | Scenario | Expected | Actual (evidence) | Result |
|---|---|---|---|---|
| Public | Home → understand product → start free → /play | Clear proposition, CTA to anonymous /play | Homepage 200/0.6 s, full prerendered content; "Try free" CTAs open anonymous /play (85e43c9 in prod ancestry); /play 200 | **PASS** (VERIFIED, HTTP + code) |
| Camera | First permission → tracker ready → first gesture | Guided wave-to-wake, cause-specific errors | Code-level: full state machine incl. denied/busy/no-device/timeout+CPU fallback (findings/product-code.md); live camera not testable here | **PASS (code) / MANUAL REQUIRED (device)** |
| Recovery | Camera denial → clear recovery → retry | Recovery screen with next action | `CameraRecovery` cause-specific screens VERIFIED in code; **mid-session disconnect NOT handled** (DIA-022) | **PARTIAL** |
| Child | Complete one simple + one structured mode | Completable, completion recorded | All 8 modes emit `mode_completed` (file:line table in findings); post-20-Jul data shows 37 pre-writing completions | **PASS (code+data) / MANUAL REQUIRED** |
| Teacher | Signup/login → class → learners → session → results | Full journey without technical knowledge | Code paths present; nav/rejoin UX fixes absent from prod (DIA-026); not exercised live (no test account) | **PARTIAL / MANUAL REQUIRED** |
| Student | Valid join → assignment → pause/resume → completion → rejoin | Authoritative teacher state | Client at prod SHA: realtime fast-path + 5 s reconcile poll, pause shield, 15-min auto-rejoin, 4-path score submit (VERIFIED code); server class_join v2 applied | **PASS (code+db) / LIVE E2E REQUIRED (DIA-025)** |
| Realtime | Separate contexts, refresh, reconnect | No drift | Infra: anon EXECUTE on `is_admin_user` present; 4 tables published; 0 permission/apply_rls errors in 24 h logs. Live two-context test not run | **PASS (infra) / LIVE E2E REQUIRED** |
| Parent | Signup → trial → learner → dashboard | Trial starts on signup | **FAIL:** all 3 lookback signups have no trial row (role-metadata gate, DIA-012); 29 expired "trialing" zombies | **FAIL** (VERIFIED, DB) |
| Billing | Stripe event → DB entitlement reconciliation | Idempotent, self-healing | Signature verify + UNIQUE(stripe_event_id) + out-of-order guard + 15-min repair cron 2,880/2,880 green; last event 12 Aug (renewal cadence) | **PASS** (VERIFIED; Stripe-side config ACCESS BLOCKED) |
| Admin | Admin allowed, non-admin denied server-side | In-body checks on RPCs | `dashboard_growth` gated (VERIFIED); **33 other dashboard_* RPCs ungated, 7 anon-executable** (DIA-006) | **FAIL** |
| SEO | Representative URL per family + refresh | 200, correct content, crawlable | 93 prerendered routes live w/ unique meta; sitemap 90 URLs = repo; **robots.txt blocks /schools,/parents** (DIA-017); soft-404 everywhere (DIA-019) | **PARTIAL** |
| Accessibility | Keyboard/SR smoke on adult flows | Operable | Code-level smoke only; modals/focus mostly fine, gaps noted; formal pass not run | **NOT VERIFIED** |
| Performance | Cold/warm landing + play load | Reasonable school-hardware load | Homepage 0.6 s TTFB; main chunk 250 KB (68 KB gz); MediaPipe ~19 MB CDN download is the dominant cold cost (DIA-020); field metrics not available | **PARTIAL** |
| Privacy | Camera session network capture: no video/frame upload | Zero pixel egress | Code: no pixel sink except local PNG download; PostHog recording disabled; CSP backstop (VERIFIED). Live packet capture + Clarity dashboard review = manual | **PASS (code) / MANUAL REQUIRED** |

---

## 6. Findings by domain (including what is safe to preserve)

### 6.1 Availability, delivery and routing
**Good (VERIFIED):** apex/www/http redirect chains single-hop 308; HSTS + XFO DENY + nosniff + Referrer-Policy + Permissions-Policy (camera=self) + CSP all served and matching vercel.json; hashed assets immutable; real 404s on /assets; sitemap byte-identical to repo; health.json live; zero Vercel runtime-error clusters in 7 days; lazyWithRetry (src/lib/lazyWithRetry.tsx:22-83) gives solid chunk-skew recovery; service worker is network-first for HTML/JS so the stale CACHE_VERSION is low-impact.
**Defects:** DIA-013 (lead form 404), DIA-016 (app.drawintheair.com stale duplicate), DIA-017/018/019 (robots blocks, sitemap/meta orphans, universal soft-404), DIA-035 (SW version stale), DIA-039 (50 MB dist, 5.7 MB PNG).

### 6.2 Release governance and build
**Good (VERIFIED):** `npm ci` clean (18 s, 0 deprecations); type-check clean; 252/252 tests pass; CSP + secrets + env-safety checks pass; build reproduces exactly 93 prerendered routes; no sourcemaps/debugger/service-role material in dist; anon key env-injected not hardcoded.
**Defects:** DIA-001 (unmerged-branch production + reverted fixes), DIA-002 (master/main/docs drift), DIA-003 (CI not gating: typecheck.yml only fires on `main`; check-task.sh dies at lint step because lint is red — 11 errors, docs say 9 — so the documented gate can never pass; branch protection unverifiable), DIA-004 (migration drift: 16 prod migrations without repo files including both 16-Jul classroom migrations; 17 repo files untracked in prod; duplicated version numbers 0022–0024), DIA-005 (npm install not ci on Vercel; Node 20/22/24 matrix; silent empty-env builds), DIA-033 (lint debt growing, incl. rules-of-hooks in shipped admin code), DIA-034 (react-router-dom moderate open-redirect; posthog-js bump clears 4 advisories).

### 6.3 Database, RLS and realtime infrastructure
**Good (VERIFIED):** all 50 public tables have RLS enabled; all 8 views security_invoker; deny-by-default on service tables; realtime publication contains exactly the 4 classroom tables and every policy function on them is anon-executable (the 9-Jul root cause is fixed and still fixed); class_join v2 + heartbeat fix live in prod; dashboard_growth properly admin-gated in-body; 0 storage buckets (no child media at rest); 0 orphaned auth users; 0 duplicate-suffix roster rows remaining; billing idempotency constraint present.
**Defects:** DIA-006 (33 ungated dashboard_* SECURITY DEFINER RPCs, 7 anon-executable), DIA-007 (anon-readable live join codes + child first names; 4 stale live sessions; `class_end_stale_sessions()` exists but is never scheduled), DIA-008 (retention-purge cron failing nightly ≥30 nights: `UPDATE sessions SET code = NULL` violates NOT NULL → whole purge rolls back), DIA-010 (leaked-password protection off; 3 mutable search_path fns; anon TRUNCATE/TRIGGER grants; anon EXECUTE on class_child_delete/anonymise/archive), DIA-031 (refresh-materialized-views cron failing nightly — v_teacher_session_stats is no longer a matview), DIA-004 (drift, above), DIA-037 (backups/PITR unverifiable).

### 6.4 Classroom and realtime behaviour
**Good (VERIFIED at code/db level):** Supabase is the single authoritative state owner; student client applies pause/resume/kick/end via realtime fast-path plus a 5 s reconciliation poll (survives missed events); pause keeps the game mounted behind an opaque shield with frozen timer; score submission has a once-guard plus DB unique constraint across 4 terminal paths; 15-minute sessionStorage auto-rejoin; the historical timer/name-pip overlap is fixed (pip forced top-left); heartbeat no longer 428C9s; roster reclaim/link works server-side with the deployed client.
**Defects/gaps:** DIA-025 (no live E2E in a month; zero classroom usage since 14 Jul — the September-critical flow is unproven on current infra), DIA-026 (PR #11 teacher UX absent from prod), DIA-027 (two-teacher-tabs unguarded; free-tier class cap client-side only). Design note (not a defect): class-end reaches students via the poll (≤5 s), because ended sessions drop out of the anon realtime policy.

### 6.5 Camera, tracking and gameplay
**Good (VERIFIED code):** cause-specific CameraRecovery screens (denied/no-device/busy/unsupported); 15 s model-load timeouts with GPU→CPU fallback and retry screen; tab-visibility pause; clean unmount (tracks stopped, listeners removed); ambient warm-up on by default with intact activation analytics; all modes emit completion; playful tracing is the engine of record and class mode pins it (579b8e6).
**Defects:** DIA-020 (CDN-only MediaPipe), DIA-021 (activePlayerLock does not exist in this commit — "Phase 1 shipped" claim is false for prod; most-confident-hand-wins means background hands can steal the cursor), DIA-022 (no `track.onended`/`devicechange` handling — unplugged webcam dead-ends the child with a misleading "I need to see your hands" toast), DIA-023 (camera-only input for everything except Magic Canvas, including the wave gate), DIA-024 (URL-only hidden modes; orphaned TracingMode v2 dead code; legacy engine reachable via flag fallback), DIA-014 (premium/parental-controls bypass via `?screen=game&mode=…`).

### 6.6 Child, teacher and parent experience
**Good:** child instructions are movement/visual-first; no external links found in child mode; rewards/feedback present in all modes; menu gesture navigation shipped (d355bbf ancestry).
**Defects:** DIA-009 (consent banner overlays child play routes and is child-tappable — a child can enable GA4/Clarity/Meta Pixel; Clarity has no masking configured in code and records child gameplay DOM after consent), DIA-023 (no non-camera path = no SEND/assisted alternative), DIA-026 (teacher nav gaps), DIA-012 (parent trial broken), DIA-038 (og:image:alt "ages 3–11" vs 3–7; "up to 30 learners" unenforced).

### 6.7 Billing and commercial integrity
**Good (VERIFIED):** webhook = Supabase edge function with signature verification (stripe-webhook/index.ts:57), UNIQUE `billing_events.stripe_event_id`, out-of-order guard, 500-with-admin-email on write failure; `billing-health` cron every 15 min, 2,880/2,880 successful runs, auto-repairs drift against Stripe and dead-man-alerts within ~2 h — the July "18 h silent gap" class of incident is now self-detecting and self-repairing. Latest billing event 12 Aug 13:30 UTC (consistent with the single real subscriber's monthly renewal). Subscriptions: 2 active (1 real, 1 comped), 0 past_due/canceled.
**Defects:** DIA-012 (signup→trial trigger skips accounts without `role` metadata — all 3 lookback signups affected; some signup path stopped stamping role), DIA-013 (lead-capture endpoint 404), DIA-014 (premium URL bypass), DIA-015 (29 expired "trialing" zombies, latest trial_end 8 Jul — distorts every status-based report), DIA-040 (Stripe-side config ACCESS BLOCKED).

### 6.8 Analytics and observability
**Good (VERIFIED):** ingest RPC fix (13659bb) held — the 26 Jun–8 Jul outage shape is visible and recovery on 9 Jul confirmed; playful-tracing completion honesty fix works in production data (37 pre-writing `mode_completed` post-20-Jul); PostHog config exemplary (recording off, event/property allow-lists); Sentry replay off with landmark keys in scrub denylist; GA4/Clarity/Meta gated to production hosts.
**Defects:** DIA-029 (last analytics event 14 Aug 17:03 UTC, 0 events in ~28 h at audit time — plausibly a quiet Saturday at 3–13 sessions/day, but nothing would alert if ingest were dead; the anomaly check fires on spikes only and counts a `session_started` event that no longer exists), DIA-030 (learning_attempts empty since 10 Jul: deployed client writes attempts only from `item_dropped`, which no deployed mode emits — mastery/progress pipeline starved), DIA-031 (teacher stats matview refresh dead), DIA-032 (38% of mode_starts orphaned, tutorial 86%; idle-timeout fix PR #8 undeployed).

### 6.9 Security and privacy
**Good (VERIFIED):** no secrets in built assets; service-role key absent from client; check:secrets passes; no pixel/video egress path in code; CSP restricts connect-src to known hosts; COPPA wording appropriately hedged; class-mode child data limited to first names by design.
**Defects:** DIA-006/007/008/009/010 as above; DIA-011 (script-src retains unsafe-inline + unsafe-eval; ACAO * on HTML — P3 hardening).

### 6.10 Operational readiness
**Good:** billing alerting + daily 07:00 digest exist; runtime error monitoring (Sentry + Vercel) clean.
**Gaps:** DIA-036 (no staging; previews point at production DB), DIA-037 (backup/restore ownership unverified), DIA-029 (ingest not self-detecting), DIA-002/003 (no reliable release/rollback procedure — although Vercel promote history gives instant rollback candidates), single-founder escalation path undocumented (folded into DIA-037's ops item).

---

## 7. Prioritised issue register (summary)

Full per-issue detail (all required fields) in the CSV. Release blocker = must close before first school use.

| ID | Sev | Blocker | Title | Status |
|---|---|---|---|---|
| DIA-001 | P1 | Yes | Production runs unmerged PR branch; 20 Jul promote reverted live classroom/insights fixes | VERIFIED |
| DIA-006 | P1 | Yes | 33 ungated dashboard_* SECURITY DEFINER RPCs; 7 anon-executable | VERIFIED |
| DIA-007 | P1 | Yes | Anon-readable live session codes + child first-name rosters; stale live sessions accumulate | VERIFIED |
| DIA-008 | P1 | Yes | retention-purge cron failed every night ≥30 nights (NOT NULL vs SET code=NULL) | VERIFIED |
| DIA-009 | P1 | Yes | Child-tappable consent enables tracking; Clarity records child gameplay with no code-level masking | VERIFIED (code) |
| DIA-012 | P1 | Yes | Signup→trial broken (role-metadata gate); all lookback signups got no trial | VERIFIED |
| DIA-013 | P1 | Yes | Default lead-capture endpoint 404s in production | VERIFIED |
| DIA-020 | P1 | Yes | Hand-tracking runtime 100% third-party-CDN with no fallback (school filters) | VERIFIED |
| DIA-025 | P1 | Yes | Classroom E2E unproven: zero usage since 14 Jul, no live test on current infra | UNVERIFIED (gate) |
| DIA-002 | P2 | No | Branch/docs drift: master stale, main dead, CLAUDE.md wrong about deploy branch | VERIFIED |
| DIA-003 | P2 | No | CI does not gate production; check-task.sh cannot pass; protection unknown | VERIFIED/ACCESS BLOCKED |
| DIA-004 | P2 | No | Migration drift repo↔prod (16 untracked-in-repo, 17 untracked-in-prod, dup versions) | VERIFIED |
| DIA-014 | P2 | No | Premium + parental-controls bypass via ?screen=game&mode= | VERIFIED |
| DIA-015 | P2 | No | 29 expired "trialing" subscription zombies | VERIFIED |
| DIA-016 | P2 | No | app.drawintheair.com stale unauthenticated duplicate; product links target it | VERIFIED |
| DIA-017 | P2 | No | robots.txt prefix-blocks /schools, /schools/training, /parents | VERIFIED |
| DIA-018 | P2 | No | /parents not prerendered (canonical→/); 6 PAGE_META orphans; duplicate-title twins | VERIFIED |
| DIA-019 | P2 | No | Universal soft-404 (unknown routes 200 with homepage incl. /contact, /login) | VERIFIED |
| DIA-021 | P2 | No | activePlayerLock absent from production despite "Phase 1 shipped" contract | VERIFIED |
| DIA-022 | P2 | No | No camera-disconnect recovery mid-session (child dead-end) | VERIFIED (code) |
| DIA-023 | P2 | No | No non-camera input path (except Magic Canvas); wave gate camera-only | VERIFIED |
| DIA-026 | P2 | No | Teacher nav/rejoin UX (PR #11) missing from prod client | VERIFIED |
| DIA-027 | P2 | No | Two-teacher-tabs unguarded; class cap client-side only | VERIFIED (code) |
| DIA-029 | P2 | No | Analytics ingest outages not self-detecting; 0 events last ~28 h unconfirmed | VERIFIED |
| DIA-030 | P2 | No | learning_attempts empty since 10 Jul (item_dropped-only writer) | VERIFIED |
| DIA-031 | P2 | No | refresh-materialized-views cron failing nightly; teacher stats stale | VERIFIED |
| DIA-032 | P2 | No | 38% orphaned mode_started (tutorial 86%); idle-timeout fix undeployed | VERIFIED |
| DIA-036 | P2 | No | No staging; previews share production database | VERIFIED |
| DIA-037 | P2 | No | Backups/PITR + restore ownership unverified | ACCESS BLOCKED |
| DIA-040 | P2 | No | Stripe endpoint/key configuration unverifiable from available access | ACCESS BLOCKED |
| DIA-005 | P3 | No | Vercel npm install (not ci); Node version matrix; silent empty-env builds | VERIFIED |
| DIA-010 | P3 | No | Auth hardening: leaked-password protection off; mutable search_path; anon TRUNCATE/TRIGGER; anon EXECUTE on child-record admin fns | VERIFIED |
| DIA-011 | P3 | No | CSP unsafe-inline/unsafe-eval; ACAO * | VERIFIED |
| DIA-024 | P3 | No | Hidden URL-only modes; orphaned TracingMode v2; legacy engine fallback reachable | VERIFIED |
| DIA-033 | P3 | No | Lint debt 9→11 errors incl. rules-of-hooks in shipped code | VERIFIED |
| DIA-034 | P3 | No | react-router-dom moderate open-redirect; posthog-js bump available | VERIFIED |
| DIA-035 | P3 | No | Service-worker CACHE_VERSION not bumped since 20 Jun | VERIFIED |
| DIA-038 | P3 | No | Copy inconsistencies (ages 3–11 og:alt; unenforced 30-learner cap) | VERIFIED |
| DIA-039 | P3 | No | 50 MB dist with unoptimised media (5.7 MB PNG) | VERIFIED |

(9 P1 + 21 P2 + 9 P3 = 39 total. The two ACCESS BLOCKED items, DIA-037/DIA-040, are counted within P2 as open verification obligations.)

---

## 8. Root-cause clusters

**RC-1 — Ungoverned release path (feeds DIA-001, 002, 003, 004, 005, 021, 026, 032, 033, 035).** There is no enforced route from "fix merged" to "fix in production". Production is promoted by hand from whichever branch was last built; nothing requires PRs to merge to master first; the documented local gate cannot pass (lint-red repo) so it is routinely bypassed; migrations are applied to prod by hand without always landing the files in the repo. The 20 Jul incident — a promote that silently reverted four days of merged, deployed fixes — is the direct product of this. Every "fix exists but isn't live" issue in this audit traces here.

**RC-2 — Fire-and-forget failure handling in scheduled/background paths (feeds DIA-008, 029, 030, 031, 012-detection).** Nightly crons have failed for a month with no alert; ingest can die without anyone knowing; the heartbeat bug of July was the same shape. The billing-health cron proves the team knows how to build self-detecting jobs — that pattern simply hasn't been applied to retention, matview refresh, ingest liveness, or trial creation.

**RC-3 — Anon-facing surface designed for frictionless class join, never re-narrowed (feeds DIA-006, 007, 010).** The join-by-code flow legitimately needs some anon access, but the implementation grants anon broad SELECT on live sessions/rosters, EXECUTE on dozens of definer functions, and even TRUNCATE/TRIGGER table grants — and stale "live" sessions extend the exposure window indefinitely because nothing ends them.

**RC-4 — Two-app/two-host ambiguity (feeds DIA-016, 013, 002).** The retired platform/ Next.js prototype's Vercel project still owns app.drawintheair.com, still auto-builds every push, and currently serves a stale copy of the kid app — while production code still points its default lead-form endpoint and some links at that host. Nobody owns the second project's lifecycle.

**RC-5 — Camera-first design without degraded-mode engineering (feeds DIA-020, 022, 023).** The product treats "camera present, CDN reachable, hand visible" as invariants. School reality (filtered networks, unplugged webcams, SEND needs) violates all three; there is no bundled model fallback, no disconnect recovery, and no alternative input.

**RC-6 — Measurement written for the happy path (feeds DIA-029, 030, 032, 015, 038).** Event emission is good, but lifecycle closure is not: attempts don't terminate (idle-timeout unshipped), the attempts writer listens for an event nobody emits, trial rows never transition, and the anomaly detector references a retired event name.

---

## 9. Remediation roadmap (no fixes were implemented in this audit)

**Wave 0 — Immediate safety/stability (≤1 day, mostly SQL + config; do first, in this order):**
1. DIA-008: fix retention purge (make `sessions.code` nullable OR purge by delete/archival path consistent with the NOT NULL constraint), run once manually, verify row counts, keep the cron. *Migration required; test on a branch DB first.*
2. DIA-007: schedule `class_end_stale_sessions()` (pg_cron) and end the 4 stale sessions; then narrow anon SELECT on sessions/session_students (e.g. join-code-scoped RPC instead of table SELECT) as a follow-up migration.
3. DIA-006: single migration — add `is_platform_admin()` guard (as in dashboard_growth) to all 33 dashboard_* RPCs; revoke anon EXECUTE on all of them plus class_child_delete/anonymise/archive.
4. DIA-012: repair the trial trigger (backfill role metadata or drop the role gate); backfill trials for the 3 affected accounts; add a daily count check (signups minus trials).
5. DIA-013: point the form-submission client at a live endpoint (or restore the api route on the production project); verify with one test submission.
6. DIA-031: fix or retire the matview-refresh cron.
7. DIA-029: manual ingest smoke test (open /play, verify an event lands); add a "zero events in 24 h" alert to the daily digest.

**Wave 1 — Before term (code + release governance, ~1 week):**
8. DIA-001/002/003: merge PR #14 and PR #10 into master deliberately (restoring PR #11–13 work), make master the only production branch, turn on branch protection with the CI checks required, fix check-task.sh (lint baseline or fix the 11 errors — DIA-033), delete/close stale PRs, update CLAUDE.md. Redeploy from master. *This restores the reverted teacher UX (DIA-026) as a side effect.*
9. DIA-004: reconcile migrations — commit the two 16-Jul prod migrations into the repo, renumber duplicates, adopt "migration lands in repo before prod" as policy.
10. DIA-009: gate consent UI away from child play routes (adult-gesture or pre-play adult step), default analytics OFF on /play//join, configure Clarity masking (or drop Clarity from child routes). Verify in the Clarity dashboard that historical recordings don't contain child gameplay; delete if they do.
11. DIA-020: self-host MediaPipe WASM + model under /assets (immutable-cached) with CDN as fallback; test on a filtered network profile.
12. DIA-022: add `track.onended`/`devicechange` handling → CameraRecovery reuse.
13. DIA-014: enforce entitlement + parental-controls server/menu-independent at mode mount.
14. DIA-025: run the mandatory manual matrix (§10) on a school-grade device; capture evidence.
15. DIA-037: verify Supabase backup/PITR setting, do one restore drill to a branch, write down rollback ownership (Vercel promote-to-previous + DB restore steps).

**Wave 2 — First two weeks of term:**
16. DIA-015 (expire zombie trials via one UPDATE + status honesty in dashboards), DIA-016 (retire or lock app.drawintheair.com; move lead endpoint), DIA-017/018/019 (robots.txt line fixes; prerender /parents; real 404 page for unknown routes; dedupe seasonal titles), DIA-021 (implement Phase 1 active-player lock per docs/PRIMARY_PLAYER_LOCK_ARCHITECTURE.md or correct the product contract), DIA-027 (teacher single-writer guard), DIA-030/032 (wire attempts writer to real events; ship idle-timeout PR #8), DIA-036 (unpause staging or use Supabase branches; stop previews pointing at prod DB).

**Wave 3 — Later:** DIA-005, 010, 011, 024, 034, 035, 038, 039 (hardening, hygiene, copy, asset weight).

**Changes needing migrations/service config vs code:** migrations — items 1, 2, 3, 9; service config — 2 (cron), 7 (alert), 15 (backup), 16 robots/Vercel domain; code — everything else; manual device validation — items 10, 11, 12, 14.

---

## 10. Release acceptance plan (must pass after remediation, before first school use)

**Automated (all on the release SHA):** npm ci, type-check, lint (0 errors), test (252+), check:csp, check:secrets, build (93+ prerendered routes), plus new regression tests: retention-purge SQL test; dashboard_* RPC 403-for-non-admin test; anon cannot SELECT another session's roster; signup→trial row created; entitlement enforced at mode mount (URL bypass test); form submission 2xx test.

**Manual/live (evidence captured for each):**
1. **Classroom E2E (gate for DIA-025):** teacher + student in separate browser contexts on real hardware — create class → join by code → assign → pause → resume → change activity → student refresh → teacher refresh → short network drop → complete → end → results persisted. State consistent throughout; pause reaches student ≤5 s.
2. Camera onboarding on a Chromebook-class device: first visit → permission → wave → first gesture ≤60 s; denial → recovery → retry; **unplug webcam mid-game** → recovery screen (post-DIA-022).
3. Filtered-network test: block cdn.jsdelivr.net + storage.googleapis.com → product still starts (post-DIA-020).
4. Privacy capture: DevTools network log through a full camera session — zero pixel/frame payloads leave the browser; Clarity dashboard shows masked/no child-route recordings.
5. Stripe test-mode event → billing_events row → entitlement change → UI reflects it.
6. Two-teacher-tabs behaviour defined and observed; 30-learner join load smoke.
7. Keyboard-only pass of teacher signup→session and parent signup→dashboard.
8. Rollback drill: Vercel promote-to-previous executed once; DB restore path documented and tested on a branch.

**Staging/smoke:** production smoke after each deploy = home 200 + /play loads tracker + one event ingested + webhook health green. Rollback trigger: any smoke failure or classroom-sync regression.

---

## 11. Appendices

### A. Commands and results (production SHA 6a81fdf, Node 22.22.2/npm 10.9.7 container)
| Command | Result | Detail |
|---|---|---|
| npm ci | PASS 18 s | 369 packages, 0 deprecation warnings |
| npm run type-check | PASS 22 s | |
| npm run lint | **FAIL** 49 s | 11 errors / 298 warnings (docs claim 9) |
| npm test | PASS 10 s | 25 files, 252/252, 0 skipped |
| npm run check:csp | PASS | 12/12 origins |
| npm run check:secrets | PASS | |
| npm run check:env-safety | PASS | WARNs on absent env (non-fatal) |
| npm run build | PASS 61 s | 93 prerendered routes, 101 HTML files, no sourcemaps |
| npm audit (prod) | 16 vulns | 2 high — both server-side (sharp/@vercel/og), not in browser bundle |
| npm audit (full) | 29 vulns | 1 critical (vitest, dev-only); browser-real: react-router-dom moderate |

### B. Route map
Complete table in `docs/audits/evidence/web.md` (§route map). Headline: 93 prerendered marketing routes live with unique meta; SPA families /play /join /class /teacher/* /parent/* /admin /subscribe all 200 client-gated; sitemap 90 URLs matches repo; orphans and robots conflicts under DIA-017/018/019.

### C. Environment drift
See §3.2/§3.3. Key SHAs: production 6a81fdf (PR #14) · fix/commercial-day1-leaks 99b7e91 (PR #10, ex-production 16–20 Jul) · master 1b5abae (26 Jun) · main b51355b (14 Mar) · merge-base 579b8e6 (10 Jul). Open PR merge refs: #2 #3 #5 #6 #7 #8 #9 #10 #14.

### D. Database/RLS coverage map
All 50 public tables RLS-enabled (full per-table policy map in findings/database.md). Realtime publication: sessions, session_students, round_scores, session_activities. SECURITY DEFINER inventory: 28 anon-executable functions (list in findings), 33 ungated dashboard_*. Applied-migration list and repo diff in findings/database.md §migrations.

### E. Event/analytics coverage map
Daily event-count series 14 Jun–15 Aug, funnel event inventory, mode_started/mode_completed ratios by mode, and orphan-rate table in findings/data-billing.md. Notable series facts: outage trough 26 Jun–8 Jul; recovery 9 Jul; steady 3–13 sessions/day through the lookback; last event 2026-08-14 17:03 UTC; classroom events zero after 14 Jul.

### F. Evidence index
- `docs/audits/evidence/00-baseline-ledger.md` — Phase 0 ledger (Vercel/GitHub/Supabase identity proofs)
- `findings/build.md` — full build/CI audit *(delivered as evidence/build.md)*
- `findings/web.md` — live HTTP evidence, headers, route map *(evidence/web.md)*
- `findings/database.md` — RLS/grants/cron/drift *(evidence/database.md; raw advisor JSON dumps intentionally not committed)*
- `findings/data-billing.md` — billing chain, event series, funnel *(evidence/data-billing.md)*
- `findings/product-code.md` — privacy sinks, camera states, activity inventory, manual-test list *(evidence/product-code.md)*

*All conclusions in this report are labelled VERIFIED / INFERENCE / HISTORICAL / UNVERIFIED / ACCESS BLOCKED at their point of statement or in the underlying findings files. No fixes, migrations, deployments, or configuration changes were made during this audit.*


