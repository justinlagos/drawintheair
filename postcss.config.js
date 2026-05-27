/**
 * PostCSS config — Vite auto-detects this file and runs Tailwind +
 * Autoprefixer at build time, replacing the old runtime Tailwind CDN.
 */
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
