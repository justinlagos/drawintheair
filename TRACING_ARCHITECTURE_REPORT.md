# Tracing Mode V2 Architecture Report

**Generated:** 2026-06-19  
**Codebase:** React 19 + TypeScript + Vite + MediaPipe  
**Status:** Production architecture for major UI/UX overhaul planning  

---

## Executive Summary

The Tracing Mode subsystem is organized into five core modules plus auxiliary services. The architecture separates canvas rendering/game logic (`tracingLogicV2.ts`, 1362 lines) from UI shell (`TracingMode.tsx`), content definitions (`tracingContent.ts`), progress tracking (`tracingProgress.ts`), and HUD helpers (`tracingUI.ts`). All rendering occurs on a shared canvas within a `TrackingLayer`, driven by `tracingLogicV2` (the per-frame callback). Hand-tracking coordinates (pinch state, finger position) flow from `frameData` (type `TrackingFrameData`) passed from the camera subsystem.

---

## 1. Canvas & Render Loop

### Canvas Location & Lifecycle
- **Canvas parent:** `<TrackingLayer>` (src/features/tracking/TrackingLayer.tsx)
- **Not in TracingMode.tsx:** The UI shell (TracingMode.tsx) contains only HUD overlays (gameTopBar, kid panels, celebration). The actual `<canvas>` lives in `TrackingLayer`.
- **Rendering:** Per-frame callback is `tracingLogicV2` (exported from tracingLogicV2.ts, **line 282**).

### Per-Frame Logic Entry Point

```typescript
export const tracingLogicV2 = (
    ctx: CanvasRenderingContext2D,
    frameData: TrackingFrameData,
    width: number,
    height: number,
    _drawingUtils: DrawingUtils | null
): void => { ... }
```

**Location:** `/src/features/modes/tracing/tracingLogicV2.ts`, **lines 282–1345**

**Inputs:**
- `ctx`: 2D canvas context (ready for drawing)
- `frameData.filteredPoint`: Hand position (normalized 0-1, already smoothed by Kalman filter)
- `frameData.pinchActive`: Boolean indicating if user is pinching
- `frameData.timestamp`: Frame timestamp (for timing-based features)
- `frameData.hasHand`: Whether hand was detected this frame
- `width`, `height`: Canvas dimensions in pixels

**Control Flow:**
1. Update internal `tracingState` canvas size if viewport changed (line 288–290)
2. Load current path if not already loaded (line 293–295)
3. **Draw path** (line 321): `drawPath(ctx, path, width, height, tracingState.progress, tracingState.onPath, ...)`
4. **Stuck-recovery scaffolding** (line 326–335): Render glowing "ghost ahead" hint if kid is idle
5. **Pinch state machine** (line 336–360): Track grace window when pinch is lost (200ms tolerance)
6. **Progress evaluation** (line 377–835): Calculate nearest point on path, evaluate on/off status, update progress
7. **Draw follow-ball** (line 836–838): Render the tracker cursor at finger position
8. **Completion check** (line 840–848): Fire callback if progress >= completionPercent
9. **Draw UI elements:** start dot, end target, off-path hint, idle hint, sparkle trail (lines 850–1300+)

### requestAnimationFrame Integration
- **Caller:** `TrackingLayer` (via MediaPipe's hand detection loop)
- **No explicit rAF here:** The parent `TrackingLayer` drives the camera frame loop and calls `tracingLogicV2` as a callback per video frame (~30 fps typical)

---

## 2. tracingLogicV2.ts Core Module (1362 lines)

### Exported Functions

```typescript
// Lifecycle
export const initializeTracing = (width: number, height: number): void
export const reloadCurrentPath = (): void
export const setCompletionCallback = (callback: (() => void) | null): void

// Queries
export const getTracingState = (): TracingState
export const tracingLogicV2 = (ctx, frameData, width, height, _drawingUtils): void

// Navigation
export const resetLevel = (): void                    // Reset to start of current path
export const nextLevel = (): boolean                  // Advance to next path (returns true if more levels)
```

**Location: Line ranges**
- `initializeTracing`: **line 130–135**
- `setCompletionCallback`: **line 110–112**
- `tracingLogicV2` (main): **lines 282–1345**
- `getTracingState`: **line 1346**
- `resetLevel`: **line 1351–1353**
- `nextLevel`: **line 1356–1361**

### Internal State Object (`TracingState`)
**Location:** **lines 30–106**

```typescript
export interface TracingState {
    path: TracingPath | null;
    progress: number;                      // 0-1 along path
    isPaused: boolean;
    isCompleted: boolean;
    onPath: boolean;
    nearestDistance: number;               // pixels from finger to nearest path point
    accuracy: number;                      // 0-1 (time on path / total time)
    timeOnPath: number;
    timeOffPath: number;
    retries: number;
    
    // Finger tracking
    lastFingerPos: { x: number; y: number } | null;
    lastPathPosition: number;              // T value (0-1) along path from last frame
    
    // Pinch state machine
    pinchLostTime: number | null;          // Timestamp when pinch was lost
    offPathStartTime: number | null;       // When user went off-path
    
    // Streak system (if flag enabled)
    streakMeter: number;                   // 0-1, builds on-path, decays off-path
    streakStartTime: number | null;
    streakActive: boolean;
    
    // Any-direction tracing
    reverseDirection: boolean;              // Kid started from back end of path
    directionLocked: boolean;               // Direction fixed after first contact
    
    // Sparkle trail particles
    sparkleParticles: Array<{ x, y, life, maxLife }>;
}
```

### Drawing Functions (Internal)

#### `drawPath()` — Main path visualization
**Location:** **lines 982–1122**

Draws the path in two layers:
1. **Ghost path** (faint background lane)
2. **Progress fill** (neon glow as user traces)

Key constants:
```typescript
const thicknessScale = 2.6;  // Line 997: Bumped from 2.0 on 2026-05-13
const tolerancePx = path.tolerancePx;  // From path definition (typically 18-24px)
```

Colors:
- **On-path progress:** `#5BCE9A` (meadow green) with cyan glow
- **Off-path progress:** `#FF9B7E` (warm peach) with orange glow
- **Ghost lane:** `rgba(80, 120, 200, 0.10)` (faint blue)

**Signature:**
```typescript
const drawPath = (
    ctx: CanvasRenderingContext2D,
    path: TracingPath,
    width: number,
    height: number,
    progress: number,       // 0-1
    onPath: boolean,
    perfConfig: { visualQuality: 'high' | 'low'; shadowBlurScale: number },
    reverseDirection: boolean = false
): void
```

#### `drawFollowBall()` — Tracker cursor
**Location:** **lines 839–895**

Renders a 3D glassy sphere that follows the finger:
- **Radius:** `Math.min(width, height) * 0.022` (~24px on 1080p)
- **On-path colors:** Cyan glow, white core
- **Off-path colors:** Orange glow, warm gradient
- **Pulse animation:** `baseR * (onPath ? 1 + 0.08 * pulse : 0.88)` where pulse varies with sine

#### `drawGhostAhead()` — Stuck recovery hint
**Location:** **lines 895–980**

When kid is idle (recovery level SOFT/MEDIUM/STRONG), renders a pulsing preview of the next 12–25% of the path:
```typescript
const aheadFraction = level === 'STRONG' ? 0.25 : level === 'MEDIUM' ? 0.18 : 0.12;
```

#### `drawStartDot()` and `drawEndTarget()`
**Location:** **lines 1123–1255**
- Green dot at path start
- Trophy/target at path end

#### `drawSparkleTrail()`
**Location:** **lines 1323–1340**
Trails sparkle particles behind the follow-ball as reward feedback

### Progress Evaluation Logic

**Location:** **lines 377–835**

Key algorithm steps:
1. **Find nearest point on path** (`findNearestPointOnPath`, line 195–270)
   - Returns: `{ nearestPoint, segmentT, overallT, distance }`
   - `overallT` = normalized 0-1 position along full path

2. **Direction lock** (lines 405–440)
   - At first valid on-path contact, check if `overallT` is in back half
   - If yes, set `reverseDirection = true` and reverse the points array rendering
   - Direction stays locked for the rest of the attempt

3. **On-path detection** (lines 442–495)
   - Check if distance ≤ `tolerance * toleranceMultiplier`
   - Tolerance multiplier = 1.15 for Packs 1–2 (softer), 1.0 for Packs 3–4
   - If off-path, start decay timer

4. **Progress update** (lines 497–650)
   - Only advance if new `overallT > lastPathPosition + minForwardMovement` (0.25%)
   - Max progress per frame = 0.5% (`maxProgressPerFrame = 0.005`)
   - Time-gated: min 80ms between updates (`minTimeBetweenProgressMs = 80`)
   - Off-path decay: if off > 700ms, progress drifts backward 0.05% per frame

5. **Accuracy tracking** (line 652–660)
   - `accuracy = timeOnPath / (timeOnPath + timeOffPath)`

6. **Completion trigger** (line 662–678)
   ```typescript
   if (tracingState.progress >= path.completionPercent && !tracingState.isCompleted) {
       tracingState.isCompleted = true;
       completeLevel(path.id, tracingState.accuracy);
       if (completionCallback) completionCallback();
   }
   ```

### Off-Path Handling

**Location:** **lines 700–800**

When user is off-path:
- Play tactile feedback (haptic buzz)
- Display "return to path" message card (if enabled)
- Decay progress slowly (not a hard reset)
- Render off-path hint (line 1256–1270): pulsing cyan "return" arrow

### Pinch State Machine

**Location:** **lines 336–360**

Grace window logic:
```typescript
const pinchGraceWindowMs = 200;  // Can lift pinch for 200ms without pausing
if (!isPinching) {
    if (tracingState.pinchLostTime === null) {
        tracingState.pinchLostTime = now;
    }
    const timeSincePinchLost = now - tracingState.pinchLostTime;
    if (timeSincePinchLost > pinchGraceWindowMs) {
        tracingState.isPaused = true;
    }
} else {
    tracingState.pinchLostTime = null;
    if (tracingState.isPaused) {
        tracingState.isPaused = false;
        // Start fresh segment
        tracingState.lastProgressUpdateTime = frameData.timestamp;
    }
}
```

### Streak System

**Location:** **lines 709–750** (if `featureFlags.tracingStreak` enabled)

Meter logic:
- Builds on-path: `streakMeter += 0.005 per frame`
- Decays off-path: `streakMeter -= 0.01 per frame`
- Caps at 0-1
- Sparkle effect when meter hits 1.0

---

## 3. tracingContent.ts — Path Definitions

**Location:** `/src/features/modes/tracing/tracingContent.ts`, **733 lines**

### TracingPath Type Definition
**Location:** **lines 15–24**

```typescript
export interface PathPoint {
    x: number;  // 0-1 normalized
    y: number;  // 0-1 normalized
}

export interface TracingPath {
    id: string;
    name: string;
    pack: number;             // 1-4
    level: number;
    points: PathPoint[];
    tolerancePx: number;      // Stroke width in pixels (18-24px typical)
    completionPercent: number; // e.g. 0.82 = must reach 82% to complete
    assistStrength: number;    // 0-1, magnetic attraction strength
}
```

### Pack Structure
**Location:** **lines 50–728** (four createXxxPack functions)

```typescript
// Pack 1: Warm-up Lines (6 activities)
createWarmupPack()  // Horizontal, Vertical, Diagonal L/R, Zigzag, Gentle Curve

// Pack 2: Shapes (10 activities)
createShapesPack()  // Circle, Square, Triangle, Star, Rectangle, etc.

// Pack 3: Letters A-Z (26 activities)
createLettersPack()  // A–Z, multi-stroke letters encoded as continuous polylines

// Pack 4: Numbers 1-9 (9 activities)
createNumbersPack()  // 1–9

export const ALL_TRACING_PATHS = createAllTracingPaths();  // line 715
```

### Multi-Stroke Letter Handling

Letters with multiple strokes (e.g., 'A': two diagonal legs + crossbar) are encoded as a **single polyline** with all points concatenated:
```typescript
// Letter A: two legs + crossbar
{ x: 0.5, y: 0 },    // Left leg start
{ x: 0, y: 1 },      // Left leg end
{ x: 0.5, y: 0 },    // Jump to right leg start (continuous path)
{ x: 1, y: 1 },      // Right leg end
{ x: 0.25, y: 0.5 }, // Crossbar start
{ x: 0.75, y: 0.5 }  // Crossbar end
```

The completion tolerance is set to ~0.82 to allow skipping the exact order; as long as 82% of total path length is traced, the letter completes.

### Concrete Examples

**Vertical line (Pack 1, Level 2):**
```typescript
{
    id: 'warmup-v1',
    name: 'Vertical Line',
    pack: 1,
    level: 2,
    points: center([
        { x: 0.5, y: 0 },
        { x: 0.5, y: 1 }
    ]),
    tolerancePx: 24,
    completionPercent: 0.82,
    assistStrength: 0.65
}
```

**Circle (Pack 2, Level 1):**
```typescript
{
    id: 'shape-circle',
    name: 'Circle',
    pack: 2,
    level: 1,
    points: center(circle(0.5, 0.5, 0.5, 40)),  // 40 segments
    tolerancePx: 18,
    completionPercent: 0.85,
    assistStrength: 0.55
}
```

---

## 4. tracingProgress.ts — Progression Tracking

**Location:** `/src/features/modes/tracing/tracingProgress.ts`

### API Functions

```typescript
export const getCurrentPath = (): TracingPath | null
export const getCurrentPackProgress = (): PackProgress
export const getAllPacksProgress = (): PackProgress[]
export const completeLevel = (pathId: string, accuracy: number): void
export const advanceToNextLevel = (): boolean          // Returns true if more levels
export const setCurrentLevel = (pack: number, levelIndex: number): void
export const unlockPack = (pack: number): void        // Admin override
export const resetProgress = (): void
export const getLevelProgress = (pathId: string): LevelProgress | null
export const isLevelUnlocked = (pathId: string): boolean
export const getCompletionStats = () => ({ totalLevels, completedLevels, completionPercent })
```

### Data Shapes

```typescript
export interface LevelProgress {
    pathId: string;
    completed: boolean;
    bestAccuracy: number;    // 0-1
    attempts: number;
    lastCompletedAt: number | null;
}

export interface PackProgress {
    pack: number;
    unlocked: boolean;
    completedLevels: number;
    unlockedLevelIndex: number;  // Index of highest unlocked level in pack
}

export interface TracingProgress {
    currentPack: number;
    currentLevelIndex: number;
    packs: Record<number, PackProgress>;
    levels: Record<string, LevelProgress>;
    createdAt: number;
    updatedAt: number;
}
```

### Storage
- Key: `'draw-in-the-air:tracing-v2:progress'`
- Persisted to `localStorage`
- Loaded on module init, saved on any change

### Unlock Logic

```typescript
const checkPackUnlocks = (): void => {
    // Pack 2 unlocks after 4 completions in Pack 1
    if (!currentProgress.packs[2].unlocked && currentProgress.packs[1].completedLevels >= 4) {
        currentProgress.packs[2].unlocked = true;
        currentProgress.packs[2].unlockedLevelIndex = 0;
    }
    // Pack 3 unlocks after 5 completions in Pack 2
    // Pack 4 unlocks after 6 completions in Pack 3
}
```

---

## 5. tracingUI.ts — HUD Helpers

**Location:** `/src/features/modes/tracing/tracingUI.ts`

### Exported Functions

```typescript
export const calculateHUDMetrics = (width: number, height: number): HUDMetrics
export const getPackInfo = (pack: number): { name: string; icon: string; description: string }
```

### HUDMetrics Shape

```typescript
export interface HUDMetrics {
    hudSpacing: string;     // 18px (mobile), 28px (tablet), 40px (desktop)
    hudPadding: string;
    hudRadius: string;
    isCompact: boolean;
    isMobile: boolean;
    isTablet: boolean;
    screenWidth: number;
    screenHeight: number;
}
```

### Responsive Breakpoints
```typescript
const isMobile = width <= 480;
const isTablet = width > 480 && width <= 1024;
const isLandscapePhone = width > height && height <= 500;
const isCompact = isMobile || isTablet || isLandscapePhone;
```

---

## 6. Feature Flags

**Location:** `/src/core/featureFlags.ts`

### Tracing-Relevant Flags

```typescript
export interface FeatureFlags {
    tracingStreak: boolean;      // Tracing streak meter + sparkle animations
    stickerRewards: boolean;     // Earn stickers on 'tracing-complete'
    narrator: boolean;           // Default TRUE (voice cues for idle hints)
    dynamicDifficulty: boolean;  // Adjust tolerance based on performance
    assistMode: boolean;         // Magnetic targets
}

const DEFAULT_FLAGS: FeatureFlags = {
    tracingStreak: false,        // OFF by default
    stickerRewards: false,       // OFF by default
    narrator: true,              // ON by default (flipped 2026-05-13)
    // ... others
};
```

### Reading/Setting Flags

```typescript
export const featureFlags = new FeatureFlagsManager();

featureFlags.getFlag('tracingStreak');           // returns boolean
featureFlags.setFlags({ tracingStreak: true });  // batch update
featureFlags.subscribe(listener);                 // listen for changes
```

### Adding a New Flag (Example: `tracingPlayfulUiV1`)

```typescript
// 1. Add to interface (featureFlags.ts, ~line 10)
export interface FeatureFlags {
    tracingPlayfulUiV1: boolean;  // New flag
    // ... others
}

// 2. Add to defaults (featureFlags.ts, ~line 30)
const DEFAULT_FLAGS: FeatureFlags = {
    tracingPlayfulUiV1: false,  // Default OFF (safe)
    // ... others
};

// 3. In dev, enable via URL
// ?flags=tracingPlayfulUiV1

// 4. Or set in code
featureFlags.setFlags({ tracingPlayfulUiV1: true });

// 5. Use in TracingMode.tsx
const playfulUiEnabled = featureFlags.getFlag('tracingPlayfulUiV1');
```

---

## 7. Analytics/Telemetry

**Location:** `/src/lib/observability/posthog.ts`

### PostHog API

```typescript
export function trackEvent(name: string, properties: Record<string, unknown> = {}): void
export function identifyPseudonymous(deviceId: string): void
export function resetPostHog(): void
export function initPostHog(): void
```

### Canonical Usage (Tracing Events)

```typescript
import { trackEvent } from '../../lib/observability';

// Event fires when level completes (tracingLogicV2.ts, line 673)
trackEvent('mode_completed', {
    game_mode: 'pre-writing',
    stage_id: path.id,
    duration_ms: completionTime
});

// Called by TracingMode.tsx on celebration finish
trackEvent('mode_completed', {
    game_mode: 'pre-writing',
    stage_id: getCurrentPath()?.id
});
```

### Allow-Listed Events for Tracing

```typescript
export const PH_EVENT_ALLOWLIST = new Set<string>([
    'mode_started',      // Fired by App.tsx handleModeSelect
    'mode_completed',    // Fired by tracingLogicV2 on completion
    'mode_abandoned',    // Fired when exiting via back button
    'stuck_detected',    // Fired by stuckRecovery service
    'activity_retry',    // Fired when user retries a path
    // ... others
]);

export const PH_PROPERTY_ALLOWLIST = new Set<string>([
    'game_mode',         // 'pre-writing'
    'stage_id',          // path.id
    'duration_ms',
    'attempt_count',
    'device_type',       // auto-populated
    'browser',           // auto-populated
    // ... others
]);
```

---

## 8. Performance Tier System

**Location:** `/src/core/perf.ts`

### Device Class Detection & Usage

```typescript
export interface PerfConfig {
    tier: 'low' | 'medium' | 'high';
    enableBackdropBlur: boolean;
    shadowBlurScale: number;      // 0.5 (low) to 1.0 (high)
    visualQuality: 'low' | 'high'; // affects tracingLogicV2 drawPath
}

const perf = {
    getConfig(): PerfConfig,
    updateTier(tier: 'low' | 'medium' | 'high'): void,
    // ...
};
```

### In tracingLogicV2

```typescript
const perfConfig = perf.getConfig();  // Line 306

drawPath(ctx, path, width, height, tracingState.progress, tracingState.onPath, perfConfig, ...);
//                                                         ↑
//                                                    passes perfConfig
```

perfConfig is used to:
- Disable shadow blur on low-end devices
- Reduce particle count
- Simplify animations

---

## 9. Design Tokens

**Location:** `/src/styles/tokens.ts`

### Structure

```typescript
export const colors = {
  skyBlue: '#EAF7FF',         // backgrounds
  meadowGreen: '#5BCE9A',     // success, on-path tracing
  limeGlow: '#7BD9A8',        // highlights
  deepPlum: '#8A66F0',        // primary text/buttons
  sunshine: '#FFC83D',        // rewards
  coral: '#F07A5C',           // warnings
  aqua: '#7BB6FF',            // progress, tracing paths
  // ... others
} as const;

export const semantic = {
  bgScene: colors.skyBlue,
  textPrimary: colors.charcoal,
  success: colors.meadowGreen,
  reward: colors.sunshine,
  progress: colors.aqua,
  // ... others
} as const;

export const fontSize = {
  display: 'clamp(2.75rem, 6vw, 4.5rem)',
  heading: 'clamp(1.75rem, 4vw, 2.75rem)',
  // ... others
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  // ... others
} as const;

export const radius = {
  sm: '8px',
  md: '14px',
  pill: '9999px',
  // ... others
} as const;

export const shadow = {
  panel: '0 6px 16px rgba(...), 0 2px 4px rgba(...)',
  button: '0 12px 28px rgba(...), 0 2px 4px rgba(...)',
  glow: '0 0 24px rgba(255, 200, 61, 0.45), ...',
  // ... others
} as const;

export const zIndex = {
  base: 0,
  scene: 1,
  hud: 200,       // HUD elements must be above canvas (z=100)
  modal: 1000,
  celebration: 10000,
  toast: 11000,
} as const;
```

Usage in TracingMode.tsx:
```typescript
import { tokens } from '../../../styles/tokens';

style={{ color: tokens.colors.deepPlum, fontSize: tokens.fontSize.button }}
style={{ zIndex: tokens.zIndex.hud }}
```

---

## 10. Reduced Motion & Accessibility

**Location:** Multiple files

### prefers-reduced-motion Handling

In `/src/components/Celebration.tsx`, line 66:
```typescript
const prefersReducedMotion = (): boolean => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};
```

In `/src/core/perf.ts`, line 218:
```typescript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

When reduced motion is detected:
- Celebration collapses to a simple fade (no parallax, no confetti)
- Streak meter animations disabled
- Transition duration set to ~10ms for instant appearance

---

## 11. Sound, Narration & Celebration

### Narrator (src/core/narrator.ts)

```typescript
export const narrate = (event: NarratorEvent, force: boolean = false): void
export const initNarrator = (): void
export const stopNarrator = (): void
export const narrateText = (text: string, opts?: { urgent?: boolean }): void
```

**Used by TracingMode.tsx:**
```typescript
// Line 79–80
if (featureFlags.getFlag('narrator')) {
    narrate('mode_complete');  // Plays "Amazing work!" or similar
}
```

**Used by tracingLogicV2.ts:**
```typescript
// Line 332–333
if (recoveryLevel === 'MEDIUM' && lastSpokenRecoveryLevel !== 'MEDIUM') {
    narrate('idle');  // Prompts kid to return to path
}
```

### Toast Service (src/core/toastService.ts)

```typescript
export const showToast = (message: string, variant: 'success' | 'info' | 'warning' = 'success', durationMs = 2000): void
export const getRandomMotivation = (): string
```

**Used by TracingMode.tsx, line 79:**
```typescript
showToast(getRandomMotivation(), 'success', 1500);
```

### Celebration (src/components/Celebration.tsx)

```typescript
export const Celebration = ({
    show: boolean,
    message: string,
    subMessage?: string,
    icon?: string,
    duration?: number,           // default 2500ms
    onComplete?: () => void,      // Called after duration expires
    showConfetti?: boolean,
    soundEffect?: boolean,
    stars?: 0 | 1 | 2 | 3,       // Star earn animation
}): ReactNode
```

**Used by TracingMode.tsx, lines 68–72:**
```typescript
<Celebration
    show={showCelebration}
    message="Great job!"
    icon="⭐"
    stars={1}
    duration={1500}
    onComplete={handleCelebrationDone}
/>
```

### Sticker Book (src/core/stickerBook.ts)

```typescript
export const earnSticker = (type: 'tracing-complete' | ...): Sticker | null
export const getAllStickers = (): Sticker[]
export const placeSticker = (stickerId: string, x: number, y: number): boolean
```

**Used by TracingMode.tsx, line 81:**
```typescript
if (stickerEnabled) {
    earnSticker('tracing-complete');
}
```

---

## 12. Mode Routing & Production Entry

### How TracingMode is Wired (src/App.tsx)

**Line 514:**
```typescript
{gameMode === 'pre-writing' && (
    <PreWritingMode onExit={handleExitToMenu} />
)}
```

**Not:**
```
{gameMode === 'tracing' && <TracingMode ... />}
```

The mode is **named `pre-writing` in the enum**, not `tracing`. This is for historical/SEO reasons (the URL path is `/pre-writing` or `?mode=pre-writing`).

However, **TracingMode.tsx is the actual V2 tracing UI**. **PreWritingMode.tsx** is a legacy wrapper using `preWritingLogic` (a different, older system).

**To wire the new TracingMode:**

In `src/App.tsx`, **around line 514**, replace:
```typescript
{gameMode === 'pre-writing' && (
    <PreWritingMode onExit={handleExitToMenu} />
)}
```

With:
```typescript
{gameMode === 'pre-writing' && (
    <TracingMode onExit={handleExitToMenu} />
)}
```

And **import at the top** (around line 5):
```typescript
import { TracingMode } from './features/modes/tracing/TracingMode';
import { tracingLogicV2 } from './features/modes/tracing/tracingLogicV2';
```

Then **map the logic** in `getActiveLogic()` function (around **line 308**):
```typescript
case 'pre-writing':
    logic = tracingLogicV2;
    break;
```

### Mode Selection Menu

**src/features/menu/ModeSelectionMenu.tsx** lists all available modes. The "Tracing" / "Pre-Writing" button calls:
```typescript
onSelect('pre-writing');
```

This triggers **App.tsx line 251**:
```typescript
const handleModeSelect = useCallback((mode: GameMode) => {
    setAppState('game');
    setGameMode(mode);  // Sets to 'pre-writing'
});
```

---

## 13. Tests

**Location:** `/tests/` directory

No existing tracing-specific tests found. Test files present:
- `pkce.test.ts` — OAuth flow
- `sprint1-onboarding.test.ts` — Onboarding
- `sprint2-feedback.test.ts` — Feedback surveys
- `sprint3-personalisation.test.ts` — Personalization
- `billing-mapping.test.ts`, `ordering.test.ts`, etc.

**Recommendation:** Create `/tests/tracing.test.ts` for:
- Path completion logic (progress calculation)
- Pinch state machine
- Direction locking
- Off-path decay
- Streak meter behavior
- Pack unlock logic

---

## Summary Table: Key Exports & Line Ranges

| Module | Function | Purpose | Lines |
|--------|----------|---------|-------|
| tracingLogicV2.ts | `initializeTracing(w, h)` | Bootstrap tracing session | 130–135 |
| tracingLogicV2.ts | `tracingLogicV2(ctx, frameData, w, h)` | Per-frame rendering & logic | 282–1345 |
| tracingLogicV2.ts | `getTracingState()` | Query internal state | 1346 |
| tracingLogicV2.ts | `resetLevel()` | Reset to path start | 1351–1353 |
| tracingLogicV2.ts | `nextLevel()` | Advance to next path | 1356–1361 |
| tracingLogicV2.ts | `setCompletionCallback(fn)` | Register completion listener | 110–112 |
| tracingContent.ts | `ALL_TRACING_PATHS` | All 51 paths across 4 packs | 715 |
| tracingContent.ts | `getPathsByPack(pack)` | Filter paths by pack | 718–722 |
| tracingProgress.ts | `getCurrentPath()` | Get current path | Exported |
| tracingProgress.ts | `getCurrentPackProgress()` | Get pack progress | Exported |
| tracingProgress.ts | `completeLevel(pathId, accuracy)` | Mark level complete | Exported |
| tracingProgress.ts | `advanceToNextLevel()` | Advance progression | Exported |
| tracingUI.ts | `calculateHUDMetrics(w, h)` | Responsive layout | Exported |
| tracingUI.ts | `getPackInfo(pack)` | Pack metadata | Exported |
| TracingMode.tsx | `TracingMode({ onExit })` | UI shell (HUD overlays) | Component |
| featureFlags.ts | `featureFlags.getFlag('tracingStreak')` | Query flag | Exported manager |
| narrator.ts | `narrate(event)` | Speak audio cue | Line 200 |
| toastService.ts | `showToast(msg, variant, dur)` | Brief notification | Exported |
| stickerBook.ts | `earnSticker(type)` | Award sticker | Exported |
| posthog.ts | `trackEvent(name, props)` | Analytics event | Exported |

---

## Architecture Strengths for UX Overhaul

1. **Clean separation:** Drawing logic (`tracingLogicV2`) is completely decoupled from UI shell (`TracingMode`)
2. **Modular paths:** Content is data-driven (`tracingContent`), easy to add/modify
3. **Extensible state:** `TracingState` interface is well-defined, simple to add new fields
4. **Feature-gated:** All major features (narrator, stickers, streak) are behind feature flags
5. **Responsive design:** HUD metrics calculated once per screen size, easy to tweak
6. **Accessible:** prefers-reduced-motion respected, narrator can be disabled

## Recommended Entry Point for Overhaul

1. **Start in `TracingMode.tsx`** (lines 1–543): Replace the HUD layout and styling while keeping the progress callback intact
2. **Use tokens.ts** for all new colors/sizes (no hard-coded values)
3. **Check feature flags** before adding new UI features
4. **Test on `tracingLogicV2`** with different device tiers via perf.getConfig()
5. **Update tests/** with regression coverage once UI is stable

---

