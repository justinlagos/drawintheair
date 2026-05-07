/**
 * /admin/insights — analytics insights dashboard
 *
 * The same eleven panels as the Cowork dita-insights artifact, but
 * native to drawintheair.com. Auth-gated behind Google OAuth + an
 * email allow-list so a leaked URL doesn't expose the data.
 *
 * Data flow: calls the SECURITY DEFINER RPCs (dashboard_today,
 * dashboard_funnel, dashboard_tracker_health, dashboard_top_modes,
 * dashboard_errors, dashboard_cohort_retention, dashboard_mastery,
 * dashboard_curriculum_coverage, dashboard_mastery_milestones,
 * dashboard_classrooms, dashboard_latest_sessions). The RPCs are
 * granted to anon — auth is purely component-level.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSupabaseUrl, getAccessToken } from '../../lib/supabase';
import { tokens } from '../../styles/tokens';
import { KidButton } from '../../components/kid-ui';
import { SEOMeta } from '../../seo/SEOMeta';

// Allow-list. Add more emails here when other admins need access.
const ALLOWED_ADMINS = new Set<string>([
    'mrjustinukaegbu@gmail.com',
]);

// ── Types ───────────────────────────────────────────────────────────
interface TodayData {
    sessions_started: number;
    sessions_completed: number;
    completion_rate_pct: number | null;
    median_session_seconds: number | null;
    mode_completions: number;
    mode_starts: number;
    total_events: number;
}

interface FunnelStep {
    step_order: number;
    step_name: string;
    sessions: number;
    pct_of_top: number;
}

interface FunnelData { days: number; steps: FunnelStep[]; }

interface TrackerData {
    days: number;
    gpu_success: number;
    cpu_success: number;
    failed: number;
    median_init_ms_gpu: number | null;
    median_init_ms_cpu: number | null;
    failures_by_code: Array<{ code: string; count: number }>;
}

interface ModeRow {
    game_mode: string;
    started: number;
    completed: number;
    distinct_starters: number;
    completion_rate_pct: number;
}
interface ModesData { days: number; modes: ModeRow[]; }

interface ErrorRow {
    occurred_at: string;
    event_name: string;
    browser: string | null;
    device_type: string | null;
    page: string | null;
    meta: Record<string, unknown>;
}
interface ErrorsData { errors: ErrorRow[]; }

interface CohortRow {
    cohort_week: string;
    new_devices: number;
    d1_returns: number;
    d3_returns: number;
    d7_returns: number;
    d1_pct: number;
    d3_pct: number;
    d7_pct: number;
}
interface CohortData { weeks: number; cohorts: CohortRow[]; }

interface MasteryRow {
    game_mode: string;
    item_key: string;
    attempts: number;
    correct: number;
    accuracy_pct: number;
    distinct_devices: number;
    avg_ms: number | null;
}
interface MasteryData { days: number; min_attempts: number; items: MasteryRow[]; }

interface CurriculumRow {
    game_mode: string;
    devices: number;
    avg_distinct_items: number;
    avg_attempts: number;
}
interface CurriculumData { days: number; modes: CurriculumRow[]; }

interface MilestonesRow {
    game_mode: string;
    item_key: string;
    mastered_devices: number;
    practising_devices: number;
    touched_devices: number;
    mastery_pct: number;
    avg_recent_accuracy: number;
}
interface MilestonesData {
    days: number;
    min_attempts: number;
    threshold_pct: number;
    items: MilestonesRow[];
}

interface ClassroomRow {
    school_id: string;
    sessions: number;
    devices: number;
    mode_completions: number;
    active_days: number;
    last_active_day: string;
}
interface ClassroomsData { days: number; schools: ClassroomRow[]; }

interface SessionRow {
    session_id: string;
    device_id: string | null;
    started_at: string;
    last_at: string;
    duration_seconds: number;
    event_count: number;
    reached_wave: boolean;
    reached_completion: boolean;
    tracker_failed: boolean;
    two_hands_seen: boolean;
    age_band: string | null;
    browser: string | null;
    device_type: string | null;
    build_version: string | null;
    modes_played: string[] | null;
}
interface SessionsData { sessions: SessionRow[]; }

// ── Helpers ─────────────────────────────────────────────────────────
const fmtNum = (n: number | null | undefined): string =>
    typeof n === 'number' ? n.toLocaleString() : '—';

const fmtDuration = (s: number | null | undefined): string => {
    if (s == null) return '—';
    const r = Math.round(s);
    if (r < 60) return `${r}s`;
    const m = Math.floor(r / 60);
    const sec = r % 60;
    return sec === 0 ? `${m}m` : `${m}m ${sec}s`;
};

const fmtTime = (iso: string): string =>
    new Date(iso).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

const fmtRelative = (iso: string): string => {
    const ms = Date.now() - new Date(iso).getTime();
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
};

const truncate = (s: string | undefined | null, n: number): string => {
    if (!s) return '';
    return s.length > n ? `${s.slice(0, n)}…` : s;
};

// ── RPC client ──────────────────────────────────────────────────────
async function callRpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
    const url = `${getSupabaseUrl()}/rest/v1/rpc/${fn}`;
    const token = getAccessToken();
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            apikey: token,
            Authorization: `Bearer ${token}`,
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

// ── Tag component (used in tables) ─────────────────────────────────
const Tag: React.FC<{ children: React.ReactNode; tone?: 'plum' | 'green' | 'coral' | 'gray' | 'aqua' }> = ({
    children, tone = 'plum',
}) => {
    const palette = {
        plum:  { bg: 'rgba(108, 63, 164, 0.10)', fg: tokens.colors.deepPlum },
        green: { bg: 'rgba(126, 217, 87, 0.18)', fg: '#1f7a3a' },
        coral: { bg: 'rgba(255, 107, 107, 0.15)', fg: '#C13A3A' },
        gray:  { bg: 'rgba(63, 64, 82, 0.08)', fg: '#6B6F84' },
        aqua:  { bg: 'rgba(85, 221, 224, 0.18)', fg: '#1c7e80' },
    }[tone];
    return (
        <span style={{
            display: 'inline-block',
            font: `600 11px ${tokens.fontFamily.body}`,
            padding: '2px 8px',
            borderRadius: 999,
            background: palette.bg,
            color: palette.fg,
        }}>
            {children}
        </span>
    );
};

// ── Panel wrapper ──────────────────────────────────────────────────
const Panel: React.FC<{
    title: string; meta?: string; tier?: string; children: React.ReactNode; span?: 7 | 5 | 12 | 6;
}> = ({ title, meta, tier, children, span = 12 }) => (
    <section style={{
        gridColumn: `span ${span}`,
        background: '#FFFFFF',
        border: '1px solid rgba(63, 64, 82, 0.10)',
        borderRadius: 14,
        padding: '16px 18px',
        boxShadow: '0 1px 2px rgba(63, 64, 82, 0.03)',
    }}>
        <h2 style={{
            margin: '0 0 14px',
            font: `700 13.5px/1.2 ${tokens.fontFamily.display}`,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: tokens.colors.deepPlum,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
        }}>
            <span>{title}</span>
            {tier && (
                <span style={{
                    font: `700 10px ${tokens.fontFamily.display}`,
                    letterSpacing: '0.08em',
                    background: tokens.colors.sunshine,
                    color: tokens.colors.charcoal,
                    padding: '2px 7px',
                    borderRadius: 999,
                }}>{tier}</span>
            )}
            {meta && <span style={{
                marginLeft: 'auto',
                textTransform: 'none',
                letterSpacing: 0,
                font: `500 11.5px ${tokens.fontFamily.body}`,
                color: '#6B6F84',
            }}>{meta}</span>}
        </h2>
        {children}
    </section>
);

// ── Auth gate ──────────────────────────────────────────────────────
const SignInGate: React.FC = () => {
    const { signIn, configured } = useAuth();
    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #BEEBFF 0%, #DEF5FF 35%, #FFF6E5 75%, #FFFAEB 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            fontFamily: tokens.fontFamily.body,
        }}>
            <div style={{
                maxWidth: 460,
                background: '#FFFFFF',
                border: '3px solid rgba(108, 63, 164, 0.18)',
                borderRadius: 32,
                padding: '40px 32px',
                textAlign: 'center',
                boxShadow: '0 24px 60px rgba(108, 63, 164, 0.18)',
            }}>
                <h1 style={{
                    margin: 0,
                    font: `700 24px ${tokens.fontFamily.display}`,
                    color: tokens.colors.deepPlum,
                }}>Insights — admin only</h1>
                <p style={{
                    margin: '12px 0 24px',
                    fontSize: '0.95rem',
                    color: tokens.colors.charcoal,
                    opacity: 0.8,
                }}>
                    Sign in with Google to view live analytics for drawintheair.com.
                </p>
                {configured ? (
                    <KidButton
                        variant="primary"
                        size="md"
                        onClick={() => signIn('/admin/insights')}
                    >
                        Sign in with Google
                    </KidButton>
                ) : (
                    <p style={{ color: '#C13A3A', fontSize: '0.9rem' }}>
                        Supabase auth isn't configured for this build.
                    </p>
                )}
            </div>
        </div>
    );
};

const NotAllowed: React.FC<{ email: string; onSignOut: () => void }> = ({ email, onSignOut }) => (
    <div style={{
        minHeight: '100vh',
        background: '#F7F5FB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: tokens.fontFamily.body,
    }}>
        <div style={{
            maxWidth: 460,
            background: '#FFFFFF',
            border: '1px solid rgba(63, 64, 82, 0.10)',
            borderRadius: 16,
            padding: '32px',
            textAlign: 'center',
        }}>
            <h1 style={{ margin: 0, font: `700 22px ${tokens.fontFamily.display}`, color: '#C13A3A' }}>
                Access denied
            </h1>
            <p style={{ margin: '12px 0 20px', color: tokens.colors.charcoal }}>
                <code style={{
                    background: 'rgba(108, 63, 164, 0.08)',
                    padding: '2px 8px',
                    borderRadius: 4,
                }}>{email}</code> is not on the admin allow-list for this dashboard.
            </p>
            <KidButton variant="secondary" size="md" onClick={onSignOut}>Sign out</KidButton>
        </div>
    </div>
);

// ── Funnel row ──────────────────────────────────────────────────────
const FunnelRow: React.FC<{
    step: FunnelStep;
    top: number;
    isDropoff: boolean;
}> = ({ step, top, isDropoff }) => {
    const w = (step.sessions / Math.max(1, top)) * 100;
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '180px 1fr 60px 60px',
            gap: 8,
            alignItems: 'center',
            padding: '5px 0',
            fontSize: 13,
        }}>
            <div>
                <div style={{ color: tokens.colors.charcoal }}>{step.step_name.replace(/_/g, ' ')}</div>
                <code style={{ font: `500 12px ui-monospace, monospace`, color: '#6B6F84' }}>{step.step_name}</code>
            </div>
            <div style={{ height: 14, borderRadius: 7, background: 'rgba(108, 63, 164, 0.10)', overflow: 'hidden' }}>
                <div style={{
                    height: '100%',
                    width: `${w.toFixed(1)}%`,
                    background: isDropoff
                        ? 'linear-gradient(90deg, #FF6B6B 0%, #d97777 100%)'
                        : 'linear-gradient(90deg, #6C3FA4 0%, #8d5fbf 100%)',
                    borderRadius: 7,
                    minWidth: 2,
                    transition: 'width 0.4s ease',
                }} />
            </div>
            <div style={{ font: `600 13px ui-monospace, monospace`, textAlign: 'right' }}>
                {fmtNum(step.sessions)}
            </div>
            <div style={{ font: `600 12px ui-monospace, monospace`, color: '#6B6F84', textAlign: 'right' }}>
                {step.pct_of_top}%
            </div>
        </div>
    );
};

// ── Dashboard body ─────────────────────────────────────────────────
const DashboardBody: React.FC<{ onSignOut: () => void; userEmail: string }> = ({ onSignOut, userEmail }) => {
    const [days, setDays] = useState<number>(() => {
        const v = localStorage.getItem('dita_insights_days');
        return v ? parseInt(v, 10) : 7;
    });
    const [error, setError] = useState<string | null>(null);
    const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);

    const [today, setToday] = useState<TodayData | null>(null);
    const [funnel, setFunnel] = useState<FunnelData | null>(null);
    const [tracker, setTracker] = useState<TrackerData | null>(null);
    const [modes, setModes] = useState<ModesData | null>(null);
    const [errors, setErrors] = useState<ErrorsData | null>(null);
    const [cohort, setCohort] = useState<CohortData | null>(null);
    const [mastery, setMastery] = useState<MasteryData | null>(null);
    const [curriculum, setCurriculum] = useState<CurriculumData | null>(null);
    const [milestones, setMilestones] = useState<MilestonesData | null>(null);
    const [classrooms, setClassrooms] = useState<ClassroomsData | null>(null);
    const [sessions, setSessions] = useState<SessionsData | null>(null);

    const loadAll = useCallback(async () => {
        setError(null);
        try {
            const [t, f, tr, m, e, c, ma, cu, mi, cl, se] = await Promise.all([
                callRpc<TodayData>('dashboard_today'),
                callRpc<FunnelData>('dashboard_funnel', { in_days: days }),
                callRpc<TrackerData>('dashboard_tracker_health', { in_days: days }),
                callRpc<ModesData>('dashboard_top_modes', { in_days: days }),
                callRpc<ErrorsData>('dashboard_errors', { row_limit: 30 }),
                callRpc<CohortData>('dashboard_cohort_retention', { in_weeks: 8 }),
                callRpc<MasteryData>('dashboard_mastery', { in_days: 30, in_min_attempts: 5 }),
                callRpc<CurriculumData>('dashboard_curriculum_coverage', { in_days: 30 }),
                callRpc<MilestonesData>('dashboard_mastery_milestones', { in_days: 60, in_min_attempts: 5, in_threshold_pct: 80 }),
                callRpc<ClassroomsData>('dashboard_classrooms', { in_days: 30 }),
                callRpc<SessionsData>('dashboard_latest_sessions', { row_limit: 25 }),
            ]);
            setToday(t); setFunnel(f); setTracker(tr); setModes(m); setErrors(e);
            setCohort(c); setMastery(ma); setCurriculum(cu); setMilestones(mi);
            setClassrooms(cl); setSessions(se);
            setLastLoadedAt(new Date());
        } catch (err) {
            setError((err as Error).message);
        }
    }, [days]);

    useEffect(() => { loadAll(); }, [loadAll]);

    const setRange = (d: number) => {
        setDays(d);
        localStorage.setItem('dita_insights_days', String(d));
    };

    const freshness = useMemo(() => {
        if (!lastLoadedAt) return 'loading…';
        const m = Math.floor((Date.now() - lastLoadedAt.getTime()) / 60000);
        return m === 0 ? `refreshed just now` : `refreshed ${m}m ago`;
    }, [lastLoadedAt]);

    return (
        <div style={{
            minHeight: '100vh',
            background: '#F7F5FB',
            color: tokens.colors.charcoal,
            fontFamily: tokens.fontFamily.body,
            paddingBottom: 56,
        }}>
            <SEOMeta
                title="Insights — Draw in the Air admin"
                description="Internal analytics dashboard."
                noIndex
            />
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 22px' }}>
                {/* Header */}
                <header style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    marginBottom: 18,
                    flexWrap: 'wrap',
                }}>
                    <div>
                        <h1 style={{
                            margin: 0,
                            font: `700 22px/1.1 ${tokens.fontFamily.display}`,
                            color: tokens.colors.deepPlum,
                            letterSpacing: '-0.01em',
                        }}>Draw in the Air — Insights</h1>
                        <p style={{ margin: '2px 0 0', color: '#6B6F84', fontSize: 12.5 }}>
                            Live read of <code>analytics_events</code> + <code>learning_attempts</code> · {freshness} · <span style={{ color: tokens.colors.deepPlum }}>{userEmail}</span>
                            {' · '}
                            <button
                                type="button"
                                onClick={onSignOut}
                                style={{
                                    background: 'none', border: 'none', padding: 0,
                                    color: tokens.colors.deepPlum, cursor: 'pointer',
                                    textDecoration: 'underline', font: 'inherit', fontSize: 12.5,
                                }}
                            >sign out</button>
                        </p>
                    </div>
                    <div style={{
                        display: 'inline-flex',
                        background: '#FFFFFF',
                        border: '1px solid rgba(63, 64, 82, 0.10)',
                        borderRadius: 999,
                        padding: 3,
                        boxShadow: '0 1px 2px rgba(63, 64, 82, 0.04)',
                    }}>
                        {[1, 7, 30].map((d) => (
                            <button
                                key={d}
                                type="button"
                                onClick={() => setRange(d)}
                                style={{
                                    appearance: 'none',
                                    border: 0,
                                    background: days === d ? tokens.colors.deepPlum : 'transparent',
                                    color: days === d ? '#FFFFFF' : '#6B6F84',
                                    padding: '6px 14px',
                                    borderRadius: 999,
                                    font: `600 12.5px ${tokens.fontFamily.body}`,
                                    cursor: 'pointer',
                                    boxShadow: days === d ? '0 2px 6px rgba(108, 63, 164, 0.25)' : 'none',
                                }}
                            >
                                {d === 1 ? '24h' : `${d}d`}
                            </button>
                        ))}
                    </div>
                </header>

                {error && (
                    <div style={{
                        background: 'rgba(255, 107, 107, 0.10)',
                        border: '1px solid rgba(255, 107, 107, 0.4)',
                        color: '#C13A3A',
                        padding: '10px 12px',
                        borderRadius: 8,
                        fontSize: 13,
                        marginBottom: 12,
                    }}>{error}</div>
                )}

                <div style={{
                    display: 'grid',
                    gap: 14,
                    gridTemplateColumns: 'repeat(12, 1fr)',
                }}>
                    {/* Today KPIs */}
                    <Panel title="Today" meta="UTC midnight to now" span={12}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: 12,
                        }}>
                            <Kpi label="Sessions started" value={fmtNum(today?.sessions_started)} sub={`${fmtNum(today?.total_events)} total events`} />
                            <Kpi label="Sessions completing a mode" value={fmtNum(today?.sessions_completed)} sub={`${fmtNum(today?.mode_completions)} mode completions`} />
                            <Kpi label="Completion rate" value={today?.completion_rate_pct == null ? '—' : `${today.completion_rate_pct}%`} sub={`${fmtNum(today?.mode_starts)} mode starts`} />
                            <Kpi label="Median session" value={fmtDuration(today?.median_session_seconds ?? null)} sub="excludes single-event sessions" />
                        </div>
                    </Panel>

                    {/* Funnel */}
                    <Panel title="Activation funnel" meta={funnel ? `last ${funnel.days} day${funnel.days === 1 ? '' : 's'}` : ''} span={7}>
                        {!funnel ? <Empty>Loading…</Empty> : funnel.steps.length === 0 ? (
                            <Empty>No funnel data in window.</Empty>
                        ) : (
                            <div>{funnel.steps.map((s, i) => {
                                const top = Math.max(1, ...funnel.steps.map((x) => x.sessions));
                                const prev = i > 0 ? funnel.steps[i - 1].sessions : null;
                                const dropoff = prev !== null && s.sessions < prev;
                                return <FunnelRow key={s.step_order} step={s} top={top} isDropoff={dropoff} />;
                            })}</div>
                        )}
                    </Panel>

                    {/* Tracker health */}
                    <Panel title="Tracker health" meta={tracker ? `last ${tracker.days} day${tracker.days === 1 ? '' : 's'}` : ''} span={5}>
                        {!tracker ? <Empty>Loading…</Empty> : (
                            <div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <TrackerCell label="GPU success" value={fmtNum(tracker.gpu_success)} sub={`median ${tracker.median_init_ms_gpu == null ? '—' : `${tracker.median_init_ms_gpu}ms`}`} tone="ok" />
                                    <TrackerCell label="CPU fallback" value={fmtNum(tracker.cpu_success)} sub={`median ${tracker.median_init_ms_cpu == null ? '—' : `${tracker.median_init_ms_cpu}ms`}`} />
                                    <TrackerCell label="Init failures" value={fmtNum(tracker.failed)} sub="tracker_init_failed" tone={tracker.failed > 0 ? 'bad' : undefined} />
                                    <TrackerCell label="GPU share" value={(() => {
                                        const t = tracker.gpu_success + tracker.cpu_success;
                                        return t === 0 ? '—' : `${Math.round((tracker.gpu_success / t) * 100)}%`;
                                    })()} sub="of successful inits" />
                                </div>
                                {tracker.failures_by_code.length > 0 && (
                                    <div style={{ marginTop: 12, fontSize: 13 }}>
                                        Failure codes:{' '}
                                        {tracker.failures_by_code.map((f, idx) => (
                                            <span key={idx} style={{
                                                display: 'inline-block',
                                                background: 'rgba(255, 107, 107, 0.12)',
                                                color: '#C13A3A',
                                                border: '1px solid rgba(255, 107, 107, 0.3)',
                                                borderRadius: 999,
                                                padding: '3px 9px',
                                                marginRight: 4,
                                                font: '600 12px ui-monospace, monospace',
                                            }}>{f.code || 'unknown'} · {fmtNum(f.count)}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </Panel>

                    {/* Top modes */}
                    <Panel title="Most-played modes" meta={modes ? `last ${modes.days} day${modes.days === 1 ? '' : 's'}` : ''} span={7}>
                        {!modes ? <Empty>Loading…</Empty> : modes.modes.length === 0 ? <Empty>No mode plays in window.</Empty> : (
                            <Table
                                head={['Mode', 'Started', 'Completed', 'Distinct kids', 'Completion %']}
                                rows={modes.modes.map((m) => [
                                    <code style={{ background: 'rgba(108,63,164,0.10)', padding: '1px 6px', borderRadius: 4 }}>{m.game_mode}</code>,
                                    { v: fmtNum(m.started), num: true },
                                    { v: fmtNum(m.completed), num: true },
                                    { v: fmtNum(m.distinct_starters), num: true },
                                    { v: `${m.completion_rate_pct}%`, num: true },
                                ])}
                            />
                        )}
                    </Panel>

                    {/* Errors */}
                    <Panel title="Error stream" meta="most recent 30" span={5}>
                        {!errors ? <Empty>Loading…</Empty> : errors.errors.length === 0 ? <Empty>No errors. Quiet skies.</Empty> : (
                            <div style={{ maxHeight: 360, overflowY: 'auto', margin: '-4px -6px' }}>
                                {errors.errors.map((e, idx) => {
                                    const m = e.meta || {};
                                    let line = '';
                                    if (e.event_name === 'csp_violation') {
                                        line = `${m.violated_directive || '?'} blocked ${truncate(String(m.blocked_uri ?? ''), 80)}`;
                                    } else if (e.event_name === 'tracker_init_failed') {
                                        line = `${m.code || '?'} · ${m.stage || '?'} · ${truncate(String(m.message ?? ''), 80)}`;
                                    } else if (e.event_name === 'camera_denied') {
                                        line = `${m.code || m.name || '?'}`;
                                    } else if (e.event_name === 'system_error') {
                                        line = truncate(String(m.message || m.error || JSON.stringify(m)), 120);
                                    }
                                    const tone = e.event_name === 'csp_violation' ? 'warn' : 'bad';
                                    return (
                                        <div key={idx} style={{
                                            padding: '9px 10px',
                                            borderBottom: idx < errors.errors.length - 1 ? '1px dashed rgba(63, 64, 82, 0.10)' : 'none',
                                            fontSize: 12.5,
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: 8,
                                                marginBottom: 4,
                                            }}>
                                                <span style={{
                                                    font: '600 10.5px ' + tokens.fontFamily.body,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.04em',
                                                    padding: '2px 8px',
                                                    borderRadius: 999,
                                                    background: tone === 'warn' ? '#FFF6E5' : '#FFE7E7',
                                                    color: tone === 'warn' ? '#C77800' : '#C13A3A',
                                                    border: tone === 'warn' ? '1px solid rgba(199, 120, 0, 0.3)' : '1px solid rgba(193, 58, 58, 0.3)',
                                                }}>{e.event_name.replace(/_/g, ' ')}</span>
                                                <span style={{ font: '500 11.5px ui-monospace, monospace', color: '#6B6F84' }} title={fmtTime(e.occurred_at)}>
                                                    {fmtRelative(e.occurred_at)}
                                                </span>
                                            </div>
                                            <div style={{
                                                font: '500 12px ui-monospace, monospace',
                                                color: '#6B6F84',
                                                wordBreak: 'break-all',
                                            }}>{line}</div>
                                            <div style={{ fontSize: 11.5, color: '#6B6F84', marginTop: 2 }}>
                                                {e.browser || '?'} · {e.device_type || '?'} · {e.page || '/'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Panel>

                    {/* Cohort retention */}
                    <Panel title="Cohort retention" tier="Tier C" meta="D1 / D3 / D7 by week of first visit" span={12}>
                        {!cohort ? <Empty>Loading…</Empty> : cohort.cohorts.length === 0 ? (
                            <EmptyHint hint={<><code>device_id</code> is now wired on every event — first useful read in ~7 days.</>}>No cohorts in window.</EmptyHint>
                        ) : (
                            <Table
                                head={['Week of first visit', 'New devices', 'D1 return', 'D3 return', 'D7 return']}
                                rows={cohort.cohorts.map((c) => [
                                    new Date(c.cohort_week).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                                    { v: fmtNum(c.new_devices), num: true },
                                    { v: <><b>{c.d1_pct}%</b> <span style={{ color: '#6B6F84' }}>({c.d1_returns})</span></>, num: true },
                                    { v: <><b>{c.d3_pct}%</b> <span style={{ color: '#6B6F84' }}>({c.d3_returns})</span></>, num: true },
                                    { v: <><b>{c.d7_pct}%</b> <span style={{ color: '#6B6F84' }}>({c.d7_returns})</span></>, num: true },
                                ])}
                            />
                        )}
                    </Panel>

                    {/* Mastery */}
                    <Panel title="Per-item mastery" tier="Tier C" meta={mastery ? `last ${mastery.days} days · ≥${mastery.min_attempts} attempts` : ''} span={7}>
                        {!mastery ? <Empty>Loading…</Empty> : mastery.items.length === 0 ? (
                            <EmptyHint hint={<>Populates from <code>learning_attempts</code> — one row per item drop.</>}>No mastery data yet.</EmptyHint>
                        ) : (
                            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                                <Table
                                    head={['Item', 'Mode', 'Accuracy', 'Attempts', 'Kids', 'Avg ms']}
                                    rows={mastery.items.map((i) => [
                                        <code style={{ background: 'rgba(108,63,164,0.10)', padding: '1px 6px', borderRadius: 4 }}>{i.item_key}</code>,
                                        <Tag tone="aqua">{i.game_mode}</Tag>,
                                        <AccuracyBar pct={i.accuracy_pct} />,
                                        { v: fmtNum(i.attempts), num: true },
                                        { v: fmtNum(i.distinct_devices), num: true },
                                        { v: i.avg_ms == null ? '—' : fmtNum(i.avg_ms), num: true },
                                    ])}
                                />
                            </div>
                        )}
                    </Panel>

                    {/* Curriculum coverage */}
                    <Panel title="Curriculum coverage" tier="Tier C" meta={curriculum ? `last ${curriculum.days} days` : ''} span={5}>
                        {!curriculum ? <Empty>Loading…</Empty> : curriculum.modes.length === 0 ? (
                            <EmptyHint hint="Average distinct items practised per kid per mode.">No coverage data yet.</EmptyHint>
                        ) : (
                            <Table
                                head={['Mode', 'Kids', 'Avg items', 'Avg attempts']}
                                rows={curriculum.modes.map((m) => [
                                    <code style={{ background: 'rgba(108,63,164,0.10)', padding: '1px 6px', borderRadius: 4 }}>{m.game_mode}</code>,
                                    { v: fmtNum(m.devices), num: true },
                                    { v: m.avg_distinct_items, num: true },
                                    { v: m.avg_attempts, num: true },
                                ])}
                            />
                        )}
                    </Panel>

                    {/* Mastery milestones */}
                    <Panel title="Mastery milestones" tier="Gap 6" meta={milestones ? `last ${milestones.days} days · last ${milestones.min_attempts} attempts ≥ ${milestones.threshold_pct}% correct` : ''} span={12}>
                        {!milestones ? <Empty>Loading…</Empty> : milestones.items.length === 0 ? (
                            <EmptyHint hint={<>A kid masters an item when their last {milestones?.min_attempts ?? 5} attempts are ≥{milestones?.threshold_pct ?? 80}% correct.</>}>No milestone data yet.</EmptyHint>
                        ) : (
                            <Table
                                head={['Item', 'Mode', 'Mastered', 'Touched', 'Mastery', 'Avg recent acc']}
                                rows={milestones.items.map((i) => [
                                    <code style={{ background: 'rgba(108,63,164,0.10)', padding: '1px 6px', borderRadius: 4 }}>{i.item_key}</code>,
                                    <Tag tone="aqua">{i.game_mode}</Tag>,
                                    { v: fmtNum(i.mastered_devices), num: true },
                                    { v: fmtNum(i.touched_devices), num: true },
                                    <AccuracyBar pct={i.mastery_pct} />,
                                    { v: `${i.avg_recent_accuracy}%`, num: true },
                                ])}
                            />
                        )}
                    </Panel>

                    {/* Classrooms */}
                    <Panel title="Classrooms" tier="Tier D" meta="last 30 days · pilot schools only" span={12}>
                        {!classrooms ? <Empty>Loading…</Empty> : classrooms.schools.length === 0 ? (
                            <EmptyHint hint={<>Pilot sessions arrive via <code>?admin=1</code> on TryFreeModal.</>}>No pilot-school sessions yet.</EmptyHint>
                        ) : (
                            <Table
                                head={['School', 'Sessions', 'Distinct devices', 'Mode completions', 'Active days', 'Last active']}
                                rows={classrooms.schools.map((s) => [
                                    <code style={{ background: 'rgba(108,63,164,0.10)', padding: '1px 6px', borderRadius: 4 }}>{s.school_id}</code>,
                                    { v: fmtNum(s.sessions), num: true },
                                    { v: fmtNum(s.devices), num: true },
                                    { v: fmtNum(s.mode_completions), num: true },
                                    { v: fmtNum(s.active_days), num: true },
                                    new Date(s.last_active_day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                                ])}
                            />
                        )}
                    </Panel>

                    {/* Latest sessions */}
                    <Panel title="Latest sessions" meta="most recent 25" span={12}>
                        {!sessions ? <Empty>Loading…</Empty> : sessions.sessions.length === 0 ? <Empty>No sessions yet.</Empty> : (
                            <Table
                                head={['Started', 'Age', 'Browser / device', 'Events', 'Duration', 'Outcome', 'Two hands', 'Modes', 'Device', 'Session']}
                                rows={sessions.sessions.map((s) => [
                                    <div>{fmtTime(s.started_at)}<div style={{ fontSize: 11, color: '#6B6F84' }}>{fmtRelative(s.last_at)}</div></div>,
                                    s.age_band || '—',
                                    <div>{s.browser || '?'}<div style={{ fontSize: 11, color: '#6B6F84' }}>{s.device_type || '?'}</div></div>,
                                    { v: fmtNum(s.event_count), num: true },
                                    { v: fmtDuration(s.duration_seconds), num: true },
                                    s.tracker_failed ? <Tag tone="coral">tracker fail</Tag>
                                        : s.reached_completion ? <Tag tone="green">completed</Tag>
                                        : s.reached_wave ? <Tag>wave passed</Tag>
                                        : <Tag tone="gray">drop-off</Tag>,
                                    s.two_hands_seen ? <Tag tone="aqua">parent in frame</Tag> : <span style={{ color: '#6B6F84' }}>—</span>,
                                    s.modes_played
                                        ? s.modes_played.map((m, i) => <code key={i} style={{ background: 'rgba(108,63,164,0.10)', padding: '1px 5px', borderRadius: 3, fontSize: 11, marginRight: 3 }}>{m}</code>)
                                        : <span style={{ color: '#6B6F84' }}>—</span>,
                                    <span style={{ font: '500 11.5px ui-monospace, monospace', color: '#6B6F84' }}>{s.device_id ? s.device_id.slice(0, 8) : '—'}</span>,
                                    <span style={{ font: '500 11.5px ui-monospace, monospace', color: '#6B6F84' }}>{s.session_id.slice(0, 8)}</span>,
                                ])}
                            />
                        )}
                    </Panel>
                </div>
            </div>
        </div>
    );
};

// ── Small helper components ─────────────────────────────────────────
const Kpi: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
    <div style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #FBFCFF 100%)',
        border: '1px solid rgba(63, 64, 82, 0.10)',
        borderRadius: 12,
        padding: 14,
    }}>
        <div style={{ font: `600 11.5px ${tokens.fontFamily.body}`, color: '#6B6F84', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ marginTop: 6, font: `700 28px/1 ${tokens.fontFamily.display}`, color: tokens.colors.charcoal }}>{value}</div>
        {sub && <div style={{ marginTop: 4, fontSize: 12, color: '#6B6F84' }}>{sub}</div>}
    </div>
);

const TrackerCell: React.FC<{ label: string; value: string; sub: string; tone?: 'ok' | 'bad' }> = ({ label, value, sub, tone }) => (
    <div style={{
        border: '1px solid rgba(63, 64, 82, 0.10)',
        borderRadius: 10,
        padding: 12,
        background: '#FBFCFF',
    }}>
        <div style={{ fontSize: 11.5, color: '#6B6F84', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ marginTop: 4, font: `700 22px ${tokens.fontFamily.display}`, color: tone === 'ok' ? '#2E9E5F' : tone === 'bad' ? '#C13A3A' : tokens.colors.charcoal }}>{value}</div>
        <div style={{ marginTop: 2, fontSize: 12, color: '#6B6F84' }}>{sub}</div>
    </div>
);

const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ color: '#6B6F84', fontStyle: 'italic', padding: '12px 0' }}>{children}</div>
);

const EmptyHint: React.FC<{ hint: React.ReactNode; children: React.ReactNode }> = ({ hint, children }) => (
    <div style={{ padding: '12px 0', color: '#6B6F84', fontSize: 12.5 }}>
        {children}
        <div style={{ fontSize: 11.5, marginTop: 4, opacity: 0.85 }}>{hint}</div>
    </div>
);

const AccuracyBar: React.FC<{ pct: number }> = ({ pct }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{
            display: 'inline-block',
            width: 80,
            height: 8,
            borderRadius: 4,
            background: 'rgba(108, 63, 164, 0.10)',
            position: 'relative',
            verticalAlign: 'middle',
        }}>
            <span style={{
                display: 'block',
                height: '100%',
                width: `${pct}%`,
                borderRadius: 4,
                background: 'linear-gradient(90deg, #FF6B6B 0%, #FFD84D 50%, #7ED957 100%)',
            }} />
        </span>
        <span style={{ font: '600 13px ui-monospace, monospace' }}>{pct}%</span>
    </span>
);

type Cell = React.ReactNode | { v: React.ReactNode; num?: boolean };
const Table: React.FC<{ head: React.ReactNode[]; rows: Cell[][] }> = ({ head, rows }) => (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
            <tr>{head.map((h, i) => (
                <th key={i} style={{
                    textAlign: 'left',
                    padding: '7px 8px',
                    borderBottom: '1px solid rgba(63, 64, 82, 0.10)',
                    font: `600 11.5px ${tokens.fontFamily.body}`,
                    color: '#6B6F84',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                }}>{h}</th>
            ))}</tr>
        </thead>
        <tbody>
            {rows.map((row, i) => (
                <tr key={i}>{row.map((c, j) => {
                    const isObj = c !== null && typeof c === 'object' && 'v' in (c as object);
                    const v = isObj ? (c as { v: React.ReactNode }).v : c;
                    const num = isObj ? (c as { num?: boolean }).num : false;
                    return (
                        <td key={j} style={{
                            padding: '7px 8px',
                            borderBottom: i < rows.length - 1 ? '1px solid rgba(63, 64, 82, 0.10)' : 'none',
                            textAlign: num ? 'right' : 'left',
                            fontVariantNumeric: num ? 'tabular-nums' : undefined,
                        }}>{v as React.ReactNode}</td>
                    );
                })}</tr>
            ))}
        </tbody>
    </table>
);

// ── Top-level component ────────────────────────────────────────────
const InsightsDashboard: React.FC = () => {
    const { user, loading, signOut } = useAuth();

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontFamily: tokens.fontFamily.body, color: '#6B6F84',
            }}>
                Loading…
            </div>
        );
    }

    if (!user) return <SignInGate />;
    if (!ALLOWED_ADMINS.has(user.email)) {
        return <NotAllowed email={user.email} onSignOut={signOut} />;
    }
    return <DashboardBody userEmail={user.email} onSignOut={signOut} />;
};

export default InsightsDashboard;
