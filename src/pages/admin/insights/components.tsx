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
