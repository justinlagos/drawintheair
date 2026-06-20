# Free Paint → Magic Canvas (sprint deliverables)

Feature flag: **`freePaintMagicCanvasV1`** · Engine: new Magic Canvas · Fallback: legacy **FreePaintMode** (unchanged).

## Status

- ✅ `npx tsc -b --noEmit` — clean
- ✅ `npx vitest run` — 146/146 passing (21 new Magic Canvas tests)
- ✅ `npx vite build` — bundles cleanly (magicCanvasEngine + harness chunks)
- ✅ Dev route `/dev/free-paint-preview` serves; all modules transform under Vite
- ✅ Legacy FreePaintMode untouched; flag OFF in production by default
- ⏳ DOM-screen screenshots (entry chooser, dock) + webcam QA — run via the route + checklist below

## How to see it

**Live:** flag defaults ON in dev → the menu's **Free Paint** tile now mounts Magic Canvas
(entry chooser → Free Create / Try a Challenge / Finish a World). Set OFF to compare legacy
(`?flags=!freePaintMagicCanvasV1`).

**Preview harness (no webcam):** `npm run dev` → `/dev/free-paint-preview`. Pick world / challenge /
brush / size / colour, draw with the mouse or replay a Line / Circle / Zigzag, toggle perf tiers,
reduced motion, viewport, Freeze + Clean (hide debug) for screenshots. A debug overlay shows render
FPS, frame ms vs the 16.7ms budget, prediction (tip lead px), and stroke state.

## Feature flag instructions

- **Default:** ON in dev (`import.meta.env.DEV`), OFF in production.
- **Force ON / OFF:** `?flags=freePaintMagicCanvasV1` / `?flags=!freePaintMagicCanvasV1`.
- **Production kill switch:** `featureFlags.setFlags({ freePaintMagicCanvasV1: false })`.
- **Init-failure fallback:** if the engine fails to initialise, the shell disables the flag and
  reverts to legacy FreePaintMode before drawing begins.
- **Engine recorded** via `feature_flag_exposed` (`variant: magic_v1`).

## Architecture

```
'free' GameMode
 ├─ flag ON  → magicCanvasFrame (onFrame, draws world+ink on TrackingLayer canvas)
 │             + <MagicCanvasMode/> (entry, dock, HUD, completion — DOM)
 └─ flag OFF → freePaintLogic + <FreePaintMode/>   (legacy, untouched)

magicCanvas/
  challengeModel.ts    types + Zone + DrawingSignals + validation
  challengeEngine.ts   evaluateChallenge + SignalsAccumulator (pure)
  paintChallenges.ts   20 challenges (scene ones = Finish-the-World)
  paintWorlds.ts       4 worlds + reaction defs + evaluateReactions
  paintBrushes.ts      5 brushes (live + settled phases)
  magicCanvasEngine.ts live-ink pipeline, settled layer, signals, render
  magicCanvasFrame.ts  TrackingLayer adapter + tool-region prevention + lifecycle
  MagicCanvasMode.tsx  React shell (entry / dock / HUD / completion / coaching)
  dev/FreePaintPreviewHarness.tsx  dev-only preview + latency/FPS debug
```

Shared per-frame state stays in the engine (no React state per frame). Signals/challenge/reaction
logic is pure and unit-tested. The static world + settled artwork are cached to an offscreen layer;
only the live stroke + reactions redraw each frame.

## Challenge model (measurable behaviours only — no faked recognition)

`ChallengeRule` ∈ strokeCount · colourCount · coverage(zone?) · activeTime · continuousStroke ·
reachZone · markCountInZone · directionChanges · pathLength · selectedColours · brushUsed.
Progress is shown as counts ("4 of 5 marks", "2 colours used"), never artistic grading.

**20 challenges** across age bands (3–4 / 5–7 / all): long-line, three-circles, two-colours,
cloud-rain, creature-spots, side-to-side, five-marks, no-lift, tree-leaves, repeating-pattern,
road-to-house, sky-stars, warm-colours, zigzags, three-colours, spaceship-windows, fish-home,
maze-path, garden-flowers, empty-planet. The 9 `scene` challenges double as Finish-the-World content.

## Worlds, brushes, reactions

- **Worlds:** Sunny Playground (sky), Night Sky, Underwater, Magic Paper — palette + cached layers.
- **Brushes:** crayon (grain), paint, glow, sparkle (settled particles), rainbow (hue-shift).
- **Reactions** (sparse, signal-driven): flowersBloom, leavesAppear, starsTwinkle, planetGlow,
  fishApproach, bubblesRise, borderColour, lightsOn — fire only on real signals (e.g. marks in a zone).

## Latency model (the non-negotiable)

- Three pointer stages: raw → stabilised → **rendered** (adaptive smoothing — less smoothing when
  fast, snap on pen-down & after recovery) + a **short clamped prediction** (≤24px) for the displayed
  tip only; stored stroke points are the corrected rendered points (nothing jumps after release).
- **Immediate pen-down** (stroke starts the frame pinch crosses), **clean pen-up**, **no reconnect**
  after tracking loss (stroke ends; recovery needs a fresh pinch).
- Adaptive point sampling; cached settled layer so the live stroke never forces a full redraw.
- Per-tier scaling: low = flat strokes, no glow/particles, max responsiveness; decorative effects
  are settled-phase only and never block live ink. Debug overlay reports FPS / frame-ms / prediction.

## Analytics (React layer, not the frame loop)

`magic_canvas_opened`, `magic_canvas_entry_selected`, `free_create_started`,
`paint_challenge_started`, `paint_challenge_completed`, `finish_world_started`,
`paint_creation_finished`, `paint_clear_confirmed`, `paint_colour_selected`, `paint_brush_selected`,
`paint_size_selected`, `paint_undo_used`, plus `feature_flag_exposed`. No camera/landmark/artwork data.

## Files

**Created:** the 9 `src/features/modes/magicCanvas/*` files above, `tests/magicCanvasChallenges.test.ts`,
`tests/magicCanvasEngine.test.ts`, `scripts/gen-magic-shots.mts` (dev screenshot tool).
**Changed:** `src/core/featureFlags.ts` (flag), `src/App.tsx` (route 'free' through flag),
`src/main.tsx` (dev route), `src/lib/analytics.ts` (events).

## Screenshots (canvas content, rendered through the production engine)

`mc-1-night-stars`, `mc-2-paper-create`, `mc-3-playground-garden`, `mc-4-low-perf`,
`mc-5-reduced-motion` (regenerate: `npx vite-node scripts/gen-magic-shots.mts`, needs the
`@napi-rs/canvas` dev tool). The DOM screens (entry chooser, tool dock, completion next-actions,
tablet layout) render in React — capture them from `/dev/free-paint-preview` and the live `/app`.

## Manual webcam QA checklist (live dev build)

1. Slow + fast horizontal line — ink stays under the fingertip, no trailing lag.
2. Large + small circle — connected, no overshoot at the curve.
3. Zigzag / spiral — sharp turns stay connected.
4. Pinch repeatedly — immediate pen-down, clean pen-up, no tail.
5. Hand out of frame, then back — no long line across the canvas; fresh pinch starts a new stroke.
6. Draw near all four edges — alignment holds; nothing clipped.
7. Draw over the tool dock — no marks painted under the controls.
8. Two continuous minutes — no progressive slowdown / memory growth.
9. Switch colours/brushes/sizes — applies to the next stroke immediately.
10. Chromebook-class device — responsive; low tier still satisfying.

## Known limitations / next

- DOM-screen screenshots need a browser capture (canvas content is auto-rendered above).
- Brush sound and prewarming of brush resources are not yet wired (engine is allocation-light already).
- The legacy `airPaint*` flags remain independent; Magic Canvas uses its own engine rather than the
  older `freePaintProManager` layers (kept intact for the fallback path).
