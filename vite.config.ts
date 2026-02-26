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
  // Disable caching
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
