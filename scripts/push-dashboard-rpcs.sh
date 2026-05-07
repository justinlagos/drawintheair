#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

git add -A
git commit -m "feat(analytics): Phase 3.1 — read-only dashboard RPCs

Six SECURITY DEFINER functions exposed for the upcoming insights
dashboard (see ANALYTICS_PLAN.md). Each is granted EXECUTE to anon,
runs as the postgres owner, returns aggregate JSON only, and never
leaks school_id or class_id. The dashboard reads them with the
public anon key already baked into the production bundle — no new
JWT to mint, no secret to rotate.

Why functions rather than a separate JWT-bearing role: a leak of
the function-callable anon key only exposes what the functions
choose to return. A leak of an authenticated dashboard JWT would
expose every column on every row including the school/class IDs we
collect for the pilot. Narrow surface beats clever auth.

Functions added:
  • dashboard_today()                       — KPIs for today (UTC)
  • dashboard_funnel(in_days)               — 11-step activation funnel
  • dashboard_tracker_health(in_days)       — GPU/CPU split + median ms
  • dashboard_top_modes(in_days)            — per-mode start/complete rate
  • dashboard_errors(row_limit)             — recent system_error,
                                              csp_violation,
                                              tracker_init_failed,
                                              camera_denied
  • dashboard_latest_sessions(row_limit)    — last N sessions w/ summary

All set search_path = public, pg_temp to defend against the classic
SECURITY DEFINER schema-hijack pattern.

Migration was applied directly to the production project via the
Supabase MCP apply_migration tool; this commit captures the SQL for
git history and so a fresh project can be rebuilt with supabase db
push. The git copy and the live database are in lockstep."

git push origin master

echo ""
echo "Pushed dashboard RPCs."
echo "The Cowork insights artifact is already live in the sidebar — pin it."
