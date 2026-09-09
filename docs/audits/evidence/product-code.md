# Draw in the Air — Gameplay / Camera / Privacy / UX Code Audit
**Deployed commit:** `6a81fdf` (detached, read-only) · **Auditor scope:** tasks 1–9 of new-term readiness audit
**Date:** 2026-08-15
**Labels:** VERIFIED = confirmed by reading deployed code · INFERENCE = strongly implied but not directly executable here · UNVERIFIED = cannot be confirmed from code alone. All file paths relative to `/home/claude/dia-audit/repo`.

---

## 1. PRIVACY — the no-video-upload promise

### Verdict
**VERIFIED at code level: no camera pixel data leaves the browser through any first-party code path.** Every pixel sink found is local-only. Third-party recorders (Microsoft Clarity) are the one channel whose behaviour is controlled outside this codebase — see caveat C1 below.

### Every pixel/stream sink found (exhaustive grep: toDataURL, toBlob, captureStream, ImageCapture, MediaRecorder, getUserMedia, WebSocket, sendBeacon, XHR)

| Sink | Location | Verdict |
|---|---|---|
| `canvas.toBlob` | `src/features/modes/FreePaintMode.tsx:286-296` | Local PNG download of the **drawing canvas** (z-index 100 game canvas — never contains camera pixels; the `<video>` element is separate and never composited onto it, `src/features/tracking/TrackingLayer.tsx:564-597`). Blob → `URL.createObjectURL` → `<a download>` → revoked. **VERIFIED local-only.** Only reachable in legacy FreePaint (flag-off path). |
| `getUserMedia` | `src/camera/useCameraController.ts:82` (production path), `src/core/useWebcam.ts:61` (used only by `DemoPrep`/`DemoLoader` demo pages) | Stream attached to a local `<video>`; never recorded, never transmitted. **VERIFIED.** |
| Self-view / transparency previews | `src/features/tracking/ParentTransparencyBanner.tsx:80-97`, `src/features/tracking/ChildSelfView.tsx:30-40` | Both **borrow the same MediaStream** into a second local `<video>` (`srcObject` assignment only). No capture API called. **VERIFIED local-only.** The banner exists precisely so adults can verify the no-upload claim. |
| `WebSocket` | `src/lib/supabase.ts:1032` | Supabase Realtime (Phoenix protocol). Sends channel join/heartbeat JSON only; no binary frames, no media. **VERIFIED.** |
| `navigator.sendBeacon` | `src/lib/analytics.ts:1313, 1330` | Unload-time delivery of the JSON analytics event batch to Supabase REST. Scalar payloads only (see below). **VERIFIED no pixels.** |
| `MediaRecorder` / `captureStream` / `ImageCapture` / `toDataURL` | — | **Zero occurrences in `src/`.** VERIFIED. |

### What derived data DOES leave the device, per destination

1. **Supabase (`analytics_events` / `learning_attempts`, first-party "LIOS")** — `src/lib/analytics.ts`. Event vocabulary (lines 60–300): funnel, mode lifecycle, camera/tracker outcomes, adult-gate events, `tracker_quality_sample` (fps + missing-frame %, 1 Hz while a session is active — `src/camera/useVisionLoop.ts:97-110`). Learning attempts carry **gesture-quality scalars only** (`gq_path_accuracy_pct` etc., `src/lib/analytics.ts:350-365`) with the explicit comment "Raw coordinates NEVER leave the device, only these scalars transit." I found no code path serialising landmark arrays into any event. Child first names entered in Class Mode join **are** stored in Supabase `session_students` (by design, teacher-facing roster; RPC `class_join`, `StudentClassClient.tsx:374`).
2. **PostHog** — `src/lib/observability/posthog.ts`. Exemplary config: `autocapture:false`, `disable_session_recording:true`, `mask_all_text`, `respect_dnt`, `persistence:'memory'`, `person_profiles:'identified_only'` (lines 247-293). Hard **event allow-list** (37-111) and **property allow-list** (118-157) enforced at the `trackEvent` boundary (303-318); unknown events silently dropped; objects stripped. Identify is pseudonymous device_id only (324-332). **VERIFIED: no landmark coords, no pixels, no PII can transit.**
3. **Sentry** — `src/lib/observability/sentry.ts`. Replay **off by default** (`replaysSessionSampleRate: 0.0`, line 202); even if `VITE_SENTRY_REPLAY=on` it is error-only with `maskAllText/maskAllInputs/blockAllMedia` (188-194). `beforeSend` scrubs a PII key denylist that explicitly includes `frame`, `imageData`, `landmark`, `coords` (98-105), prunes URLs to pathname, drops request bodies/cookies/headers, strips stack-frame vars. **VERIFIED.**
4. **GA4 + Microsoft Clarity + Meta Pixel** — injected from `src/main.tsx:840-886` only when (a) hostname is exactly `drawintheair.com`/`www.` (827-838) **and** (b) the visitor granted opt-in cookie consent (`src/lib/analyticsConsent.ts`, `main.tsx:888-904`). GA4 receives page views; Meta Pixel receives PageView on every SPA route change (`main.tsx:300`, `meta.ts:53`) plus mapped funnel events (`Lead`, `Subscribe`, `StartTrial` — Signup.tsx:90-92, Billing.tsx:100); Clarity records DOM sessions. None receives pixels from first-party code.
5. **CSP backstop** — `vercel.json` `connect-src` limits exfiltration targets to Supabase, GA, Clarity, Sentry, PostHog, Facebook, jsdelivr, storage.googleapis.com. `frame-src 'none'`. **VERIFIED** an accidental future upload to an arbitrary host would be CSP-blocked.

### Caveats
- **C1 — Clarity masking is not configured in code (UNVERIFIED / MANUAL).** `main.tsx:867-885` injects the stock Clarity tag with **no masking config and no route exclusion**, and there are zero `data-clarity-mask`/`data-clarity-unmask` attributes in `src/`. Clarity's recorder does not serialise `<video>`/`<canvas>` pixel content by default (placeholders only), so camera frames should not reach Microsoft — but that guarantee lives in Clarity's client behaviour and the project's dashboard masking settings, **not in this repo**. Clarity WILL record DOM sessions of `/play` and `/join` (children's gameplay) once an adult has accepted cookies on that device. Verify Clarity project settings (Strict masking recommended) and a live recording of /play. Same note applies to Class Mode student names rendered in teacher-console DOM.
- **C2 — Consent UX (see §6):** the consent banner renders over child gameplay routes; a child can tap "Accept", which is the switch that enables GA4/Clarity/Meta Pixel. Legally-relevant (child granting consent), though not a pixel leak.
- **C3 — `camera_denied` catch-all** sends `err.message` to Supabase meta (`useCameraController.ts:199`). Browser getUserMedia messages are generic; low risk, but it is the one free-form error string in the camera path.

---

## 2. Camera / onboarding state machine

Production camera path: `TrackingLayer` (`src/features/tracking/TrackingLayer.tsx`) → `useCameraController` (`src/camera/useCameraController.ts`) + `useVisionLoop` + `handTracker`. State union: `idle | requesting | running | error` with `errorCode ∈ {PERMISSION_DENIED, NO_DEVICE, DEVICE_BUSY, NOT_SUPPORTED, UNKNOWN}`.

| Scenario | Handling | Evidence | Verdict |
|---|---|---|---|
| First visit | 50/50 A/B `camera_explainer_v1`: treatment shows `CameraExplainer` pre-prompt before `startCamera()`; control starts immediately | `TrackingLayer.tsx:232-246, 709-711` | VERIFIED handled. Note the A/B means half of first-time users get **no** pre-prompt. |
| Permission prompt pending | `status:'requesting'`; WaveToWake shows the wave card; `StuckHelp` safety net escalates if stuck ~10s | `WaveToWake.tsx:452-460` | VERIFIED |
| Denied | `NotAllowedError` → `PERMISSION_DENIED` → full-screen `CameraRecovery` with browser/OS-specific steps (`src/lib/cameraHelp.ts`), Try again + Back to home | `useCameraController.ts:163-168`; `TrackingLayer.tsx:250-257, 703-708`; `CameraRecovery.tsx` | VERIFIED, but the recovery screen is **reading-heavy adult copy** — appropriate for the adult, a dead-end for an unaccompanied child. |
| Dismissed prompt (Chrome "x") | Surfaces as `PERMISSION_DENIED` or `UNKNOWN` → same recovery screen | same | VERIFIED (exact DOMException per browser: MANUAL) |
| No device | `NotFoundError` → `NO_DEVICE` → recovery with cause-specific copy | `useCameraController.ts:169-174` | VERIFIED |
| Device busy (Teams/Zoom holding cam) | `NotReadableError`/`TrackStartError` → `DEVICE_BUSY` → recovery | `useCameraController.ts:175-180` | VERIFIED |
| Overconstrained | Profile-fallback loop tries next resolution profile (`CAMERA_PROFILES`) | `useCameraController.ts:80-188` | VERIFIED |
| Insecure context (http) | `navigator.mediaDevices` undefined → all profiles throw TypeError → `NOT_SUPPORTED` → recovery | `useCameraController.ts:190-202` | VERIFIED handled indirectly; no explicit `isSecureContext` check exists (grep: zero hits). |
| **Disconnect mid-session (unplug/OS revoke)** | **No handler.** No `track.onended` / `devicechange` listener anywhere. `cameraState` stays `running`; the only signal is the "👋 I need to see your hands" toast after ~3s of no hands (`TrackingLayer.tsx:165-166, 326-338`). No recovery screen, no retry offered. | `useCameraController.ts` (absence) | **VERIFIED gap** — child dead-ends with a misleading "show me your hands" message. MANUAL test to confirm browser behaviour. |
| Model/WASM download failure | 15s timeout per stage; GPU→CPU delegate fallback; terminal failure sets `trackerError` → `TrackerErrorScreen` (retry + fixes + mailto) inside WaveToWake | `handTracker.ts:35, 84-192`; `TrackingLayer.tsx:201-218`; `WaveToWake.tsx:220-221, 799+` | VERIFIED handled. **But no offline/local model fallback — see §3.** |
| Slow model load | Wave screen waits; `StuckHelp` distinguishes "slow tracker init" from "out of frame" | `WaveToWake.tsx:91, 452-460` | VERIFIED |
| Recovery without reload | `restartCamera()` (stop + re-request, `useCameraController.ts:209-212`) and `retryTracker()` (close + re-init nonce, `TrackingLayer.tsx:176-182`) — both wired to Retry buttons | VERIFIED |
| Tab hidden/restore | Video paused/resumed on `visibilitychange` without re-acquiring stream | `useCameraController.ts:224-236` | VERIFIED |
| In-app browsers (FB/IG webview) | `InAppBrowserNotice` hand-off before the prompt fails silently | `App.tsx:540-542`, `src/features/onboarding/inAppDetection.ts` | VERIFIED |
| Unmount cleanup | Tracks stopped + `srcObject` nulled on stop and on unmount | `useCameraController.ts:40-50, 239-246` | VERIFIED |

**Ambient warm-up (`ambientWarmupV1`, c621f9c — commit IS an ancestor of 6a81fdf, VERIFIED in prod):**
- Flag default **ON**: `src/core/featureFlags.ts:89`. Kill switch `?flags=!ambientWarmupV1`.
- Gating: first-time devices only (`dita_warmup_done` localStorage, `App.tsx:80-86, 222-234`); auto-dismissed permanently once any real activity completes.
- Analytics contract intact: popping 3rd balloon fires `mode_completed` (game_mode `tutorial`, `meta.activation:true`) + `tutorial_completed` (`AmbientWarmup.tsx:60-80`); `mode_completed` increments the activation counter via `analytics.ts:1488` → triggers `SaveProgressNudge` and closes the balloons. Container is pointer-events-none per `App.tsx:585-589` comment; pinch/dwell/tap all pop (`ambientWarmupLogic.ts:148-203`). VERIFIED.

---

## 3. Tracking pipeline

- **Model source:** hard-coded CDN — WASM from `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm`, model from `https://storage.googleapis.com/mediapipe-models/.../hand_landmarker.task` (`src/core/handTracker.ts:31-33`). Both allowed by CSP (`vercel.json` script-src/connect-src). Version pinned to package-lock (good). **No locally-bundled fallback**: if either CDN is blocked (school content filters commonly block googleapis/CDNs!) the app terminally fails to the TrackerErrorScreen. INFERENCE: this is the single biggest school-deployment availability risk.
- **Failure fallback:** GPU→CPU delegate fallback + 15s timeouts + typed `HandTrackerError` surfaced to UI (`handTracker.ts:111-192`). VERIFIED. Retry re-runs full init (`TrackingLayer.tsx:176-182`).
- **activePlayerLock: DOES NOT EXIST at this commit.** `grep -ri activePlayer|playerLock|lockedHand|primaryHand src/` → zero hits. `src/core/tracking/` contains only DepthSensitivity, DynamicResolution, OcclusionRecovery, PinchLogic, PredictiveSmoothing. `docs/EXECUTION_PLAN_DATA_TO_GROWTH.md:35` itself says the lock file `src/core/tracking/ActivePlayerLock.ts` is *planned* ("fully built" claim refers to a branch that is not merged here; the file is absent from this tree). **The product contract statement "activePlayerLock Phase 1 shipped" is FALSE for the deployed commit.** Background-hand rejection currently relies only on MediaPipe `numHands:1` picking its most confident hand each frame (`handTracker.ts:72`, `trackingFeatures.ts:165 enableTwoHandMode:false` default) — a background hand can steal the cursor at any frame. VERIFIED absence.
- **Smoothing:** One-Euro filter (index + thumb) with per-mode profiles (`src/core/InteractionState.ts:79-80, 149-179`; `src/core/filters/OneEuroFilter.ts`), optional Kalman predictive smoothing behind `trackingPredictor` flag (default OFF, `featureFlags.ts:59`), jump rejection scaled by hand size (`InteractionState.ts:528`).
- **Per-frame React state:** correctly avoided — frame data lives in `lastFrameDataRef`, React state updated at most every 100ms (`TrackingLayer.tsx:137-143, 418-423`); render loop is rAF-driven and decoupled (444-540). Two residual per-frame-adjacent setState calls: `setCameraNotification` inside the vision handler (line 338 — value-guarded by React same-value bail-out, fires ~30Hz with mostly-identical values) and FreePaintMode's 100ms `setPenDown` interval (`FreePaintMode.tsx:305-314`). Minor. VERIFIED compliant with the "no per-frame state" rule.
- **Duplicate tracker instantiation:** `handTracker` is a module singleton (`handTracker.ts:235`); `TrackingLayer` skips init if ready (`TrackingLayer.tsx:194-199`). Residual race: `initialize()` sets `initialized` only after awaits, so two concurrent calls (React 19 StrictMode double-effect in dev; retry spam) could create two HandLandmarker instances, one leaked. INFERENCE — low prod impact (single mount), worth a guard.
- **Mirroring:** raw MediaPipe results are mirrored once at the vision boundary (`mirrorX = 1 - x`, `TrackingLayer.tsx:36-45, 303`) so all downstream logic sees natural orientation; consistent with "camera coordinates are unmirrored" gotcha. VERIFIED single mirror point.
- **Cleanup on unmount:** stream tracks stopped (`useCameraController.ts:239-246`), vision setTimeout loop cleared (`useVisionLoop.ts:168-175`), render rAF cancelled + interaction state reset (`TrackingLayer.tsx:533-539`), visibility listener removed (`useCameraController.ts:235`). **Not cleaned:** `handTracker` itself stays initialised (intentional — reused across navigations); offscreen dynamic-resolution canvas released with component GC. VERIFIED adequate.

---

## 4. Activity inventory (production-reachable modes)

Entry: `/play` → wave gate → menu (`src/features/menu/ModeSelectionMenu.tsx:60-69`, 8 tiles) → `App.tsx:600-660`. Menu input: click/tap (`AdventureCard` is a real `<button>`, line 97-100) AND 1.5s hand-dwell; **both** route through `attemptModeSelection` → `evaluateModeGate` (`ModeSelectionMenu.tsx:201-220`; `src/features/menu/modeGate.ts`). Premium = parent subscription/trial via `useParentAccess` → server RPC `parent_has_access` (`useParentAccess.ts:46`).

| Mode | Menu id | Tier | mode_completed | Class Mode | Notes |
|---|---|---|---|---|---|
| Free Paint / **Magic Canvas** | `free` | free | `magicCanvas/MagicCanvasMode.tsx:232` | ✅ (uses **legacy FreePaintMode** in class! `StudentClassClient.tsx:85,636`) | `freePaintMagicCanvasV1` default ON (`featureFlags.ts:80`). Magic Canvas has full pointer/mouse fallback (`MagicCanvasMode.tsx:261-267`) — the ONLY mode that does. Legacy FreePaint reachable when flag off, and always in Class Mode. |
| Bubble Pop | `calibration` | free | `bubbleCalibrationLogic.ts:511` | ✅ | Completion → back to menu (`App.tsx:365-368`). |
| Tracing (playful) | `pre-writing` | free | `TracingModePlayful.tsx:112`; legacy `preWritingLogic.ts:527` | ✅ always playful, per-session fallback to legacy on init failure only (`StudentClassClient.tsx:576-587, 637-641`) | **Three tracing engines in tree**: (1) `TracingModePlayful`+`playfulTracingEngine` = production truth (`tracingPlayfulUiV1` default ON, `featureFlags.ts:77`); (2) legacy `PreWritingMode`+`preWritingLogic` = reachable via flag-off/init-failure; (3) `tracing/TracingMode.tsx`+`tracingLogicV2.ts` = **orphaned, not imported by any route — dead code, not reachable.** VERIFIED. |
| Spelling Stars | `gesture-spelling` | premium | `gestureSpellingLogic.ts:564` | ✅ | |
| Sort & Place | `sort-and-place` | premium | `sortAndPlaceLogic.ts:1026` | ✅ | |
| Word Search | `word-search` | premium | `wordSearchLogic.ts:585,617` | ✅ | Only mode with settings (via AdultGate, `App.tsx:605`). |
| Balloon Math | `balloon-math` | premium | `balloonMathLogic.ts:511` | ✅ | |
| Rainbow Bridge | `rainbow-bridge` | premium | `rainbowBridgeLogic.ts:498` | ✅ | |
| Colour Builder | — **not in menu** | n/a | `colourBuilderLogic.ts:265` | ✅ (teacher can start it) | Home players can only reach it via `?screen=game&mode=colour-builder`. |
| Building | — **not in menu** | n/a | `buildingState.ts:124` | ❌ not in class `LOGIC_MAP` (`StudentClassClient.tsx:83-98`) | Reachable only by URL param (`App.tsx:97`). Effectively hidden/legacy. |
| Warm-up tutorial (balloons) | ambient over menu | free | `AmbientWarmup.tsx:68` | n/a | See §2. `WarmupTutorial.tsx:85` (old modal tutorial) still emits too but the `tutorial` appState is never entered from the current flow (`handleWake` goes straight to menu, `App.tsx:211-218`) — INFERENCE: WarmupTutorial is vestigial. |

**Gesture + fallback:** all in-game interaction is hand-tracking only except Magic Canvas (pointer). Menu, AdultGate, feedback modals, cookie banner are click/touch. **If the camera dies mid-game there is no mouse way to play any mode except Magic Canvas** — and no mouse way to pass the wave gate at all (`WaveToWake` requires detected wave; tracker error shows adult help screen instead — deliberate per comment `WaveToWake.tsx:215-219`). VERIFIED.

**Premium gate bypass (URL):** `App.tsx:89-106` `getInitialState` honours `?screen=game&mode=<any>` and mounts the mode directly, skipping `attemptModeSelection` — the ONLY places `evaluateModeGate` is called are the menu tiles (`ModeSelectionMenu.tsx:204, 334, 350`; no mode component checks entitlement — grep confirms `useParentAccess` used only in menu + Billing). So `/play?screen=game&mode=balloon-math` starts a premium mode with no subscription and also skips the parental-controls gate check in `handleModeSelect` (`App.tsx:275-278`). b285223 (paywall fix) IS an ancestor and closed the dwell-path bypass, but this URL path remains. **VERIFIED bypass at code level** (progress-saving still requires an account; revenue leak is soft).

**Overlay/obstruction risks during play:** feedback modals (`ExpectationCheck`, `HappinessCheck`, `AudiencePrompt`) are correctly menu-only (`App.tsx:687-704`). During active gameplay the render set is: AdultGate button (top-right), GameCompanion (pointer-events:none), MessageCard/Countdown overlays (transient), camera toast (bottom-centre) — plus the **CookieConsentBanner (main.tsx:799), which is NOT play-state aware** and sits bottom-centre at z-2000 over the play area until an adult chooses (overlapping the camera-notification toast position, `TrackingLayer.tsx:650-676`). VERIFIED risk.

**Exit paths:** in-game exit is exclusively via AdultGate 2s hold (top-right, `src/features/safety/AdultGate.tsx:54, 68-96`) → Parent Menu → Exit to Menu. Menu → landing via back (`handleExitIntent`, exit survey if not activated). Child cannot exit a game without performing the hold — see §6.

---

## 5. Classroom client (deployed version)

Architecture (Class Mode v2 "conductor"): **Supabase DB is the authoritative state owner**; teacher mutates via authenticated SECURITY DEFINER RPCs (`src/features/classmode/conductor/api.ts:51-101` — each RPC asserts `auth.uid() == sessions.teacher_id` per header comment); students read via capability-scoped anon RPCs (`class_get_session`/`class_get_self`/`class_get_activity`).

- **Event contract:** Realtime `postgres_changes` on `sessions` / `session_students` / `session_activities` is the *fast path* (`StudentClassClient.tsx:160-224`); a **5s reconciliation poll** is the reliable path and applies everything — session state, pause/resume (same activity id!), kicks, class end (`StudentClassClient.tsx:236-304`, explicitly fixing the 2026-07-09 P0). Same check on `visibilitychange` and realtime reconnect. Teacher console mirrors this: subscriptions + 5s poll (`TeacherClassConsole.tsx:395-470`). VERIFIED robust.
- **Reconnect/rehydration:** sessionStorage memo (`cd_reconnect_v1`, 15-min TTL) auto-rejoins with session/student/name/avatar (`StudentClassClient.tsx:74-157`); ended session → static Ended screen; kicked → static Kicked screen; **deliberately no redirect to marketing** (`StudentClassClient.tsx:306-317`). PR #11's rejoin-nav fixes are NOT here, but what IS here already covers sleep/wake rejoin; the un-merged fixes presumably address remaining nav edge cases (out of scope of this tree).
- **Pause/resume on student:** game stays **mounted** through pause (timer + camera survive); frame logic swapped to `pausedFrameLogic` no-op + fully opaque `cd-pause-overlay` interaction shield (`StudentClassClient.tsx:78-81, 581-587, 655-663`). Timer freezes while paused **and while the student's camera is not yet running** (`freeze={paused || diagnostics.cameraStatus !== 'running'}`, line 632). VERIFIED.
- **Score submission:** all four terminal paths (timer expiry, activity-ended prop, legacy realtime, unmount) with a synchronous ref once-guard + DB `UNIQUE(session_id, student_id, round)` backstop; round = activity ordinal (`ClassModeGameWrapper.tsx:52-171`). VERIFIED.
- **Round timer / name-pip overlap (historical defect):** **fixed at this commit** — name pip forced top-LEFT (`StudentClassClient.tsx:611-617`), timer fixed top-right (`ClassModeGameWrapper.tsx:178-196`), comments in both files reference the collision. VERIFIED.
- **Poll intervals:** student 5s reconcile + heartbeat (only while visible); teacher 5s reload + 1s clock tick (`TeacherClassConsole.tsx:361, 469`); score poll 2s (`ClassModeGameWrapper.tsx:75-80`). Subscriptions all return unsubscribers and are cleaned in effect teardown (`StudentClassClient.tsx:223`, `TeacherClassConsole.tsx` effects). VERIFIED.
- **Two-teacher-tabs risk:** nothing prevents the same teacher opening `/class` twice; both tabs find the same live session (`TeacherClassConsole.tsx:102-118`) and both can issue RPCs. Because the server is authoritative and RPCs are idempotent-ish state transitions, the damage is limited to conflicting commands (e.g. tab A pauses, tab B resumes) — last writer wins; no client-side session lock or leader election. INFERENCE: acceptable but unguarded; a stale tab's "Start Activity" would advance the ordinal for everyone.
- **Free-tier cap:** `FREE_TIER_CLASSROOM_CAP = 1` (`TeacherClassConsole.tsx:40`) — client-side constant; server enforcement not visible in this repo (UNVERIFIED server-side).
- **Student premium access:** class students play premium modes with no entitlement check — teacher-led by design. VERIFIED intentional.
- **Join UX:** code entry is a single hidden input driving 4 boxes (fixes typo-trap, `StudentClassClient.tsx:402-467`); network failure vs wrong code distinguished honestly (`StudentClassClient.tsx:328-334`). Name/code entry requires typing — reading/typing dependency is inherent to the join flow (teacher-assisted for 3-5s).

---

## 6. Child UX red flags

1. **Cookie consent banner over child play (VERIFIED, `src/main.tsx:799` + `CookieConsentBanner.tsx:25`)** — renders on every route including `/play` and `/join` until a choice is stored. Reading-dependent, adult decision, click-only (hand tracking cannot dismiss), z-2000 over the play area, and a child can tap "Accept" — enabling GA4/Clarity/Meta Pixel on a consent a child gave. Should be suppressed on child routes (defer to adult surfaces) or auto-denied in class mode.
2. **AdultGate is weak as a gate but strong as a trap (VERIFIED, `AdultGate.tsx:54`)** — 2000ms press-and-hold: many 5-7-year-olds can hold a button 2s (weak protection), while a 3-4-year-old who wants to leave a game cannot (exit trap: the only in-game exit). The menu it opens is labelled "for grown-ups" but contains nothing dangerous (Exit / Settings / Performance). Mixed: no safety issue, but both directions of the intent are only half-met.
3. **Camera recovery / tracker error screens are adult-reading surfaces in the child's path (VERIFIED, `CameraRecovery.tsx`, `WaveToWake.tsx:799+`)** — appropriate content, but a child alone dead-ends. Both include a **`mailto:help@drawintheair.com` link** (`CameraRecovery.tsx:207`) — an external-app escape reachable from child mode; contract says "no external links in child mode." Borderline (error surface, adult-intended) but technically a violation.
4. **Mid-session camera death → misleading message (VERIFIED gap, §2)** — child sees "👋 I need to see your hands" forever; no recovery UI.
5. **Reading dependency:** WaveToWake is exemplary (single animated hand, copy is redundant to the visual, `WaveToWake.tsx:227-230, 404-406`). Menu tiles are icon+colour driven with text labels (fine). Ambient warm-up needs zero reading. The weakest child-facing text surfaces are the class-join flow (unavoidable) and blocked/paused notices (short, but text-based; `PlayBlockedNotice`, pause overlay "Your teacher will continue in a moment" — acceptable).
6. **External links from child mode:** none in gameplay (VERIFIED: share CTA deliberately not rendered in-game, `App.tsx:661-663`; class-mode end screens deliberately don't redirect, `StudentClassClient.tsx:313-317`). Exceptions: the mailto above; "Back to home" on recovery → marketing landing (internal); cookie banner links to `/privacy` (internal, adult page) from child routes.
7. **Sound dependency:** narrator TTS default ON (`featureFlags.ts:74`) as scaffolding ("Find the purple") — Rainbow Bridge instructions have colour visuals as well; all completion feedback has visual celebration (`Celebration.tsx`, honours reduced-motion). No mode found where audio is the sole channel for a required instruction, but Rainbow Bridge audio-cue dependency on muted school devices is the closest risk. INFERENCE — needs a muted-device play-through (manual).
8. **Adult controls visible during play:** only the small lock button (top-right) and, in word-search, settings behind it. Parent-facing chips (ActiveLearnerChip, SaveProgressNudge, ChildProfileSelector) are menu-only (`App.tsx:564-597`). VERIFIED clean.

---

## 7. Teacher / parent surfaces

- **Route guards are client-side components; data is guarded server-side.** Parent: `RequireParentAuth` + `RequireSubscription` render-guards (`src/pages/parent/_shared.tsx:221-288`) — pre-hydration the shell shows `LoadingShell`; unauthenticated → login redirect; role isolation via `getAccountRoles()` RPC (migration 0013). Teacher: same pattern in `TeacherClassConsole.tsx:79-99` (`roleStatus` checking → not-teacher screen). Data itself is behind RLS/SECURITY DEFINER RPCs, so the client-side guard is UX not security. VERIFIED.
- **Premium locks / paywall:** b285223 **is an ancestor** of the deployed commit (git verified). The unified `modeGate` closes the historical dwell-path bypass (`modeGate.ts:1-33`). Remaining hole: the `?screen=game&mode=` URL bypass (§4). Parent dashboard/billing behind `RequireSubscription` with server-side `parent_has_access` RPC; `useParentAccess` caches in sessionStorage per tab (`useParentAccess.ts:13-27`) — a stale `true` after subscription lapse persists for the tab session (cosmetic: server still refuses data). 
- **Admin allow-list:** the old client-side email allow-list was **removed** (2026-05-21 security audit); `/admin/insights` is OAuth-gated and every dashboard RPC asserts `public._is_admin()` **server-side** (`src/pages/admin/InsightsDashboard.tsx:12, 45-51, 83-87`; `main.tsx:15-19`). VERIFIED server-side.
- **Parent dashboard data accuracy risks:** trial countdown computed client-side from server `trial_end` (fine, `Dashboard.tsx:60-75`); progress narration via `progressNarrator` over `getChildDashboard` RPC; attribution depends on the child-profile selection being current (`child_profile_id` mirrored from sessionStorage into events, `analytics.ts:343-348`) — if a sibling plays without switching learner, progress mis-attributes. INFERENCE, by-design limitation; the always-visible ActiveLearnerChip mitigates.

---

## 8. Accessibility smoke (adult surfaces)

- **Positive:** menu tiles, AdultGate, recovery/consent controls are real `<button>` elements; AdultGate has `aria-label` (`AdultGate.tsx:176`); CameraRecovery is `role="dialog" aria-modal` with labelled title (`CameraRecovery.tsx:58-61`); cookie banner `role="dialog"` (`CookieConsentBanner.tsx:22`); code input has `aria-label` (`StudentClassClient.tsx:440`); `prefers-reduced-motion` honoured across landing CSS, Celebration, GestureDemo, playful tracing (`tracingPlayfulFrame.ts:48`).
- **Gaps:** teacher console has click-only `<div>`s (error dismiss `TeacherClassConsole.tsx:669`, modal backdrop 933) and low aria density (5 aria attributes in a 1087-line console); no focus trap / Escape handling found in AdultGate parent menu or teacher modals (INFERENCE from absence of focus management code); parent pages rely on framer-motion animation without a motion-reduction wrapper (parent.css has some coverage; not exhaustive). Keyboard-only teacher can operate primary flows (buttons) but modal focus order is unmanaged. Colour contrast: brand tokens (deep plum #6C3FA4 on white, charcoal on cream) look compliant; timer amber #fbbf24 on rgba-black and muted `#94a3b8` body text on white are the likely AA failures (UNVERIFIED — needs contrast tooling).
- **Camera-unavailable alternative for gameplay:** effectively none (§4) — wave gate requires tracking; only Magic Canvas has pointer input. For an accessibility story ("child who cannot produce recognisable hand movement"), there is no alternative input path. VERIFIED.

---

## 9. Marketing claims vs code reality

| Claim | Source | Verdict vs code |
|---|---|---|
| "100% frames stay on-device" | `Landing.tsx:276` (proof-stat) | **Consistent** with §1 (subject to Clarity caveat C1, which concerns DOM not frames). |
| "$4.99/mo, $54.99/yr, Save $5, 7-day free trial, up to 2 learners" | `Pricing.tsx:91-92, 66, 83, 129`; `ParentsLanding.tsx:75` | **Consistent internally** across Landing/Pricing/Signup/Billing (`grep` shows uniform "7-day", "2 learners"). Stripe price truth is server-side (`stripe_price_map`) — UNVERIFIABLE from this repo, but comment at `Pricing.tsx:5` pins them. |
| "Do I need a card for the free trial? … trial starts at account creation" | `Pricing.tsx:130` | Consistent with Signup flow firing `StartTrial` at registration (`Signup.tsx:90-92`); card-free trial UNVERIFIABLE client-side (Stripe config), plausible. |
| "Free classroom pilot, one class, up to 30 learners, no card" | `Pricing.tsx:100, 135` | Partly consistent: teacher signup is free and card-less in code; the **"up to 30 learners" cap is not enforced anywhere client-side** (no cap constant except `FREE_TIER_CLASSROOM_CAP=1` *classroom* cap) — UNVERIFIED server-side. |
| "Is there a paid teacher plan? Not yet." | `Pricing.tsx:136` | Consistent — no teacher billing code exists. |
| "EYFS aligned / EYFS-mapped activities" | `Landing.tsx:275, 327, 369, 598-618` | UNVERIFIABLE from code (curriculum mapping is content in `/for-teachers#eyfs-mapping`); no contradiction found. |
| "Ages 3 to 7" (FAQ) vs OG image alt "ages 3–11" | `Landing.tsx:266, 292` vs `index.html:30` | **Inconsistent** — `og:image:alt` says "ages 3–11", every other surface says 3–7. Minor but public. |
| "COPPA" | `Privacy.tsx:32-33`: "aim to follow UK GDPR, COPPA and similar frameworks" | Carefully hedged ("aim to follow"), **not** an unqualified "COPPA compliant" claim. Consistent-ish; note child-tappable consent banner (§6.1) and Class-Mode child first names in Supabase are the weakest links for that aim. |
| "No installs and no accounts for children" | `Landing.tsx:605` | Consistent — child join is code+name only (`StudentClassClient.tsx`), no child auth exists. |
| Pilot/usage numbers | `Landing.tsx:272` comment: "Honest, verifiable product facts — NOT usage counts. We are a pilot-stage…" | No fabricated usage stats found on the deployed landing. Consistent. |
| "Core activities are always free" | `Landing.tsx:269` | Consistent — 3 of 8 menu modes free (Free Paint, Bubble Pop, Tracing). |

---

## MANUAL DEVICE TESTS REQUIRED

1. **Clarity session review (highest priority):** with consent granted on production, play `/play` and `/join` and inspect the Clarity recording — confirm camera self-view `<video>` and game canvas render as placeholders, and configure Strict masking / route exclusion in the Clarity dashboard. Code cannot guarantee this.
2. **Camera unplug / OS-revoke mid-session** (laptop + tablet, Chrome/Safari/Edge): confirm the dead-end described in §2 and what each browser reports.
3. **Permission-prompt dismissal variants** per browser (x vs block vs remember-block) → which errorCode/recovery copy actually shows.
4. **School network with CDN filtering:** verify cdn.jsdelivr.net + storage.googleapis.com reachability on real school MATs/filters; app is hard-down for tracking without them.
5. **Background-hand interference:** two people in frame (teacher walking behind child) — confirm cursor steal with numHands=1 and no lock (the shipped code has no activePlayerLock).
6. **Muted classroom devices:** play Rainbow Bridge with sound off — is the colour instruction discoverable visually?
7. **Class Mode pause/resume + tablet sleep/wake:** verify 5s reconcile catches a missed pause, and the 15-min rejoin memo behaves through a lock-screen cycle.
8. **Two teacher tabs open on /class** issuing conflicting pause/resume/start.
9. **Wave gate with limited-mobility child / hand in unusual orientation** — threshold `WaveToWake.tsx:169` (0.025 movement) tuning.
10. **URL paywall bypass** (`/play?screen=game&mode=balloon-math`) on production build to confirm §4 finding end-to-end.
11. **Cookie banner over gameplay** on a fresh school device: confirm the overlap with the camera toast and that a child tap enables trackers.
12. **iOS Safari / iPad decoder-pinning:** confirm the 1×1 video trick still keeps MediaPipe fed on current iPadOS.

---

## Top findings (severity-ranked)

1. **activePlayerLock absent from deployed code** despite "Phase 1 shipped" contract — background hands can hijack the cursor in classrooms. (High, gameplay integrity) — §3.
2. **No handling of camera disconnect mid-session** — child dead-ends on a misleading "show me your hands" toast. (High, child UX) — §2.
3. **Cookie consent banner renders over child gameplay and is child-tappable**, enabling GA4/Clarity/Meta Pixel; plus no Clarity masking config anywhere in code while Clarity records child play-session DOM. (High, privacy/compliance posture — not a pixel leak) — §1 C1/C2, §6.1.
4. **Premium/parental gate bypass via `?screen=game&mode=…`** — mounts any mode incl. premium, skipping both the paywall and parental-controls gate (b285223 fixed the dwell path only). (Medium, revenue/controls) — §4.
5. **Hard CDN dependency for MediaPipe WASM+model with no bundled fallback** — school content filters can brick the whole product; also single point of failure for jsdelivr/googleapis outages. (Medium-High, availability) — §3.

Secondary: two-teacher-tab conflicts unguarded (§5); mailto link in child-reachable recovery screen (§6.3); `og:image:alt` "ages 3–11" inconsistency (§9); no mouse fallback anywhere but Magic Canvas (§4/§8); orphaned tracing engine v2 + vestigial WarmupTutorial dead code (§4).
