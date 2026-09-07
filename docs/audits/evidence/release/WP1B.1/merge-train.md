# WP1B.1 — Merge train evidence (release/new-term)

Date: 2026-09-07 · Worktree: `/home/claude/dia-release` · Branch: `release/new-term`
Base: `origin/master` = `cca72f5` (live production squash of PR #14, 25 Aug 2026)
Executor: Claude (Fable 5.1), offline — no pushes, no Supabase, no Vercel.

## 1. What was restored

`origin/master` (cca72f5) is a squash of PR #14 and omits PRs #11, #12, #13, whose
migrations are already applied in production. The three commits were cherry-picked
from `origin/fix/commercial-day1-leaks` (NOT merged — the merge-base is d355bbf and a
merge would replay 28 already-squashed commits), then squashed into one release commit:

| Origin SHA | PR | Subject |
|---|---|---|
| `8a5d80c` | #11 | fix(classroom): rejoin-reclaim + roster-aware join, broken heartbeat, console<->dashboard nav |
| `6024995` | #12 | feat(insights): Calm 2.0 restructure + Growth landing tab |
| `c2219d8` | #13 | polish(insights): flatten menu chrome |

Release commit: `5d13416` ("release: restore PR #11/#12/#13 onto master baseline").
Net delta vs cca72f5: **26 files, +1324 / −317** (see `git diff --stat cca72f5 5d13416`).

## 2. File-level verification

Command, for each origin commit `C`:
`git diff --stat C HEAD -- $(git show --name-only --format= C)`
(diffs only the files that `C` touched; an empty result means byte-identical content.)

| Origin | Result | Explanation |
|---|---|---|
| `8a5d80c` (7 files) | **empty** | All 7 files identical to PR #11 (incl. both SQL files). |
| `6024995` (19 files) | 1 file differs: `insights.css` (+3/−8) | That delta is exactly the `c2219d8` patch (verified: `diff` of the two hunk sets → IDENTICAL). All 18 other files, including `InsightsDashboard.tsx`, are identical to PR #12. |
| `c2219d8` (1 file) | **empty** | `insights.css` identical to PR #13. |

Conflicts actually encountered: **one file**, `src/pages/admin/InsightsDashboard.tsx`
(during `6024995`), two hunks:
1. Comment text above the keyboard-shortcut `useEffect` — took the PR wording.
2. The `selectTab` helper (`const selectTab = (tab) => { setFilter({tab}); setNavOpen(false); }`)
   — took the PR content; placed after the `if (reportMode) return …` early return (it is a
   plain closure, not a hook).

Hook-order fix from cca72f5 preserved: all hooks (`useFilter`, `useRpc`, 5× `useState`,
`useEffect`) run before the `reportMode` early return (HEAD lines 128–216 vs return at 227).
Resolved file is byte-identical to `6024995`'s version, which already carried the same
ordering.

The conflicts pre-announced in the brief (insights.css re-tokening, app-wide box-sizing
scoping, tracing engine selection, SSG prerender entry point) **did not occur** — none of
the three commits touch tracing, box-sizing or the SSG entry point; `insights.css` merged
cleanly. Production (master) behaviour for tracing/SSG is therefore untouched by construction.

Nothing else from `fix/commercial-day1-leaks` was taken.

## 3. Toolchain verification (all on release/new-term, Node v22.22.2 / npm 10.9.7)

| Step | Command | Result |
|---|---|---|
| Install | `npm ci` | exit 0 — "added 369 packages, and audited 370 packages in 13s" |
| Typecheck | `npm run type-check` (= `tsc -b --noEmit`) | exit 0, no diagnostics |
| Lint | `npm run lint` (= `eslint .`) | exit 0 — **0 errors, 162 warnings** |
| Unit tests | `npm test` (= `vitest run`) | exit 0 — **26 files, 256 tests passed**, 7.9 s |
| Build | `npm run build` | exit 0 — client build 8.8 s; SSR bundle 1.5 s; prerender pass 1: 26 head-only, **pass 2: 93 full-body route files** |
| Full gate | `./scripts/check-task.sh` | **exit 0** (Lint ✔, Type check ✔, Unit tests ✔, Env-safety ✔ [2 WARNs: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY unset locally — expected], CSP ✔, Secret scan ✔, Production build ✔) |

Lint baseline note: CLAUDE.md / CONTRIBUTING.md / ci.yml claimed "lint is red on master
(9 pre-existing errors)". That is stale — lint has 0 errors on cca72f5+picks. A ratchet was
set instead: `"lint": "eslint . --max-warnings 162"` (verified: still exit 0 at exactly 162).
Warnings in the cherry-picked files (ProgressionTab ×1, TeacherClassConsole ×2,
TeacherDashboard ×1) are the same pre-existing `react-hooks` compiler-rule patterns found
across the codebase, not introduced by the picks.

## 4. SSG prerender output

`dist/` contains 100 `index.html` files (root + 99 routes). The prerender script reports
**93 full-body** route files (pass 2), matching production's 93; pass 1 wrote 26 head-only
files, 20 of which are subsequently upgraded to full-body and 6 remain head-only SPA
fallbacks (`/play`, `/class`, `/join`, `/parent/*` …) by design.

## 5. Stale-PR close list (founder action)

Open on 15 Aug: #2, #3, #5, #6, #7, #8, #9, #10, #14. **#14 is merged** (= cca72f5).
Recommendation — close **#2, #3, #5, #6, #7, #8, #9, #10** with this comment:

> Closing: master (cca72f5, PR #14) is now the squash of live production, and
> release/new-term restores #11/#12/#13 on top. This PR's base is pre-squash history and
> cannot be merged as-is. If any change here is still wanted, re-cut a fresh branch from
> master with only that change.

Also close/mark-merged #11, #12, #13 once release/new-term lands (their content is in it).
Rationale: every pre-#14 PR shares the d355bbf ancestry that #14 squashed; merging any of
them would replay squashed commits and conflict with production. (PR→branch mapping could
not be verified offline; the founder should eyeball each PR's diff against
release/new-term before closing — anything not already present should be logged in
`docs/audits/RELEASE_FINDINGS_LOG.md`, not merged.)

## 6. CLAUDE.md deploy-contract corrections (done in this branch)

- `CLAUDE.md` Non-negotiables: production = `master` on Vercel project `drawintheair`;
  deploy only by PR merged to master with CI green; no manual promotes / CLI `--prod`.
- `CLAUDE.md` Gotchas: stale "lint red, 9 errors" replaced with the warning ratchet rule.
- `CONTRIBUTING.md`: CI section updated — all five checks green; all five to be required.
