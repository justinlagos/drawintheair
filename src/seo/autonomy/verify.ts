// src/seo/autonomy/verify.ts
//
// Post-deploy verification: pure predicates over a fetched-page snapshot. The
// fetcher (added with credentials) produces PageSnapshots; this module decides
// pass/fail per check and whether an immediate rollback is warranted. Keeping
// it pure means the rules are unit-tested against fixtures, not the live site.

/** A minimal snapshot of a deployed page, produced by the (later) fetch adapter. */
export interface PageSnapshot {
  url: string;
  status: number;
  canonical: string | null;
  title: string | null;
  hasStructuredData: boolean;
  structuredDataValid: boolean;
  inSitemap: boolean;
  robotsBlocked: boolean;
}

export interface ExpectedPage {
  canonical: string;              // absolute URL the page must self-canonicalise to
  minTitleLength: number;
  requireStructuredData: boolean;
  mustBeInSitemap: boolean;
  mustNotBeRobotsBlocked: boolean;
}

export interface Check {
  name: string;
  pass: boolean;
  detail?: string;
}

export interface VerifyResult {
  url: string;
  pass: boolean;
  checks: Check[];
}

export function verifyPage(snap: PageSnapshot, expected: ExpectedPage): VerifyResult {
  const checks: Check[] = [];
  const add = (name: string, pass: boolean, detail?: string): void => { checks.push({ name, pass, detail }); };

  add('http_200', snap.status === 200, `status=${snap.status}`);
  add('canonical_correct', snap.canonical === expected.canonical,
    `got=${snap.canonical ?? 'none'} want=${expected.canonical}`);
  add('title_present', !!snap.title && snap.title.length >= expected.minTitleLength,
    `len=${snap.title?.length ?? 0} min=${expected.minTitleLength}`);
  if (expected.requireStructuredData) {
    add('structured_data_present', snap.hasStructuredData);
    add('structured_data_valid', snap.structuredDataValid);
  }
  if (expected.mustBeInSitemap) add('in_sitemap', snap.inSitemap);
  if (expected.mustNotBeRobotsBlocked) add('not_robots_blocked', !snap.robotsBlocked);

  return { url: snap.url, pass: checks.every((c) => c.pass), checks };
}

export interface CycleVerification {
  pass: boolean;
  pages: VerifyResult[];
  /** Immediate-rollback triggers hit across the cycle (see policy.rollback.immediate). */
  rollbackTriggers: string[];
}

/**
 * Aggregate page verifications into a cycle verdict and the set of immediate
 * rollback triggers. A single failed page trips the cycle; the triggers map
 * failures to the policy's named immediate-rollback conditions.
 */
export function verifyCycle(results: VerifyResult[]): CycleVerification {
  const triggers = new Set<string>();
  for (const r of results) {
    for (const c of r.checks) {
      if (c.pass) continue;
      if (c.name === 'http_200') triggers.add(r.url.endsWith('/404') ? 'increase_in_404s' : 'broken_routes');
      else if (c.name === 'canonical_correct') triggers.add('canonical_errors');
      else if (c.name === 'in_sitemap') triggers.add('sitemap_failure');
      else if (c.name === 'not_robots_blocked') triggers.add('robots_failure');
      else if (c.name.startsWith('structured_data')) triggers.add('structured_data_invalid');
    }
  }
  return {
    pass: results.every((r) => r.pass),
    pages: results,
    rollbackTriggers: [...triggers],
  };
}
