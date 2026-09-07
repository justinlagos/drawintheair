# WP2B.7 evidence: retire the stale app host (DIA-016)

Branch `wp/2b2`, second commit (after WP2B.2). Date 2026-09-07.

## Problem

`app.drawintheair.com` is served by a separate Vercel project (`drawintheair-m34j`,
originally the retired `platform/` Next.js prototype). It now serves a stale,
unauthenticated Vite build of the child app with old asset hashes and an older CSP,
rebuilds previews on every push, and has no API routes. Product code still linked to it
(teacher login, "Full Dashboard", CORS allow-list, CSP connect-src, env template).
Children and teachers following those links could land on an obsolete build.

## What changed in this repo

Full sweep: `grep -rn "app\.drawintheair\.com"` over src, public, index.html,
vercel.json, sitemap, api, config, supabase (functions, migrations, email templates),
docs, platform.

| File | Before | After |
|---|---|---|
| `src/components/landing/Footer.tsx` | Teacher Login to `${VITE_PLATFORM_URL or app host}/auth/login` | `/teacher/login` (same origin) |
| `src/pages/classmode/TeacherDashboard.tsx` | "Full Dashboard" to `${app host}/auth/login?redirect=/dashboard` in a new tab | `/teacher/dashboard` (same origin, same tab) |
| `supabase/functions/_shared/cors.ts` | app host in ALLOWED_ORIGINS | removed |
| `vercel.json` CSP `connect-src` | included `https://app.drawintheair.com` | removed |
| `.env.example` | `VITE_PLATFORM_URL` block pointing at the app host | removed (variable is no longer read anywhere) |
| `platform/CLAUDE.md` | described the prototype as live on the app host | marked retired, host being redirected |
| `docs/pitch/01_CSO_meeting_talking_points.md`, `docs/pitch/03_safety_and_compliance_dossier.md` | claimed the CORS allow-list includes the app host | claim corrected to match the code |

`VITE_PLATFORM_URL` had only those two readers, both now gone.

Left untouched on purpose (historical records, not product links): `docs/audits/*`,
`docs/SECURITY_AUDIT_2026-05-21.md`, `docs/SECURITY_HARDENING_REPORT.md`,
`docs/GO_LIVE_STABILIZATION_REPORT.md`, `docs/ROUTE_MAP.html`, `e2e-test-report.html`
(repo root clutter, already logged in RELEASE_FINDINGS_LOG #10). Logged as finding
below so they can be pruned in the cleanup PR.

Remaining mentions in product code are comments explaining the history
(`src/lib/formSubmission.ts`, `supabase/functions/lead-capture/index.ts`, the WP2B.2
migration header) and the negative test in `tests/lead-capture.test.ts` that asserts
the app host is NOT an allowed origin.

No change was made to this project's `vercel.json` for the other host: redirects for
`app.drawintheair.com` cannot be expressed in the `drawintheair` project because that
hostname is attached to the other project.

## Verification

Run on `wp/2b2` after the WP2B.7 commit:

| Check | Result |
|---|---|
| `npm run type-check` | pass |
| `npm run lint` | 0 errors, 162 warnings (ratchet unchanged) |
| `npm test` | 28 files, 277 tests pass |
| `npm run build` | pass (check-csp passes without the app host in connect-src) |
| `grep -rn "app\.drawintheair\.com" src public index.html vercel.json supabase api config` | only the history comments and the negative test listed above |

## Founder steps (by hand): retire the host

Do this AFTER the WP2B.2 lead endpoint is live in production (Gate 3 deploy plus the
function deploys in the WP2B.2 README), because until then the old build is the only
thing answering on that host.

### Recommended: Option A, delete the project and redirect at Cloudflare

Why A over B: Option B keeps `drawintheair-m34j` alive, connected to the repo, building
a preview on every push, owned by nobody (root cause RC-4 in the audit). A redirect-only
project is still a project someone can accidentally promote. Deleting it removes the
second deploy target for good, and Cloudflare serves the 301 at the edge with no build.

1. Vercel, project `drawintheair-m34j`, Settings, Domains: note that
   `app.drawintheair.com` is attached. Settings, General, scroll to Delete Project,
   confirm by typing the project name. This detaches the domain and stops all builds.
2. Cloudflare, zone `drawintheair.com`, DNS: edit the `app` record so it is
   **Proxied** (orange cloud). If the record currently points at Vercel
   (`cname.vercel-dns.com` or `76.76.21.21`) change it to `A app 192.0.2.1` proxied.
   The target is irrelevant once a redirect rule matches; it only has to be proxied so
   Cloudflare answers the request.
3. Cloudflare, Rules, Redirect Rules, Create rule:
   - Name: `app host to apex`
   - When incoming requests match: Custom filter expression
     `(http.host eq "app.drawintheair.com")`
   - Then: Dynamic redirect, expression
     `concat("https://drawintheair.com", http.request.uri.path)`
   - Status code: 301. Preserve query string: on.
4. Cloudflare, SSL/TLS: confirm the edge certificate covers `app.drawintheair.com`
   (the Universal certificate covers `*.drawintheair.com`, so this is normally already
   true). Without it, HTTPS requests fail before the redirect runs.
5. Verify from any machine:
   `curl -sI https://app.drawintheair.com/play?x=1` expect `HTTP/2 301` and
   `location: https://drawintheair.com/play?x=1`.
   `curl -sI https://app.drawintheair.com/` expect `location: https://drawintheair.com/`.
6. Record the deletion date and the curl output in this folder as `retired.md`.

### Alternative: Option B, keep the project, serve redirects only

Only if the founder wants to keep the Vercel project for some other reason.

1. Vercel, project `drawintheair-m34j`, Settings, Git: disconnect the repository so it
   stops building on push.
2. Create a tiny standalone repo (or upload via `vercel deploy` from an empty folder)
   containing only:
   ```json
   {
     "redirects": [
       { "source": "/(.*)", "destination": "https://drawintheair.com/$1", "permanent": true }
     ]
   }
   ```
   as `vercel.json` and deploy it to that project as Production.
3. Settings, Deployment Protection: leave off (a redirect must be public).
4. Verify with the same curl checks as Option A (Vercel answers 308 rather than 301;
   both are fine for browsers and search engines).

### Either way, afterwards

- Google Search Console: if `app.drawintheair.com` was ever verified as a property,
  leave it; the 301s consolidate to the apex.
- Supabase Auth, URL Configuration: remove any `https://app.drawintheair.com/**`
  entry from Redirect URLs if present (historical docs mention it was added).
- Stripe: if any webhook endpoint points at `app.drawintheair.com/api/stripe/*`, delete
  it; production webhooks go to the Supabase `stripe-webhook` function.

## Rollback

Code: revert the WP2B.7 commit (restores the app host in CSP and CORS; harmless either
way). Host: if the redirect must be undone, delete the Cloudflare rule and re-add the
domain to a Vercel project; nothing in this package depends on the host existing.

## Findings logged

See `docs/audits/RELEASE_FINDINGS_LOG.md` entries added by this package.
