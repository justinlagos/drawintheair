// src/seo/autonomy/classify.ts
//
// Applies SEO_AUTONOMY_POLICY to a proposed change: assigns Green/Amber/Red,
// decides whether it may execute autonomously (given the current mode), scores
// opportunity and risk, and enforces the per-cycle autonomy budget.
//
// Pure functions only — no I/O, no globals — so the same logic runs in the
// executor, in CI as a guard, and in unit tests. The engine may generate the
// hypothesis, but this module (and the measurement layer) decide what ships.

import {
  SEO_AUTONOMY_POLICY, GREEN_ACTIONS, AMBER_ACTIONS, RED_ACTIONS,
  PRECONDITION_KEYS,
  type ActionType, type AutonomyLevel, type Preconditions, type SeoAutonomyPolicy,
} from './policy';

/** Claims a change might introduce. Any true value forbids an AMBER change. */
export interface ClaimFlags {
  curriculum: boolean;
  medical: boolean;
  developmental: boolean;
  commercial: boolean;
  competitor: boolean;
  compliance: boolean;
}

export interface ProposedChange {
  actionType: ActionType;
  urlsAffected: number;
  /** Share of the page's text this change rewrites, 0–100. */
  contentChangePct: number;
  /** Which on-page fields this change touches (guards the "not all at once" budget rule). */
  touchesFields: ReadonlyArray<'title' | 'h1' | 'canonical' | 'body' | 'meta' | 'links' | 'schema' | 'alt'>;
  changesTopic: boolean;
  cannibalisesCanonical: boolean;
  titleQuerySupported: boolean;
  introducesClaims: ClaimFlags;
  preconditions: Preconditions;
}

export interface Classification {
  level: AutonomyLevel;
  /** True only if the change may execute autonomously under the current mode. */
  allowed: boolean;
  /** Human-readable reasons — always populated on a deny, for the audit log. */
  reasons: string[];
}

const anyClaim = (c: ClaimFlags): boolean =>
  c.curriculum || c.medical || c.developmental || c.commercial || c.competitor || c.compliance;

/** Base level from the action type alone. Unknown actions are treated as RED. */
export function baseLevel(action: ActionType): AutonomyLevel {
  if (RED_ACTIONS.includes(action)) return 'red';
  if (AMBER_ACTIONS.includes(action)) return 'amber';
  if (GREEN_ACTIONS.includes(action)) return 'green';
  return 'red';
}

function failedPreconditions(p: Preconditions): string[] {
  return PRECONDITION_KEYS.filter((k) => !p[k]).map((k) => `precondition_failed:${k}`);
}

/**
 * Classify a proposed change against the policy. `allowed` answers "may this
 * ship autonomously right now"; a held change is still recorded so the engine
 * can surface it. Defaults to the shared policy but accepts an override for tests.
 */
export function classifyChange(
  change: ProposedChange,
  policy: SeoAutonomyPolicy = SEO_AUTONOMY_POLICY,
): Classification {
  const reasons: string[] = [];
  const level = baseLevel(change.actionType);

  // 1. RED is an absolute floor — never autonomous, whatever the evidence or mode.
  if (level === 'red') {
    return { level, allowed: false, reasons: [`red_action:${change.actionType}`, 'held:not_seo_optimisation'] };
  }

  // 2. Preconditions must all hold for any autonomous change.
  reasons.push(...failedPreconditions(change.preconditions));

  // 3. Mode gate (kill switch / rollout ramp), independent of the change's level.
  if (policy.mode === 'paused') reasons.push('held:mode_paused');
  if (policy.mode === 'shadow') reasons.push('held:mode_shadow_no_merge');
  if (level === 'amber' && policy.mode === 'green-only') reasons.push('held:amber_not_enabled_in_green_only');

  // 4. AMBER envelope.
  if (level === 'amber') {
    const lim = policy.amberLimits;
    if (change.contentChangePct > lim.maxContentChangePct) {
      reasons.push(`held:content_change_over_${lim.maxContentChangePct}pct`);
    }
    if (lim.forbidsTopicChange && change.changesTopic) reasons.push('held:changes_topic');
    if (lim.forbidsCannibalisation && change.cannibalisesCanonical) reasons.push('held:cannibalises_canonical');
    if (lim.forbidsNewClaims && anyClaim(change.introducesClaims)) reasons.push('held:introduces_unsupported_claim');
    if (change.actionType === 'page_title' && lim.titleMustBeQuerySupported && !change.titleQuerySupported) {
      reasons.push('held:title_not_query_supported');
    }
  }

  // 5. Budget rule that applies to a single change: never title+h1+canonical+body at once.
  if (policy.budget.forbidSimultaneousTitleH1CanonicalBody) {
    const heavy = (['title', 'h1', 'canonical', 'body'] as const).filter((f) => change.touchesFields.includes(f));
    if (heavy.length >= 4) reasons.push('held:simultaneous_title_h1_canonical_body');
  }
  if (change.contentChangePct > policy.budget.maxContentChangePctPerPage) {
    reasons.push(`held:content_change_over_budget_${policy.budget.maxContentChangePctPerPage}pct`);
  }

  const allowed = reasons.length === 0;
  if (allowed) reasons.push(`allowed:${level}`);
  return { level, allowed, reasons };
}

// ── Scoring ─────────────────────────────────────────────────────────────────
// Opportunity and risk are each normalised 0–1. Callers supply already-normalised
// dimension values (the ingestion layer maps raw GSC/analytics figures into 0–1).

export interface OpportunitySignals {
  searchDemand: number; impressions: number; rankingPosition: number; ctrGap: number;
  intentMatch: number; qualifiedDemoStarts: number; activityCompletion: number;
  signup: number; commercialRelevance: number; evidenceConfidence: number;
}

export interface RiskSignals {
  urlsAffected: number; indexationImpact: number; canonicalImpact: number;
  contentMagnitude: number; positioningImpact: number; technicalImpact: number;
  uxImpact: number; privacySecurityImpact: number; irreversibility: number;
  evidenceUncertainty: number;
}

const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

export function opportunityScore(s: OpportunitySignals): number {
  return clamp01(mean([
    s.searchDemand, s.impressions, s.rankingPosition, s.ctrGap, s.intentMatch,
    s.qualifiedDemoStarts, s.activityCompletion, s.signup, s.commercialRelevance, s.evidenceConfidence,
  ]));
}

export function riskScore(s: RiskSignals): number {
  return clamp01(mean([
    s.urlsAffected, s.indexationImpact, s.canonicalImpact, s.contentMagnitude,
    s.positioningImpact, s.technicalImpact, s.uxImpact, s.privacySecurityImpact,
    s.irreversibility, s.evidenceUncertainty,
  ]));
}

export type Decision = 'execute' | 'execute_within_limits' | 'hold';

/**
 * The opportunity × risk matrix: high opportunity + low risk executes;
 * high opportunity + medium risk executes only within limits; high risk holds.
 * This is autonomy without recklessness — it never overrides classifyChange,
 * it decides whether a permitted change is worth making now.
 */
export function decide(opportunity: number, risk: number, opportunityThreshold = 0.5): Decision {
  if (risk >= 0.66) return 'hold';
  if (opportunity < opportunityThreshold) return 'hold';
  if (risk >= 0.33) return 'execute_within_limits';
  return 'execute';
}

// ── Per-cycle budget ──────────────────────────────────────────────────────────

export interface BudgetCheck {
  ok: boolean;
  reasons: string[];
}

/**
 * Enforce the whole-cycle autonomy budget over the set of changes a cycle wants
 * to ship. Also blocks two changes to the same URL in one cycle (one hypothesis
 * per page per window).
 */
export function checkCycleBudget(
  changes: ReadonlyArray<{ url: string; change: ProposedChange }>,
  policy: SeoAutonomyPolicy = SEO_AUTONOMY_POLICY,
): BudgetCheck {
  const reasons: string[] = [];
  const b = policy.budget;
  if (changes.length > b.maxChangesPerCycle) reasons.push(`over_max_changes_${b.maxChangesPerCycle}`);
  const urls = new Set(changes.map((c) => c.url));
  if (urls.size > b.maxUrlsPerCycle) reasons.push(`over_max_urls_${b.maxUrlsPerCycle}`);
  if (b.oneHypothesisPerPagePerWindow && urls.size !== changes.length) {
    reasons.push('multiple_changes_to_same_url_in_cycle');
  }
  return { ok: reasons.length === 0, reasons };
}
