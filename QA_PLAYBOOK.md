# QA Playbook

## Parent Setup Script

Use this script for initial app setup and error recovery.

### Steps

1. **Open site**
   - Navigate to https://drawintheair.app/play
   - Verify page loads, loading spinner disappears

2. **Allow camera**
   - Camera permission prompt appears
   - Click "Allow" (or "Continue" on some browsers)
   - Wait 2-3 seconds for model download (~5MB)
   - Video feed should appear in canvas

3. **Select mode**
   - Tap/click a mode button (Free Paint, Tracing, Bubble Pop, Sort/Place)
   - Wait 1 second for mode initialization
   - See appropriate UI for selected mode

4. **Recover from errors**
   - If permission denied: click [Retry] or [Settings]
   - If no camera: check device settings (camera enabled?)
   - If model fails to load: refresh page, check internet connection
   - If hand not detected: ensure good lighting, hand visible in camera

5. **Close/switch modes**
   - Tap back button or mode switcher
   - Return to mode selection screen
   - No memory leaks, smooth transition

## Kid Session Scripts

Each script is ~2 minutes per mode. Kids should be able to complete without adult guidance (after setup).

### Script 1: Free Paint (2 min)

**Objective**: Draw simple shapes with hand pinch.

1. Parent loads app, selects Free Paint
2. Kid positions hand in front of camera
3. Kid pinches thumb + index finger to draw
4. Kid draws scribble, line, circle
5. Observe: hand cursor tracks, draw is smooth, no lag
6. Pinch release → drawing stops
7. New pinch → new stroke begins (no connection)

**Success criteria**:
- Hand detected immediately (cursor visible)
- Pinch starts/stops drawing consistently
- Strokes smooth, no jitter
- No latency lag (hand move → cursor move <100ms visually)
- Multiple strokes work without errors

### Script 2: Tracing (2 min)

**Objective**: Trace path and reach success threshold.

1. Parent loads app, selects Tracing, chooses Pack 1 Level 1 (big "A")
2. Kid positions hand in front of camera
3. Kid pinches and traces the path (thick lines, easy)
4. Kid follows path from top to bottom
5. Observe: path lights up / changes color as kid traces
6. Kid reaches ~80-85% completion
7. Success screen appears, Pack 2 unlocked (or next level)

**Success criteria**:
- Path visible and clear
- Feedback on path (color change, brightness, "close enough" cue)
- Success threshold reached with reasonable effort (80-85%)
- Success screen shows correct pack/level
- Smooth progression to next level

### Script 3: Bubble Pop (2 min)

**Objective**: Pop bubbles by touching them with fingertip.

1. Parent loads app, selects Bubble Pop, starts Level 1
2. Kid positions hand in front of camera
3. Bubbles spawn at bottom, float upward
4. Kid touches bubble with fingertip (no pinch required)
5. Observe: bubble pops, score +1
6. More bubbles spawn, kid pops 5-10
7. Time runs out or all bubbles popped

**Success criteria**:
- Bubbles spawn regularly, float upward smoothly
- Touch detection responsive (pop within 100ms of contact)
- Score updates correctly
- Bubbles drift side-to-side (not boring straight line)
- 60-second timer visible and counting down

### Script 4: Sort/Place (2 min, when implemented)

**Objective**: Grab objects, drag to drop zones.

1. Parent loads app, selects Sort/Place, starts Round 1
2. Kid sees 3 objects and 2 drop zones
3. Kid pinches on object, object follows hand (grabbed)
4. Kid drags object over drop zone
5. Observe: zone highlights when object over it
6. Kid releases pinch (unpinch) → object snaps to zone
7. Score +1, next object appears
8. Repeat 2 more times (3 objects)

**Success criteria**:
- Objects grab smoothly when pinched
- Drop zones highlight when compatible object dragged over
- Snap animation smooth (<300ms)
- Score updates correctly
- Completion message shown after 3 drops

---

## Device/Browser Matrix

### Test Across All Combinations

| Device | Browser | Tested | Notes |
|--------|---------|--------|-------|
| **Desktop** | Chrome | ☐ | Baseline performance |
| **Desktop** | Firefox | ☐ | WebGL fallback test |
| **Desktop** | Safari | ☐ | H.264 video codec check |
| **iPad Pro (M1)** | Safari | ☐ | High performance |
| **iPad 7th gen** | Safari | ☐ | Mid-range, observe glow disable |
| **iPad Air** | Safari | ☐ | Performance check |
| **iPhone 12** | Safari | ☐ | Small screen, portrait mode |
| **Android (flagship)** | Chrome | ☐ | High performance |
| **Android (mid-range)** | Chrome | ☐ | Performance degradation test |
| **Android (low-end)** | Chrome | ☐ | Minimum viable performance |
| **Samsung Galaxy Tab** | Samsung Internet | ☐ | Alternative Android browser |

### Required Coverage

- At least 1 desktop, 2 tablets, 2 phones
- At least 1 each: Chrome, Safari, Samsung Internet
- At least 1 low-end device (to verify fallback)

---

## Defect Template

Use this template for reporting bugs.

### Title
`[Mode] Brief description of issue`

Example: `[Free Paint] Hand cursor jitters, makes drawing unstable`

### Steps to Reproduce
```
1. Open https://drawintheair.app/play
2. Allow camera access
3. Select Free Paint mode
4. Pinch and draw a line
```

### Expected Behavior
```
Hand cursor should track hand position smoothly.
Line should be smooth and follow cursor without lag.
```

### Actual Behavior
```
Hand cursor moves erratically, jumping 10-20px per frame.
Line appears jittery and disconnected from intended path.
```

### Device & Environment
```
Device: iPad 7th gen
Browser: Safari 15.2
OS: iOS 15.5
Screen: 1024×768
DPR: 2
```

### Severity
```
High / Medium / Low

High: Blocks feature (can't use mode, crashes)
Medium: Feature works but with degraded UX
Low: Minor visual issue, doesn't affect gameplay
```

### Suspected Code Area
```
- TrackingLayer.tsx: OneEuroFilter params?
- InteractionState.ts: pinch threshold?
- drawingEngine.render(): lag in render loop?
```

### Additional Context / Screenshots
```
Tested on desktop Chrome same app: smooth, no issue.
May be device-specific (iPad touch latency?).
```

---

## Pre-Release QA Checklist

### Functionality

- [ ] **All modes functional**
  - [ ] Free Paint: draw, erase, clear
  - [ ] Tracing: path detection, success trigger, progress display
  - [ ] Bubble Pop: spawn, pop, score, timer
  - [ ] Sort/Place: grab, drag, drop, snap

- [ ] **Camera & Tracking**
  - [ ] Permission prompt appears
  - [ ] Permission denial shows [Retry] and [Settings]
  - [ ] Hand detected within 2 seconds
  - [ ] Cursor follows hand with <100ms lag
  - [ ] Pinch detection responsive

- [ ] **Mode Switching**
  - [ ] Can switch between modes
  - [ ] Previous mode state cleared
  - [ ] No memory leaks (monitor RAM growth)

### Performance

- [ ] **Latency** (use `?perfKill=1` for baseline)
  - [ ] Desktop: <20ms (with glow)
  - [ ] iPad: <30ms
  - [ ] Android: <40ms
  - [ ] Low-end: <50ms (acceptable, still playable)

- [ ] **Frame Rate**
  - [ ] Desktop: 55-60 FPS steady
  - [ ] iPad: 28-30 FPS steady
  - [ ] Android: 25-30 FPS steady

- [ ] **Memory**
  - [ ] App starts at ~50MB
  - [ ] After 5 minutes: <80MB (no leak)
  - [ ] After mode switch: no spike

### Responsiveness & UX

- [ ] **Touch / Gesture**
  - [ ] Buttons click/tap immediately
  - [ ] No UI lag on button press

- [ ] **Loading**
  - [ ] Model downloads within 10 seconds
  - [ ] Progress indicator visible
  - [ ] App ready for play within 15 seconds

- [ ] **Error Recovery**
  - [ ] Permission denied → [Retry] works
  - [ ] No camera → helpful error message
  - [ ] Camera in use → clear message
  - [ ] Low bandwidth → timeout message, retry option

### Device Coverage

- [ ] **Tested on 5+ devices**
  - [ ] Desktop (Chrome)
  - [ ] iPad (Safari)
  - [ ] Android phone (Chrome)
  - [ ] Low-end device (verify fallback)

- [ ] **Orientations**
  - [ ] Portrait (phone)
  - [ ] Landscape (tablet)
  - [ ] Split-screen (if device supports)

### Accessibility & Compliance

- [ ] **Safe area**
  - [ ] iPhone notch: buttons not covered
  - [ ] Android gesture bar: canvas doesn't hide underneath

- [ ] **Text legibility**
  - [ ] All text readable on low-light
  - [ ] Button text clear and visible

### Browser Compatibility

- [ ] **Chrome** (desktop, Android)
- [ ] **Safari** (desktop, iOS)
- [ ] **Firefox** (desktop)
- [ ] **Samsung Internet** (Android)

---

## Known Issues Tracker

Document known issues and their status:

| Issue | Severity | Mode | Status | Notes |
|-------|----------|------|--------|-------|
| Hand jitter on Android low-end | High | All | In progress | OneEuroFilter tuning |
| Glow flicker on iPad 7th gen | Medium | Free Paint | Fixed | Disabled glow on tier 2 |
| Pinch threshold inconsistent | High | All | Backlog | Needs temporal confirmation |
| Bubble pop hit zone too tight on iPad | Medium | Bubble Pop | Fixed | DPI scaling added |
| Sort/Place unimplemented | High | Sort/Place | Backlog | Design complete, coding needed |

---

## Sign-Off Criteria

Before release:

- [ ] All Critical bugs fixed
- [ ] All functional modes tested on 3+ devices
- [ ] Performance meets targets (latency <40ms)
- [ ] No memory leaks detected
- [ ] Error messages helpful and clear
- [ ] Accessibility verified (safe area, text legibility)
- [ ] Parent/kid test scripts completed successfully
- [ ] Product manager approval

