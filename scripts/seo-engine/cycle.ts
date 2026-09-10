// scripts/seo-engine/cycle.ts
//
// One engine cycle: Discover → Score → Guardrails → Decide → Plan → (Execute)
// → Report. In shadow mode the executor holds everything, so this run reads
// Search Console and the analytics DB, writes a cycle record + Markdown
// summary to the output directory, and changes nothing else.
//
// Exit codes: 0 normal (including "nothing to do"); 1 credentials or data
// source failure, so a red Action is a real signal.
//
// Run: npx tsx scripts/seo-engine/cycle.ts
// Env: GSC_SERVICE_ACCOUNT_JSON, SUPABASE_URL, SUPABASE_SERVICE_READ_KEY,
//      SEO_ENGINE_GH_TOKEN (unused until the engine opens PRs),
//      optional SEO_ENGINE_OUT (default .seo-engine/out), SEO_ENGINE_WINDOW_DAYS (28).

import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { SEO_AUTONOMY_POLICY } from '../../src/seo/autonomy/policy';
import { aggregateSearchRows, attachPrevious, type SiteEvidence } from '../../src/seo/autonomy/evidence';
import { discoverOpportunities, DEFAULT_THRESHOLDS } from '../../src/seo/autonomy/discover';
import { planChanges } from '../../src/seo/autonomy/planner';
import { planCycle } from '../../src/seo/autonomy/executor';
import { buildCycleRecord, renderCycleMarkdown } from '../../src/seo/autonomy/report';
import { fetchAccessToken, parseServiceAccount } from './google-auth';
import { evidenceWindows, fetchSearchRows } from './gsc';
import { fetchFunnelByEntryPage, resolveConnectionString } from './funnel';
import { loadSiteMetadata } from './metadata';

const PROPERTY = process.env.GSC_PROPERTY ?? 'sc-domain:drawintheair.com';
const REQUIRED = ['GSC_SERVICE_ACCOUNT_JSON', 'SUPABASE_URL', 'SUPABASE_SERVICE_READ_KEY', 'SEO_ENGINE_GH_TOKEN'] as const;

const log = (msg: string): void => console.log(`[seo-engine] ${msg}`);

async function main(): Promise<number> {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) {
    log(`credentials not configured; nothing to do. missing: ${missing.join(', ')}`);
    return 0;
  }
  const policy = SEO_AUTONOMY_POLICY;
  const days = Number(process.env.SEO_ENGINE_WINDOW_DAYS ?? policy.windows.meaningfulSeoDays) || 28;
  const outDir = process.env.SEO_ENGINE_OUT ?? '.seo-engine/out';
  const now = new Date();
  const cycleId = now.toISOString().replace(/[-:]/g, '').slice(0, 15);
  const windows = evidenceWindows(days, 3, now);
  log(`cycle ${cycleId} mode=${policy.mode} policy=${policy.version} window=${windows.current.from}..${windows.current.to}`);

  // Discover: Search Console (current + previous window) and the funnel.
  const key = parseServiceAccount(process.env.GSC_SERVICE_ACCOUNT_JSON as string);
  const token = await fetchAccessToken(key);
  const [curRows, prevRows] = await Promise.all([
    fetchSearchRows(token, { property: PROPERTY, startDate: windows.current.from, endDate: windows.current.to }),
    fetchSearchRows(token, { property: PROPERTY, startDate: windows.previous.from, endDate: windows.previous.to }),
  ]);
  log(`search console: ${curRows.length} page×query rows (previous window ${prevRows.length})`);
  const search = attachPrevious(aggregateSearchRows(curRows), aggregateSearchRows(prevRows));

  let funnel: SiteEvidence['funnel'] = [];
  try {
    const conn = resolveConnectionString(process.env.SUPABASE_SERVICE_READ_KEY as string, process.env.SUPABASE_URL as string);
    funnel = await fetchFunnelByEntryPage(conn, windows.current);
    log(`funnel: ${funnel.length} entry pages`);
  } catch (err) {
    // A funnel outage must not silently turn into "rankings only" decisions:
    // the primary outcome is unmeasurable, so the cycle reports and plans nothing.
    log(`funnel read failed: ${(err as Error).message}`);
    return 1;
  }

  const evidence: SiteEvidence = {
    property: PROPERTY,
    window: { days, from: windows.current.from, to: windows.current.to },
    search, funnel, collectedAt: now.toISOString(),
  };

  // Score → Guardrails → Decide → Plan.
  const metadata = loadSiteMetadata();
  const opportunities = discoverOpportunities(evidence, metadata, DEFAULT_THRESHOLDS);
  const outcome = planChanges({
    cycleId, createdAt: now.toISOString(), evidence, opportunities, metadata,
    minImpressions: DEFAULT_THRESHOLDS.minImpressions,
  }, policy);
  log(`opportunities: ${opportunities.length}; planned within budget: ${outcome.plan.changes.length}`);

  // Execute (the executor re-validates every change against the policy; in shadow it holds all).
  const result = planCycle(outcome.plan, metadata, policy);
  log(`executor: applied=${result.applied.length} held=${result.held.length}`);

  // Report.
  const record = buildCycleRecord(evidence, outcome, result, policy);
  const md = renderCycleMarkdown(record, evidence);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `cycle-${cycleId}.json`), JSON.stringify({ record, evidence }, null, 2));
  writeFileSync(join(outDir, `cycle-${cycleId}.md`), md);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  log(`wrote ${outDir}/cycle-${cycleId}.{json,md}`);
  if (result.applied.length > 0) log('NOTE: applied changes are in-memory only; the write-back executor is a later component.');
  return 0;
}

main().then((code) => process.exit(code)).catch((err) => {
  console.error(`[seo-engine] failed: ${(err as Error).message}`);
  process.exit(1);
});
