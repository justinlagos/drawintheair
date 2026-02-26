# QA Checklist - Draw In The Air

## PRIORITY A: Global Stability

### Pinch Grab Stability
- [ ] In Sort and Place mode, pinch to grab an object
- [ ] **Expected:** No jitter while holding, smooth following
- [ ] **Expected:** No teleporting or sudden jumps
- [ ] **Expected:** Object follows hand smoothly with easing

### Drawing Smoothness
- [ ] In Free Paint mode, pinch to draw slow circles
- [ ] In Free Paint mode, pinch to draw fast scribbles
- [ ] **Expected:** Smooth, continuous strokes with no gaps
- [ ] **Expected:** No jerky movements or spikes
- [ ] **Expected:** Letters drawn in the air look readable

### Tracking Loss Handling
- [ ] Cover hand for 0.3 seconds, then reveal it
- [ ] **Expected:** No spikes or broken lines when tracking resumes
- [ ] **Expected:** Clean stroke breaks (new stroke starts, no connecting line)
- [ ] **Expected:** No diagonal slashes on reacquiring tracking

### Confidence Gating
- [ ] In low light or partial hand visibility
- [ ] **Expected:** Drawing stops cleanly when confidence drops
- [ ] **Expected:** No random marks or jitter
- [ ] **Expected:** Pinch grab releases gracefully on low confidence

### Overall Feel
- [ ] Test all modes (Free Paint, Tracing, Bubble Pop, Sort and Place)
- [ ] **Expected:** Stable, predictable interactions
- [ ] **Expected:** Smooth, locked-in movement
- [ ] **Expected:** Experience feels calm, predictable, solid

---

## PRIORITY B: Free Paint

### Stroke Quality
- [ ] Draw slow curves
- [ ] **Expected:** Clean, smooth lines
- [ ] **Expected:** No jitter spikes
- [ ] Draw fast movements
- [ ] **Expected:** Continuous strokes, no dotted gaps
- [ ] **Expected:** No extreme thickness shifts

### Pen Model
- [ ] Pinch to draw
- [ ] **Expected:** Stroke begins only when pinching
- [ ] Open hand to pause
- [ ] **Expected:** No marks while paused
- [ ] **Expected:** No fat blobs or accidental marks
- [ ] Resume after pause
- [ ] **Expected:** New stroke starts, no connecting line

### UI Clarity
- [ ] First-time hint appears
- [ ] **Expected:** "Pinch to draw, open hand to pause" message
- [ ] **Expected:** Hint auto-fades after 5 seconds
- [ ] Brush preview visible
- [ ] **Expected:** Large, clear preview at bottom center
- [ ] **Expected:** Preview scales when pen is down
- [ ] Controls accessible
- [ ] **Expected:** Color palette on left, brush sizes on right
- [ ] **Expected:** Clear button visible and functional

### Visual Quality
- [ ] Strokes have glow effect
- [ ] **Expected:** Subtle depth, not harsh neon
- [ ] **Expected:** Rounded shapes, soft shadows
- [ ] UI feels premium
- [ ] **Expected:** Soft depth, gentle glow, rounded shapes

---

## PRIORITY C: Bubble Pop

### Timer
- [ ] Timer always visible
- [ ] **Expected:** Large, readable timer at top center
- [ ] **Expected:** Changes color when < 5 seconds
- [ ] **Expected:** Format: MM:SS

### Gameplay
- [ ] Bubbles move slowly
- [ ] **Expected:** Gentle drifting, not chaotic
- [ ] **Expected:** Kids can locate bubbles easily
- [ ] Pop detection works
- [ ] **Expected:** Satisfying particle burst + sound
- [ ] **Expected:** Score increments correctly

### Milestone Reward
- [ ] Reach 20 pops
- [ ] **Expected:** Big centered celebration animation
- [ ] **Expected:** Confetti + glow + friendly text
- [ ] **Expected:** Duration ~2.5 seconds

### End-of-Round Modal
- [ ] Wait for 30 seconds to expire
- [ ] **Expected:** Modal appears centered on screen
- [ ] **Expected:** Message based on score (< 20 vs >= 20)
- [ ] **Expected:** "Start Over" button always visible
- [ ] **Expected:** "Next" button only visible when score >= 20 and chapter < 3

### Chapter Progression
- [ ] Complete Chapter 1 with >= 20 pops
- [ ] **Expected:** "Next" button enabled
- [ ] Click "Next Chapter"
- [ ] **Expected:** Environment changes (parallax, bloom for chapters 2-3)
- [ ] **Expected:** Bubbles slightly faster, more bubbles on screen
- [ ] **Expected:** Chapter indicator shows correct number

### Visual Quality
- [ ] Bubbles look 3D
- [ ] **Expected:** Realistic balloons with depth
- [ ] **Expected:** Soft shadows, subtle perspective
- [ ] **Expected:** Gentle floating motion
- [ ] Chapters 2-3 have depth
- [ ] **Expected:** Parallax background layers
- [ ] **Expected:** Bloom/glow effects

---

## PRIORITY D: Sort and Place

### Pinch Grab and Drag
- [ ] Pinch to grab an object
- [ ] **Expected:** Smooth, controlled, predictable
- [ ] **Expected:** No jitter while holding
- [ ] **Expected:** Object follows hand smoothly with easing
- [ ] Drag object around
- [ ] **Expected:** No teleporting
- [ ] **Expected:** Smooth movement

### Drop Behavior
- [ ] Drop object in correct zone
- [ ] **Expected:** Item snaps into container gently
- [ ] **Expected:** Items arrange line-by-line (grid/row layout)
- [ ] **Expected:** No overlaps
- [ ] Drop object in wrong zone
- [ ] **Expected:** Item bounces back
- [ ] **Expected:** Gentle hint provided

### Visual Quality
- [ ] Objects feel 3D
- [ ] **Expected:** Subtle perspective, soft shadows
- [ ] **Expected:** Items have slight thickness via shading
- [ ] **Expected:** Scale up slightly when grabbed
- [ ] Containers have depth
- [ ] **Expected:** Inner glow and depth
- [ ] **Expected:** Glow on correct hover

### Rounds
- [ ] Complete Round 1 (Color)
- [ ] **Expected:** Celebration appears centered
- [ ] **Expected:** Auto-advance to Round 2 (Size)
- [ ] Complete Round 2
- [ ] **Expected:** Auto-advance to Round 3 (Category)
- [ ] Complete Round 3
- [ ] **Expected:** Bigger celebration + optional unlock

---

## PRIORITY E: Tracing Mode

### Rewards
- [ ] Complete a shape or letter
- [ ] **Expected:** Large reward animation centered on screen
- [ ] **Expected:** Confetti + glow ring + friendly icon + big text
- [ ] **Expected:** Duration ~2 seconds, auto-dismiss
- [ ] **Expected:** Auto-advance to next shape/letter

### Visual Feedback
- [ ] Progress fills path with light
- [ ] **Expected:** Glowing corridor path
- [ ] **Expected:** Pulsing start dot
- [ ] **Expected:** On-path feedback (green brush)
- [ ] **Expected:** Off-path feedback (red arrow)

---

## PRIORITY F: Visual Polish

### Depth Cues
- [ ] Soft shadows under objects
- [ ] **Expected:** Visible in all modes
- [ ] **Expected:** Not too heavy, subtle
- [ ] Gentle bloom/glow
- [ ] **Expected:** Present in Bubble Pop chapters 2-3
- [ ] **Expected:** Present in Sort and Place containers

### Performance
- [ ] Frame rate remains smooth
- [ ] **Expected:** 60 FPS rendering
- [ ] **Expected:** 30 FPS detection (stable)
- [ ] **Expected:** No stuttering or lag
- [ ] **Expected:** Experience feels premium and exciting

### Overall Feel
- [ ] UI feels like premium casual game
- [ ] **Expected:** Not educational software
- [ ] **Expected:** Soft depth, not flat
- [ ] **Expected:** Gentle glow, not harsh neon
- [ ] **Expected:** Rounded shapes everywhere
- [ ] **Expected:** Slow, floaty motion

---

## Cross-Mode Checks

### Coordinate System
- [ ] Move hand right
- [ ] **Expected:** Cursor/activity moves right (not opposite)
- [ ] **Expected:** Left is left, right is right
- [ ] **Expected:** Text is normal (not mirrored)

### Celebrations
- [ ] All major rewards appear centered
- [ ] **Expected:** Never top-aligned or corner-aligned
- [ ] **Expected:** Confetti + glow + friendly text
- [ ] **Expected:** Duration ~2 seconds, auto-dismiss

### UI Consistency
- [ ] All buttons are pill-shaped
- [ ] **Expected:** Slight 3D bevel, soft highlight
- [ ] **Expected:** Press animation scales down
- [ ] All containers have glow
- [ ] **Expected:** Rounded rectangles with subtle inner glow
- [ ] **Expected:** Light shadow beneath

---

## Performance Benchmarks

- [ ] End-to-end input to rendered stroke: < 60ms
- [ ] Frame stability: 30fps minimum sustained
- [ ] No memory leaks during extended play
- [ ] Smooth transitions between modes

---

## Edge Cases

- [ ] Two hands in frame: app chooses most stable hand
- [ ] Hand tracking drops mid-stroke: clean break, no spike
- [ ] Fast hand movement: no gaps or teleport lines
- [ ] Low light conditions: graceful degradation
- [ ] Child pauses mid-trace: no ugly connecting lines
- [ ] Multiple rapid pinch/unpinch: no flicker

---

## Acceptance Criteria Summary

✅ **PRIORITY A:** Pinch grab does not jitter, dragged items do not lag or teleport, tracking loss does not create spikes, all modes feel stable

✅ **PRIORITY B:** Letters drawn in the air look readable, strokes are smooth and consistent, pausing creates no accidental marks, UI is clear and modern

✅ **PRIORITY C:** Timer always visible, <20 pops shows encouragement + Start Over, >=20 pops shows celebration + Start Over + Next, chapters change environment and increase pace

✅ **PRIORITY D:** Pinch grab feels controlled, dropped items align cleanly line-by-line, mode feels distinct, visuals feel premium

✅ **PRIORITY E:** Completion feedback always centered, reward feels grand and motivating

✅ **PRIORITY F:** Experience feels premium and exciting, rewards feel meaningful, frame rate remains smooth
