import { describe, expect, it } from 'vitest';
import { SEO_AUTONOMY_POLICY, type SeoAutonomyPolicy, type Preconditions } from '../src/seo/autonomy/policy';
import type { ProposedChange, ClaimFlags } from '../src/seo/autonomy/classify';
import type { CyclePlan, SeoChange, MetadataPatch } from '../src/seo/autonomy/manifest';
import { planCycle, revertChange, type SiteMetadata } from '../src/seo/autonomy/executor';
import { verifyPage, verifyCycle, type PageSnapshot, type ExpectedPage } from '../src/seo/autonomy/verify';
import type { ActionType } from '../src/seo/autonomy/policy';

const allPass: Preconditions = {
  hasMeasurableSeoReason: true, supportedByEvidence: true, improvesExistingPage: true,
  preservesInformationArchitecture: true, preservesPositioning: true, preservesAccessibility: true,
  preservesChildFirstUx: true, passesAutomatedTests: true, passesBuildAndProdChecks: true,
  hasSuccessMetric: true, reversible: true,
};
const noClaims: ClaimFlags = { curriculum: false, medical: false, developmental: false, commercial: false, competitor: false, compliance: false };
const withMode = (mode: SeoAutonomyPolicy['mode']): SeoAutonomyPolicy => ({ ...SEO_AUTONOMY_POLICY, mode });

function proposed(over: Partial<ProposedChange> = {}): ProposedChange {
  return {
    actionType: 'meta_description', urlsAffected: 1, contentChangePct: 0,
    touchesFields: ['meta'], changesTopic: false, cannibalisesCanonical: false,
    titleQuerySupported: true, introducesClaims: noClaims, preconditions: allPass, ...over,
  };
}

function seoChange(over: Partial<SeoChange> = {}): SeoChange {
  const actionType: ActionType = over.actionType ?? 'meta_description';
  const patch: MetadataPatch = over.metadataPatch ?? { description: 'A clearer, query-supported description of this page.' };
  return {
    id: over.id ?? 'c1',
    url: over.url ?? '/x',
    actionType,
    hypothesis: 'test',
    evidenceRef: 'gsc:q1',
    metadataPatch: patch,
    successMetric: 'qualified_demo_starts',
    evaluationWindowDays: 28,
    proposed: over.proposed ?? proposed({ actionType }),
  };
}

const baseMeta: SiteMetadata = {
  '/x': { title: 'Old title', description: 'Old description', keywords: ['a'], canonical: '/x' },
};

function plan(changes: SeoChange[]): CyclePlan {
  return { cycleId: 'cy1', createdAt: '2026-09-10T00:00:00Z', baselineRef: 'baseline:1', changes };
}

describe('planCycle — applying changes', () => {
  it('applies a GREEN metadata change in green-only mode and captures the reversal', () => {
    const change = seoChange({ metadataPatch: { description: 'New verified description.' } });
    const res = planCycle(plan([change]), baseMeta, withMode('green-only'));
    expect(res.applied).toHaveLength(1);
    expect(res.held).toHaveLength(0);
    expect(res.nextMetadata['/x'].description).toBe('New verified description.');
    expect(res.applied[0].before.description).toBe('Old description');
    // untouched fields are preserved
    expect(res.nextMetadata['/x'].title).toBe('Old title');
  });

  it('holds everything in the default shadow mode (nothing merges)', () => {
    const res = planCycle(plan([seoChange()]), baseMeta); // default policy = shadow
    expect(res.applied).toHaveLength(0);
    expect(res.held[0].reasons).toContain('held:mode_shadow_no_merge');
    expect(res.nextMetadata['/x'].description).toBe('Old description'); // unchanged
  });

  it('applies an in-limit AMBER title change in green-amber mode', () => {
    const change = seoChange({
      actionType: 'page_title',
      metadataPatch: { title: 'Trace Letters A–Z in the Air, Free' },
      proposed: proposed({ actionType: 'page_title', touchesFields: ['title'], titleQuerySupported: true }),
    });
    const res = planCycle(plan([change]), baseMeta, withMode('green-amber'));
    expect(res.applied).toHaveLength(1);
    expect(res.nextMetadata['/x'].title).toBe('Trace Letters A–Z in the Air, Free');
  });
});

describe('planCycle — holds', () => {
  it('never applies a RED action even with a patch and open mode', () => {
    const change = seoChange({
      actionType: 'robots_change',
      metadataPatch: { description: 'x' },
      proposed: proposed({ actionType: 'robots_change' }),
    });
    const res = planCycle(plan([change]), baseMeta, withMode('green-amber'));
    expect(res.applied).toHaveLength(0);
    expect(res.held[0].reasons.some((r) => r.startsWith('red_action'))).toBe(true);
  });

  it('holds a GREEN action the metadata executor cannot yet apply', () => {
    const change = seoChange({
      actionType: 'add_breadcrumb',
      metadataPatch: { description: 'x' },
      proposed: proposed({ actionType: 'add_breadcrumb', touchesFields: ['schema'] }),
    });
    const res = planCycle(plan([change]), baseMeta, withMode('green-only'));
    expect(res.applied).toHaveLength(0);
    expect(res.held[0].reasons).toContain('held:no_executor_for_action:add_breadcrumb');
  });

  it('holds an unknown URL', () => {
    const res = planCycle(plan([seoChange({ url: '/missing' })]), baseMeta, withMode('green-only'));
    expect(res.held[0].reasons).toContain('held:unknown_url:/missing');
  });

  it('holds the whole cycle when over budget and applies nothing', () => {
    const changes = ['/a', '/b', '/c', '/d'].map((url, i) =>
      seoChange({ id: `c${i}`, url, proposed: proposed() }));
    const meta: SiteMetadata = Object.fromEntries(changes.map((c) => [c.url, baseMeta['/x']]));
    const res = planCycle(plan(changes), meta, withMode('green-only'));
    expect(res.budgetOk).toBe(false);
    expect(res.applied).toHaveLength(0);
    expect(res.held).toHaveLength(4);
  });
});

describe('revertChange — rollback restores prior values', () => {
  it('restores exactly the touched field', () => {
    const change = seoChange({ metadataPatch: { description: 'New description.' } });
    const res = planCycle(plan([change]), baseMeta, withMode('green-only'));
    const reverted = revertChange(res.nextMetadata, res.applied[0]);
    expect(reverted['/x'].description).toBe('Old description');
  });
});

describe('verifyPage / verifyCycle', () => {
  const expected: ExpectedPage = {
    canonical: 'https://drawintheair.com/teachers',
    minTitleLength: 10,
    requireStructuredData: true,
    mustBeInSitemap: true,
    mustNotBeRobotsBlocked: true,
  };
  const goodSnap: PageSnapshot = {
    url: 'https://drawintheair.com/teachers', status: 200,
    canonical: 'https://drawintheair.com/teachers', title: 'Draw in the Air for Teachers',
    hasStructuredData: true, structuredDataValid: true, inSitemap: true, robotsBlocked: false,
  };

  it('passes a healthy page', () => {
    expect(verifyPage(goodSnap, expected).pass).toBe(true);
  });

  it('fails and flags a canonical mismatch as a rollback trigger', () => {
    const bad = { ...goodSnap, canonical: 'https://drawintheair.com/trace-a' };
    const res = verifyPage(bad, expected);
    expect(res.pass).toBe(false);
    const cycle = verifyCycle([res]);
    expect(cycle.pass).toBe(false);
    expect(cycle.rollbackTriggers).toContain('canonical_errors');
  });

  it('flags a non-200 as broken routes', () => {
    const res = verifyPage({ ...goodSnap, status: 500 }, expected);
    expect(verifyCycle([res]).rollbackTriggers).toContain('broken_routes');
  });
});
