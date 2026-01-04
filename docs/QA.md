# QA Checklist

## Acceptance Tests

### Section A: Coordinate System and Mirroring

- [ ] **Move hand left**: Cursor moves left on screen
- [ ] **Move hand right**: Cursor moves right on screen
- [ ] **Tracing START label**: Reads "START" normally (not reversed)
- [ ] **GREAT JOB text**: Reads normally (not reversed)
- [ ] **Mode selection hover**: Works correctly with unmirrored view
- [ ] **All UI text**: Renders normally, no reversed characters

### Section B: Pen Model (Pinch-to-Draw)

- [ ] **Hold hand still while pen up**: No marks appear
- [ ] **Pinch, draw, release, pause 2s, pinch again**: Creates two separate strokes with no connecting line
- [ ] **Hand leaves frame and returns elsewhere**: No long diagonal slash is drawn
- [ ] **Cursor visual feedback**: Shows pen-up (hollow) vs pen-down (solid) states
- [ ] **Open hand pause**: Drawing stops immediately when hand opens

### Section C: Stroke Smoothness

- [ ] **Slow circle**: No stepping, no wobbles larger than ~5px at 1080p canvas
- [ ] **Fast scribble**: Continuous line, no broken gaps
- [ ] **Tracking dropout**: No spikes, no diagonal slashes
- [ ] **FreePaint no longer jumps randomly**: Strokes are smooth and predictable
- [ ] **Curves render smoothly**: No visible point-to-point segments

### Section D: Tracing Mode (A-Z)

- [ ] **START and GREAT JOB render normally**: Readable, not reversed
- [ ] **Left/right movement matches path direction**: Natural interaction
- [ ] **Child can trace letters without confusion**: Clear feedback
- [ ] **Completion feels rewarding**: Celebration animation appears
- [ ] **A-Z letters available**: All 26 letters can be traced
- [ ] **Pinch-to-draw works in tracing**: Only draws when pinching

### Section E: Bubble Pop Upgrades

- [ ] **30-second timer displays**: Shows remaining time clearly
- [ ] **Bubbles move slowly**: Easy to track and pop
- [ ] **20-pop milestone**: Triggers grand celebration
- [ ] **Game ends cleanly**: Summary shown at 30 seconds
- [ ] **Unlock reward**: Displays when 20+ pops achieved

### Section F: Sort and Place Mode

- [ ] **Mode feels different immediately**: No drawing trail, it's grab-and-place
- [ ] **Pinch grab is reliable**: Objects grab when pinching near them
- [ ] **Kids understand goal within 10 seconds**: Clear instructions
- [ ] **Correct placement**: Objects snap into correct zones
- [ ] **Incorrect placement**: Objects bounce back with feedback
- [ ] **All three rounds work**: Color, Size, Category sorting

### Section G: Grand Feedback

- [ ] **Tracing shape complete**: Celebration appears
- [ ] **Tracing letter complete**: Celebration appears
- [ ] **Bubble Pop end**: Celebration appears
- [ ] **Bubble Pop 20+ milestone**: Special celebration
- [ ] **Sort and Place round complete**: Celebration appears
- [ ] **All celebrations feel rewarding**: Consistent, positive feedback

### Section H: UI Polish

- [ ] **Larger touch targets**: Easy to interact with
- [ ] **Reduced visual clutter**: Clean, focused interface
- [ ] **All text readable**: No mirrored text anywhere
- [ ] **Modern, kid-friendly aesthetic**: Premium feel maintained
- [ ] **Adult controls gated**: Lock icon works correctly

## Performance Tests

- [ ] **Render loop stays smooth**: 60fps maintained
- [ ] **No React per-frame rerenders**: Uses refs appropriately
- [ ] **Tracking latency**: Under 60ms end-to-end
- [ ] **Memory usage**: No leaks during extended play

## Visual QA Checklist

- [ ] **Lines look like felt tip on paper**: Not dotted neon beads
- [ ] **Curves are smooth**: No corners unless child changes direction sharply
- [ ] **Strokes end cleanly**: No tails or spikes
- [ ] **Cursor animations smooth**: No jittery movement
- [ ] **Celebrations feel polished**: Professional animations

## Edge Cases

- [ ] **Two hands in frame**: App chooses most stable hand consistently
- [ ] **Low light conditions**: Tracking degrades gracefully
- [ ] **Fast hand movements**: No gaps or teleport lines
- [ ] **Hand leaves frame mid-stroke**: Stroke ends cleanly
- [ ] **Rapid pinch/unpinch**: No flickering or state confusion

