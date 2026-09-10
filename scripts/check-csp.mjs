#!/usr/bin/env node
/**
 * scripts/check-csp.mjs
 *
 * Build-time guard: fails the build if vercel.json's
 * Content-Security-Policy is missing any of the origins the app
 * absolutely needs to function.
 *
 * History: a previous CSP rewrite shipped without
 *   https://cdn.jsdelivr.net   (where MediaPipe WASM lives)
 *   https://storage.googleapis.com  (where the hand_landmarker model lives)
 * which silently broke ALL hand tracking across every browser, every
 * device. Took 3 days to diagnose because the symptom looked like a
 * model-init bug. Never again.
 *
 * Add new entries to REQUIRED_CONNECT_SRC / REQUIRED_SCRIPT_SRC below
 * any time the app starts depending on a new external origin.
 *
 * Usage (wired as `prebuild` in package.json):
 *   node scripts/check-csp.mjs
 *
 * Exits non-zero with a clear message if anything is missing, so CI
 * (and Vercel's build) fails before a broken CSP can ever ship.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const vercelJsonPath = path.join(repoRoot, 'vercel.json');

// ─────────────────────────────────────────────────────────────────────
// Origins the app cannot function without. Each entry must be in the
// matching CSP directive in vercel.json or this script fails the build.
//
// Format: { directive: 'connect-src' | 'script-src' | …, origin, why, owner }
// ─────────────────────────────────────────────────────────────────────
const REQUIREMENTS = [
    // ── MediaPipe hand tracking — load + inference ───────────────────
    // Since WP2B.3 (DIA-020) the runtime loads from our own origin first
    // (/mediapipe/<version>/, covered by 'self' in script-src, connect-src
    // and the 'unsafe-eval' already in script-src for WebAssembly). The
    // CDN hosts below stay allowed as the automatic fallback.
    {
        directive: 'script-src',
        origin: "'self'",
        why: 'Self-hosted MediaPipe vision_wasm_internal.js loader script',
        owner: 'src/core/trackingAssets.ts → SELF_HOSTED_WASM_PATH',
    },
    {
        directive: 'connect-src',
        origin: "'self'",
        why: 'Self-hosted MediaPipe WASM binary + hand_landmarker.task model',
        owner: 'src/core/trackingAssets.ts → SELF_HOSTED_MODEL_PATH',
    },
    {
        directive: 'connect-src',
        origin: 'https://cdn.jsdelivr.net',
        why: 'MediaPipe Tasks Vision WASM (hand tracker WebAssembly), CDN fallback',
        owner: 'src/core/trackingAssets.ts → CDN_WASM_BASE_URL',
    },
    {
        directive: 'script-src',
        origin: 'https://cdn.jsdelivr.net',
        why: 'MediaPipe vision_wasm_internal.js loader script, CDN fallback',
        owner: 'src/core/trackingAssets.ts → CDN_WASM_BASE_URL',
    },
    {
        directive: 'connect-src',
        origin: 'https://storage.googleapis.com',
        why: 'MediaPipe hand_landmarker.task model file, CDN fallback',
        owner: 'src/core/trackingAssets.ts → CDN_MODEL_URL',
    },
    // ── Worker support — MediaPipe spawns blob: workers internally ───
    {
        directive: 'worker-src',
        origin: 'blob:',
        why: 'MediaPipe spawns Web Workers from blob URLs for WASM threading',
        owner: 'MediaPipe Tasks Vision (internal)',
    },
    // ── Supabase (auth + analytics backend) ─────────────────────────
    // NOT listed here: the Supabase origin differs per policy block
    // (production hostnames get the production project, preview URLs get
    // staging), so a single required origin cannot be right for both.
    // checkSupabaseSplit() below asserts the correct origin per block,
    // including its wss:// twin.
    // ── Form submission backend ──────────────────────────────────────
    {
        directive: 'connect-src',
        origin: 'https://script.google.com',
        why: 'School pilot pack + feedback form submission endpoint',
        owner: 'src/lib/formSubmission.ts',
    },
    // ── Fonts ────────────────────────────────────────────────────────
    {
        directive: 'style-src',
        origin: 'https://fonts.googleapis.com',
        why: 'Fredoka + Nunito Google Fonts CSS',
        owner: 'index.html <link rel="stylesheet">',
    },
    {
        directive: 'font-src',
        origin: 'https://fonts.gstatic.com',
        why: 'Fredoka + Nunito font binaries',
        owner: 'fonts.googleapis.com CSS',
    },
    // ── Meta (Facebook) Pixel ────────────────────────────────────────
    {
        directive: 'script-src',
        origin: 'https://connect.facebook.net',
        why: 'Meta Pixel fbevents.js base script',
        owner: 'src/lib/observability/meta.ts → initMetaPixel',
    },
    {
        directive: 'connect-src',
        origin: 'https://www.facebook.com',
        why: 'Meta Pixel event beacons (tr/ endpoint)',
        owner: 'src/lib/observability/meta.ts',
    },
    {
        directive: 'connect-src',
        origin: 'https://graph.facebook.com',
        why: 'Meta Graph API (reserved for any client-side CAPI; server CAPI runs from Supabase)',
        owner: 'src/lib/observability/meta.ts',
    },
];

// ─────────────────────────────────────────────────────────────────────
// Validate
// ─────────────────────────────────────────────────────────────────────
function readCspPolicies() {
    const raw = fs.readFileSync(vercelJsonPath, 'utf8');
    const json = JSON.parse(raw);
    const headerBlocks = json.headers || [];
    const found = [];
    for (const block of headerBlocks) {
        for (const h of block.headers || []) {
            if (h.key === 'Content-Security-Policy') {
                const host = (block.has || []).find(c => c.type === 'host');
                found.push({
                    label: host ? `host=${host.value}` : 'preview/fallback (no host condition)',
                    value: h.value,
                });
            }
        }
    }
    return found;
}

// Since WP1A.2 the CSP is split by host: the production hostnames get a
// policy naming the production Supabase origin, and the fallback block
// (every preview URL) names the staging origin instead. Previews point at
// staging, so a CSP that only ever allowed production silently blocked
// every Supabase call on a preview - which is exactly how WP1A.2 first
// failed its acceptance test. Both policies are validated below, and the
// Supabase origin each one carries is asserted, so the split cannot rot.
const PROD_SUPABASE = 'https://fmrsfjxwswzhvicylaph.supabase.co';
const STAGING_SUPABASE = 'https://dcivdrhxeaiulbbhsgfv.supabase.co';

function checkSupabaseSplit(policies) {
    const problems = [];
    for (const p of policies) {
        const isProdHost = p.label.startsWith('host=') && p.label.includes('drawintheair.com');
        const want = isProdHost ? PROD_SUPABASE : STAGING_SUPABASE;
        const forbid = isProdHost ? STAGING_SUPABASE : PROD_SUPABASE;
        if (!p.value.includes(want)) {
            problems.push(`${p.label}: connect-src is missing ${want}`);
        }
        if (p.value.includes(forbid)) {
            problems.push(`${p.label}: connect-src must not name ${forbid}`);
        }
        if (!p.value.includes('wss://' + want.replace('https://', ''))) {
            problems.push(`${p.label}: connect-src is missing the wss:// origin for realtime`);
        }
    }
    return problems;
}

// Vercel applies every matching header rule in array order and, for a
// given header key, the LAST match wins. Both host-specific blocks and the
// unconditioned fallback block match the apex host, so if the fallback
// (which names staging) sits AFTER the production host block, it silently
// overrides it and the live site at drawintheair.com ends up pointing at
// the staging database. That shipped once (Gate 3) and broke every data
// call on production; the preview-only acceptance never saw it because the
// bug only manifests on the apex host. This guard makes the ordering a
// build failure: no unconditioned CSP block may follow a host-conditioned
// one.
function checkHostOverrideOrder() {
    const json = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
    const blocks = json.headers || [];
    const problems = [];
    let lastHostCspIndex = -1;
    blocks.forEach((block, i) => {
        const hasCsp = (block.headers || []).some(h => h.key === 'Content-Security-Policy');
        if (!hasCsp) return;
        const host = (block.has || []).find(c => c.type === 'host');
        if (host) {
            lastHostCspIndex = i;
        } else if (lastHostCspIndex !== -1) {
            problems.push(
                `unconditioned CSP block at index ${i} follows a host-conditioned CSP ` +
                `block at index ${lastHostCspIndex}; Vercel's last-match-wins means it ` +
                `overrides the production host policy on the apex. Move the ` +
                `unconditioned (preview/staging) block BEFORE every host block.`,
            );
        }
    });
    return problems;
}

function parseCsp(csp) {
    // Returns: { 'connect-src': Set<origin>, 'script-src': Set<origin>, ... }
    const map = {};
    for (const part of csp.split(';').map(s => s.trim()).filter(Boolean)) {
        const tokens = part.split(/\s+/);
        const directive = tokens.shift();
        map[directive] = new Set(tokens);
    }
    return map;
}

function main() {
    if (!fs.existsSync(vercelJsonPath)) {
        console.error('[check-csp] FATAL: vercel.json not found at', vercelJsonPath);
        process.exit(2);
    }

    const policies = readCspPolicies();
    const csp = policies.length ? policies[0].value : null;
    if (!csp) {
        console.error('[check-csp] FATAL: no Content-Security-Policy header in vercel.json');
        process.exit(2);
    }

    // Every policy must carry every required origin, not just the first.
    const missing = [];
    for (const policy of policies) {
        const directives = parseCsp(policy.value);
        for (const req of REQUIREMENTS) {
            const allowed = directives[req.directive];
            if (!allowed || !allowed.has(req.origin)) {
                missing.push({ ...req, policy: policy.label });
            }
        }
    }

    const splitProblems = checkSupabaseSplit(policies);
    const orderProblems = checkHostOverrideOrder();

    if (orderProblems.length > 0) {
        console.error('');
        console.error('═══════════════════════════════════════════════════════════════');
        console.error('  ❌ CSP HEADER BLOCK ORDER LETS THE FALLBACK OVERRIDE PRODUCTION');
        console.error('═══════════════════════════════════════════════════════════════');
        console.error('');
        console.error('  Vercel applies matching header rules in order; the last match');
        console.error('  wins. An unconditioned CSP block after a host-conditioned one');
        console.error('  overrides it on the apex host, so drawintheair.com would serve');
        console.error('  the staging (preview) policy and every production data call is');
        console.error('  blocked. This exact bug shipped at Gate 3.');
        console.error('');
        for (const p of orderProblems) console.error(`    • ${p}`);
        console.error('');
        console.error('  Fix: in vercel.json, order the CSP blocks as');
        console.error('  [ …asset/mediapipe blocks, unconditioned fallback, host blocks ]');
        console.error('');
        process.exit(1);
    }

    if (missing.length === 0 && splitProblems.length === 0) {
        console.log(
            `[check-csp] ✓ all ${REQUIREMENTS.length} required origins present in ` +
            `${policies.length} policy block(s); Supabase host split correct.`,
        );
        return;
    }

    if (splitProblems.length > 0) {
        console.error('');
        console.error('═══════════════════════════════════════════════════════════════');
        console.error('  ❌ CSP SUPABASE HOST SPLIT IS WRONG');
        console.error('═══════════════════════════════════════════════════════════════');
        console.error('');
        console.error('  Production hostnames must allow the production Supabase');
        console.error('  origin; the fallback block (preview URLs) must allow the');
        console.error('  staging one. A preview whose CSP names production cannot');
        console.error('  reach staging at all, and every Supabase call fails.');
        console.error('');
        for (const p of splitProblems) console.error(`    • ${p}`);
        console.error('');
        console.error('  Fix: edit vercel.json → headers → Content-Security-Policy');
        console.error('');
        process.exit(1);
    }

    console.error('');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('  ❌ CSP IS MISSING ORIGINS THE APP NEEDS TO FUNCTION');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('');
    console.error(`  ${missing.length} required origin(s) not in vercel.json's CSP:`);
    console.error('');
    for (const m of missing) {
        console.error(`    • [${m.policy}] ${m.directive}: ${m.origin}`);
        console.error(`        why:   ${m.why}`);
        console.error(`        used:  ${m.owner}`);
        console.error('');
    }
    console.error('  Fix: edit vercel.json → headers → Content-Security-Policy');
    console.error('  and add the missing origins to the matching directive.');
    console.error('');
    console.error('  See docs/CSP_REQUIREMENTS.md for the full list and rationale.');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('');
    process.exit(1);
}

main();
