// src/seo/autonomy/signals.ts
//
// Maps raw evidence into the 0–1 OpportunitySignals / RiskSignals the scorer
// consumes. This is the "how much upside, how much danger" translation layer;
// classify.ts owns the rules, this file owns the arithmetic. Deterministic and
// explainable: every number here can be recomputed by hand from the evidence.
//
// Pure. No I/O.

import type { ActionType } from './policy';
import type { OpportunitySignals, RiskSignals } from './classify';
import type { PageFunnelStats, PageSearchStats, QueryStat } from './evidence';

const clamp01 = (n: number): number => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));

/**
 * Expected organic CTR by average position. A conservative curve (below most
 * published industry curves) so a "CTR gap" is only flagged when it is real.
 */
export function expectedCtr(position: number): number {
  if (position <= 1) return 0.28;
  if (position <= 2) return 0.15;
  if (position <= 3) return 0.10;
  if (position <= 4) return 0.07;
  if (position <= 5) return 0.05;
  if (position <= 10) return 0.03;
  if (position <= 20) return 0.012;
  return 0.005;
}

/** How much a title/description change can plausibly move a page at this position. */
export function positionUpside(position: number): number {
  if (position <= 0) return 0;
  if (position <= 3) return 0.6;   // already visible; upside is CTR not rank
  if (position <= 15) return 1;    // the sweet spot for snippet changes
  if (position <= 30) return 0.5;
  return 0.1;
}

/** Vocabulary that marks a query as inside the movement-learning category. */
export const CATEGORY_TERMS = [
  'trace', 'tracing', 'letter', 'letters', 'alphabet', 'air', 'webcam', 'camera', 'gesture', 'hand',
  'draw', 'drawing', 'kids', 'kid', 'children', 'child', 'preschool', 'nursery', 'eyfs', 'ks1',
  'phonics', 'shapes', 'numbers', 'handwriting', 'pre-writing', 'prewriting', 'movement', 'active',
  'screen time', 'learning', 'game', 'games', 'reception', 'toddler',
];

export function intentMatchShare(queries: QueryStat[]): number {
  const total = queries.reduce((a, q) => a + q.impressions, 0);
  if (!total) return 0;
  const matched = queries
    .filter((q) => CATEGORY_TERMS.some((t) => q.query.toLowerCase().includes(t)))
    .reduce((a, q) => a + q.impressions, 0);
  return matched / total;
}

/** Log-scaled share of a maximum, so one giant page does not zero everything else. */
export function logShare(value: number, max: number): number {
  if (max <= 0 || value <= 0) return 0;
  return clamp01(Math.log1p(value) / Math.log1p(max));
}

/** Evidence confidence from impression volume: 1000+ impressions in the window is fully confident. */
export function evidenceConfidence(impressions: number): number {
  return logShare(impressions, 1000);
}

/** Commercial relevance by page class; the conversion hierarchy is locked (teachers/schools first). */
export function commercialRelevance(url: string): number {
  if (url === '/teachers' || url === '/schools' || url === '/pricing') return 1;
  if (url === '/parents' || url === '/') return 0.8;
  if (url === '/letter-tracing') return 0.7;
  if (url.startsWith('/trace-') || url.startsWith('/activities/')) return 0.5;
  if (url.startsWith('/learn') || url.startsWith('/blog')) return 0.3;
  return 0.4;
}

export interface SiteMaxima {
  maxImpressions: number;
  maxDemoRate: number;       // best qualified-demo-start rate per session across pages
  maxCompletionRate: number;
  maxSignupRate: number;
}

export function siteMaxima(search: PageSearchStats[], funnel: PageFunnelStats[]): SiteMaxima {
  const rate = (n: number, d: number): number => (d > 0 ? n / d : 0);
  return {
    maxImpressions: Math.max(0, ...search.map((p) => p.impressions)),
    maxDemoRate: Math.max(0, ...funnel.map((f) => rate(f.qualifiedDemoStarts, f.sessions))),
    maxCompletionRate: Math.max(0, ...funnel.map((f) => rate(f.activityCompletions, f.sessions))),
    maxSignupRate: Math.max(0, ...funnel.map((f) => rate(f.signups + f.enquiries, f.sessions))),
  };
}

export function opportunitySignalsFor(
  page: PageSearchStats,
  funnel: PageFunnelStats | undefined,
  maxima: SiteMaxima,
): OpportunitySignals {
  const exp = expectedCtr(page.position);
  const gap = exp > 0 ? (exp - page.ctr) / exp : 0;
  const rel = (n: number, d: number, max: number): number => (d > 0 && max > 0 ? clamp01((n / d) / max) : 0);
  return {
    searchDemand: logShare(page.queries.reduce((a, q) => a + q.impressions, 0), maxima.maxImpressions),
    impressions: logShare(page.impressions, maxima.maxImpressions),
    rankingPosition: positionUpside(page.position),
    ctrGap: clamp01(gap),
    intentMatch: clamp01(intentMatchShare(page.queries)),
    qualifiedDemoStarts: funnel ? rel(funnel.qualifiedDemoStarts, funnel.sessions, maxima.maxDemoRate) : 0,
    activityCompletion: funnel ? rel(funnel.activityCompletions, funnel.sessions, maxima.maxCompletionRate) : 0,
    signup: funnel ? rel(funnel.signups + funnel.enquiries, funnel.sessions, maxima.maxSignupRate) : 0,
    commercialRelevance: commercialRelevance(page.url),
    evidenceConfidence: evidenceConfidence(page.impressions),
  };
}

/** Static risk profile of each executable action type (the metadata surface). */
const ACTION_RISK: Record<string, Partial<RiskSignals>> = {
  meta_description:              { indexationImpact: 0.10, canonicalImpact: 0.05, contentMagnitude: 0.15, positioningImpact: 0.15 },
  page_description_from_queries: { indexationImpact: 0.10, canonicalImpact: 0.05, contentMagnitude: 0.15, positioningImpact: 0.15 },
  fix_duplicate_metadata:        { indexationImpact: 0.15, canonicalImpact: 0.05, contentMagnitude: 0.15, positioningImpact: 0.10 },
  page_title:                    { indexationImpact: 0.20, canonicalImpact: 0.05, contentMagnitude: 0.35, positioningImpact: 0.35 },
  canonical_fix:                 { indexationImpact: 0.60, canonicalImpact: 0.80, contentMagnitude: 0.05, positioningImpact: 0.05 },
};

export function riskSignalsFor(
  action: ActionType,
  page: PageSearchStats,
  opts: { urlsAffected?: number; cannibalisationSuspected?: boolean } = {},
): RiskSignals {
  const base = ACTION_RISK[action] ?? { indexationImpact: 0.5, canonicalImpact: 0.5, contentMagnitude: 0.5, positioningImpact: 0.5 };
  const urls = opts.urlsAffected ?? 1;
  const homepageOrPositioning = page.url === '/' || page.url === '/teachers' || page.url === '/schools';
  return {
    urlsAffected: clamp01(urls / 5),
    indexationImpact: base.indexationImpact ?? 0.5,
    canonicalImpact: clamp01((base.canonicalImpact ?? 0.5) + (opts.cannibalisationSuspected ? 0.3 : 0)),
    contentMagnitude: base.contentMagnitude ?? 0.5,
    positioningImpact: clamp01((base.positioningImpact ?? 0.5) + (homepageOrPositioning ? 0.25 : 0)),
    technicalImpact: 0.05,
    uxImpact: 0.05,
    privacySecurityImpact: 0,
    irreversibility: 0.05,
    evidenceUncertainty: 1 - evidenceConfidence(page.impressions),
  };
}
