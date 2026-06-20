# Tracing Mode — Playful UI V1 (sprint deliverables)

## Visual redesign pass (vehicle + environment)

**Guide vehicle — "the Trailblazer"** (`src/features/modes/tracing/tracingCharacter.ts`):
an original, vector-drawn purple drawing-buggy. Clear nose/front, two/four
wheels, a windscreen with two small forward-looking eyes, a pencil mounted at
the FRONT with a glowing nib (marks direction + "drawing"), warm accent
headlight, soft contact shadow. No emoji, no circular avatar frame. Rotates to
the path tangent with smooth angular interpolation + turn lean, and has
deliberate states: idle / ready / moving / turning / paused / offPath /
returning / recovered / finishing / celebrating. Scale `clamp(58px, 6vmin, 88px)`.

**Environment — "learning park"** (`src/features/modes/tracing/tracingRenderer.ts`):
layered depth — (1) sky gradient, (2) distant hills + corner clouds, (3)
midground trees/flowers at the edges only, (4) integrated set pieces: a launch
pad with green start star and a finish flag/destination keyed to the glyph type
(A / # / ◇). The track is now smoothed (quadratic curves) into a soft play road
with a contact shadow, cream surface, lavender border, dashed centre guide, and
a paint-dot completed trail. Progress blooms open beside the route; an off-path
guide beam points gently back. Static scenery is cached to an offscreen layer
(falls back to inline draw headless); dynamic bits redraw each frame.

**Theme/scale config:** `src/features/modes/tracing/tracingThemes.ts`
(vehicle/marker sizes, palette, per-tier + reduced-motion quality).

**Clean approval screenshots** (1366×768 unless noted), rendered headlessly
through the production renderer via `scripts/gen-tracing-shots.mts`
(`npm i` then `npx vite-node scripts/gen-tracing-shots.mts`; needs the
`@napi-rs/canvas` devDependency):

1. `01-S-idle` · 2. `02-S-45` · 3. `03-S-offpath-recovery` · 4. `04-S-complete`
· 5. `05-num5-idle` · 6. `06-num5-45` · 7. `07-num5-complete` ·
8. `08-vehicle-closeup` · 9. `09-S-low-perf` · 10. `10-S-reduced-motion`.

Per the harness requirements, the harness now also has: environment on/off,
vehicle state override, vehicle scale (1×/1.5×/2×), and a "Clean (hide debug)"
toggle so screenshots carry no debug overlays.

---



Feature flag: **`tracingPlayfulUiV1`** · Engine: redesigned **V2 tracing** · Fallback: legacy **PreWritingMode** (unchanged).

## Status at a glance

- ✅ `npx tsc -b --noEmit` — clean (exit 0)
- ✅ `npx vitest run` — 124/124 passing (38 new tracing tests)
- ✅ `npx vite build` — bundles cleanly (912 modules; verify locally — see note below)
- ✅ Legacy PreWritingMode untouched; flag OFF in production by default
- ⏳ Screenshots + on-device webcam QA — run via the harness + checklist below

> Build note: a normal `npm run build` in some environments trips on a stale
> `dist/.DS_Store` it can't delete. That's a filesystem permission quirk, not a
> code error. If you hit it: `rm -f dist/.DS_Store` (or `git clean -fdx dist`) then rebuild.

## How to see it

**Preview harness (no webcam):** `npm run dev` → open `/dev/tracing-preview`.
Pick any activity/pack, replay the ideal path or an off-path run, simulate
pinch + manual drag, jump between strokes, toggle tracking loss, reduced
motion, performance tiers, and viewport presets. "Freeze" holds a frame for
screenshots; "Safe bounds" overlays the safe tracing region. A debug panel
shows stroke index, progress, vehicle state, and the active coaching message.

**Live mode:** the flag defaults ON in local dev, so the menu's **Tracing**
tile now mounts the playful experience. Set it OFF to compare the legacy mode.

## Feature flag instructions

- **Default:** ON in dev (`import.meta.env.DEV`), OFF in production.
- **Force ON (any env):** add `?flags=tracingPlayfulUiV1` to the URL.
- **Force OFF:** `?flags=!tracingPlayfulUiV1`.
- **Production kill switch (no redeploy):** `featureFlags.setFlags({ tracingPlayfulUiV1: false })`.
- **Auto-fallback:** if the V2 engine fails to initialise, the HUD logs the
  failure and disables the flag, reverting to PreWritingMode before gameplay.
- **Analytics:** active engine recorded via `feature_flag_exposed`
  (`meta.flag_name=tracingPlayfulUiV1`, `variant=playful_v1`); completion via
  `tracing_letter_completed` with `meta.tracing_engine`.

## Files created

- `src/features/modes/tracing/tracingStrokeModel.ts` — reusable stroke model (`TracingStroke`/`TracingActivity`), geometry, responsive layout, validation.
- `src/features/modes/tracing/tracingActivities.ts` — all 52 activities as ordered strokes (lines, shapes, A–Z, 1–10).
- `src/features/modes/tracing/tracingThemes.ts` — track/marker/vehicle metrics, scoring + feedback tuning, themes, perf/reduced-motion scaling, safe region.
- `src/features/modes/tracing/tracingRenderer.ts` — background, layered track, completed fill, markers, direction preview, particles.
- `src/features/modes/tracing/tracingCharacter.ts` — vector guide vehicle with all states.
- `src/features/modes/tracing/tracingFeedback.ts` — single-message coaching state machine with hysteresis.
- `src/features/modes/tracing/playfulTracingEngine.ts` — stateful engine: per-stroke progress, start-zone gating, completion, vehicle, particles, scene builder.
- `src/features/modes/tracing/tracingPlayfulFrame.ts` — TrackingLayer onFrame adapter + lifecycle + progress-store bridge.
- `src/features/modes/tracing/TracingModePlayful.tsx` — HUD shell (activity card, progress, coaching, restart, celebration).
- `src/features/modes/tracing/dev/TracingPreviewHarness.tsx` — dev-only preview harness.
- `tests/tracingStrokeModel.test.ts`, `tests/tracingThemes.test.ts`, `tests/playfulTracingEngine.test.ts` — 38 unit tests.

## Files changed

- `src/core/featureFlags.ts` — added `tracingPlayfulUiV1` (dev-on default).
- `src/App.tsx` — route `pre-writing` engine + HUD through the flag, legacy fallback.
- `src/main.tsx` — DEV-only `/dev/tracing-preview` route.

## What changed for the child (vs. legacy)

- **Visual:** thin neon tube → wide, soft, rounded lane (outer edge, cream
  surface, dashed centre guide), a friendly car as the guide, illustrated
  start/finish markers, themed worlds (Meadow / Alphabet Town / Number Park).
- **Interaction:** clear start zone, animated direction preview before tracing,
  numbered strokes, gentle off-path correction (wobble + one calm message,
  never red), single coaching line at a time, completion celebration.
- **Learning:** real multi-stroke formation — A is left-leg → right-leg →
  crossbar; each stroke must start in its zone; completed strokes persist;
  no wrong-direction finishing; correct stroke order for every letter/number.
- **Performance:** static-layer-aware renderer, per-tier particle/glow scaling,
  reduced-motion support; no React state churn in the 60fps loop.

## Manual webcam QA checklist (live dev build)

1. **Pointer alignment** — the car sits under your fingertip on the lane.
2. **Pinch detection** — pinch starts driving; releasing pauses cleanly.
3. **Vehicle stability** — no jitter; smooth rotation/lean through turns.
4. **Path tolerance** — comfortable for big air gestures; not punishing.
5. **Start gating** — progress only begins from the start star.
6. **Tracking-loss recovery** — hand out of frame, then back: completed strokes intact.
7. **Multi-stroke** — A/E/H advance stroke-by-stroke; completion fires once.
8. **Restart** — resets to stroke one, preview replays.
9. **Scaling** — readable at classroom distance on Chromebook/iPad/desktop.
10. **Performance** — responsive on the target device; low tier still clear.

## Known limitations / next sprint

- Screenshots are captured from the harness (Freeze + browser capture); not auto-generated here.
- The harness chunk is DEV-route-gated (never loaded in prod) but still present in the bundle; exclude via build config if strict exclusion is required.
- Remaining straight-edged glyphs are intentionally angular (correct for letters like A/E/H/K/M/N/V/W/X/Y/Z); revisit only if classroom testing flags any.

### Curriculum + spill fixes (latest)

- ✅ **Packs trimmed:** Pack 1 = a single warm-up (Vertical Line); Pack 2 =
  Circle, Square, Triangle, Star. Order is Warm-up → Shapes → Letters (A–Z) →
  Numbers (1–10), 41 activities total. Unlock thresholds updated to match
  (Shapes after the warm-up, Letters after 4 shapes, Numbers after 6 letters).
- ✅ **Curved-letter "spill" fixed:** on multi-stroke letters the guide used to
  glide in a straight line across the glyph between strokes (reading as the road
  spilling out then re-joining). It now **snaps to the next stroke's start** on
  advance, so the guide always follows the trail.

### Resolved since first cut

- ✅ **number-8** rewritten as a smooth two-loop figure-eight (was angular diamonds).
- ✅ **letter-G** hook reconnected to the C body (was a floating stub).
- ✅ **B/D/P/R** bowls and **S** smoothed to arcs; all verified traceable to completion in tests.
- ✅ **Real accuracy** now tracked in the engine (time-on-path / total) and persisted via `completeLevel`.
- ✅ **Deeper telemetry** now fired from the React layer (never the frame loop):
  `tracing_activity_loaded`, `tracing_stroke_completed`, `tracing_off_path`, `tracing_recovered`,
  plus `feature_flag_exposed` (engine version) and `tracing_letter_completed`.
