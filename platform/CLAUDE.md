# This folder: teacher platform (separate app)

Next.js 14 app for teacher accounts, auth, and billing (app.drawintheair.com).
Independent of the root Vite app — React 18 (not 19), its own package.json and node_modules.

# Rules that only apply here

- Run all npm commands from `platform/`, not the repo root.
- Commands: `npm run dev` (port 3000) · `npm run build` · `npm run lint`.
- Stripe handles real money — never change billing or webhook logic without asking
  first, and never test against live keys.
- Server code here may use privileged Supabase keys — keep them server-only, never
  in components or anything client-bundled.
- App Router in `src/app/`, shared code in `src/lib/`, `middleware.ts` gates auth.
