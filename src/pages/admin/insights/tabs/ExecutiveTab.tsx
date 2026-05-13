/**
 * Executive tab — the one screen you show an investor.
 *
 * Top: six north-star KPIs with deltas vs the previous period and a
 * 14-day sparkline. Below: activation funnel, A/B test results card,
 * device-mix snapshot, and an error count badge. One screen.
 */

import React from 'react';
import {
    Card, Kpi, Skeleton, Empty,
    FunnelChart,
} from '../components';
import { fmtDuration, fmtNum, fmtPct, days as rangeDays, useRpc, downloadCsv } from '../helpers';
import { fetchExecutive, fetchAb, fetchFunnel, fetchTracker, fetchErrors } from '../rpc';
import type { FilterState } from '../types';

export const ExecutiveTab: React.FC<{ filter: FilterState }> = ({ filter }) => {
    const d = rangeDays(filter.range);
    const exec = useRpc(() => fetchExecutive(d), [d]);
    const ab = useRpc(() => fetchAb('camera_explainer_v1'), []);
    const funnel = useRpc(() => fetchFunnel(d), [d]);
    const tracker = useRpc(() => fetchTracker(d), [d]);
    const errors = useRpc(() => fetchErrors(30), []);

    if (exec.loading && !exec.data) return <div className="iv-col-12"><Skeleton count={4} /></div>;
    if (exec.error) return <Empty message={`Failed to load executive summary: ${exec.error}`} />;
    if (!exec.data) return null;

    const c = exec.data.current;
    const dlt = exec.data.deltas;
    const spark = exec.data.sparkline_sessions_14d;

    // Pre-compute KPI values
    const grantRate = dlt.cam_grant_rate_curr_pct;
    const grantPrev = dlt.cam_grant_rate_prev_pct;
    const grantDelta = grantRate != null && grantPrev != null ? +(grantRate - grantPrev).toFixed(1) : null;

    const completion = dlt.completion_rate_curr_pct;
    const completionPrev = dlt.completion_rate_prev_pct;
    const completionDelta = completion != null && completionPrev != null
        ? +(completion - completionPrev).toFixed(1) : null;

    const errorCount = errors.data?.errors.length ?? 0;

    return (
        <>
            {/* KPI strip — 6 cards, snap-scroll on mobile */}
            <div className="iv-col-12 iv-kpi-grid">
                <Kpi
                    label="Sessions started"
                    value={fmtNum(c.sessions_started)}
                    delta={dlt.sessions_started_pct}
                    spark={spark}
                />
                <Kpi
                    label="Distinct devices"
                    value={fmtNum(c.distinct_devices)}
                    delta={dlt.distinct_devices_pct}
                    sparkColor="#55DDE0"
                />
                <Kpi
                    label="Completion rate"
                    value={fmtPct(completion)}
                    sub={`${fmtNum(c.sessions_completed ?? 0)} of ${fmtNum(c.sessions_started)} sessions`}
                    delta={completionDelta}
                    deltaSuffix="pp"
                />
                <Kpi
                    label="Median session"
                    value={fmtDuration(c.median_session_s)}
                    sub="all sessions, bounces included"
                    delta={dlt.median_session_s_delta_s}
                    deltaSuffix="s"
                />
                <Kpi
                    label="Camera grant rate"
                    value={fmtPct(grantRate)}
                    sub={`${fmtNum(c.cam_granted)} granted · ${fmtNum(c.cam_denied)} denied`}
                    delta={grantDelta}
                    deltaSuffix="pp"
                />
                <Kpi
                    label="Tracker success"
                    value={fmtPct(dlt.tracker_success_curr_pct)}
                    sub={`${fmtNum(c.tracker_ok)} ok · ${fmtNum(c.tracker_fail)} failed`}
                />
                <Kpi
                    label="Mode completions"
                    value={fmtNum(c.mode_completions)}
                    sub="activities finished"
                    delta={dlt.mode_completions_pct}
                />
                <Kpi
                    label="Open errors"
                    value={fmtNum(errorCount)}
                    sub={errorCount > 0 ? 'last 30 events' : 'everything quiet'}
                />
            </div>

            {/* Activation funnel */}
            <div className="iv-row">
                <div className="iv-col-8">
                    <Card
                        title="Activation funnel"
                        meta={`Last ${d} day${d === 1 ? '' : 's'} · % of try-free`}
                        actions={
                            <button className="iv-btn iv-btn-sm"
                                disabled={!funnel.data}
                                onClick={() => funnel.data && downloadCsv(
                                    `funnel-${d}d`,
                                    funnel.data.steps as unknown as Array<Record<string, unknown>>,
                                    ['step_order', 'step_name', 'sessions', 'pct_of_top'],
                                )}>
                                Export
                            </button>
                        }
                    >
                        {funnel.loading && !funnel.data
                            ? <Skeleton count={6} />
                            : funnel.data && funnel.data.steps.length
                                ? <FunnelChart steps={funnel.data.steps.map(s => ({
                                    label: s.step_name, n: s.sessions, pctOfTop: s.pct_of_top,
                                }))} />
                                : <Empty message="No funnel data for this period." />}
                    </Card>
                </div>

                {/* A/B test results */}
                <div className="iv-col-4">
                    <Card title="A/B · Camera explainer" meta={ab.data?.verdict ?? '—'}>
                        {ab.loading && !ab.data
                            ? <Skeleton count={2} />
                            : ab.data && (ab.data.control || ab.data.treatment)
                                ? <AbResultsBody data={ab.data} />
                                : <Empty message="No exposures recorded for camera_explainer_v1 yet." />}
                    </Card>
                </div>
            </div>

            {/* Tracker + errors panel */}
            <div className="iv-row">
                <div className="iv-col-6">
                    <Card
                        title="Tracker health"
                        meta={`Last ${d} day${d === 1 ? '' : 's'}`}
                    >
                        {tracker.loading && !tracker.data ? <Skeleton count={3} /> : tracker.data ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                                <Mini label="GPU success" value={fmtNum(tracker.data.gpu_success)}
                                    sub={tracker.data.median_init_ms_gpu != null ? `median ${tracker.data.median_init_ms_gpu}ms` : undefined}
                                    tone="good" />
                                <Mini label="CPU fallback" value={fmtNum(tracker.data.cpu_success)}
                                    sub={tracker.data.median_init_ms_cpu != null ? `median ${tracker.data.median_init_ms_cpu}ms` : undefined}
                                    tone="aqua" />
                                <Mini label="Init failures" value={fmtNum(tracker.data.failed)}
                                    sub={tracker.data.failures_by_code.map(f => `${f.code} · ${f.count}`).join(', ') || undefined}
                                    tone={tracker.data.failed > 0 ? 'coral' : 'gray'} />
                            </div>
                        ) : <Empty message="No tracker data." />}
                    </Card>
                </div>

                <div className="iv-col-6">
                    <Card
                        title="Recent errors"
                        meta={errorCount > 0 ? `${errorCount} events` : 'all quiet'}
                        actions={
                            <button className="iv-btn iv-btn-sm"
                                disabled={!errors.data}
                                onClick={() => errors.data && downloadCsv(
                                    'errors', errors.data.errors as unknown as Array<Record<string, unknown>>,
                                    ['occurred_at', 'event_name', 'browser', 'device_type', 'page'],
                                )}>
                                Export
                            </button>
                        }
                    >
                        {errors.loading && !errors.data ? <Skeleton count={3} />
                            : errors.data && errors.data.errors.length === 0
                                ? <Empty message={<><strong>All clear.</strong> No errors in the last 30 events.</>} />
                                : errors.data ? <ErrorList errors={errors.data.errors.slice(0, 5)} />
                                    : null}
                    </Card>
                </div>
            </div>
        </>
    );
};

const Mini: React.FC<{
    label: string; value: string; sub?: string;
    tone: 'good' | 'aqua' | 'coral' | 'gray';
}> = ({ label, value, sub, tone }) => {
    const colorMap = { good: '#1f7a3a', aqua: '#1c7e80', coral: '#C13A3A', gray: '#6B6F84' };
    return (
        <div>
            <div className="iv-kpi-label" style={{ marginBottom: 4 }}>{label}</div>
            <div style={{
                font: '700 22px Fredoka, system-ui, sans-serif',
                color: colorMap[tone],
                lineHeight: 1.1,
            }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: '#6B6F84', marginTop: 2 }}>{sub}</div>}
        </div>
    );
};

const AbResultsBody: React.FC<{ data: NonNullable<ReturnType<typeof fetchAb> extends Promise<infer T> ? T : never> }> = ({ data }) => {
    const verdictTone =
        data.verdict === 'treatment winning' ? 'iv-ab-verdict-good'
            : data.verdict === 'control winning' ? 'iv-ab-verdict-bad'
                : 'iv-ab-verdict-flat';
    return (
        <>
            <div className="iv-ab-grid">
                <ArmBox title="Control" arm={data.control} />
                <ArmBox title="Treatment" arm={data.treatment} />
            </div>
            <div className={`iv-ab-verdict ${verdictTone}`}>
                {data.verdict.toUpperCase()}
                {data.lift_pp != null && (
                    <span style={{ marginLeft: 8, opacity: 0.85 }}>
                        · lift {data.lift_pp > 0 ? '+' : ''}{data.lift_pp}pp
                        {data.z_score != null && ` · z=${data.z_score}`}
                    </span>
                )}
            </div>
        </>
    );
};

const ArmBox: React.FC<{ title: string; arm: { grant_rate: number | null; granted: number; requested: number } | null }> = ({ title, arm }) => (
    <div className="iv-ab-arm">
        <div className="iv-ab-arm-title">{title}</div>
        <div className="iv-ab-arm-rate">
            {arm && arm.grant_rate != null ? `${(arm.grant_rate * 100).toFixed(1)}%` : '—'}
        </div>
        <div className="iv-ab-arm-sub">
            {arm ? `${fmtNum(arm.granted)} of ${fmtNum(arm.requested)} granted` : 'no data'}
        </div>
    </div>
);

const ErrorList: React.FC<{ errors: Array<{ occurred_at: string; event_name: string; meta: Record<string, unknown>; page: string | null }> }> = ({ errors }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {errors.map((e, i) => {
            const code = (e.meta?.code as string | undefined) ?? e.event_name;
            const ago = relativeAgo(e.occurred_at);
            return (
                <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', gap: 8,
                    padding: '8px 10px',
                    background: 'rgba(255, 107, 107, 0.08)',
                    borderRadius: 8,
                }}>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ font: '700 12px Nunito', color: '#C13A3A' }}>{code}</div>
                        <div style={{ fontSize: 11, color: '#6B6F84', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.page ?? 'unknown route'}</div>
                    </div>
                    <div style={{ fontSize: 11, color: '#6B6F84', flexShrink: 0 }}>{ago}</div>
                </div>
            );
        })}
    </div>
);

const relativeAgo = (iso: string): string => {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
    if (ms < 3600_000) return `${Math.floor(ms / 60_000)}m ago`;
    if (ms < 86400_000) return `${Math.floor(ms / 3600_000)}h ago`;
    return `${Math.floor(ms / 86400_000)}d ago`;
};

export default ExecutiveTab;
