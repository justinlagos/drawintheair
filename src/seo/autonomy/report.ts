// src/seo/autonomy/report.ts
//
// Renders a cycle as Markdown for the Action's job summary and as a JSON
// record for the learning memory. Pure: the runner decides where it goes.

import type { SeoAutonomyPolicy } from './policy';
import type { SiteEvidence } from './evidence';
import type { PlanOutcome } from './planner';
import type { CycleResult } from './executor';

export interface CycleRecord {
  cycleId: string;
  createdAt: string;
  policyVersion: string;
  mode: SeoAutonomyPolicy['mode'];
  evidence: {
    property: string;
    window: SiteEvidence['window'];
    pagesWithSearchData: number;
    pagesWithFunnelData: number;
    totalClicks: number;
    totalImpressions: number;
    organicSessions: number;
    qualifiedDemoStarts: number;
    signups: number;
    enquiries: number;
  };
  opportunities: number;
  planned: PlanOutcome['plan'];
  scored: Array<{
    url: string; kind: string; actionType: string;
    opportunityScore: number; riskScore: number; decision: string;
    nowAllowed: boolean; nowReasons: string[];
    projectedAllowed: boolean; projectedReasons: string[];
    rationale: string;
  }>;
  execution: { applied: number; held: number; budgetOk: boolean; heldReasons: Record<string, number> };
}

export function buildCycleRecord(
  evidence: SiteEvidence,
  outcome: PlanOutcome,
  result: CycleResult,
  policy: SeoAutonomyPolicy,
): CycleRecord {
  const heldReasons: Record<string, number> = {};
  for (const h of result.held) for (const r of h.reasons) heldReasons[r] = (heldReasons[r] ?? 0) + 1;
  const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
  return {
    cycleId: outcome.plan.cycleId,
    createdAt: outcome.plan.createdAt,
    policyVersion: policy.version,
    mode: policy.mode,
    evidence: {
      property: evidence.property,
      window: evidence.window,
      pagesWithSearchData: evidence.search.length,
      pagesWithFunnelData: evidence.funnel.length,
      totalClicks: sum(evidence.search.map((p) => p.clicks)),
      totalImpressions: sum(evidence.search.map((p) => p.impressions)),
      organicSessions: sum(evidence.funnel.map((f) => f.organicSessions)),
      qualifiedDemoStarts: sum(evidence.funnel.map((f) => f.qualifiedDemoStarts)),
      signups: sum(evidence.funnel.map((f) => f.signups)),
      enquiries: sum(evidence.funnel.map((f) => f.enquiries)),
    },
    opportunities: outcome.scored.length,
    planned: outcome.plan,
    scored: outcome.scored.map((s) => ({
      url: s.opportunity.url,
      kind: s.opportunity.kind,
      actionType: s.opportunity.actionType,
      opportunityScore: round(s.opportunityScore),
      riskScore: round(s.riskScore),
      decision: s.decision,
      nowAllowed: s.classification.allowed,
      nowReasons: s.classification.reasons,
      projectedAllowed: s.projected.allowed,
      projectedReasons: s.projected.reasons,
      rationale: s.opportunity.rationale,
    })),
    execution: { applied: result.applied.length, held: result.held.length, budgetOk: result.budgetOk, heldReasons },
  };
}

const round = (n: number): number => Math.round(n * 100) / 100;
const pct = (n: number): string => `${(100 * n).toFixed(1)}%`;

export function renderCycleMarkdown(rec: CycleRecord, evidence: SiteEvidence): string {
  const lines: string[] = [];
  lines.push(`# SEO Engine cycle ${rec.cycleId}`);
  lines.push('');
  lines.push(`Mode: **${rec.mode}** (policy ${rec.policyVersion}). Window: ${rec.evidence.window.from} to ${rec.evidence.window.to} (${rec.evidence.window.days} days).`);
  lines.push('');
  lines.push('## Evidence');
  lines.push('');
  lines.push(`Search: ${rec.evidence.totalClicks} clicks / ${rec.evidence.totalImpressions} impressions across ${rec.evidence.pagesWithSearchData} pages.`);
  lines.push(`Usage by entry page: ${rec.evidence.organicSessions} organic sessions, ${rec.evidence.qualifiedDemoStarts} qualified demo starts, ${rec.evidence.signups} signups, ${rec.evidence.enquiries} enquiries.`);
  lines.push('');
  lines.push('| Page | Clicks | Impr. | CTR | Pos. | Organic sessions | Demo starts | Signups |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|---:|');
  const funnel = new Map(evidence.funnel.map((f) => [f.url, f]));
  for (const p of evidence.search.slice(0, 25)) {
    const f = funnel.get(p.url);
    lines.push(`| ${p.url} | ${p.clicks} | ${p.impressions} | ${pct(p.ctr)} | ${p.position.toFixed(1)} | ${f?.organicSessions ?? 0} | ${f?.qualifiedDemoStarts ?? 0} | ${f?.signups ?? 0} |`);
  }
  lines.push('');
  lines.push(`## Opportunities (${rec.opportunities})`);
  lines.push('');
  if (rec.scored.length === 0) {
    lines.push('None above threshold this cycle.');
  } else {
    lines.push('| Page | Kind | Action | Opp. | Risk | Matrix | Now | If enabled | Why |');
    lines.push('|---|---|---|---:|---:|---|---|---|---|');
    for (const s of rec.scored) {
      lines.push(`| ${s.url} | ${s.kind} | ${s.actionType} | ${s.opportunityScore} | ${s.riskScore} | ${s.decision} | ${s.nowAllowed ? 'execute' : 'hold'} | ${s.projectedAllowed ? 'execute' : `hold (${s.projectedReasons.filter((r) => !r.startsWith('allowed')).join(', ')})`} | ${s.rationale} |`);
    }
  }
  lines.push('');
  lines.push(`## Plan (${rec.planned.changes.length} of ${rec.opportunities} within budget)`);
  lines.push('');
  for (const c of rec.planned.changes) {
    lines.push(`### ${c.id} ${c.actionType} ${c.url}`);
    lines.push('');
    lines.push(`Hypothesis: ${c.hypothesis}`);
    if (c.brief) {
      lines.push('');
      lines.push(`Current: \`${JSON.stringify(c.brief.current)}\``);
      if (c.brief.supportedQueries.length) {
        lines.push('');
        lines.push('Supporting queries: ' + c.brief.supportedQueries.map((q) => `"${q.query}" (${q.impressions} impr., pos ${q.position.toFixed(1)})`).join('; '));
      }
    }
    lines.push('');
  }
  lines.push('## Execution');
  lines.push('');
  lines.push(`Applied: ${rec.execution.applied}. Held: ${rec.execution.held}. Budget OK: ${rec.execution.budgetOk}.`);
  const reasons = Object.entries(rec.execution.heldReasons);
  if (reasons.length) {
    lines.push('');
    for (const [r, n] of reasons) lines.push(`- ${r}: ${n}`);
  }
  lines.push('');
  return lines.join('\n');
}
