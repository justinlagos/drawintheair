# Chrome Web Store Assets Index

## Quick Navigation

### PWA Icons
Located: `/public/icons/`

| File | Size | Purpose |
|------|------|---------|
| [icon-512.png](#icon-512png) | 512x512 px | Full-size PWA icon |
| [icon-192.png](#icon-192png) | 192x192 px | Standard app icon |
| [icon-192-maskable.png](#icon-192-maskablepng) | 192x192 px | Adaptive/maskable icon |

### Chrome Web Store Assets
Located: `/docs/cws-assets/`

| File | Size | Purpose |
|------|------|---------|
| [cws-store-icon-128.png](#cws-store-icon-128png) | 128x128 px | CWS store listing |
| [cws-promo-small-440x280.png](#cws-promo-small-440x280png) | 440x280 px | Small promotional tile |
| [cws-promo-large-920x680.png](#cws-promo-large-920x680png) | 920x680 px | Large promotional tile |
| [cws-screenshot-1-tracing-1280x800.png](#cws-screenshot-1-tracing-1280x800png) | 1280x800 px | Feature screenshot #1 |
| [cws-screenshot-2-bubbles-1280x800.png](#cws-screenshot-2-bubbles-1280x800png) | 1280x800 px | Feature screenshot #2 |
| [cws-screenshot-3-paint-1280x800.png](#cws-screenshot-3-paint-1280x800png) | 1280x800 px | Feature screenshot #3 |

---

## PWA Icons Details

### icon-512.png
- **Dimensions**: 512x512 px
- **Format**: PNG RGBA
- **Size**: 132.5 KB
- **Purpose**: Full-size PWA icon, splash screens, high-resolution displays
- **Features**: 
  - Dark navy background (#0f172a)
  - Rounded corners (80px radius)
  - Centered logo at 75% scale
- **Manifest Reference**:
  ```json
  {
    "src": "/icons/icon-512.png",
    "sizes": "512x512",
    "type": "image/png",
    "purpose": "any"
  }
  ```

### icon-192.png
- **Dimensions**: 192x192 px
- **Format**: PNG RGBA
- **Size**: 28.4 KB
- **Purpose**: Standard app shortcuts, home screen icons
- **Features**:
  - Dark navy background (#0f172a)
  - Rounded corners (30px radius)
  - Centered logo at 75% scale
- **Manifest Reference**:
  ```json
  {
    "src": "/icons/icon-192.png",
    "sizes": "192x192",
    "type": "image/png",
    "purpose": "any"
  }
  ```

### icon-192-maskable.png
- **Dimensions**: 192x192 px
- **Format**: PNG RGBA
- **Size**: 20.3 KB
- **Purpose**: Adaptive icons on modern Android devices
- **Features**:
  - Dark navy background (#0f172a)
  - Rounded corners (30px radius)
  - Centered logo at 60% scale (respects safe zone)
  - Content within inner 80% for masking
- **Manifest Reference**:
  ```json
  {
    "src": "/icons/icon-192-maskable.png",
    "sizes": "192x192",
    "type": "image/png",
    "purpose": "maskable"
  }
  ```

---

## Chrome Web Store Assets Details

### cws-store-icon-128.png
- **Dimensions**: 128x128 px
- **Format**: PNG RGBA
- **Size**: 14.6 KB
- **Purpose**: Chrome Web Store listings and search results
- **Features**:
  - Dark navy background (#0f172a)
  - Rounded corners (20px radius)
  - Centered logo at 75% scale
  - Optimized for small thumbnail display

### cws-promo-small-440x280.png
- **Dimensions**: 440x280 px
- **Format**: PNG RGBA
- **Size**: 6.5 KB
- **Purpose**: Small promotional tiles, marketplace cards
- **Features**:
  - Gradient background (#0f172a to #1a0a3e)
  - Stylized hand gesture illustration (bright cyan)
  - Text overlays:
    - Title: "Draw in the Air" (white)
    - Subtitle: "Gesture Learning for Kids" (cyan)
    - Badge: "No Mouse Needed  Works on Chromebooks" (gray)
  - Geometric elements (circles, lines)
  - Bold, readable at small sizes

### cws-promo-large-920x680.png
- **Dimensions**: 920x680 px
- **Format**: PNG RGBA
- **Size**: 10.4 KB
- **Purpose**: Large promotional tiles, store headers, marketing
- **Features**:
  - Gradient background (#0f172a to #1a0a3e)
  - Larger hand gesture illustration
  - Text overlays:
    - Title: "Draw in the Air" (white)
    - Subtitle: "Gesture Learning for Kids" (cyan)
    - Features: "Trace Letters   Pop Bubbles   Free Paint" (orange)
  - More visual space for branding
  - Clear hierarchy and prominent feature callouts

### cws-screenshot-1-tracing-1280x800.png
- **Dimensions**: 1280x800 px
- **Format**: PNG RGBA
- **Size**: 776.6 KB
- **Source Image**: landing-images/tracing-letter.jpg
- **Purpose**: Feature showcase - letter tracing
- **Features**:
  - Center-cropped to exact 1280x800 dimensions
  - Semi-transparent dark overlay at bottom (50% opacity)
  - White caption: "Trace Letters & Numbers"
  - Demonstrates core learning feature

### cws-screenshot-2-bubbles-1280x800.png
- **Dimensions**: 1280x800 px
- **Format**: PNG RGBA
- **Size**: 1123.4 KB
- **Source Image**: landing-images/bubble-pop.jpg
- **Purpose**: Feature showcase - interactive games
- **Features**:
  - Center-cropped to exact 1280x800 dimensions
  - Semi-transparent dark overlay at bottom (50% opacity)
  - White caption: "Pop Bubbles & Play Games"
  - Demonstrates engaging gameplay

### cws-screenshot-3-paint-1280x800.png
- **Dimensions**: 1280x800 px
- **Format**: PNG RGBA
- **Size**: 766.7 KB
- **Source Image**: landing-images/free-paint-particles.jpg
- **Purpose**: Feature showcase - creative features
- **Features**:
  - Center-cropped to exact 1280x800 dimensions
  - Semi-transparent dark overlay at bottom (50% opacity)
  - White caption: "Free Paint with Particle Effects"
  - Demonstrates creative/artistic features

---

## Brand Colors Used

All assets consistently apply the Draw in the Air brand palette:

| Color | Hex | RGB | Purpose |
|-------|-----|-----|---------|
| Dark Navy | #0f172a | (15, 23, 42) | Primary background |
| Accent Purple | #6c47ff | (108, 71, 255) | Highlights, accents |
| Bright Cyan | #22d3ee | (34, 211, 238) | Interactive elements, text accents |
| Orange Highlight | #fb923c | (251, 146, 60) | Call-to-action, feature text |
| Text White | #e2e8f0 | (226, 232, 240) | Primary text, captions |

---

## Directory Structure

```
drawintheair-main/
├── public/
│   ├── icons/
│   │   ├── icon-512.png
│   │   ├── icon-192.png
│   │   └── icon-192-maskable.png
│   ├── logo.png (source)
│   └── manifest.json
├── docs/
│   ├── cws-assets/
│   │   ├── cws-store-icon-128.png
│   │   ├── cws-promo-small-440x280.png
│   │   ├── cws-promo-large-920x680.png
│   │   ├── cws-screenshot-1-tracing-1280x800.png
│   │   ├── cws-screenshot-2-bubbles-1280x800.png
│   │   ├── cws-screenshot-3-paint-1280x800.png
│   │   ├── ASSET_INDEX.md (this file)
│   │   ├── CWS_ASSETS_MANIFEST.md
│   │   └── CWS_ASSET_PATHS.txt
│   └── landing-images/
│       ├── tracing-letter.jpg (source)
│       ├── bubble-pop.jpg (source)
│       └── free-paint-particles.jpg (source)
```

---

## Manifest.json Integration

Add the following to `public/manifest.json`:

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

## Chrome Web Store Upload Checklist

- [ ] Upload store icon: `cws-store-icon-128.png`
- [ ] Upload small promo: `cws-promo-small-440x280.png`
- [ ] Upload large promo: `cws-promo-large-920x680.png`
- [ ] Upload screenshot 1: `cws-screenshot-1-tracing-1280x800.png`
- [ ] Upload screenshot 2: `cws-screenshot-2-bubbles-1280x800.png`
- [ ] Upload screenshot 3: `cws-screenshot-3-paint-1280x800.png`
- [ ] Verify all assets display correctly
- [ ] Test PWA installation
- [ ] Verify maskable icon on supported devices

---

## Asset Specifications Summary

| Category | Count | Total Size |
|----------|-------|-----------|
| PWA Icons | 3 | 181.2 KB |
| CWS Assets | 6 | 2.63 MB |
| **Total** | **9** | **2.81 MB** |

**Generation Status**: Complete and Verified
**Format**: PNG RGBA
**Quality**: Production-Ready
**Compatibility**: Full Chrome Web Store & PWA Support

---

## Additional Documentation

- **CWS_ASSETS_MANIFEST.md** - Comprehensive specification guide
- **CWS_ASSET_PATHS.txt** - Quick reference for file paths

---

Generated: 2026-03-06
Tool: Python Pillow
Project: Draw in the Air
