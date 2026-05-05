# Content Security Policy Requirements

**TL;DR:** Draw in the Air loads code, models, and data from external
origins. They must all be in `vercel.json`'s CSP. **`scripts/check-csp.mjs`
runs on every build and fails the build if any required origin is missing.**
Don't disable that check.

## Why this doc exists

In May 2026 the platform-wide UI rewrite shipped a new CSP that
forgot to include `cdn.jsdelivr.net` and `storage.googleapis.com`.
Result: hand tracking failed silently for every user, on every browser,
on every device, for several days. The symptom looked like a
MediaPipe init bug; the actual cause was the CSP blocking MediaPipe
from fetching its own WASM and model files.

The whole platform is built on hand tracking. The CSP regression broke
it 100%. We are not letting that happen again — hence the build-time
check + this doc.

## Required origins (must match `vercel.json` exactly)

| Directive | Origin | What it's for |
|---|---|---|
| `connect-src` | `https://cdn.jsdelivr.net` | MediaPipe Tasks Vision WASM binary fetch |
| `script-src` | `https://cdn.jsdelivr.net` | MediaPipe `vision_wasm_internal.js` loader script |
| `connect-src` | `https://storage.googleapis.com` | MediaPipe `hand_landmarker.task` model download |
| `worker-src` | `blob:` | MediaPipe spawns Web Workers from blob URLs for WASM threading |
| `connect-src` | `https://fmrsfjxwswzhvicylaph.supabase.co` | Supabase REST + auth API |
| `connect-src` | `wss://fmrsfjxwswzhvicylaph.supabase.co` | Supabase realtime websocket |
| `connect-src` | `https://script.google.com` | Form submission backend (school pilot, feedback) |
| `style-src` | `https://fonts.googleapis.com` | Fredoka + Nunito Google Fonts CSS |
| `font-src` | `https://fonts.gstatic.com` | Fredoka + Nunito font binaries |
| `script-src` | `https://cdn.tailwindcss.com` | Tailwind CDN script (loaded inline in `index.html`) |
| `script-src` | `https://www.googletagmanager.com` | GA4 analytics |
| `connect-src` | `https://www.google-analytics.com` | GA4 events |
| `script-src` | `https://www.clarity.ms` | Microsoft Clarity loader |
| `connect-src` | `https://*.clarity.ms` | Microsoft Clarity events |

## How the build guard works

```
npm run prebuild   →   npm run check:csp   →   node scripts/check-csp.mjs
```

The script:
1. Reads `vercel.json`
2. Parses the CSP into a directive map
3. Compares against the `REQUIREMENTS` array in the script
4. Fails the build with a precise error if any are missing

`scripts/check-csp.mjs` is the **single source of truth** for required
origins. If you add a new external dependency, add it to
`REQUIREMENTS` in that file *and* to `vercel.json`. The script will
fail the build until both match.

## Adding a new external dependency

1. Add the origin to the appropriate `*-src` directive in `vercel.json`'s
   CSP value.
2. Add an entry to `REQUIREMENTS` in `scripts/check-csp.mjs` describing
   `directive`, `origin`, `why`, and `owner`.
3. Add a row to the table in this doc.
4. Run `npm run check:csp` locally — should pass.
5. Run `npm run build` — should also pass.
6. Commit all three files together.

## Removing an external dependency

The reverse: remove from `vercel.json`, remove from `REQUIREMENTS` in
the check script, remove from this doc. Commit together. The CSP
should never have origins it doesn't actively need.

## Common CSP failure symptoms

If you see any of these in production, run `npm run check:csp` first
before chasing the symptom:

- `[object Event]` errors from `createFromOptions` or other library
  init that does its own fetching
- "Refused to connect to 'https://...' because it violates the
  following Content Security Policy directive: connect-src..."
  (in browser DevTools console)
- A library init silently never resolves
- A network request that works in `curl` but fails in the browser
- New SDK update introduces a new CDN origin that wasn't there before

## Testing CSP locally

`vite dev` does **not** apply Vercel headers. To test the CSP for real,
build and preview:

```
npm run build && npx serve dist
```

Or deploy a preview branch on Vercel.
