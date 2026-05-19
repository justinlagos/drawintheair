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
    TrustStripData, FrictionEngineeringData, MasteryV2Data, ContextSplitData,
    ProgressionTopLearners, ProgressionLearnerData,
    AdaptiveDecisionsData,
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

// LIOS Trust v1 — composition strip data for the dashboards.
// Wired onto every tab so the audience can audit data quality
// underneath every chart they're looking at.
export const fetchTrustStrip = (days: number) =>
    callRpc<TrustStripData>('dashboard_trust_strip', { in_days: days });

// LIOS Mastery v2 — four-state vocabulary (Exposed/Acquired/Mastered/Decayed).
// Replaces the static three-tier (strong/practising/new) classification on
// the Learning tab with the proper state-transition language.
export const fetchMasteryV2 = (days: number) =>
    callRpc<MasteryV2Data>('dashboard_mastery_v2', { in_days: days });

// LIOS Sprint 3 — home/classroom split (per-context counts + per-class_code
// drilldown). Driven by the ?join=CODE redemption flow that flips
// context='classroom' and stamps class_code into event meta.
export const fetchContextSplit = (days: number) =>
    callRpc<ContextSplitData>('dashboard_context_split', { in_days: days });

// LIOS Sprint 3 — Learner Progression Dashboard data (Document A §7.1).
// Two RPCs: the picker list (top N most-active pseudonymous learners) and
// the per-learner profile with θ trajectories + mastery transitions.
export const fetchProgressionTopLearners = (days: number, limit = 25) =>
    callRpc<ProgressionTopLearners>('dashboard_progression_top_learners', { in_days: days, in_limit: limit });

export const fetchProgressionForLearner = (deviceId: string) =>
    callRpc<ProgressionLearnerData>('dashboard_progression_for_learner', { in_device_id: deviceId });

// LIOS Sprint 3 — Adaptive Engine v1 audit surface. Powers the
// Adaptive tab: regime distribution, recovery-step ladder, invariant
// fire counts, recent decisions with full reasoning.
export const fetchAdaptiveDecisions = (days: number) =>
    callRpc<AdaptiveDecisionsData>('dashboard_adaptive_decisions', { in_days: days });

// LIOS Cognitive Friction v1 — engineering observability.
// Per-detector counts, per-mode + per-age breakdowns, recent firings
// with full meta. Read by the Friction tab, which is engineering-only.
export const fetchFrictionEngineering = (days: number) =>
    callRpc<FrictionEngineeringData>('dashboard_friction_engineering', { in_days: days });

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
