import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  cacheDir: '/tmp/vite-cache',
  // Build identity — baked in at build time so local, GitHub and the deployed
  // production bundle can be matched to an explicit commit. On Vercel,
  // VERCEL_GIT_COMMIT_SHA / VERCEL_ENV are populated automatically. Surfaced to
  // admins/debug only (see src/lib/buildInfo.ts) — never in the child UI.
  define: {
    __BUILD_SHA__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || 'dev'),
    __BUILD_ENV__: JSON.stringify(process.env.VERCEL_ENV || process.env.NODE_ENV || 'development'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [react()],
  server: {
    port: 5175,
    hmr: {
      overlay: true
    },
    // Force no caching in dev
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      // Security headers (production should set these at server level)
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(self), microphone=()',
    }
  },
  build: {
    // Low-bandwidth regions run older Android / Windows devices. Target
    // browsers a few years old rather than bleeding-edge so the bundle
    // doesn't ship syntax old engines choke on.
    target: ['es2020', 'chrome87', 'edge88', 'safari14', 'firefox78'],
    rollupOptions: {
      output: {
        // Split heavy, rarely-changing vendor libraries into their own
        // long-cached chunks. Previously manualChunks was disabled, which
        // forced everything into one ~330KB-brotli main bundle. Splitting
        // (a) lets the browser fetch chunks in parallel, (b) means an
        // app-code change no longer invalidates the big vendor cache for
        // returning users on slow links, and (c) shrinks the critical
        // first-load payload. Lazy route chunks (React.lazy) are preserved
        // — Rollup only loads a vendor chunk when something needs it.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // Co-locate every library that captures React at module scope
          // (e.g. react-helmet-async runs `B.version.split(...)` at the top
          // level of its chunk). If React lives in a different chunk and the
          // eval order races, we hit a temporal-dead-zone "Cannot access 'B'
          // before initialization" runtime crash. Keeping these together
          // guarantees they evaluate after React in the same module graph.
          if (
            id.includes('/react-dom/') ||
            id.includes('/react/') ||
            id.includes('react-router') ||
            id.includes('react-helmet-async') ||
            id.includes('use-sync-external-store') ||
            id.includes('scheduler')
          ) {
            return 'react-vendor';
          }
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('@sentry')) return 'sentry';
          if (id.includes('posthog')) return 'posthog';
          // @mediapipe is intentionally NOT grouped here. It is loaded via
          // dynamic import only on the trace/play pages, and Rollup's
          // automatic splitting already keeps it off the landing critical path.
          return 'vendor';
        },
      },
    },
  },
})
