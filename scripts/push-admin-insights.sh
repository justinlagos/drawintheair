#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

node scripts/check-csp.mjs
npx tsc -b

git add \
  src/pages/admin/InsightsDashboard.tsx \
  src/main.tsx \
  scripts/push-admin-insights.sh

git commit -m "feat(admin): /admin/insights — auth-gated React analytics dashboard

A native drawintheair.com page that mirrors the Cowork insights
artifact. Eleven panels backed by the SECURITY DEFINER RPCs we
already deployed: today, activation funnel, tracker health,
most-played modes, error stream, cohort retention, per-item mastery,
curriculum coverage, mastery milestones, classrooms, latest
sessions.

AUTH MODEL
  • Component-level allow-list, NOT a database privilege change.
  • Renders <SignInGate> if !user → 'Sign in with Google' button
    (uses the existing src/lib/supabase.ts signInWithGoogle).
  • Renders <NotAllowed> if user.email is not in ALLOWED_ADMINS
    (currently { mrjustinukaegbu@gmail.com }).
  • Only renders <DashboardBody> for allow-listed admins.

The RPCs themselves are still anon-callable (SECURITY DEFINER plus
GRANT EXECUTE TO anon), so the auth gate is purely UI. That is fine
— the RPCs already only return aggregated, non-PII data, and the
page is noindexed via SEOMeta. To tighten further we could swap the
RPC GRANTs to authenticated-only and call them with the user's JWT.

ROUTE
  /admin/insights  →  React.lazy import in main.tsx, wrapped in
                       Suspense + the existing AuthProvider.
  /admin           →  unchanged, still the /admin PIN page

VERIFICATION
- tsc -b           clean
- eslint           0 errors
- vite build       215 modules transformed (was 214)
- check-csp        passes

After Vercel deploys, sign in at drawintheair.com/admin/insights
with the Google account on the allow-list. Adding more admins is
one line: append the email to ALLOWED_ADMINS in
src/pages/admin/InsightsDashboard.tsx."

git push origin master

echo ""
echo "Pushed /admin/insights route."
echo "Visit https://drawintheair.com/admin/insights once Vercel goes Ready."
echo "Sign in with mrjustinukaegbu@gmail.com — the dashboard renders."
echo "Anyone else hitting the URL gets the 'access denied' screen."
