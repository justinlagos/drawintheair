# WP0.5.2 — Revoke anonymous EXECUTE: APPLIED

**Applied:** 2026-09-07 ~12:57 UTC, production fmrsfjxwswzhvicylaph, via Supabase MCP execute_sql, under Justin's written go ("analyse it, check it doesn't affect any other thing and apply it").

## Pre-apply caller analysis (re-run today, not trusted from 20 Aug)
- Client, deployed 6a81fdf: only `src/pages/admin/insights/rpc.ts` (engagement_deep, executive_summary, mastery_summary). `callRpc` sends `Authorization: Bearer <user JWT>`; `/admin/insights` is OAuth-gated (src/main.tsx:17, 177) so the effective role is `authenticated`, which keeps EXECUTE. `ingest_latency` has no client caller on any branch.
- Same result on fix/commercial-day1-leaks HEAD and every local branch (git grep across refs/heads, migrations/docs excluded).
- Edge functions (supabase/functions/*): no reference.
- Database: no cron job command, view, matview, trigger or other function CALLS any of the four. `dashboard_funnel` contains the string `dashboard_executive_summary` inside a jsonb literal ('semantics' text), not a call; it is SECURITY DEFINER and anon-revoked already.
- `scripts/verify-security-lockdown.sh` C2 expects executive_summary and engagement_deep to return 401/403 to anon — this change makes that check pass.
- Better Stack monitor targets `dashboard_public_proof` only (excluded).

## Transaction
Revoke of 4 functions + in-transaction DO block that `set local role anon` and executed each; commit only if all four raised insufficient_privilege. Committed.

## Proof 1 (privilege state, post-commit)
| fn | anon | authenticated | service_role | PUBLIC |
|---|---|---|---|---|
| dashboard_engagement_deep(integer) | false | true | true | false |
| dashboard_executive_summary(integer) | false | true | true | false |
| dashboard_mastery_summary(integer) | false | true | true | false |
| dashboard_ingest_latency(integer) | false | true | true | false |

## Proof 2 (external anon HTTP, anon key from deployed bundle index-CTe4U2O1.js)
- POST rpc/dashboard_executive_summary → 401 42501 permission denied
- POST rpc/dashboard_engagement_deep → 401 42501
- POST rpc/dashboard_mastery_summary → 401 42501
- POST rpc/dashboard_ingest_latency → 401 42501
- POST rpc/dashboard_transparency_report → 200 (untouched, still serves /transparency)
- POST rpc/dashboard_transparency_signals → 200 (untouched)
- GET https://drawintheair.com/transparency → 200

## Residual
- Admin insights regression check by an authenticated admin: Justin to load /admin/insights once and confirm the Executive/Engagement/Mastery tiles populate. Expected to pass (authenticated retains EXECUTE).
- Repo migration file for this change: supabase/migrations/20260907120000_wp0_5_2_revoke_anon_dashboard_execute.sql (added with this evidence; lands in the Gate 1B release lineage).

## Rollback
`grant execute on function public.<fn>(integer) to anon;` per function. Reversible.
