# Onboarding Specification
## Draw in the Air - Parent Setup & Kid Micro-Tutorials

---

## Overview

Two distinct onboarding flows are required:

| Flow | Audience | Frequency | Duration |
|------|----------|-----------|----------|
| **Parent Setup** | Adults | First launch only | 60-90 seconds |
| **Kid Micro-Tutorial** | Children | Every session | 20-40 seconds |

---

## Part 1: Parent Setup Onboarding

> **Purpose:** Ensure optimal environment and permissions before child uses the app.

### Flow Diagram

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Welcome    │───▶│   Camera     │───▶│ Environment  │───▶│  Calibration │───▶│  Age Band    │
│   Screen     │    │  Permission  │    │  Checklist   │    │    Check     │    │  Selection   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                                                                        │
                                                                                        ▼
                                                                               ┌──────────────┐
                                                                               │   Complete   │
                                                                               │ → Kid Flow   │
                                                                               └──────────────┘
```

---

### Step 1: Welcome Screen

**Purpose:** Introduce the app and set expectations.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    ✨ Draw in the Air ✨                        │
│                                                                 │
│              [Animated hand drawing sparkles]                   │
│                                                                 │
│     Your child will draw using hand movements                   │
│     tracked by your camera.                                     │
│                                                                 │
│     Let's set things up for the best experience!                │
│                                                                 │
│                      [Get Started →]                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Elements:**
- Animated preview of hand drawing
- Clear value proposition
- Single CTA button

---

### Step 2: Camera Permission

**Purpose:** Request and explain camera access.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                         📸 Camera Access                        │
│                                                                 │
│              [Camera icon with hand silhouette]                 │
│                                                                 │
│     Draw in the Air needs camera access to see                  │
│     your child's hand movements.                                │
│                                                                 │
│     ┌─────────────────────────────────────────────────────┐    │
│     │  🔒 Privacy Note                                    │    │
│     │  • Video is processed locally on your device        │    │
│     │  • No video is recorded or sent anywhere            │    │
│     │  • Camera is only active during app use             │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                 │
│                   [Allow Camera Access]                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**States:**
| State | UI |
|-------|------|
| Not requested | Show explanation + button |
| Requesting | Browser permission dialog |
| Granted | Auto-advance to next step |
| Denied | Show troubleshooting + manual enable instructions |

**Privacy Messaging:**
- Emphasise local processing
- No data transmission
- Camera only active when app is open

---

### Step 3: Environment Checklist

**Purpose:** Guide parent to set up optimal tracking conditions.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    🏠 Set Up Your Space                         │
│                                                                 │
│     For the best experience, please check:                      │
│                                                                 │
│     ┌─────────────────────────────────────────────────────┐    │
│     │                                                     │    │
│     │  [✓] Stand 1-2 metres from the screen               │    │
│     │      [Diagram: person → 1.5m → screen]              │    │
│     │                                                     │    │
│     │  [✓] Bright light from the front                    │    │
│     │      [Diagram: light source → person → camera]      │    │
│     │                                                     │    │
│     │  [✓] Plain background behind you                    │    │
│     │      [Diagram: clean wall vs. busy background]      │    │
│     │                                                     │    │
│     │  [✓] Hands clearly visible to camera                │    │
│     │      [Diagram: hand in frame, not cut off]          │    │
│     │                                                     │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                 │
│                    [Environment Ready →]                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Checklist Items:**

| Item | Why | Visual Aid |
|------|-----|------------|
| Distance: 1-2 metres | Hand needs full range of motion | Side-view diagram |
| Front lighting | Reduces shadows on hands | Light direction diagram |
| Plain background | Helps tracking distinguish hand | Comparison images |
| Hands visible | Can't track what camera can't see | Frame boundary diagram |

---

### Step 4: Quick Calibration

**Purpose:** Verify tracking is working before child starts.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    ✋ Quick Check                                │
│                                                                 │
│     ┌─────────────────────────────────────────────────────┐    │
│     │                                                     │    │
│     │           [Live camera feed]                        │    │
│     │                                                     │    │
│     │     ┌─────────────────────────────────┐            │    │
│     │     │  Place your hand in this box    │            │    │
│     │     │                                 │            │    │
│     │     │      [ Target area outline ]    │            │    │
│     │     │                                 │            │    │
│     │     └─────────────────────────────────┘            │    │
│     │                                                     │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                 │
│     Status: [Searching for hand... / ✓ Hand detected!]         │
│                                                                 │
│     Tracking Quality: ████████░░ Good                          │
│                                                                 │
│                    [Continue →] (enabled when hand detected)    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Calibration Logic:**
```typescript
interface CalibrationState {
  handDetected: boolean;
  trackingQuality: 'poor' | 'fair' | 'good' | 'excellent';
  stabilityScore: number;  // Frames with consistent tracking
  readyToProceed: boolean;
}

// Require 30 frames (0.5s) of stable tracking before enabling "Continue"
const STABILITY_THRESHOLD = 30;
```

**Quality Indicators:**
| Quality | Confidence | Stability | Message |
|---------|------------|-----------|---------|
| Poor | <0.5 | <10 frames | "Try better lighting" |
| Fair | 0.5-0.7 | 10-20 frames | "Almost there..." |
| Good | 0.7-0.9 | 20-30 frames | "Looking good!" |
| Excellent | >0.9 | >30 frames | "Perfect! ✨" |

---

### Step 5: Age Band Selection

**Purpose:** Tune experience parameters for developmental stage.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    👶 Child's Age                               │
│                                                                 │
│     This helps us adjust the experience:                        │
│                                                                 │
│     ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│     │                 │  │                 │  │             │  │
│     │      3-4        │  │      5-6        │  │     7+      │  │
│     │                 │  │                 │  │             │  │
│     │  [Toddler icon] │  │ [Child icon]    │  │ [Older kid] │  │
│     │                 │  │                 │  │             │  │
│     │  Bigger targets │  │ Standard        │  │ Challenge   │  │
│     │  Slower timing  │  │ experience      │  │ modes       │  │
│     │  More guidance  │  │                 │  │             │  │
│     │                 │  │                 │  │             │  │
│     └─────────────────┘  └─────────────────┘  └─────────────┘  │
│                                                                 │
│     (You can change this later in settings)                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Age Band Parameters:**

| Parameter | 3-4 Years | 5-6 Years | 7+ Years |
|-----------|-----------|-----------|----------|
| Path tolerance | 15% | 10% | 6% |
| Dwell time for selection | 2.0s | 1.5s | 1.0s |
| Bubble size | 1.5x | 1.0x | 0.8x |
| Guidance frequency | High | Medium | Low |
| Movement speed expectation | Slow | Medium | Fast |
| Celebration intensity | High | Medium | Subtle |

---

### Step 6: Setup Complete

**Purpose:** Confirm setup and hand off to child.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    ✅ All Set!                                  │
│                                                                 │
│              [Celebration animation]                            │
│                                                                 │
│     Everything is ready for [Child Name / your child].          │
│                                                                 │
│     ┌─────────────────────────────────────────────────────┐    │
│     │  Quick Tips:                                        │    │
│     │  • Point with one finger to draw                    │    │
│     │  • Pinch to start/stop drawing                      │    │
│     │  • Hold 🔒 button to exit (adults only)             │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                 │
│              [Let's Play! 🎨] (large, friendly button)          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 2: Kid Micro-Tutorial

> **Purpose:** Teach child the basic interactions in 20-40 seconds, every session.

### Design Rules

| Rule | Rationale |
|------|-----------|
| ❌ No reading required | Pre-readers can use it |
| ✅ Voice + icons only | Multi-sensory learning |
| ✅ Confirm success before advancing | Mastery-based progression |
| ✅ Skippable after first time | Returning users can bypass |
| ✅ Re-playable from menu | In case they forget |

---

### Tutorial Sequence

```
Step 1          Step 2          Step 3          Step 4          Step 5
Show Hand  →  Point Finger  →  Move to Draw  →  Pinch Pause  →  Celebrate!
   3s              5s              8s              8s              3s
```

**Total Duration:** ~27 seconds

---

### Step 1: Show Your Hand (3 seconds)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│              [Big friendly hand icon]                           │
│                   ✋                                             │
│              (mirrors child's actual hand if detected)          │
│                                                                 │
│     🔊 "Show me your hand!"                                     │
│                                                                 │
│     [Progress: ●○○○○]                                           │
│                                                                 │
│     ───────────────────────────                                 │
│     Detection: Waiting... → ✓ Hand found!                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Audio:** "Show me your hand!" (friendly voice)

**Visual:**
- Large hand icon that animates when user's hand appears
- Hand icon mirrors user's hand position
- Sparkle effect when hand detected

**Success Trigger:** Hand detected for 1 second

---

### Step 2: Point with One Finger (5 seconds)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│              [Hand icon with index finger highlighted]          │
│                   ☝️                                             │
│              (index finger glows/pulses)                        │
│                                                                 │
│     🔊 "Point with one finger, like this!"                      │
│                                                                 │
│     [Progress: ●●○○○]                                           │
│                                                                 │
│     ───────────────────────────                                 │
│     Detecting: All fingers → Just one finger → ✓ Perfect!       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Audio:** "Point with one finger, like this!" 

**Visual:**
- Animated hand transitioning from open to pointing
- Index finger highlighted with glow
- User's hand shown with index finger emphasized

**Success Trigger:** Index finger extended, other fingers closed (pointing gesture detected)

---

### Step 3: Move Slowly to Draw (8 seconds)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│     ┌─────────────────────────────────────────────────────┐    │
│     │                                                     │    │
│     │      ☝️ ─────────────→ ★                            │    │
│     │      (Demo finger moving, leaving sparkle trail)    │    │
│     │                                                     │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                 │
│     🔊 "Move your finger slowly to draw!"                       │
│                                                                 │
│     [Progress: ●●●○○]                                           │
│                                                                 │
│     Draw to the star! ★                                         │
│     [Trail appears as child moves]                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Audio:** "Move your finger slowly to draw!"

**Visual:**
- Demo animation shows finger moving with trail
- Target star appears for child to reach
- Child's trail appears as they move

**Success Trigger:** Child draws trail that reaches star (path length > threshold)

---

### Step 4: Pinch to Pause (8 seconds)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│              [Animation: finger + thumb coming together]        │
│                   👌                                             │
│              (pinch gesture demo)                               │
│                                                                 │
│     🔊 "Pinch your fingers to stop drawing!"                    │
│                                                                 │
│     [Progress: ●●●●○]                                           │
│                                                                 │
│     ───────────────────────────                                 │
│     Cursor state: ● Drawing → ○ Paused                          │
│                                                                 │
│     ✓ Great! Now open your hand to draw again!                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Audio:** "Pinch your fingers to stop drawing!"

**Visual:**
- Animated hand showing pinch gesture
- Cursor changes from solid (drawing) to hollow (paused)
- Trail stops when pinch detected

**Success Trigger:** Pinch gesture detected, then released

---

### Step 5: Celebrate! (3 seconds)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                         🎉                                       │
│                                                                 │
│              ✨ You're ready! ✨                                 │
│                                                                 │
│     [Confetti animation, stars bursting]                        │
│                                                                 │
│     🔊 "Amazing! You're ready to play!"                         │
│                                                                 │
│     [Progress: ●●●●●]                                           │
│                                                                 │
│              [Auto-transition to menu in 3...2...1...]          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Audio:** "Amazing! You're ready to play!"

**Visual:**
- Celebration animation (confetti, sparkles)
- Positive reinforcement
- Auto-transition to mode selection

---

## Tutorial Skip Logic

```typescript
interface TutorialState {
  hasCompletedOnce: boolean;
  lastCompletedDate: Date | null;
  skipRequested: boolean;
}

// Show skip option after first completion
const shouldShowSkip = (state: TutorialState): boolean => {
  return state.hasCompletedOnce;
};

// Suggest re-tutorial if been a while
const shouldSuggestTutorial = (state: TutorialState): boolean => {
  if (!state.lastCompletedDate) return true;
  const daysSinceLastUse = daysBetween(state.lastCompletedDate, new Date());
  return daysSinceLastUse > 7;  // Suggest if >1 week since last use
};
```

**Skip UI:**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│     Welcome back! 👋                                            │
│                                                                 │
│     [Quick Reminder]     [Skip to Play →]                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Voice Over Script

### Parent Setup (Optional Audio)

| Step | Script |
|------|--------|
| Welcome | "Welcome to Draw in the Air! Let's get set up." |
| Camera | "We need camera access to see hand movements." |
| Environment | "For best results, check these tips." |
| Calibration | "Hold your hand up so we can see it." |
| Age | "How old is your child?" |
| Complete | "All set! Hand the device to your child." |

### Kid Tutorial (Required Audio)

| Step | Script | Voice Style |
|------|--------|-------------|
| 1 | "Show me your hand!" | Excited, encouraging |
| 1 success | "Great job!" | Celebratory |
| 2 | "Point with one finger, like this!" | Instructive |
| 2 success | "Perfect pointing!" | Praising |
| 3 | "Move your finger slowly to draw!" | Guiding |
| 3 success | "Wow, you did it!" | Impressed |
| 4 | "Pinch your fingers to stop drawing!" | Clear |
| 4 success | "That's how you pause!" | Confirming |
| 5 | "Amazing! You're ready to play!" | Celebratory |

---

## Implementation Notes

### Audio System

```typescript
interface VoiceOverConfig {
  enabled: boolean;
  language: 'en-GB' | 'en-US';  // Expandable
  volume: number;  // 0-1
}

class TutorialAudio {
  private audioContext: AudioContext;
  private voiceOverQueue: AudioClip[];

  async playStep(stepId: string): Promise<void> {
    const clip = await this.loadClip(`tutorial/${stepId}`);
    await this.play(clip);
  }

  async playSuccess(): Promise<void> {
    const clip = await this.loadClip('sfx/success');
    await this.play(clip);
  }
}
```

### Gesture Detection for Tutorial

```typescript
// Specific detection for tutorial steps
interface TutorialGestureDetector {
  detectHandPresence(): boolean;
  detectPointing(): boolean;        // Index extended, others curled
  detectPinch(): boolean;           // Thumb-index distance < threshold
  detectMovement(threshold: number): boolean;
}

// More forgiving thresholds during tutorial
const TUTORIAL_THRESHOLDS = {
  pinchDistance: 0.08,       // Larger than gameplay (0.05)
  pointingConfidence: 0.6,   // Lower than gameplay (0.8)
  movementMin: 0.05          // Smaller movements count
};
```

### Persistence

```typescript
// Store tutorial completion in localStorage
const TUTORIAL_KEY = 'draw-in-air-tutorial';

interface TutorialStorage {
  parentSetupComplete: boolean;
  kidTutorialComplete: boolean;
  lastSessionDate: string;
  selectedAgeBand: '3-4' | '5-6' | '7+';
}
```

---

## Accessibility Considerations

| Consideration | Implementation |
|---------------|----------------|
| Audio descriptions | All visual demos have voice-over |
| High contrast mode | Tutorial UI respects system settings |
| Slower timing | Age band 3-4 has longer timeouts |
| Repeat option | "Show me again" button on each step |
| No time pressure | Steps wait for success, no auto-fail |

---

*A good onboarding makes the difference between a child who engages joyfully and one who gives up in frustration. Invest in these 60 seconds.*

