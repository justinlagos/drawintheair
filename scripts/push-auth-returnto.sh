#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

node scripts/check-csp.mjs
npx tsc -b

git add \
  src/lib/supabase.ts \
  src/context/AuthContext.tsx \
  src/pages/admin/InsightsDashboard.tsx \
  src/pages/classmode/TeacherDashboard.tsx \
  scripts/push-auth-returnto.sh

git commit -m "fix(auth): land on the page you signed in from, not /class

Symptom: signing in to /admin/insights with the same Google account
already used for /class bounces straight back to /class. The OAuth
flow was hardcoded to redirect to /class, so anyone signing in from
another route landed in the wrong place.

Fix: signInWithGoogle(returnTo?) stashes the caller's intended
landing path in sessionStorage before kicking off OAuth. The
Supabase auth allow-list still only contains /class (so we don't
have to register every internal admin path with Supabase), and
handleAuthCallback honours the stashed returnTo after exchanging
the access_token — only allowing internal paths starting with '/'
to defend against open-redirect.

  src/lib/supabase.ts
    • signInWithGoogle(returnTo?: string) stashes 'sb-return-to'.
    • handleAuthCallback() reads + clears it after a successful
      session, calling window.location.replace() to land on the
      requested page. Internal-paths-only check.

  src/context/AuthContext.tsx
    • signIn type is now (returnTo?: string) => void.

  src/pages/admin/InsightsDashboard.tsx
    • SignInGate calls signIn('/admin/insights') so a successful
      OAuth lands the admin back on the dashboard.

  src/pages/classmode/TeacherDashboard.tsx
    • onClick=\\\`{signIn}\\\` was passing the React MouseEvent as the
      first argument; wrapped in () => signIn() so the new optional
      string parameter doesn't choke.

VERIFICATION
- tsc -b   clean
- vite     transforms 215 modules

POST-DEPLOY
Sign in to drawintheair.com/admin/insights with the allow-listed
account. You should land on /admin/insights, not /class.
Existing /class teacher sign-in is unchanged."

git push origin master

echo ""
echo "Pushed return-to fix."
echo "After Vercel deploys, /admin/insights sign-in stays on the dashboard."
