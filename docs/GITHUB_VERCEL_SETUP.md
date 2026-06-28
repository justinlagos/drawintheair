# GitHub & Vercel Setup (exact steps)

These are settings an agent **cannot safely change for you without verified access**.
Apply them in the GitHub/Vercel UI (or hand a scoped token to your engineer/agent to
apply + verify). Production branch is **`master`** — do not change that.

## 1. GitHub — default branch
**Current:** default branch is `main` (this causes the "is it main or master?" confusion).
**Change to:** `master`.
- GitHub → repo **Settings → General → Default branch** → switch to `master` → Update.

## 2. GitHub — branch protection / ruleset for `master`
GitHub → **Settings → Rules → Rulesets → New branch ruleset** (or Branches → Add rule).
Target branch: `master`. Enable:
- ✅ **Require a pull request before merging**
  - Required approvals: **0** for now (one maintainer; GitHub blocks self-approval).
    Raise to **1** when a trusted engineer joins.
  - ✅ Require conversation resolution before merging
- ✅ **Require status checks to pass** → add these (after the first CI run creates them):
  - `typecheck`
  - `unit-tests`
  - `secret-scan`
  - *(add `lint` and `build` later, once they are reliably green — see CONTRIBUTING.md)*
  - ✅ Require branches to be up to date before merging
- ✅ **Block force pushes**
- ✅ **Restrict deletions** (prevents deleting `master`)
- ✅ Prefer **linear history** (compatible with squash merge)
- **Bypass list:** add the repository **owner** for documented emergencies only.

## 3. GitHub — merge methods
GitHub → **Settings → General → Pull Requests**:
- ✅ Allow **squash merging** (default)
- ✅ Allow **merge commits** (for the rare case history matters)
- ⬜ Disable **rebase merging**
- ✅ **Automatically delete head branches** (cleans up merged task branches)

## 4. GitHub — extras
- Add a **CODEOWNERS** file later if you want auto-review requests.
- Consider enabling **Dependabot** (Settings → Code security) for dependency updates.

## 5. Vercel — confirm & scope
Vercel → Project → **Settings → Git**:
- ✅ **Production Branch = `master`** (leave as-is).
- Confirm **Preview Deployments** are enabled for all other branches (already working).

Vercel → **Settings → Environment Variables** — separate the scopes:
- **Production** scope: production Supabase (`fmrsfjxwswzhvicylaph`) values.
- **Preview** scope: a **non-production** Supabase project's values (NOT production).
- **Development** scope: local/safe values.
- Ensure **no service-role key** is set on a `VITE_`-prefixed variable in any scope.
- Add `node scripts/check-env-safety.mjs` to the Preview/Staging build command so a
  misconfigured Preview fails fast.

Vercel → **Settings → Deployment Protection** (Pro): consider protecting Preview URLs.
Rollback: Vercel → **Deployments** → pick the last good one → **Promote to Production**.

## 6. Verify (do not claim done until checked)
- Open a test PR from a `chore/` branch → confirm CI checks appear and a Vercel Preview
  is attached.
- Confirm a direct push to `master` is rejected once the ruleset is active.
- Confirm merged branches auto-delete.
