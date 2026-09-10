// scripts/seo-engine/funnel.ts
//
// Funnel reader: qualified usage attributed to the page a session ENTERED on,
// read through the seo_engine_ro role (SELECT on analytics_events only, every
// transaction read-only, 30s statement timeout; see the migration
// supabase/migrations/20260910150000_seo_engine_readonly_role.sql).
//
// The event → funnel-step mapping below is the engine's definition of
// "qualified organic usage". Changing it is a RED action for the engine
// (analytics_definition_change) and a human PR for us.

import postgres from 'postgres';
import type { PageFunnelStats } from '../../src/seo/autonomy/evidence';
import { toPath } from '../../src/seo/autonomy/evidence';

export const FUNNEL_DEFINITION = {
  qualifiedDemoStart: {
    events: ['try_free_clicked', 'demo_loading_complete'],
    ctaClickFunnelStep: 'qualified_demo_start',    // cta_click rows whose meta.funnel_step matches
  },
  meaningfulInteraction: ['mode_started'],
  activityCompletion: ['mode_completed', 'stage_completed', 'build_object_completed'],
  signup: ['teacher_signup_completed', 'parent_signup_completed'],
  enquiry: ['school_pack_form_submit', 'demo_request_form_submit'],
  organicReferrerPattern: '(^|\\.)(google|bing|duckduckgo|yahoo|ecosia)\\.',
} as const;

/**
 * Accepts either a full postgresql:// connection string or a bare password
 * for seo_engine_ro (then composed with the project ref from SUPABASE_URL and
 * the eu-west-2 session pooler). Nothing from this value is ever logged.
 */
export function resolveConnectionString(readKey: string, supabaseUrl: string): string {
  if (/^postgres(ql)?:\/\//i.test(readKey)) return readKey;
  const ref = new URL(supabaseUrl).hostname.split('.')[0];
  return `postgresql://seo_engine_ro.${ref}:${encodeURIComponent(readKey)}@aws-1-eu-west-2.pooler.supabase.com:5432/postgres`;
}

export async function fetchFunnelByEntryPage(
  connectionString: string,
  window: { from: string; to: string },
): Promise<PageFunnelStats[]> {
  const sql = postgres(connectionString, { ssl: 'require', max: 1, idle_timeout: 5, connect_timeout: 20, prepare: false });
  const d = FUNNEL_DEFINITION;
  const toExclusive = `${window.to}T23:59:59.999Z`;
  try {
    const rows = await sql<Array<Record<string, string | number | null>>>`
      with sessions as (
        select session_id,
               (array_agg(page order by occurred_at))[1]       as entry_page,
               (array_agg(referrer order by occurred_at))[1]   as entry_referrer,
               (array_agg(utm_medium order by occurred_at))[1] as entry_utm_medium,
               (array_agg(utm_source order by occurred_at))[1] as entry_utm_source
        from public.analytics_events
        where occurred_at >= ${window.from}::timestamptz and occurred_at <= ${toExclusive}::timestamptz
          and page is not null
        group by session_id
      ),
      conv as (
        select session_id,
          bool_or(event_name = any(${[...d.qualifiedDemoStart.events]}::text[])
                  or (event_name = 'cta_click' and meta->>'funnel_step' = ${d.qualifiedDemoStart.ctaClickFunnelStep})) as demo_start,
          bool_or(event_name = any(${[...d.meaningfulInteraction]}::text[])) as interaction,
          bool_or(event_name = any(${[...d.activityCompletion]}::text[]))    as completion,
          bool_or(event_name = any(${[...d.signup]}::text[]))                as signup,
          bool_or(event_name = any(${[...d.enquiry]}::text[]))               as enquiry
        from public.analytics_events
        where occurred_at >= ${window.from}::timestamptz and occurred_at <= ${toExclusive}::timestamptz
        group by session_id
      )
      select s.entry_page as page,
             count(*)::int as sessions,
             count(*) filter (where s.entry_utm_medium = 'organic'
                                 or (s.entry_utm_source is null and s.entry_referrer ~* ${d.organicReferrerPattern}))::int as organic_sessions,
             count(*) filter (where c.demo_start)::int  as demo_starts,
             count(*) filter (where c.interaction)::int as interactions,
             count(*) filter (where c.completion)::int  as completions,
             count(*) filter (where c.signup)::int      as signups,
             count(*) filter (where c.enquiry)::int     as enquiries
      from sessions s left join conv c using (session_id)
      group by s.entry_page
      order by sessions desc
      limit 500
    `;
    const byPath = new Map<string, PageFunnelStats>();
    for (const r of rows) {
      const url = toPath(String(r.page ?? '/'));
      const cur = byPath.get(url) ?? { url, sessions: 0, organicSessions: 0, qualifiedDemoStarts: 0, meaningfulInteractions: 0, activityCompletions: 0, signups: 0, enquiries: 0 };
      cur.sessions += Number(r.sessions ?? 0);
      cur.organicSessions += Number(r.organic_sessions ?? 0);
      cur.qualifiedDemoStarts += Number(r.demo_starts ?? 0);
      cur.meaningfulInteractions += Number(r.interactions ?? 0);
      cur.activityCompletions += Number(r.completions ?? 0);
      cur.signups += Number(r.signups ?? 0);
      cur.enquiries += Number(r.enquiries ?? 0);
      byPath.set(url, cur);
    }
    return [...byPath.values()].sort((a, b) => b.sessions - a.sessions);
  } finally {
    await sql.end({ timeout: 5 });
  }
}
