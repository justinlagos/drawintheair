/**
 * PrintReport — the /admin/insights?report=1 view.
 *
 * Renders a linear, paper-shaped report layout (designed FOR A4, not
 * retrofitted from the dashboard). Calls window.print() on mount so
 * the browser shows the print dialog with the right pages already
 * laid out. Hides the regular dashboard chrome entirely.
 *
 * Each page is its own .iv-report-page with break-after: page so the
 * browser places page breaks where we want them, not where the auto
 * flow would put them.
 */

import React, { useEffect } from 'react';
import { fetchExecutive, fetchFunnel, fetchTracker, fetchEngagementDeep,
    fetchMasterySummary, fetchRetentionDeep, fetchAb, fetchErrors } from './rpc';
import { useRpc, fmtNum, fmtPct, fmtDuration, days as rangeDays } from './helpers';
import type { Range } from './types';

const MODE_LABELS: Record<string, string> = {
    'free': 'Free Paint', 'calibration': 'Bubble Pop',
    'pre-writing': 'Tracing', 'balloon-math': 'Balloon Math',
    'rainbow-bridge': 'Rainbow Bridge', 'word-search': 'Word Search',
    'sort-and-place': 'Sort & Place', 'gesture-spelling': 'Spelling Stars',
    'colour-builder': 'Colour Builder',
};
const modeLabel = (m: string) => MODE_LABELS[m] ?? m;

export const PrintReport: React.FC<{ range: Range; email: string }> = ({ range, email }) => {
    const d = rangeDays(range);
    const exec       = useRpc(() => fetchExecutive(d), [d]);
    const funnel     = useRpc(() => fetchFunnel(d), [d]);
    const tracker    = useRpc(() => fetchTracker(d), [d]);
    const engagement = useRpc(() => fetchEngagementDeep(d), [d]);
    const mastery    = useRpc(() => fetchMasterySummary(Math.max(d, 30)), [d]);
    const retention  = useRpc(() => fetchRetentionDeep(), []);
    const ab         = useRpc(() => fetchAb('camera_explainer_v1'), []);
    const errors     = useRpc(() => fetchErrors(30), []);

    // All data must be loaded before we trigger print, otherwise the
    // dialog opens with empty cards.
    const allLoaded = !!(exec.data && funnel.data && tracker.data && engagement.data
        && mastery.data && retention.data && ab.data && errors.data);

    useEffect(() => {
        if (!allLoaded) return;
        // Small delay so React commits the final paint before print
        // captures the page. Some browsers (Safari, especially) need it.
        const id = setTimeout(() => window.print(), 800);
        return () => clearTimeout(id);
    }, [allLoaded]);

    const generated = new Date().toLocaleString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric',
        year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const periodLabel = d === 1 ? 'Last 24 hours' : `Last ${d} days`;

    return (
        <div className="iv-report">

            {/* ── Page 1: Cover ─────────────────────────────────────────── */}
            <section className="iv-report-page iv-report-cover">
                <img src="/logo.png" alt="Draw in the Air" />
                <h1>Insights Report</h1>
                <h2>Draw in the Air</h2>
                <div className="period">Reporting period</div>
                <div className="stamp">{periodLabel}</div>
                <div className="gen">
                    Generated {generated} for {email}
                </div>
                <div className="iv-report-page-foot">
                    <span>drawintheair.com</span>
                    <span>Confidential · do not redistribute</span>
                </div>
            </section>

            {/* ── Page 2: Executive summary ─────────────────────────────── */}
            <section className="iv-report-page">
                <header className="iv-report-page-head">
                    <img src="/logo.png" alt="" />
                    <h1>Executive summary</h1>
                    <span className="meta">{periodLabel}</span>
                </header>

                <div className="iv-report-section">
                    <h3 className="iv-report-section-title">Headline KPIs</h3>
                    <div className="iv-report-kpi-grid">
                        {exec.data && <>
                            <Kpi label="Sessions started" value={fmtNum(exec.data.current.sessions_started)}
                                delta={exec.data.deltas.sessions_started_pct} />
                            <Kpi label="Distinct devices" value={fmtNum(exec.data.current.distinct_devices)}
                                delta={exec.data.deltas.distinct_devices_pct} />
                            <Kpi label="Median session" value={fmtDuration(exec.data.current.median_session_s)}
                                delta={exec.data.deltas.median_session_s_delta_s}
                                deltaSuffix="s" />
                            <Kpi label="Completion rate" value={fmtPct(exec.data.deltas.completion_rate_curr_pct)}
                                delta={exec.data.deltas.completion_rate_curr_pct != null && exec.data.deltas.completion_rate_prev_pct != null
                                    ? +(exec.data.deltas.completion_rate_curr_pct - exec.data.deltas.completion_rate_prev_pct).toFixed(1)
                                    : null}
                                deltaSuffix="pp" />
                            <Kpi label="Camera grant" value={fmtPct(exec.data.deltas.cam_grant_rate_curr_pct)}
                                delta={exec.data.deltas.cam_grant_rate_curr_pct != null && exec.data.deltas.cam_grant_rate_prev_pct != null
                                    ? +(exec.data.deltas.cam_grant_rate_curr_pct - exec.data.deltas.cam_grant_rate_prev_pct).toFixed(1)
                                    : null}
                                deltaSuffix="pp" />
                            <Kpi label="Tracker success" value={fmtPct(exec.data.deltas.tracker_success_curr_pct)} />
                        </>}
                    </div>
                </div>

                <div className="iv-report-section">
                    <h3 className="iv-report-section-title">Activation funnel</h3>
                    <table className="iv-report-table">
                        <thead>
                            <tr><th>Step</th><th style={{ textAlign: 'right' }}>Sessions</th><th style={{ textAlign: 'right' }}>% of top</th></tr>
                        </thead>
                        <tbody>
                            {funnel.data?.steps.map(s => (
                                <tr key={s.step_name}>
                                    <td>{s.step_name}</td>
                                    <td style={{ textAlign: 'right' }}>{fmtNum(s.sessions)}</td>
                                    <td style={{ textAlign: 'right' }}>{s.pct_of_top.toFixed(0)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="iv-report-section">
                    <h3 className="iv-report-section-title">A/B test — camera explainer</h3>
                    <table className="iv-report-table">
                        <thead>
                            <tr><th>Arm</th><th>Exposed</th><th>Grant rate</th></tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Control</td>
                                <td>{fmtNum(ab.data?.control?.exposed_sessions)}</td>
                                <td>{ab.data?.control?.grant_rate != null ? `${(ab.data.control.grant_rate * 100).toFixed(1)}%` : '—'}</td>
                            </tr>
                            <tr>
                                <td>Treatment</td>
                                <td>{fmtNum(ab.data?.treatment?.exposed_sessions)}</td>
                                <td>{ab.data?.treatment?.grant_rate != null ? `${(ab.data.treatment.grant_rate * 100).toFixed(1)}%` : '—'}</td>
                            </tr>
                        </tbody>
                    </table>
                    {ab.data && (
                        <p style={{ marginTop: 10, fontSize: 12, color: '#6B6F84' }}>
                            <strong style={{ color: '#1A1B2E' }}>Verdict:</strong> {ab.data.verdict}
                            {ab.data.lift_pp != null && ` · lift ${ab.data.lift_pp > 0 ? '+' : ''}${ab.data.lift_pp}pp · z = ${ab.data.z_score}`}
                        </p>
                    )}
                </div>

                <div className="iv-report-page-foot">
                    <span>Insights · Draw in the Air</span>
                    <span>Page 2</span>
                </div>
            </section>

            {/* ── Page 3: Engagement ────────────────────────────────────── */}
            <section className="iv-report-page">
                <header className="iv-report-page-head">
                    <img src="/logo.png" alt="" />
                    <h1>Engagement</h1>
                    <span className="meta">{periodLabel}</span>
                </header>

                <div className="iv-report-section">
                    <h3 className="iv-report-section-title">Per-mode performance</h3>
                    <table className="iv-report-table">
                        <thead>
                            <tr>
                                <th>Mode</th><th style={{ textAlign: 'right' }}>Started</th>
                                <th style={{ textAlign: 'right' }}>Completion</th>
                                <th style={{ textAlign: 'right' }}>Median time</th>
                                <th style={{ textAlign: 'right' }}>Stuck</th>
                            </tr>
                        </thead>
                        <tbody>
                            {engagement.data?.modes.map(m => (
                                <tr key={m.game_mode}>
                                    <td>{modeLabel(m.game_mode)}</td>
                                    <td style={{ textAlign: 'right' }}>{fmtNum(m.started)}</td>
                                    <td style={{ textAlign: 'right' }}>{m.is_open_ended ? 'sandbox' : fmtPct(m.completion_rate_pct)}</td>
                                    <td style={{ textAlign: 'right' }}>{fmtDuration(m.median_seconds)}</td>
                                    <td style={{ textAlign: 'right' }}>{fmtPct(m.stuck_rate_pct)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="iv-report-section">
                    <h3 className="iv-report-section-title">Tracker health</h3>
                    {tracker.data && (
                        <div className="iv-report-kpi-grid">
                            <Kpi label="GPU success" value={fmtNum(tracker.data.gpu_success)}
                                sub={tracker.data.median_init_ms_gpu != null ? `median ${tracker.data.median_init_ms_gpu}ms` : undefined} />
                            <Kpi label="CPU fallback" value={fmtNum(tracker.data.cpu_success)}
                                sub={tracker.data.median_init_ms_cpu != null ? `median ${tracker.data.median_init_ms_cpu}ms` : undefined} />
                            <Kpi label="Init failures" value={fmtNum(tracker.data.failed)}
                                sub={tracker.data.failures_by_code.map(f => `${f.code} · ${f.count}`).join(', ') || 'all healthy'} />
                        </div>
                    )}
                </div>

                <div className="iv-report-page-foot">
                    <span>Insights · Draw in the Air</span>
                    <span>Page 3</span>
                </div>
            </section>

            {/* ── Page 4: Learning ──────────────────────────────────────── */}
            <section className="iv-report-page">
                <header className="iv-report-page-head">
                    <img src="/logo.png" alt="" />
                    <h1>Learning outcomes</h1>
                    <span className="meta">{mastery.data?.days} days</span>
                </header>

                {mastery.data && (
                    <div className="iv-report-section">
                        <h3 className="iv-report-section-title">Mastery summary</h3>
                        <div className="iv-report-kpi-grid">
                            <Kpi label="Items mastered" value={fmtNum(mastery.data.totals.total_strong)}
                                sub="≥5 attempts at ≥80% accuracy" />
                            <Kpi label="Items being practised" value={fmtNum(mastery.data.totals.total_practising)}
                                sub="≥3 attempts at ≥50% accuracy" />
                            <Kpi label="Items being learned" value={fmtNum(mastery.data.totals.total_new)}
                                sub="started but not yet mastered" />
                        </div>
                    </div>
                )}

                <div className="iv-report-section">
                    <h3 className="iv-report-section-title">Top mastered items</h3>
                    <table className="iv-report-table">
                        <thead>
                            <tr><th>Item</th><th>Mode</th><th style={{ textAlign: 'right' }}>Kids strong</th><th style={{ textAlign: 'right' }}>Mean acc.</th></tr>
                        </thead>
                        <tbody>
                            {mastery.data?.top_strong.slice(0, 8).map((m, i) => (
                                <tr key={i}>
                                    <td>{m.item_key}</td>
                                    <td>{modeLabel(m.game_mode)}</td>
                                    <td style={{ textAlign: 'right' }}>{fmtNum(m.strong)} / {fmtNum(m.total_devices)}</td>
                                    <td style={{ textAlign: 'right' }}>{fmtPct(m.mean_acc_pct)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="iv-report-section">
                    <h3 className="iv-report-section-title">Items kids struggle with — needs scaffolding</h3>
                    <table className="iv-report-table">
                        <thead>
                            <tr><th>Item</th><th>Mode</th><th style={{ textAlign: 'right' }}>Kids</th><th style={{ textAlign: 'right' }}>Median acc.</th></tr>
                        </thead>
                        <tbody>
                            {mastery.data?.struggling.slice(0, 8).map((m, i) => (
                                <tr key={i}>
                                    <td>{m.item_key}</td>
                                    <td>{modeLabel(m.game_mode)}</td>
                                    <td style={{ textAlign: 'right' }}>{fmtNum(m.total_devices)}</td>
                                    <td style={{ textAlign: 'right' }}>{fmtPct(m.median_acc_pct)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="iv-report-page-foot">
                    <span>Insights · Draw in the Air</span>
                    <span>Page 4</span>
                </div>
            </section>

            {/* ── Page 5: Retention ─────────────────────────────────────── */}
            <section className="iv-report-page">
                <header className="iv-report-page-head">
                    <img src="/logo.png" alt="" />
                    <h1>Retention</h1>
                    <span className="meta">Last 30 days</span>
                </header>

                {retention.data && (
                    <div className="iv-report-section">
                        <h3 className="iv-report-section-title">Stickiness</h3>
                        <div className="iv-report-kpi-grid">
                            <Kpi label="Daily active" value={fmtNum(retention.data.dau)} />
                            <Kpi label="Weekly active" value={fmtNum(retention.data.wau)} />
                            <Kpi label="Monthly active" value={fmtNum(retention.data.mau)} />
                            <Kpi label="DAU ÷ MAU" value={`${retention.data.stickiness_dau_mau.toFixed(1)}%`}
                                sub={`${(retention.data.stickiness_dau_mau / 100 * 30).toFixed(1)} days of 30`} />
                        </div>
                    </div>
                )}

                <div className="iv-report-section">
                    <h3 className="iv-report-section-title">Cohort retention heatmap</h3>
                    <table className="iv-report-table">
                        <thead>
                            <tr>
                                <th>Cohort week</th>
                                <th style={{ textAlign: 'right' }}>Size</th>
                                {Array.from({ length: 7 }).map((_, i) => (
                                    <th key={i} style={{ textAlign: 'right' }}>W{i}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {retention.data?.cohort_heatmap.map(r => (
                                <tr key={r.cohort_week}>
                                    <td>{new Date(r.cohort_week).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td>
                                    <td style={{ textAlign: 'right' }}>{fmtNum(r.cohort_size)}</td>
                                    {r.cells.map(c => (
                                        <td key={c.w} style={{ textAlign: 'right' }}>
                                            {c.pct == null ? '—' : `${c.pct.toFixed(0)}%`}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="iv-report-section">
                    <h3 className="iv-report-section-title">What brings kids back</h3>
                    <table className="iv-report-table">
                        <thead><tr><th>Mode</th><th style={{ textAlign: 'right' }}>Returning devices</th></tr></thead>
                        <tbody>
                            {retention.data?.returning_hooks.slice(0, 6).map(h => (
                                <tr key={h.game_mode}>
                                    <td>{modeLabel(h.game_mode)}</td>
                                    <td style={{ textAlign: 'right' }}>{fmtNum(h.devices)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="iv-report-page-foot">
                    <span>Insights · Draw in the Air</span>
                    <span>Page 5</span>
                </div>
            </section>

            {/* ── Page 6: Errors + Notes ────────────────────────────────── */}
            <section className="iv-report-page">
                <header className="iv-report-page-head">
                    <img src="/logo.png" alt="" />
                    <h1>Reliability · Notes</h1>
                    <span className="meta">Most recent 30</span>
                </header>

                <div className="iv-report-section">
                    <h3 className="iv-report-section-title">Recent errors</h3>
                    {errors.data?.errors.length === 0 ? (
                        <p style={{ fontSize: 13, color: '#1f7a3a' }}>All clear — no errors in the last 30 events.</p>
                    ) : (
                        <table className="iv-report-table">
                            <thead>
                                <tr><th>When</th><th>Event</th><th>Browser</th><th>Page</th></tr>
                            </thead>
                            <tbody>
                                {errors.data?.errors.slice(0, 15).map((e, i) => (
                                    <tr key={i}>
                                        <td>{new Date(e.occurred_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                        <td>{e.event_name}</td>
                                        <td>{e.browser ?? '—'}</td>
                                        <td>{e.page ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="iv-report-section">
                    <h3 className="iv-report-section-title">Methodology</h3>
                    <p style={{ fontSize: 11.5, color: '#6B6F84', lineHeight: 1.6 }}>
                        Sessions are de-duplicated by a stable browser-side session UUID. Devices are
                        de-duplicated by a per-browser localStorage UUID — no PII is collected. Cohorts
                        are bucketed by ISO week of first observation. "Mastery" is defined as ≥5
                        attempts at an item with ≥80% accuracy; "Practising" is ≥3 attempts at ≥50%.
                        All percentages are calculated server-side via PostgreSQL functions exposed
                        as Supabase RPCs. Camera grant rate counts the first denial per session only
                        (subsequent retries count as a separate <code>camera_retry_failed</code> event).
                    </p>
                </div>

                <div className="iv-report-page-foot">
                    <span>Insights · Draw in the Air · drawintheair.com</span>
                    <span>Page 6</span>
                </div>
            </section>

            {/* No-print: a single button when the dialog is dismissed */}
            <div className="iv-no-print" style={{
                position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
            }}>
                <button className="iv-btn iv-btn-primary" onClick={() => window.print()}>
                    Open print dialog
                </button>
                <button className="iv-btn" style={{ marginLeft: 8 }}
                    onClick={() => window.location.href = '/admin/insights'}>
                    Back to dashboard
                </button>
            </div>
        </div>
    );
};

// ── Local Kpi tile for the print layout ────────────────────────────
const Kpi: React.FC<{
    label: string; value: string; sub?: string;
    delta?: number | null; deltaSuffix?: string;
}> = ({ label, value, sub, delta, deltaSuffix = '%' }) => (
    <div className="iv-report-kpi">
        <div className="iv-report-kpi-label">{label}</div>
        <div className="iv-report-kpi-value">{value}</div>
        {sub && <div className="iv-report-kpi-sub">{sub}</div>}
        {delta != null && (
            <div className="iv-report-kpi-sub" style={{
                color: delta > 0 ? '#1f7a3a' : delta < 0 ? '#C13A3A' : '#6B6F84',
                fontWeight: 700,
            }}>
                {delta > 0 ? '↑' : delta < 0 ? '↓' : '→'} {delta > 0 ? '+' : ''}{delta.toFixed(1)}{deltaSuffix} vs prev
            </div>
        )}
    </div>
);

export default PrintReport;
