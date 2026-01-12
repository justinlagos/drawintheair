# Free Paint Mode Architecture

## Overview

Free Paint is a hand-tracked drawing mode that allows users to draw in mid-air using webcam tracking. This document maps the architecture for the AIR PAINT PRO upgrade.

## Entry Point

**File**: `src/App.tsx`
- **Line 230-231**: FreePaintMode component rendered when `gameMode === 'free'`
- **Line 110**: `freePaintLogic` assigned as active logic callback
- **Line 167**: TrackingLayer calls `onFrame={activeLogic}` which becomes `freePaintLogic`

## Router Mapping

**File**: `src/App.tsx`
- No external router - uses React state (`appState`, `gameMode`)
- Mode selection via `ModeSelectionMenu` component
- `handleModeSelect` callback sets `gameMode` and `appState='game'`
- When `gameMode === 'free'`, FreePaintMode is rendered

## Canvas Render Loop

**File**: `src/features/tracking/TrackingLayer.tsx`
- **Line 371**: `renderLoop` function runs at 60 FPS via `requestAnimationFrame`
- **Line 416**: Calls `onFrame(ctx, frameData, width, height, drawingUtils)`
- **Line 413**: Clears canvas each frame: `ctx.clearRect(0, 0, canvas.width, canvas.height)`
- Canvas size matches video dimensions (lines 397-405)

**Render Flow**:
1. Detection loop (separate, variable FPS based on perf tier) updates `latestInteractionStateRef`
2. Render loop reads `lastFrameDataRef.current` (updated by detection loop)
3. Render loop clears canvas and calls `onFrame` callback
4. `freePaintLogic` receives context and renders strokes

## Stroke Logic

**File**: `src/features/modes/freePaintLogic.ts`
- **Line 16**: `freePaintLogic` function signature - receives ctx, frameData, width, height
- **Line 24**: Extracts `filteredPoint`, `filteredThumbTip`, `penDown`, `confidence`, `timestamp` from frameData
- **Line 59-66**: When `penDown && filteredPoint`, calls `drawingEngine.processPoint()`
- **Line 73**: Calls `drawingEngine.render(ctx, width, height)` to draw all strokes

**File**: `src/core/drawingEngine.ts`
- **Line 111**: `processPoint()` - processes tracking point, manages pen state
- **Line 119**: Uses `PenStateManager` to detect pinch and determine pen state
- **Line 147**: `startStroke()` - creates new stroke, resets filter
- **Line 170**: `addPointInternal()` - adds point to current stroke with filtering and resampling
- **Line 329**: `render()` - draws all committed strokes using Catmull-Rom splines
- **Line 58**: Strokes stored in `private strokes: Stroke[]` array

**Stroke Data Flow**:
1. `TrackingLayer` → `InteractionState` → `filteredPoint` (One Euro filter applied)
2. `freePaintLogic` → `drawingEngine.processPoint(filteredPoint, ...)`
3. `PenStateManager` detects pinch → returns `stroke_start`, `stroke_continue`, or `stroke_end`
4. `drawingEngine` adds points to `currentStroke` with resampling
5. `drawingEngine.render()` draws all strokes from `strokes[]` array

## Cursor and Pinch Logic

**File**: `src/features/tracking/TrackingLayer.tsx`
- **Line 148**: `convertToFrameData()` converts `InteractionState` to `TrackingFrameData`
- **Line 271**: `interactionStateManager.process(results, timestamp)` processes MediaPipe results
- Provides: `filteredPoint`, `filteredThumbTip`, `penDown`, `confidence`, `predictedPoint`

**File**: `src/core/InteractionState.ts`
- Processes raw MediaPipe results
- Applies One Euro filter to index tip
- Detects pinch via `PenStateManager`
- Provides unified, stable interaction state

**File**: `src/core/PenStateManager.ts`
- **Line 72**: `detectPinch()` - measures distance between index tip and thumb tip
- **Line 91**: `process()` - determines pen state (UP/DOWN) based on pinch distance
- Uses hysteresis thresholds (`pinchDownThreshold`, `pinchUpThreshold`)
- Handles confidence gating and jump detection

**File**: `src/components/MagicCursor.tsx`
- Visual cursor component showing finger position
- Receives `x`, `y`, `penDown`, `confidence` props
- Rendered in `App.tsx` line 192-198
- Uses normalized coordinates (0-1 range)

## UI Overlay Components

**File**: `src/features/modes/FreePaintMode.tsx`
- **Line 99**: Main UI component - renders color palette, brush sizes, clear button
- **Line 100-101**: State for `activeColor` and `activeSize`
- **Line 118-126**: Handlers update `drawingEngine.setColor()` and `drawingEngine.setWidth()`
- **Line 171-223**: Color palette (left side on desktop, bottom-left on mobile)
- **Line 225-288**: Brush sizes (right side on desktop, bottom-right on mobile)
- **Line 290-383**: Bottom center - brush preview and clear button
- **Line 386-415**: First-time hint "Pinch to draw" (auto-fades)

All UI is DOM-based (no canvas), positioned absolutely with z-index layering.

## Data Flow Summary

```
MediaPipe Detection (TrackingLayer)
    ↓
InteractionState.process() → filteredPoint, penDown
    ↓
freePaintLogic() receives frameData
    ↓
drawingEngine.processPoint(filteredPoint, ...)
    ↓
PenStateManager detects pinch → stroke_start/continue/end
    ↓
drawingEngine adds points to currentStroke (with resampling)
    ↓
drawingEngine.render(ctx) → draws all strokes from strokes[] array
    ↓
Canvas displays strokes
```

## Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | Entry point, routing, mode selection |
| `FreePaintMode.tsx` | UI overlay (colors, brushes, clear) |
| `freePaintLogic.ts` | Frame callback - processes points and renders |
| `drawingEngine.ts` | Stroke storage, filtering, rendering |
| `TrackingLayer.tsx` | Canvas render loop, detection loop, frame data |
| `InteractionState.ts` | Unified interaction state, filtering |
| `PenStateManager.ts` | Pinch detection, pen state management |
| `MagicCursor.tsx` | Visual cursor feedback |

## Current Architecture Notes

- **Single Canvas**: One canvas in TrackingLayer, cleared each frame, all strokes redrawn
- **No Layering**: All strokes rendered together, no separate preview/committed layers
- **No Undo**: Strokes stored in array, no undo/redo system
- **Simple Rendering**: All strokes redrawn every frame via `drawingEngine.render()`
- **Filtering**: One Euro filter applied in InteractionState before reaching drawingEngine
- **Resampling**: Points resampled at fixed spacing (2-3px) for consistent density

## AIR PAINT PRO Upgrade Path

The upgrade will:
1. Add layered canvases (BaseCanvas, PreviewCanvas, CursorCanvas)
2. Separate renderPoint (visuals) from filteredPoint (logic)
3. Add undo/redo system with memory management
4. Add paint tools (brushes, eraser, shapes, fill)
5. Add performance monitoring and adaptive quality
6. All behind feature flags (default OFF)

## Coordinate Mapping Flow

### Where Tracking Point Enters Free Paint

**File**: `src/features/tracking/TrackingLayer.tsx`
- **Line 252**: MediaPipe detection produces raw results (unmirrored)
- **Line 273**: `mirrorResults()` transforms landmarks: `x: 1 - x` (mirrors X coordinate)
- **Line 276**: `interactionStateManager.process(results, timestamp)` processes mirrored results
- **File**: `src/core/InteractionState.ts`
  - **Line 271**: Extracts index tip (landmark 8) and thumb tip (landmark 4) from mirrored landmarks
  - **Line 279**: Applies One Euro filter to index tip → `filteredPoint`
  - **Line 290**: Detects pinch via `PenStateManager` → `penDown`
- **File**: `src/features/tracking/TrackingLayer.tsx`
  - **Line 153**: `convertToFrameData()` converts `InteractionState` to `TrackingFrameData`
  - **Line 331**: Frame data (including `filteredPoint`, `penDown`) passed to `onFrame` callback
- **File**: `src/features/modes/freePaintLogic.ts`
  - **Line 34**: Extracts `filteredPoint`, `filteredThumbTip`, `penDown` from `frameData`
  - This is where tracking point **enters Free Paint logic**

### How Coordinates Get Mapped to Canvas

**Current Mapping Flow**:
1. **MediaPipe output** (normalized 0-1, unmirrored)
   - Landmark 8 (index tip): `{ x: 0.0-1.0, y: 0.0-1.0 }`
   - Origin: top-left, X: right is +, Y: down is +

2. **Mirroring** (`TrackingLayer.tsx` line 27, 273)
   - `mirrorX(x) = 1 - x` applied to all landmark X coordinates
   - Result: Mirrored normalized coordinates (0-1)

3. **Filtering** (`InteractionState.ts` line 279)
   - One Euro filter applied to mirrored index tip
   - Result: `filteredPoint` (normalized 0-1, mirrored, smoothed)

4. **Canvas Mapping** (`drawingEngine.ts` line 417, `coordinateUtils.ts` line 28)
   - `normalizedToCanvas(point, width, height)`:
     - `canvasX = point.x * width`
     - `canvasY = point.y * height`
   - Canvas size: Matches video dimensions (`TrackingLayer.tsx` line 410-413)
   - Result: Canvas pixel coordinates (no DPR scaling currently)

**Canvas Setup**:
- **File**: `src/features/tracking/TrackingLayer.tsx`
  - **Line 410-413**: Canvas width/height set to `videoWidth/videoHeight`
  - **Line 425**: Canvas cleared each frame: `ctx.clearRect(0, 0, canvas.width, canvas.height)`
  - **Line 509**: Canvas style uses `objectFit: 'cover'` (matches video element)

**Note**: Currently no devicePixelRatio scaling. Canvas size matches video size directly.

### Where Cursor is Drawn

**File**: `src/components/MagicCursor.tsx`
- **Props**: Receives `x`, `y` (normalized 0-1), `penDown`, `confidence`
- **Rendering**: DOM element positioned absolutely using CSS `left`/`top`
- **File**: `src/App.tsx`
  - **Line 176-178**: Cursor point selection:
    - If `airPaintEnabled` flag ON: Uses `filteredPoint` (for cursor)
    - Otherwise: Uses `indexTip` (raw point)
  - **Line 195-201**: `<MagicCursor>` component rendered with cursor point
  - **Line 196-197**: Position: `x={cursorPoint.x * 100}%`, `y={cursorPoint.y * 100}%`
  - **CSS**: Positioned using `position: fixed` with `left`/`top` as percentage

**Coordinate Space for Cursor**:
- Input: Normalized coordinates (0-1, mirrored)
- Output: CSS percentage (0-100%)
- Mapping: `left = x * 100%`, `top = y * 100%`
- **No canvas coordinate conversion** - uses normalized coordinates directly

### Where Strokes are Committed

**File**: `src/core/drawingEngine.ts`
- **Line 147**: `startStroke()` - Creates new stroke, adds to `strokes[]` array
- **Line 166**: `this.strokes.push(this.currentStroke)` - Stroke committed immediately on start
- **Line 226-228**: `addPointInternal()` - Adds points to `currentStroke.points[]` array
- **Line 297**: `endStroke()` - Sets `currentStroke = null` (stroke remains in `strokes[]`)

**Stroke Storage**:
- **File**: `src/core/drawingEngine.ts`
  - **Line 58**: `private strokes: Stroke[]` - Array of all committed strokes
  - **Line 59**: `private currentStroke: Stroke | null` - Active stroke being drawn
  - Strokes stored with normalized coordinates (0-1)

**Stroke Rendering**:
- **File**: `src/core/drawingEngine.ts`
  - **Line 329**: `render(ctx, width, height)` - Renders all strokes from `strokes[]` array
  - **Line 343-360**: Iterates through all strokes, renders each using Catmull-Rom splines
  - **Line 417**: Coordinate conversion: `point.x * width`, `point.y * height` (normalized → canvas pixels)
  - **File**: `src/features/modes/freePaintLogic.ts`
    - **Line 172-173**: Calls `drawingEngine.render(ctx, width, height)` every frame

**Stroke Lifecycle**:
1. **Pen Down** → `processPoint()` → `startStroke()` → Stroke added to `strokes[]`
2. **Pen Moving** → `processPoint()` → `addPointInternal()` → Points added to `currentStroke.points[]`
3. **Pen Up** → `processPoint()` → `endStroke()` → `currentStroke = null` (stroke remains in `strokes[]`)
4. **Every Frame** → `render()` → All strokes from `strokes[]` redrawn to canvas

**Note**: Currently all strokes redrawn every frame. No layered canvas system yet.
