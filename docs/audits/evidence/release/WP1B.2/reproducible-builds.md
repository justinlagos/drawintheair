# WP1B.2 — Reproducible builds & deploy-contract enforcement

Date: 2026-09-07 · Branch: `release/new-term` · Worktree `/home/claude/dia-release`
Executor: Claude (Fable 5.1), offline. Nothing was run against Vercel or Supabase.

## A. Changes in this commit (what the repo now enforces by itself)

| Area | Before | After | Why |
|---|---|---|---|
| `vercel.json` `installCommand` | `npm install` | **`npm ci`** | Lockfile-exact installs; a drifted `package-lock.json` fails instead of silently resolving. Same command CI uses. |
| Node major | `.nvmrc` = 20; `engines.node` = `>=20.0.0`; CI = 20; Vercel = dashboard default (unpinned) | `.nvmrc` = `20`; **`engines.node` = `20.x`**; CI reads one `NODE_VERSION: '20'` | One major everywhere. Vercel picks the Node major from `engines.node` when the dashboard is set to the default — see founder step 3 to make the dashboard match. Node 20 is what CI has been green on. (Local container is Node 22.22; npm only warns on an engines mismatch, so local dev still works.) |
| `package.json` `prebuild` | `check:csp && type-check` | **`check:env-safety && check:csp && type-check`** | The env guard now runs inside every `npm run build`, i.e. inside every Vercel build. Previously it only ran in CI with placeholder env, so it could never protect a real deploy. |
| `scripts/check-env-safety.mjs` Rule 3 | fail on production if `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` missing (but never executed on Vercel) | same rule, now executed by `prebuild`; plus rejects a malformed `VITE_SUPABASE_URL` in production | `src/lib/supabase.ts` and `src/lib/analytics.ts` fall back to `''` — a production bundle built without these ships a site with dead Class Mode / auth / analytics. |
| `scripts/check-env-safety.mjs` Rule 3b (new) | — | **`VERCEL_ENV=production` must have `VERCEL_GIT_COMMIT_REF=master`**; missing ref (CLI `vercel --prod`) or another branch → build fails | Build-time half of "deploy only by merge to master". |
| `scripts/check-env-safety.mjs` Rule 1 | preview → production Supabase ref = FAIL (never ran on Vercel) | **WARN by default; FAIL when `ENV_SAFETY_STRICT_PREVIEW=1`** | Now that the guard runs in real Vercel builds, a hard fail would break every PR preview if Preview env still points at the single production Supabase project (only one ref exists in the CSP). Founder step 5 turns it strict. |
| `.github/workflows/ci.yml` | 5 jobs, stale "lint red" comments, Node hard-coded 5× | 5 jobs mirroring the Vercel build (`npm ci` → `npm run build` incl. prebuild), one `NODE_VERSION`, plus: an assertion that the production guard **fails** without Supabase vars, and an assertion that the build wrote **≥ 93 prerendered route files** | CI = Vercel = `check-task.sh`. |
| `.github/workflows/typecheck.yml` | triggered only on `main` → never ran | **deleted** | Dead duplicate of ci.yml's typecheck + lint. |

Vercel-side sequence after this change: `npm ci` → `npm run build` → `prebuild`
(`check-env-safety` → `check:csp` → `tsc -b --noEmit`) → `tsc -b` → `vite build` →
`vite build --ssr` → `prerender-seo.mjs`. Any step non-zero = no deployment.

## B. Evidence

Guard matrix (`node scripts/check-env-safety.mjs`, exit codes):

| Scenario | env | exit |
|---|---|---|
| Local dev, nothing set | — | **0** (2 WARN) |
| Production, Supabase vars missing | `VERCEL_ENV=production VERCEL_GIT_COMMIT_REF=master` | **1** (2 FAIL) |
| Production, vars set, from master | + `VITE_SUPABASE_URL=https://fmrsfjxwswzhvicylaph.supabase.co VITE_SUPABASE_ANON_KEY=…` | **0** |
| Production, vars set, from `main` | `VERCEL_GIT_COMMIT_REF=main` | **1** ("only master may deploy") |
| Production, vars set, CLI upload (no ref) | no `VERCEL_GIT_COMMIT_REF` | **1** ("must be built by Vercel from Git") |
| Preview pointing at production ref | `VERCEL_ENV=preview` | **0** (WARN) — **1** with `ENV_SAFETY_STRICT_PREVIEW=1` |
| CI placeholders | `VITE_APP_ENV=ci` + example URL | **0** |

End-to-end: `VERCEL=1 VERCEL_ENV=production VERCEL_GIT_COMMIT_REF=master npm run build`
with no Supabase vars → **exit 1** in `prebuild`; Vite never starts.

Full local gate after the change: `./scripts/check-task.sh` → **exit 0**
(lint 0 errors / 162 warnings ≤ ratchet; typecheck clean; 26 files / 256 tests pass;
env-safety OK with 2 WARN; CSP OK; secret scan OK; build OK — pass 2 wrote 93 full-body
route files).

## C. Founder-only steps (dashboard / GitHub settings — cannot be done from the repo)

Do these in order, after `release/new-term` is pushed and merged to `master`.

### Vercel → project `drawintheair`
1. **Settings → Git → Production Branch = `master`.** Confirm (it should already be).
   If it says `main`, change it — that is the single most important setting.
2. **Settings → Git → Ignored Build Step:** leave default. Do **not** add build-skipping
   logic that could bypass `prebuild`.
3. **Settings → General → Node.js Version = 24.x.** Match `.nvmrc`/`engines`. If Vercel
   already shows "24.x" (inferred from `engines`), just confirm.
4. **Settings → Environment Variables → Production scope** must contain
   `VITE_SUPABASE_URL` (= `https://fmrsfjxwswzhvicylaph.supabase.co`) and
   `VITE_SUPABASE_ANON_KEY`. After this PR the production build **fails** without them —
   verify they are present *before* merging, or the first production build after merge
   will fail (safe: the previous deployment stays live).
5. **Preview scope:** ideally a non-production Supabase project. Once that exists add
   `ENV_SAFETY_STRICT_PREVIEW=1` (Preview scope only) so previews can never touch
   production data. Until then previews build with a WARN.
6. **Manual promote:** Vercel has no switch to disable "Promote to Production" /
   "Instant Rollback" for a project owner. Mitigations: (a) the deploy contract in
   `CLAUDE.md` forbids it; (b) Rule 3b blocks any *rebuild* that is not a Git build of
   `master`; (c) if the team ever has more than one member, use **Settings → Members**
   roles so only the founder can promote; (d) treat any promote as an incident and
   write it into `docs/audits/RELEASE_FINDINGS_LOG.md`. Rollback path = revert PR on
   master (update `docs/ROLLBACK.md`, see findings log #4).
7. **Settings → Git → Deploy Hooks:** delete any deploy hook that targets `master`
   (a hook bypasses the PR/CI path).
8. Optional: **Settings → Deployment Protection** → protect Preview URLs (Pro).

### GitHub → repo settings
9. **Settings → Branches (or Rules) → add ruleset for `master`:**
   - Require a pull request before merging (0 approvals is fine for a solo maintainer).
   - **Require status checks to pass:** `lint`, `typecheck`, `secret-scan`,
     `unit-tests`, `build` (job names from `ci.yml`). Tick "require branches to be up
     to date".
   - Block force pushes; block deletions; do not allow bypass for admins.
10. **Settings → General → Default branch = `master`** (if it is still `main`).
11. **Settings → General → Pull Requests:** squash merge on; rebase merge off;
    auto-delete head branches on.
12. Close stale PRs #2, #3, #5, #6, #7, #8, #9, #10 (list + comment text in
    `docs/audits/evidence/release/WP1B.1/merge-train.md` §5); mark #11/#12/#13 closed
    as superseded once `release/new-term` merges.

### Verification (do not claim done until checked)
- Open the `release/new-term` PR → all five checks appear and go green → Vercel Preview
  builds (with a WARN if Preview env still uses the production Supabase ref).
- After merge: the production deployment's build log shows
  "— Environment safety check — … OK" and "pass 2: wrote 93 full-body route file(s)".
- Try a direct push to `master` → rejected by the ruleset.

## Amendment, 8 Sept 2026: Node major moved from 20 to 24

Vercel build log on the release branch: "Node.js version 20.x is deprecated. Deployments created on or after 2026-10-01 will fail to build." Production had been building on 24.x before the WP1B.2 pin (the log says "Node.js version changed from 24.x to 20.x"). Pin moved to 24 in `.nvmrc`, `engines.node` and `ci.yml` so Gate 3 cannot fall over on the Vercel cutoff. Local checks re-run on Node 22 (only major available in the build container); CI on 24 is the proof.

Also observed in the same log, three failed production builds on 8 Sept: founder pressed Promote on the release/new-term preview. The env-safety guard refused each one ("only master may deploy to production"). That is the intended behaviour. Gate 3 is a PR merge into master.
