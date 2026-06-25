# Rollback Process

Two independent layers. **Rolling back the app does NOT roll back the database.**

## A. Application rollback (fast, safe)
1. Identify the previous known-good **Vercel production deployment** (Vercel → Project →
   Deployments → the last one that was healthy). The current known-good baseline at the
   time of writing is commit **`d355bbf`** (also tagged
   `production-before-release-workflow-20260625`).
2. In Vercel, **Promote** (or "Rollback to") that deployment so it serves production.
3. Confirm **drawintheair.com** points at the known-good deployment.
4. Verify core routes: homepage, `/join`, teacher dashboard, camera init, a realtime start.
5. On GitHub, **revert the faulty PR** (Revert button) so `master` no longer contains the
   bad change.
6. Open a corrective PR with the proper fix + a regression test.

Reproduce the baseline locally if needed:
```
git fetch origin --tags
git checkout production-before-release-workflow-20260625   # = d355bbf
```

## B. Database incident
1. **Stop** further migrations immediately.
2. Assess whether the deployed app is still **backward-compatible** with the current schema.
3. Prefer a **safe forward fix**. Only **restore from a verified backup** when a rollback
   would otherwise lose or corrupt data — and only with founder approval.
4. Record the incident, the cause, and the corrective actions.

> Never claim that a Vercel rollback also reverts Supabase. They are separate systems.

## Roles
- A coding agent may **prepare** a revert PR but must **not** merge it or change Vercel
  settings without founder action.
- The founder performs the Vercel promotion and completes the revert merge.
