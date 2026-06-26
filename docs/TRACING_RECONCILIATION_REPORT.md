# Tracing Reconciliation & Classroom Reliability — Pre-Deploy Engineering Report

**Date:** 2026-06-25
**Branch:** `master` @ `d355bbf` (local == `origin/master`)
**Status:** Implementation complete. Verified in-session (typecheck, unit/integration tests, lint). **Not committed, not pushed, not deployed** — awaiting approval.
**Backup of pre-existing working tree:** `outputs/dia-backup-20260625/` (taken before any edit).

---

## 1. Root cause

The same canonical activity id (`pre-writing`) resolved to **two different tracing implementations** depending on entry point — this was a code-path divergence, **not** a GitHub/production source divergence (both build from `d355bbf`).

- **Solo `/play`** (`src/App.tsx`) chose the render shell and per-frame engine via the `tracingPlayfulUiV1` flag (default **true** → new playful V2).
- **Classroom `/join`** (`src/pages/classmode/StudentClassClient.tsx`, line 736) **hard-coded** the legacy `PreWritingMode` + `preWritingLogic` with **no flag check** and never imported the playful shell.

Result: classroom always showed the old pastel tracing; solo showed the new dark-purple tracing.

Two secondary defects:
- **Dual interaction scope.** The playful shell has a `'sections' | 'draw'` phase machine, but `App.tsx` selected the per-frame engine on `gameMode` alone — never on phase. So `playfulTracingFrame` kept rendering the trace and consuming pinches *behind* the category picker. Two interaction layers active at once.
- **Orphaned third implementation.** `src/features/modes/tracing/TracingMode.tsx` is imported nowhere (dead code).

`StudentGameScreen.tsx` had the identical hard-coded seam but is **legacy and unrouted** (`main.tsx` mounts `StudentClassClient` for `/join`).

---

## 2. Repository / deployment reconciliation

| Identity | Value | Verified |
|---|---|---|
| Local HEAD | `d355bbf596e9b66d7f61b4b87cfaefc8cacb539a` | `git rev-parse HEAD` |
| origin/master | `d355bbf…` (identical) | `git rev-parse origin/master` |
| Deployed app | **root Vite SPA** → `dist`, `framework: null` | `vercel.json` |
| Supabase project | `fmrsfjxwswzhvicylaph` | `vercel.json` CSP + live query |
| Live DB migration state | `get_student_class_state`, `get_student_assignments`, `sessions.activity_version`, `sessions.status` **all present in production** | read-only `execute_sql` |

**Key reconciliation finding:** the local migration files `0026_activity_realtime_fix.sql` / `0027_join_pilot_hardening.sql` are *untracked locally* but their objects **already exist in the live database**. The classroom realtime WIP is therefore DB-compatible right now — **no migration needs applying** for it to function. (Confirms the known-unreliable local migration ledger.)

**Not verifiable in this session (no Vercel access):** the exact commit SHA currently serving `drawintheair.com`. Local and origin match at `d355bbf`; confirm the deployed SHA in the Vercel dashboard or via the new build-identity surface (below) after the next deploy.

No production bundle/minified files were copied into source. No build folders are imported by source.

---

## 3. Architecture changes (this sprint)

- **New canonical resolver.** `tracingResolver.ts` (pure: `TRACING_ACTIVITY_ID`, `isPlayfulTracingActive`, `getTracingFrameLogic`, props type) + `canonicalTracing.tsx` (the `CanonicalTracingMode` shell). Single source of truth for *which tracing shell* and *which per-frame engine* run, gated on `tracingPlayfulUiV1`. The pure/JSX split keeps the resolver unit-testable in node and importable by the frame loop.
- **Solo + classroom both resolve through it.** `App.tsx`, `StudentClassClient.tsx`, and legacy `StudentGameScreen.tsx` now call `getTracingFrameLogic()` for `onFrame` and mount `<CanonicalTracingMode/>`. The classroom hard-coded `PreWritingMode` is gone.
- **Interaction-scope gate.** `tracingPlayfulFrame.ts` gains `setPlayfulActive(boolean)` / `isPlayfulActive()`. While disarmed (category picker up) the frame clears the canvas and returns *before* engine update/render — it still publishes the gesture pointer so the picker cards stay selectable, but the trace neither renders nor consumes pinch. `TracingModePlayful` arms on entering `draw`, disarms on returning to `sections` and on unmount.
- **Explicit assignment intent.** `CanonicalTracingMode` / `TracingModePlayful` take `allowCategorySelection` (and `initialSection`) — stated explicitly by the caller, never inferred. Solo and general-Tracing classroom pass `true` (picker shown). A future per-category teacher assignment passes `false` + `initialSection` to drop the child straight into content; the in-game "Sections" escape is hidden in that case.
- **Build identity.** `vite.config.ts` `define` bakes `__BUILD_SHA__/__BUILD_ENV__/__BUILD_TIME__` (from `VERCEL_GIT_COMMIT_SHA`/`VERCEL_ENV`); `src/lib/buildInfo.ts` exposes them on `window.__DRAW_IN_AIR_BUILD__` for admin/debug only — never in the child UI.

The classroom wrapper still supplies classroom context/session authority/identity; it no longer owns a separate tracing game.

---

## 4. UX changes

- A dedicated category-selection screen (Warm-up Lines / Shapes / Letters / Numbers) renders with the tracing engine **disarmed** — no trace behind the cards, one interaction scope (the cards).
- Selecting a category arms the engine, then transitions to gameplay; the picker unmounts.
- During gameplay the engine is the only interaction scope; returning to "Sections" disarms it again.
- When a specific category is assigned (`allowCategorySelection={false}`), the child enters that content directly and cannot wander back to the picker.

---

## 5. Files changed

**New (this sprint):**

| File | Why |
|---|---|
| `src/features/modes/tracing/tracingResolver.ts` | Pure canonical resolution (activity id, frame-logic selector, props). |
| `src/features/modes/tracing/canonicalTracing.tsx` | `CanonicalTracingMode` render shell mounted by solo + classroom. |
| `src/lib/buildInfo.ts` | Admin/debug build-identity surface. |
| `tests/canonicalTracing.test.ts` | Solo/classroom resolve same engine; legacy only when flag off. |
| `tests/tracing-interaction-scope.test.ts` | Engine inert while picker up; armed in draw phase. |
| `docs/TRACING_RECONCILIATION_DIAGNOSIS.md` | Phase-1 forensic diagnosis. |
| `docs/TRACING_RECONCILIATION_REPORT.md` | This report. |

**Modified (this sprint):**

| File | Why |
|---|---|
| `src/features/modes/tracing/tracingPlayfulFrame.ts` | `setPlayfulActive`/`isPlayfulActive` gate; clear-and-return when disarmed. |
| `src/features/modes/tracing/TracingModePlayful.tsx` | `allowCategorySelection`/`initialSection` props; arm/disarm on phase changes; hide "Sections" escape when a category is assigned. |
| `src/App.tsx` | Solo tracing resolves via canonical module (render + frame logic). |
| `src/pages/classmode/StudentClassClient.tsx` | Classroom tracing resolves via canonical module (~5 lines: import split, `activeLogic` memo, render). **The bulk of this file's diff is pre-existing realtime WIP, not this sprint.** |
| `src/pages/classmode/StudentGameScreen.tsx` | Legacy/unrouted screen also resolves canonically (defensive). |
| `src/main.tsx` | `registerBuildInfo()` at startup. |
| `vite.config.ts` | `define` for build SHA/env/time. |
| `package.json` | Removed spurious `esbuild` direct dep that broke the production build (see §7). |
| `package-lock.json` | Restored to HEAD to match (esbuild was the only WIP change to it). |

**Pre-existing uncommitted WIP (preserved, not authored here):** realtime authority rewrite in `StudentClassClient`/`TeacherClassConsole`, `conductor/join*`, `ActivePlayerLock*`, survey suppression in `App.tsx`, migrations `0025–0027`, `tests/*`. Classified in chat; left intact.

---

## 6. Data & environment changes

- **Dependencies:** removed the spurious `esbuild@^0.28.1` direct dep (build-breaker, §7); `package-lock.json` restored to HEAD. Developers must `npm ci` locally to pick this up.
- **Migrations:** none required by this sprint. Realtime-WIP RPCs already live in production (verified). **No migration applied.**
- **Environment variables:** optional — set Vercel `VERCEL_GIT_COMMIT_SHA` (auto on Vercel) so the build-identity surface shows the real SHA. No new required vars.
- **Vercel settings:** unchanged.
- **Supabase config / RLS:** unchanged (read-only verification only).

---

## 7. Test evidence (commands run in this session)

- `npx tsc -b --noEmit` → **0 errors.**
- `npx vitest run` → **24 files, 254 tests passed** (includes new `canonicalTracing` (4) + `tracing-interaction-scope` (4), and the WIP realtime suites `e2e-classroom-flow`, `join-validation`, `network-fingerprint`, `activePlayerLock`).
- `npx eslint` (changed files) → **0 errors**, 13 warnings (all pre-existing patterns: hook-deps, one `any`, fast-refresh).
- `npm run build` (full: prebuild CSP + typecheck → `tsc -b` → `vite build` → `prerender-seo`) → **PASSES, exit 0**, 26 prerendered route HTML files, SHA baked into the bundle. Run in an isolated Linux-arm64 copy with a clean native `npm install` (so the Mac `node_modules` was never touched).
  - **Build-breaker found and fixed:** the build first failed — *not from any tracing change* — in `PressPage` (`function ArrowIcon({ size = 16 })`): esbuild **0.27.7** could not lower default-destructured params for the configured browser targets. Cause: the WIP had added `"esbuild": "^0.28.1"` as a **direct dependency** (HEAD had none), which hoisted 0.28.1 to top-level and forced Vite 7.3.1 to resolve a **nested esbuild 0.27.7**. HEAD uses a single esbuild **0.27.3** and builds clean. Nothing imports `esbuild` directly, so the dep is spurious. **Fix applied:** removed the line from `package.json` and restored `package-lock.json` to HEAD (the only WIP change to these two files was the esbuild addition). Build then green.

**Not run in-session (require a real browser + camera, listed as manual acceptance):** Playwright E2E (`tests/e2e-playwright/classroom-flow.spec.ts`), visual regression, and the camera smoke test.

---

## 8. Remaining risks (concrete)

1. **Local `node_modules` must be reinstalled.** `package.json`/`package-lock.json` now exclude the broken `esbuild` dep, but the developer's existing `node_modules` still holds the broken tree. Run `npm ci` (clean install from the corrected lock) on the Mac before building locally — otherwise the local build will still fail with the 0.27.7 error. CI/Vercel installs fresh, so it is unaffected.
2. **No E2E / camera run (cannot be done from here).** The Playwright spec targets `localhost:5175` and requires a **non-production** Supabase + a seeded teacher test account; the only backend this app is wired to is **live production**, so running it here would write test rows into the real schools' database (forbidden). There is also no `playwright.config` and the auth step needs Google sign-in. It must be run against a local/staging Supabase. The camera smoke test needs a physical webcam and a child — inherently manual. Both remain manual acceptance gates.
3. **Flag-off path.** With `tracingPlayfulUiV1` off, classroom now renders legacy `PreWritingMode` (previously its only behaviour) — unchanged risk, but it's now reachable in solo *and* classroom via the same switch.
4. **StrictMode double-invoke.** `StudentClassClient`'s session-update setter calls `syncFromServer` inside the updater; React 19 StrictMode may double-invoke in dev. The fetch is idempotent, so prod is unaffected — worth a follow-up to move the side effect out of the setter.
5. **Deployed-SHA unverified.** The live `drawintheair.com` commit was not confirmed (no Vercel access). Verify post-deploy via `window.__DRAW_IN_AIR_BUILD__`.
6. **Orphan not deleted.** `TracingMode.tsx` (dead) was left in place to avoid any surprise removal; recommend deleting in a follow-up after a final import sweep.

---

## 9. Deployment plan (do NOT execute without approval)

1. On the Mac/CI, from `master` @ the reviewed tree: `npm ci` → `npm run build` (must be clean) → `npm run lint` → `npm test`.
2. Run Playwright E2E (teacher + student contexts) and a manual camera smoke test (one child, background people, both hands, low light, edge-of-screen).
3. Commit the focused diff (message below) to a fix branch; open a PR. **Rollback point = `d355bbf` (current production tree).**
4. Deploy a **Vercel preview** first; verify `window.__DRAW_IN_AIR_BUILD__.sha` matches the commit; run the manual classroom acceptance below on the preview URL.
5. Only after sign-off, promote to production. Rollback = redeploy `d355bbf` (instant in Vercel).

**Manual acceptance:** teacher creates class → student joins (valid/invalid/expired code) → teacher assigns Tracing to selected student → student gets the **new** tracing → category picker shows with **no trace behind it** → pick a category → gameplay interactive, picker gone → teacher switches activity → replaces cleanly → teacher ends class → student stops. Confirm the old pastel tracing appears on **no** route/refresh/reconnect.

---

## 10. Recommended commit message

```
fix(tracing): one canonical Tracing for solo + classroom; isolate category selection

Classroom (/join) hard-coded the legacy PreWritingMode while solo (/play) gated
the playful V2 tracing on tracingPlayfulUiV1, so the same activity produced two
experiences. Add a canonical resolver (tracingResolver.ts + CanonicalTracingMode)
that solo and classroom both use, so render shell and per-frame engine always
agree. Gate the playful engine on the draw phase (setPlayfulActive) so it no
longer renders or consumes pinch behind the category picker — one interaction
scope at a time. Category-selection allowance is now an explicit prop, not
inferred. Add admin-only build identity (window.__DRAW_IN_AIR_BUILD__).

No DB migration (realtime RPCs already live). No production bundle copied to
source. Unrelated game modes untouched.

Tests: tsc 0 errors; vitest 254 passing (+8 new); eslint 0 errors.
```
