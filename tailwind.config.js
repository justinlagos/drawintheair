/**
 * Tailwind config — build-time replacement for the old runtime
 * `cdn.tailwindcss.com` Play CDN that used to live in index.html.
 *
 * Why this exists: the Play CDN shipped a ~126KB JIT compiler that ran
 * IN THE BROWSER on every page load (heavy CPU on old Android devices)
 * and was a render-blocking external dependency — if cdn.tailwindcss.com
 * was slow or blocked from a user's ISP (a real risk in some regions),
 * the page white-screened. Compiling at build time removes that entire
 * failure mode and ships only the ~handful of KB of utilities we use.
 *
 * The theme below is a 1:1 port of the inline `tailwind.config` that was
 * in index.html, so visual output should match. preflight stays disabled
 * because the app relies on its own hand-written base CSS (src/index.css,
 * App.css, component CSS).
 */
/** @type {import('tailwindcss').Config} */
export default {
  // Scan every place a className can appear so JIT generates all used
  // utilities. Broad on purpose — missing a file means missing styles.
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx,html}',
  ],
  corePlugins: {
    // The original CDN config disabled preflight; keep it off so we don't
    // suddenly reset margins/typography the app already styles itself.
    preflight: false,
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: { 900: '#0a0e1a', 800: '#111629', 700: '#1a2038' },
        cyan: { 400: '#22d3ee', 500: '#06b6d4' },
        orange: { 400: '#fb923c', 500: '#f97316' },
      },
    },
  },
  plugins: [],
};
