# Draw in the Air — Chrome Extension

A minimal Chrome extension wrapper that launches the [Draw in the Air](https://drawintheair.com) web app.

## What it does

When the user clicks the extension icon in the Chrome toolbar, it opens Draw in the Air in a new browser tab. That's it. The extension has:

- **Zero permissions** — no access to browsing data, tabs content, or any other browser API
- **No content scripts** — nothing injected into any webpage
- **No data collection** — the extension itself stores nothing and sends nothing
- **No background activity** — the service worker only activates on icon click

## Architecture

```
chrome-extension/
├── manifest.json       # Manifest V3 extension config
├── service-worker.js   # Background logic (opens app URL on click)
├── icons/              # Extension icons (16, 48, 128 px)
│   └── README.md       # Icon creation instructions
└── README.md           # This file
```

## Development

### Load unpacked for testing

1. Open `chrome://extensions` in Chrome
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this `chrome-extension/` folder
5. The extension icon should appear in the toolbar
6. Click it — a new tab should open to `https://drawintheair.com/play`

### Changing the target URL

Edit `APP_URL` in `service-worker.js`:

```js
const APP_URL = 'https://drawintheair.com/play';
```

### Creating the submission zip

```bash
cd chrome-extension
zip -r ../draw-in-the-air-extension.zip . -x ".*" -x "__MACOSX/*"
```

The zip file is what you upload to the Chrome Web Store dashboard.

## Version history

| Version | Date | Notes |
|---------|------|-------|
| 1.0.0 | 2026-03-06 | Initial release — tab launch |
