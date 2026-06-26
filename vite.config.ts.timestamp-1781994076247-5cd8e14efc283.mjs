// vite.config.ts
import { defineConfig } from "file:///sessions/serene-beautiful-dijkstra/mnt/drawintheair-main/node_modules/vite/dist/node/index.js";
import react from "file:///sessions/serene-beautiful-dijkstra/mnt/drawintheair-main/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig({
  cacheDir: "/tmp/vite-cache",
  plugins: [react()],
  server: {
    port: 5175,
    hmr: {
      overlay: true
    },
    // Force no caching in dev
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      // Security headers (production should set these at server level)
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(self), microphone=()"
    }
  },
  build: {
    // Low-bandwidth regions run older Android / Windows devices. Target
    // browsers a few years old rather than bleeding-edge so the bundle
    // doesn't ship syntax old engines choke on.
    target: ["es2020", "chrome87", "edge88", "safari14", "firefox78"],
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
          if (!id.includes("node_modules")) return void 0;
          if (id.includes("/react-dom/") || id.includes("/react/") || id.includes("react-router") || id.includes("react-helmet-async") || id.includes("use-sync-external-store") || id.includes("scheduler")) {
            return "react-vendor";
          }
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("@sentry")) return "sentry";
          if (id.includes("posthog")) return "posthog";
          return "vendor";
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMvc2VyZW5lLWJlYXV0aWZ1bC1kaWprc3RyYS9tbnQvZHJhd2ludGhlYWlyLW1haW5cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9zZXNzaW9ucy9zZXJlbmUtYmVhdXRpZnVsLWRpamtzdHJhL21udC9kcmF3aW50aGVhaXItbWFpbi92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vc2Vzc2lvbnMvc2VyZW5lLWJlYXV0aWZ1bC1kaWprc3RyYS9tbnQvZHJhd2ludGhlYWlyLW1haW4vdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuXG4vLyBodHRwczovL3ZpdGUuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIGNhY2hlRGlyOiAnL3RtcC92aXRlLWNhY2hlJyxcbiAgcGx1Z2luczogW3JlYWN0KCldLFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiA1MTc1LFxuICAgIGhtcjoge1xuICAgICAgb3ZlcmxheTogdHJ1ZVxuICAgIH0sXG4gICAgLy8gRm9yY2Ugbm8gY2FjaGluZyBpbiBkZXZcbiAgICBoZWFkZXJzOiB7XG4gICAgICAnQ2FjaGUtQ29udHJvbCc6ICduby1zdG9yZSwgbm8tY2FjaGUsIG11c3QtcmV2YWxpZGF0ZSwgcHJveHktcmV2YWxpZGF0ZScsXG4gICAgICAnUHJhZ21hJzogJ25vLWNhY2hlJyxcbiAgICAgICdFeHBpcmVzJzogJzAnLFxuICAgICAgLy8gU2VjdXJpdHkgaGVhZGVycyAocHJvZHVjdGlvbiBzaG91bGQgc2V0IHRoZXNlIGF0IHNlcnZlciBsZXZlbClcbiAgICAgICdYLUNvbnRlbnQtVHlwZS1PcHRpb25zJzogJ25vc25pZmYnLFxuICAgICAgJ1gtRnJhbWUtT3B0aW9ucyc6ICdERU5ZJyxcbiAgICAgICdSZWZlcnJlci1Qb2xpY3knOiAnc3RyaWN0LW9yaWdpbi13aGVuLWNyb3NzLW9yaWdpbicsXG4gICAgICAnUGVybWlzc2lvbnMtUG9saWN5JzogJ2NhbWVyYT0oc2VsZiksIG1pY3JvcGhvbmU9KCknLFxuICAgIH1cbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICAvLyBMb3ctYmFuZHdpZHRoIHJlZ2lvbnMgcnVuIG9sZGVyIEFuZHJvaWQgLyBXaW5kb3dzIGRldmljZXMuIFRhcmdldFxuICAgIC8vIGJyb3dzZXJzIGEgZmV3IHllYXJzIG9sZCByYXRoZXIgdGhhbiBibGVlZGluZy1lZGdlIHNvIHRoZSBidW5kbGVcbiAgICAvLyBkb2Vzbid0IHNoaXAgc3ludGF4IG9sZCBlbmdpbmVzIGNob2tlIG9uLlxuICAgIHRhcmdldDogWydlczIwMjAnLCAnY2hyb21lODcnLCAnZWRnZTg4JywgJ3NhZmFyaTE0JywgJ2ZpcmVmb3g3OCddLFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICAvLyBTcGxpdCBoZWF2eSwgcmFyZWx5LWNoYW5naW5nIHZlbmRvciBsaWJyYXJpZXMgaW50byB0aGVpciBvd25cbiAgICAgICAgLy8gbG9uZy1jYWNoZWQgY2h1bmtzLiBQcmV2aW91c2x5IG1hbnVhbENodW5rcyB3YXMgZGlzYWJsZWQsIHdoaWNoXG4gICAgICAgIC8vIGZvcmNlZCBldmVyeXRoaW5nIGludG8gb25lIH4zMzBLQi1icm90bGkgbWFpbiBidW5kbGUuIFNwbGl0dGluZ1xuICAgICAgICAvLyAoYSkgbGV0cyB0aGUgYnJvd3NlciBmZXRjaCBjaHVua3MgaW4gcGFyYWxsZWwsIChiKSBtZWFucyBhblxuICAgICAgICAvLyBhcHAtY29kZSBjaGFuZ2Ugbm8gbG9uZ2VyIGludmFsaWRhdGVzIHRoZSBiaWcgdmVuZG9yIGNhY2hlIGZvclxuICAgICAgICAvLyByZXR1cm5pbmcgdXNlcnMgb24gc2xvdyBsaW5rcywgYW5kIChjKSBzaHJpbmtzIHRoZSBjcml0aWNhbFxuICAgICAgICAvLyBmaXJzdC1sb2FkIHBheWxvYWQuIExhenkgcm91dGUgY2h1bmtzIChSZWFjdC5sYXp5KSBhcmUgcHJlc2VydmVkXG4gICAgICAgIC8vIFx1MjAxNCBSb2xsdXAgb25seSBsb2FkcyBhIHZlbmRvciBjaHVuayB3aGVuIHNvbWV0aGluZyBuZWVkcyBpdC5cbiAgICAgICAgbWFudWFsQ2h1bmtzKGlkKSB7XG4gICAgICAgICAgaWYgKCFpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzJykpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgLy8gQ28tbG9jYXRlIGV2ZXJ5IGxpYnJhcnkgdGhhdCBjYXB0dXJlcyBSZWFjdCBhdCBtb2R1bGUgc2NvcGVcbiAgICAgICAgICAvLyAoZS5nLiByZWFjdC1oZWxtZXQtYXN5bmMgcnVucyBgQi52ZXJzaW9uLnNwbGl0KC4uLilgIGF0IHRoZSB0b3BcbiAgICAgICAgICAvLyBsZXZlbCBvZiBpdHMgY2h1bmspLiBJZiBSZWFjdCBsaXZlcyBpbiBhIGRpZmZlcmVudCBjaHVuayBhbmQgdGhlXG4gICAgICAgICAgLy8gZXZhbCBvcmRlciByYWNlcywgd2UgaGl0IGEgdGVtcG9yYWwtZGVhZC16b25lIFwiQ2Fubm90IGFjY2VzcyAnQidcbiAgICAgICAgICAvLyBiZWZvcmUgaW5pdGlhbGl6YXRpb25cIiBydW50aW1lIGNyYXNoLiBLZWVwaW5nIHRoZXNlIHRvZ2V0aGVyXG4gICAgICAgICAgLy8gZ3VhcmFudGVlcyB0aGV5IGV2YWx1YXRlIGFmdGVyIFJlYWN0IGluIHRoZSBzYW1lIG1vZHVsZSBncmFwaC5cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBpZC5pbmNsdWRlcygnL3JlYWN0LWRvbS8nKSB8fFxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoJy9yZWFjdC8nKSB8fFxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ3JlYWN0LXJvdXRlcicpIHx8XG4gICAgICAgICAgICBpZC5pbmNsdWRlcygncmVhY3QtaGVsbWV0LWFzeW5jJykgfHxcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKCd1c2Utc3luYy1leHRlcm5hbC1zdG9yZScpIHx8XG4gICAgICAgICAgICBpZC5pbmNsdWRlcygnc2NoZWR1bGVyJylcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIHJldHVybiAncmVhY3QtdmVuZG9yJztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdmcmFtZXItbW90aW9uJykpIHJldHVybiAnbW90aW9uJztcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ0BzZW50cnknKSkgcmV0dXJuICdzZW50cnknO1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygncG9zdGhvZycpKSByZXR1cm4gJ3Bvc3Rob2cnO1xuICAgICAgICAgIC8vIEBtZWRpYXBpcGUgaXMgaW50ZW50aW9uYWxseSBOT1QgZ3JvdXBlZCBoZXJlLiBJdCBpcyBsb2FkZWQgdmlhXG4gICAgICAgICAgLy8gZHluYW1pYyBpbXBvcnQgb25seSBvbiB0aGUgdHJhY2UvcGxheSBwYWdlcywgYW5kIFJvbGx1cCdzXG4gICAgICAgICAgLy8gYXV0b21hdGljIHNwbGl0dGluZyBhbHJlYWR5IGtlZXBzIGl0IG9mZiB0aGUgbGFuZGluZyBjcml0aWNhbCBwYXRoLlxuICAgICAgICAgIHJldHVybiAndmVuZG9yJztcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTZWLFNBQVMsb0JBQW9CO0FBQzFYLE9BQU8sV0FBVztBQUdsQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixVQUFVO0FBQUEsRUFDVixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sS0FBSztBQUFBLE1BQ0gsU0FBUztBQUFBLElBQ1g7QUFBQTtBQUFBLElBRUEsU0FBUztBQUFBLE1BQ1AsaUJBQWlCO0FBQUEsTUFDakIsVUFBVTtBQUFBLE1BQ1YsV0FBVztBQUFBO0FBQUEsTUFFWCwwQkFBMEI7QUFBQSxNQUMxQixtQkFBbUI7QUFBQSxNQUNuQixtQkFBbUI7QUFBQSxNQUNuQixzQkFBc0I7QUFBQSxJQUN4QjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQTtBQUFBO0FBQUE7QUFBQSxJQUlMLFFBQVEsQ0FBQyxVQUFVLFlBQVksVUFBVSxZQUFZLFdBQVc7QUFBQSxJQUNoRSxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFFBU04sYUFBYSxJQUFJO0FBQ2YsY0FBSSxDQUFDLEdBQUcsU0FBUyxjQUFjLEVBQUcsUUFBTztBQU96QyxjQUNFLEdBQUcsU0FBUyxhQUFhLEtBQ3pCLEdBQUcsU0FBUyxTQUFTLEtBQ3JCLEdBQUcsU0FBUyxjQUFjLEtBQzFCLEdBQUcsU0FBUyxvQkFBb0IsS0FDaEMsR0FBRyxTQUFTLHlCQUF5QixLQUNyQyxHQUFHLFNBQVMsV0FBVyxHQUN2QjtBQUNBLG1CQUFPO0FBQUEsVUFDVDtBQUNBLGNBQUksR0FBRyxTQUFTLGVBQWUsRUFBRyxRQUFPO0FBQ3pDLGNBQUksR0FBRyxTQUFTLFNBQVMsRUFBRyxRQUFPO0FBQ25DLGNBQUksR0FBRyxTQUFTLFNBQVMsRUFBRyxRQUFPO0FBSW5DLGlCQUFPO0FBQUEsUUFDVDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
