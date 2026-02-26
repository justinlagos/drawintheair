# Release Readiness

## Build Pipeline

### Stack

| Component | Tech | Notes |
|-----------|------|-------|
| **Bundler** | Vite | Fast dev/build, ES modules, code splitting |
| **Framework** | React 18+ | Hooks, concurrent rendering |
| **Language** | TypeScript | Type safety, better DX |
| **Output** | SPA bundle | Single `index.html`, all JS/CSS inlined or linked |

### Build Output

```bash
npm run build
# Outputs to ./dist/
```

**Contents**:

```
dist/
├── index.html              # Entry point, SPA router
├── assets/
│   ├── index-<hash>.js     # Main app bundle
│   ├── hand-mode-<hash>.js # Lazy-loaded mode chunk (optional)
│   └── index-<hash>.css    # Global styles
└── favicon.ico
```

**Size targets**:
- index.html: <5KB
- Main JS bundle: <200KB (gzipped)
- CSS bundle: <50KB (gzipped)
- Total: <300KB (gzipped, on first load)

### Build Command

```bash
# Development build (source maps, slow)
npm run build:dev

# Production build (minified, optimized)
npm run build
```

## MediaPipe Model Loading

MediaPipe hand detection model loaded from CDN:

### CDN Sources

Primary: [jsDelivr](https://cdn.jsdelivr.net/npm/mediapipe-hand-detection@latest/)

Fallback: [Google APIs](https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/)

**Model file**: `hand_landmarker.task` (~5MB)

**Loading time**: 2-5 seconds (depends on connection speed)

### Cache Strategy

Implement HTTP caching headers:

```typescript
// In TrackingLayer.tsx
const modelUrl = 'https://cdn.jsdelivr.net/npm/mediapipe@0.10/hand_landmarker.task';

// Cache for 7 days
// Browser will use cached version on subsequent visits
// Header: Cache-Control: max-age=604800
```

**IndexedDB fallback** (optional, for offline mode):

```typescript
// Cache model in IndexedDB if user revisits
const openDB = () => {
  const request = indexedDB.open('drawintheair', 1);
  request.onsuccess = (e) => {
    const db = e.target.result;
    // Store model blob in 'models' store
  };
};
```

### Loading Indicator

```typescript
// Show progress while downloading model
const [loading, setLoading] = useState(true);
const [progress, setProgress] = useState(0);

const loadModel = async () => {
  const xhr = new XMLHttpRequest();
  xhr.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      setProgress((e.loaded / e.total) * 100);
    }
  });
  xhr.open('GET', modelUrl);
  xhr.send();
};
```

### Model Initialization

After download:

```typescript
const initializeModel = async (modelBlob) => {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
  );

  const handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: URL.createObjectURL(modelBlob)
    }
  });

  setModel(handLandmarker);
  setLoading(false);
};
```

## HTTPS Requirement

**CRITICAL**: getUserMedia API requires HTTPS (or localhost).

### Enforcement

```typescript
// In TrackingLayer.tsx, before requesting camera
if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
  throw new Error('HTTPS required for camera access');
}
```

### Deployment

- **Vercel**: Automatic HTTPS ✓
- **Custom server**: Obtain SSL cert (Let's Encrypt free)
- **Development**: `localhost:3000` OK for testing

## Cold Start Performance

Time from page load to "app ready to play":

### Phase 1: Page Load (0-1s)

```
User clicks link → Vercel CDN serves index.html
Download: index.html (5KB) + JS bundle (200KB gzipped)
Parse/execute JS: ~0.5-1s
React mounts, shows loading screen
```

**Measurement**: `navigation.timing.loadEventEnd - navigation.timing.navigationStart`

### Phase 2: Model Download (1-3s)

```
App triggers MediaPipe model download (5MB)
Progress bar shows: "Loading AI Model... 45%"
Download time varies by bandwidth (3G: 10s, 4G: 3s, WiFi: 1s)
```

**Measurement**: `modelDownloadEnd - modelDownloadStart`

### Phase 3: Model Initialization (3-5s)

```
Model blob decoded, WebAssembly initialized
Hand landmark detector compiled
First inference test run (~500ms)
Ready indicator shows "Camera Ready"
```

**Measurement**: `initEnd - initStart`

### Phase 4: Camera Permission (optional)

```
Browser permission prompt appears
User approves camera access (can take 5-30 seconds)
Camera stream attached to video element
First detection runs
```

### Total Cold Start

**Best case** (cached model, instant permission): 1-2 seconds
**Typical case** (fresh install, fast WiFi): 5-8 seconds
**Worst case** (3G, permission delay): 15-20 seconds

**UX mitigation**:
- Show animated loading screen during model download
- Display estimated time remaining
- Allow camera permission in parallel with model load
- Cache model aggressively

## Vercel Configuration

Deploy to Vercel for automatic HTTPS, CDN, and serverless functions.

### vercel.json

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "routes": [
    {
      "src": "^/(?!api).*",
      "destination": "/index.html"
    }
  ],
  "env": {
    "VITE_API_URL": "@api_url"
  },
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### Key Settings

- **Buildcache**: Enabled (speeds up rebuilds)
- **Serverless Functions**: Not needed (SPA)
- **CDN**: Automatic global distribution
- **SSL**: Automatic (Let's Encrypt)
- **Preview Deployments**: Per PR

## Smoke Test

Before release, run this 5-step smoke test:

### Step 1: Load /play

```
1. Navigate to https://drawintheair.app/play
2. Verify page loads within 3 seconds
3. See loading indicator for model download
4. Loading completes within 15 seconds (worst case)
5. See mode selection screen
```

**Success**: Page interactive, no errors in console.

### Step 2: Allow Camera

```
1. Camera permission prompt appears
2. Click "Allow" (or "Continue")
3. Video feed appears in canvas
4. Cursor visible at hand position
5. Inspect canvas width/height matches window size
```

**Success**: Camera stream attached, no lag in cursor.

### Step 3: See Hand Cursor

```
1. Move hand in front of camera
2. Cursor follows hand within 100ms
3. Hand detection doesn't drop (stable)
4. Can move hand off-camera and back (re-detect)
```

**Success**: Cursor is responsive, hand tracking stable.

### Step 4: Pinch Draws

```
1. Select Free Paint mode
2. Pinch (thumb + index finger together)
3. Line appears on canvas
4. Pinch release → drawing stops
5. New pinch → new stroke (no connection)
```

**Success**: Pinch detection responsive, strokes appear smooth.

### Step 5: Switch Modes

```
1. Go back to mode selection
2. Switch to Tracing mode
3. Path visible on canvas
4. Switch to Bubble Pop mode
5. Bubbles spawn and float
6. Return to Free Paint
```

**Success**: Mode switching smooth, no errors, no memory leaks.

### Automated Smoke Test (Optional)

```typescript
// smoke-test.ts (Playwright/Cypress)
test('smoke test: app functional on load', async ({ page }) => {
  await page.goto('https://drawintheair.app/play');

  // Wait for model load
  await page.waitForSelector('canvas', { timeout: 20000 });

  // Allow camera (mock if needed)
  // await page.click('button:has-text("Allow")');

  // Switch modes
  await page.click('button:has-text("Free Paint")');
  await page.waitForTimeout(1000);

  // Verify canvas exists and has size
  const canvas = page.locator('canvas').first();
  expect(await canvas.getAttribute('width')).toBeTruthy();

  // Return to menu
  await page.click('button:has-text("Back")');
  expect(page.locator('button:has-text("Tracing")')).toBeVisible();
});
```

Run smoke test on:
- [ ] Desktop Chrome
- [ ] iPad Safari
- [ ] Android Chrome
- [ ] Incognito/Private mode (no cache)

## Pre-Release Checklist

### Code Quality

- [ ] TypeScript compilation: `npm run type-check` passes
- [ ] Linting: `npm run lint` passes (0 errors, warnings reviewed)
- [ ] Unit tests: `npm run test` passes (>80% coverage on hot paths)
- [ ] No console errors (dev or prod builds)
- [ ] No security vulnerabilities (npm audit)

### Performance

- [ ] Cold start < 15 seconds (worst case)
- [ ] Frame time < 40ms on device matrix
- [ ] Memory stable after 5 minutes (no leaks)
- [ ] No jank observed in any mode

### Functionality

- [ ] All 4 modes functional
- [ ] Camera permission flow works
- [ ] Error recovery paths tested
- [ ] Smoke test passes on 4+ device/browser combos

### Deployment

- [ ] Vercel project created and configured
- [ ] Environment variables set (if any)
- [ ] DNS pointing to Vercel
- [ ] SSL certificate valid (auto-generated)
- [ ] Cache headers configured
- [ ] CDN preview working

### Documentation

- [ ] README updated (how to run, build, deploy)
- [ ] This RELEASE_READINESS.md completed
- [ ] CONTRIBUTING.md has coding standards
- [ ] QA_PLAYBOOK.md reviewed by QA team

### Launch

- [ ] Product manager sign-off
- [ ] Marketing/comms ready
- [ ] Analytics tracking enabled
- [ ] Error logging enabled (Sentry/LogRocket optional)
- [ ] Performance monitoring enabled (optional)

---

## Rollback Plan

If release breaks critical functionality:

1. **Immediate**: Revert latest deploy (Vercel one-click rollback)
2. **Short-term**: Fix, test on staging, redeploy
3. **Communication**: Notify users if downtime >1 minute

**Staging environment**: Deploy to preview URL before production.

---

## Post-Release Monitoring

First 24 hours:

- [ ] Monitor error logs (if configured)
- [ ] Check performance metrics
- [ ] Monitor browser console errors (user feedback)
- [ ] Be ready to rollback if critical issues

After 1 week:

- [ ] Analyze user engagement (page views, mode usage)
- [ ] Collect device/browser stats (Chrome, Safari, iOS, Android)
- [ ] Review performance data
- [ ] Plan next iteration

