# Chrome Web Store Asset Checklist

All required visual assets have been generated and are ready for upload. This checklist documents their locations, dimensions, and upload destinations.

All files are PNG format.

---

## Status: All Required Assets Present ✓

---

## Extension Package Icons

*These are inside `chrome-extension/icons/` and are bundled into the `.zip` automatically.*

| File | Path | Dimensions | Status |
|---|---|---|---|
| Toolbar icon (small) | `chrome-extension/icons/icon-16.png` | 16×16 | ✓ Present |
| Extensions management icon | `chrome-extension/icons/icon-48.png` | 48×48 | ✓ Present |
| Install dialog / store icon | `chrome-extension/icons/icon-128.png` | 128×128 | ✓ Present |

---

## PWA Icons (Web App)

*These are in `public/icons/` and are served by the web app for PWA installation. Referenced in `public/manifest.json`.*

| File | Path | Dimensions | Purpose | Status |
|---|---|---|---|---|
| Standard app icon | `public/icons/icon-192.png` | 192×192 | `any` | ✓ Present |
| Maskable/adaptive icon | `public/icons/icon-192-maskable.png` | 192×192 | `maskable` | ✓ Present |
| High-res app icon | `public/icons/icon-512.png` | 512×512 | `any` | ✓ Present |

*All icons: navy background (#0f172a), centred logo with padding, rounded corners.*

---

## PWA Screenshots (Web App Manifest)

*These are in `public/icons/screenshots/` and are served by the web app. They appear in Chrome's install prompt.*

| File | Dimensions | Label | Status |
|---|---|---|---|
| `screenshot-tracing-1280x800.png` | 1280×800 | Trace letters in the air using hand gestures | ✓ Present |
| `screenshot-bubbles-1280x800.png` | 1280×800 | Pop bubbles with finger tracking | ✓ Present |
| `screenshot-paint-1280x800.png` | 1280×800 | Free paint mode with particle effects | ✓ Present |

---

## Chrome Web Store Dashboard Assets

*Upload these directly to the Chrome Developer Dashboard during submission. All files are in `docs/cws-assets/`.*

### Required Assets

| File | Dimensions | Upload To | Status |
|---|---|---|---|
| `cws-store-icon-128.png` | 128×128 | Store Listing → Store icon | ✓ Present |
| `cws-screenshot-1-tracing-1280x800.png` | 1280×800 | Store Listing → Screenshots | ✓ Present |
| `cws-screenshot-2-bubbles-1280x800.png` | 1280×800 | Store Listing → Screenshots | ✓ Present |
| `cws-screenshot-3-paint-1280x800.png` | 1280×800 | Store Listing → Screenshots | ✓ Present |
| `cws-promo-small-440x280.png` | 440×280 | Store Listing → Small promo tile | ✓ Present |

### Optional Assets

| File | Dimensions | Upload To | Status |
|---|---|---|---|
| `cws-promo-large-920x680.png` | 920×680 | Store Listing → Large promo tile | ✓ Present |

### Not Required (but recommended later)

| Asset | Dimensions | Notes |
|---|---|---|
| Marquee promo tile | 1400×560 | Only needed if featured on CWS homepage |
| YouTube video URL | — | A 15–30 second demo video significantly improves conversion |

---

## Quick Upload Order for Chrome Developer Dashboard

1. Upload `cws-store-icon-128.png` → **Store icon** field
2. Upload all three `cws-screenshot-*.png` files → **Screenshots** field
3. Upload `cws-promo-small-440x280.png` → **Small promotional tile** field
4. Upload `cws-promo-large-920x680.png` → **Large promotional tile** field (optional)

---

## Regenerating Assets

All assets were generated from `public/logo.png` using Python/Pillow. To regenerate with updated branding, use the same brand values:

- Background: `#0f172a`
- Accent purple: `#6c47ff`
- Cyan: `#22d3ee`
- Orange: `#fb923c`
- Text: `#e2e8f0`
