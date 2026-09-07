# Release findings log — New-Term Readiness Release

Things noticed while executing the release gates that were **not** fixed (out of scope).
Append-only. Format: date · gate · finding · suggested owner.

| # | Date | Gate | Finding | Suggested action |
|---|---|---|---|---|
| 1 | 2026-09-07 | 1B | The execution brief `docs/audits/NEW_TERM_RELEASE_EXECUTION_BRIEF.md` referenced by the task does not exist in any checkout on this machine (searched `/`). Gate 1B was executed from the task instructions alone; §0 standing rules could not be read. | Founder: commit the brief to `docs/audits/` so later gates can cite it. |
| 2 | 2026-09-07 | 1B | `CLAUDE.md`, `CONTRIBUTING.md` and `.github/workflows/ci.yml` all said "lint is red on master (9 pre-existing errors)". Lint is actually 0 errors / 162 warnings on cca72f5. Docs fixed in this branch; ci.yml comment fixed in WP1B.2. | None further. |
| 3 | 2026-09-07 | 1B | `.github/workflows/typecheck.yml` triggers only on `main` (push + PR), so it never runs — `main` is not the production branch. It duplicates ci.yml's typecheck+lint. | Removed in WP1B.2 (redundant); noted here for the record. |
| 4 | 2026-09-07 | 1B | `docs/ROLLBACK.md` instructs "Promote" a previous Vercel deployment as the app-rollback path, which contradicts the deploy contract (no manual promotes). Also cites `d355bbf` as the known-good baseline — stale; live is cca72f5. | Rewrite rollback as "revert PR on master → CI → auto-deploy"; reserve Vercel promote for founder-only emergencies with a written incident note. |
| 5 | 2026-09-07 | 1B | `docs/PUBLISH_INSTRUCTIONS.md` line 29 still says Vercel's Production Branch "is one branch (likely `main`)". Stale. | Update to `master` / project `drawintheair`. |
| 6 | 2026-09-07 | 1B | `origin/fix/commercial-day1-leaks` carries 28 pre-squash commits beyond #11/#12/#13 that were not reviewed here; the `bundle/*` remote branches (analytics-classroom-wiring, feat/meta-pixel-capi, feat/persistent-class-learner, feat/ssg-prerender, …) are also unreconciled against master. | Founder to triage; do not merge any of them directly. |
| 7 | 2026-09-07 | 1B | `check:secrets` prints ".env.example: leaked-literal → your-strong-pin-here" (informational, exit 0). Placeholder text trips the literal scanner. | Change the placeholder to a form the scanner ignores, or allow-list `.env.example`. |
| 8 | 2026-09-07 | 1B | 162 ESLint warnings, mostly `react-hooks` compiler rules (`set-state-in-effect`, `purity`, `immutability`) plus unused catch vars and unused `eslint-disable` directives (12 auto-fixable). | Dedicated `chore/lint-warnings` PR; lower the `--max-warnings` ratchet as they go. |
| 9 | 2026-09-07 | 1B | `supabase/repairs/20260716_pilot_class_3760_reconcile.sql` (from PR #11) is a one-off data repair script for a specific pilot class committed to the repo. | Confirm it was run in prod (it is not a migration); consider moving to `docs/` or deleting once confirmed. |
| 10 | 2026-09-07 | 1B | Repo root still carries ~40 historical .md/.docx/.pdf/.jsx clutter files and a `ruvector.db` binary. | Separate cleanup PR; out of release scope. |
| 11 | 2026-09-07 | 2B (WP2B.9) | robots.txt disallows `/parent/*` and `/admin` but not `/teacher/*` (teacher signup, login and dashboard are client-gated SPA routes with the same posture as `/parent/*`). Not changed in WP2B.9 to keep the fix to the audited lines. | Product decision: add `Disallow: /teacher$` and `/teacher/` in a follow-up; `/teachers` marketing page must stay allowed. |
