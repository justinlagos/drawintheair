/**
 * Service Worker for Draw in the Air
 *
 * Strategy:
 * - Network-first for navigation requests (HTML pages) — always get the
 *   latest deploy when online; cache as fallback for offline.
 * - Network-first with cache fallback for JS/CSS assets — Vite already
 *   gives them content-hashed URLs, but stale caches were a real-world
 *   problem (returning visitors saw old layout post-deploy until they
 *   manually cleared cache). Network-first guarantees fresh code.
 * - Cache-first for images/fonts (rarely change, big bandwidth wins).
 * - Graceful offline fallback when network is unavailable.
 *
 * Note: This app requires a camera and loads the MediaPipe hand-tracking
 * model at runtime, so full offline support is not feasible. This SW
 * satisfies Chrome's PWA installability requirement and provides a
 * friendly offline fallback instead of a browser error page.
 *
 * IMPORTANT: Bump CACHE_VERSION on every deploy that ships meaningful UI
 * changes so the activate-handler cache-cleanup nukes stale caches.
 */

const CACHE_VERSION = 'v4-analytics-2026-05-07';
const CACHE_NAME = `draw-in-the-air-${CACHE_VERSION}`;

/** Assets to pre-cache on install for fastest first load */
const PRECACHE_ASSETS = [
    '/',
    '/logo.png',
    '/manifest.json'
];

/** Extensions for which we use a CACHE-FIRST strategy (rarely change) */
const CACHE_FIRST_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.woff', '.woff2'];

/** Extensions for which we use NETWORK-FIRST strategy (deploy-sensitive) */
const NETWORK_FIRST_EXTENSIONS = ['.js', '.css', '.html'];

/**
 * Minimal offline fallback page.
 * Shown when the user navigates while completely offline.
 */
const OFFLINE_FALLBACK_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Draw in the Air - Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Nunito', system-ui, sans-serif;
      background: linear-gradient(180deg, #BEEBFF 0%, #DEF5FF 35%, #FFF6E5 75%, #FFFAEB 100%);
      color: #3F4052;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 2rem;
    }
    .container {
      max-width: 460px;
      background: #FFFFFF;
      border: 3px solid rgba(108, 63, 164, 0.18);
      border-radius: 36px;
      padding: 3rem 2rem;
      box-shadow: 0 24px 60px rgba(108, 63, 164, 0.18);
    }
    h1 { font-family: 'Fredoka', system-ui, sans-serif; font-size: 1.85rem; margin-bottom: 1rem; color: #6C3FA4; }
    p { font-size: 1.1rem; line-height: 1.6; margin-bottom: 1.5rem; color: #3F4052; opacity: 0.85; }
    button {
      background: linear-gradient(180deg, #7E4FB8 0%, #6C3FA4 100%);
      color: white;
      border: 3px solid #FFFFFF;
      padding: 0.85rem 2rem;
      border-radius: 9999px;
      font-size: 1.05rem;
      font-weight: 700;
      cursor: pointer;
      font-family: 'Fredoka', system-ui, sans-serif;
      box-shadow: 0 8px 18px rgba(108, 63, 164, 0.35);
    }
    button:hover { transform: translateY(-2px); }
  </style>
</head>
<body>
  <div class="container">
    <h1>You're offline</h1>
    <p>Draw in the Air needs an internet connection to load the hand-tracking model and start your camera. Please check your connection and try again.</p>
    <button onclick="window.location.reload()">Try Again</button>
  </div>
</body>
</html>`;

// ---------- Install ----------

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// ---------- Activate ----------

self.addEventListener('activate', (event) => {
    // Delete every cache that doesn't match the current version. This is
    // what actually invalidates stale .js/.css from previous deploys.
    event.waitUntil(
        caches.keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key !== CACHE_NAME)
                        .map((key) => caches.delete(key))
                )
            )
            .then(() => self.clients.claim())
    );
});

// ---------- Fetch ----------

self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Only handle GET requests
    if (request.method !== 'GET') return;

    // Skip cross-origin requests (CDN scripts, analytics, etc.)
    if (!request.url.startsWith(self.location.origin)) return;

    const url = new URL(request.url);

    // ── Navigation (HTML pages) → network-first ────────────────────────
    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request));
        return;
    }

    // ── JS/CSS → network-first (deploy-sensitive) ──────────────────────
    if (NETWORK_FIRST_EXTENSIONS.some((ext) => url.pathname.endsWith(ext))) {
        event.respondWith(networkFirst(request));
        return;
    }

    // ── Images/fonts → cache-first ─────────────────────────────────────
    if (CACHE_FIRST_EXTENSIONS.some((ext) => url.pathname.endsWith(ext))) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // Anything else → network only (API calls, etc.)
});

// ─── Strategies ────────────────────────────────────────────────────────

/**
 * Network-first: try network, fall back to cache, fall back to offline page
 * for navigation requests.
 */
function networkFirst(request) {
    return fetch(request)
        .then((response) => {
            // Cache successful responses for offline fallback
            if (response.ok) {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
        })
        .catch(() =>
            caches.match(request).then((cached) => {
                if (cached) return cached;
                if (request.mode === 'navigate') {
                    return new Response(OFFLINE_FALLBACK_HTML, {
                        status: 200,
                        headers: { 'Content-Type': 'text/html; charset=utf-8' },
                    });
                }
                // Re-throw so the browser can show its native error
                return Response.error();
            })
        );
}

/**
 * Cache-first: serve from cache, fall back to network, populate cache on miss.
 */
function cacheFirst(request) {
    return caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
            if (response.ok) {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
        });
    });
}

// ---------- Update notification (optional client hook) ----------

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
