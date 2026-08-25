# Deployment Workflow (Founder Guide)

This guide is written in plain language. You do **not** need advanced Git knowledge.
Production deploys from **`master`**. Your live site is **drawintheair.com**.

---

## The big picture

```
You make a change on a task branch
        ↓
You push it and open a Pull Request (PR) into master
        ↓
Automated checks run (lint, types, security)
        ↓
Vercel builds a Preview link (a private copy of the site for that change)
        ↓
You test the Preview yourself (founder acceptance)
        ↓
You merge the PR into master
        ↓
Vercel deploys master to drawintheair.com (production)
        ↓
You verify the live site
```

Nothing reaches the live site until **you** merge. Until then, the worst case is a
broken Preview link that no child ever sees.

---

## Key words (plain English)

- **`master`** — the one branch that is the live website. Treat it as sacred.
- **Task branch** — a temporary copy where you make one change safely. Names start with
  `feat/`, `fix/`, `hotfix/`, `chore/`, `docs/`, `test/`, or `refactor/`.
- **Pull Request (PR)** — a request to copy your task branch into `master`. It shows the
  changes, runs the checks, and gives you the Preview link.
- **Preview** — a temporary Vercel website for your change only. Safe to break.
- **Production** — the real site at drawintheair.com, served from `master`.
- **`main`** — an old branch. **It is NOT the live site.** Ignore it; production is `master`.

---

## Step by step

### 1. Start a task
In Terminal, in your project folder:
```
./scripts/start-task.sh fix student-join-flow
```
This updates `master`, then creates a clean branch `fix/student-join-flow` for you.
It refuses to run if you have unsaved changes (so nothing is ever lost).

### 2. Check which branch you are on (anytime)
```
git branch --show-current
```
If it says `master`, stop — start a task branch first.

### 3. Make your change, then save (commit) it
```
git add -A
git commit -m "Fix: students can rejoin after refresh"
```

### 4. Test locally
```
./scripts/check-task.sh
```
This runs lint, type checks, tests, the security guards, and a production build.
It stops at the first problem and tells you what failed.

### 5. Push safely and open the PR
```
./scripts/publish-task.sh
```
This re-runs the checks, pushes your branch, and prints a link to open the PR.
It **refuses** to run on `master`, `main`, or `staging`.

### 6. Find the Vercel Preview
On the PR page (GitHub), Vercel posts a comment/check with a **Preview** link.
Open it and test as if you were a teacher and a child.

### 7. What to test before merging
Use `docs/RELEASE_CHECKLIST.md`. At minimum: teacher sign-in, create class, assign an
activity, a student joins with the code, start/pause/end the session, refresh both
screens, camera turns on, and gestures work.

### 8. Merge
When checks are green and your Preview testing passed, click **Merge** (squash) on the PR.

### 9. Verify production
After merge, Vercel deploys `master` to drawintheair.com. Open the live site and repeat
the most important checks (homepage, /join, teacher dashboard, camera, a realtime start).

### 10. Roll back if needed
See `docs/ROLLBACK.md`. In short: in Vercel, promote the previous good deployment, then
revert the PR on GitHub. (Rolling back the site does **not** roll back the database.)

---

## Urgent hotfix

```
./scripts/start-task.sh hotfix classroom-realtime-sync
# smallest possible fix + a test that proves the bug is gone
./scripts/check-task.sh
./scripts/publish-task.sh
# open PR, check the Preview, merge after approval, verify production
```
Do **not** skip the checks just because it is urgent.

---

## Working with Claude or another coding agent

- Tell the agent the **task branch** to use, or let it run `./scripts/start-task.sh`.
- Agents must follow `AI_AGENT_RULES.md`. They never merge their own PR and never push to
  `master`.
- For two agents at once, give each its own folder with
  `./scripts/new-worktree.sh feat some-feature`.

---

## What must never be done
- Never edit the live site by pushing to `master` directly.
- Never use the old `scripts/push-*.sh` files (they push straight to production).
- Never paste secrets (keys, passwords) into code, chat, or a PR.
- Never run a database change against production without a deliberate, approved plan.
- Never rename `master`, change Vercel's Production Branch, or delete `main` on a whim.

---

## Environment matrix (what is what)

| Environment | Branch | URL | Data |
|---|---|---|---|
| Development | task branch | localhost | safe test config, no child data |
| Preview | task branch | Vercel preview URL | non-production Supabase, synthetic data |
| Staging (if enabled) | one `staging` branch | fixed staging URL | separate Supabase, synthetic school data |
| Production | `master` | drawintheair.com | production Supabase, real data |
