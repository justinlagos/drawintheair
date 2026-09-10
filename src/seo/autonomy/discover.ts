// src/seo/autonomy/discover.ts
//
// Discovery: turn evidence into a ranked list of candidate opportunities, each
// with the evidence that supports it. Only opportunities the metadata executor
// can act on are emitted (title / description / duplicate-metadata fixes);
// everything else is out of scope for the engine, by policy.
//
// Deterministic heuristics, documented thresholds, no invented copy. Pure.

import type { ActionType } from './policy';
import type { PageSearchStats, QueryStat, SiteEvidence } from './evidence';
import { isEngineEligiblePath } from './evidence';
import type { SiteMetadata } from './executor';
import { expectedCtr } from './signals';

export interface DiscoveryThresholds {
  minImpressions: number;          // page must have at least this many in the window
  maxPosition: number;             // beyond this, snippet changes do not move clicks
  ctrGapRatio: number;             // flag when actual CTR < expected × this
  minQueryImpressions: number;     // a query must have this many to "support" a title
  titleQueryShare: number;         // the query must be this share of the page's impressions
  cannibalisationShare: number;    // a query splitting ≥ this share across ≥2 pages
}

export const DEFAULT_THRESHOLDS: DiscoveryThresholds = {
  minImpressions: 200,
  maxPosition: 20,
  ctrGapRatio: 0.5,
  minQueryImpressions: 100,
  titleQueryShare: 0.2,
  cannibalisationShare: 0.25,
};

export type OpportunityKind =
  | 'ctr_gap'                 // visible but under-clicked: description rewrite
  | 'title_query_mismatch'    // the page's dominant query is absent from its title
  | 'duplicate_metadata'      // two pages share a title or description
  | 'missing_description';

export interface Opportunity {
  kind: OpportunityKind;
  url: string;
  actionType: ActionType;
  /** The query rows that back this opportunity (empty for metadata hygiene). */
  supportingQueries: QueryStat[];
  /** Plain-English, evidence-first rationale for the audit log. */
  rationale: string;
  /** Pointer the learning memory stores alongside the outcome. */
  evidenceRef: string;
  /** Pages competing for the same query, if cannibalisation is suspected. */
  cannibalisationWith: string[];
}

const STOP = new Set(['the', 'a', 'an', 'for', 'to', 'of', 'in', 'on', 'and', 'or', 'with', 'free', 'online', 'app', 'kids', 'children', 'is', 'how', 'what', 'my']);

/** Core tokens of a query, minus stop words, for title-coverage checks. */
export function coreTokens(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((t) => t && !STOP.has(t));
}

/** True when the title already carries the query's core meaning. */
export function titleCoversQuery(title: string, query: string): boolean {
  const t = title.toLowerCase();
  const toks = coreTokens(query);
  if (toks.length === 0) return true;
  const hits = toks.filter((k) => t.includes(k)).length;
  return hits / toks.length >= 0.6;
}

/** Queries whose impressions split materially across two or more pages. */
export function detectCannibalisation(search: PageSearchStats[], share: number): Map<string, string[]> {
  const byQuery = new Map<string, { url: string; impressions: number }[]>();
  for (const p of search) for (const q of p.queries) {
    const key = q.query.toLowerCase();
    const arr = byQuery.get(key) ?? [];
    arr.push({ url: p.url, impressions: q.impressions });
    byQuery.set(key, arr);
  }
  const out = new Map<string, string[]>();
  for (const [query, pages] of byQuery) {
    if (pages.length < 2) continue;
    const total = pages.reduce((a, x) => a + x.impressions, 0);
    const heavy = pages.filter((x) => total > 0 && x.impressions / total >= share).map((x) => x.url);
    if (heavy.length >= 2) out.set(query, heavy);
  }
  return out;
}

export function discoverOpportunities(
  evidence: SiteEvidence,
  metadata: SiteMetadata,
  thresholds: DiscoveryThresholds = DEFAULT_THRESHOLDS,
): Opportunity[] {
  const out: Opportunity[] = [];
  const cannibal = detectCannibalisation(evidence.search, thresholds.cannibalisationShare);
  const cannibalPagesFor = (url: string, queries: QueryStat[]): string[] => {
    const s = new Set<string>();
    for (const q of queries) for (const u of cannibal.get(q.query.toLowerCase()) ?? []) if (u !== url) s.add(u);
    return [...s];
  };

  for (const page of evidence.search) {
    if (!isEngineEligiblePath(page.url)) continue;
    const meta = metadata[page.url];
    if (!meta) continue; // the engine only edits pages whose metadata it owns
    if (page.impressions < thresholds.minImpressions) continue;
    const topQueries = page.queries.slice(0, 5);

    // 1. Title / query mismatch (AMBER page_title). Strongest single signal.
    const dominant = page.queries[0];
    if (dominant && dominant.impressions >= thresholds.minQueryImpressions
        && dominant.impressions / page.impressions >= thresholds.titleQueryShare
        && !titleCoversQuery(meta.title, dominant.query)) {
      out.push({
        kind: 'title_query_mismatch',
        url: page.url,
        actionType: 'page_title',
        supportingQueries: [dominant, ...topQueries.filter((q) => q !== dominant)],
        rationale: `"${dominant.query}" is ${(100 * dominant.impressions / page.impressions).toFixed(0)}% of this page's ${page.impressions} impressions (avg position ${dominant.position.toFixed(1)}) but the title does not carry it.`,
        evidenceRef: `gsc:${evidence.window.from}..${evidence.window.to}:${page.url}:q=${dominant.query}`,
        cannibalisationWith: cannibalPagesFor(page.url, [dominant]),
      });
      continue; // one hypothesis per page per cycle
    }

    // 2. CTR gap at a visible position (GREEN meta_description).
    if (page.position <= thresholds.maxPosition) {
      const exp = expectedCtr(page.position);
      if (page.ctr < exp * thresholds.ctrGapRatio) {
        out.push({
          kind: 'ctr_gap',
          url: page.url,
          actionType: 'meta_description',
          supportingQueries: topQueries,
          rationale: `CTR ${(100 * page.ctr).toFixed(1)}% vs ~${(100 * exp).toFixed(1)}% expected at position ${page.position.toFixed(1)} over ${page.impressions} impressions.`,
          evidenceRef: `gsc:${evidence.window.from}..${evidence.window.to}:${page.url}:ctr`,
          cannibalisationWith: cannibalPagesFor(page.url, topQueries),
        });
        continue;
      }
    }
  }

  // 3. Metadata hygiene across the pages the engine owns (GREEN).
  const seenTitle = new Map<string, string>();
  const seenDesc = new Map<string, string>();
  const flagged = new Set(out.map((o) => o.url));
  for (const [url, meta] of Object.entries(metadata)) {
    if (!isEngineEligiblePath(url) || flagged.has(url)) continue;
    if (!meta.description || meta.description.trim().length < 40) {
      out.push({
        kind: 'missing_description', url, actionType: 'meta_description', supportingQueries: [],
        rationale: 'Description missing or under 40 characters.',
        evidenceRef: `site:${url}:description`, cannibalisationWith: [],
      });
      flagged.add(url);
      continue;
    }
    const t = meta.title.trim().toLowerCase();
    const d = meta.description.trim().toLowerCase();
    const dupT = seenTitle.get(t);
    const dupD = seenDesc.get(d);
    if (dupT || dupD) {
      out.push({
        kind: 'duplicate_metadata', url, actionType: 'fix_duplicate_metadata', supportingQueries: [],
        rationale: `Shares its ${dupT ? 'title' : 'description'} with ${dupT ?? dupD}.`,
        evidenceRef: `site:${url}:duplicate:${dupT ?? dupD}`, cannibalisationWith: [dupT ?? dupD ?? ''].filter(Boolean),
      });
      flagged.add(url);
    }
    seenTitle.set(t, url);
    seenDesc.set(d, url);
  }

  // Funnel data does not create opportunities on its own (a page with no search
  // visibility has nothing for a snippet change to lift); the planner uses it
  // to score and the report shows usage next to visibility.
  return out;
}
