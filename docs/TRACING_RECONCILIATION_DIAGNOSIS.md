# Tracing Reconciliation — Phase 1 Forensic Diagnosis

**Date:** 2026-06-25
**Branch:** `master` @ `d355bbf` (= `origin/master`)
**Scope:** Why classroom Tracing shows the old pastel UI while solo/production Tracing shows the new dark-purple UI; plus the category-overlay interaction bug.
**Status of this document:** Audit complete. **No source files edited yet.** Working tree backed up to `outputs/dia-backup-20260625/` before any work.

---

## 1. Root cause (verified)

There is **one canonical activity ID** (`'pre-writing'`) but **two different render+logic pairs** are wired to it, and the two entry points choose differently:

| Entry point | Render shell | Per-frame logic | Selector |
|---|---|---|---|
| **Solo `/play`** (`src/App.tsx`) | `TracingModePlayful` (new) **or** `PreWritingMode` (legacy) | `playfulTracingFrame` **or** `preWritingLogic` | **`featureFlags.getFlag('tracingPlayfulUiV1')`** — default `true` |
| **Classroom student** (`src/pages/classmode/StudentGameScreen.tsx`) | **`PreWritingMode` only** (legacy, hardcoded) | **`preWritingLogic` only** (hardcoded `LOGIC_MAP`) | **none — flag never consulted** |

**Evidence:**

- Solo render — `src/App.tsx:537‑539`:
  ```tsx
  flags.tracingPlayfulUiV1
    ? <TracingModePlayful onExit={handleExitToMenu} />
    : <PreWritingMode onExit={handleExitToMenu} />
  ```
- Solo frame logic — `src/App.tsx:351‑352`:
  ```ts
  logic = featureFlags.getFlag('tracingPlayfulUiV1') ? playfulTracingFrame : preWritingLogic;
  ```
- Flag default ON — `src/core/featureFlags.ts:76` → `tracingPlayfulUiV1: true`.
- Classroom render — `src/pages/classmode/StudentGameScreen.tsx:120‑121`:
  ```tsx
  {activity === 'pre-writing' && ( <PreWritingMode onExit={handleExit} /> )}
  ```
  `StudentGameScreen.tsx` **does not import** `TracingModePlayful` at all (imports at lines 7‑35). Its `LOGIC_MAP` uses `preWritingLogic` (import line 28).

**Therefore:** with the flag at its default (`true`), solo renders the new playful tracing while the classroom *always* renders the legacy pastel `PreWritingMode`. This exactly reproduces the reported symptom. It is **not** a GitHub/production divergence and **not** a stale-build/service-worker issue — both experiences are built from the same `d355bbf` source; they are two live code paths.

### A third, orphaned implementation
`src/features/modes/tracing/TracingMode.tsx` (exported `TracingMode`) is **imported nowhere** (only self/comment references). It is dead code — a separate older shell that should be retired during cleanup, but it is not the one the classroom mounts.

So three tracing shells exist today:
1. `PreWritingMode` + `preWritingLogic` — **legacy pastel** (classroom always; solo when flag off)
2. `TracingModePlayful` + `playfulTracingFrame` / `tracingLogicV2` — **new dark-purple** (solo when flag on) ← baseline to keep
3. `TracingMode.tsx` — **orphaned dead code**

---

## 2. Category-overlay UX bug (inferred from code — confirm during fix)

The new `TracingModePlayful` already has an explicit phase machine — `src/features/modes/tracing/TracingModePlayful.tsx:58`:
```ts
const [phase, setPhase] = useState<'sections' | 'draw'>('sections');
```
During `phase === 'sections'` it renders `<SectionPicker>` (line 188) showing Warm-up Lines / Shapes / Letters / Numbers (`tracingActivities.ts` `PACK_INFO`, lines 374‑378).

**The problem:** the per-frame engine selection in `App.tsx:333‑352` keys off **`gameMode` only**, never off the tracing `phase`. So while the `SectionPicker` is on screen, `TrackingLayer` is still running `playfulTracingFrame`, which draws the trace and processes pinches behind the cards. That is the "two interaction layers active at once" report: the same hand cursor can hit a category card *and* the trace path behind it. The render shell already separates the phases; the **gesture/engine scope does not**. This is the precise thing Phase Three must fix — gate engine activation on `phase === 'draw'`, not just on mode.

---

## 3. Repository / deployment identity (verified)

- **Local = remote:** `master` @ `d355bbf596e9b66d7f61b4b87cfaefc8cacb539a`, up to date with `origin/master`. Remote: `github.com/justinlagos/drawintheair.git`.
- **Deployed app = root Vite SPA**, not `platform/`. `vercel.json`: `buildCommand: npm run build`, `outputDirectory: dist`, `framework: null`. (`platform/` is a separate Next.js tree, not the production build.)
- **Supabase:** `fmrsfjxwswzhvicylaph` (CSP `connect-src` in `vercel.json`).
- **Node:** local v22 present; `package.json` engines `>=20`. Build = `tsc -b && vite build && prerender-seo`.
- **Uncommitted WIP exists and overlaps this sprint.** The working tree has un-committed changes and many untracked files touching tracing, classmode, ActivePlayerLock, feature flags, migrations, and a `tests/` suite (incl. `tests/e2e-playwright/`). This is in-flight work from a prior session — preserved in the backup. **It must be reconciled, not overwritten.**

> I have not resolved the *exact deployed Vercel production commit* from Vercel itself (no Vercel access in this session). Local and `origin/master` match at `d355bbf`; confirming the live deployment SHA needs Vercel dashboard or `VERCEL_GIT_COMMIT_SHA`. Flagged for Phase Five.

---

## 4. Proposed minimal repair (no edits made yet)

**Goal:** one canonical Tracing path resolved identically by solo and classroom; an isolated selection stage; a single active interaction scope.

1. **Canonical resolution for classroom.** In `StudentGameScreen.tsx`, render Tracing through the *same* flag-gated choice solo uses (`tracingPlayfulUiV1 ? TracingModePlayful : PreWritingMode`) and map `LOGIC_MAP['pre-writing']` the same way (`playfulTracingFrame` when flag on). Smallest change that removes the divergence; reuses the existing canonical component rather than duplicating it into the classmode folder.
2. **Single interaction scope.** Gate the playful engine so it only runs during `phase === 'draw'` (shared via the engine's state, not a second copy), and ensure `SectionPicker` cards are the only gesture targets during `phase === 'sections'`. Add an activation cooldown / idempotent select guard against gesture jitter.
3. **Teacher assignment intent.** Make the assignment payload state explicitly whether category selection is allowed (assign-specific-category vs assign-general-Tracing) rather than inferring from route/UI.
4. **Retire legacy only after** repo-wide search confirms no reachable imports: delete orphaned `TracingMode.tsx`; once flag is permanently on and classroom uses it, plan removal of `PreWritingMode`/`preWritingLogic` (separate, dependency-checked step — `PreWritingMode` is still imported by `App.tsx`, `StudentGameScreen.tsx`, `StudentClassClient.tsx`, `featureFlags.ts`).

**Files expected to change (core fix):** `src/pages/classmode/StudentGameScreen.tsx` (primary), `src/App.tsx` (phase-gated engine), `src/features/modes/tracing/TracingModePlayful.tsx` + `tracingPlayfulFrame.ts` (phase/scope gating), classroom assignment types for category intent. Plus targeted tests.

**Explicitly NOT in this fix:** repo restructuring, branching-strategy work, copying any built/minified bundle into source, unrelated game modes, production deployment.

---

## 5. Still to do (Phases 3–5, not yet done)

- Full Realtime classroom audit (teacher→DB/broadcast→student→resolver→mount→progress→dashboard): event names, idempotency, reconnect, duplicate subscriptions, cleanup. **Not yet traced.**
- Implementation of the repair above.
- Test matrix: unit (registry/phase/idempotency), integration (assignment routing), Playwright E2E (teacher+student contexts, mocked hand input), visual regression, then manual camera smoke test.
- Confirm live Vercel production SHA and add an admin-only build-identity surface.
