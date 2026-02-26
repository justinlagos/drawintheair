# Feature Acceptance Criteria
## Draw in the Air - Definition of Done

---

## Criteria Template

For each feature, we define:

| Section | Description |
|---------|-------------|
| **Entry Conditions** | What must be true before this feature activates |
| **Success Criteria** | What "working correctly" looks like |
| **Failure Handling** | How the system responds to problems |
| **Edge Cases** | Non-obvious scenarios that must work |
| **Instrumentation** | What data we collect for analytics/debugging |

---

## Core Features

### 1. Hand Tracking Core

#### Entry Conditions
- [ ] Camera permission granted
- [ ] MediaPipe model loaded successfully
- [ ] Video stream active and playing
- [ ] At least one hand visible in frame

#### Success Criteria
- [ ] Index finger position updates at **minimum 30fps** when hand visible
- [ ] Position accuracy within **5% of actual finger position**
- [ ] Latency from physical movement to position update **<50ms**
- [ ] Smooth position interpolation (no visible jitter)
- [ ] Works in varied lighting conditions (indoor daylight, artificial light)

#### Failure Handling
| Condition | Response |
|-----------|----------|
| Hand not detected | Cursor fades out, drawing disabled, UI indicates "Show your hand" |
| Low confidence (<0.5) | Hold last position for 3 frames, then fade cursor |
| Model load failure | Show friendly error, offer retry |
| Camera disconnected | Pause app, show reconnection prompt |

#### Edge Cases
- [ ] **Two hands in frame:** App chooses the most stable hand consistently (doesn't flicker between hands)
- [ ] **Hand at edge of frame:** Tracks until hand is >20% outside frame, then graceful dropout
- [ ] **Hand moving very fast:** Position updates without excessive lag or overshooting
- [ ] **Hand occluded briefly:** Recovers tracking within 0.5s of hand reappearing
- [ ] **Finger pointing at camera:** Still tracks even with foreshortening

#### Instrumentation
| Metric | Type | Purpose |
|--------|------|---------|
| `tracking.confidence` | Float 0-1 | Track quality over time |
| `tracking.fps` | Integer | Performance monitoring |
| `tracking.dropout_count` | Counter | Reliability metric |
| `tracking.dropout_duration_ms` | Histogram | Recovery time analysis |

---

### 2. Mode Selection (Hover-to-Select)

#### Entry Conditions
- [ ] App state is 'menu'
- [ ] Hand tracking active
- [ ] Mode cards rendered and positioned

#### Success Criteria
- [ ] Dwell selection triggers **only after continuous hover time** (1.5s default)
- [ ] Progress ring animates smoothly from 0% to 100%
- [ ] Visual feedback on hover (card scale, glow)
- [ ] Selection triggers mode transition
- [ ] Works for all three mode cards

#### Failure Handling
| Condition | Response |
|-----------|----------|
| Cursor leaves card | Progress ring resets smoothly to 0% |
| Hand lost during hover | Progress pauses, resumes when hand returns (within 0.5s) |
| Hand lost >0.5s | Progress resets to 0% |

#### Edge Cases
- [ ] **Shaky hover near card border:** Does not rapidly flicker selection state (hysteresis zone of 5%)
- [ ] **Moving between cards:** Progress resets on card exit, starts fresh on new card
- [ ] **Very fast swipe across cards:** No accidental selections
- [ ] **Hover on card gap:** No selection progress

#### Instrumentation
| Metric | Type | Purpose |
|--------|------|---------|
| `menu.hover_time_ms` | Histogram | UX tuning |
| `menu.selection_count` | Counter per mode | Popularity tracking |
| `menu.mis_selection_rate` | Percentage | UX quality metric |
| `menu.hover_to_selection_ratio` | Ratio | Engagement metric |

---

### 3. Free Paint Mode

#### Entry Conditions
- [ ] App state is 'game' with mode 'free'
- [ ] Canvas initialized
- [ ] Drawing engine ready
- [ ] Hand tracking active

#### Success Criteria
- [ ] Stroke begins **only in drawing state** (pen down)
- [ ] Stroke ends cleanly on pen up
- [ ] Color changes apply to new strokes immediately
- [ ] Brush size changes apply to new strokes immediately
- [ ] Clear canvas removes all strokes
- [ ] Strokes render with glow effects
- [ ] Variable width responds to velocity

#### Failure Handling
| Condition | Response |
|-----------|----------|
| Tracking drop during stroke | Creates pen up, stroke ends (no spike) |
| Rapid pen up/down | Debounce to prevent micro-strokes |
| Canvas context lost | Attempt recovery, preserve stroke data |

#### Edge Cases
- [ ] **Fast movement:** Does not create dotted gaps or extreme thickness shifts
- [ ] **Very slow movement:** Does not create excessive point density
- [ ] **Pause mid-stroke:** No blob at pause point (pen up model)
- [ ] **Drawing at screen edge:** Stroke continues to edge, doesn't clip oddly
- [ ] **Multiple quick strokes:** Each stroke is separate, no merging
- [ ] **Clear while drawing:** Ends current stroke before clearing

#### Instrumentation
| Metric | Type | Purpose |
|--------|------|---------|
| `paint.stroke_count` | Counter | Engagement |
| `paint.average_stroke_length` | Float | Usage patterns |
| `paint.color_changes` | Counter | Feature usage |
| `paint.clear_count` | Counter | Session behaviour |
| `paint.jump_breaks` | Counter | Quality metric |
| `paint.session_duration_ms` | Timer | Engagement |

---

### 4. Pre-Writing Tracing Mode

#### Entry Conditions
- [ ] App state is 'game' with mode 'pre-writing'
- [ ] Current path loaded and rendered
- [ ] Start and end markers visible
- [ ] Progress at 0%

#### Success Criteria
- [ ] Guide path is **not mirrored** (matches expected direction)
- [ ] Start marker is at visual start position
- [ ] End marker is at visual end position
- [ ] Progress updates when finger is on path and moving forward
- [ ] Progress does **not** update when:
  - Finger is off path
  - Finger is moving backward
  - Finger is stationary
- [ ] Visual feedback shows on-path vs off-path state
- [ ] Completion triggers celebration at 95%+ progress
- [ ] Next shape button appears on completion

#### Failure Handling
| Condition | Response |
|-----------|----------|
| Off path | Show visual warning (red indicator), arrow pointing to path |
| Hand lost mid-trace | Pause progress, allow resume from current position |
| Progress stuck | After 10s of no progress, offer hint |

#### Edge Cases
- [ ] **Child pauses mid-trace:** No ugly connecting lines when resuming
- [ ] **Child goes backward:** Progress does not decrease (clamped)
- [ ] **Child skips ahead:** Progress increments max 15% per frame (prevent teleporting to end)
- [ ] **Child completes then continues:** No progress beyond 100%
- [ ] **Multiple paths:** State resets correctly between paths

#### Instrumentation
| Metric | Type | Purpose |
|--------|------|---------|
| `tracing.on_path_percentage` | Float 0-100 | Accuracy metric |
| `tracing.completion_time_ms` | Timer | Performance metric |
| `tracing.off_path_count` | Counter | Difficulty indicator |
| `tracing.resets_per_path` | Counter | Frustration indicator |
| `tracing.paths_completed` | Counter | Progression |

---

### 5. Bubble Calibration Game

#### Entry Conditions
- [ ] App state is 'game' with mode 'calibration'
- [ ] Initial bubbles spawned
- [ ] Score at 0
- [ ] Hand tracking active

#### Success Criteria
- [ ] Bubbles spawn at regular intervals (800ms)
- [ ] Maximum 6 bubbles on screen
- [ ] Pop detection when finger overlaps bubble (1.2x radius)
- [ ] Pop animation plays on contact
- [ ] Score increments on pop
- [ ] Progress bar fills proportionally
- [ ] Completion triggers at score 10
- [ ] Returns to menu on completion

#### Failure Handling
| Condition | Response |
|-----------|----------|
| Hand lost | Bubbles continue floating, resume on hand return |
| No pops for 30s | Spawn larger, slower bubbles (adaptive difficulty) |
| Performance issues | Reduce bubble count to maintain 30fps |

#### Edge Cases
- [ ] **Multiple bubbles touched simultaneously:** Each pops individually (not all at once)
- [ ] **Bubble at screen edge:** Still poppable
- [ ] **Rapid popping:** Animations don't stack/conflict
- [ ] **Completing during pop animation:** Completion waits for animation

#### Instrumentation
| Metric | Type | Purpose |
|--------|------|---------|
| `bubbles.hit_rate` | Percentage | Accuracy metric |
| `bubbles.average_time_per_pop` | Float ms | Speed metric |
| `bubbles.miss_count` | Counter | Difficulty indicator |
| `bubbles.completion_time_ms` | Timer | Overall performance |

---

### 6. Adult Gate

#### Entry Conditions
- [ ] App state is 'game' (any mode)
- [ ] Gate button visible in UI
- [ ] Gate not currently active

#### Success Criteria
- [ ] Hold unlock requires **full duration (2 seconds)** with clear progress feedback
- [ ] Progress ring shows hold progress accurately
- [ ] Menu opens only on complete hold
- [ ] Exit option returns to menu
- [ ] Cancel closes gate, returns to game

#### Failure Handling
| Condition | Response |
|-----------|----------|
| Released early | Progress resets, no menu access |
| Hand lost during hold | Progress pauses briefly (0.3s), then resets |
| Rapid tapping | Never accumulates to unlock |

#### Edge Cases
- [ ] **Child tapping repeatedly:** Never unlocks (no accumulated progress)
- [ ] **Hold with finger drift:** Still counts as hold if near button
- [ ] **Hold then swipe away:** Resets progress
- [ ] **Multiple exit attempts:** Each requires fresh 2s hold

#### Instrumentation
| Metric | Type | Purpose |
|--------|------|---------|
| `adult_gate.unlock_attempts` | Counter | Usage pattern |
| `adult_gate.unlock_success_rate` | Percentage | UX metric |
| `adult_gate.average_hold_duration` | Float ms | Tuning data |
| `adult_gate.child_tap_count` | Counter | Child attempt indicator |

---

### 7. Wave-to-Wake Onboarding

#### Entry Conditions
- [ ] App state is 'onboarding'
- [ ] Camera active
- [ ] Hand tracking initialized

#### Success Criteria
- [ ] Detects horizontal hand movement as "wave"
- [ ] Requires 5 valid waves to complete
- [ ] Progress dots update on each valid wave
- [ ] 300ms debounce between wave counts
- [ ] Transitions to menu on completion

#### Failure Handling
| Condition | Response |
|-----------|----------|
| Hand not detected | Show "Show your hand" prompt |
| No waves for 20s | Show animated wave demonstration |
| Very slow waves | Still count (no speed minimum) |

#### Edge Cases
- [ ] **Vertical movement only:** Does not count as wave
- [ ] **Diagonal movement:** Counts if horizontal component > threshold
- [ ] **Two-hand waving:** Counts as single waves (not double)
- [ ] **Wave then pause:** Maintains progress, doesn't reset

#### Instrumentation
| Metric | Type | Purpose |
|--------|------|---------|
| `onboarding.time_to_complete_ms` | Timer | UX metric |
| `onboarding.prompts_shown` | Counter | Help frequency |
| `onboarding.wave_count` | Counter | Interaction tracking |

---

### 8. Magic Cursor

#### Entry Conditions
- [ ] Hand detected
- [ ] Position data available

#### Success Criteria
- [ ] Cursor position matches finger position (mirrored correctly)
- [ ] Cursor visible when hand detected
- [ ] Cursor fades when hand lost
- [ ] Trail effect follows cursor smoothly
- [ ] Animations play correctly (rotation, pulse)

#### Failure Handling
| Condition | Response |
|-----------|----------|
| Hand lost | Cursor fades over 200ms |
| Hand returns | Cursor fades in at new position (no jump) |
| Position spike | Cursor smooths movement (doesn't teleport) |

#### Edge Cases
- [ ] **Cursor at screen edge:** Stays within bounds, doesn't clip
- [ ] **Very fast movement:** Trail keeps up, doesn't lag excessively
- [ ] **Stationary hand:** Trail fades, cursor stays stable
- [ ] **Low tracking confidence:** Cursor may fade slightly but doesn't flicker

#### Instrumentation
| Metric | Type | Purpose |
|--------|------|---------|
| `cursor.visible_percentage` | Percentage | Reliability metric |
| `cursor.average_trail_length` | Float | Usage pattern |

---

## Cross-Feature Requirements

### Performance Requirements

| Requirement | Target | Minimum |
|-------------|--------|---------|
| Frame rate | 60 fps | 30 fps |
| Input latency | <40ms | <60ms |
| Mode switch time | <200ms | <500ms |
| Initial load time | <3s | <5s |

### Accessibility Requirements

| Requirement | Criteria |
|-------------|----------|
| Color contrast | All text meets WCAG AA (4.5:1) |
| Touch targets | All buttons ≥44x44px |
| Motion sensitivity | Reduce motion option for animations |
| Screen reader | Key actions announced (future) |

### Memory Requirements

| Requirement | Target |
|-------------|--------|
| Heap usage | <200MB |
| Stroke storage | <1000 strokes before warning |
| Texture memory | <100MB |

---

## Testing Checklist

### Smoke Tests (Every Build)
- [ ] App loads without errors
- [ ] Camera permission flow works
- [ ] Hand is detected
- [ ] Can navigate to each mode
- [ ] Can draw a stroke
- [ ] Can trace a path
- [ ] Can pop a bubble
- [ ] Adult gate opens and closes

### Regression Tests (Every Release)
- [ ] All acceptance criteria pass
- [ ] Performance targets met
- [ ] No memory leaks in 5-minute session
- [ ] Works on target devices
- [ ] Edge cases handled

### User Testing (Monthly)
- [ ] Child completes onboarding unaided
- [ ] Child can select mode
- [ ] Child understands pen up/down
- [ ] Child can complete tracing
- [ ] Parent can use adult gate

---

*These acceptance criteria define "done" for each feature. A feature is not complete until all criteria pass.*

