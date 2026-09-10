import { describe, expect, it } from 'vitest';
import { SEO_AUTONOMY_POLICY } from '../src/seo/autonomy/policy';
import {
  aggregateSearchRows, attachPrevious, isEngineEligiblePath, toPath,
  type PageFunnelStats, type SiteEvidence,
} from '../src/seo/autonomy/evidence';
import { DEFAULT_THRESHOLDS, detectCannibalisation, discoverOpportunities, titleCoversQuery } from '../src/seo/autonomy/discover';
import { expectedCtr, intentMatchShare, opportunitySignalsFor, riskSignalsFor, siteMaxima } from '../src/seo/autonomy/signals';
import { planChanges } from '../src/seo/autonomy/planner';
import { planCycle, type SiteMetadata } from '../src/seo/autonomy/executor';
import { buildCycleRecord, renderCycleMarkdown } from '../src/seo/autonomy/report';

const metadata: SiteMetadata = {
  '/letter-tracing': { title: 'Letter Tracing A–Z in the Air, Free Alphabet Learning | Draw in the Air', description: 'Interactive alphabet tracing using webcam hand detection. Kids trace letters A–Z in the air with their finger.', keywords: [], canonical: '/letter-tracing' },
  '/teachers': { title: 'Draw in the Air for Teachers', description: 'Whole-class movement learning for EYFS and KS1 on any device with a webcam. No installs.', keywords: [], canonical: '/teachers' },
  '/parents': { title: 'Draw in the Air for Parents', description: 'Whole-class movement learning for EYFS and KS1 on any device with a webcam. No installs.', keywords: [], canonical: '/parents' },
  '/pricing': { title: 'Pricing', description: 'Short.', keywords: [], canonical: '/pricing' },
};

const rows = [
  // /letter-tracing: dominant query is covered by the title; CTR is fine at pos 6 (3% expected, 2.5% actual)
  { page: 'https://drawintheair.com/letter-tracing', query: 'letter tracing online free', clicks: 20, impressions: 800, ctr: 0.025, position: 6 },
  { page: 'https://drawintheair.com/letter-tracing/', query: 'alphabet tracing kids', clicks: 5, impressions: 200, ctr: 0.025, position: 6 },
  // /teachers: dominant query "webcam learning for children" is NOT in the title → title_query_mismatch
  { page: 'https://drawintheair.com/teachers', query: 'webcam learning for children', clicks: 2, impressions: 300, ctr: 0.0067, position: 8 },
  { page: 'https://drawintheair.com/teachers', query: 'eyfs classroom activities', clicks: 1, impressions: 100, ctr: 0.01, position: 12 },
  // /parents: title covers nothing but query volume is below the support threshold; CTR gap at pos 5 (5% expected, 0.5% actual)
  { page: 'https://drawintheair.com/parents', query: 'draw in the air parents', clicks: 1, impressions: 90, ctr: 0.011, position: 5 },
  { page: 'https://drawintheair.com/parents', query: 'gesture games preschool', clicks: 0, impressions: 80, ctr: 0, position: 5 },
  { page: 'https://drawintheair.com/parents', query: 'active screen time kids', clicks: 0, impressions: 70, ctr: 0, position: 5 },
  // child play area must never be planned for
  { page: 'https://drawintheair.com/play?screen=game', query: 'draw in the air', clicks: 50, impressions: 5000, ctr: 0.01, position: 2 },
];

const funnel: PageFunnelStats[] = [
  { url: '/letter-tracing', sessions: 100, organicSessions: 60, qualifiedDemoStarts: 30, meaningfulInteractions: 25, activityCompletions: 10, signups: 1, enquiries: 0 },
  { url: '/teachers', sessions: 40, organicSessions: 20, qualifiedDemoStarts: 4, meaningfulInteractions: 3, activityCompletions: 1, signups: 2, enquiries: 1 },
];

function evidence(): SiteEvidence {
  const search = attachPrevious(aggregateSearchRows(rows), aggregateSearchRows(rows.map((r) => ({ ...r, clicks: r.clicks - 1 }))));
  return { property: 'sc-domain:drawintheair.com', window: { days: 28, from: '2026-08-10', to: '2026-09-06' }, search, funnel, collectedAt: '2026-09-10T00:00:00Z' };
}

describe('evidence: URL normalisation + aggregation', () => {
  it('normalises absolute URLs, trailing slashes, query strings and case to a canonical path', () => {
    expect(toPath('https://drawintheair.com/Letter-Tracing/?utm=x#top')).toBe('/letter-tracing');
    expect(toPath('/')).toBe('/');
    expect(toPath('teachers')).toBe('/teachers');
  });

  it('excludes the child play area, app, auth and admin surfaces', () => {
    expect(isEngineEligiblePath('/play')).toBe(false);
    expect(isEngineEligiblePath('/play?screen=game')).toBe(false);
    expect(isEngineEligiblePath('/parent/dashboard')).toBe(false);
    expect(isEngineEligiblePath('/parents')).toBe(true);
    expect(isEngineEligiblePath('/letter-tracing')).toBe(true);
  });

  it('folds page×query rows into per-page totals with impression-weighted position', () => {
    const search = aggregateSearchRows(rows);
    const lt = search.find((p) => p.url === '/letter-tracing')!;
    expect(lt.impressions).toBe(1000);
    expect(lt.clicks).toBe(25);
    expect(lt.ctr).toBeCloseTo(0.025);
    expect(lt.queries[0].query).toBe('letter tracing online free');
    expect(search[0].url).toBe('/play'); // sorted by impressions desc
  });

  it('attaches the previous window by path', () => {
    const ev = evidence();
    expect(ev.search.find((p) => p.url === '/teachers')?.previous?.clicks).toBe(1);
  });
});

describe('signals', () => {
  it('expected CTR falls with position and the curve is conservative', () => {
    expect(expectedCtr(1)).toBeGreaterThan(expectedCtr(5));
    expect(expectedCtr(5)).toBeGreaterThan(expectedCtr(15));
    expect(expectedCtr(1)).toBeLessThanOrEqual(0.3);
  });

  it('intent match is the impression share of category-vocabulary queries', () => {
    expect(intentMatchShare([{ query: 'letter tracing', impressions: 80, clicks: 0, ctr: 0, position: 1 }, { query: 'weather', impressions: 20, clicks: 0, ctr: 0, position: 1 }])).toBeCloseTo(0.8);
  });

  it('opportunity and risk signals are all within 0–1 and title risk exceeds description risk', () => {
    const ev = evidence();
    const max = siteMaxima(ev.search, ev.funnel);
    const page = ev.search.find((p) => p.url === '/teachers')!;
    const o = opportunitySignalsFor(page, funnel[1], max);
    for (const v of Object.values(o)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
    const rTitle = riskSignalsFor('page_title', page);
    const rDesc = riskSignalsFor('meta_description', page);
    expect(rTitle.contentMagnitude).toBeGreaterThan(rDesc.contentMagnitude);
    expect(rTitle.privacySecurityImpact).toBe(0);
  });
});

describe('discover', () => {
  it('title coverage uses core tokens, not exact match', () => {
    expect(titleCoversQuery('Letter Tracing A–Z in the Air | Draw in the Air', 'letter tracing online free')).toBe(true);
    expect(titleCoversQuery('Draw in the Air for Teachers', 'webcam learning for children')).toBe(false);
  });

  it('finds a title/query mismatch, a CTR gap, a duplicate description and a missing description; never the play area', () => {
    const opps = discoverOpportunities(evidence(), metadata, { ...DEFAULT_THRESHOLDS, minImpressions: 200 });
    const byUrl = Object.fromEntries(opps.map((o) => [o.url, o]));
    expect(byUrl['/teachers'].kind).toBe('title_query_mismatch');
    expect(byUrl['/teachers'].actionType).toBe('page_title');
    expect(byUrl['/teachers'].supportingQueries[0].query).toBe('webcam learning for children');
    expect(byUrl['/parents'].kind).toBe('ctr_gap');
    expect(byUrl['/parents'].actionType).toBe('meta_description');
    expect(byUrl['/pricing'].kind).toBe('missing_description');
    expect(byUrl['/letter-tracing']).toBeUndefined(); // healthy page: no hypothesis
    expect(byUrl['/play']).toBeUndefined();
    expect(opps.every((o) => o.rationale.length > 0 && o.evidenceRef.length > 0)).toBe(true);
  });

  it('flags duplicate descriptions when neither page has a search-backed opportunity', () => {
    const ev = evidence();
    ev.search = ev.search.filter((p) => p.url !== '/parents' && p.url !== '/teachers');
    const opps = discoverOpportunities(ev, metadata);
    const dup = opps.find((o) => o.kind === 'duplicate_metadata');
    expect(dup?.url).toBe('/parents');
    expect(dup?.cannibalisationWith).toEqual(['/teachers']);
  });

  it('detects a query split across two pages', () => {
    const search = aggregateSearchRows([
      { page: '/a', query: 'air tracing', clicks: 1, impressions: 100, ctr: 0, position: 5 },
      { page: '/b', query: 'air tracing', clicks: 1, impressions: 100, ctr: 0, position: 7 },
      { page: '/c', query: 'air tracing', clicks: 1, impressions: 5, ctr: 0, position: 30 },
    ]);
    const m = detectCannibalisation(search, 0.25);
    expect(m.get('air tracing')).toEqual(['/a', '/b']);
  });
});

describe('planner + executor in shadow mode', () => {
  it('scores, decides via the matrix, plans within budget, and the executor holds everything in shadow', () => {
    const ev = evidence();
    const opportunities = discoverOpportunities(ev, metadata);
    const outcome = planChanges({ cycleId: 'c1', createdAt: '2026-09-10T00:00:00Z', evidence: ev, opportunities, metadata, minImpressions: 200 });

    expect(outcome.scored.length).toBe(opportunities.length);
    // sorted by opportunity desc
    for (let i = 1; i < outcome.scored.length; i++) {
      expect(outcome.scored[i - 1].opportunityScore).toBeGreaterThanOrEqual(outcome.scored[i].opportunityScore);
    }
    // budget respected: ≤3 changes, unique URLs
    expect(outcome.plan.changes.length).toBeLessThanOrEqual(SEO_AUTONOMY_POLICY.budget.maxChangesPerCycle);
    expect(new Set(outcome.plan.changes.map((c) => c.url)).size).toBe(outcome.plan.changes.length);
    // every planned change carries a brief with constraints and no invented copy
    for (const c of outcome.plan.changes) {
      expect(c.metadataPatch).toBeUndefined();
      expect(c.brief?.constraints.length).toBeGreaterThan(3);
      expect(c.successMetric).toBe('qualified_organic_usage');
    }
    // live classification holds (shadow + CI preconditions pending); projected shows the engine's intent
    for (const s of outcome.scored) {
      expect(s.classification.allowed).toBe(false);
      expect(s.classification.reasons).toContain('held:mode_shadow_no_merge');
      expect(s.classification.reasons).toContain('precondition_failed:passesAutomatedTests');
    }
    const teachers = outcome.scored.find((s) => s.opportunity.url === '/teachers')!;
    expect(teachers.projected.level).toBe('amber');

    const result = planCycle(outcome.plan, metadata); // default policy: shadow
    expect(result.applied).toHaveLength(0);
    expect(result.held).toHaveLength(outcome.plan.changes.length);
    expect(result.nextMetadata).toEqual(metadata);
  });

  it('cannibalisation suspicion is carried into the proposed change and blocks projected execution', () => {
    const ev = evidence();
    ev.search = ev.search.filter((p) => p.url !== '/parents' && p.url !== '/teachers');
    const opportunities = discoverOpportunities(ev, metadata);
    const outcome = planChanges({ cycleId: 'c2', createdAt: '2026-09-10T00:00:00Z', evidence: ev, opportunities, metadata, minImpressions: 200 });
    const dup = outcome.scored.find((s) => s.opportunity.kind === 'duplicate_metadata')!;
    expect(dup.change.proposed.cannibalisesCanonical).toBe(true);
    expect(dup.riskSignals.canonicalImpact).toBeGreaterThan(0.3);
  });

  it('renders a cycle record and markdown summary', () => {
    const ev = evidence();
    const opportunities = discoverOpportunities(ev, metadata);
    const outcome = planChanges({ cycleId: 'c3', createdAt: '2026-09-10T00:00:00Z', evidence: ev, opportunities, metadata, minImpressions: 200 });
    const result = planCycle(outcome.plan, metadata);
    const rec = buildCycleRecord(ev, outcome, result, SEO_AUTONOMY_POLICY);
    expect(rec.mode).toBe('shadow');
    expect(rec.evidence.totalImpressions).toBe(rows.reduce((a, r) => a + r.impressions, 0));
    expect(rec.evidence.qualifiedDemoStarts).toBe(34);
    expect(rec.execution.applied).toBe(0);
    const md = renderCycleMarkdown(rec, ev);
    expect(md).toContain('# SEO Engine cycle c3');
    expect(md).toContain('| /teachers |');
    expect(md).toContain('title_query_mismatch');
    expect(md).toContain('held:mode_shadow_no_merge');
  });
});
