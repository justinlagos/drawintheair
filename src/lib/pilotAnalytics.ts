/**
 * pilotAnalytics — DEPRECATED, removed 2026-05-06.
 *
 * Was a Google-Sheets-backed analytics layer. All call sites have been
 * migrated to `src/lib/analytics.ts` which writes directly to the
 * Supabase `analytics_events` table. See docs/ANALYTICS_PLAN.md.
 *
 * This file is intentionally a stub re-export to keep dynamic imports /
 * older bundles from blowing up during the rollover. It can be deleted
 * outright in a follow-up release once we're sure no chunk references it.
 */

export {
    logEvent,
    startSession,
    endSession,
    hasActiveSession,
    getSessionId,
} from './analytics';

export type { AgeBand as PilotAgeBand } from './analytics';
