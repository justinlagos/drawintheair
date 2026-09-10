// src/seo/autonomy/executor.ts
//
// Turns a CyclePlan into a validated set of applied changes over an in-memory
// site-metadata model, re-checking every change against the policy (defence in
// depth) and enforcing the per-cycle budget. Pure and deterministic: no file
// or network I/O. A thin adapter (added when wired to real files) is the only
// thing that persists `nextMetadata`; everything decided here is testable now.
//
// Scope today: the metadata surface (title / description / keywords / canonical),
// which is where GREEN and in-limit AMBER changes live. Non-metadata actions are
// recognised and held with a clear reason until their executor exists.

import { SEO_AUTONOMY_POLICY, type SeoAutonomyPolicy } from './policy';
import { classifyChange, checkCycleBudget } from './classify';
import {
  isMetadataAction,
  type CyclePlan, type SeoChange, type PageMetadata, type MetadataPatch,
} from './manifest';

/** url path → its current metadata. The executor never invents URLs. */
export type SiteMetadata = Record<string, PageMetadata>;

export interface AppliedChange {
  change: SeoChange;
  /** Prior values of the fields this change touched — the reversal patch for rollback. */
  before: MetadataPatch;
  after: MetadataPatch;
}

export interface HeldChange {
  change: SeoChange;
  reasons: string[];
}

export interface CycleResult {
  applied: AppliedChange[];
  held: HeldChange[];
  nextMetadata: SiteMetadata;
  budgetOk: boolean;
  budgetReasons: string[];
}

const PATCH_FIELDS: readonly (keyof PageMetadata)[] = ['title', 'description', 'keywords', 'canonical'];

function nonEmptyPatch(patch: MetadataPatch | undefined): patch is MetadataPatch {
  return !!patch && PATCH_FIELDS.some((f) => patch[f] !== undefined);
}

/** Prior values of exactly the fields a patch sets — the reversible inverse. */
function priorValues(current: PageMetadata, patch: MetadataPatch): MetadataPatch {
  const before: MetadataPatch = {};
  if (patch.title !== undefined) before.title = current.title;
  if (patch.description !== undefined) before.description = current.description;
  if (patch.keywords !== undefined) before.keywords = current.keywords;
  if (patch.canonical !== undefined) before.canonical = current.canonical;
  return before;
}

function applyPatch(current: PageMetadata, patch: MetadataPatch): PageMetadata {
  return { ...current, ...patch };
}

/**
 * Plan a cycle: validate the budget and every change, apply the ones that pass
 * to a copy of the metadata model, and return applied + held (with reasons) and
 * the resulting model. Nothing here is persisted — the caller's adapter does that
 * only when the autonomy mode permits.
 */
export function planCycle(
  plan: CyclePlan,
  currentMetadata: SiteMetadata,
  policy: SeoAutonomyPolicy = SEO_AUTONOMY_POLICY,
): CycleResult {
  const budget = checkCycleBudget(
    plan.changes.map((c) => ({ url: c.url, change: c.proposed })),
    policy,
  );

  // Over-budget cycles ship nothing — the whole plan is held so cause↔effect stays clean.
  if (!budget.ok) {
    return {
      applied: [],
      held: plan.changes.map((change) => ({ change, reasons: budget.reasons.map((r) => `held:budget:${r}`) })),
      nextMetadata: currentMetadata,
      budgetOk: false,
      budgetReasons: budget.reasons,
    };
  }

  const applied: AppliedChange[] = [];
  const held: HeldChange[] = [];
  const nextMetadata: SiteMetadata = { ...currentMetadata };

  for (const change of plan.changes) {
    const held1 = (reasons: string[]): void => { held.push({ change, reasons }); };

    const cls = classifyChange(change.proposed, policy);
    if (!cls.allowed) { held1(cls.reasons); continue; }

    if (!isMetadataAction(change.actionType)) {
      held1([`held:no_executor_for_action:${change.actionType}`]);
      continue;
    }
    if (!nonEmptyPatch(change.metadataPatch)) { held1(['held:missing_or_empty_metadata_patch']); continue; }

    const current = nextMetadata[change.url];
    if (!current) { held1([`held:unknown_url:${change.url}`]); continue; }

    const before = priorValues(current, change.metadataPatch);
    const updated = applyPatch(current, change.metadataPatch);
    nextMetadata[change.url] = updated;
    applied.push({ change, before, after: { ...change.metadataPatch } });
  }

  return { applied, held, nextMetadata, budgetOk: true, budgetReasons: [] };
}

/**
 * Reverse an applied change (rollback): restore the exact fields it touched to
 * their prior values. Returns the metadata with the reversal applied.
 */
export function revertChange(metadata: SiteMetadata, applied: AppliedChange): SiteMetadata {
  const current = metadata[applied.change.url];
  if (!current) return metadata;
  return { ...metadata, [applied.change.url]: applyPatch(current, applied.before) };
}
