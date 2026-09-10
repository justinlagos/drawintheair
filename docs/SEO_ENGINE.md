# Autonomous SEO Engine

An SEO system that runs itself: it discovers opportunities from real evidence,
scores them, applies an explicit autonomy policy that encodes the founder's
judgement, makes only permitted changes, verifies and measures them, and learns
from the result. There is no "ask a human" node inside the loop — autonomy is
granted by policy, not by approval.

This document is the build plan. Component 1 (the policy and guardrails) ships
first and is the only part live today; the rest follow in staged PRs, several
gated on credentials the engine needs to read data and open PRs.

## Non-negotiables (inherited from the repo)

- **Deploy contract unchanged.** The engine ships via the same path as a human:
  a branch, a PR, green CI, squash-merge to `master`. It never bypasses CI, never
  promotes deployments by hand, never edits `master` directly.
- **Child-first, privacy-first.** The engine may not touch the camera app, Class
  Mode, auth, child-data handling, pricing, or the product UX. These are RED.
- **Product as proof.** Every change must strengthen Draw in the Air as a
  movement-based learning platform, not turn it into a generic kids-education blog.

## The autonomy policy (component 1 — shipped)

Lives in `src/seo/autonomy/policy.ts` (machine-readable) with the classifier in
`src/seo/autonomy/classify.ts` and tests in `tests/seoAutonomyPolicy.test.ts`.

**Three levels.** GREEN = low-risk, reversible optimisation (metadata, canonicals,
internal links, breadcrumbs, alt text, structured data, sitemap membership,
technical fixes) — autonomous. AMBER = title / incremental copy / description
changes, autonomous only inside strict limits (≤20% content change, intent
unchanged, query-supported, no new claims, no cannibalisation). RED = product,
legal, reputation or infrastructure decisions — never autonomous, at any mode.

**Preconditions.** Every autonomous change must have a measurable SEO reason,
real evidence, improve an existing page, preserve IA / positioning / accessibility
/ child-first UX, pass tests and build, carry a success metric, and be reversible.
Any miss → record the opportunity and wait.

**Primary outcome is qualified organic usage**, not rankings. The funnel is
qualified demo start → meaningful interaction → activity completion → signup.
Rankings and impressions are inputs. A change that lifts impressions but drops
qualified demo starts is a *failed* optimisation and is learned as one.

**Autonomy budget.** ≤3 changes and ≤5 URLs per cycle; ≤20% content change per
page; never title+H1+canonical+body at once; one hypothesis per page per window;
no repeat change to a page until the previous one is measured.

**Opportunity × risk matrix.** High opportunity + low risk → execute; + medium
risk → execute within limits; high risk → hold. Autonomy without recklessness.

## Autonomy mode (the rollout ramp / kill switch)

`policy.mode` gates how much of the loop reaches production, independent of any
change's own level:

- `shadow` — run the whole loop, open PRs, **merge nothing**. Default. Validates
  the engine's judgement against real data before it ships unattended.
- `green-only` — auto-merge GREEN on green CI; AMBER opens a PR and holds.
- `green-amber` — auto-merge GREEN and in-limit AMBER on green CI.
- `paused` — hard stop: discover/score only, never write.

Widening the mode is a deliberate human edit to `policy.ts`, reviewed like any
other change. Nothing else in the system can widen its own autonomy.

## The loop

```
Search Console → Analytics → Site/technical audit
        → Discover opportunities → Score opportunity → Assess risk
        → Apply autonomy policy  (GREEN execute · AMBER constrain · RED hold)
        → Create change → Test → Build → (mode-gated) open PR / merge on green CI
        → Post-deploy verification → Measure vs baseline → Success / failure
        → Update learning memory → Re-score → Next opportunity
```

## Components and build order

1. **Autonomy policy + classifier** — SHIPPED. Its tests run in CI, pinning the
   policy (RED always blocked, AMBER limits enforced, budget caps). When the
   executor lands, CI also runs the classifier over each cycle's change manifest
   so a policy violation fails the build.
2. **Opportunity scorer** — SHIPPED (`evidence.ts`, `signals.ts`,
   `discover.ts`). Search Console page×query rows and the entry-page funnel
   are normalised to canonical paths and mapped to the 0–1 opportunity
   dimensions. Discovery emits only what the metadata executor can act on:
   `title_query_mismatch` (AMBER page_title), `ctr_gap` (GREEN
   meta_description), `duplicate_metadata`, `missing_description`. Thresholds
   live in `DEFAULT_THRESHOLDS` (200 impressions, position ≤ 20, CTR under half
   the expected curve, a supporting query needs 100 impressions and 20% of the
   page). The child play area, app, auth and admin paths are excluded by
   `isEngineEligiblePath` before anything is scored.
3. **Risk evaluator** — SHIPPED (`signals.ts` `riskSignalsFor`): a static risk
   profile per action type, raised for homepage/positioning pages and when a
   query splits across pages (cannibalisation detection in `discover.ts`).
4. **Change planner** — SHIPPED (`planner.ts`). Scores, runs the opportunity ×
   risk matrix (`decide`), classifies under the live policy AND under a
   projected green-amber policy (so shadow runs show what the engine would do),
   then fills the cycle within budget. It writes a **brief** (current values,
   supporting queries, rationale, hard constraints) and no copy: the drafter is
   the next component and the executor re-validates whatever it writes. The
   two CI-backed preconditions stay false until the engine's PR has run the gate.
5. **Executor** — metadata surface shipped (`executor.ts`); write-back to
   `seo-config.ts` + PR opening is the next component. Never touches RED
   surfaces; enforces the per-cycle budget.
6. **Verification layer** — page checks shipped (`verify.ts`); the post-deploy
   runner (fetch live pages, compare to expectations) lands with write-back.
7. **Measurement layer** — the data decides, not the AI. Fixed windows: 7d
   technical sanity, 14d early signal, 28d meaningful SEO, 56d for low-volume
   queries. Compares against the recorded baseline.
8. **Learning memory** — per intervention: hypothesis, evidence, change, expected
   outcome, actual outcome, confidence, result, decision. Feeds confidence on the
   next similar opportunity. Stored in the analytics DB, never self-judged.
9. **Scheduler** — a GitHub Action on a cadence runs discover→plan→(mode-gated)PR.
10. **Kill switch + rollback** — immediate rollback on build/route/canonical/
    sitemap/robots/structured-data/perf/analytics failure; SEO rollback (revert +
    mark hypothesis failed + don't repeat) when qualified usage or conversion
    falls, visibility collapses, indexation behaves unexpectedly, traffic lands on
    the wrong page, or cannibalisation rises.

## Where it runs, and the credentials it needs

The loop cannot run from a chat session or the cloud workspace — it runs
unattended as a scheduled **GitHub Action** with least-privilege secrets that
Justin provisions (never handled in plaintext by the assistant):

- **Google Search Console API** — a service account with read access to the
  `drawintheair.com` property (queries, pages, coverage, inspection).
- **Supabase** — read access to the analytics tables for the qualified-usage
  funnel (the same events PR #1 instruments).
- **GitHub token** — branch + PR creation, and PR auto-merge only when the mode
  and CI allow it.
- **Vercel** — read deployment status for post-deploy verification.

## Baseline (to measure against)

Captured before any engine change, from the first Search Console pull:
243 clicks; ~9% UK share; 40 of 85 pages indexed; ~0% trace-page CTR. The
measurement layer compares every intervention's window against this and against
the pre-change state of the specific page.

## Running a cycle

`npx tsx scripts/seo-engine/cycle.ts` (the `SEO Engine` Action does exactly this
on `workflow_dispatch`). One run:

1. Reads Search Console for the last 28 final days and the 28 before them
   (`scripts/seo-engine/gsc.ts`, service-account JWT in `google-auth.ts`, scope
   `webmasters.readonly`).
2. Reads the funnel by **entry page** through the `seo_engine_ro` role
   (`scripts/seo-engine/funnel.ts`). The event → step mapping is
   `FUNNEL_DEFINITION` in that file; changing it is a human PR, never the engine.
   If the funnel read fails the cycle exits 1 and plans nothing: the primary
   outcome is unmeasurable, so "rankings only" decisions are not allowed.
3. Loads the metadata the engine owns (every `PAGE_META` entry, by canonical path).
4. Discover → score → guardrails → decide → plan → execute (held in shadow).
5. Writes `.seo-engine/out/cycle-<id>.json` (record + evidence) and `.md`
   (summary), uploads them as the run artifact `seo-engine-cycle` (90 days), and
   appends the summary to the job summary. The JSON records are the seed of the
   learning memory.

Optional env: `GSC_PROPERTY` (default `sc-domain:drawintheair.com`),
`SEO_ENGINE_WINDOW_DAYS` (28), `SEO_ENGINE_OUT`.

## Current status

- Components 1–4 shipped; 5 and 6 partially (metadata executor + page checks).
- Every run is `shadow`: it reads, scores, plans and holds. Nothing merges.
- Next: the drafter (turns a brief into a metadata patch under the brief's
  constraints), write-back to `seo-config.ts` on a branch + PR via
  `SEO_ENGINE_GH_TOKEN`, then measurement against the cycle records.
