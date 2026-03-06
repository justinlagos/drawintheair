/**
 * Service Worker for Draw in the Air
 *
 * Strategy:
 * - Cache-first for static assets (JS, CSS, images, fonts)
 * - Network-first for navigation requests (HTML pages)
 * - Graceful offline fallback when network is unavailable
 *
 * Note: This app requires a camera and loads the MediaPipe hand-tracking
 * model at runtime, so full offline support is not feasible. This SW
 * satisfies Chrome's PWA installability requirement and provides a
 * friendly offline fallback instead of a browser error page.
 */

const CACHE_NAME = 'draw-in-the-air-v1';

/** Assets to pre-cache on install for fastest first load */
const PRECACHE_ASSETS = [
    '/',
    '/logo.png',
    '/manifest.json'
];

/** File extensions that should use cache-first strategy */
const CACHEABLE_EXTENSIONS = [
    '.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.woff', '.woff2', '.webp'
];

/**
 * Minimal offline fallback page.
 * Shown when the user navigates while completely offline.
 */
const OFFLINE_FALLBACK_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Draw in the Air — Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Nunito', system-ui, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 2rem;
    }
    .container { max-width: 420px; }
    h1 { font-size: 1.75rem; margin-bottom: 1rem; color: #6c47ff; }
    p { font-size: 1.1rem; line-height: 1.6; margin-bottom: 1.5rem; color: #94a3b8; }
    button {
      background: #6c47ff;
      color: white;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 0.5rem;
      font-size: 1rem;
      cursor: pointer;
      font-family: inherit;
    }
    button:hover { background: #5a38e0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>You're Offline</h1>
    <p>Draw in the Air needs an internet connection to load hand-tracking models and start the camera. Please check your connection and try again.</p>
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
    // Clean up old caches from previous versions
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

    // Navigation requests → network-first with offline fallback
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Cache successful navigation responses
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    return response;
                })
                .catch(() =>
                    caches.match(request).then((cached) =>
                        cached || new Response(OFFLINE_FALLBACK_HTML, {
                            status: 200,
                            headers: { 'Content-Type': 'text/html; charset=utf-8' }
                        })
                    )
                )
        );
        return;
    }

    // Static assets → cache-first if cacheable extension
    const url = new URL(request.url);
    const isCacheable = CACHEABLE_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));

    if (isCacheable) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;
                return fetch(request).then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    }
                    return response;
                });
            })
        );
        return;
    }

    // All other requests → network only (API calls, etc.)
});
