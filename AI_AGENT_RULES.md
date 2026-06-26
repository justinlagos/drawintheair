# AI Agent Rules — Draw in the Air

These rules apply to **every** coding agent (Claude, Codex, IDE assistants, CLI agents)
working in this repository. They exist to protect a live product used by young children
in schools. Production deploys from **`master`** only.

## The 17 rules
1. **Read the current branch before editing** (`git rev-parse --abbrev-ref HEAD`).
2. **Never work directly on `master`.** If on `master`, stop and create a task branch
   (`./scripts/start-task.sh <prefix> <name>`).
3. **Start every task from the latest `origin/master`.**
4. **Inspect the affected flow before editing** (UI → state → hooks/services → API →
   auth → database → realtime → receiving client → rendered result).
5. **Keep the task focused** — one body of work per branch. No unrelated changes.
6. **Preserve existing working behaviour.** Do not rewrite working systems for style.
7. **Add or update tests** for the change.
8. **Run the relevant checks** (`./scripts/check-task.sh`).
9. **Report changed files.**
10. **Report tests run** and their real results. Never claim a test passed unless it ran.
11. **Report unresolved risks.**
12. **Never expose secrets** in code, logs, or PRs. Use variable names, not values.
13. **Never run production migrations without explicit founder approval.**
14. **Never merge your own Pull Request.** A human completes the merge.
15. **Never claim a GitHub or Vercel setting changed without verifying it.**
16. **Never force-push.**
17. **Never rewrite production history.**

## Parallel agents — use git worktrees
Two agents must **not** edit unrelated tasks in the same folder at once.
Create an isolated worktree per agent:

```
./scripts/new-worktree.sh feat teacher-assignment
# -> ../DrawInTheAir-feat-teacher-assignment on branch feat/teacher-assignment
```

Each agent gets: a separate folder, a separate branch, one defined scope, its own
test results, and its own Pull Request.

## Hard prohibitions (never, without explicit founder instruction)
Push to `master` · force-push `master` · rename `master` to `main` · change the Vercel
Production Branch · delete `main` or any unexplained branch · rewrite git history ·
commit `.env` files · put a Supabase **service-role** key in client (`VITE_`) code ·
use production data in automated tests · run destructive production migrations ·
deploy an unreviewed branch to production.
