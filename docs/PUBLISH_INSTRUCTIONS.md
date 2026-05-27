# How to publish the Nigeria reliability fixes

These steps publish the code changes made on 2026-05-27 so Vercel deploys them.
They must be run on a machine that is logged into GitHub (e.g. Justin's Mac), because
the Cowork environment cannot push to GitHub.

> **The Cloudflare/Nigeria fix is already live and does NOT depend on this.** Publishing
> the code is an *enhancement* (faster loading, removed a blocking dependency, and turns
> error/analytics monitoring back on). Nigeria access is already being fixed by the
> nameserver change.

---

## Before you start — two gotchas

1. **A stale git lock exists in the repo.** Clear it first (harmless):
   ```bash
   cd /Users/Justin/drawintheair-main
   rm -f .git/index.lock
   ```
2. **Confirm which branch Vercel deploys.** In the Vercel dashboard → your project →
   Settings → Git → "Production Branch". It is one branch (likely `main`). Publish to
   THAT branch. Do not try to publish to both `main` and `master` — Vercel only uses one.

---

## What's being shipped — review first

The folder currently has ~60 changed/new files. Most are **other in-progress work**
(e.g. a "building mode" feature, the observability layer, internal docs). The reliability
fixes from this session are the files listed below. Decide whether the rest of the
working tree is ready to ship too — if not, this needs a developer to separate it.

**New files (reliability work):**
- `tailwind.config.js`, `postcss.config.js`  — Tailwind now compiles at build time
- `public/health.json`                        — uptime-monitor heartbeat
- `src/lib/lazyWithRetry.tsx`                  — retry/timeout for page loads on flaky networks
- `docs/NIGERIA_RELIABILITY_REPORT.md`, `docs/PUBLISH_INSTRUCTIONS.md` — docs

**Edited files (reliability work):**
- `vercel.json`            — CSP now allows Sentry + PostHog (so monitoring works); removed Tailwind CDN; added /health.json
- `index.html`             — removed render-blocking Tailwind CDN; deferred analytics; added a loading screen
- `vite.config.ts`         — re-enabled bundle splitting; older-device build target
- `src/main.tsx`           — lazy-load pages + game engine; deferred analytics; boot signal
- `src/index.css`          — Tailwind directives
- `public/service-worker.js` — 6s network timeout; cache version bump
- `.env.example`           — documented new Sentry/BetterStack settings
- `src/lib/observability/sentry.ts` — latency tracing + opt-in privacy-safe replay
- `package.json` + `package-lock.json` — added `tailwindcss` + `autoprefixer`

> ⚠️ Note: the reliability edits depend on the `src/lib/observability/` layer, which is
> currently uncommitted work-in-progress. Publishing the fixes means publishing that
> layer too. That's fine (the app already uses it), just be aware they ship together.

---

## Publish

```bash
cd /Users/Justin/drawintheair-main

# 1. Clear the stale lock (see above)
rm -f .git/index.lock

# 2. Make sure you're on the production branch Vercel uses (e.g. main)
git checkout main          # or whatever Settings → Git → Production Branch shows

# 3. Bring in the changes (review `git status` first if unsure what's included)
git add -A
git status                 # <-- LOOK at this list before committing

# 4. Commit and push — Vercel auto-deploys on push
git commit -m "Nigeria reliability: build-time Tailwind, code-splitting, CSP for observability, SW timeout, retry loader"
git push origin main       # match the branch from step 2
```

Vercel will start a build automatically. Watch it in the Vercel dashboard → Deployments.

---

## After deploy — verify

1. **Visual check (important):** open the live landing page and `/play`. Tailwind moved from
   a runtime CDN to a build step, so confirm the styling looks the same as before. This is
   the one change most worth eyeballing.
2. Confirm `https://drawintheair.com/health.json` returns `{"status":"ok"}`.
3. In Vercel project settings, make sure these env vars exist for Production so monitoring
   transmits: `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`
   (= `https://eu.i.posthog.com`), `VITE_APP_ENV=production`, `VITE_APP_VERSION`.
4. Within a few minutes, confirm events start arriving in Sentry and PostHog.
