# Draw in the Air

An interactive hand-tracking drawing and learning application for kids, built with React 19, TypeScript, and Vite.

## Features

### 🎨 Free Paint Mode
- Draw anything with your finger in the air
- Multiple colors and brush sizes
- Smooth stroke rendering with glow effects
- **Pinch-to-draw**: Pinch thumb and index finger to draw, open hand to pause

### ✏️ Tracing Mode
- Trace shapes and letters (A-Z)
- Visual feedback for staying on path
- Progress tracking and celebrations
- **Pinch-to-draw**: Only draws when pinching

### 🫧 Bubble Pop
- 30-second timed game
- Pop bubbles by touching them
- 20-pop milestone reward
- Unlock system for achievements

### 🗂️ Sort and Place
- Grab objects by pinching
- Sort by color, size, or category
- Drag-and-drop gameplay
- Three rounds with increasing difficulty

## Interaction Model

### Pinch-to-Draw
The app uses a **pinch gesture** for drawing and interaction:
- **Pinch** (thumb and index finger close together) = Pen down (drawing/grabbing)
- **Open hand** = Pen up (paused/not drawing)

This prevents accidental drawing when resting your hand and gives clear control over when marks are made.

### Unmirrored Camera
The app uses an **unmirrored coordinate system**:
- Left is left, right is right (natural movement)
- All text renders normally (not reversed)
- Coordinates map directly from MediaPipe to screen

## Tech Stack

- **React 19** + **TypeScript** + **Vite**
- **MediaPipe Tasks Vision** (`@mediapipe/tasks-vision`) with HandLandmarker
- **One Euro Filter** for low-latency smoothing
- **Quadratic Bezier curves** for smooth stroke rendering
- **Canvas API** for drawing

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build
```

## Privacy & Safety

- **No video storage**: Camera frames are processed locally and never stored
- **No external links**: Child mode has no external links
- **Adult gate**: Settings and exit require adult verification
- **Client-side only**: All processing happens in the browser

## Performance

- **60fps rendering**: Smooth animation loop
- **30fps tracking**: Efficient hand detection
- **No React per-frame updates**: Uses refs to avoid rerenders
- **Optimized filtering**: One Euro Filter for responsive smoothing

## Browser Requirements

- Modern browser with WebRTC support
- Camera access permissions
- Recommended: Chrome, Edge, or Safari (latest versions)

## License

Private project - All rights reserved
 
