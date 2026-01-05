# Word Search Module

## Overview

The Word Search module is a self-contained game mode for Draw In The Air. It provides a word search puzzle experience where players use hand tracking to select words by pinching and dragging across tiles.

## Module Structure

```
src/features/modes/wordSearch/
├── WordSearchMode.tsx          # Main component (UI + integration)
├── wordSearchLogic.ts          # Per-frame selection + matching logic
├── wordSearchGenerator.ts      # Grid generation + word placement
├── wordSearchTypes.ts          # Type definitions
├── wordSearchAssets.ts         # Themes, word sets, icons
├── wordSearchRender.ts         # Canvas rendering helpers
├── wordSearchConstants.ts      # Tuning values
└── README.md                   # This file
```

## Public API

### Exports

**From `WordSearchMode.tsx`:**
- `WordSearchMode` (default export) - React component
- `WordSearchSettings` (type export) - Settings interface

**No other files should be imported outside the module.**

## Integration Points

### 1. Mode Registration

In `src/features/menu/ModeSelectionMenu.tsx`:
- Add `'word-search'` to `GameMode` type
- Add entry to `MODES` array with icon, title, description, gradient

### 2. App Integration

In `src/App.tsx`:
- Import `WordSearchMode` and `wordSearchLogic`
- Add `'word-search'` case to `getActiveLogic()` function
- Add `'word-search'` case to game mode rendering
- Add `wordSearchLogic` to `onFrame` callback

### 3. Logic Function

The `wordSearchLogic` function is registered with `TrackingLayer`'s `onFrame` callback. It's a no-op since Word Search uses its own canvas, but it's required for the architecture.

## Shared Dependencies

The module depends on these shared systems:

1. **Interaction State** (`src/core/InteractionState.ts`)
   - Uses `filteredPoint` for hit testing
   - Uses `pinchActive` for selection state
   - Detects `pinchStart`/`pinchEnd` transitions

2. **Celebration Component** (`src/components/Celebration.tsx`)
   - Used for word found and round complete celebrations
   - Always centered on screen

3. **Adult Gate** (`src/features/safety/AdultGate.tsx`)
   - Settings modal triggered via `onSettings` callback
   - Exit to menu via `onExit` callback

4. **Tracking Layer** (`src/features/tracking/TrackingLayer.tsx`)
   - Receives `TrackingFrameData` with filtered points
   - Coordinates are already mirrored

## Extraction Guide

To extract this module to a separate project:

### 1. Copy Files

Copy the entire `src/features/modes/wordSearch/` directory.

### 2. Copy Shared Dependencies

Copy these files (or adapt to your system):
- `src/core/InteractionState.ts` (or equivalent interaction state provider)
- `src/components/Celebration.tsx` (or equivalent celebration component)
- `src/features/safety/AdultGate.tsx` (or equivalent settings/exit component)
- `src/core/filters/OneEuroFilter.ts` (used by InteractionState)

### 3. Adapt Integration

In your host application:

1. **Create a logic function** that matches the signature:
   ```typescript
   const wordSearchLogic = (
     ctx: CanvasRenderingContext2D,
     frameData: TrackingFrameData,
     width: number,
     height: number,
     drawingUtils: any
   ) => {
     // No-op for Word Search (uses own canvas)
   };
   ```

2. **Register the mode** in your mode selection:
   ```typescript
   type GameMode = 'word-search' | ...;
   
   const MODES = [
     {
       id: 'word-search',
       title: 'Word Search',
       description: 'Find hidden words',
       icon: '🔍',
       gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
     },
     // ... other modes
   ];
   ```

3. **Render the component**:
   ```typescript
   {gameMode === 'word-search' && (
     <WordSearchMode 
       frameData={frameData}
       showSettings={showSettings}
       onCloseSettings={() => setShowSettings(false)}
     />
   )}
   ```

4. **Provide frame data**:
   - The component expects `TrackingFrameData` with:
     - `filteredPoint: { x: number; y: number } | null`
     - `pinchActive: boolean`
     - `hasHand: boolean`
   - Coordinates should be normalized (0-1) and mirrored if needed

### 4. Expected Host API

The module expects the host to provide:

```typescript
interface TrackingFrameData {
  filteredPoint: { x: number; y: number } | null;
  pinchActive: boolean;
  hasHand: boolean;
  // ... other fields optional
}
```

## Settings

The module supports the following settings (via Adult Gate):

- **Difficulty**: `'easy'` (6x6) or `'standard'` (8x8)
- **Theme**: `'animals'`, `'colours'`, or `'family'`
- **Sound**: Enable/disable sound effects
- **Backward Words**: Allow matching words backwards (Standard only)
- **Reduce Motion**: Disable confetti and extra animations

## Game Mechanics

### Selection

1. **Pinch Start**: Anchors selection at tile under cursor
2. **Pinch Active**: Builds straight-line path from anchor to current tile
   - Direction quantized to 8 directions
   - Dwell smoothing prevents jitter (100ms or 2 stable frames)
3. **Pinch End**: Checks if selection matches a word
   - Forward matching always enabled
   - Backward matching if enabled in settings

### Word Matching

- Only valid words from the word list register
- Found words cannot be found again
- Tiles are locked when word is found
- Round completes when all words are found

### Rendering

- Grid rendered on dedicated canvas
- Tiles have rounded corners, soft shadows, hover glow
- Selection path highlighted with glowing corridor
- Found words have locked highlight style

## Performance

- No per-frame React `setState` for hover or cursor
- Uses refs for `hoverTileId`, `anchorTileId`, `selectionPath`, `foundTileIds`
- State updates only on:
  - Word found
  - Round start/reset
  - Settings change
- Render loop via `requestAnimationFrame` (60 FPS)

## Testing

### Interaction Stability
- Dragging across tiles produces stable straight path, no flicker
- Releasing pinch selects reliably
- Tracking loss cancels selection without random word matches

### Correctness
- Only valid words register
- Found words cannot be found again
- Backwards matching only when enabled

### UX
- Rewards are centered and consistent
- Easy mode is usable for 4-5 year olds (large tiles, fewer words)

### Extractability
- Removing `src/features/modes/wordSearch/` and removing one menu registration entry compiles cleanly
- No other modules import wordSearch internals

## Notes

- The module is designed to be completely self-contained
- All word sets and assets are internal to the module
- No coupling to FreePaint, PreWriting, or other mode-specific code
- Only imports from shared core systems and components

