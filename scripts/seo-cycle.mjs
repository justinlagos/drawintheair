#!/usr/bin/env node
// scripts/seo-cycle.mjs
//
// Entry point the scheduled SEO Engine Action calls. Inert until credentials
// exist and the later components (scorer/planner/executor adapters) land: with
// no credentials it logs and exits 0 (shadow / no-op). It never writes anything.
//
// See docs/SEO_ENGINE.md for the full plan and the required secrets.

const REQUIRED = [
  'GSC_SERVICE_ACCOUNT_JSON', // Google Search Console API service account (read)
  'SUPABASE_URL',
  'SUPABASE_SERVICE_READ_KEY', // analytics read only
  'SEO_ENGINE_GH_TOKEN',       // branch + PR creation (auto-merge only past shadow)
];

const missing = REQUIRED.filter((k) => !process.env[k]);

if (missing.length > 0) {
  console.log('[seo-engine] credentials not configured; nothing to do.');
  console.log(`[seo-engine] missing: ${missing.join(', ')}`);
  console.log('[seo-engine] exiting 0 (shadow / no-op). See docs/SEO_ENGINE.md.');
  process.exit(0);
}

// Credentials present but the discover/score/plan/execute components are not
// wired yet — do nothing rather than pretend. This guard is replaced as those
// components land, and even then the autonomy mode in src/seo/autonomy/policy.ts
// governs whether anything reaches production.
console.log('[seo-engine] credentials present; engine cycle not yet implemented (components 2-8 pending).');
console.log('[seo-engine] exiting 0. No changes made.');
process.exit(0);
