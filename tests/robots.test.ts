/**
 * robots.txt vs the prerendered public route list (DIA-017).
 *
 * robots.txt rules are prefix matches, so "Disallow: /school" also blocks
 * /schools and /schools/training, and "Disallow: /parent" blocks /parents.
 * That shipped to production and hid three sitemap-submitted marketing
 * pages from Google. This test parses the real public/robots.txt with a
 * small matcher that follows the Google robots.txt rules (longest matching
 * pattern wins, "*" wildcard, "$" end anchor, Allow wins a tie) and checks
 * every route the SSG build prerenders.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PRERENDER_PATHS } from '../src/seo/prerender-paths';

interface Rule {
  allow: boolean;
  pattern: string;
}

/** Rules from the "User-agent: *" group(s) of a robots.txt file. */
function parseWildcardRules(text: string): Rule[] {
  const rules: Rule[] = [];
  let inWildcardGroup = false;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (field === 'user-agent') {
      // Consecutive User-agent lines share one group.
      if (!lastWasAgent) inWildcardGroup = false;
      if (value === '*') inWildcardGroup = true;
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!inWildcardGroup) continue;
    if (field === 'allow' || field === 'disallow') {
      if (value === '') continue; // empty Disallow means allow all
      rules.push({ allow: field === 'allow', pattern: value });
    }
  }
  return rules;
}

function patternMatches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const source = body
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${source}${anchored ? '$' : ''}`).test(path);
}

/** True when the wildcard crawler may fetch `path`. */
export function isAllowed(rules: Rule[], path: string): boolean {
  let best: Rule | null = null;
  for (const rule of rules) {
    if (!patternMatches(rule.pattern, path)) continue;
    if (
      best === null ||
      rule.pattern.length > best.pattern.length ||
      (rule.pattern.length === best.pattern.length && rule.allow && !best.allow)
    ) {
      best = rule;
    }
  }
  return best === null ? true : best.allow;
}

const robotsText = readFileSync(resolve(__dirname, '../public/robots.txt'), 'utf8');
const rules = parseWildcardRules(robotsText);

// /school is the pilot application form. It is prerendered so the page
// loads without JavaScript, but it is not in the sitemap and has always
// been kept out of the index on purpose (audit web.md, route map).
const INTENTIONALLY_BLOCKED = new Set(['/school']);

describe('robots.txt matcher', () => {
  const sample = parseWildcardRules(
    'User-agent: *\nAllow: /\nDisallow: /a$\nDisallow: /a/\nDisallow: /b\nDisallow: /*?debug=\n',
  );

  it('treats a bare path as a prefix and "$" as an exact match', () => {
    expect(isAllowed(sample, '/b')).toBe(false);
    expect(isAllowed(sample, '/bee')).toBe(false);
    expect(isAllowed(sample, '/a')).toBe(false);
    expect(isAllowed(sample, '/a/x')).toBe(false);
    expect(isAllowed(sample, '/ab')).toBe(true);
    expect(isAllowed(sample, '/play?debug=1')).toBe(false);
    expect(isAllowed(sample, '/play')).toBe(true);
  });

  it('prefers the longest matching rule and Allow on a tie', () => {
    const r = parseWildcardRules('User-agent: *\nDisallow: /x\nAllow: /x/open\nAllow: /y\nDisallow: /y\n');
    expect(isAllowed(r, '/x/closed')).toBe(false);
    expect(isAllowed(r, '/x/open/page')).toBe(true);
    expect(isAllowed(r, '/y')).toBe(true);
  });

  it('ignores rules outside the wildcard group', () => {
    const r = parseWildcardRules('User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nAllow: /\n');
    expect(isAllowed(r, '/anything')).toBe(true);
  });
});

describe('public/robots.txt against the prerendered routes', () => {
  it('prerenders the 94 production routes', () => {
    expect(PRERENDER_PATHS).toHaveLength(94);
    expect(new Set(PRERENDER_PATHS).size).toBe(94);
  });

  it('does not disallow any public prerendered route', () => {
    const blocked = PRERENDER_PATHS.filter((p) => !INTENTIONALLY_BLOCKED.has(p) && !isAllowed(rules, p));
    expect(blocked).toEqual([]);
  });

  it('keeps the marketing pages that DIA-017 found blocked crawlable', () => {
    for (const p of ['/schools', '/schools/training', '/parents', '/parents/setup', '/teachers']) {
      expect(isAllowed(rules, p), p).toBe(true);
    }
  });

  it('still blocks the private and app surfaces', () => {
    for (const p of [
      '/school',
      '/school/',
      '/parent',
      '/parent/dashboard',
      '/parent/login',
      '/admin',
      '/admin/insights',
      '/demo',
      '/play?debug=1',
    ]) {
      expect(isAllowed(rules, p), p).toBe(false);
    }
  });
});
