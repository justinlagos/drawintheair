import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  cacheDir: '/tmp/vite-cache',
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
          if (
            id.includes('/react-dom/') ||
            id.includes('/react/') ||
            id.includes('react-router') ||
            id.includes('scheduler')
          ) {
            return 'react-vendor';
          }
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('@sentry')) return 'sentry';
          if (id.includes('posthog')) return 'posthog';
          // @mediapipe is intentionally NOT grouped here — it is loaded via
          // dynamic import only on the trace/play pages, and Rollup's
          // automatic splitting already keeps it off the landing critical path.
          return 'vendor';
        },
      },
    },
  },
})
