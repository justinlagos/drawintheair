# Product Requirements Document (PRD)
## Draw in the Air

**Version:** 1.0.0  
**Last Updated:** January 2, 2026  
**Status:** MVP Complete

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Product Vision](#product-vision)
3. [Target Audience](#target-audience)
4. [Technical Architecture](#technical-architecture)
5. [User Journey & Flows](#user-journey--flows)
6. [Feature Specifications](#feature-specifications)
7. [UI/UX Design System](#uiux-design-system)
8. [Technical Implementation Details](#technical-implementation-details)
9. [Performance Requirements](#performance-requirements)
10. [Future Roadmap](#future-roadmap)

---

## Executive Summary

**Draw in the Air** is a web-based interactive drawing application that enables users to draw and interact with the screen using hand gestures tracked via their webcam. The application uses computer vision (MediaPipe) to detect hand movements and translates the index finger position into drawing strokes or interactive elements.

### Key Value Propositions
- **Touch-free interaction** - No physical input devices required
- **Educational focus** - Pre-writing tracing activities for early childhood development
- **Creative expression** - Free-form digital drawing with gesture controls
- **Child-safe design** - Adult gate prevents accidental navigation

---

## Product Vision

### Problem Statement
Traditional drawing applications require physical input devices (mouse, stylus, touchscreen) which can be limiting for young children developing fine motor skills. Additionally, touchscreens can be unsanitary and limiting for collaborative/educational settings.

### Solution
A gesture-based drawing experience that transforms any space with a webcam into an interactive canvas, making digital creativity more accessible and engaging—especially for young children.

### Success Metrics
- User engagement time per session
- Completion rate for tracing activities
- Return usage rate
- Gesture recognition accuracy

---

## Target Audience

### Primary Users
- **Children ages 3-7** - Primary users for educational pre-writing and creative play
- **Parents/Educators** - Facilitators who set up and monitor sessions

### User Personas

#### Persona 1: Young Learner (Primary)
- **Age:** 4-6 years old
- **Tech Comfort:** Low (needs intuitive, visual UI)
- **Goals:** Have fun drawing, practice writing shapes
- **Needs:** Large targets, forgiving gesture detection, positive reinforcement

#### Persona 2: Parent/Teacher (Secondary)
- **Age:** 25-45 years old
- **Tech Comfort:** Medium-High
- **Goals:** Educational tool for children, screen time with purpose
- **Needs:** Easy setup, child-safe controls, progress tracking

---

## Technical Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend Framework | React 19 | UI components and state management |
| Language | TypeScript | Type safety and developer experience |
| Build Tool | Vite 7 | Fast development and optimized builds |
| Computer Vision | MediaPipe Tasks Vision | Hand landmark detection |
| Rendering | HTML5 Canvas | Drawing and visual effects |
| Styling | CSS3 | Glassmorphism effects, animations |

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser Environment                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Webcam     │───▶│ HandTracker  │───▶│ TrackingLayer│      │
│  │   Stream     │    │  (MediaPipe) │    │  (Renderer)  │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                              │                    │              │
│                              ▼                    ▼              │
│                    ┌──────────────┐    ┌──────────────┐         │
│                    │ Hand Results │    │    Canvas    │         │
│                    │  (21 points) │    │   Context    │         │
│                    └──────────────┘    └──────────────┘         │
│                              │                    │              │
│           ┌──────────────────┼────────────────────┘              │
│           ▼                  ▼                                   │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │ Mode Logic   │   │   Drawing    │   │     UI       │        │
│  │ (per frame)  │   │   Engine     │   │  Components  │        │
│  └──────────────┘   └──────────────┘   └──────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
src/
├── main.tsx                    # Application entry point
├── App.tsx                     # Root component, state machine
├── App.css                     # Global app styles
├── index.css                   # Design system variables
│
├── core/                       # Core infrastructure
│   ├── handTracker.ts          # MediaPipe hand detection wrapper
│   ├── drawingEngine.ts        # Stroke management & rendering
│   └── useWebcam.ts            # Webcam stream hook
│
├── components/                 # Reusable UI components
│   ├── GlassPanel.tsx          # Glassmorphism container
│   └── MagicCursor.tsx         # Visual finger cursor
│
└── features/                   # Feature modules
    ├── onboarding/
    │   └── WaveToWake.tsx      # Initial wake gesture
    │
    ├── menu/
    │   └── ModeSelectionMenu.tsx # Mode selection UI
    │
    ├── modes/
    │   ├── FreePaintMode.tsx    # Free paint UI
    │   ├── freePaintLogic.ts    # Free paint frame logic
    │   ├── PreWritingMode.tsx   # Tracing UI
    │   ├── preWriting/
    │   │   └── preWritingLogic.ts # Tracing frame logic
    │   └── calibration/
    │       ├── BubbleCalibration.tsx # Bubble game UI
    │       └── bubbleCalibrationLogic.ts # Bubble game logic
    │
    ├── tracking/
    │   └── TrackingLayer.tsx    # Main tracking orchestrator
    │
    └── safety/
        └── AdultGate.tsx        # Parental controls
```

---

## User Journey & Flows

### Application State Machine

```
                    ┌─────────────┐
                    │  App Start  │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
          ┌────────│ Onboarding  │
          │        │ (Wave 5x)   │
          │        └──────┬──────┘
          │               │ wave complete
          │               ▼
          │        ┌─────────────┐
          │        │    Menu     │◀─────────────┐
          │        │  Selection  │              │
          │        └──────┬──────┘              │
          │               │ select mode         │ exit (adult gate)
          │               ▼                     │
          │        ┌─────────────┐              │
          └───────▶│    Game     │──────────────┘
                   │   (Mode)    │
                   └─────────────┘
```

### Detailed User Flows

#### Flow 1: First-Time User Onboarding
```
1. User opens application
2. Camera permission requested
3. "Draw in the Air" title displayed with "Wave your hand to start!" instruction
4. User waves hand in front of camera
5. Progress dots fill (5 waves required)
6. Transition to Mode Selection Menu
```

#### Flow 2: Mode Selection
```
1. Three mode cards displayed: Bubble Pop, Free Paint, Tracing
2. User moves finger over desired card
3. Progress ring animates around card (1.5s hold required)
4. On completion, transitions to selected game mode
```

#### Flow 3: Free Paint Session
```
1. Canvas displayed with floating tool panels
2. User selects color from left palette
3. User selects brush size from right panel
4. User draws by moving index finger
5. Strokes appear with glow effects
6. "Clear Canvas" button resets drawing
7. Adult Gate in corner for exit
```

#### Flow 4: Tracing Practice
```
1. Ghost path displayed with start/end markers
2. User moves finger to green "START" marker
3. User traces along the path
4. Progress bar fills as path is followed
5. Visual feedback: green (on path), red arrow (off path)
6. "GREAT JOB!" celebration on completion
7. "Next Shape" button for next challenge
```

#### Flow 5: Bubble Calibration
```
1. Colorful bubbles spawn on screen
2. User pops bubbles by touching with finger
3. Pop animation and score increment
4. Progress bar fills (10 bubbles to complete)
5. Celebration and return to menu
```

---

## Feature Specifications

### Feature 1: Hand Tracking Core

**Purpose:** Detect and track user's hand position in real-time

**Technical Specifications:**
| Parameter | Value | Notes |
|-----------|-------|-------|
| Model | MediaPipe Hand Landmarker | Float16 precision |
| Delegate | GPU | WebGL acceleration |
| Max Hands | 1 | Single user constraint |
| Detection Confidence | 0.5 | Balance accuracy/performance |
| Tracking Confidence | 0.5 | Minimum for stable tracking |
| Frame Rate | 60fps target | requestAnimationFrame loop |

**Landmark Reference:**
- Index finger tip: Landmark #8 (primary interaction point)
- Full hand: 21 landmarks available for future gestures

**API:**
```typescript
class HandTracker {
  async initialize(): Promise<void>
  detect(video: HTMLVideoElement, timestamp: number): HandLandmarkerResult | null
  close(): void
}
```

---

### Feature 2: Wave-to-Wake Onboarding

**Purpose:** Engage users with a fun gesture-based activation

**Behavior:**
- Detects horizontal hand movement (dx > 0.05 normalized)
- Requires 5 valid wave gestures
- 300ms debounce between wave counts
- Visual progress dots indicate completion

**UI Elements:**
- Floating glass panel with title
- Cyan-to-magenta gradient text
- 5 progress indicator dots
- Float animation on container

---

### Feature 3: Mode Selection Menu

**Purpose:** Allow users to choose activity mode via gesture

**Modes Available:**
| Mode | Icon | Description | Gradient |
|------|------|-------------|----------|
| Bubble Pop | 🫧 | Calibration game | Purple (#667eea → #764ba2) |
| Free Paint | 🎨 | Creative drawing | Pink (#f093fb → #f5576c) |
| Tracing | ✏️ | Pre-writing practice | Blue (#4facfe → #00f2fe) |

**Interaction:**
- Finger hover detection via bounding box collision
- 1.5 second dwell time to select
- SVG progress ring animation
- Scale and shadow transitions on hover

---

### Feature 4: Bubble Calibration Game

**Purpose:** Fun warm-up activity that calibrates hand tracking

**Game Mechanics:**
| Parameter | Value |
|-----------|-------|
| Target Score | 10 bubbles |
| Max Bubbles On Screen | 6 |
| Spawn Interval | 800ms |
| Pop Detection Radius | 1.2x bubble radius |
| Bubble Size Range | 0.04-0.07 (normalized) |

**Bubble Properties:**
```typescript
interface Bubble {
  id: number
  x: number        // 0-1 normalized
  y: number        // 0-1 normalized
  radius: number   // 0.04-0.07
  color: string    // Random from palette
  popping: boolean
  createdAt: number
}
```

**Visual Effects:**
- Radial gradient fill with highlight
- Subtle size oscillation animation
- Pop animation: scale up, fade out, sparkle burst
- Progress bar with gradient fill

---

### Feature 5: Free Paint Mode

**Purpose:** Open-ended creative drawing canvas

**Color Palette:**
| Color Name | Hex Value |
|------------|-----------|
| Hot Pink | #ff006e |
| Electric Blue | #3a86ff |
| Purple | #8338ec |
| Sunshine | #ffbe0b |
| Teal | #00f5d4 |
| Orange | #ff5400 |
| White | #ffffff |

**Brush Sizes:**
| Label | Stroke Width | Display Size |
|-------|--------------|--------------|
| S | 4px | 8px |
| M | 8px | 14px |
| L | 16px | 22px |
| XL | 32px | 32px |

**Drawing Engine Features:**
- Exponential smoothing (factor: 0.4)
- Jitter filtering (min distance: 0.001)
- Variable width based on velocity
- Multi-layer glow rendering
- White highlight overlay for depth

**Stroke Data Structure:**
```typescript
interface Stroke {
  points: Point[]
  color: string
  width: number
  glowEnabled: boolean
}

interface Point {
  x: number
  y: number
  pressure?: number
  velocity?: number
  timestamp?: number
}
```

---

### Feature 6: Pre-Writing Tracing Mode

**Purpose:** Educational line-tracing for early writing skills

**Available Shapes:**
| # | Shape | Points | Description |
|---|-------|--------|-------------|
| 1 | Vertical Line | 2 | Top to bottom |
| 2 | Horizontal Line | 2 | Left to right |
| 3 | Diagonal | 2 | Top-left to bottom-right |
| 4 | V Shape | 3 | Down and up |
| 5 | Zigzag | 4 | Multiple direction changes |

**Tracing Mechanics:**
- Path tolerance: 6% of screen dimension
- Progress increment cap: 15% per frame (prevent skipping)
- Trail effect: 30 frames fade out
- On-path/off-path visual feedback

**Visual Elements:**
| Element | Description |
|---------|-------------|
| Ghost Path | 50px wide, white 15% opacity, dashed overlay |
| Progress Path | 24px wide, cyan-blue gradient, glow effect |
| Start Marker | Pulsing green circle with "START" label |
| End Marker | Dashed gold circle, pulses when near completion |
| Trail | Fading cyan dots following finger |
| Streak Indicator | 🔥 emoji after 10+ consecutive on-path frames |

**Completion Celebration:**
- Sparkle particles radiating from center
- "✨ GREAT JOB! ✨" text with gradient
- 2 second animation duration

---

### Feature 7: Adult Gate (Parental Controls)

**Purpose:** Prevent children from accidentally exiting the application

**Interaction:**
- Lock icon button in top-right corner
- Hold for 2 seconds to unlock
- Progress ring shows hold progress
- Touch/mouse support

**Menu Options:**
| Option | Action |
|--------|--------|
| Exit to Menu | Returns to mode selection, clears canvas |
| Settings | (Reserved for future features) |
| Cancel | Closes menu, returns to game |

**Security Considerations:**
- 2-second hold prevents accidental activation
- Modal backdrop blocks all other interactions
- Clear visual feedback during unlock process

---

### Feature 8: Magic Cursor

**Purpose:** Visual feedback showing tracked finger position

**Visual Design:**
| Layer | Size | Style |
|-------|------|-------|
| Outer Ring | 50px | 3px cyan border, glow |
| Middle Ring | 34px | 2px magenta border |
| Inner Spark | 12px | White radial gradient |
| Rotating Deco | 60px | Dashed white, spins |

**Trail Effect:**
- 8 trailing points
- Size increases toward cursor
- Opacity fades toward tail
- Cyan color with glow

---

## UI/UX Design System

### Color Palette

**Background:**
```css
--bg-color: #0f0c29;
--bg-gradient: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
```

**Neon Accents:**
```css
--primary: #FF00FF;    /* Magenta */
--secondary: #00FFFF;  /* Cyan */
--tertiary: #FFFF00;   /* Yellow */
--accent: #7B2CBF;     /* Deep Purple */
--success-color: #00f5d4; /* Teal */
```

**Glassmorphism:**
```css
--glass-bg: rgba(255, 255, 255, 0.1);
--glass-border: rgba(255, 255, 255, 0.2);
--glass-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
--blur-amount: 12px;
```

### Typography

**Font Stack:**
```css
font-family: 'Outfit', 'Inter', system-ui, Avenir, Helvetica, Arial, sans-serif;
```

**Text Hierarchy:**
| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Main Title | 4rem | 700 | Gradient (cyan → magenta) |
| Section Title | 2rem | 700 | White |
| Card Title | 1.5rem | 700 | White |
| Body Text | 1rem | 400 | rgba(255,255,255,0.7) |
| Labels | 0.9rem | 600 | rgba(255,255,255,0.6) |

### Animation Standards

**Easing Functions:**
- Default: `ease` (0.25, 0.1, 0.25, 1)
- Interactions: `cubic-bezier(0.4, 0, 0.2, 1)`
- Spring: `cubic-bezier(0.34, 1.56, 0.64, 1)`

**Keyframe Animations:**
| Name | Duration | Use Case |
|------|----------|----------|
| fadeIn | 0.3s | Element appearance |
| float | 3s | Hovering elements |
| pulse-glow | 2s | Attention indicators |
| spin | 4s | Decorative rotation |

### Component Patterns

**Glass Panel:**
```css
.glass-panel {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
}
```

**Interactive Buttons:**
- Hover: translateY(-2px), increased background opacity
- Active: translateY(0)
- Border glow on focus/hover

---

## Technical Implementation Details

### Hand Tracking Pipeline

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  Video      │──▶│ MediaPipe   │──▶│ Landmark    │
│  Frame      │   │ WASM/WebGL  │   │ Results     │
└─────────────┘   └─────────────┘   └─────────────┘
                                           │
                    ┌──────────────────────┘
                    ▼
         ┌───────────────────┐
         │ Extract Index Tip │
         │   (Landmark #8)   │
         └─────────┬─────────┘
                   │
       ┌───────────┴───────────┐
       ▼                       ▼
┌─────────────┐         ┌─────────────┐
│ Update      │         │ Mode Logic  │
│ MagicCursor │         │ Callback    │
└─────────────┘         └─────────────┘
```

### Frame Loop Architecture

```typescript
// TrackingLayer.tsx - Main render loop
const loop = () => {
  if (video.readyState >= 2) {
    // 1. Detect hand
    const results = handTracker.detect(video, Date.now());
    
    // 2. Update React state for UI
    setLastResults(results);
    
    // 3. Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 4. Run mode-specific logic
    if (onFrame) {
      onFrame(ctx, results, canvas.width, canvas.height, drawingUtils);
    }
  }
  requestAnimationFrame(loop);
};
```

### Coordinate System

All coordinates are normalized (0-1) for resolution independence:

```typescript
// Convert normalized to screen coordinates
const screenX = normalizedX * window.innerWidth;
const screenY = normalizedY * window.innerHeight;

// Convert normalized to canvas coordinates
const canvasX = normalizedX * canvas.width;
const canvasY = normalizedY * canvas.height;
```

**Important:** Video is mirrored (`transform: scaleX(-1)`) for natural interaction.

### State Management

The application uses React's built-in state management:

```typescript
// App.tsx - Global state
type AppState = 'onboarding' | 'menu' | 'game';
type GameMode = 'calibration' | 'free' | 'pre-writing';

const [appState, setAppState] = useState<AppState>('onboarding');
const [gameMode, setGameMode] = useState<GameMode>('free');
```

Mode-specific state is managed within each feature module using module-level variables (for frame-by-frame logic) and React state (for UI updates).

---

## Performance Requirements

### Target Metrics

| Metric | Target | Minimum |
|--------|--------|---------|
| Frame Rate | 60 fps | 30 fps |
| Detection Latency | <50ms | <100ms |
| Time to Interactive | <3s | <5s |
| Bundle Size (gzipped) | <150KB | <200KB |

### Optimization Strategies

1. **GPU Delegation:** MediaPipe runs on WebGL for faster inference
2. **Single Hand Mode:** Reduces computation by tracking only one hand
3. **Canvas Rendering:** Direct canvas manipulation vs. DOM updates
4. **Module-Level State:** Avoids React re-renders for frame-by-frame updates
5. **Smoothing Filter:** Reduces jitter without expensive post-processing

### Browser Support

| Browser | Version | Support Level |
|---------|---------|---------------|
| Chrome | 90+ | Full |
| Firefox | 90+ | Full |
| Safari | 15+ | Full |
| Edge | 90+ | Full |
| Mobile Chrome | 90+ | Partial* |
| Mobile Safari | 15+ | Partial* |

*Mobile support limited by camera permissions and performance

---

## Future Roadmap

### Phase 2: Enhanced Education
- [ ] Letter tracing (A-Z)
- [ ] Number tracing (0-9)
- [ ] Shape recognition and feedback
- [ ] Progress tracking and reporting

### Phase 3: Multiplayer
- [ ] Two-hand tracking
- [ ] Collaborative canvas
- [ ] Turn-based games

### Phase 4: Customization
- [ ] Custom color palettes
- [ ] Background themes
- [ ] Sound effects and music
- [ ] Accessibility options

### Phase 5: Platform Expansion
- [ ] PWA support
- [ ] Electron desktop app
- [ ] Smart TV apps
- [ ] Classroom management dashboard

---

## Appendix

### A. MediaPipe Hand Landmarks Reference

```
                    [4] Thumb Tip
                   /
              [3] /
             /   /
        [2] /   /
       /   /   /
  [1] /   /   /
     /   /   /
[0] Wrist

Index Finger: [5] → [6] → [7] → [8] (tip) ← PRIMARY INTERACTION
Middle Finger: [9] → [10] → [11] → [12]
Ring Finger: [13] → [14] → [15] → [16]
Pinky: [17] → [18] → [19] → [20]
```

### B. Error Handling

| Error | Handling |
|-------|----------|
| Camera denied | Show permission request UI |
| MediaPipe load fail | Retry with fallback CDN |
| Hand lost | End current stroke, show "no hand" indicator |
| Low frame rate | Reduce detection frequency |

### C. Testing Checklist

- [ ] Wave detection works consistently
- [ ] Mode selection responds to hover
- [ ] Drawing strokes appear smoothly
- [ ] Tracing progress updates correctly
- [ ] Bubble collision detection accurate
- [ ] Adult gate requires full hold duration
- [ ] Clear canvas removes all strokes
- [ ] Mode transitions are smooth
- [ ] No memory leaks in long sessions

---

*Document maintained by the Draw in the Air development team.*

