# Contributing to Draw in the Air

Production deploys from **`master`**. Everything reaches `master` through a Pull Request.
No feature, fix, or config work begins directly on `master`.

## TL;DR loop
```
./scripts/start-task.sh fix student-join-flow   # branch from latest master
# ...make your focused change + tests...
./scripts/check-task.sh                          # lint, typecheck, tests, build, guards
./scripts/publish-task.sh                        # push branch + print PR link
# open PR -> CI runs -> review Vercel Preview -> founder acceptance -> merge
```

## Branch model
- **Permanent production branch:** `master`.
- **Short-lived task branches:** `feat/*`, `fix/*`, `hotfix/*`, `chore/*`, `docs/*`,
  `test/*`, `refactor/*`. One focused body of work each. Deleted after the work is
  merged and production-verified.
- **No permanent `develop` branch.** **`main` is NOT production** (legacy/default-branch
  confusion — production is and remains `master`).

## Package manager & runtime
- **npm** (committed `package-lock.json`). Install with `npm ci`.
- **Node 20** (`.nvmrc`).

## Required commands (the real ones)
| Purpose | Command |
|---|---|
| Lint | `npm run lint` |
| Typecheck | `npm run type-check` |
| Unit tests | `npm run test` |
| Build | `npm run build` |
| Secret scan | `npm run check:secrets` |
| CSP check | `npm run check:csp` |
| Env-safety guard | `npm run check:env-safety` |

## CI (GitHub Actions, `.github/workflows/ci.yml`)
Runs on PRs into `master`, on pushes to `master`, and on manual dispatch.

- **Required checks (all five verified green locally on `release/new-term`,
  2026-09-07):** `lint` (0 errors, ratcheted at `--max-warnings 162`), `typecheck`,
  `unit-tests` (256 tests), `secret-scan` (secret + CSP + env-safety), `build`
  (Vite production build + 93-route SEO prerender).

  All five must be set as required via **Branch protection → Require status checks**
  (founder action; see `docs/audits/evidence/release/WP1B.2/reproducible-builds.md`).

## Merge method
- **Squash merge** is the default (clean, one commit per task on `master`).
- Use a **merge commit** only when preserving a branch's full history matters.
- Rebase-merge is disabled to avoid confusing/rewritten history.

## Reviews
The repo currently has **one maintainer**, so required human approvals are set to **0**
(GitHub blocks self-approval), but **all required CI checks must pass** and the founder
must do acceptance testing before completing the merge. When a trusted engineer joins,
raise required approvals to **1** (Branch protection → Require a pull request → Require
approvals = 1).

## Legacy `scripts/push-*.sh`
The ~50 `scripts/push-*.sh` files are the **old** direct-to-`master` workflow and should
be retired. Do not use them. Use `start-task.sh` / `check-task.sh` / `publish-task.sh`.

See also: `docs/DEPLOYMENT_WORKFLOW.md`, `AI_AGENT_RULES.md`,
`docs/ENVIRONMENT_STRATEGY.md`, `docs/DATABASE_MIGRATIONS.md`,
`docs/RELEASE_CHECKLIST.md`, `docs/ROLLBACK.md`.
