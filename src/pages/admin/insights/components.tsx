/**
 * Insights v2 — reusable presentational components.
 *
 * Everything visual that is used by more than one tab. All charts are
 * inline SVG (no external chart library) so the bundle stays small.
 */

import React from 'react';
import { CHART_COLORS, deltaTone, fmtDelta, fmtNum } from './helpers';
import type { CohortCurve, SparkPoint } from './types';

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
    const arrow = value == null ? '—' : value > 0 ? '↑' : value < 0 ? '↓' : '→';
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
                            {c.pct == null ? '—' : `${c.pct.toFixed(0)}%`}
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
