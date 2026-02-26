# Responsive Audit

## Current Breakpoints

Defined in **App.css**:

```css
/* Mobile (phone) */
@media (max-width: 480px) {
  /* Phone layout */
}

/* Tablet (small) */
@media (min-width: 481px) and (max-width: 768px) {
  /* Tablet layout */
}

/* Desktop and large tablets */
@media (min-width: 769px) {
  /* Desktop layout */
}
```

### Current Coverage

| Screen Size | Breakpoint | Notes |
|------------|-----------|-------|
| Phone (320-480px) | ≤480px | iPhone SE, older Android |
| Small tablet (481-768px) | 481-768px | iPad mini, Galaxy Tab S7 (portrait) |
| Desktop (769px+) | ≥769px | iPad Pro, desktop, large Android |

## Identified Gaps

### Gap 1: No Large Screen / TV Breakpoint

**Problem**: Devices larger than 1440px (TV, ultra-wide desktop) not specifically handled.

- Large monitors (1440-2560px)
- TV displays (55"+, 4K)
- Ultra-wide monitors (32:9 aspect)

**Current behavior**: Falls back to desktop breakpoint, text/touch targets may be too small for viewing distance.

**Recommendation**: Add ≥1440px breakpoint.

### Gap 2: Ultra-Wide Aspect Ratios Not Addressed

**Problem**: Some layouts assume 16:9. Ultra-wide (32:9, 21:9) may break layout.

**Example**: Hand tracking view (camera canvas) may shrink in width inappropriately.

### Gap 3: HUD Elements Use Fixed Pixels, Not clamp()

**Current pattern** in App.css:

```css
.mode-button {
  font-size: 16px;
  padding: 12px 24px;
  width: 100px;
  height: 60px;
}
```

**Problem**: Fixed size doesn't scale with viewport. On TV (2560px wide), button looks tiny. On phone (320px wide), button may overflow.

**Better pattern** using CSS clamp():

```css
.mode-button {
  font-size: clamp(12px, 5vw, 24px);  /* Scale 5% of viewport, clamped 12-24px */
  padding: clamp(8px, 2vw, 20px) clamp(16px, 4vw, 40px);
  width: clamp(60px, 20vw, 200px);
  height: clamp(40px, 12vw, 80px);
}
```

### Gap 4: Camera Canvas May Shrink Too Small on Split-Screen

**Current pattern**:

```typescript
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
```

**Problem**: On split-screen (mobile side-by-side apps), `innerWidth` may be 50% of screen. Camera canvas becomes very narrow, hand tracking inaccurate.

**Recommendation**: Enforce minimum canvas dimensions:

```typescript
const MIN_CANVAS_WIDTH = 320;
const canvas = document.querySelector('canvas');
canvas.width = Math.max(window.innerWidth, MIN_CANVAS_WIDTH);
```

## Missing Safe Area Handling

### Current Safe Area Implementation

**App.css** already uses CSS env() variables:

```css
body {
  padding: env(safe-area-inset-top) env(safe-area-inset-right)
           env(safe-area-inset-bottom) env(safe-area-inset-left);
}
```

**Status**: ✓ Correct for notched phones (iPhone X+, Android with notches).

## Proposed New Breakpoint: TV/Large Screen (≥1440px)

### Changes

Add new breakpoint in App.css:

```css
@media (min-width: 1440px) {
  /* TV and large desktop */
}
```

### Specific Adjustments

| Element | Phone | Tablet | Desktop | TV |
|---------|-------|--------|---------|-----|
| **Font size** | 14px | 16px | 18px | 24-28px (×1.5) |
| **Button size** | 44px min | 48px min | 56px min | 60-80px min |
| **Padding** | 8px | 12px | 16px | 24px |
| **Touch target** | 44px | 48px | 56px | 72px |
| **Camera canvas** | Full height, constrain width | Centered, constrain size | Centered | Centered, large |

### TV-Specific Styles

```css
@media (min-width: 1440px) {
  h1 {
    font-size: clamp(24px, 6vw, 48px);
  }

  .mode-button {
    font-size: clamp(16px, 4vw, 32px);
    padding: clamp(12px, 3vw, 24px) clamp(24px, 5vw, 48px);
    min-width: 80px;
    min-height: 72px;
    border-radius: clamp(8px, 1vw, 16px);
  }

  .score-display {
    font-size: clamp(20px, 5vw, 40px);
  }

  canvas {
    max-width: 90vw;
    max-height: 90vh;
    margin: auto;
  }

  /* Ensure HUD doesn't block canvas */
  .hud-overlay {
    position: fixed;
    top: env(safe-area-inset-top);
    right: env(safe-area-inset-right);
    font-size: clamp(14px, 3vw, 24px);
  }
}
```

## Camera Canvas Sizing

### Current Implementation

**TrackingLayer.tsx**:

```typescript
const canvas = canvasRef.current;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
```

### Issues

1. **Split-screen**: Canvas width may be half of device width
2. **Orientation change**: Canvas resizes, clears, redraws (performance hit)
3. **Ultra-wide**: Canvas width >> height, hand tracking may feel off

### Improved Implementation

```typescript
function updateCanvasSize() {
  const canvas = canvasRef.current;

  // Ensure minimum size for accurate hand tracking
  const MIN_DIMENSION = 320;
  const width = Math.max(window.innerWidth, MIN_DIMENSION);
  const height = Math.max(window.innerHeight, MIN_DIMENSION);

  // Constrain aspect ratio for ultra-wide
  const MAX_ASPECT = 2.5;  // 2.5:1 wide
  const aspect = width / height;
  let finalWidth = width;
  let finalHeight = height;

  if (aspect > MAX_ASPECT) {
    // Ultra-wide: reduce width
    finalWidth = height * MAX_ASPECT;
  }

  // DPI scaling (already done, but ensure here)
  const dpr = window.devicePixelRatio;
  canvas.width = finalWidth * dpr;
  canvas.height = finalHeight * dpr;

  // CSS styling
  canvas.style.width = `${finalWidth}px`;
  canvas.style.height = `${finalHeight}px`;
}

window.addEventListener('resize', updateCanvasSize);
```

## Touch Target Sizes

### Current Button Sizes (Check App.css)

- Phone: Likely 44px or less
- Tablet: ~48px
- Desktop: ~56px

### Recommended Minimums (Touch Targets)

| Breakpoint | Min Touch Size |
|-----------|-----------------|
| Phone | 44px × 44px |
| Tablet | 48px × 48px |
| Desktop | 56px × 56px |
| TV | 72px × 72px |

### Audit Items

```css
.mode-button {
  min-width: clamp(44px, 15vw, 80px);
  min-height: clamp(44px, 10vw, 72px);
}

.nav-icon {
  width: clamp(40px, 12vw, 64px);
  height: clamp(40px, 12vw, 64px);
}

.debug-toggle {
  width: clamp(36px, 8vw, 48px);
  height: clamp(36px, 8vw, 48px);
}
```

## Aspect Ratio Handling

### Current Issue

App assumes roughly square or 16:9 aspect. Ultra-wide or ultra-tall displays not tested.

### Recommendation

Test on:
- Landscape phone (18:9, 20:9)
- Landscape tablet (16:10)
- Landscape desktop (16:9, 16:10, 21:9)
- Portrait phone (9:16, 19.5:9)
- Portrait tablet (4:3, 3:2)

Add responsive layout queries:

```css
@media (aspect-ratio > 2) {
  /* Ultra-wide */
  .camera-container {
    width: 70vw;
    height: 100vh;
  }
  .hud-sidebar {
    width: 30vw;
  }
}

@media (aspect-ratio < 0.8) {
  /* Ultra-tall (narrow phone) */
  .camera-container {
    width: 100vw;
    height: 70vh;
  }
  .hud-overlay {
    bottom: 0;
  }
}
```

---

## Implementation Checklist

- [ ] Add ≥1440px breakpoint in App.css
- [ ] Scale font sizes with clamp() for TV breakpoint (×1.5)
- [ ] Scale button sizes and touch targets for TV (min 72px)
- [ ] Increase padding on TV layout (24px baseline)
- [ ] Update camera canvas sizing to enforce minimum dimensions
- [ ] Add aspect ratio constraint (max 2.5:1 ultra-wide)
- [ ] Test split-screen mode: ensure canvas doesn't shrink below 320px
- [ ] Test orientation changes: verify smooth resize without flicker
- [ ] Test ultra-wide (32:9) and ultra-tall (9:16) aspect ratios
- [ ] Verify safe area env() variables work on iPhone (notch) and Android (system gestures)
- [ ] Audit all fixed-size HUD elements, convert to clamp()
- [ ] Verify button/touch targets meet WCAG 44px minimums on all breakpoints
- [ ] Test on device matrix: 320px phone, 768px tablet, 1440px desktop, 2560px TV
