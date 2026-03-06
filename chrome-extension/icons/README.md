# Extension Icons

Place the following icon files in this directory:

| File | Size | Used For |
|------|------|----------|
| `icon-16.png` | 16×16 px | Browser toolbar (favicon size) |
| `icon-48.png` | 48×48 px | Extensions management page |
| `icon-128.png` | 128×128 px | Chrome Web Store listing & install dialog |

## How to create these icons

Resize the main `logo.png` (located at `/public/logo.png`, 512×512) to each size.

**Using macOS Preview:**
1. Open `logo.png` in Preview
2. Tools → Adjust Size → set to 128×128 → Export as `icon-128.png`
3. Repeat for 48×48 and 16×16

**Using ImageMagick (command line):**
```bash
convert ../../public/logo.png -resize 128x128 icon-128.png
convert ../../public/logo.png -resize 48x48 icon-48.png
convert ../../public/logo.png -resize 16x16 icon-16.png
```

**Using sips (macOS built-in):**
```bash
cp ../../public/logo.png icon-128.png && sips -z 128 128 icon-128.png
cp ../../public/logo.png icon-48.png && sips -z 48 48 icon-48.png
cp ../../public/logo.png icon-16.png && sips -z 16 16 icon-16.png
```

## Requirements
- Format: PNG (required by Chrome Web Store)
- Background: transparent or solid — avoid white borders
- The icon should be recognizable at 16×16
