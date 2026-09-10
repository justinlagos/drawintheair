// src/seo/autonomy/policy.ts
//
// SEO_AUTONOMY_POLICY — the governing rule set for the autonomous SEO engine.
//
// This encodes Justin's operating judgement as explicit, machine-readable
// rules so the engine can make the decisions he would make, while being
// UNABLE to cross defined boundaries. There is deliberately no "ask a human"
// node inside the loop: autonomy is granted by this policy, not by approval.
//
// Nothing in this file executes changes. It is pure data + types that the
// classifier (classify.ts), the executor, and the CI guard all import, so the
// same rules bind planning, execution, and verification. Changing autonomy
// behaviour means editing THIS file (and its tests), nowhere else.

export type AutonomyLevel = 'green' | 'amber' | 'red';

// How much of the loop is allowed to reach production, independent of a
// change's own level. The engine ramps along this scale; it never widens
// itself — only a human edit to this constant does.
//   shadow      — run the whole loop, open PRs, MERGE NOTHING (validation)
//   green-only  — auto-merge GREEN on green CI; AMBER opens a PR, holds
//   green-amber — auto-merge GREEN and in-limit AMBER on green CI
//   paused      — kill switch: discover/score only, never write
export type AutonomyMode = 'shadow' | 'green-only' | 'green-amber' | 'paused';

/** The categories of change the engine can reason about. */
export type ActionType =
  // ── typically GREEN (low-risk, reversible optimisation) ──
  | 'meta_description'
  | 'fix_duplicate_metadata'
  | 'canonical_fix'
  | 'internal_link_fix'
  | 'add_breadcrumb'
  | 'heading_hierarchy'
  | 'fix_orphan_page'
  | 'image_alt_text'
  | 'structured_data_update'
  | 'remove_duplicate_internal_link'
  | 'contextual_internal_link'
  | 'sitemap_membership'
  | 'technical_seo_fix'
  // ── typically AMBER (allowed only inside thresholds) ──
  | 'page_title'
  | 'incremental_copy_edit'
  | 'page_description_from_queries'
  // ── always RED (never autonomous) ──
  | 'bulk_page_creation'
  | 'doorway_or_location_pages'
  | 'query_variation_pages'
  | 'homepage_rewrite'
  | 'positioning_change'
  | 'canonical_architecture_change'
  | 'delete_indexed_page'
  | 'redirect_important_url'
  | 'robots_change'
  | 'remove_sitemap_section'
  | 'invent_curriculum_claim'
  | 'medical_or_developmental_claim'
  | 'compliance_claim'
  | 'create_backlinks'
  | 'buy_links'
  | 'publish_external_content'
  | 'manipulate_reviews'
  | 'keyword_stuffing'
  | 'pricing_change'
  | 'signup_or_product_ux_change'
  | 'auth_change'
  | 'child_data_change'
  | 'analytics_definition_change'
  | 'infrastructure_or_security_change';

export const GREEN_ACTIONS: readonly ActionType[] = [
  'meta_description', 'fix_duplicate_metadata', 'canonical_fix', 'internal_link_fix',
  'add_breadcrumb', 'heading_hierarchy', 'fix_orphan_page', 'image_alt_text',
  'structured_data_update', 'remove_duplicate_internal_link', 'contextual_internal_link',
  'sitemap_membership', 'technical_seo_fix',
] as const;

export const AMBER_ACTIONS: readonly ActionType[] = [
  'page_title', 'incremental_copy_edit', 'page_description_from_queries',
] as const;

// RED is the safety floor: these are product, legal, reputation or
// infrastructure decisions, not SEO optimisation. The engine must NEVER
// execute one autonomously, at any autonomy mode, whatever the evidence.
export const RED_ACTIONS: readonly ActionType[] = [
  'bulk_page_creation', 'doorway_or_location_pages', 'query_variation_pages',
  'homepage_rewrite', 'positioning_change', 'canonical_architecture_change',
  'delete_indexed_page', 'redirect_important_url', 'robots_change', 'remove_sitemap_section',
  'invent_curriculum_claim', 'medical_or_developmental_claim', 'compliance_claim',
  'create_backlinks', 'buy_links', 'publish_external_content', 'manipulate_reviews',
  'keyword_stuffing', 'pricing_change', 'signup_or_product_ux_change', 'auth_change',
  'child_data_change', 'analytics_definition_change', 'infrastructure_or_security_change',
] as const;

/**
 * Preconditions that must ALL hold for any autonomous change. If any is false,
 * the engine records the opportunity and waits — it does not execute.
 */
export interface Preconditions {
  hasMeasurableSeoReason: boolean;
  supportedByEvidence: boolean;       // real GSC / analytics / site evidence
  improvesExistingPage: boolean;      // not randomly creating content
  preservesInformationArchitecture: boolean;
  preservesPositioning: boolean;      // movement-based learning, product-as-proof
  preservesAccessibility: boolean;
  preservesChildFirstUx: boolean;
  passesAutomatedTests: boolean;
  passesBuildAndProdChecks: boolean;
  hasSuccessMetric: boolean;
  reversible: boolean;
}

export const PRECONDITION_KEYS: readonly (keyof Preconditions)[] = [
  'hasMeasurableSeoReason', 'supportedByEvidence', 'improvesExistingPage',
  'preservesInformationArchitecture', 'preservesPositioning', 'preservesAccessibility',
  'preservesChildFirstUx', 'passesAutomatedTests', 'passesBuildAndProdChecks',
  'hasSuccessMetric', 'reversible',
] as const;

/** AMBER threshold envelope — an AMBER change may execute only inside these. */
export interface AmberLimits {
  maxContentChangePct: number;        // ≤ this share of the page's text per cycle
  titleMustKeepIntent: boolean;
  titleMustBeQuerySupported: boolean;
  forbidsNewClaims: boolean;          // no curriculum/medical/developmental/commercial/competitor claim
  forbidsTopicChange: boolean;
  forbidsCannibalisation: boolean;
}

/** Autonomy budget — caps how much can change at once, so cause↔effect stays legible. */
export interface AutonomyBudget {
  maxChangesPerCycle: number;
  maxUrlsPerCycle: number;
  maxContentChangePctPerPage: number;
  forbidSimultaneousTitleH1CanonicalBody: boolean;   // never all at once on one page
  oneHypothesisPerPagePerWindow: boolean;
  noRepeatChangeUntilMeasured: boolean;
}

/** Evaluation windows (days) before a change is judged. The data decides, not the AI. */
export interface EvaluationWindows {
  technicalSanityDays: number;   // build/route/canonical/sitemap sanity
  earlySignalDays: number;
  meaningfulSeoDays: number;     // the real verdict
  lowVolumeConfidenceDays: number;
}

/**
 * The primary outcome the engine optimises for. Rankings/impressions are
 * INPUTS, never the objective. A change that lifts impressions/clicks but
 * drops qualified demo starts is a FAILED optimisation and must be learned as one.
 */
export interface OutcomePolicy {
  primary: 'qualified_organic_usage';
  funnel: readonly ['qualified_demo_start', 'meaningful_interaction', 'activity_completion', 'signup'];
  rankingsAreInputsOnly: true;
  // If the primary/funnel regresses beyond this while a vanity metric rises,
  // the change is failed regardless of impressions/clicks.
  qualifiedUsageRegressionIsFailurePct: number;
}

export interface ScoringDimensions {
  opportunity: readonly string[];
  risk: readonly string[];
}

/** Conditions that trigger automatic rollback. */
export interface RollbackTriggers {
  immediate: readonly string[];   // technical: revert now
  seo: readonly string[];         // after enough data: revert + mark hypothesis failed + don't repeat
}

export interface SeoAutonomyPolicy {
  version: string;
  mode: AutonomyMode;
  green: readonly ActionType[];
  amber: readonly ActionType[];
  red: readonly ActionType[];
  amberLimits: AmberLimits;
  budget: AutonomyBudget;
  windows: EvaluationWindows;
  outcome: OutcomePolicy;
  scoring: ScoringDimensions;
  rollback: RollbackTriggers;
  // Every proposed change must pass this test, in the engine's own words, or it
  // is held: does it strengthen Draw in the Air as a movement-based learning
  // platform (product as proof), or merely chase traffic? The latter is held.
  categoryGuard: string;
}

export const SEO_AUTONOMY_POLICY: SeoAutonomyPolicy = {
  version: '1.0.0',
  // Ships in shadow mode: full loop, PRs opened, nothing merged, until the
  // engine's judgement is validated against real post-change data. Widening
  // to 'green-only' then 'green-amber' is a deliberate human edit here.
  mode: 'shadow',
  green: GREEN_ACTIONS,
  amber: AMBER_ACTIONS,
  red: RED_ACTIONS,
  amberLimits: {
    maxContentChangePct: 20,
    titleMustKeepIntent: true,
    titleMustBeQuerySupported: true,
    forbidsNewClaims: true,
    forbidsTopicChange: true,
    forbidsCannibalisation: true,
  },
  budget: {
    maxChangesPerCycle: 3,
    maxUrlsPerCycle: 5,
    maxContentChangePctPerPage: 20,
    forbidSimultaneousTitleH1CanonicalBody: true,
    oneHypothesisPerPagePerWindow: true,
    noRepeatChangeUntilMeasured: true,
  },
  windows: {
    technicalSanityDays: 7,
    earlySignalDays: 14,
    meaningfulSeoDays: 28,
    lowVolumeConfidenceDays: 56,
  },
  outcome: {
    primary: 'qualified_organic_usage',
    funnel: ['qualified_demo_start', 'meaningful_interaction', 'activity_completion', 'signup'],
    rankingsAreInputsOnly: true,
    qualifiedUsageRegressionIsFailurePct: 10,
  },
  scoring: {
    opportunity: [
      'search_demand', 'impressions', 'ranking_position', 'ctr_gap', 'intent_match',
      'qualified_demo_starts', 'activity_completion', 'signup', 'commercial_relevance',
      'evidence_confidence',
    ],
    risk: [
      'urls_affected', 'indexation_impact', 'canonical_impact', 'content_magnitude',
      'positioning_impact', 'technical_impact', 'ux_impact', 'privacy_security_impact',
      'reversibility', 'evidence_confidence',
    ],
  },
  rollback: {
    immediate: [
      'build_failure', 'broken_routes', 'increase_in_404s', 'canonical_errors',
      'sitemap_failure', 'robots_failure', 'structured_data_invalid', 'perf_regression',
      'analytics_failure',
    ],
    seo: [
      'qualified_organic_usage_fell', 'organic_conversion_fell', 'query_visibility_collapsed',
      'indexed_url_count_anomaly', 'traffic_redirected_to_wrong_page', 'cannibalisation_increased',
    ],
  },
  categoryGuard:
    'Does this strengthen Draw in the Air as a movement-based learning platform, with the ' +
    'playable product as the proof, or does it merely chase search traffic? Chase-only changes are held.',
};
