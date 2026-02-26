# Draw in the Air: Comprehensive UI/UX Polish Spec & Visual Design System

**Version:** 1.0
**Target:** React + TypeScript + Vite, Canvas2D, CSS Variables
**Audience:** Kids 4-8, viewed at 1-3m distance (includes TV playback)
**Devices:** Tablet/mobile (touch) + TV (hand-tracking)

---

## A) VISUAL STYLE PILLARS

### 1. Toy-Like
- **Chunky, Rounded Forms:** All UI surfaces use soft corner radii (8px–24px minimum)
- **Proportional Balance:** Large touch targets, generous padding, nothing cramped
- **Material Presence:** Surfaces have weight and dimensionality, but not cartoonish exaggeration
- **Feedback:** Visual responses to interaction feel satisfying (press, bounce, glow)

### 2. Soft 3D
- **Gradient Direction:** Top-to-bottom, subtle (5–10% shift in lightness)
- **Inner Highlights:** 1–2px white/pale overlay at 8–12% opacity along top edges
- **Depth Layering:** No harsh shadows; instead, multiple soft layers (0.2–0.4 opacity black below)
- **Texture:** Smooth surfaces with gentle sheen, not matte or flat

### 3. Glossy
- **Specular Highlights:** White circles (upper-left quadrant) on interactive elements
- **Reflection:** Inset highlights simulate curved, light-catching surfaces
- **Polish:** Edges feel smooth; hover states refine the gloss effect (slight brightness increase)
- **No Matte:** Avoid dull or de-saturated finishes in primary UI

### 3. Readable
- **High Contrast:** Text always ≥4.5:1 against background (WCAG AA)
- **Large Baseline:** Minimum 16px body text on mobile, 24px HUD numbers for TV viewing
- **Clear Hierarchy:** Display text is 1.8–2.5x body text size
- **Generous Line Height:** 1.4 for body, 1.2 for headings prevents crowding

### 5. Calm
- **Muted Backgrounds:** Deep dark (#010C24) base, no bright field colors
- **Gentle Animations:** No rapid flashing; easing curves ease out (entry) and ease in (exit)
- **Breathing Space:** Don't cluster UI elements; use generous margins
- **Restrained Color:** Accents (#FFD93D, #00E5FF) are bright but deployed sparingly

### What to AVOID
- ❌ Busy multi-stop gradients (limit to 2–3 colors max)
- ❌ Neon overload (reserve #00E5FF for highlights and focus states only)
- ❌ Heavy box-shadow blur >20px (max 12px, typically 4–8px)
- ❌ Small text <14px on mobile, <24px effective size on TV
- ❌ Rapid flashing or seizure-inducing animations (<100ms cycles)
- ❌ Harsh error states (red tint only; no shaking >3px)

---

## B) DESIGN SYSTEM TOKENS

### Typography

**Font Stack:**
```css
--font-primary: 'Outfit', system-ui, -apple-system, sans-serif;
--font-mono: 'Courier New', monospace; /* For numbers in HUD */
```

**Scales (using clamp for fluid responsiveness):**

| Role | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Display | `clamp(1.5rem, 4vw, 2.5rem)` | 700 bold | 1.2 | Page titles, mode names |
| Heading | `clamp(1.125rem, 3vw, 1.75rem)` | 600 semibold | 1.2 | Section headers, card titles |
| Body | `clamp(0.875rem, 2vw, 1.125rem)` | 400 regular | 1.4 | Instructions, descriptions |
| Label | `clamp(0.75rem, 1.5vw, 1rem)` | 500 medium | 1.3 | Button text, mode labels |
| HUD | `clamp(0.75rem, 1.5vw, 1rem)` | 500 medium | 1.2 | Timers, scores; use mono for numbers |
| Small | `clamp(0.625rem, 1vw, 0.875rem)` | 400 regular | 1.3 | Footnotes, subtle guidance |

**Notes:**
- Always use `clamp()` to scale fluidly from mobile to TV viewports
- Do NOT set fixed `px` sizes on visible text elements
- `vw` breakpoint: ~375px mobile to ~1920px TV sets max sizes

### Colors

**Core Palette:**

| Name | Hex | Usage | Notes |
|------|-----|-------|-------|
| Primary | `#FFD93D` | Buttons, highlights, accents | Warm, inviting, toy-like |
| Secondary | `#00E5FF` | Focus states, active indicators, secondary accents | Bright but cool; use sparingly |
| Tertiary | `#FF6B9D` | Decorative accents, particle effects | Soft pink; secondary interactive elements |
| Success | `#4ADE80` | Positive feedback, "correct" states | Bright but not harsh |
| Warning | `#FBBF24` | Caution, non-critical alerts | Golden; matches primary mood |
| Error | `#F87171` | Invalid actions, mistakes | Soft red; avoid flashing |
| Background | `#010C24` | Main canvas/page background | Deep dark, no pure black |
| Surface | `rgba(255,255,255,0.06)` | Cards, panels, floating UI | Subtle frosted glass effect |
| Text Primary | `#FFFFFF` | Main body text | Pure white on dark background |
| Text Secondary | `rgba(255,255,255,0.75)` | Secondary text, disabled states | 75% opacity white |
| Text Muted | `rgba(255,255,255,0.5)` | Hints, placeholders | 50% opacity white |
| Border | `rgba(255,255,255,0.08)` | Card edges, dividers | Very subtle |
| Overlay Tint | `rgba(0,0,0,0.3)` to `rgba(0,0,0,0.5)` | Darkens modals, error overlays | Adjust opacity for purpose |

**CSS Variable Declaration (in `index.css`):**
```css
:root {
  /* Colors */
  --color-primary: #FFD93D;
  --color-secondary: #00E5FF;
  --color-tertiary: #FF6B9D;
  --color-success: #4ADE80;
  --color-warning: #FBBF24;
  --color-error: #F87171;
  --color-background: #010C24;
  --color-surface: rgba(255, 255, 255, 0.06);
  --color-text-primary: #FFFFFF;
  --color-text-secondary: rgba(255, 255, 255, 0.75);
  --color-text-muted: rgba(255, 255, 255, 0.5);
  --color-border: rgba(255, 255, 255, 0.08);
  --color-overlay: rgba(0, 0, 0, 0.3);

  /* Typography */
  --font-primary: 'Outfit', system-ui, -apple-system, sans-serif;
  --font-mono: 'Courier New', monospace;
  --text-display: clamp(1.5rem, 4vw, 2.5rem);
  --text-heading: clamp(1.125rem, 3vw, 1.75rem);
  --text-body: clamp(0.875rem, 2vw, 1.125rem);
  --text-label: clamp(0.75rem, 1.5vw, 1rem);
  --text-hud: clamp(0.75rem, 1.5vw, 1rem);
  --text-small: clamp(0.625rem, 1vw, 0.875rem);

  /* Line Heights */
  --line-height-body: 1.4;
  --line-height-heading: 1.2;
  --line-height-label: 1.3;
}
```

### Elevation (Shadows & Highlights)

**Purpose:** Create soft 3D toy-like appearance without heavy rendering overhead.

| Level | Outer Shadow | Inner Highlight | Use Case |
|-------|--------------|-----------------|----------|
| **sm** | `0 2px 4px rgba(0,0,0,0.2)` | `inset 0 1px 0 rgba(255,255,255,0.1)` | Small buttons, badge elements |
| **md** | `0 4px 12px rgba(0,0,0,0.3)` | `inset 0 1px 0 rgba(255,255,255,0.08)` | Standard cards, mode tiles |
| **lg** | `0 8px 24px rgba(0,0,0,0.4)` | `inset 0 2px 0 rgba(255,255,255,0.06)` | Modals, elevated panels |
| **xl** | `0 12px 32px rgba(0,0,0,0.5)` | `inset 0 2px 0 rgba(255,255,255,0.04)` | Hero panels, full-screen overlays |

**CSS Variables:**
```css
:root {
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.06);
  --shadow-xl: 0 12px 32px rgba(0, 0, 0, 0.5), inset 0 2px 0 rgba(255, 255, 255, 0.04);
}
```

### Spacing

| Scale | Value | Common Use |
|-------|-------|------------|
| **xs** | 4px | Tight padding, micro-spacing between elements |
| **sm** | 8px | Small padding, gaps between related items |
| **md** | 16px | Standard padding, standard gaps |
| **lg** | 24px | Large padding, section margins |
| **xl** | 32px | Extra-large margins, mode grid gaps |
| **2xl** | 48px | Page-level margins, hero spacing |

**CSS Variables:**
```css
:root {
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
}
```

### Border Radius

| Scale | Value | Use Case |
|-------|-------|----------|
| **sm** | 8px | Small interactive elements, buttons |
| **md** | 16px | Cards, standard panels, input fields |
| **lg** | 24px | Modal dialogs, large cards |
| **pill** | 9999px | Pill-shaped chips, circular badges |

**CSS Variables:**
```css
:root {
  --radius-sm: 8px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-pill: 9999px;
}
```

---

## C) HYPER-CASUAL 3D TREATMENT

### Buttons

**Primary Button:**
```css
.btn-primary {
  background: linear-gradient(180deg,
    hsl(48, 100%, 60%) 0%,
    var(--color-primary) 100%);
  color: var(--color-background);
  border: none;
  border-radius: var(--radius-sm);
  padding: var(--space-md) var(--space-lg);
  font-size: var(--text-label);
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--shadow-md);
  position: relative;
  transition: all 150ms ease-out;
  overflow: hidden;
}

.btn-primary::before {
  content: '';
  position: absolute;
  top: 1px;
  left: 10%;
  right: 10%;
  height: 1px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 50%;
}

.btn-primary:hover {
  transform: scale(1.03);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35),
              inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.btn-primary:active {
  transform: scale(0.97) translateY(1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transition: all 100ms ease-in;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
```

**Secondary Button:**
```css
.btn-secondary {
  background: transparent;
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
  border-radius: var(--radius-sm);
  padding: var(--space-md) var(--space-lg);
  font-size: var(--text-label);
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease-out;
}

.btn-secondary:hover {
  background: rgba(255, 217, 61, 0.1);
  transform: scale(1.03);
  box-shadow: 0 0 16px rgba(255, 217, 61, 0.2);
}

.btn-secondary:active {
  transform: scale(0.97);
  background: rgba(255, 217, 61, 0.15);
}
```

**Icon Button (Floating):**
```css
.btn-icon {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: all 150ms ease-out;
  color: var(--color-text-primary);
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 0 12px rgba(0, 229, 255, 0.15);
  transform: scale(1.05);
}

.btn-icon:active {
  transform: scale(0.95);
}
```

### Cards & Panels

**Base Card:**
```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  box-shadow: var(--shadow-md);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(16px);
}

/* Frosted glass effect for browsers that support it */
@supports (backdrop-filter: blur(1px)) {
  .card {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(16px);
  }
}

/* Fallback for low-tier devices */
@media (prefers-reduced-transparency: reduce) {
  .card {
    background: var(--color-surface);
    backdrop-filter: none;
  }
}

.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.08) 50%,
    transparent 100%);
  pointer-events: none;
}
```

**Elevated Card (on hover or selected state):**
```css
.card:hover {
  box-shadow: var(--shadow-lg);
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
  transition: all 200ms ease-out;
}
```

### Mode Tiles (FreePaint, Tracing, Bubbles, etc.)

**Base Tile:**
```css
.mode-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: clamp(100px, 25vw, 140px);
  height: clamp(100px, 25vw, 140px);
  min-width: 100px;
  min-height: 100px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(255, 255, 255, 0.04) 100%);
  border: 2px solid var(--color-border);
  padding: var(--space-md);
  cursor: pointer;
  transition: all 200ms ease-out;
  box-shadow: var(--shadow-md);
  gap: var(--space-sm);
}

.mode-tile svg {
  width: clamp(32px, 6vw, 48px);
  height: clamp(32px, 6vw, 48px);
  color: var(--color-primary);
}

.mode-tile-label {
  font-size: var(--text-label);
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: center;
  margin-top: var(--space-xs);
}

.mode-tile:hover {
  transform: scale(1.05);
  border-color: var(--color-primary);
  box-shadow: var(--shadow-lg), 0 0 20px rgba(255, 217, 61, 0.2);
  background: linear-gradient(135deg,
    rgba(255, 255, 255, 0.12) 0%,
    rgba(255, 255, 255, 0.06) 100%);
}

.mode-tile.selected {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-lg), 0 0 24px rgba(255, 217, 61, 0.3);
  background: linear-gradient(135deg,
    rgba(255, 217, 61, 0.15) 0%,
    rgba(255, 217, 61, 0.08) 100%);
}

.mode-tile:active {
  transform: scale(0.98);
}
```

### HUD Chips (Timer, Score, Lives)

**Pill-shaped, semi-transparent chip:**
```css
.hud-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-pill);
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  font-size: var(--text-hud);
  color: var(--color-text-primary);
  font-weight: 500;
}

.hud-chip-label {
  font-size: var(--text-small);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: var(--font-mono);
}

.hud-chip-value {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: var(--text-hud);
  color: var(--color-primary);
  min-width: 48px;
  text-align: right;
}

/* Animate value updates */
.hud-chip-value.pulse {
  animation: pulse-scale 200ms ease-out;
}

@keyframes pulse-scale {
  0% { transform: scale(1); }
  50% { transform: scale(1.08); }
  100% { transform: scale(1); }
}
```

### Cursor & Hand Indicator

**Toy-like Pointer (canvas-rendered, but styled reference):**
```css
.magic-cursor {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-pill);
  background: var(--color-primary);
  position: fixed;
  pointer-events: none;
  box-shadow: 0 0 16px rgba(255, 217, 61, 0.3), var(--shadow-md);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 100ms ease-out;
  z-index: 1000;
}

.magic-cursor::before {
  content: '';
  position: absolute;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  top: 4px;
  left: 4px;
}

.magic-cursor.drawing {
  width: 32px;
  height: 32px;
  background: var(--color-secondary);
  box-shadow: 0 0 24px rgba(0, 229, 255, 0.5), var(--shadow-md);
  animation: glow-pulse 1s ease-in-out infinite;
}

.magic-cursor.idle {
  animation: idle-pulse 2s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 24px rgba(0, 229, 255, 0.4), var(--shadow-md); }
  50% { box-shadow: 0 0 32px rgba(0, 229, 255, 0.6), var(--shadow-md); }
}

@keyframes idle-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}
```

### Modal Dialogs

**Base Modal:**
```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(4px);
  animation: fade-in 300ms ease-out;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  max-width: 90vw;
  max-height: 90vh;
  overflow: auto;
  box-shadow: var(--shadow-xl);
  animation: slide-up 300ms ease-out;
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  font-size: var(--text-heading);
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--space-lg);
}

.modal-body {
  font-size: var(--text-body);
  color: var(--color-text-secondary);
  line-height: var(--line-height-body);
  margin-bottom: var(--space-lg);
}

.modal-footer {
  display: flex;
  gap: var(--space-md);
  justify-content: flex-end;
  margin-top: var(--space-lg);
}
```

### Toast Notifications

```css
.toast {
  position: fixed;
  bottom: var(--space-lg);
  left: 50%;
  transform: translateX(-50%);
  padding: var(--space-md) var(--space-lg);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-lg);
  color: var(--color-text-primary);
  font-size: var(--text-body);
  z-index: 200;
  animation: toast-slide-up 300ms ease-out;
}

.toast.success {
  border-color: var(--color-success);
  box-shadow: 0 0 16px rgba(74, 222, 128, 0.2), var(--shadow-lg);
}

.toast.error {
  border-color: var(--color-error);
  box-shadow: 0 0 16px rgba(248, 113, 113, 0.2), var(--shadow-lg);
}

.toast.warning {
  border-color: var(--color-warning);
  box-shadow: 0 0 16px rgba(251, 191, 36, 0.2), var(--shadow-lg);
}

@keyframes toast-slide-up {
  from {
    transform: translateX(-50%) translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}
```

---

## D) MOTION & ANIMATION

### Timing Defaults

| Name | Duration | Common Use |
|------|----------|------------|
| **Fast** | 150ms | Micro-interactions (button hover, focus) |
| **Normal** | 250ms | Standard transitions (modals, mode switches) |
| **Slow** | 400ms | Page-level animations, entrance effects |

**CSS Variables:**
```css
:root {
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
}
```

### Easing Curves

| Name | Cubic Bezier | Use Case |
|------|--------------|----------|
| **ease-out** | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | Entry, button hover (natural deceleration) |
| **ease-in** | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | Exit, button release (natural acceleration) |
| **bounce** | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Success, pop, scale-up (overshoot) |
| **smooth** | `cubic-bezier(0.4, 0, 0.2, 1)` | Smooth transitions (standard material) |

**CSS Variables:**
```css
:root {
  --ease-out: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --ease-in: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Micro-interactions

**Button Hover:**
```css
.btn-primary:hover {
  transform: scale(1.03);
  transition: all var(--duration-fast) var(--ease-out);
}
```

**Button Press:**
```css
.btn-primary:active {
  transform: scale(0.97) translateY(1px);
  transition: all 100ms var(--ease-in);
}
```

**Mode Tile Hover:**
```css
.mode-tile:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-lg), 0 0 20px rgba(255, 217, 61, 0.2);
  transition: all 200ms var(--ease-out);
}
```

**HUD Chip Value Update:**
```css
.hud-chip-value.pulse {
  animation: pulse-scale var(--duration-normal) var(--ease-bounce);
}

@keyframes pulse-scale {
  0% { transform: scale(1); }
  50% { transform: scale(1.08); }
  100% { transform: scale(1); }
}
```

**Success State (Scale + Bounce):**
```css
.success-animation {
  animation: success-bounce var(--duration-normal) var(--ease-bounce);
}

@keyframes success-bounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
```

**Error State (Gentle Shake):**
```css
.error-shake {
  animation: shake-error 300ms ease-in-out;
}

@keyframes shake-error {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  50% { transform: translateX(3px); }
  75% { transform: translateX(-3px); }
}
```

**Reduced Motion Fallback:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
  }
}
```

---

## E) PER-MODE VISUAL UPGRADES

### Free Paint Mode

**Canvas & Background:**
```css
.free-paint-container {
  background: var(--color-background);
  position: relative;
  overflow: hidden;
}

.free-paint-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  box-shadow: inset 0 0 80px rgba(0, 0, 0, 0.4);
  z-index: 10;
}
```

**Stroke Rendering (Canvas2D):**
- Use `lineCap = 'round'` and `lineJoin = 'round'` (already set)
- Stroke width: adaptive (6px–16px based on hand speed and device DPI)
- Glow effect: Single pass post-processing (low blur, ~4px)
  ```javascript
  // In canvas context
  ctx.shadowColor = 'rgba(0, 229, 255, 0.4)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ```

**Tool UI Panel (Floating):**
```css
.free-paint-toolbar {
  position: fixed;
  bottom: var(--space-lg);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-pill);
  backdrop-filter: blur(12px);
  z-index: 50;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.toolbar-button {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: transparent;
  border: none;
  color: var(--color-text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms ease-out;
}

.toolbar-button:hover {
  background: rgba(255, 217, 61, 0.15);
  color: var(--color-primary);
}

.toolbar-button.active {
  background: var(--color-primary);
  color: var(--color-background);
}
```

### Tracing Mode

**Path Visualization:**
```css
/* Reference for canvas-rendered paths */
.tracing-path {
  /* Dotted line: 4px dot, 8px gap */
  stroke-dasharray: 4 8;
  stroke: var(--color-secondary);
  opacity: 0.3;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.tracing-path.active-segment {
  stroke: var(--color-secondary);
  opacity: 0.8;
  animation: path-pulse 0.6s ease-in-out infinite;
}

.tracing-path.close-enough {
  stroke: var(--color-secondary);
  opacity: 0.6;
  transition: opacity 200ms ease-out;
}

@keyframes path-pulse {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}
```

**Progress Ring (Level Indicator):**
```css
.level-progress-ring {
  width: clamp(60px, 12vw, 100px);
  height: clamp(60px, 12vw, 100px);
  border-radius: 50%;
  background: conic-gradient(
    var(--color-primary) var(--progress-percent),
    rgba(255, 255, 255, 0.1) var(--progress-percent)
  );
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-md);
  position: relative;
}

.level-number {
  font-size: var(--text-heading);
  font-weight: 700;
  color: var(--color-text-primary);
  background: var(--color-background);
  width: calc(100% - 8px);
  height: calc(100% - 8px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

**Success Card (Level Complete):**
```css
.level-complete-card {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--color-surface);
  border: 2px solid var(--color-success);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  text-align: center;
  box-shadow: var(--shadow-xl), 0 0 32px rgba(74, 222, 128, 0.2);
  z-index: 150;
  animation: level-complete-pop var(--duration-normal) var(--ease-bounce);
}

@keyframes level-complete-pop {
  0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}

.level-complete-title {
  font-size: var(--text-heading);
  font-weight: 700;
  color: var(--color-success);
  margin-bottom: var(--space-md);
}

.level-complete-body {
  font-size: var(--text-body);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-lg);
}
```

### Bubble Pop Mode

**Bubble Rendering (Canvas2D):**
```javascript
// Pseudo-code for canvas bubble rendering
function drawBubble(x, y, radius, ctx) {
  // Main bubble body
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, 'rgba(255, 217, 61, 0.9)');
  gradient.addColorStop(1, 'rgba(255, 217, 61, 1)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Specular highlight (upper-left)
  const highlightGradient = ctx.createRadialGradient(
    x - radius * 0.3, y - radius * 0.3, 0,
    x - radius * 0.3, y - radius * 0.3, radius * 0.4
  );
  highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
  highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = highlightGradient;
  ctx.beginPath();
  ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Shadow below
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
}
```

**Pop Animation:**
```css
.bubble-pop {
  animation: bubble-pop-scale 200ms var(--ease-in);
}

@keyframes bubble-pop-scale {
  0% { transform: scale(1); }
  100% { transform: scale(0); opacity: 0; }
}
```

**Score Burst (Number Rising):**
```css
.score-burst {
  position: fixed;
  font-size: var(--text-heading);
  font-weight: 700;
  color: var(--color-primary);
  pointer-events: none;
  animation: score-float 1s ease-out forwards;
}

@keyframes score-float {
  0% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translateY(-60px) scale(1.2);
    opacity: 0;
  }
}
```

### Sort and Place Mode

**Draggable Items:**
```css
.sort-item {
  padding: var(--space-md);
  background: linear-gradient(135deg,
    rgba(255, 255, 255, 0.1) 0%,
    rgba(255, 255, 255, 0.05) 100%);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  cursor: grab;
  transition: all 150ms ease-out;
  user-select: none;
}

.sort-item:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-4px);
}

.sort-item:active {
  cursor: grabbing;
  opacity: 0.9;
}

.sort-item.dragging {
  opacity: 0.7;
  box-shadow: var(--shadow-lg), 0 0 24px rgba(0, 229, 255, 0.3);
}
```

**Drop Zones:**
```css
.drop-zone {
  border: 2px dashed rgba(255, 217, 61, 0.4);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 217, 61, 0.05);
  transition: all 200ms ease-out;
  color: var(--color-text-secondary);
}

.drop-zone:hover {
  border-color: var(--color-primary);
  background: rgba(255, 217, 61, 0.1);
  box-shadow: 0 0 16px rgba(255, 217, 61, 0.15);
}

.drop-zone.valid-drop {
  border-color: var(--color-success);
  border-style: solid;
  background: rgba(74, 222, 128, 0.1);
  box-shadow: 0 0 16px rgba(74, 222, 128, 0.2);
}
```

**Snap Success (Bounce):**
```css
.snap-bounce {
  animation: snap-scale 300ms var(--ease-bounce);
}

@keyframes snap-scale {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}
```

### Word Search Mode

**Letter Grid:**
```css
.word-search-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(44px, 1fr));
  gap: var(--space-sm);
  padding: var(--space-lg);
}

.word-search-cell {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--text-label);
  font-weight: 600;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all 150ms ease-out;
  user-select: none;
}

.word-search-cell:hover {
  background: rgba(255, 217, 61, 0.15);
  border-color: var(--color-primary);
}

.word-search-cell.selected {
  background: var(--color-primary);
  color: var(--color-background);
  border-color: var(--color-primary);
}

.word-search-cell.correct {
  background: var(--color-success);
  color: white;
  animation: found-bounce var(--duration-normal) var(--ease-bounce);
}

@keyframes found-bounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}
```

---

## F) ACCESSIBILITY

### Touch Targets

**Minimum Sizes:**
- **WCAG Standard:** 44×44px (mobile)
- **Kids-Optimized:** 48×48px (preferred)
- **Mode Tiles:** Minimum 100×100px
- **HUD Elements:** Minimum 44×44px when tappable

**Spacing:**
- Minimum 8px gap between touch targets to prevent mis-taps
- Use padding generously; don't shrink targets to hit density goals

**Implementation:**
```css
.interactive-element {
  min-width: 48px;
  min-height: 48px;
  padding: var(--space-sm);
}
```

### Contrast Ratios

**Text Contrast:**
- Primary text (#FFFFFF) on background (#010C24): **20:1** ✓
- Secondary text (rgba(255,255,255,0.75)) on surface: **~14:1** ✓
- Button text (dark) on primary background (#FFD93D): **~8:1** ✓
- All text must meet **WCAG AA minimum 4.5:1** standard

**Verification Tools:**
- Use WebAIM Contrast Checker before shipping
- Test color combinations in dark and light modes

### Focus & Keyboard Navigation

**Focus Visible:**
```css
:focus-visible {
  outline: 2px solid var(--color-secondary);
  outline-offset: 2px;
}

button:focus-visible,
.interactive:focus-visible {
  box-shadow: var(--shadow-md), 0 0 0 2px var(--color-background), 0 0 0 4px var(--color-secondary);
}
```

**Tab Order:**
- Maintain logical DOM order
- Use `tabindex` sparingly; only for non-standard interactive elements
- Test with keyboard navigation on all pages

### Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  .magic-cursor {
    animation: none !important;
  }

  .btn-primary:hover {
    transition: none;
  }
}
```

### TV Distance Readability

**Effective Text Sizing at 3m (10ft):**

| Display | Resolution | 24px = Approx. Visual Angle |
|---------|-----------|---------------------------|
| 40" TV | 1080p | ~0.8° (readable) |
| 55" TV | 1080p | ~1° (readable) |
| 65" TV | 4K | ~0.6° (readable with 24px) |

**Baseline Minimum:** 24px effective size for HUD numbers on TV
**Use `clamp()` to scale:** `clamp(0.75rem, 1.5vw, 1rem)` adapts automatically

**Testing:**
- View on actual TV at 3m distance
- Verify text is readable without squinting
- Test on 40", 55", and 65" displays if possible

### Color Blindness

**Avoid Red-Green Conflicts:**
- Error state: Use shape + color (red outline + icon)
- Success state: Use shape + color (green outline + checkmark)
- Supplement all color-coded information with icons or text labels

**Example:**
```html
<!-- Good: Icon + Color -->
<div class="error-state">
  <svg>✗</svg> <span>Invalid input</span>
</div>

<!-- Bad: Color alone -->
<div style="background: red;"></div>
```

---

## G) PERFORMANCE NOTES

### Allowed Animations & Effects

✅ **Performant:**
- `transform` (translate, scale, rotate)
- `opacity` changes
- `box-shadow` (single, ≤12px blur)
- CSS gradients (linear, radial; 2–3 colors max)
- `filter: drop-shadow()` (single pass, <8px)

### Banned for Performance

❌ **Avoid:**
- `filter: blur()` in animations (causes repaints)
- Multiple layered `box-shadow` per frame (>2 shadows)
- `backdrop-filter` on low-tier devices (use @media query)
- `text-shadow` with >2 layers
- DOM-based particle effects (use canvas instead)
- Large number of animated elements simultaneously (>20)

### Mobile & Low-Tier Device Optimization

```css
/* Use GPU acceleration */
.animated-element {
  will-change: transform, opacity;
  transform: translateZ(0); /* Enable hardware acceleration */
}

/* Disable expensive effects on low-tier */
@media (prefers-reduced-transparency: reduce) {
  .card {
    backdrop-filter: none;
    background: var(--color-surface);
  }
}

/* Reduce animation complexity */
@media (max-width: 768px) {
  .complex-animation {
    animation-duration: 200ms; /* Shorter on mobile */
  }
}
```

### Canvas Rendering Tips

- **Glow Effect:** Use single `shadowBlur` pass, not multiple layers
- **Stroke Quality:** Use `lineCap = 'round'` and `lineJoin = 'round'`
- **Particle Effects:** Cap at 50–100 particles; remove off-screen particles
- **Frame Rate:** Target 60fps; use `requestAnimationFrame`

---

## H) COMPONENT RECIPES

### Button (Comprehensive Recipe)

**HTML:**
```html
<!-- Primary -->
<button class="btn btn-primary">Draw Now</button>

<!-- Secondary -->
<button class="btn btn-secondary">Learn More</button>

<!-- Icon -->
<button class="btn btn-icon" aria-label="Settings">
  <svg>...</svg>
</button>

<!-- Disabled -->
<button class="btn btn-primary" disabled>Locked</button>
```

**CSS:**
```css
.btn {
  font-family: var(--font-primary);
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  position: relative;
  overflow: hidden;
  user-select: none;
}

.btn-primary {
  background: linear-gradient(180deg,
    hsl(48, 100%, 60%) 0%,
    var(--color-primary) 100%);
  color: var(--color-background);
  padding: var(--space-md) var(--space-lg);
  font-size: var(--text-label);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-md);
}

.btn-primary::before {
  content: '';
  position: absolute;
  top: 1px;
  left: 10%;
  right: 10%;
  height: 1px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  pointer-events: none;
}

.btn-primary:hover:not(:disabled) {
  transform: scale(1.03);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35),
              inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.btn-primary:active:not(:disabled) {
  transform: scale(0.97) translateY(1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transition: all 100ms var(--ease-in);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: transparent;
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
  padding: calc(var(--space-md) - 2px) var(--space-lg);
  font-size: var(--text-label);
  border-radius: var(--radius-sm);
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255, 217, 61, 0.1);
  transform: scale(1.03);
  box-shadow: 0 0 16px rgba(255, 217, 61, 0.2);
}

.btn-secondary:active:not(:disabled) {
  transform: scale(0.97);
  background: rgba(255, 217, 61, 0.15);
}

.btn-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  color: var(--color-text-primary);
}

.btn-icon:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 0 12px rgba(0, 229, 255, 0.15);
  transform: scale(1.05);
}

.btn-icon:active:not(:disabled) {
  transform: scale(0.95);
}
```

### Card (Complete Recipe)

**HTML:**
```html
<div class="card">
  <h3 class="card-title">Mode Title</h3>
  <p class="card-body">Description text here.</p>
  <button class="btn btn-primary">Action</button>
</div>
```

**CSS:**
```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  box-shadow: var(--shadow-md);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(16px);
  transition: all var(--duration-normal) var(--ease-out);
}

.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.08) 50%,
    transparent 100%);
  pointer-events: none;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-2px);
}

.card-title {
  font-size: var(--text-heading);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 var(--space-md) 0;
}

.card-body {
  font-size: var(--text-body);
  color: var(--color-text-secondary);
  line-height: var(--line-height-body);
  margin: 0 0 var(--space-lg) 0;
}
```

### Mode Tile (Complete Recipe)

**HTML:**
```html
<button class="mode-tile">
  <svg class="mode-icon">...</svg>
  <span class="mode-tile-label">Free Paint</span>
</button>
```

**CSS:**
```css
.mode-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: clamp(100px, 25vw, 140px);
  height: clamp(100px, 25vw, 140px);
  min-width: 100px;
  min-height: 100px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(255, 255, 255, 0.04) 100%);
  border: 2px solid var(--color-border);
  padding: var(--space-md);
  cursor: pointer;
  box-shadow: var(--shadow-md);
  gap: var(--space-sm);
  transition: all var(--duration-normal) var(--ease-out);
  font-family: var(--font-primary);
  font-size: var(--text-label);
  font-weight: 600;
  color: var(--color-text-primary);
  position: relative;
  overflow: hidden;
}

.mode-tile:hover {
  transform: scale(1.05);
  border-color: var(--color-primary);
  box-shadow: var(--shadow-lg), 0 0 20px rgba(255, 217, 61, 0.2);
  background: linear-gradient(135deg,
    rgba(255, 255, 255, 0.12) 0%,
    rgba(255, 255, 255, 0.06) 100%);
}

.mode-tile.selected {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-lg), 0 0 24px rgba(255, 217, 61, 0.3);
  background: linear-gradient(135deg,
    rgba(255, 217, 61, 0.15) 0%,
    rgba(255, 217, 61, 0.08) 100%);
}

.mode-tile:active {
  transform: scale(0.98);
  transition: all 100ms var(--ease-in);
}

.mode-icon {
  width: clamp(32px, 6vw, 48px);
  height: clamp(32px, 6vw, 48px);
  color: var(--color-primary);
  transition: all var(--duration-fast) var(--ease-out);
}

.mode-tile:hover .mode-icon {
  color: var(--color-secondary);
  filter: drop-shadow(0 0 8px rgba(0, 229, 255, 0.3));
}

.mode-tile-label {
  text-align: center;
  margin-top: var(--space-xs);
}
```

### HUD Chip (Complete Recipe)

**HTML:**
```html
<div class="hud-chip">
  <span class="hud-chip-label">Score</span>
  <span class="hud-chip-value">1050</span>
</div>
```

**CSS:**
```css
.hud-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-pill);
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  font-weight: 500;
}

.hud-chip-label {
  font-size: var(--text-small);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: var(--font-mono);
}

.hud-chip-value {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: var(--text-hud);
  color: var(--color-primary);
  min-width: 48px;
  text-align: right;
  transition: all var(--duration-normal) var(--ease-out);
}

.hud-chip-value.pulse {
  animation: pulse-scale var(--duration-normal) var(--ease-bounce);
}

@keyframes pulse-scale {
  0% { transform: scale(1); }
  50% { transform: scale(1.08); }
  100% { transform: scale(1); }
}
```

### Toast Notification (Complete Recipe)

**HTML:**
```html
<div class="toast success">
  <span>Level complete! Great job!</span>
</div>
```

**CSS:**
```css
.toast {
  position: fixed;
  bottom: var(--space-lg);
  left: 50%;
  transform: translateX(-50%);
  padding: var(--space-md) var(--space-lg);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-lg);
  color: var(--color-text-primary);
  font-size: var(--text-body);
  z-index: 200;
  animation: toast-slide-up var(--duration-normal) var(--ease-out);
  max-width: 90vw;
}

.toast.success {
  border-color: var(--color-success);
  box-shadow: 0 0 16px rgba(74, 222, 128, 0.2), var(--shadow-lg);
}

.toast.error {
  border-color: var(--color-error);
  box-shadow: 0 0 16px rgba(248, 113, 113, 0.2), var(--shadow-lg);
}

.toast.warning {
  border-color: var(--color-warning);
  box-shadow: 0 0 16px rgba(251, 191, 36, 0.2), var(--shadow-lg);
}

@keyframes toast-slide-up {
  from {
    transform: translateX(-50%) translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}
```

### Modal Dialog (Complete Recipe)

**HTML:**
```html
<div class="modal-overlay">
  <div class="modal-content">
    <h2 class="modal-header">Modal Title</h2>
    <p class="modal-body">Modal content here.</p>
    <div class="modal-footer">
      <button class="btn btn-secondary">Cancel</button>
      <button class="btn btn-primary">Confirm</button>
    </div>
  </div>
</div>
```

**CSS:**
```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(4px);
  animation: fade-in var(--duration-normal) var(--ease-out);
  padding: var(--space-lg);
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  max-width: 90vw;
  max-height: 90vh;
  overflow: auto;
  box-shadow: var(--shadow-xl);
  animation: slide-up var(--duration-normal) var(--ease-out);
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  font-size: var(--text-heading);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 var(--space-lg) 0;
}

.modal-body {
  font-size: var(--text-body);
  color: var(--color-text-secondary);
  line-height: var(--line-height-body);
  margin: 0 0 var(--space-lg) 0;
}

.modal-footer {
  display: flex;
  gap: var(--space-md);
  justify-content: flex-end;
  flex-wrap: wrap;
}
```

### Magic Cursor (Reference)

**CSS (Visual representation; actual rendering is canvas-based):**
```css
.magic-cursor {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-pill);
  background: var(--color-primary);
  position: fixed;
  pointer-events: none;
  box-shadow: 0 0 16px rgba(255, 217, 61, 0.3), var(--shadow-md);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 100ms var(--ease-out);
  z-index: 1000;
}

.magic-cursor::before {
  content: '';
  position: absolute;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  top: 4px;
  left: 4px;
}

.magic-cursor.drawing {
  width: 32px;
  height: 32px;
  background: var(--color-secondary);
  box-shadow: 0 0 24px rgba(0, 229, 255, 0.5), var(--shadow-md);
  animation: glow-pulse 1s var(--ease-smooth) infinite;
}

.magic-cursor.idle {
  animation: idle-pulse 2s var(--ease-smooth) infinite;
}

@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 24px rgba(0, 229, 255, 0.4), var(--shadow-md); }
  50% { box-shadow: 0 0 32px rgba(0, 229, 255, 0.6), var(--shadow-md); }
}

@keyframes idle-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}
```

---

## I) IMPLEMENTATION NOTES

### File Organization

**Existing Files to Modify:**

1. **`src/index.css`**
   - Add all CSS variables from Section B (colors, typography, spacing, shadows, radii)
   - Define `@media (prefers-reduced-motion: reduce)` blocks
   - Set default fonts and sizing for `html` and `body`

2. **`src/App.css`**
   - Layout styles for main app container
   - Page-level backgrounds and margins
   - Grid/flex layouts for mode selection

3. **`src/components/*.css`** (individual mode component styles)
   - `FreePaintMode.css` → Toolbar, canvas container, glow effects
   - `TracingMode.css` → Path visualization, progress ring, level complete card
   - `BubbleCalibration.css` → Bubble styles (canvas helper rules), pop animations
   - `SortAndPlaceMode.css` → Draggable items, drop zones
   - `WordSearchMode.css` → Letter grid, selection feedback
   - `ModeSelectionMenu.css` → Mode tile grid layout
   - `Landing.css` → Hero section, CTA buttons
   - `MagicCursor.css` → Cursor styling (reference, actual rendering in JS)

4. **New: Component Library CSS** (optional)
   - `src/styles/buttons.css` → All button recipes
   - `src/styles/cards.css` → Card and panel styles
   - `src/styles/modals.css` → Modal and overlay styles
   - `src/styles/hud.css` → HUD chips, toasts, badges

### CSS Architecture

**Hierarchy:**
```
index.css (tokens + global)
├── App.css (layout)
├── components/*.css (mode-specific)
└── styles/*.css (component library, optional)
```

**Naming Convention:**
- Use BEM for component-scoped styles: `.btn-primary`, `.card-title`, `.mode-tile-label`
- Use kebab-case for all class names
- Avoid overly nested selectors (max 2 levels deep)

**Variable Usage:**
```css
/* ✓ Good: Use CSS variables */
.element {
  padding: var(--space-md);
  color: var(--color-text-primary);
  transition: all var(--duration-normal) var(--ease-out);
}

/* ✗ Avoid: Hard-coded values */
.element {
  padding: 16px;
  color: white;
  transition: all 250ms ease-out;
}
```

### JavaScript Integration Notes

**Cursor Updates (MagicCursor.tsx):**
- Render cursor via canvas or DOM element
- Update position on `mousemove` or hand-tracking events
- Add `drawing` class when stroke is active
- Maintain smooth 60fps with `transform` only (no layout shifts)

**Animation Triggers:**
```typescript
// Example: Trigger HUD chip pulse when score updates
element.classList.add('pulse');
setTimeout(() => element.classList.remove('pulse'), 250);
```

**Modal Management:**
- Use `modal-overlay` + `modal-content` classes
- Trigger animations via CSS, not JavaScript (for performance)
- Handle `Escape` key to close

**Reduced Motion Detection:**
```typescript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!prefersReducedMotion) {
  // Apply animations
}
```

### Responsive Breakpoints

**No fixed breakpoints required** due to `clamp()` usage, but if needed:

| Device | Width | Purpose |
|--------|-------|---------|
| Mobile | ≤768px | Single-column layouts, reduce spacing |
| Tablet | 768px–1280px | Multi-column, standard spacing |
| TV (1080p) | 1920px | Full-screen, max text sizing |
| TV (4K) | 3840px | Very large, aggressive clamping caps |

### Performance Checklist

Before shipping, verify:

- [ ] All text uses `clamp()` for fluid sizing
- [ ] Box-shadows are ≤12px blur (or single shadow)
- [ ] No `filter: blur()` in animations
- [ ] Touch targets are ≥48×48px
- [ ] Contrast ratios are ≥4.5:1 for all text
- [ ] Reduced motion preferences are respected
- [ ] Canvas particle effects are capped at 50–100 particles
- [ ] No more than 20 simultaneously animated elements
- [ ] Animations use `transform` and `opacity` only
- [ ] TV viewing at 3m shows readable text (test with 24px+ effective size)

### Browser Support

**Target:**
- Chrome/Edge 90+ (Vite default)
- Safari 14+ (for backdrop-filter)
- Firefox 88+

**Fallbacks Provided For:**
- `backdrop-filter` (CSS variable background as fallback)
- `@supports` queries for newer features

---

## Summary: Key Design Principles

| Principle | How It's Achieved |
|-----------|-------------------|
| **Toy-Like** | Soft radii (8–24px), chunky proportions, rounded buttons, playful colors |
| **Soft 3D** | Subtle gradients (5–10% shifts), inner highlights (1–2px white), layered shadows |
| **Glossy** | Specular highlights (upper-left white circles), smooth surfaces, polished button states |
| **Readable** | High contrast (4.5:1+), large text via `clamp()`, generous line height (1.4), icons + text |
| **Calm** | Muted dark background (#010C24), gentle easing, restrained colors, breathing space |
| **Accessible** | 48×48px min touch targets, keyboard focus visible, reduced motion respected, TV-ready |
| **Performant** | Transform-only animations, single-pass shadows, GPU acceleration, capped particles |

---

**Document Version:** 1.0
**Last Updated:** February 2025
**Status:** Production-Ready
**Audience:** Development Team
