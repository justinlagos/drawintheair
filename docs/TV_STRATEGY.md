# Draw in the Air — TV Strategy

**Status:** Draft v1 · Working doc, expect changes.
**Last updated:** May 2026.

## TL;DR

Don't think of "TV" as a port target. Think of it as four sub-problems
(display / camera / compute / input) and pick the right device for each.
The strongest architecture is a **companion model**: phone is the sensor,
TV is the display, connected via WebRTC datachannel. Most TVs lack
cameras and the browsers are too old to run MediaPipe; trying to do
everything on the TV itself is a dead end for the next 2 years.

Recommended phased rollout:

| Phase | Effort | Output |
|------:|:------:|--------|
| 0 | doc only | "Playing on TV" tutorial + screen-mirroring setup guide |
| 1 | 1-2 weeks | `?tv=1` Display Mode in existing webapp — UI scale + couch-distance tracking |
| 2 | 1-2 months | Companion Mode — phone-as-sensor, TV-as-display via WebRTC |
| 3 | 2-3 months each, parallelizable | Native apps: Fire TV → Apple TV → Google TV |
| 4 | later | Standalone Smart TV (Tizen 8+/webOS 22+) with USB camera |

## Why TVs are not just "another browser"

A TV is four problems pretending to be one:

| Sub-problem | What it asks |
|---|---|
| Display | How do the game pixels get onto the TV? |
| Camera | Where does the hand-tracking video come from? |
| Compute | Where does MediaPipe inference run? |
| Input | How does a user navigate menus *before* they're being tracked? |

Conflating these has killed every gesture-control TV product that's tried.
PlayStation Eye, Xbox Kinect, Google Cardboard TV editions — they all hit
the wall of "the TV doesn't have a good camera and the SoC can't keep up."

The way out is to **delegate** each sub-problem to the strongest device in
the room.

## Solution archetypes

### A. Smart-TV browser (Samsung Tizen, LG webOS, Vizio SmartCast)

| Display | Camera | Compute | Input |
|--------:|-------:|--------:|------:|
| ✓ | ✗ rare | ✗ weak | ✗ remote only |

**Verdict:** Don't bet here. Built-in TV cameras are extinct outside a few
Samsung/LG flagship models. Browsers are typically Chromium 89-era and
can't run MediaPipe Hand Landmarker at 30fps.

### B. Cast from phone/laptop (Chromecast / AirPlay mirroring)

| Display | Camera | Compute | Input |
|--------:|-------:|--------:|------:|
| ✓ via cast | ✓ phone/laptop | ✓ phone/laptop | ✓ phone/laptop |

**Pros:** Works today with zero code. Quick-win.

**Cons:** Cast adds 80-200ms latency. User looks at TV but the camera is
on the phone — awkward "where do I look" UX. Mirroring quality varies
wildly across TV brands.

### C. External media stick (Chromecast with Google TV, Fire TV, Apple TV)

| Display | Camera | Compute | Input |
|--------:|-------:|--------:|------:|
| ✓ via HDMI | ✗ unless USB | ✓ decent SoC | ✓ remote + voice |

**Pros:** Reasonable Cortex-A78 class SoCs. Reliable browsers / native
runtimes. Established install base, especially Fire TV in schools.

**Cons:** USB camera support is finicky and not standardized. Native app
build per platform.

### D. Companion model — phone is sensor, TV is display ⭐

| Display | Camera | Compute | Input |
|--------:|-------:|--------:|------:|
| ✓ TV (cast or app) | ✓ phone | ✓ phone | ✓ phone touch |

The phone runs MediaPipe and streams just the 21 hand-landmark (x,y,z)
tuples — a few hundred bytes per frame, not video — over a WebRTC
datachannel to a TV-side renderer. Sub-50ms latency on a local network.

**Pros:** Architectural sweet spot. Best camera + best compute + biggest
display. No USB-camera dependency. Reuses existing MediaPipe pipeline.
Pairing UX is a one-time QR scan.

**Cons:** Two-device flow ("I need my phone too?"). WebRTC plumbing.
Pairing handshake design needs care for kid-safe flow.

### E. Native TV app + USB camera

| Display | Camera | Compute | Input |
|--------:|-------:|--------:|------:|
| ✓ native | ✓ USB | ✓ native | ✓ remote |

**Pros:** Self-contained family experience. Best for school deployments
where a TV is the room's only device.

**Cons:** Heavy build. USB-camera ecosystem on Smart TVs is the wild
west. Very niche audience.

## Phased roadmap

### Phase 0 — Today (zero code)

Document existing options. Add a "Playing on TV?" card to the Try-Free
modal and the help section. Setup guide for the three patterns that
already work today:

- Laptop or Chromebook on a stand in front of the TV (zero setup, best
  hand-tracking).
- Phone running the webapp, screen-mirrored to TV via Chromecast / AirPlay
  (most homes can do this today).
- Class-mode interactive whiteboard (already supported).

**Deliverable:** A `/setup-tv` page with three illustrated configurations
and troubleshooting.

### Phase 1 — TV Display Mode (1-2 weeks)

A discoverable mode in the existing webapp triggered by `?tv=1` or by
large-viewport heuristic (≥1920px width *and* ≥1080px height *and*
non-touch input). Changes:

- 1.6-1.8x global UI scale (use a `--tv-scale` CSS var).
- Bigger gesture target hit areas (target size token bumps from 64→112px).
- HUD simplification: hide secondary chips, enlarge primary affordances.
- Increased saturation + contrast (tested at couch distance).
- MediaPipe `min_hand_detection_confidence` and `min_hand_presence_confidence`
  dropped from 0.5→0.3 to handle hands ~2-3m from camera.
- One Euro filter `min_cutoff` raised slightly to compensate for noisier
  far-distance landmarks.
- Auto-fullscreen on first wave detection.
- Add "Cast to TV" how-to card on Landing.

**Deliverable:** TV mode flag + tested experience. No new architecture.

### Phase 2 — Companion Mode ⭐ (1-2 months)

The architectural unlock. Two pages:

- **`/companion`** — phone-side. Loads MediaPipe, asks for camera, shows
  a QR code. Once paired, streams hand-landmark frames over WebRTC.
- **`/tv`** — TV-side renderer. Shows the QR-pairing screen, then once
  paired, renders the game using the streamed landmarks instead of its
  own camera.

Pairing handshake: TV page generates a 6-character pairing code, the
phone scans the QR / types the code, both connect via a relay (we run
a tiny signaling server) and then promote to a direct WebRTC peer
connection. After that, no server is in the path.

Why this is the right architecture:

- **Best camera:** modern phone cameras (≥720p, good auto-exposure) beat
  every laptop and TV camera on the market.
- **Best compute:** modern phone SoCs run MediaPipe at 60fps comfortably.
- **Lowest latency:** 21 landmark tuples is ~5 KB/sec. On LAN, end-to-end
  is under 50ms.
- **Reuses existing pipeline:** the webapp's interaction state machine
  doesn't change; we're just swapping the camera-frame source for a
  landmark-frame source.

Open product questions:
- Charge for it? (Premium tier? Pilot-pack only?)
- Multiplayer in the same session? (Multiple phones → one TV?)
- Calibration step needed for distance? (Or auto-calibrate on first play?)

**Deliverable:** Companion experience as a public beta route.

### Phase 3 — Native TV apps (2-3 months each, parallelizable)

Native apps for the top three platforms, in this order:

1. **Fire TV** (easiest store review, biggest US household install base,
   strongest in education-bundle markets).
2. **Apple TV / tvOS** (premium positioning, family-friendly market).
3. **Google TV / Android TV** (most flexible, OEM partnership upside).

Each app is a thin native shell over the Phase-2 companion architecture:
the TV app is a pure renderer, the phone app or webapp is the sensor.
Native apps unlock app-store features that justify their existence:

- Family multiplayer with multiple paired phones.
- Parent dashboard (separate from the kid experience).
- Offline lesson packs (downloadable from store).
- Voice search integration ("Alexa, open Draw in the Air").
- Cast Connect / AirPlay 2 integration for low-latency pairing.

**Deliverable:** Three native TV apps, each shipping with a Phase-2-class
companion experience.

### Phase 4 — Standalone Smart TV (later, niche)

Samsung Tizen 8+ and LG webOS 22+ now support USB UVC webcams in
WebRTC contexts. Lower priority but valuable for B2B school deployments
where a TV is the only device in the room. Likely a Tizen Studio / webOS
SDK build of the existing webapp with the camera-permission flow swapped
in. Niche but lucrative.

## Three strategic questions to answer before code

### 1. Is "TV mode" about a bigger screen or a different game?

Hand tracking at laptop distance (~1m) is finger precision. At couch
distance (~3m) it's gross arm motion. If we want couch-distance play, we
should be using **pose tracking** (whole body), not hand tracking
(fingers). That's a different MediaPipe model and arguably a different
game design — closer to Just Dance / Ring Fit than air-drawing.

**This is the most consequential product decision in this roadmap.**

If the answer is "bigger screen, same game," Phases 1-3 above all hold.
If the answer is "different game," we should split into a sister product
("Draw in the Air: Family Edition") and pause TV native work until the
pose-tracking experience exists.

### 2. Family unit or "school in a bigger room"?

Two distinct audience profiles:

- **School / interactive whiteboard:** A teacher projects to a class
  while one student plays. This is Phase 1 territory — TV Display Mode
  is exactly what they need. Already works.
- **Family living room:** Multiple kids play together, parents watch.
  This needs multiplayer, which we don't have. It's a Phase 3+ feature
  and changes the architecture.

Picking one means Phases 1-2 ship sooner. Trying to serve both pulls
Phase 3 forward and risks shipping nothing.

### 3. Distribution — B2C app stores or B2B OEM bundling?

For our school-led GTM, getting preloaded on Hisense / TCL / school-edition
Smart TVs via an EdTech procurement deal is a bigger lever than a Fire TV
store listing. Worth pursuing in parallel because:

- It shapes Phase 3 priorities (we'd build for the OEMs we partner with).
- Procurement deals are 9-12 month cycles; if we want bundled-TV deals
  for the 2027/28 school year, conversations need to start now.
- Bundled distribution flattens the install-friction problem completely.

## Open technical questions

These don't block the roadmap but will need answers as we build:

- **MediaPipe model choice for couch distance.** Hand Landmarker works
  to ~2m reliably. Beyond that, accuracy collapses. Test data needed.
- **Lighting / backlight handling.** Living rooms have backlit subjects
  (TV behind kid). MediaPipe struggles. Auto-exposure compensation in
  the webcam pipeline could help; alternatively, detect backlit
  conditions and prompt a setup change.
- **Family multiplayer architecture.** If two kids play simultaneously,
  do we run two MediaPipe instances on two phones? Single phone tracking
  two pairs of hands? Both have trade-offs.
- **Pairing security.** Pairing code needs to be unguessable but kid-easy
  to type. 6-digit numeric is simple; better might be 4-pictures
  (kid taps on the four icons shown on the TV).

## Decisions log

(To be filled in as we make calls. Format: `2026-MM-DD: <decision> — <rationale>`)

