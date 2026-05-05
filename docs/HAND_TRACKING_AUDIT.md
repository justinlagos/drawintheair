# Hand Tracking Failure — Deep Audit & Fix Plan

**Status:** Investigation complete · Plan awaiting approval before execution.
**Symptom:** Camera permission granted, but hand never detected. All
browsers, all devices. Wave screen sits at "Looking for your hand…"
forever (or did, before the diagnostic-pill fix).

## Trace of what *should* happen

```
1.  User visits /play
2.  App.tsx mounts with appState='onboarding'
3.  TrackingLayer mounts inside App
4.  TrackingLayer renders <video> + <canvas>
5.  TrackingLayer useEffect: handTracker.initialize() ─────╮
6.  TrackingLayer useEffect: startCamera()  ───────────────│──╮
7.  getUserMedia prompt → user grants                      │  │
8.  Stream attached to video element                       │  │
9.  loadedmetadata fires → video.play()                    │  │
10. cameraState.status = 'running', streamActive = true ◄──│──╯
11. handTracker.initialize() resolves → trackerReady=true ◄╯
12. visionEnabled = (running && streamActive && trackerReady)
13. useVisionLoop starts ticking at 30fps
14. Each tick: handTracker.detect(video, ts) → landmarks
15. interactionStateManager.process(results) → state with results
16. lastFrameDataRef.current = frameData
17. Throttled setLastFrameData → TrackingLayer re-renders
18. children render-prop re-invoked with frameRef
19. WaveToWake receives new trackingResults prop
20. WaveToWake useEffect detects landmarks, increments waveCount
```

If any step 5-15 hangs or fails silently, the screen sits forever.

## Silent failure points found

I read `handTracker.ts`, `useCameraController.ts`, `useVisionLoop.ts`,
`TrackingLayer.tsx`, `InteractionState.ts`, `service-worker.js`, and
`assetLoader.ts`. Here are the failure paths that produce **no user
feedback** and **no console output unless devtools are open**:

### 🔴 SF-1 (highest priority): HandLandmarker init swallows errors

`TrackingLayer.tsx:152-156`:
```typescript
handTracker.initialize()
    .then(() => setTrackerReady(true))
    .catch(err => {
        if (CAMERA_DEBUG) console.error('[HandTracker] init failed:', err);
    });
```

The `.catch` only logs if `CAMERA_DEBUG=true`. In production:
- error is swallowed
- `trackerReady` stays `false`
- `visionEnabled` stays `false`
- vision loop never starts
- WaveToWake's status pill says "🤖 Loading hand tracker…" forever

This is the **most likely root cause**. It explains "all browsers / all
devices" because any of the failure modes below will hit this catch.

### 🔴 SF-2: GPU delegate hardcoded with no CPU fallback

`handTracker.ts:25-29`:
```typescript
this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
        modelAssetPath: `...hand_landmarker.task`,
        delegate: 'GPU',
    },
    ...
});
```

`delegate: 'GPU'` requires WebGL2 + a working GPU pipeline. It fails on:
- Older Android phones (no WebGL2)
- Many Chromebooks (Intel UHD without WebGL2 support)
- Devices with hardware acceleration disabled
- Some Linux configurations
- Certain VM/cloud display sessions

When GPU init fails, `createFromOptions` throws. Caught by SF-1.

**No fallback is attempted.** Should retry with `delegate: 'CPU'`.

### 🟠 SF-3: WASM URL pinned to `@latest`

`handTracker.ts:21-22`:
```typescript
const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
);
```

`@latest` resolves to whatever jsdelivr has cached. If jsdelivr serves a
WASM build that is incompatible with the installed `@mediapipe/tasks-vision`
NPM package version, the WASM module will fail to instantiate.

**Project's NPM package version should be pinned to match the CDN URL.**

### 🟠 SF-4: WASM/model fetch can hang or 404 without recovery

If jsdelivr or storage.googleapis.com is slow / blocked / 404 / CSP-rejected:
- `FilesetResolver.forVisionTasks` hangs or rejects
- `HandLandmarker.createFromOptions` hangs or rejects
- No timeout, no retry, no user feedback

Common causes: corporate networks blocking googleapis, CSP rules from
hosting platform, regional CDN issues, school firewalls.

### 🟡 SF-5: video.play() failure silently swallowed

`useCameraController.ts:120`:
```typescript
await video.play().catch(() => { /* silent */ });
```

If autoplay is blocked (rare given we have `muted`+`playsInline`+user
gesture), the video stays paused. `useVisionLoop` checks `!video.paused`
on every tick (line 60), so detection never runs. No error surfaced.

### 🟡 SF-6: assetPreloader runs but catches errors quietly

`assetLoader.ts:33-36`:
```typescript
} catch (error) {
    console.warn('[AssetPreload] Preload failed:', error);
}
```

If preload fails, TrackingLayer's effect runs `initialize()` again. Same
catch path (SF-1) silently fails again.

### 🟡 SF-7: vision-loop guard is correct but hides the issue

`useVisionLoop.ts:60`:
```typescript
if (video && video.readyState >= 2 && !video.paused && !document.hidden) {
    const result = handTracker.detect(...);
```

If any of these are false, the tick is silent (no log, no callback). On
slow devices the video might briefly be `readyState < 2` between frames.
Not a root cause but compounds debug difficulty.

### 🟢 SF-8 (probably fine): InteractionStateManager confidence gate

`InteractionState.ts:94`: `minConfidence: 0.6`. If MediaPipe detects a
hand but confidence is < 0.6, `hasHand=false`. **However**, the raw
`results` object is still passed back in the main return path (line 825),
so `WaveToWake` should still see landmarks. Not the root cause but worth
verifying once we get logs.

## Most likely root cause

**SF-1 + SF-2 + SF-4** acting together:

1. WASM downloads from jsdelivr (5-10 seconds on slow networks)
2. Model downloads from googleapis (could fail on restrictive networks)
3. GPU delegate initialization fails on most non-flagship devices
4. The catch in TrackingLayer silently logs nothing to production
5. trackerReady stays false forever
6. Wave screen permanently stuck

This is **consistent with "all browsers, all devices"** because GPU
delegate failure is broad and the silent catch is universal.

## Fix plan (not yet executed — awaiting approval)

### Priority 1 — Remove silent failures (mandatory)

**P1.a Surface init errors in production.** Replace the dev-only
`CAMERA_DEBUG` console.error with a reactive error state that propagates
to the diagnostics object exposed to children. WaveToWake's status pill
already has a "tracker-loading" state — add a "tracker-error" state with
the actual error message so we can see it in the field.

**P1.b CPU fallback for GPU delegate.** Wrap `HandLandmarker.createFromOptions`
with a try/catch. On failure, retry with `delegate: 'CPU'`. CPU is slower
(~15fps vs 30fps) but works on every device. Log which delegate succeeded.

**P1.c Pin WASM version.** Read the installed `@mediapipe/tasks-vision`
version at build time (or hardcode to the version in package.json) and
use `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@<X.Y.Z>/wasm`.
Removes `@latest` resolution flakiness.

**P1.d Timeout the init.** Race `handTracker.initialize()` against a 15-second
timeout. If it doesn't resolve, surface "Tracker took too long — try
refreshing" to the user.

### Priority 2 — Make camera startup robust

**P2.a Surface video.play() failures.** If `video.play()` rejects, set a
camera state of `'autoplay-blocked'` and ask the user to tap to start.

**P2.b Verify video element gets frames.** After `play()`, verify
`videoWidth > 0` within 3 seconds. If not, surface an error.

**P2.c Add a retry button.** When camera is in error state, show a
KidButton to retry init.

### Priority 3 — Better field debugging

**P3.a Always-on debug pill behind `?debug=tracking`.** Shows live values
for: camera status, video.readyState, video.videoWidth/height,
trackerReady, vision FPS, detection count, last error.

**P3.b Send init errors to analytics.** Fire `tracking_init_failed` event
with error message and user-agent so we can see real-world failure rates.

### Priority 4 (REVISED) — Tracking-failed help screen, no bypass

The previously-shipped "Skip — let me in" button was wrong. It hides the
real problem and dumps the kid into a mode-selection menu that itself
requires hand tracking to use, then into game modes that are entirely
hand-driven. Bypassing the wave gate just produces a stuck menu instead
of a stuck wave screen.

**Revised behaviour:**
- If `handTracker.initialize()` fails after CPU fallback + timeout, show
  a dedicated "Hand tracking not available" screen.
- Surface the actual error: "WebGL is disabled" / "Camera blocked" /
  "Couldn't reach tracking model".
- "Try again" button (re-runs init).
- Common-fixes checklist ("Try Chrome or Safari", "Allow camera",
  "Disable ad-blockers that might block CDN files").
- "Tell us what happened" button opening a feedback form pre-filled
  with user-agent + error.
- **No bypass.** Adults can dismiss back to the landing page (where
  FAQ / Privacy / Pricing don't require tracking).

The "Skip — let me in" button shipped in the previous commit needs to
be removed.

### Priority 5 (NEW) — Audit hand interactions for touch/mouse fallback

If tracking fails on a tablet or laptop, the parent / teacher should
still be able to navigate menus to dismiss back to the landing page.
Audit and confirm every hand-driven interaction has a touch/mouse
equivalent:

- `ModeSelectionMenu` — game-mode cards: must be tappable.
- `AdultGate` — exit/settings buttons: must be tappable.
- In-game `GameTopBar` — back/exit: must be tappable.
- `BubbleCalibration` "Next Level" — must be tappable.
- Wave screen "Try Again" button on tracking-error state — must be tappable.

If any of these are hand-only, add a touch/mouse path. We're not adding
mouse-driven *gameplay* (the games are about movement); we're ensuring
*navigation* works without hand tracking.

## Verification plan

After fixes ship:

1. **Self-test:** Open `/play` in Chrome with devtools. Watch console.
   Should see exactly one "[HandTracker] initialised with delegate=GPU"
   or "...delegate=CPU".
2. **Disable WebGL test:** chrome://flags → disable WebGL → reload `/play`.
   Should fall back to CPU and still work. Status pill should still go
   green when hand is detected.
3. **Slow network test:** DevTools → Slow 3G → reload `/play`. Init
   should take longer but eventually succeed.
4. **Block CDN test:** DevTools → Network → block `cdn.jsdelivr.net`.
   Should see clear error message in the status pill, not infinite spin.
5. **Mobile test:** Real iPhone Safari + real Android Chrome. Should
   work end-to-end on both.

## Open questions for you before I execute

1. **OK to add a CPU-fallback path?** It bumps minimum-supported devices
   significantly but slows tracking on those devices. I think yes — better
   slow tracking than no tracking. Confirm?
2. **OK to pin `@mediapipe/tasks-vision` to the package.json version?**
   Locks WASM to JS-package compatibility. No downsides, just want to
   confirm.
3. **OK to add a "Try again" retry button + show error text?** Currently
   the design is clean and "kid-only" facing. Adult-error-text looks more
   utilitarian.
4. **Want me to tackle P1+P2 in one push, or P1 first?** P1 alone will
   probably fix it. P2 is defensive hardening for less-common failure
   modes.

Once you give me the green light I'll write the code in one focused
commit, verify build + lint, and push.
