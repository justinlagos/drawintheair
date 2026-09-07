#!/usr/bin/env node
/**
 * Environment-safety guard for Draw in the Air.
 *
 * Fails the build/CI when an environment is misconfigured in a way that could
 * expose production data or leak privileged credentials. It NEVER prints secret
 * values — only variable names, the environment name, the deploy type, the
 * (public) Supabase project ref, and the git commit SHA.
 *
 * Run locally:   node scripts/check-env-safety.mjs
 * Run in CI:     node scripts/check-env-safety.mjs
 * Run on Vercel: add to the build command for Preview/Staging deployments.
 *
 * Source of truth: the PRODUCTION Supabase project ref is hard-listed below so
 * that Preview/Staging deployments cannot silently point at production.
 */

const PRODUCTION_SUPABASE_REF = 'fmrsfjxwswzhvicylaph';

const env = process.env;
const errors = [];
const warnings = [];

// ---- Determine environment identity --------------------------------------
// VERCEL_ENV is set automatically by Vercel: 'production' | 'preview' | 'development'.
// VITE_APP_ENV is our own optional override for local/staging.
const vercelEnv = env.VERCEL_ENV || '';
const appEnv = env.VITE_APP_ENV || '';
const environment = (appEnv || vercelEnv || 'unknown').toLowerCase();
const isProductionEnv = vercelEnv === 'production' || appEnv === 'production';
const isPreviewOrStaging =
  vercelEnv === 'preview' ||
  appEnv === 'preview' ||
  appEnv === 'staging';

// ---- Extract the Supabase project ref (public, safe to log) ---------------
function refFromUrl(url) {
  if (!url) return '';
  const m = String(url).match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  return m ? m[1] : '';
}
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || '';
const supabaseRef = refFromUrl(supabaseUrl);

// ---- Rule 1: Preview/Staging must NOT point at the production Supabase -----
// This script now runs inside every Vercel build (via `prebuild`). Until a
// non-production Supabase project exists for previews, this rule WARNS on
// preview so PR previews keep building; set ENV_SAFETY_STRICT_PREVIEW=1 in the
// Vercel Preview environment to make it fail (recommended once previews have
// their own Supabase project).
if (isPreviewOrStaging && supabaseRef && supabaseRef === PRODUCTION_SUPABASE_REF) {
  const msg =
    `Environment "${environment}" is pointing at the PRODUCTION Supabase project (${PRODUCTION_SUPABASE_REF}). ` +
    `Preview/Staging must use a non-production Supabase project.`;
  if (env.ENV_SAFETY_STRICT_PREVIEW === '1') errors.push(msg);
  else warnings.push(`${msg} (warning only — set ENV_SAFETY_STRICT_PREVIEW=1 to enforce)`);
}

// ---- Rule 2: No service-role / privileged secret in a public (VITE_) var ---
const PRIVILEGED_PATTERNS = [/service[_-]?role/i, /secret/i, /^sk_/i, /STRIPE_SECRET/i];
function looksLikeServiceRoleJwt(value) {
  // Supabase service_role keys are JWTs whose payload contains "service_role".
  if (typeof value !== 'string') return false;
  const parts = value.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = Buffer.from(parts[1], 'base64').toString('utf8');
    return /"role"\s*:\s*"service_role"/.test(payload);
  } catch {
    return false;
  }
}
for (const [name, value] of Object.entries(env)) {
  if (!name.startsWith('VITE_')) continue; // only client-exposed vars matter here
  if (PRIVILEGED_PATTERNS.some((re) => re.test(name))) {
    errors.push(`Public client variable "${name}" looks privileged. Service-role/secret keys must NEVER be exposed via VITE_.`);
  }
  if (looksLikeServiceRoleJwt(value)) {
    errors.push(`Public client variable "${name}" contains a Supabase service_role key. This would leak admin access to the browser.`);
  }
}

// ---- Rule 3: Required public vars present (FAIL on production, warn elsewhere)
// The client reads these in src/lib/supabase.ts and src/lib/analytics.ts and
// silently falls back to '' — a production bundle built without them ships a
// site where Class Mode, auth and analytics are dead. This script runs from
// `prebuild`, so a production build on Vercel cannot succeed without them.
// Local dev / CI / preview only warn so `npm run build` still works offline.
const REQUIRED_PUBLIC = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
for (const key of REQUIRED_PUBLIC) {
  if (!env[key]) {
    const msg = `Required environment variable "${key}" is missing.`;
    if (isProductionEnv) errors.push(msg);
    else warnings.push(msg);
  }
}
if (isProductionEnv && supabaseUrl && !supabaseRef) {
  errors.push(`VITE_SUPABASE_URL is set but is not a https://<ref>.supabase.co URL.`);
}

// ---- Rule 3b: Production builds must be Git builds of `master` -------------
// Deploy contract: production = master on the Vercel project, deployed only by
// merge. A `vercel --prod` from a laptop or a production build of another
// branch fails here. (A dashboard "Promote" of an existing deployment does not
// rebuild, so it cannot be caught by a build-time check — see
// docs/audits/evidence/release/WP1B.2/reproducible-builds.md.)
const PRODUCTION_BRANCH = 'master';
const gitRef = env.VERCEL_GIT_COMMIT_REF || '';
if (vercelEnv === 'production') {
  if (!gitRef) {
    errors.push(
      `Production build has no VERCEL_GIT_COMMIT_REF — production must be built by Vercel from Git (merge to ${PRODUCTION_BRANCH}), not from a CLI upload.`
    );
  } else if (gitRef !== PRODUCTION_BRANCH) {
    errors.push(
      `Production build is from branch "${gitRef}"; only "${PRODUCTION_BRANCH}" may deploy to production.`
    );
  }
}

// ---- Rule 4: Production env must actually use the production ref -----------
if (isProductionEnv && supabaseRef && supabaseRef !== PRODUCTION_SUPABASE_REF) {
  warnings.push(
    `Production environment is using Supabase ref "${supabaseRef}", not the expected production ref. ` +
      `Confirm this is intentional.`
  );
}

// ---- Report (no secret values) --------------------------------------------
const commit = env.VERCEL_GIT_COMMIT_SHA || env.GITHUB_SHA || '(unknown)';
console.log('— Environment safety check —');
console.log(`  environment:     ${environment}`);
console.log(`  vercel env:      ${vercelEnv || '(none)'}`);
console.log(`  supabase ref:    ${supabaseRef || '(none set)'}`);
console.log(`  commit:          ${String(commit).slice(0, 12)}`);

for (const w of warnings) console.warn(`  WARN  ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`  FAIL  ${e}`);
  console.error(`\nEnvironment safety check FAILED with ${errors.length} error(s).`);
  process.exit(1);
}
console.log('  OK    No environment-safety violations detected.');
