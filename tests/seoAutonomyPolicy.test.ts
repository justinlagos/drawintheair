import { describe, expect, it } from 'vitest';
import {
  SEO_AUTONOMY_POLICY, RED_ACTIONS, type SeoAutonomyPolicy, type Preconditions,
} from '../src/seo/autonomy/policy';
import {
  baseLevel, classifyChange, decide, checkCycleBudget,
  opportunityScore, riskScore,
  type ProposedChange, type ClaimFlags,
} from '../src/seo/autonomy/classify';

const allPass: Preconditions = {
  hasMeasurableSeoReason: true, supportedByEvidence: true, improvesExistingPage: true,
  preservesInformationArchitecture: true, preservesPositioning: true, preservesAccessibility: true,
  preservesChildFirstUx: true, passesAutomatedTests: true, passesBuildAndProdChecks: true,
  hasSuccessMetric: true, reversible: true,
};

const noClaims: ClaimFlags = {
  curriculum: false, medical: false, developmental: false,
  commercial: false, competitor: false, compliance: false,
};

function change(over: Partial<ProposedChange> = {}): ProposedChange {
  return {
    actionType: 'meta_description',
    urlsAffected: 1,
    contentChangePct: 0,
    touchesFields: ['meta'],
    changesTopic: false,
    cannibalisesCanonical: false,
    titleQuerySupported: true,
    introducesClaims: noClaims,
    preconditions: allPass,
    ...over,
  };
}

const withMode = (mode: SeoAutonomyPolicy['mode']): SeoAutonomyPolicy => ({ ...SEO_AUTONOMY_POLICY, mode });

describe('SEO autonomy policy — invariants', () => {
  it('ships in shadow mode by default (nothing merges until validated)', () => {
    expect(SEO_AUTONOMY_POLICY.mode).toBe('shadow');
  });

  it('optimises for qualified organic usage, not rankings', () => {
    expect(SEO_AUTONOMY_POLICY.outcome.primary).toBe('qualified_organic_usage');
    expect(SEO_AUTONOMY_POLICY.outcome.rankingsAreInputsOnly).toBe(true);
  });

  it('fences the dangerous actions as RED', () => {
    for (const a of ['bulk_page_creation', 'robots_change', 'delete_indexed_page',
      'redirect_important_url', 'child_data_change', 'infrastructure_or_security_change',
      'create_backlinks', 'manipulate_reviews', 'pricing_change', 'compliance_claim'] as const) {
      expect(RED_ACTIONS).toContain(a);
    }
  });
});

describe('baseLevel', () => {
  it('maps known actions and defaults unknown to red', () => {
    expect(baseLevel('canonical_fix')).toBe('green');
    expect(baseLevel('page_title')).toBe('amber');
    expect(baseLevel('homepage_rewrite')).toBe('red');
    // @ts-expect-error — an action outside the union is treated as red, never green
    expect(baseLevel('something_new')).toBe('red');
  });
});

describe('classifyChange — RED is an absolute floor', () => {
  it('never allows a RED action even with perfect preconditions and open mode', () => {
    const c = classifyChange(change({ actionType: 'robots_change' }), withMode('green-amber'));
    expect(c.level).toBe('red');
    expect(c.allowed).toBe(false);
  });
});

describe('classifyChange — mode gate', () => {
  it('holds a clean GREEN change in shadow mode', () => {
    const c = classifyChange(change(), withMode('shadow'));
    expect(c.level).toBe('green');
    expect(c.allowed).toBe(false);
    expect(c.reasons).toContain('held:mode_shadow_no_merge');
  });

  it('allows a clean GREEN change in green-only mode', () => {
    const c = classifyChange(change(), withMode('green-only'));
    expect(c.allowed).toBe(true);
    expect(c.reasons).toContain('allowed:green');
  });

  it('holds AMBER in green-only mode but allows it in green-amber', () => {
    const title = change({ actionType: 'page_title', touchesFields: ['title'] });
    expect(classifyChange(title, withMode('green-only')).allowed).toBe(false);
    expect(classifyChange(title, withMode('green-amber')).allowed).toBe(true);
  });
});

describe('classifyChange — AMBER envelope', () => {
  it('holds a title change that is not query-supported', () => {
    const c = classifyChange(change({ actionType: 'page_title', touchesFields: ['title'], titleQuerySupported: false }), withMode('green-amber'));
    expect(c.allowed).toBe(false);
    expect(c.reasons).toContain('held:title_not_query_supported');
  });

  it('holds a copy edit over the 20% content threshold', () => {
    const c = classifyChange(change({ actionType: 'incremental_copy_edit', touchesFields: ['body'], contentChangePct: 30 }), withMode('green-amber'));
    expect(c.allowed).toBe(false);
    expect(c.reasons.some((r) => r.includes('content_change'))).toBe(true);
  });

  it('holds an AMBER change that introduces an unsupported claim', () => {
    const c = classifyChange(change({ actionType: 'incremental_copy_edit', touchesFields: ['body'], contentChangePct: 5, introducesClaims: { ...noClaims, curriculum: true } }), withMode('green-amber'));
    expect(c.allowed).toBe(false);
    expect(c.reasons).toContain('held:introduces_unsupported_claim');
  });
});

describe('classifyChange — preconditions & single-change budget', () => {
  it('holds when any precondition fails, naming it', () => {
    const c = classifyChange(change({ preconditions: { ...allPass, reversible: false } }), withMode('green-only'));
    expect(c.allowed).toBe(false);
    expect(c.reasons).toContain('precondition_failed:reversible');
  });

  it('holds a change that rewrites title+h1+canonical+body at once', () => {
    const c = classifyChange(change({ actionType: 'incremental_copy_edit', touchesFields: ['title', 'h1', 'canonical', 'body'], contentChangePct: 5 }), withMode('green-amber'));
    expect(c.allowed).toBe(false);
    expect(c.reasons).toContain('held:simultaneous_title_h1_canonical_body');
  });
});

describe('decide — opportunity × risk matrix', () => {
  it('executes high opportunity + low risk', () => {
    expect(decide(0.8, 0.1)).toBe('execute');
  });
  it('constrains high opportunity + medium risk', () => {
    expect(decide(0.8, 0.4)).toBe('execute_within_limits');
  });
  it('holds high risk regardless of opportunity', () => {
    expect(decide(0.95, 0.7)).toBe('hold');
  });
  it('holds low opportunity', () => {
    expect(decide(0.2, 0.1)).toBe('hold');
  });
});

describe('scores are normalised 0–1', () => {
  it('opportunity and risk stay in range', () => {
    const o = opportunityScore({ searchDemand: 1, impressions: 1, rankingPosition: 1, ctrGap: 1, intentMatch: 1, qualifiedDemoStarts: 1, activityCompletion: 1, signup: 1, commercialRelevance: 1, evidenceConfidence: 1 });
    const r = riskScore({ urlsAffected: 0, indexationImpact: 0, canonicalImpact: 0, contentMagnitude: 0, positioningImpact: 0, technicalImpact: 0, uxImpact: 0, privacySecurityImpact: 0, irreversibility: 0, evidenceUncertainty: 0 });
    expect(o).toBe(1);
    expect(r).toBe(0);
  });
});

describe('checkCycleBudget — whole-cycle caps', () => {
  it('accepts up to the budget across distinct URLs', () => {
    const changes = [
      { url: '/a', change: change() },
      { url: '/b', change: change() },
      { url: '/c', change: change() },
    ];
    expect(checkCycleBudget(changes).ok).toBe(true);
  });

  it('rejects more than max changes per cycle', () => {
    const changes = ['/a', '/b', '/c', '/d'].map((url) => ({ url, change: change() }));
    const res = checkCycleBudget(changes);
    expect(res.ok).toBe(false);
    expect(res.reasons).toContain('over_max_changes_3');
  });

  it('rejects two changes to the same URL in one cycle', () => {
    const changes = [
      { url: '/a', change: change() },
      { url: '/a', change: change({ actionType: 'canonical_fix', touchesFields: ['canonical'] }) },
    ];
    const res = checkCycleBudget(changes);
    expect(res.ok).toBe(false);
    expect(res.reasons).toContain('multiple_changes_to_same_url_in_cycle');
  });
});
