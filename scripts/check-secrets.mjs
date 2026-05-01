#!/usr/bin/env node
/**
 * check-secrets — pre-commit / CI guardrail.
 *
 * Fails (exit 1) if:
 *   1. Any known-leaked literal value appears in tracked .env* files
 *      (admin123, changeme, etc.). These are the values that have shown
 *      up as real defaults or placeholders in this codebase before.
 *   2. Any staged file (when run pre-commit) contains those literals,
 *      or matches common credential patterns (private keys, AWS keys).
 *
 * Run manually:
 *   npm run check:secrets
 *
 * Pre-commit usage:
 *   Add to .git/hooks/pre-commit (or husky / lefthook config):
 *     #!/bin/sh
 *     npm run check:secrets
 *
 * Plain Node ESM, zero dependencies, runs on Node 18+.
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const REPO_ROOT = process.cwd();

// ─── KNOWN-LEAKED LITERALS ─────────────────────────────────────────────
// Strings that have either been used as default fallbacks in this codebase
// (and therefore shipped as real credentials in the past) OR placeholder
// strings from .env.example that should never appear in real .env files.
const LEAKED_LITERALS = [
  'admin123',
  'changeme',
  'your-strong-pin-here',
  'your-supabase-anon-key',
  'your-anthropic-api-key',
  'your-stripe-secret-key',
  'change-me-please',
  'replace-me',
];

// ─── CREDENTIAL PATTERNS ───────────────────────────────────────────────
// Heuristic regexes for common credential shapes. Designed for low false
// positive rate, not exhaustive coverage.
const CREDENTIAL_PATTERNS = [
  { name: 'AWS access key', regex: /AKIA[0-9A-Z]{16}/g },
  { name: 'PEM private key', regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { name: 'Stripe live secret', regex: /sk_live_[0-9a-zA-Z]{20,}/g },
  { name: 'Anthropic API key', regex: /sk-ant-[a-zA-Z0-9_-]{20,}/g },
  { name: 'GitHub PAT', regex: /ghp_[A-Za-z0-9]{36,}/g },
];

// ─── ENV FILE SCAN ─────────────────────────────────────────────────────
const findEnvFiles = (dir, results = []) => {
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git' || entry === 'dist'
        || entry === '.next' || entry === '.claude') continue;
    const full = join(dir, entry);
    let stats;
    try { stats = statSync(full); } catch { continue; }
    if (stats.isDirectory()) {
      findEnvFiles(full, results);
    } else if (/^\.env(\.[a-zA-Z0-9._-]+)?$/.test(entry)) {
      results.push(full);
    }
  }
  return results;
};

const scanEnvFile = (path) => {
  const issues = [];
  let content;
  try { content = readFileSync(path, 'utf8'); }
  catch { return issues; }

  for (const literal of LEAKED_LITERALS) {
    if (content.includes(literal)) {
      issues.push({
        file: relative(REPO_ROOT, path),
        kind: 'leaked-literal',
        match: literal,
      });
    }
  }
  return issues;
};

// ─── STAGED FILE SCAN (pre-commit mode) ────────────────────────────────
const getStagedFiles = () => {
  try {
    const out = execSync('git diff --cached --name-only --diff-filter=ACMR', {
      cwd: REPO_ROOT, encoding: 'utf8',
    });
    return out.split('\n').filter(Boolean);
  } catch {
    return [];
  }
};

const scanStagedFile = (path) => {
  const issues = [];
  if (!existsSync(path)) return issues;

  // Skip binary files
  let content;
  try { content = readFileSync(path, 'utf8'); }
  catch { return issues; }

  for (const literal of LEAKED_LITERALS) {
    if (content.includes(literal)) {
      issues.push({ file: path, kind: 'leaked-literal', match: literal });
    }
  }
  for (const { name, regex } of CREDENTIAL_PATTERNS) {
    const found = content.match(regex);
    if (found) {
      issues.push({ file: path, kind: name, match: found[0].slice(0, 40) + '…' });
    }
  }
  return issues;
};

// ─── MAIN ──────────────────────────────────────────────────────────────
// Issues in .env.example (and similar template files) are informational —
// the placeholders are intentional. Issues in real .env files are blockers.
const isExampleEnv = (path) =>
  /\.env\.(example|template|sample)$/i.test(path);

const main = () => {
  const errors = [];
  const warnings = [];

  // 1. Scan all .env* files in the working tree
  const envFiles = findEnvFiles(REPO_ROOT);
  for (const f of envFiles) {
    const issues = scanEnvFile(f);
    if (issues.length === 0) continue;
    if (isExampleEnv(f)) {
      warnings.push(...issues);
    } else {
      errors.push(...issues);
    }
  }

  // 2. Scan staged files (pre-commit mode — only if there ARE staged files)
  const staged = getStagedFiles();
  for (const path of staged) {
    if (path.includes('node_modules') || path.includes('dist/')) continue;
    const issues = scanStagedFile(path);
    if (issues.length === 0) continue;
    if (isExampleEnv(path)) {
      warnings.push(...issues);
    } else {
      errors.push(...issues);
    }
  }

  if (warnings.length > 0) {
    console.warn('⚠ check-secrets: placeholder values in template files (informational):');
    for (const w of warnings) {
      console.warn(`  ${w.file}: ${w.kind} → ${w.match}`);
    }
    console.warn('');
  }

  if (errors.length === 0) {
    console.log('✓ check-secrets: no leaked literals or credential patterns detected.');
    process.exit(0);
  }

  console.error('✗ check-secrets: found potential secrets:');
  for (const e of errors) {
    console.error(`  ${e.file}: ${e.kind} → ${e.match}`);
  }
  console.error('');
  console.error('  • Replace placeholder values with real secrets stored outside the repo.');
  console.error('  • Never commit real keys.');
  console.error('  • If a value here is a deliberate placeholder, rename the file to .env.example.');
  process.exit(1);
};

main();
