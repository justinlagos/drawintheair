# Tracing Mode Deep Investigation & Fixes

## Issues Found and Fixed

### 1. **Sort and Place Overlay Removed**
- ✅ Removed dev-only debug overlay from top-left corner
- File: `src/features/modes/sortAndPlace/sortAndPlaceLogic.ts`

### 2. **Level Start Issues Fixed**

#### **Start Dot Visibility**
- ✅ Made start dot more prominent when progress < 5%
- ✅ Increased size from 20px to 28px when prominent
- ✅ Added outer glow ring when prominent
- ✅ Larger "START" label when prominent
- ✅ Always visible, pulsing animation

#### **Instruction Display**
- ✅ Instruction now shows when progress < 15% (was < 10%)
- ✅ More prominent styling when progress < 5% (pulse animation)
- ✅ Shows instruction even when paused (if progress < 15%)
- ✅ Better visibility with improved colors and sizing

### 3. **During Play Feedback**

#### **On-Path Feedback**
- ✅ Path fills with brighter light when on-path
- ✅ Thicker line width when on-path (1.0x vs 0.8x)
- ✅ Stronger glow effect when on-path (40px vs 30px blur)
- ✅ **NEW: Subtle sparkle trail** - particles follow finger when on-path
  - 15 particles max, fade out over time
  - Only on high quality devices for performance
  - White sparkles with cyan glow

#### **Off-Path Hint**
- ✅ **NEW: Shows gentle hint when actively off-path**
  - "Try staying on the glowing path" message
  - 2-second cooldown to prevent spam
  - Only shows when pinching (active)
  - No punishment, just gentle guidance

#### **Idle Hints**
- ✅ Fixed to show after 6 seconds idle (was only at start)
- ✅ Works regardless of progress level
- ✅ Pulses nearest path segment (not just start dot)
- ✅ If progress < 10%, pulses start dot instead
- ✅ 6-second cooldown between hints
- ✅ Resets idle timer when movement detected

### 4. **Completion Issues Fixed**

#### **Completion Detection**
- ✅ Immediate completion check after progress update (faster detection)
- ✅ Epsilon tolerance (0.1%) for floating-point comparison
- ✅ Forgiveness near end (allows completion if within 5% and slightly off-path)
- ✅ Prevents off-path decay from reducing progress below completion
- ✅ Uses `requestAnimationFrame` for callbacks (prevents lag)

#### **Reward Display**
- ✅ Celebration shows immediately via `requestAnimationFrame`
- ✅ Auto-dismisses after 1.5 seconds
- ✅ Auto-advances after 600ms delay
- ✅ Fallback detection in poll interval (20fps) in case callback missed
- ✅ Ref-based state tracking prevents stale closures

### 5. **Pause Behavior Fixed**

#### **Pause Detection**
- ✅ 200ms grace window for pinch drops (prevents false pauses)
- ✅ Pause state tracked properly

#### **Pause Indicator**
- ✅ **Improved visibility** - background box, border, larger text
- ✅ Positioned at bottom center (was just text)
- ✅ Yellow/amber color scheme for visibility
- ✅ Shows pause emoji (⏸️) for clarity

#### **Pause Drawing**
- ✅ Path still draws when paused (was returning early)
- ✅ Start dot still visible when paused
- ✅ No marks while paused (finger feedback disabled)
- ✅ Fresh stroke segment on resume (lastFingerPos reset)

### 6. **Performance & Smoothness**

#### **Rendering Optimizations**
- ✅ Path always draws (no early returns that skip visuals)
- ✅ Sparkle trail only on high-quality devices
- ✅ Efficient particle system (max 15 particles, auto-cleanup)
- ✅ Proper state management (no React per-frame updates)

#### **Polling Improvements**
- ✅ Increased from 10fps to 20fps for more responsive completion detection
- ✅ Fallback completion check in poll interval
- ✅ Proper cleanup of timeouts and intervals

## New Features Added

1. **Sparkle Trail** (`drawSparkleTrail`)
   - Subtle white particles with cyan glow
   - Follows finger when on-path and pinching
   - Fades out over time
   - Performance-aware (high quality only)

2. **Off-Path Hint** (`drawOffPathHint`)
   - Shows "Try staying on the glowing path"
   - Gentle, non-punishing
   - 2-second cooldown

3. **Idle Hint** (`drawIdleHint`)
   - Pulses nearest path segment
   - Or pulses start dot if progress < 10%
   - Shows after 6 seconds idle
   - 6-second cooldown

## Game Loop Compliance

### ✅ Level Start
- Target shown big and clear (path drawn prominently)
- Pulsing start dot (more prominent at start)
- Instruction line visible ("Pinch to trace, open hand to pause")

### ✅ During Play
- On-path: Path fills with light, sparkle trail
- Off-path: Gentle hint shown (no punishment)
- Idle: Hints after 6 seconds (pulse segment/start dot)

### ✅ Completion
- Big centered reward animation
- Auto-dismisses after 1.5 seconds
- Auto-advances after 600ms
- No blocking beyond celebration duration

### ✅ Pause
- Open hand pauses immediately (with 200ms grace)
- No marks while paused
- Paused indicator at bottom center
- Pinch resumes with fresh stroke segment

## Files Changed

1. `src/features/modes/sortAndPlace/sortAndPlaceLogic.ts` - Removed overlay
2. `src/features/modes/tracing/tracingLogicV2.ts` - Major fixes
3. `src/features/modes/tracing/TracingMode.tsx` - UI improvements

## Testing Checklist

- [x] Start dot visible and pulsing at level start
- [x] Instruction shows prominently at start
- [x] Path fills with light when on-path
- [x] Sparkle trail appears when on-path
- [x] Off-path hint shows when actively off-path
- [x] Idle hint shows after 6 seconds
- [x] Completion triggers reward immediately
- [x] Celebration auto-dismisses and advances
- [x] Pause works smoothly with indicator
- [x] Resume creates fresh stroke segment
- [x] No lag or delays in completion
- [x] Mode runs smoothly
