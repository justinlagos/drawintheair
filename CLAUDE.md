# Draw in the Air

Hand-tracking drawing and learning web app for young children, live in schools.
Two apps in one repo: the kid-facing Vite app (root) and the teacher platform
(`platform/`, Next.js — it has its own CLAUDE.md).

# Non-negotiables

- Read AI_AGENT_RULES.md before any work — its 17 rules and hard prohibitions bind every agent.
- Deploy contract: production = the `master` branch (NOT `main`) on Vercel project
  `drawintheair`. The ONLY way to deploy is a PR merged to `master` (squash) with CI
  green; no manual promotes / rollbacks-to-arbitrary-deploys / CLI `vercel --prod`.
  Never edit on master — start with `./scripts/start-task.sh <prefix> <name>`.
- Before claiming anything is done, run `./scripts/check-task.sh` (lint, typecheck,
  tests, secret/CSP/env guards, production build) and report the real results.
- This product serves children: no external links in child mode, no video storage,
  camera frames never leave the browser. Never weaken these.

# Stack

- React 19 + TypeScript + Vite + Tailwind; MediaPipe hand tracking; Supabase
  (Class Mode, auth); Vercel; PostHog/Sentry/Meta Pixel (production hosts only).
- npm with committed lockfile (`npm ci`), Node 20 (`.nvmrc`).

# Commands

- Dev: `npm run dev` · Tests: `npm test` · Full local gate: `./scripts/check-task.sh`
- Fast inner loop while iterating: `npm run validate` (typecheck + lint + CSP).
  It is NOT a substitute for check-task.sh before claiming done.
- Publish branch + PR link: `./scripts/publish-task.sh`

# Where things live

- `src/features/` (classmode, tracking, onboarding, parent, safety…), `src/camera/`,
  `src/core/`; tests in `tests/`; serverless functions in `api/`; migrations in
  `supabase/migrations/`.
- Never save new working files, reports, or .md docs to the repo root — use `docs/`.
  The existing root clutter is historical; don't add to it.
- The agent handover file for this repo lives at `docs/HANDOVER.md` (protocol is in
  the global CLAUDE.md) — never at the repo root. In a worktree, keep it in that
  worktree's docs/ so parallel tasks don't overwrite each other's baton.

# Gotchas (learned the hard way)

- Bugs have shipped that only appeared in the production build (Vercel strict-null
  tsc errors, vendor-chunk TDZ). That's why check-task.sh includes the build — don't skip it.
- `lint` is green (0 errors) but ratcheted at `--max-warnings 162`. Don't add
  warnings; if you remove some, lower the number in `package.json` in the same PR.
- Rendering: no React state updates per frame — use refs. Camera coordinates are unmirrored.
- The Supabase service-role key must NEVER appear in client (`VITE_`) code. `.env` is
  never committed; a secret already leaked into git history once.
- `vitest.config.ts.timestamp-*.mjs` files are junk — never commit new ones.
