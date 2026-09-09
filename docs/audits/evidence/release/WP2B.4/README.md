# WP2B.4 - Camera disconnect recovery (DIA-022)

Status: CODE COMPLETE, local gate green. Evidence date 2026-09-07. Branch `wp/2b4`.

## 1. Problem (from the audit)

A USB webcam knocked out mid-game produced no `track.onended` or `devicechange`
handling. `CameraState.status` stayed `running`, the vision loop kept polling a
dead video element, and the child saw a perpetual "I need to see your hands"
toast. The only way out was a teacher reloading the page.

## 2. What changed

| File | Change |
|---|---|
| `src/camera/cameraLoss.ts` (new) | Pure state machine: events in, state + effects out. Statuses `inactive`, `waiting`, `active`, `lost`, `reacquiring`. Also `pickDeviceId()` (previous device, else newly appeared device, else first available, else null) and `isCameraLostVisible()`. |
| `src/camera/useCameraController.ts` | Attaches an `ended` listener to the live video track; listens to `navigator.mediaDevices.devicechange` and re-enumerates video inputs; drives the state machine; runs its `reacquire` effect (release old stream, fresh `enumerateDevices`, `getUserMedia` with `deviceId: { exact }` on the preferred device, then the same profiles without a deviceId as fallback). Exposes `loss` and `reacquireCamera()`. `StartCameraOptions` gains an optional `deviceId`. |
| `src/camera/types.ts` | New `CameraErrorCode` value `CAMERA_LOST`. |
| `src/lib/cameraHelp.ts` | New `CameraCause` value `CAMERA_LOST` with one-line child copy and no steps. |
| `src/features/onboarding/CameraRecovery.tsx` | New `layout="panel"` variant: a centred card over a light dim, `role="alert"`, icon-led, one line of copy, one big Try again button. No steps, no home button, no email link, no `aria-modal`. Play area stays visible behind it. Accepts an external `retrying` flag. The full-screen dialog is unchanged for the existing causes. |
| `src/features/tracking/TrackingLayer.tsx` | Renders the panel while `isCameraLostVisible(loss)`; suppresses the standard recovery dialog and the explainer while it is up; clears the stale toast, last frame data and the interaction state when the camera is lost. |
| `src/lib/analytics.ts` | New event `camera_lost` (meta.cause `track-ended` or `device-removed`). `camera_recovery_retry` for the lost cause carries `meta.auto` and `meta.has_preferred`. |
| `tests/cameraLoss.test.ts` (new) | 26 unit tests for the state machine. |

### Behaviour

1. Camera unplugged while a child is playing. The track fires `ended` (or
   `devicechange` shows the device gone, or the track is found `readyState ===
   'ended'` on the next `devicechange`). The controller stops the old tracks,
   detaches the listener, sets `status: 'error', errorCode: 'CAMERA_LOST'` and
   moves the machine to `lost`.
2. `visionEnabled` goes false, so `useVisionLoop` clears its timer and no
   further `detectForVideo` calls happen. The 60 fps render loop keeps running
   on purpose (it draws the game canvas); it reads `EMPTY_FRAME` so no stale
   pen-down keeps drawing.
3. The child sees the panel: crossed-out camera icon, "Oops! The camera went
   away.", "Check it is plugged in, then tap Try again.", one big Try again.
4. Retry (tap): re-enumerate, prefer the old `deviceId`, else first available,
   else let the browser choose. The panel stays up showing "Trying..." until
   the new stream is running (no flash of an empty game). On success the
   machine returns to `active`, `status` becomes `running`, the vision loop
   restarts against the same `<video>` element with the new `srcObject`, and
   the HandLandmarker keeps its instance (timestamps are `Date.now()`, so they
   remain monotonic across the swap). No reload.
5. Retry (auto): if a camera appears on `devicechange` while lost (same camera
   plugged back in, or a different one), the machine reacquires it without a
   tap. A `devicechange` that only removes devices does not retry.
6. Failure during reacquire: `NO_DEVICE`, `DEVICE_BUSY`, `UNKNOWN` keep the
   child on the panel (status back to `lost`); `PERMISSION_DENIED` and
   `NOT_SUPPORTED` hand over to the existing adult-facing recovery dialog.
7. No camera at first start (`NO_DEVICE`): the machine waits and auto-starts
   when the first camera is plugged in. The child-facing panel is not shown in
   this state; the existing no-device dialog is.

### Stale loop audit

- `useVisionLoop`: `setTimeout` chain, guarded by `enabledRef`; cleared in the
  effect cleanup when `enabled` flips false. Verified it flips false on
  `CAMERA_LOST` (status is not `running`).
- `TrackingLayer` render loop: one `requestAnimationFrame` chain keyed on
  `onFrame`, cancelled on effect cleanup. Independent of the camera by design.
- `handTracker`: not closed on loss; `detect()` is simply not called. Avoids a
  multi-second re-download and re-init of the model on every unplug.
- Track `ended` listener: detached in `releaseStream()` before any new
  `getUserMedia`, and checks `streamRef.current === stream` so a late event
  from an old stream is ignored. `devicechange` listener registered once per
  controller mount and removed on unmount.

## 3. Verification

Run on 2026-09-07 in the worktree, `./scripts/check-task.sh`:

| Check | Result |
|---|---|
| `npm ci` | ok |
| `npm run type-check` | ok (0 errors) |
| `npm run lint` | 0 errors, 162 warnings (ratchet is 162; unchanged from baseline, confirmed by stashing the change and re-running) |
| `npm test` | 27 files, 282 tests passed (26 new in `tests/cameraLoss.test.ts`) |
| secret / CSP / env guards | ok |
| `npm run build` + SSR prerender | ok (26 head-only, 93 full-body routes) |

Not verified here: real hardware. There is no webcam in this environment.

## 4. Gate 4 item 7 procedure (founder, on a Chromebook-class device with a USB webcam)

Pre-check: open `/play` with `?debug=camera` so the camera badge shows the
controller state.

1. Grant camera, wave to wake, start any activity and draw a stroke.
2. Unplug the USB webcam while the child would be mid-stroke.
   - Expect within about 1 s: the "Oops! The camera went away." panel over the
     play area, play area still visible behind the dim, the "I need to see your
     hands" toast gone, no cursor or stroke movement, no console errors from
     MediaPipe (`[HandTracker] detection error` must not repeat).
   - Badge: status `error`, code `CAMERA_LOST`.
3. Leave it unplugged and tap Try again.
   - Expect: button shows "Trying..." then returns to "Try again"; panel stays.
4. Plug the same webcam back in. Do not tap anything.
   - Expect within about 2 s: panel disappears on its own, tracking resumes,
     the drawing made in step 1 is still on the canvas (no reload happened;
     the URL and any in-progress activity state are unchanged).
5. Repeat step 2, then plug in a different webcam (or, on a laptop, rely on
   the built-in camera by unplugging the external one and tapping Try again).
   - Expect: recovery onto the other camera.
6. Analytics (PostHog / first-party): `camera_lost` with `meta.cause`,
   `camera_recovery_shown` with `cause: CAMERA_LOST`,
   `camera_recovery_retry` with `meta.auto` true for step 4 and false for
   step 3, then `camera_requested` and `camera_granted`.
7. Negative check: with the camera plugged in, open Chrome's site settings and
   block the camera while playing. Expect the existing full-screen
   permission dialog (not the child panel), because the loss cannot be fixed
   by a retry.

Browser notes for the tester: Chrome and Edge fire `ended` on unplug. Firefox
sometimes only fires `devicechange`; both paths are handled. Safari on macOS
fires `ended`. If a browser fires neither, the next `devicechange` checks
`track.readyState`.

## 5. Rollback

Code only, no data or schema involved. Revert the WP2B.4 PR on `master`
(`git revert` of the squash commit), CI green, auto-deploy. There is no
feature flag: the change is additive and the pre-change behaviour (no
handling) is what the revert restores.

If a partial rollback is wanted without a full revert: in
`TrackingLayer.tsx` set `const cameraLostVisible = false;` and the old
behaviour returns while the listeners stay inert.

## 6. Founder-only steps

None for this package. No Vercel or Supabase dashboard change. The hardware
procedure in section 4 is the Gate 4 item 7 evidence and must be run by hand
on a device with a USB webcam before the gate is marked passed.
