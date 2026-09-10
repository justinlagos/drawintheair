// scripts/seo-engine/gsc.ts
//
// Search Console reader: page × query rows for a date window, paginated.
// Read-only. Returns the raw rows the evidence layer aggregates.

import type { RawSearchRow } from '../../src/seo/autonomy/evidence';

export interface GscQueryOptions {
  property: string;   // 'sc-domain:drawintheair.com'
  startDate: string;  // YYYY-MM-DD
  endDate: string;
  country?: string;   // ISO-3166-1 alpha-3, e.g. 'gbr'
  rowLimit?: number;
  fetchImpl?: typeof fetch;
}

interface GscApiRow { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }

export async function fetchSearchRows(accessToken: string, opts: GscQueryOptions): Promise<RawSearchRow[]> {
  const f = opts.fetchImpl ?? fetch;
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(opts.property)}/searchAnalytics/query`;
  const rowLimit = opts.rowLimit ?? 25000;
  const out: RawSearchRow[] = [];
  let startRow = 0;
  for (let page = 0; page < 20; page++) {
    const body: Record<string, unknown> = {
      startDate: opts.startDate,
      endDate: opts.endDate,
      dimensions: ['page', 'query'],
      type: 'web',
      dataState: 'final',
      rowLimit,
      startRow,
    };
    if (opts.country) {
      body.dimensionFilterGroups = [{ filters: [{ dimension: 'country', operator: 'equals', expression: opts.country }] }];
    }
    const res = await f(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Search Console query failed: HTTP ${res.status}`);
    const data = (await res.json()) as { rows?: GscApiRow[] };
    const rows = data.rows ?? [];
    for (const r of rows) {
      out.push({ page: r.keys[0] ?? '', query: r.keys[1] ?? '', clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position });
    }
    if (rows.length < rowLimit) break;
    startRow += rowLimit;
  }
  return out;
}

/** Date helpers: GSC data is final ~3 days behind, so the window ends at today-3. */
export function isoDate(d: Date): string { return d.toISOString().slice(0, 10); }

export function evidenceWindows(days: number, lagDays = 3, now = new Date()): { current: { from: string; to: string }; previous: { from: string; to: string } } {
  const to = new Date(now); to.setUTCDate(to.getUTCDate() - lagDays);
  const from = new Date(to); from.setUTCDate(from.getUTCDate() - (days - 1));
  const prevTo = new Date(from); prevTo.setUTCDate(prevTo.getUTCDate() - 1);
  const prevFrom = new Date(prevTo); prevFrom.setUTCDate(prevFrom.getUTCDate() - (days - 1));
  return { current: { from: isoDate(from), to: isoDate(to) }, previous: { from: isoDate(prevFrom), to: isoDate(prevTo) } };
}
