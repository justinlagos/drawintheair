// src/seo/autonomy/evidence.ts
//
// The evidence layer: the normalised shapes the engine reasons over. Every
// opportunity, score and change in a cycle points back to one of these, so a
// change is never proposed without a measurable reason behind it.
//
// Pure types + URL normalisation helpers. No I/O. The adapters in
// scripts/seo-engine/ fill these from Search Console and the analytics DB.

/** One Search Console query row for a page. */
export interface QueryStat {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;        // 0–1
  position: number;   // average position, 1 = top
}

/** Page-level totals for a window, with the previous window for trend. */
export interface SearchTotals {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface PageSearchStats extends SearchTotals {
  url: string;                // canonical path, e.g. '/letter-tracing'
  queries: QueryStat[];       // sorted by impressions desc
  previous?: SearchTotals;    // same length window immediately before
}

/**
 * Funnel outcomes attributed to the page a session ENTERED on. This is the
 * "qualified organic usage" the policy optimises for; rankings are inputs only.
 */
export interface PageFunnelStats {
  url: string;
  sessions: number;
  organicSessions: number;        // entry referrer is a search engine, or utm_medium=organic
  qualifiedDemoStarts: number;    // sessions with ≥1 qualified demo start
  meaningfulInteractions: number; // sessions with ≥1 mode_started
  activityCompletions: number;    // sessions with ≥1 completion
  signups: number;                // sessions with a teacher/parent signup
  enquiries: number;              // sessions with a school pack / demo request submit
}

export interface EvidenceWindow {
  days: number;
  from: string;   // ISO date (inclusive)
  to: string;     // ISO date (inclusive)
}

export interface SiteEvidence {
  property: string;               // e.g. 'sc-domain:drawintheair.com'
  window: EvidenceWindow;
  search: PageSearchStats[];
  funnel: PageFunnelStats[];
  collectedAt: string;            // ISO timestamp
}

// ── URL normalisation ─────────────────────────────────────────────────────────
// GSC reports absolute URLs; analytics stores pathnames. Everything inside the
// engine is keyed by canonical path so the two sources join cleanly.

export function toPath(input: string): string {
  let s = input.trim();
  if (/^https?:\/\//i.test(s)) {
    try { s = new URL(s).pathname; } catch { /* keep as-is */ }
  }
  const q = s.indexOf('?'); if (q >= 0) s = s.slice(0, q);
  const h = s.indexOf('#'); if (h >= 0) s = s.slice(0, h);
  if (!s.startsWith('/')) s = '/' + s;
  if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
  return s.toLowerCase();
}

/** Surfaces the engine must never plan changes for (child play area, app, auth, admin). */
const NEVER_TOUCH_PREFIXES = ['/play', '/demo', '/app', '/school', '/parent/', '/admin', '/auth', '/login', '/signup', '/api'];

export function isEngineEligiblePath(path: string): boolean {
  const p = toPath(path);
  return !NEVER_TOUCH_PREFIXES.some((pre) => p === pre.replace(/\/$/, '') || p.startsWith(pre));
}

// ── Aggregation helpers ───────────────────────────────────────────────────────

export interface RawSearchRow {
  page: string;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/** Fold raw page×query rows into per-page stats with sorted query lists. */
export function aggregateSearchRows(rows: RawSearchRow[]): PageSearchStats[] {
  const byPage = new Map<string, { clicks: number; impressions: number; posWeighted: number; queries: QueryStat[] }>();
  for (const r of rows) {
    const url = toPath(r.page);
    const acc = byPage.get(url) ?? { clicks: 0, impressions: 0, posWeighted: 0, queries: [] };
    acc.clicks += r.clicks;
    acc.impressions += r.impressions;
    acc.posWeighted += r.position * r.impressions;
    acc.queries.push({ query: r.query, clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position });
    byPage.set(url, acc);
  }
  const out: PageSearchStats[] = [];
  for (const [url, a] of byPage) {
    a.queries.sort((x, y) => y.impressions - x.impressions);
    out.push({
      url,
      clicks: a.clicks,
      impressions: a.impressions,
      ctr: a.impressions ? a.clicks / a.impressions : 0,
      position: a.impressions ? a.posWeighted / a.impressions : 0,
      queries: a.queries,
    });
  }
  return out.sort((x, y) => y.impressions - x.impressions);
}

/** Attach previous-window totals to the current window's pages (by path). */
export function attachPrevious(current: PageSearchStats[], previous: PageSearchStats[]): PageSearchStats[] {
  const prev = new Map(previous.map((p) => [p.url, p]));
  return current.map((p) => {
    const q = prev.get(p.url);
    return q ? { ...p, previous: { clicks: q.clicks, impressions: q.impressions, ctr: q.ctr, position: q.position } } : p;
  });
}
