/**
 * Insights v2 — shared types.
 * One module so every tab speaks the same shape.
 */

// ── Filter state (URL-backed) ─────────────────────────────────────────
export type Range = '24h' | '7d' | '30d' | '90d';
export const RANGE_DAYS: Record<Range, number> = { '24h': 1, '7d': 7, '30d': 30, '90d': 90 };

export type TabKey =
    | 'executive' | 'engagement' | 'learning'
    | 'retention' | 'sessions' | 'errors';

export interface FilterState {
    range: Range;
    tab: TabKey;
    deviceType: 'all' | 'desktop' | 'tablet' | 'mobile';
    ageBand: 'all' | '4-5' | '6-7' | '8-9' | '10-11';
}

// ── Executive summary RPC ─────────────────────────────────────────────
export interface ExecutiveMetrics {
    sessions_started: number;
    distinct_devices: number;
    sessions_completed?: number;
    mode_completions: number;
    mode_starts?: number;
    cam_granted: number;
    cam_denied: number;
    tracker_ok: number;
    tracker_fail: number;
    median_session_s: number | null;
}
export interface ExecutiveDeltas {
    sessions_started_pct: number | null;
    distinct_devices_pct: number | null;
    mode_completions_pct: number | null;
    median_session_s_delta_s: number | null;
    cam_grant_rate_curr_pct: number | null;
    cam_grant_rate_prev_pct: number | null;
    tracker_success_curr_pct: number | null;
    completion_rate_curr_pct: number | null;
    completion_rate_prev_pct: number | null;
}
export interface SparkPoint { day: string; n: number; }
export interface ExecutiveData {
    days: number;
    as_of: string;
    sparkline_sessions_14d: SparkPoint[];
    current: ExecutiveMetrics;
    previous: ExecutiveMetrics;
    deltas: ExecutiveDeltas;
}

// ── A/B results RPC ───────────────────────────────────────────────────
export interface AbArm {
    variant: 'treatment' | 'control';
    exposed_sessions: number;
    granted: number;
    requested: number;
    reached_completion: number;
    grant_rate: number | null;
    complete_rate: number | null;
}
export interface AbData {
    flag: string;
    as_of: string;
    control: AbArm | null;
    treatment: AbArm | null;
    lift_pp: number | null;
    z_score: number | null;
    verdict: 'sample too small' | 'treatment winning' | 'control winning' | 'inconclusive';
}

// ── Cohort curves RPC ─────────────────────────────────────────────────
export interface CohortCurvePoint { d: number; pct: number | null; }
export interface CohortCurve {
    cohort_week: string;
    size: number;
    curve: CohortCurvePoint[];
}
export interface CohortCurvesData {
    weeks: number;
    as_of: string;
    cohorts: CohortCurve[];
}

// ── Engagement-deep RPC ───────────────────────────────────────────────
export interface EngagementDailyPoint { day: string; n: number; }
export interface EngagementModeRow {
    game_mode: string;
    started: number;
    completed: number;
    abandoned: number;
    stuck: number;
    median_seconds: number;
    p90_seconds: number;
    distinct_devices: number;
    is_open_ended: boolean;
    completion_rate_pct: number | null;
    stuck_rate_pct: number;
    abandon_rate_pct: number;
    daily: EngagementDailyPoint[];
}
export interface EngagementDeepData {
    days: number;
    as_of: string;
    modes: EngagementModeRow[];
}

// ── Mastery summary RPC ──────────────────────────────────────────────
export interface MasteryItemSummary {
    game_mode: string;
    item_key: string;
    strong: number;
    practising: number;
    new: number;
    total_devices: number;
    mean_acc_pct: number | null;
    median_acc_pct: number | null;
    mean_attempts: number;
}
export interface MasteryStrugglingRow {
    game_mode: string; item_key: string;
    total_devices: number; median_acc_pct: number;
    mean_attempts: number;
}
export interface MasteryStrongRow {
    game_mode: string; item_key: string;
    strong: number; total_devices: number;
    mean_acc_pct: number;
}
export interface MasterySummaryData {
    days: number; as_of: string;
    totals: {
        items_with_mastery: number;
        total_strong: number;
        total_practising: number;
        total_new: number;
        distinct_items: number;
        distinct_modes: number;
    };
    items: MasteryItemSummary[];
    struggling: MasteryStrugglingRow[];
    top_strong: MasteryStrongRow[];
}

// ── Retention deep RPC ───────────────────────────────────────────────
export interface RetentionDailyRow {
    day: string; active: number; new_devices: number; returning: number;
}
export interface RetentionHook { game_mode: string; devices: number; }
export interface RetentionHeatmapCell { w: number; pct: number | null; active: number; }
export interface RetentionHeatmapRow {
    cohort_week: string; cohort_size: number; cells: RetentionHeatmapCell[];
}
export interface RetentionDeepData {
    as_of: string;
    daily: RetentionDailyRow[];
    dau: number; wau: number; mau: number;
    stickiness_dau_mau: number;
    returning_hooks: RetentionHook[];
    cohort_heatmap: RetentionHeatmapRow[];
}

// ── Live indicator RPC ────────────────────────────────────────────────
export interface LiveSessionRow {
    session_id: string;
    last_mode: string | null;
    device_type: string | null;
    age_band: string | null;
    last_event: string;
}
export interface LiveData {
    as_of: string;
    active_count: number;
    by_mode: Record<string, number>;
    sessions: LiveSessionRow[];
}

// ── Existing RPCs (preserved verbatim from v1) ─────────────────────────
export interface TodayData {
    sessions_started: number;
    sessions_completed: number;
    completion_rate_pct: number | null;
    median_session_seconds: number | null;
    mode_completions: number;
    mode_starts: number;
    total_events: number;
}

export interface FunnelStep { step_order: number; step_name: string; sessions: number; pct_of_top: number; }
export interface FunnelData { days: number; steps: FunnelStep[]; }

export interface TrackerData {
    days: number; gpu_success: number; cpu_success: number; failed: number;
    median_init_ms_gpu: number | null; median_init_ms_cpu: number | null;
    failures_by_code: Array<{ code: string; count: number }>;
}

export interface ModeRow {
    game_mode: string; started: number; completed: number;
    distinct_starters: number; completion_rate_pct: number | null;
    is_open_ended?: boolean;
}
export interface ModesData { days: number; modes: ModeRow[]; }

export interface ErrorRow {
    occurred_at: string; event_name: string;
    browser: string | null; device_type: string | null;
    page: string | null; meta: Record<string, unknown>;
}
export interface ErrorsData { errors: ErrorRow[]; }

export interface CohortRow {
    cohort_week: string; new_devices: number;
    d1_returns: number; d3_returns: number; d7_returns: number;
    d1_pct: number; d3_pct: number; d7_pct: number;
}
export interface CohortData { weeks: number; cohorts: CohortRow[]; }

export interface MasteryRow {
    game_mode: string; item_key: string;
    attempts: number; correct: number; accuracy_pct: number;
    distinct_devices: number; avg_ms: number | null;
}
export interface MasteryData { days: number; min_attempts: number; items: MasteryRow[]; }

export interface CurriculumRow {
    game_mode: string; devices: number;
    avg_distinct_items: number; avg_attempts: number;
}
export interface CurriculumData { days: number; modes: CurriculumRow[]; }

export interface MilestonesRow {
    game_mode: string; item_key: string;
    mastered_devices: number; practising_devices: number; touched_devices: number;
    mastery_pct: number; avg_recent_accuracy: number;
}
export interface MilestonesData {
    days: number; min_attempts: number; threshold_pct: number; items: MilestonesRow[];
}

export interface SessionRow {
    session_id: string; device_id: string | null;
    started_at: string; last_at: string;
    duration_seconds: number; event_count: number;
    reached_wave: boolean; reached_completion: boolean;
    tracker_failed: boolean; two_hands_seen: boolean;
    age_band: string | null; browser: string | null;
    device_type: string | null; build_version: string | null;
    modes_played: string[] | null;
}
export interface SessionsData { sessions: SessionRow[]; }
