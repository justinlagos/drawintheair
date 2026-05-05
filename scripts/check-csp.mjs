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
    {
        directive: 'connect-src',
        origin: 'https://cdn.jsdelivr.net',
        why: 'MediaPipe Tasks Vision WASM (hand tracker WebAssembly)',
        owner: 'src/core/handTracker.ts → WASM_BASE_URL',
    },
    {
        directive: 'script-src',
        origin: 'https://cdn.jsdelivr.net',
        why: 'MediaPipe vision_wasm_internal.js loader script',
        owner: 'src/core/handTracker.ts → FilesetResolver.forVisionTasks',
    },
    {
        directive: 'connect-src',
        origin: 'https://storage.googleapis.com',
        why: 'MediaPipe hand_landmarker.task model file',
        owner: 'src/core/handTracker.ts → MODEL_URL',
    },
    // ── Worker support — MediaPipe spawns blob: workers internally ───
    {
        directive: 'worker-src',
        origin: 'blob:',
        why: 'MediaPipe spawns Web Workers from blob URLs for WASM threading',
        owner: 'MediaPipe Tasks Vision (internal)',
    },
    // ── Supabase (auth + analytics backend) ─────────────────────────
    {
        directive: 'connect-src',
        origin: 'https://fmrsfjxwswzhvicylaph.supabase.co',
        why: 'Supabase REST + auth API',
        owner: 'src/lib/supabase.ts',
    },
    {
        directive: 'connect-src',
        origin: 'wss://fmrsfjxwswzhvicylaph.supabase.co',
        why: 'Supabase realtime websocket',
        owner: 'src/lib/supabase.ts',
    },
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
];

// ─────────────────────────────────────────────────────────────────────
// Validate
// ─────────────────────────────────────────────────────────────────────
function readCsp() {
    const raw = fs.readFileSync(vercelJsonPath, 'utf8');
    const json = JSON.parse(raw);
    const headerBlocks = json.headers || [];
    for (const block of headerBlocks) {
        for (const h of block.headers || []) {
            if (h.key === 'Content-Security-Policy') return h.value;
        }
    }
    return null;
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

    const csp = readCsp();
    if (!csp) {
        console.error('[check-csp] FATAL: no Content-Security-Policy header in vercel.json');
        process.exit(2);
    }

    const directives = parseCsp(csp);
    const missing = [];

    for (const req of REQUIREMENTS) {
        const allowed = directives[req.directive];
        if (!allowed || !allowed.has(req.origin)) {
            missing.push(req);
        }
    }

    if (missing.length === 0) {
        console.log(`[check-csp] ✓ all ${REQUIREMENTS.length} required CSP origins present.`);
        return;
    }

    console.error('');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('  ❌ CSP IS MISSING ORIGINS THE APP NEEDS TO FUNCTION');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('');
    console.error(`  ${missing.length} required origin(s) not in vercel.json's CSP:`);
    console.error('');
    for (const m of missing) {
        console.error(`    • ${m.directive}: ${m.origin}`);
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
