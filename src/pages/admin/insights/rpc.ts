/**
 * Insights v2 — typed RPC client.
 *
 * The `apikey` header MUST be the project anon key. The user's JWT
 * goes on Authorization so RLS can see who's asking (our SECURITY
 * DEFINER RPCs don't strictly need it, but we send it anyway so the
 * Supabase logs attribute requests properly).
 */
import { getSupabaseUrl, getAccessToken, getAnonKey } from '../../../lib/supabase';
import type {
    ExecutiveData, AbData, CohortCurvesData, LiveData,
    EngagementDeepData, MasterySummaryData, RetentionDeepData,
    TodayData, FunnelData, TrackerData, ModesData, ErrorsData,
    CohortData, MasteryData, CurriculumData, MilestonesData, SessionsData,
} from './types';

async function callRpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
    const url = `${getSupabaseUrl()}/rest/v1/rpc/${fn}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            apikey: getAnonKey(),
            Authorization: `Bearer ${getAccessToken()}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(args),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`${fn} → HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
}

// New v2 RPCs ────────────────────────────────────────────────────────────
export const fetchExecutive  = (days: number) =>
    callRpc<ExecutiveData>('dashboard_executive_summary', { in_days: days });

export const fetchAb         = (flag = 'camera_explainer_v1') =>
    callRpc<AbData>('dashboard_ab_results', { in_flag: flag });

export const fetchCohortCurves = (weeks = 6) =>
    callRpc<CohortCurvesData>('dashboard_cohort_curves', { in_weeks: weeks });

export const fetchLive       = () =>
    callRpc<LiveData>('dashboard_live', {});

export const fetchEngagementDeep = (days: number) =>
    callRpc<EngagementDeepData>('dashboard_engagement_deep', { in_days: days });

export const fetchMasterySummary = (days = 30) =>
    callRpc<MasterySummaryData>('dashboard_mastery_summary', { in_days: days });

export const fetchRetentionDeep = () =>
    callRpc<RetentionDeepData>('dashboard_retention_deep', {});

// Existing v1 RPCs (preserved) ───────────────────────────────────────────
export const fetchToday      = () => callRpc<TodayData>('dashboard_today', {});
export const fetchFunnel     = (days: number) => callRpc<FunnelData>('dashboard_funnel', { in_days: days });
export const fetchTracker    = (days: number) => callRpc<TrackerData>('dashboard_tracker_health', { in_days: days });
export const fetchTopModes   = (days: number) => callRpc<ModesData>('dashboard_top_modes', { in_days: days });
export const fetchErrors     = (limit = 30) => callRpc<ErrorsData>('dashboard_errors', { in_limit: limit });
export const fetchCohorts    = (weeks: number) => callRpc<CohortData>('dashboard_cohort_retention', { in_weeks: weeks });
export const fetchMastery    = (days: number, minAttempts = 3) =>
    callRpc<MasteryData>('dashboard_mastery', { in_days: days, in_min_attempts: minAttempts });
export const fetchCurriculum = (days: number) => callRpc<CurriculumData>('dashboard_curriculum_coverage', { in_days: days });
export const fetchMilestones = (days = 60, minAttempts = 5, thresholdPct = 80) =>
    callRpc<MilestonesData>('dashboard_mastery_milestones', {
        in_days: days, in_min_attempts: minAttempts, in_threshold_pct: thresholdPct,
    });
export const fetchSessions   = (limit = 50) => callRpc<SessionsData>('dashboard_latest_sessions', { in_limit: limit });
