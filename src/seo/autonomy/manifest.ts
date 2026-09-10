// src/seo/autonomy/manifest.ts
//
// The change manifest: the contract the planner writes, the executor applies,
// and the measurement + learning layers read back. One SeoChange is one
// hypothesis about one page. A CyclePlan is everything a single cycle proposes.
//
// Pure types + a couple of pure helpers. No I/O.

import type { ActionType } from './policy';
import type { ProposedChange } from './classify';

/** The per-URL metadata the executor can safely edit (the GREEN/AMBER surface). */
export interface PageMetadata {
  title: string;
  description: string;
  keywords: string[];
  canonical: string;
}

export type MetadataField = keyof PageMetadata;

/** A patch to a page's metadata — only the fields this change touches. */
export type MetadataPatch = Partial<PageMetadata>;

/**
 * One proposed change: what it is, the evidence and hypothesis behind it, the
 * exact edit, and how success will be judged. Carries the ProposedChange shape
 * the classifier consumes so the executor can re-validate it (defence in depth).
 */
/**
 * What the drafting step is asked to write, and the fence around it. The
 * planner emits a brief from evidence; the drafter (a later component) turns
 * it into a metadataPatch that the executor then re-validates. A change with a
 * brief and no patch is a planned-but-unwritten change and is always held.
 */
export interface ChangeBrief {
  /** Current values of the fields in play, for diffing and rollback. */
  current: MetadataPatch;
  /** Search queries (with impressions) the new copy must stay faithful to. */
  supportedQueries: { query: string; impressions: number; position: number }[];
  /** Evidence-first rationale, one or two sentences. */
  rationale: string;
  /** Hard constraints the draft must satisfy (intent, claims, length, positioning). */
  constraints: string[];
}

export interface SeoChange {
  id: string;
  url: string;                    // canonical path, e.g. '/letter-tracing'
  actionType: ActionType;
  hypothesis: string;
  evidenceRef: string;            // pointer into the evidence store (GSC query id, etc.)
  /** The concrete edit, for metadata actions. Other actions carry their own payloads later. */
  metadataPatch?: MetadataPatch;
  /** The drafting brief when the concrete edit has not been written yet. */
  brief?: ChangeBrief;
  /** The metric that will decide success, and the window in days. */
  successMetric: string;
  evaluationWindowDays: number;
  /** The classifier input describing this change's shape/risk. */
  proposed: ProposedChange;
}

export interface CyclePlan {
  cycleId: string;
  createdAt: string;              // ISO
  baselineRef: string;            // pointer to the baseline snapshot to measure against
  changes: SeoChange[];
}

/** Which action types the current executor can actually apply (metadata surface). */
export const EXECUTABLE_METADATA_ACTIONS: readonly ActionType[] = [
  'page_title', 'meta_description', 'fix_duplicate_metadata', 'canonical_fix',
  'page_description_from_queries',
] as const;

export function isMetadataAction(a: ActionType): boolean {
  return EXECUTABLE_METADATA_ACTIONS.includes(a);
}
