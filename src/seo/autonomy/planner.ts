// src/seo/autonomy/planner.ts
//
// The change planner: score every discovered opportunity, run the
// opportunity × risk matrix, and assemble a CyclePlan that fits the autonomy
// budget. It writes briefs, not copy: the planner decides WHAT to change and
// WHY, the drafter (later) decides the words, the executor re-checks both.
//
// Pure. No I/O.

import { SEO_AUTONOMY_POLICY, type Preconditions, type SeoAutonomyPolicy } from './policy';
import {
  classifyChange, decide, opportunityScore, riskScore,
  type ClaimFlags, type Classification, type Decision, type OpportunitySignals, type ProposedChange, type RiskSignals,
} from './classify';
import type { SiteEvidence } from './evidence';
import type { Opportunity } from './discover';
import type { ChangeBrief, CyclePlan, SeoChange } from './manifest';
import type { SiteMetadata } from './executor';
import { opportunitySignalsFor, riskSignalsFor, siteMaxima } from './signals';

const NO_CLAIMS: ClaimFlags = { curriculum: false, medical: false, developmental: false, commercial: false, competitor: false, compliance: false };

/** Constraints every metadata draft must satisfy, whatever the page. */
export const BASE_CONSTRAINTS: readonly string[] = [
  'Keep the page\'s intent and topic exactly as it is.',
  'Use only phrases the supporting queries or the page itself already use; invent nothing.',
  'No curriculum, medical, developmental, compliance, competitor or pricing claims.',
  'Strengthen the movement-based learning position; the product is the proof.',
  'Plain English, no superlatives, no "#1", no "best".',
];

export const TITLE_CONSTRAINTS: readonly string[] = [
  'Title 50 to 60 characters, brand suffix " | Draw in the Air" retained.',
  'The dominant query\'s core words appear naturally in the title.',
];

export const DESCRIPTION_CONSTRAINTS: readonly string[] = [
  'Description 120 to 155 characters, one clear sentence about what the child does and gets.',
  'Mention it runs in the browser with a webcam and needs no download, if true for the page.',
];

/** A scored opportunity: the numbers behind the decision, kept for the audit log. */
export interface ScoredOpportunity {
  opportunity: Opportunity;
  opportunitySignals: OpportunitySignals;
  riskSignals: RiskSignals;
  opportunityScore: number;
  riskScore: number;
  decision: Decision;
  change: SeoChange;
  /** Classification under the live policy (what happens now). */
  classification: Classification;
  /** Classification if the mode were green-amber and CI had passed (what the engine would do). */
  projected: Classification;
}

export interface PlanOutcome {
  plan: CyclePlan;
  scored: ScoredOpportunity[];       // every opportunity, sorted by opportunity desc
  selected: ScoredOpportunity[];     // the ones that made it into the plan
  droppedForBudget: ScoredOpportunity[];
}

/**
 * Preconditions the planner can assert from evidence. The two CI-backed ones
 * stay false here: they are only true once the engine's PR has run the gate.
 */
export function preconditionsFromEvidence(opp: Opportunity, minImpressions: number, pageImpressions: number): Preconditions {
  const evidenceBacked = opp.supportingQueries.length > 0 ? pageImpressions >= minImpressions : true;
  return {
    hasMeasurableSeoReason: true,
    supportedByEvidence: evidenceBacked,
    improvesExistingPage: true,
    preservesInformationArchitecture: true,
    preservesPositioning: true,
    preservesAccessibility: true,
    preservesChildFirstUx: true,
    passesAutomatedTests: false,
    passesBuildAndProdChecks: false,
    hasSuccessMetric: true,
    reversible: true,
  };
}

function briefFor(opp: Opportunity, metadata: SiteMetadata): ChangeBrief {
  const meta = metadata[opp.url];
  const isTitle = opp.actionType === 'page_title';
  const current = isTitle ? { title: meta?.title ?? '' } : { description: meta?.description ?? '' };
  return {
    current,
    supportedQueries: opp.supportingQueries.map((q) => ({ query: q.query, impressions: q.impressions, position: q.position })),
    rationale: opp.rationale,
    constraints: [...BASE_CONSTRAINTS, ...(isTitle ? TITLE_CONSTRAINTS : DESCRIPTION_CONSTRAINTS)],
  };
}

function proposedFor(opp: Opportunity, preconditions: Preconditions): ProposedChange {
  const isTitle = opp.actionType === 'page_title';
  return {
    actionType: opp.actionType,
    urlsAffected: 1,
    contentChangePct: isTitle ? 5 : 3,   // one head field out of a full page
    touchesFields: isTitle ? ['title'] : ['meta'],
    changesTopic: false,
    cannibalisesCanonical: opp.cannibalisationWith.length > 0,
    titleQuerySupported: isTitle ? opp.supportingQueries.length > 0 : true,
    introducesClaims: NO_CLAIMS,
    preconditions,
  };
}

export interface PlanInput {
  cycleId: string;
  createdAt: string;
  evidence: SiteEvidence;
  opportunities: Opportunity[];
  metadata: SiteMetadata;
  minImpressions: number;
}

export function planChanges(input: PlanInput, policy: SeoAutonomyPolicy = SEO_AUTONOMY_POLICY): PlanOutcome {
  const maxima = siteMaxima(input.evidence.search, input.evidence.funnel);
  const searchByUrl = new Map(input.evidence.search.map((p) => [p.url, p]));
  const funnelByUrl = new Map(input.evidence.funnel.map((f) => [f.url, f]));
  const projectedPolicy: SeoAutonomyPolicy = { ...policy, mode: 'green-amber' };

  const scored: ScoredOpportunity[] = input.opportunities.map((opp, i) => {
    const page = searchByUrl.get(opp.url) ?? { url: opp.url, clicks: 0, impressions: 0, ctr: 0, position: 0, queries: [] };
    const oSig = opportunitySignalsFor(page, funnelByUrl.get(opp.url), maxima);
    const rSig = riskSignalsFor(opp.actionType, page, { cannibalisationSuspected: opp.cannibalisationWith.length > 0 });
    const o = opportunityScore(oSig);
    const r = riskScore(rSig);
    const preconditions = preconditionsFromEvidence(opp, input.minImpressions, page.impressions);
    const proposed = proposedFor(opp, preconditions);
    const change: SeoChange = {
      id: `${input.cycleId}-${String(i + 1).padStart(2, '0')}`,
      url: opp.url,
      actionType: opp.actionType,
      hypothesis: hypothesisFor(opp),
      evidenceRef: opp.evidenceRef,
      brief: briefFor(opp, input.metadata),
      successMetric: 'qualified_organic_usage',
      evaluationWindowDays: policy.windows.meaningfulSeoDays,
      proposed,
    };
    const projectedProposed: ProposedChange = {
      ...proposed,
      preconditions: { ...preconditions, passesAutomatedTests: true, passesBuildAndProdChecks: true },
    };
    return {
      opportunity: opp,
      opportunitySignals: oSig,
      riskSignals: rSig,
      opportunityScore: o,
      riskScore: r,
      decision: decide(o, r),
      change,
      classification: classifyChange(proposed, policy),
      projected: classifyChange(projectedProposed, projectedPolicy),
    };
  }).sort((a, b) => b.opportunityScore - a.opportunityScore || a.riskScore - b.riskScore);

  // Selection: matrix says go, projected policy allows it, and it fits the budget.
  const selected: ScoredOpportunity[] = [];
  const droppedForBudget: ScoredOpportunity[] = [];
  const urls = new Set<string>();
  for (const s of scored) {
    if (s.decision === 'hold' || !s.projected.allowed) continue;
    if (selected.length >= policy.budget.maxChangesPerCycle || urls.size >= policy.budget.maxUrlsPerCycle || urls.has(s.opportunity.url)) {
      droppedForBudget.push(s);
      continue;
    }
    selected.push(s);
    urls.add(s.opportunity.url);
  }

  const plan: CyclePlan = {
    cycleId: input.cycleId,
    createdAt: input.createdAt,
    baselineRef: `evidence:${input.evidence.window.from}..${input.evidence.window.to}`,
    changes: selected.map((s) => s.change),
  };
  return { plan, scored, selected, droppedForBudget };
}

function hypothesisFor(opp: Opportunity): string {
  switch (opp.kind) {
    case 'title_query_mismatch':
      return `A title that carries "${opp.supportingQueries[0]?.query ?? ''}" will raise CTR for the query that already drives this page, without changing its intent.`;
    case 'ctr_gap':
      return 'A description that says plainly what the child does on this page will close the gap between visibility and clicks.';
    case 'duplicate_metadata':
      return 'Distinct metadata will stop this page competing with its duplicate for the same snippet.';
    case 'missing_description':
      return 'A real description will replace the auto-generated snippet with one that matches the page.';
  }
}
