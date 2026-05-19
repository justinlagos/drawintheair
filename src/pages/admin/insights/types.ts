/**
 * Insights v2 — shared types.
 * One module so every tab speaks the same shape.
 */

// ── Filter state (URL-backed) ─────────────────────────────────────────
export type Range = '24h' | '7d' | '30d' | '90d';
export const RANGE_DAYS: Record<Range, number> = { '24h': 1, '7d': 7, '30d': 30, '90d': 90 };

export type TabKey =
    | 'executive' | 'engagement' | 'learning'
    | 'retention' | 'sessions' | 'errors' | 'friction' | 'progression' | 'adaptive' | 'observations';

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

// ── LIOS Sprint 4 — Human Observation Layer ────────────────────────────
//
// Document B §9. Teacher / parent / researcher tags joined to
// pseudonymous learner sessions. The qualitative companion to the
// quantitative telemetry stack.
export type ObservationFamily = 'focus' | 'affect' | 'independence' | 'social' | 'notable';
export interface ObservationTagCount {
    family: ObservationFamily;
    tag:    string;
    n:      number;
}
export interface ObservationClassroomCount {
    classroom_code: string;
    n_observations: number;
    n_learners:     number;
}
export interface ObservationEngagementVsMastery {
    device_id:   string;
    focus:       string[] | null;
    affect:      string[] | null;
    n_attempts:  number;
    n_mastered:  number;
}
export interface ObservationRecent {
    id:                string;
    recorded_at:       string;
    recorded_by:       string | null;
    observer_role:     'teacher' | 'parent' | 'researcher';
    device_id:         string;
    session_id:        string | null;
    classroom_code:    string | null;
    age_band:          string | null;
    focus_tags:        string[];
    affect_tags:       string[];
    independence_tags: string[];
    social_tags:       string[];
    notable_tags:      string[];
    note:              string | null;
}
export interface ObservationsData {
    days:                       number;
    as_of:                      string;
    total:                      number;
    distinct_learners_observed: number;
    distinct_classrooms:        number;
    by_tag:                     ObservationTagCount[];
    by_classroom:               ObservationClassroomCount[];
    engagement_vs_mastery:      ObservationEngagementVsMastery[];
    recent:                     ObservationRecent[];
}

// LIOS Sprint 4 — Unified Export headline
export interface ExportHeadline {
    export_version: string;
    generated_at:   string;
    window_days:    number;
    product:        string;
    environment:    string;
    headline: {
        attempts_in_window:           number;
        sessions_in_window:           number;
        learners_in_window:           number;
        mastered_skills:              number;
        observations_in_window:       number;
        adaptive_decisions_in_window: number;
        cron_runs_24h:                number;
        cron_failed_24h:              number;
    };
}

// ── LIOS Sprint 3 — Adaptive Engine v1 audit surface ───────────────────
//
// Document B §5 + §6.2. Engineering observability for the rule-based
// recommendation engine — regime distribution, recovery-step ladder,
// invariant fire counts, per-mode throughput, recent decisions with
// the full audit row (inputs + reasoning).
export type AdaptiveRegime = 'fresh' | 'flow' | 'productive' | 'boredom' | 'frustration';
export type AdaptiveScaffold = 'none' | 'partial' | 'full';
export type AdaptiveReward = 'quiet' | 'standard' | 'big';

export interface AdaptiveRegimeCount { regime: AdaptiveRegime; n: number; }
export interface AdaptiveRecoveryCount { recovery_step: number; n: number; }
export interface AdaptiveScaffoldCount { scaffold_level: AdaptiveScaffold; n: number; }
export interface AdaptiveRewardCount { reward_intensity: AdaptiveReward; n: number; }
export interface AdaptiveInvariantCount { invariant: string; n: number; }
export interface AdaptiveModeCount {
    game_mode:       string;
    n:               number;
    mean_p_expected: number | null;
}
export interface AdaptiveRecentDecision {
    id:                 string;
    made_at:            string;
    device_id:          string;
    session_id:         string;
    game_mode:          string;
    current_item:       string | null;
    next_item:          string | null;
    scaffold_level:     AdaptiveScaffold;
    reward_intensity:   AdaptiveReward;
    suggest_break:      boolean;
    regime:             AdaptiveRegime;
    recovery_step:      number | null;
    p_expected:         number | null;
    invariants_applied: string[];
    reasoning:          string | null;
}
export interface AdaptiveDecisionsData {
    days:              number;
    as_of:             string;
    total:             number;
    by_regime:         AdaptiveRegimeCount[];
    by_recovery_step:  AdaptiveRecoveryCount[];
    by_scaffold:       AdaptiveScaffoldCount[];
    by_reward:         AdaptiveRewardCount[];
    invariant_fires:   AdaptiveInvariantCount[];
    by_mode:           AdaptiveModeCount[];
    recent:            AdaptiveRecentDecision[];
}

// ── LIOS Sprint 3 — Learner Progression Dashboard ──────────────────────
//
// Document A §7.1 Learner Progression Dashboard. v1 scope renders:
// summary stats, four-state totals, top-practised items, θ-over-time
// trajectories from skill_state_history, recent mastery transitions,
// recent attempts. The motor-precision / confidence / decay-probe /
// transfer-probe curves wait for later sprints to produce that data.
export interface ProgressionLearnerSummary {
    n_attempts:       number;
    n_distinct_items: number;
    n_sessions:       number;
    first_seen:       string;
    last_seen:        string;
    accuracy:         number | null;
    mean_credibility: number | null;
    age_band:         string | null;
}
export interface ProgressionLearnerListItem extends ProgressionLearnerSummary {
    device_id:  string;
    n_mastered: number;
}
export interface ProgressionTopLearners {
    days:     number;
    limit:    number;
    as_of:    string;
    learners: ProgressionLearnerListItem[];
}
export interface ProgressionTrajectoryPoint {
    day:        string;
    theta:      number;
    n_attempts: number;
}
export interface ProgressionTrajectory {
    item_key:   string;
    game_mode:  string;
    series:     ProgressionTrajectoryPoint[];
}
export interface ProgressionTransition {
    item_key:      string;
    game_mode:     string;
    from_state:    string | null;
    to_state:      string;
    transition_at: string;
    evidence:      Record<string, unknown>;
}
export interface ProgressionRecentAttempt {
    occurred_at:        string;
    game_mode:          string;
    item_key:           string;
    was_correct:        boolean;
    ms_to_attempt:      number | null;
    credibility_score:  number | null;
    credibility_tier:   'A' | 'B' | 'C' | null;
}
export interface ProgressionStateTotals {
    exposed:     number;
    acquired:    number;
    mastered:    number;
    decayed:     number;
    total_pairs: number;
}
export interface ProgressionTopItem {
    item_key:   string;
    game_mode:  string;
    n_attempts: number;
}
export interface ProgressionLearnerData {
    device_id:        string;
    as_of:            string;
    summary:          ProgressionLearnerSummary;
    state_totals:     ProgressionStateTotals;
    top_items:        ProgressionTopItem[];
    trajectories:     ProgressionTrajectory[];
    transitions:      ProgressionTransition[];
    recent_attempts:  ProgressionRecentAttempt[];
}

// ── LIOS Sprint 3 — home / classroom context split ─────────────────────
//
// Surfaces the dimension unlocked by the ?join=CODE classroom-code
// redemption flow. Renders as a small split panel on the Learning tab
// and feeds the dashboard's home-vs-classroom comparisons.
export interface ContextSplitRow {
    context:          'home' | 'classroom' | 'unknown';
    n_attempts:       number;
    n_sessions:       number;
    accuracy:         number | null;
    mean_credibility: number | null;
    tier_a:           number;
    tier_b:           number;
    tier_c:           number;
}
export interface ContextSplitClassCode {
    class_code: string;
    n_attempts: number;
    n_sessions: number;
}
export interface ContextSplitData {
    days:           number;
    as_of:          string;
    total_attempts: number;
    by_context:     ContextSplitRow[];
    class_codes:    ContextSplitClassCode[];
}

// ── LIOS Mastery v2 — four-state vocabulary ────────────────────────────
//
// Document A §4.4 — Exposed / Acquired / Mastered / Decayed. Backed by
// the mastery_episode_fact state-transition log produced by the
// lios_detect_mastery_episodes_v1 function.
export interface MasteryV2Totals {
    exposed:     number;
    acquired:    number;
    mastered:    number;
    decayed:     number;
    total_pairs: number;
}
export interface MasteryV2StateMode {
    game_mode:     string;
    current_state: 'Exposed' | 'Acquired' | 'Mastered' | 'Decayed';
    n:             number;
}
export interface MasteryV2AgeState {
    age_band:      string;
    current_state: 'Exposed' | 'Acquired' | 'Mastered' | 'Decayed';
    n:             number;
}
export interface MasteryV2Transition {
    device_id:     string;
    item_key:      string;
    game_mode:     string;
    from_state:    string | null;
    to_state:      string;
    transition_at: string;
    age_band:      string | null;
    evidence:      Record<string, unknown>;
}
export interface MasteryV2TopMastered {
    item_key:    string;
    game_mode:   string;
    n_learners:  number;
}
export interface MasteryV2Data {
    days:  number;
    as_of: string;
    totals: MasteryV2Totals;
    by_state_mode:       MasteryV2StateMode[];
    by_age_state:        MasteryV2AgeState[];
    recent_transitions:  MasteryV2Transition[];
    top_mastered:        MasteryV2TopMastered[];
}

// ── LIOS Cognitive Friction v1 — engineering surface ──────────────────
//
// Document B §4.1 — eight detectors over each session's pattern.
// This is an ENGINEERING-only view for threshold calibration; the
// teacher-facing equivalent ships once the v1 detector firings are
// validated against ground-truth teacher tags (Sprint 4+).
export interface FrictionCount {
    detector: string;     // 'friction_<name>_detected'
    n:        number;
}
export interface FrictionModeCount {
    game_mode: string;
    detector:  string;
    n:         number;
}
export interface FrictionAgeCount {
    age_band: string;
    detector: string;
    n:        number;
}
export interface FrictionRecent {
    session_id:  string;
    detector:    string;
    game_mode:   string | null;
    age_band:    string | null;
    context:     string | null;
    occurred_at: string;
    meta:        Record<string, unknown>;
}
export interface FrictionEngineeringData {
    days:        number;
    as_of:       string;
    total:       number;
    by_detector: FrictionCount[];
    by_mode:     FrictionModeCount[];
    by_age:      FrictionAgeCount[];
    recent:      FrictionRecent[];
}

// ── LIOS Trust v1 — composition strip ──────────────────────────────────
// Renders above every dashboard chart so the audience can audit the
// data-quality denominator (Tier A high credibility / Tier B reduced
// weight / Tier C quarantined) underneath the headline metric.
export interface TrustStripByMode {
    game_mode: string;
    total: number;
    tier_a: number;
    tier_b: number;
    tier_c: number;
    pct_a: number | null;
    pct_b: number | null;
    pct_c: number | null;
}
export interface TrustStripReason {
    reason: string;
    n: number;
}
export interface TrustStripData {
    days: number;
    as_of: string;
    total: number;
    tier_a: number;
    tier_b: number;
    tier_c: number;
    pct_a: number | null;
    pct_b: number | null;
    pct_c: number | null;
    mean_score: number;
    by_mode: TrustStripByMode[];
    top_reasons: TrustStripReason[];
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
