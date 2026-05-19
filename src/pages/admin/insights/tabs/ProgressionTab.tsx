/**
 * Progression tab — Document A §7.1 Learner Progression Dashboard.
 *
 * For a single pseudonymous learner, render the chart family that
 * earns the platform its first credible "this child measurably
 * improved over time" claim:
 *
 *   • Learner picker — top 25 most-active devices in the window
 *   • Summary card — attempts / items / sessions / accuracy / cred.
 *   • Four-state mini KPI — Exposed/Acquired/Mastered/Decayed
 *   • θ-over-time line chart — top 6 most-practised items
 *   • Mastery episode timeline — state transitions in reverse order
 *   • Recent attempts strip — last 20, with credibility tier
 *
 * Motor-precision, confidence, decay-probe, transfer-probe curves
 * wait for the data they need (Sprint 3 gesture quality + later).
 */

import React, { useEffect, useState } from 'react';
import { Card, Skeleton, Empty, Tag, TableWrap } from '../components';
import { fmtNum, fmtPct, days as rangeDays, useRpc, CHART_COLORS } from '../helpers';
import { fetchProgressionTopLearners, fetchProgressionForLearner } from '../rpc';
import type {
    FilterState,
    ProgressionLearnerListItem, ProgressionTrajectory,
} from '../types';

const MODE_LABELS: Record<string, string> = {
    'pre-writing': 'Tracing',
    'balloon-math': 'Balloon Math',
    'rainbow-bridge': 'Rainbow Bridge',
    'word-search': 'Word Search',
    'sort-and-place': 'Sort & Place',
    'gesture-spelling': 'Spelling Stars',
    'colour-builder': 'Colour Builder',
};
const modeLabel = (m: string) => MODE_LABELS[m] ?? m;

export const ProgressionTab: React.FC<{ filter: FilterState }> = ({ filter }) => {
    const d = rangeDays(filter.range);
    const list = useRpc(() => fetchProgressionTopLearners(Math.max(d, 30), 25), [d]);
    const [selected, setSelected] = useState<string | null>(null);

    // Auto-pick the most-active learner whenever the list loads / filter changes
    useEffect(() => {
        if (list.data && list.data.learners.length > 0 && !selected) {
            setSelected(list.data.learners[0].device_id);
        }
    }, [list.data, selected]);

    const learner = useRpc(
        () => selected ? fetchProgressionForLearner(selected) : Promise.resolve(null),
        [selected],
    );

    if (list.loading && !list.data) {
        return <div className="iv-col-12"><Skeleton count={4} /></div>;
    }
    if (!list.data || list.data.learners.length === 0) {
        return <div className="iv-col-12">
            <Empty message="No active learners yet in the selected window." />
        </div>;
    }

    return (
        <>
            <LearnerPicker
                learners={list.data.learners}
                selected={selected}
                onSelect={setSelected}
            />
            {selected && learner.loading && !learner.data
                ? <div className="iv-col-12"><Skeleton count={3} /></div>
                : selected && learner.data && (
                    <LearnerProfile data={learner.data} />
                )}
        </>
    );
};

// ── Learner picker ─────────────────────────────────────────────────

const LearnerPicker: React.FC<{
    learners: ProgressionLearnerListItem[];
    selected: string | null;
    onSelect: (deviceId: string) => void;
}> = ({ learners, selected, onSelect }) => (
    <div className="iv-col-12">
        <Card title="Learners (most active first)"
              meta={`${learners.length} pseudonymous learners — pick one to drill in`}>
            <TableWrap>
                <table className="iv-table" style={{ fontSize: 12 }}>
                    <thead>
                        <tr>
                            <th>Learner</th>
                            <th>Age band</th>
                            <th>Attempts</th>
                            <th>Sessions</th>
                            <th>Items touched</th>
                            <th>Mastered</th>
                            <th>Accuracy</th>
                            <th>Mean cred.</th>
                        </tr>
                    </thead>
                    <tbody>
                        {learners.map(l => {
                            const isSelected = l.device_id === selected;
                            return (
                                <tr
                                    key={l.device_id}
                                    onClick={() => onSelect(l.device_id)}
                                    style={{
                                        cursor: 'pointer',
                                        background: isSelected ? 'rgba(108, 63, 164, 0.08)' : 'transparent',
                                        outline: isSelected ? '2px solid #6C3FA4' : 'none',
                                    }}
                                >
                                    <td style={{ fontFamily: 'ui-monospace, monospace' }}>
                                        {l.device_id.slice(0, 8)}{isSelected && ' ←'}
                                    </td>
                                    <td>{l.age_band ?? '—'}</td>
                                    <td>{fmtNum(l.n_attempts)}</td>
                                    <td>{fmtNum(l.n_sessions)}</td>
                                    <td>{fmtNum(l.n_distinct_items)}</td>
                                    <td>
                                        <Tag tone={l.n_mastered > 0 ? 'green' : 'gray'}>
                                            {fmtNum(l.n_mastered)}
                                        </Tag>
                                    </td>
                                    <td>{fmtPct(l.accuracy != null ? l.accuracy * 100 : null)}</td>
                                    <td>{l.mean_credibility != null ? l.mean_credibility.toFixed(2) : '—'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </TableWrap>
        </Card>
    </div>
);

// ── Per-learner profile (the headline charts) ──────────────────────

const LearnerProfile: React.FC<{
    data: NonNullable<ReturnType<typeof useRpc>['data']> extends never
        ? never
        : import('../types').ProgressionLearnerData;
}> = ({ data }) => {
    const s = data.summary;
    const st = data.state_totals;

    return (
        <>
            {/* Summary KPI strip */}
            <div className="iv-col-12 iv-kpi-grid">
                <Kpi label="Attempts" value={fmtNum(s.n_attempts)} sub={`${fmtNum(s.n_sessions)} sessions`} />
                <Kpi label="Items touched" value={fmtNum(s.n_distinct_items)} sub="distinct (item × mode)" />
                <Kpi label="Accuracy" value={fmtPct(s.accuracy != null ? s.accuracy * 100 : null)}
                     sub={`mean credibility ${s.mean_credibility?.toFixed(2) ?? '—'}`} />
                <Kpi label="Mastered" value={fmtNum(st.mastered)}
                     sub={`Acquired ${st.acquired} · Exposed ${st.exposed} · Decayed ${st.decayed}`} />
            </div>

            {/* θ-over-time trajectories — the chart that earns this dashboard */}
            <div className="iv-col-12">
                <Card title="θ over time — top practised items"
                      meta="Learner skill rating per (item × mode). Up = getting stronger.">
                    {data.trajectories.length === 0
                        ? <Empty message="Not enough multi-day data yet to chart trajectories." />
                        : <TrajectoryChart trajectories={data.trajectories} />}
                </Card>
            </div>

            {/* Mastery episode timeline */}
            <div className="iv-col-6">
                <Card title="Mastery state transitions"
                      meta={`${data.transitions.length} most recent`}>
                    {data.transitions.length === 0
                        ? <Empty message="No transitions yet — learner is brand new." />
                        : (
                            <TableWrap>
                                <table className="iv-table" style={{ fontSize: 12 }}>
                                    <thead>
                                        <tr><th>When</th><th>Item</th><th>Mode</th><th>State</th></tr>
                                    </thead>
                                    <tbody>
                                        {data.transitions.slice(0, 12).map((t, i) => (
                                            <tr key={`${t.item_key}-${t.transition_at}-${i}`}>
                                                <td>{new Date(t.transition_at).toLocaleDateString(undefined,
                                                    { month: 'short', day: 'numeric' })}</td>
                                                <td><Tag tone="plum">{t.item_key}</Tag></td>
                                                <td><Tag tone="aqua">{modeLabel(t.game_mode)}</Tag></td>
                                                <td>
                                                    {t.from_state && (
                                                        <>
                                                            <Tag tone="gray">{t.from_state}</Tag>
                                                            <span style={{ color: '#6B6F84', margin: '0 4px' }}>→</span>
                                                        </>
                                                    )}
                                                    <Tag tone={
                                                        t.to_state === 'Mastered' ? 'green' :
                                                        t.to_state === 'Acquired' ? 'aqua' :
                                                        t.to_state === 'Decayed'  ? 'coral' : 'gray'
                                                    }>{t.to_state}</Tag>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </TableWrap>
                        )}
                </Card>
            </div>

            {/* Recent attempts strip */}
            <div className="iv-col-6">
                <Card title="Recent attempts"
                      meta={`${data.recent_attempts.length} most recent`}>
                    {data.recent_attempts.length === 0
                        ? <Empty message="No attempts yet." />
                        : (
                            <TableWrap>
                                <table className="iv-table" style={{ fontSize: 12 }}>
                                    <thead>
                                        <tr><th>When</th><th>Item</th><th>Mode</th><th></th><th>Cred.</th></tr>
                                    </thead>
                                    <tbody>
                                        {data.recent_attempts.slice(0, 12).map((a, i) => (
                                            <tr key={`${a.occurred_at}-${a.item_key}-${i}`}>
                                                <td>{new Date(a.occurred_at).toLocaleString(undefined,
                                                    { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                                <td><Tag tone="plum">{a.item_key}</Tag></td>
                                                <td><Tag tone="aqua">{modeLabel(a.game_mode)}</Tag></td>
                                                <td style={{
                                                    color: a.was_correct ? '#7ED957' : '#FF6B6B',
                                                    fontWeight: 700,
                                                    fontSize: 16,
                                                }}>{a.was_correct ? '✓' : '✗'}</td>
                                                <td>
                                                    <Tag tone={
                                                        a.credibility_tier === 'A' ? 'green' :
                                                        a.credibility_tier === 'B' ? 'aqua' :
                                                        a.credibility_tier === 'C' ? 'coral' : 'gray'
                                                    }>{a.credibility_tier ?? '—'}</Tag>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </TableWrap>
                        )}
                </Card>
            </div>
        </>
    );
};

// ── θ-over-time line chart ─────────────────────────────────────────
//
// Inline SVG, no chart library. One line per (item, mode). x-axis is
// day, y-axis is θ. Auto-scaled to the trajectory range with a small
// padding so small movements remain visible.

const TrajectoryChart: React.FC<{ trajectories: ProgressionTrajectory[] }> = ({ trajectories }) => {
    const W = 760, H = 280;
    const padL = 40, padR = 8, padT = 16, padB = 36;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    // Domain: collect all days + all θ
    const allPoints = trajectories.flatMap(t => t.series);
    if (allPoints.length === 0) {
        return <Empty message="No history yet." />;
    }
    const minTheta = Math.min(...allPoints.map(p => p.theta));
    const maxTheta = Math.max(...allPoints.map(p => p.theta));
    const yPad = Math.max(0.1, (maxTheta - minTheta) * 0.15);
    const yMin = minTheta - yPad;
    const yMax = maxTheta + yPad;

    const days = Array.from(new Set(allPoints.map(p => p.day))).sort();
    const dayIndex = new Map(days.map((d, i) => [d, i]));

    const xOf = (day: string) => padL + (dayIndex.get(day)! / Math.max(1, days.length - 1)) * innerW;
    const yOf = (theta: number) => padT + innerH - ((theta - yMin) / (yMax - yMin)) * innerH;

    return (
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
             style={{ width: '100%', height: 'auto' }} role="img"
             aria-label="θ over time line chart">
            {/* Horizontal grid + y labels */}
            {[0, 0.25, 0.5, 0.75, 1].map(f => {
                const y = padT + innerH * (1 - f);
                const v = yMin + f * (yMax - yMin);
                return (
                    <g key={f}>
                        <line x1={padL} x2={W - padR} y1={y} y2={y}
                              stroke="rgba(63,64,82,0.10)" strokeDasharray="3 3" />
                        <text x={padL - 6} y={y + 3} textAnchor="end"
                              fontSize="10" fill="#6B6F84"
                              fontFamily="Nunito, system-ui, sans-serif">{v.toFixed(2)}</text>
                    </g>
                );
            })}
            {/* x-axis labels — show first, middle, last */}
            {[days[0], days[Math.floor(days.length / 2)], days[days.length - 1]].map((day, i) => (
                <text key={`${day}-${i}`} x={xOf(day)} y={H - 12} textAnchor="middle"
                      fontSize="10" fill="#6B6F84"
                      fontFamily="Nunito, system-ui, sans-serif">
                    {new Date(day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </text>
            ))}
            {/* One line per trajectory */}
            {trajectories.map((t, i) => {
                const colour = CHART_COLORS[i % CHART_COLORS.length];
                const path = t.series
                    .map((p, j) => `${j === 0 ? 'M' : 'L'}${xOf(p.day).toFixed(1)},${yOf(p.theta).toFixed(1)}`)
                    .join(' ');
                return (
                    <g key={`${t.item_key}-${t.game_mode}`}>
                        <path d={path} fill="none" stroke={colour} strokeWidth={2}
                              strokeLinecap="round" strokeLinejoin="round" />
                        {t.series.map((p, j) => (
                            <circle key={j} cx={xOf(p.day)} cy={yOf(p.theta)} r={3.5} fill={colour}>
                                <title>{`${t.item_key} (${modeLabel(t.game_mode)}) — ${p.day}: θ=${p.theta.toFixed(2)}, ${p.n_attempts} attempts`}</title>
                            </circle>
                        ))}
                    </g>
                );
            })}
            {/* Legend */}
            <g transform={`translate(${padL}, ${H - 4})`}>
                {trajectories.slice(0, 6).map((t, i) => (
                    <g key={`${t.item_key}-${t.game_mode}`}
                       transform={`translate(${i * 110}, -2)`}>
                        <rect width={8} height={8}
                              fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        <text x={12} y={8} fontSize="10" fill="#3F4052"
                              fontFamily="Nunito, system-ui, sans-serif">
                            {t.item_key} · {modeLabel(t.game_mode).slice(0, 6)}
                        </text>
                    </g>
                ))}
            </g>
        </svg>
    );
};

// ── Mini KPI card (local — the shared Kpi component is in components.tsx
//    but adds a delta slot we don't need here) ──────────────────────

const Kpi: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
    <div className="iv-kpi">
        <div className="iv-kpi-label">{label}</div>
        <div>
            <div className="iv-kpi-value">{value}</div>
            {sub && <div className="iv-kpi-value-sub">{sub}</div>}
        </div>
    </div>
);
