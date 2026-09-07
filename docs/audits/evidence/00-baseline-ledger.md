# Evidence Ledger — Phase 0 baseline (all VERIFIED unless noted)
Audit start: 2026-08-15 (UTC). Lookback: 2026-07-15 → 2026-08-15.

## Production identity (VERIFIED via Vercel MCP, 2026-08-15)
- Team: withinafricas-projects (team_Q3v8UKqzPwTEizJq67GGPUGR)
- Project drawintheair (prj_AmvVJ8qowbPNoQlrEGw0SciqZgIC), framework=vite, node 24.x, region iad1
  - Domains: drawintheair.com, www.drawintheair.com, drawintheair.vercel.app, + branch alias feat-ssg-prerender
  - ACTIVE PRODUCTION DEPLOYMENT: dpl_9GNY6QoBhvLEg7n375RgEgKJCwHi, created 2026-07-20T19:48:53Z, state READY
  - meta.githubCommitSha = 6a81fdf6eb84495e1a42f7f48a6a0e4f466c6880, ref feat/ssg-prerender, PR #14
  - action=promote of dpl_HsyARhbVX5zffdTnZaYsXKDSP1n1 (same SHA). NO production deploys since 20 Jul 2026.
- Project drawintheair-m34j (prj_aMcfIE9EHCyCNAWvRrnmx4FkNGzz), framework=nextjs — serves app.drawintheair.com.
  All recent deployments are previews (target null). Deploys on every push (last: 6a81fdf 20 Jul). Purpose/production alias needs verification.

## Repo baseline (VERIFIED via fresh clone 2026-08-15, /home/claude/dia-audit/repo)
- origin default branch: master (1b5abae, 2026-06-26). origin/main: b51355b (stale, 2026-03-14).
- Production SHA 6a81fdf checked out DETACHED. All code findings reference this checkout.
- Ancestry: 6a81fdf = 579b8e6 (2026-07-10, prod-tip merge-base) + 1 SSG commit (2026-07-20).
- Production is NOT an ancestor of master; master NOT ancestor of production. master..prod = 23 commits; prod..master = 1 (lint fix).
- fix/commercial-day1-leaks head 99b7e91 (WAS production 16–20 Jul) contains PR #11 (classroom rejoin-reclaim client, nav), PR #12 (insights Calm/Growth), PR #13 (flat menus) — ALL ABSENT from current production. The 20 Jul SSG promote reverted them (release-governance drift).
- Open PR heads (ls-remote): #14=6a81fdf (=prod), #10=99b7e91, #3=9ba0298, #5=8724a9e, #6=d0570e0, #7=9c74b29, #8=1f142b7, #1/#2=4d9eef7, #9=593e3c6 (open/closed state to verify via API).
- Tag: production-before-release-workflow-20260625 = d355bbf (2026-06-20).
- package.json: engines node>=20; scripts build includes prerender (tsc -b && vite build && SSR build && prerender-seo.mjs); prebuild = check:csp + type-check. Lockfile: package-lock.json present.
- CLAUDE.md claims "Production deploys from master" — CONTRADICTED by Vercel (production = feat/ssg-prerender). Documentation drift. Also warns: lint red on master (9 pre-existing errors), a secret leaked into git history once.
- vercel.json: SPA rewrite to /index.html excluding api|assets|images|public|favicon|logo|robots|sitemap|health.json|.well-known; www→apex redirect; CSP + security headers defined here; /stem-learning redirect.

## Data plane (VERIFIED via Supabase MCP)
- Production Supabase: fmrsfjxwswzhvicylaph "draw-in-the-air", eu-west-2, ACTIVE_HEALTHY, PG 17.6.1.063. Matches CSP connect-src in vercel.json.
- Staging dcivdrhxeaiulbbhsgfv: INACTIVE (paused) — no usable staging environment.

## Historical hypotheses to retest (HISTORICAL until re-verified)
- Realtime anon EXECUTE grant on is_admin_user applied 10 Jul (migrations 0025/0026).
- class_join v2 + heartbeat fix applied 16 Jul (classroom_reclaim_roster_link); dashboard_growth RPC admin-gated.
- Older dashboard_* RPCs reportedly have NO in-body admin check, granted to all authenticated (flagged 16 Jul, unresolved).
- Analytics ingest outage 26 Jun–9 Jul fixed 9 Jul (ingest RPCs applied; client fix in 13659bb — IS in prod ancestry).
- Stripe webhook 18h billing_events gap (historical incident).
