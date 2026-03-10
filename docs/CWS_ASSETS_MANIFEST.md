# Chrome Web Store Assets Manifest

## Generation Date
March 6, 2026

## Source Assets
- **Source Logo**: `/public/logo.png` (1884x1294 RGBA)

## Brand Colors Used
- Dark Navy Background: #0f172a (15, 23, 42)
- Accent Purple: #6c47ff (108, 71, 255)
- Bright Cyan: #22d3ee (34, 211, 238)
- Orange Highlight: #fb923c (251, 146, 60)
- Text White: #e2e8f0 (226, 232, 240)

---

## PWA Icons
Located in: `/public/icons/`

### icon-512.png
- **Dimensions**: 512x512 px
- **Format**: PNG RGBA
- **Size**: 132.5 KB
- **Description**: Full-size PWA icon with rounded corners (80px radius) and centered logo at 75% scale
- **Purpose**: Splash screens and high-resolution displays

### icon-192.png
- **Dimensions**: 192x192 px
- **Format**: PNG RGBA
- **Size**: 28.4 KB
- **Description**: Standard PWA icon with rounded corners (30px radius) and centered logo at 75% scale
- **Purpose**: Standard app shortcuts and home screen icons

### icon-192-maskable.png
- **Dimensions**: 192x192 px
- **Format**: PNG RGBA
- **Size**: 20.3 KB
- **Description**: Maskable icon following safe zone (inner 80%) with centered logo at 60% scale and rounded corners (30px radius)
- **Purpose**: Adaptive icons on modern Android devices with icon masking support

---

## Chrome Web Store Branding Assets
Located in: `/docs/cws-assets/`

### cws-store-icon-128.png
- **Dimensions**: 128x128 px
- **Format**: PNG RGBA
- **Size**: 14.6 KB
- **Description**: Compact store icon for CWS listing with dark navy background and centered logo
- **Purpose**: Chrome Web Store icon in listings and search results

### cws-promo-small-440x280.png
- **Dimensions**: 440x280 px
- **Format**: PNG RGBA
- **Size**: 6.5 KB
- **Description**: Small promotional tile with dark navy to deep purple gradient background, hand gesture illustration, and text overlay
- **Features**:
  - Gradient background (#0f172a → #1a0a3e)
  - Stylized hand drawing gesture in bright cyan
  - Main title: "Draw in the Air" (white text)
  - Subtitle: "Gesture Learning for Kids" (cyan text)
  - Bottom badge: "No Mouse Needed  Works on Chromebooks" (light gray text)
- **Purpose**: CWS small promotional tiles, marketplace cards

### cws-promo-large-920x680.png
- **Dimensions**: 920x680 px
- **Format**: PNG RGBA
- **Size**: 10.4 KB
- **Description**: Large promotional tile with more visual space for branding
- **Features**:
  - Same dark navy to deep purple gradient
  - Larger hand gesture illustration and geometric elements
  - More prominent text hierarchy
  - Feature line: "Trace Letters   Pop Bubbles   Free Paint" (orange text)
- **Purpose**: CWS large promotional tiles, store header, marketing materials

---

## Store Screenshots
Located in: `/docs/cws-assets/`

All screenshots are exactly 1280x800 px (CWS standard), center-cropped from source images with semi-transparent dark overlay and white text captions.

### cws-screenshot-1-tracing-1280x800.png
- **Dimensions**: 1280x800 px
- **Format**: PNG RGBA
- **Size**: 776.6 KB
- **Source Image**: `landing-images/tracing-letter.jpg`
- **Caption**: "Trace Letters & Numbers"
- **Purpose**: Feature showcase - tracing/learning mode

### cws-screenshot-2-bubbles-1280x800.png
- **Dimensions**: 1280x800 px
- **Format**: PNG RGBA
- **Size**: 1123.4 KB
- **Source Image**: `landing-images/bubble-pop.jpg`
- **Caption**: "Pop Bubbles & Play Games"
- **Purpose**: Feature showcase - interactive game mode

### cws-screenshot-3-paint-1280x800.png
- **Dimensions**: 1280x800 px
- **Format**: PNG RGBA
- **Size**: 766.7 KB
- **Source Image**: `landing-images/free-paint-particles.jpg`
- **Caption**: "Free Paint with Particle Effects"
- **Purpose**: Feature showcase - creative mode

---

## Directory Structure

```
drawintheair-main/
├── public/
│   ├── icons/
│   │   ├── icon-512.png
│   │   ├── icon-192.png
│   │   └── icon-192-maskable.png
│   └── logo.png
└── docs/
    ├── cws-assets/
    │   ├── cws-store-icon-128.png
    │   ├── cws-promo-small-440x280.png
    │   ├── cws-promo-large-920x680.png
    │   ├── cws-screenshot-1-tracing-1280x800.png
    │   ├── cws-screenshot-2-bubbles-1280x800.png
    │   ├── cws-screenshot-3-paint-1280x800.png
    │   └── CWS_ASSETS_MANIFEST.md (this file)
```

---

## Manifest.json Integration

Update `public/manifest.json` to include the new icons:

```json
{
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-192-maskable.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    }
  ]
}
```

---

## Chrome Web Store Submission Checklist

### Required Assets Present
- [x] Store icon (128x128) - `cws-store-icon-128.png`
- [x] Small promo tile (440x280) - `cws-promo-small-440x280.png`
- [x] Large promo tile (920x680) - `cws-promo-large-920x680.png`
- [x] Three store screenshots (1280x800 each)
  - [x] Screenshot 1: Tracing feature
  - [x] Screenshot 2: Bubble pop game
  - [x] Screenshot 3: Free paint mode

### PWA/Manifest Assets Present
- [x] 192x192 standard icon - `icon-192.png`
- [x] 192x192 maskable icon - `icon-192-maskable.png`
- [x] 512x512 icon - `icon-512.png`

### Quality Checks Passed
- [x] All images are correct dimensions
- [x] All images are PNG format with proper color modes
- [x] All images contain brand colors
- [x] All images are readable and professional
- [x] All screenshots have readable captions
- [x] Gradient backgrounds render smoothly
- [x] Text is properly positioned and sized

---

## Notes for Submission

1. **Icons**: All PWA icons feature the dark navy background (#0f172a) with rounded corners for modern aesthetic.

2. **Maskable Icon**: The 192x192 maskable icon respects the safe zone (inner 80% of the icon) by keeping content within bounds, ensuring proper display on devices with icon masking.

3. **Promo Tiles**: Both promo tiles use a dark navy to deep purple gradient (#0f172a → #1a0a3e) matching the app's visual identity, with bright cyan accents for visual interest.

4. **Screenshots**: All screenshots are precisely 1280x800 px with center crop, semi-transparent dark overlay (180 alpha), and white text captions for clarity and readability.

5. **Color Consistency**: All assets maintain brand color consistency across the suite, creating a cohesive visual identity.

---

Generated: 2026-03-06
Tool: Python Pillow
