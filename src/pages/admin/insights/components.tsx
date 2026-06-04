/**
 * Insights v2, reusable presentational components.
 *
 * Everything visual that is used by more than one tab. All charts are
 * inline SVG (no external chart library) so the bundle stays small.
 */

import React from 'react';
import { CHART_COLORS, deltaTone, fmtDelta, fmtNum, useRpc, days as rangeDays } from './helpers';
import { fetchTrustStrip } from './rpc';
import type { CohortCurve, SparkPoint, TrustStripData, Range } from './types';

// ── Tag ─────────────────────────────────────────────────────────────
export const Tag: React.FC<{
    children: React.ReactNode;
    tone?: 'plum' | 'green' | 'coral' | 'gray' | 'aqua';
}> = ({ children, tone = 'plum' }) => (
    <span className={`iv-tag iv-tag-${tone}`}>{children}</span>
);

// ── Card ────────────────────────────────────────────────────────────
export const Card: React.FC<{
    title: string;
    meta?: string;
    tier?: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}> = ({ title, meta, tier, actions, children, className }) => (
    <section className={`iv-card ${className ?? ''}`}>
        <header className="iv-card-head">
            <h2 className="iv-card-title">{title}</h2>
            {tier && <span className="iv-card-tier">{tier}</span>}
            <span className="iv-card-meta">{meta}</span>
            {actions && <div className="iv-no-print" style={{ marginLeft: 8 }}>{actions}</div>}
        </header>
        {children}
    </section>
);

// ── Empty state ─────────────────────────────────────────────────────
export const Empty: React.FC<{ message: React.ReactNode }> = ({ message }) => (
    <div className="iv-empty">{message}</div>
);

// ── LIOS Trust v1, composition strip ───────────────────────────────
//
// Renders the data-quality denominator under every chart. Three modes:
//
//   • <TrustStrip range="30d" />             , compact bar, one line
//   • <TrustStrip range="30d" variant="full" /> , full panel with
//                                                  per-mode breakdown
//                                                  and top reason list
//   • <TrustStrip range="30d" compact />       , micro inline pill
//                                                  ("96.7% Tier A")
//
// All variants hit the same dashboard_trust_strip RPC and so share a
// single network call when more than one is mounted on the same tab.

const TIER_COLOURS = {
    A: '#7ED957',   // meadow green, full credibility
    B: '#FFB14D',   // warm orange, reduced weight
    C: '#FF6B6B',   // coral, quarantined
} as const;

const REASON_LABELS: Record<string, string> = {
    timing_distraction:      'Slow response (likely distracted)',
    timing_reflex_floor:     'Too fast to be intentional',
    timing_missing:          'Response time not recorded',
    tab_hidden_during_window: 'Tab was hidden during the attempt',
    stuck_recent:            'Stuck immediately before',
    two_hands_session:       'Two hands seen in session',
};
const reasonLabel = (r: string) => REASON_LABELS[r] ?? r;

const TierBar: React.FC<{ data: TrustStripData }> = ({ data }) => {
    const seg = (n: number, total: number) =>
        total > 0 ? `${(100 * n / total).toFixed(1)}%` : '0%';
    return (
        <div className="iv-trust-bar" role="img"
             aria-label={`Trust composition: Tier A ${data.pct_a ?? 0}%, Tier B ${data.pct_b ?? 0}%, Tier C ${data.pct_c ?? 0}%`}>
            <i style={{ width: seg(data.tier_a, data.total), background: TIER_COLOURS.A }} />
            <i style={{ width: seg(data.tier_b, data.total), background: TIER_COLOURS.B }} />
            <i style={{ width: seg(data.tier_c, data.total), background: TIER_COLOURS.C }} />
        </div>
    );
};

const TierLegend: React.FC<{ data: TrustStripData }> = ({ data }) => (
    <div className="iv-trust-legend">
        <span><i style={{ background: TIER_COLOURS.A }} />A · full · {fmtNum(data.tier_a)} ({data.pct_a ?? 0}%)</span>
        <span><i style={{ background: TIER_COLOURS.B }} />B · reduced · {fmtNum(data.tier_b)} ({data.pct_b ?? 0}%)</span>
        <span><i style={{ background: TIER_COLOURS.C }} />C · quarantined · {fmtNum(data.tier_c)} ({data.pct_c ?? 0}%)</span>
    </div>
);

export const TrustStrip: React.FC<{
    range: Range;
    variant?: 'inline' | 'full';
    compact?: boolean;
    title?: string;
}> = ({ range, variant = 'inline', compact = false, title }) => {
    const d = rangeDays(range);
    const strip = useRpc<TrustStripData>(() => fetchTrustStrip(d), [d]);

    if (strip.loading && !strip.data) {
        return <div className="iv-trust-strip iv-trust-loading" aria-live="polite">
            Checking data quality…
        </div>;
    }
    if (strip.error || !strip.data) {
        return <div className="iv-trust-strip iv-trust-error">
            Trust composition unavailable
        </div>;
    }
    const t = strip.data;
    if (t.total === 0) {
        return <div className="iv-trust-strip iv-trust-empty">
            No scored attempts in the last {t.days} days.
        </div>;
    }

    if (compact) {
        return (
            <span className="iv-trust-pill"
                  title={`${fmtNum(t.tier_a)} of ${fmtNum(t.total)} attempts at full credibility (Tier A) in the last ${t.days} days`}>
                <i style={{ background: TIER_COLOURS.A }} />
                {t.pct_a ?? 0}% Tier A · n={fmtNum(t.total)}
            </span>
        );
    }

    return (
        <div className={`iv-trust-strip ${variant === 'full' ? 'iv-trust-full' : ''}`}>
            <div className="iv-trust-head">
                <div className="iv-trust-title">
                    <span className="iv-trust-label">Data quality · LIOS Trust v1</span>
                    {title && <span className="iv-trust-subtitle">{title}</span>}
                </div>
                <div className="iv-trust-summary">
                    <strong>{t.pct_a ?? 0}%</strong> Tier A
                    <span className="iv-trust-divider">·</span>
                    {fmtNum(t.total)} attempts in last {t.days} days
                    <span className="iv-trust-divider">·</span>
                    mean score {t.mean_score.toFixed(2)}
                </div>
            </div>
            <TierBar data={t} />
            <TierLegend data={t} />

            {variant === 'full' && t.by_mode.length > 0 && (
                <details className="iv-trust-details" open>
                    <summary>Per-game-mode composition</summary>
                    <table className="iv-trust-mode-table">
                        <thead>
                            <tr>
                                <th>Game mode</th>
                                <th>Attempts</th>
                                <th>Tier A</th>
                                <th>Tier B</th>
                                <th>Tier C</th>
                                <th>Composition</th>
                            </tr>
                        </thead>
                        <tbody>
                            {t.by_mode.map(m => (
                                <tr key={m.game_mode}
                                    className={(m.pct_a ?? 100) < 85 ? 'iv-trust-flag' : ''}>
                                    <td>{m.game_mode}</td>
                                    <td>{fmtNum(m.total)}</td>
                                    <td>{m.pct_a ?? 0}%</td>
                                    <td>{m.pct_b ?? 0}%</td>
                                    <td>{m.pct_c ?? 0}%</td>
                                    <td>
                                        <div className="iv-trust-bar iv-trust-bar-mini">
                                            <i style={{ width: `${m.pct_a ?? 0}%`, background: TIER_COLOURS.A }} />
                                            <i style={{ width: `${m.pct_b ?? 0}%`, background: TIER_COLOURS.B }} />
                                            <i style={{ width: `${m.pct_c ?? 0}%`, background: TIER_COLOURS.C }} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </details>
            )}

            {variant === 'full' && t.top_reasons.length > 0 && (
                <details className="iv-trust-details">
                    <summary>Why attempts were down-weighted (top reasons)</summary>
                    <ul className="iv-trust-reasons">
                        {t.top_reasons.map(r => (
                            <li key={r.reason}>
                                <span>{reasonLabel(r.reason)}</span>
                                <span className="iv-trust-reason-n">{fmtNum(r.n)} attempts</span>
                            </li>
                        ))}
                    </ul>
                </details>
            )}
        </div>
    );
};

// ── Skeleton ────────────────────────────────────────────────────────
export const Skeleton: React.FC<{ count?: number }> = ({ count = 1 }) => (
    <div style={{ display: 'grid', gap: 10 }}>
        {Array.from({ length: count }).map((_, i) => <div key={i} className="iv-skeleton" />)}
    </div>
);

// ── Sparkline ───────────────────────────────────────────────────────
export const Sparkline: React.FC<{
    points: SparkPoint[];
    width?: number; height?: number;
    color?: string;
}> = ({ points, width = 64, height = 22, color = '#6C3FA4' }) => {
    if (!points || points.length < 2) {
        return <svg className="iv-spark" viewBox={`0 0 ${width} ${height}`} aria-hidden />;
    }
    const xs = points.map((_, i) => i);
    const ys = points.map(p => p.n);
    const maxY = Math.max(...ys, 1);
    const stepX = width / Math.max(1, xs.length - 1);
    const path = points.map((p, i) => {
        const x = i * stepX;
        const y = height - (p.n / maxY) * (height - 2) - 1;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return (
        <svg className="iv-spark" viewBox={`0 0 ${width} ${height}`} aria-hidden>
            <path d={path} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
};

// ── Delta pill ──────────────────────────────────────────────────────
export const Delta: React.FC<{
    value: number | null | undefined;
    goodIfUp?: boolean;
    suffix?: string;
}> = ({ value, goodIfUp = true, suffix = '%' }) => {
    const tone = deltaTone(value, goodIfUp);
    const cls = tone === 'good' ? 'iv-delta-good' : tone === 'bad' ? 'iv-delta-bad' : 'iv-delta-flat';
    const arrow = value == null ? '-' : value > 0 ? '↑' : value < 0 ? '↓' : '→';
    return (
        <span className={`iv-delta ${cls}`}>
            <span aria-hidden>{arrow}</span>
            <span>{fmtDelta(value, suffix)}</span>
        </span>
    );
};

// ── KPI card ────────────────────────────────────────────────────────
export const Kpi: React.FC<{
    label: string;
    value: string;
    sub?: string;
    delta?: number | null;
    deltaSuffix?: string;
    deltaGoodIfUp?: boolean;
    spark?: SparkPoint[];
    sparkColor?: string;
}> = ({ label, value, sub, delta, deltaSuffix = '%', deltaGoodIfUp = true, spark, sparkColor }) => (
    <div className="iv-kpi">
        <div className="iv-kpi-label">{label}</div>
        <div>
            <div className="iv-kpi-value">{value}</div>
            {sub && <div className="iv-kpi-value-sub">{sub}</div>}
        </div>
        <div className="iv-kpi-foot">
            {delta !== undefined
                ? <Delta value={delta} suffix={deltaSuffix} goodIfUp={deltaGoodIfUp} />
                : <span />}
            {spark && spark.length > 1 && <Sparkline points={spark} color={sparkColor} />}
        </div>
    </div>
);

// ── Responsive table wrapper ────────────────────────────────────────
export const TableWrap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="iv-table-wrap">{children}</div>
);

// ── Horizontal funnel chart ─────────────────────────────────────────
export const FunnelChart: React.FC<{
    steps: Array<{ label: string; n: number; pctOfTop?: number }>;
}> = ({ steps }) => {
    if (!steps.length) return <Empty message="No funnel data yet." />;
    const top = Math.max(...steps.map(s => s.n), 1);
    return (
        <div className="iv-funnel">
            {steps.map((s) => {
                const pct = s.pctOfTop ?? (s.n / top) * 100;
                return (
                    <div key={s.label} className="iv-funnel-row">
                        <div className="iv-funnel-label">{s.label}</div>
                        <div className="iv-funnel-bar"><i style={{ width: `${pct}%` }} /></div>
                        <div className="iv-funnel-n">{fmtNum(s.n)}</div>
                        <div className="iv-funnel-pct">{pct.toFixed(0)}%</div>
                    </div>
                );
            })}
        </div>
    );
};

// ── Cohort retention curves ─────────────────────────────────────────
export const CohortCurves: React.FC<{
    cohorts: CohortCurve[];
    height?: number;
}> = ({ cohorts, height = 220 }) => {
    if (!cohorts.length) return <Empty message="Not enough cohort data yet." />;
    const W = 720;
    const H = height;
    const padL = 36, padR = 8, padT = 10, padB = 28;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    const days = 14;
    const stepX = innerW / days;
    const yPct = (pct: number) => padT + innerH - (Math.min(100, pct) / 100) * innerH;

    return (
        <div className="iv-curves-wrap">
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
                 style={{ width: '100%', height: 'auto' }} role="img">
                {/* horizontal grid */}
                {[0, 25, 50, 75, 100].map(p => (
                    <g key={p}>
                        <line x1={padL} x2={W - padR} y1={yPct(p)} y2={yPct(p)}
                              stroke="rgba(63,64,82,0.10)" strokeDasharray="3 3" />
                        <text x={padL - 6} y={yPct(p) + 3} textAnchor="end"
                              fontSize="10" fill="#6B6F84"
                              fontFamily="Nunito, system-ui, sans-serif">{p}%</text>
                    </g>
                ))}
                {/* x labels */}
                {[0, 3, 7, 10, 14].map(d => (
                    <text key={d} x={padL + d * stepX} y={H - 8} textAnchor="middle"
                          fontSize="10" fill="#6B6F84"
                          fontFamily="Nunito, system-ui, sans-serif">D{d}</text>
                ))}
                {/* lines */}
                {cohorts.map((c, i) => {
                    const color = CHART_COLORS[i % CHART_COLORS.length];
                    const path = c.curve.map((pt, j) => {
                        if (pt.pct == null) return '';
                        const x = padL + pt.d * stepX;
                        const y = yPct(pt.pct);
                        return `${j === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
                    }).filter(Boolean).join(' ');
                    return (
                        <g key={c.cohort_week}>
                            <path d={path} fill="none" stroke={color} strokeWidth={2}
                                  strokeLinecap="round" strokeLinejoin="round" />
                            {c.curve.map(pt => pt.pct != null && (
                                <circle key={pt.d} cx={padL + pt.d * stepX} cy={yPct(pt.pct)}
                                        r={2.6} fill={color} />
                            ))}
                        </g>
                    );
                })}
            </svg>
            <div className="iv-curves-legend">
                {cohorts.map((c, i) => (
                    <span key={c.cohort_week}>
                        <i style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        Week of {new Date(c.cohort_week).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        {' · '}{c.size} devices
                    </span>
                ))}
            </div>
        </div>
    );
};

// ── Inline bar ──────────────────────────────────────────────────────
export const InlineBar: React.FC<{ pct: number }> = ({ pct }) => (
    <div className="iv-bar"><i style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} /></div>
);

// ── Stacked strength bar (strong / practising / new) ────────────────
export const StrengthBar: React.FC<{
    strong: number; practising: number; newCount: number;
}> = ({ strong, practising, newCount }) => {
    const total = strong + practising + newCount;
    if (total === 0) return <div className="iv-strength" aria-hidden />;
    const s = (strong / total) * 100;
    const p = (practising / total) * 100;
    const n = (newCount / total) * 100;
    return (
        <div className="iv-strength" role="img"
             aria-label={`${strong} strong, ${practising} practising, ${newCount} new`}>
            {s > 0 && <i className="iv-strength-strong" style={{ width: `${s}%` }} />}
            {p > 0 && <i className="iv-strength-practising" style={{ width: `${p}%` }} />}
            {n > 0 && <i className="iv-strength-new" style={{ width: `${n}%` }} />}
        </div>
    );
};

export const StrengthKey: React.FC = () => (
    <div className="iv-strength-key">
        <span><i style={{ background: 'linear-gradient(90deg, #7ED957, #2EAE52)' }} />Strong (≥5 attempts, ≥80% accuracy)</span>
        <span><i style={{ background: 'linear-gradient(90deg, #FFD84D, #FFB14D)' }} />Practising (≥3 attempts, ≥50%)</span>
        <span><i style={{ background: 'linear-gradient(90deg, #C8C8D2, #9B9DAE)' }} />New / still learning</span>
    </div>
);

// ── Cohort retention heatmap ────────────────────────────────────────
// A simple W0..W6 grid coloured by % returning.
export const Heatmap: React.FC<{
    rows: Array<{ cohort_week: string; cohort_size: number; cells: Array<{ w: number; pct: number | null }> }>;
}> = ({ rows }) => {
    if (!rows.length) return <Empty message="Not enough cohort data yet." />;
    const colorFor = (pct: number | null): string => {
        if (pct == null || pct === 0) return 'var(--flat-soft)';
        // Plum gradient: low pct = pale, high pct = saturated
        const a = Math.min(0.85, 0.10 + (pct / 100) * 0.75);
        return `rgba(108, 63, 164, ${a.toFixed(2)})`;
    };
    const textColorFor = (pct: number | null): string => (pct != null && pct >= 50) ? '#fff' : 'var(--ink)';

    return (
        <div className="iv-heatmap">
            <div className="iv-heatmap-h">Cohort</div>
            {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="iv-heatmap-h">W{i}</div>
            ))}
            {rows.map(r => (
                <React.Fragment key={r.cohort_week}>
                    <div className="iv-heatmap-row-label">
                        {new Date(r.cohort_week).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        <small>· {r.cohort_size}</small>
                    </div>
                    {r.cells.map(c => (
                        <div key={c.w} className="iv-heatmap-cell"
                             style={{ background: colorFor(c.pct), color: textColorFor(c.pct) }}
                             title={`W${c.w}: ${c.pct == null ? 'n/a' : `${c.pct}%`}`}>
                            {c.pct == null ? '-' : `${c.pct.toFixed(0)}%`}
                        </div>
                    ))}
                </React.Fragment>
            ))}
        </div>
    );
};

// ── Two-series area chart (new vs returning) ───────────────────────
export const DualAreaChart: React.FC<{
    points: Array<{ day: string; new_devices: number; returning: number; active?: number }>;
    height?: number;
}> = ({ points, height = 180 }) => {
    if (points.length < 2) return <Empty message="Not enough days yet." />;
    const W = 720;
    const H = height;
    const padL = 36, padR = 8, padT = 10, padB = 26;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    const maxY = Math.max(...points.map(p => (p.new_devices + p.returning)), 1);
    const stepX = innerW / Math.max(1, points.length - 1);
    const yFor = (n: number) => padT + innerH - (n / maxY) * innerH;

    // Stacked: returning at bottom (positive baseline), new on top
    const bottomPath = points.map((p, i) => {
        const x = padL + i * stepX;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${yFor(p.returning).toFixed(1)}`;
    }).join(' ');
    const topPath = points.map((p, i) => {
        const x = padL + i * stepX;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${yFor(p.returning + p.new_devices).toFixed(1)}`;
    }).join(' ');
    const baselineY = padT + innerH;

    return (
        <div className="iv-curves-wrap">
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
                 style={{ width: '100%', height: 'auto' }}>
                {[0, 0.25, 0.5, 0.75, 1].map(t => (
                    <g key={t}>
                        <line x1={padL} x2={W - padR} y1={yFor(maxY * (1 - t))} y2={yFor(maxY * (1 - t))}
                              stroke="rgba(63,64,82,0.08)" strokeDasharray="3 3" />
                        <text x={padL - 6} y={yFor(maxY * (1 - t)) + 3} textAnchor="end"
                              fontSize="9.5" fill="#6B6F84" fontFamily="Nunito, system-ui">
                            {Math.round(maxY * (1 - t))}
                        </text>
                    </g>
                ))}
                {/* Returning area (plum) */}
                <path d={`${bottomPath} L${padL + (points.length - 1) * stepX},${baselineY} L${padL},${baselineY} Z`}
                      fill="rgba(108, 63, 164, 0.35)" stroke="#6C3FA4" strokeWidth={1.4} />
                {/* New on top (aqua) */}
                <path d={`${topPath} ${bottomPath.split(' ').reverse().map(s => s.replace(/^[ML]/, 'L')).join(' ')} Z`}
                      fill="rgba(85, 221, 224, 0.35)" stroke="#55DDE0" strokeWidth={1.4} />
            </svg>
            <div className="iv-curves-legend">
                <span><i style={{ background: '#6C3FA4' }} />Returning devices</span>
                <span><i style={{ background: '#55DDE0' }} />New devices</span>
            </div>
        </div>
    );
};
