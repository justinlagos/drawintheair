/**
 * Retention tab — 10x'd.
 *
 * Five sections:
 *   1. Stickiness card: DAU / WAU / MAU + DAU÷MAU ratio
 *   2. Cohort retention heatmap (weeks × W0..W6) — the moneyshot
 *   3. New vs returning daily area chart (last 30 days)
 *   4. Cohort curves (kept from v1)
 *   5. "Returning hooks" — which mode brings kids back the most
 */

import React from 'react';
import { Card, Skeleton, Empty, Tag, CohortCurves, Heatmap, DualAreaChart, TableWrap } from '../components';
import { fmtNum, fmtPct, useRpc, downloadCsv } from '../helpers';
import { fetchRetentionDeep, fetchCohortCurves, fetchCohorts } from '../rpc';

const MODE_LABELS: Record<string, string> = {
    'free': 'Free Paint',
    'calibration': 'Bubble Pop',
    'pre-writing': 'Tracing',
    'balloon-math': 'Balloon Math',
    'rainbow-bridge': 'Rainbow Bridge',
    'word-search': 'Word Search',
    'sort-and-place': 'Sort & Place',
    'gesture-spelling': 'Spelling Stars',
    'colour-builder': 'Colour Builder',
};
const modeLabel = (m: string) => MODE_LABELS[m] ?? m;

export const RetentionTab: React.FC = () => {
    const deep    = useRpc(() => fetchRetentionDeep(), []);
    const curves  = useRpc(() => fetchCohortCurves(6), []);
    const cohorts = useRpc(() => fetchCohorts(8), []);

    if (deep.loading && !deep.data) {
        return <div className="iv-col-12"><Skeleton count={4} /></div>;
    }

    return (
        <>
            {/* Stickiness + headline */}
            <div className="iv-col-6">
                <Card title="Stickiness — how often kids come back"
                    meta="DAU / WAU / MAU and the ratio between them"
                >
                    {deep.data ? (
                        <>
                            <div className="iv-sticky-grid">
                                <div className="iv-sticky-stat">
                                    <div className="iv-sticky-stat-value">{fmtNum(deep.data.dau)}</div>
                                    <div className="iv-sticky-stat-label">Daily active</div>
                                </div>
                                <div className="iv-sticky-stat">
                                    <div className="iv-sticky-stat-value">{fmtNum(deep.data.wau)}</div>
                                    <div className="iv-sticky-stat-label">Weekly active</div>
                                </div>
                                <div className="iv-sticky-stat">
                                    <div className="iv-sticky-stat-value">{fmtNum(deep.data.mau)}</div>
                                    <div className="iv-sticky-stat-label">Monthly active</div>
                                </div>
                            </div>
                            <div style={{
                                marginTop: 14,
                                padding: '12px 16px',
                                background: 'rgba(108, 63, 164, 0.06)',
                                border: '1px solid rgba(108, 63, 164, 0.18)',
                                borderRadius: 10,
                                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12,
                            }}>
                                <div>
                                    <div style={{
                                        font: '700 28px Fredoka, system-ui',
                                        color: 'var(--plum)', lineHeight: 1,
                                    }}>{fmtPct(deep.data.stickiness_dau_mau)}</div>
                                    <div style={{ fontSize: 11.5, color: 'var(--flat)', marginTop: 4 }}>
                                        DAU ÷ MAU
                                    </div>
                                </div>
                                <div style={{ flex: 1, fontSize: 12.5, color: 'var(--flat)', textAlign: 'right' }}>
                                    {deep.data.stickiness_dau_mau >= 20 ? <strong>Healthy.</strong>
                                        : deep.data.stickiness_dau_mau >= 10 ? <strong>Okay.</strong>
                                        : <strong>Low.</strong>}
                                    {' '}A monthly user opens the app on{' '}
                                    <strong>{(deep.data.stickiness_dau_mau / 100 * 30).toFixed(1)}</strong>{' '}
                                    of 30 days.
                                </div>
                            </div>
                        </>
                    ) : <Empty message="No data yet." />}
                </Card>
            </div>

            {/* Returning hooks */}
            <div className="iv-col-6">
                <Card title="What brings kids back" meta="First mode in a returning session, last 30 days">
                    {!deep.data || deep.data.returning_hooks.length === 0
                        ? <Empty message="No returning sessions yet — once kids come back, the mode they pick first will rank here." />
                        : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {deep.data.returning_hooks.slice(0, 8).map((h, i) => {
                                    const max = Math.max(...deep.data!.returning_hooks.map(x => x.devices));
                                    const pct = (h.devices / max) * 100;
                                    return (
                                        <div key={h.game_mode} style={{
                                            display: 'grid',
                                            gridTemplateColumns: '24px 130px 1fr 50px',
                                            alignItems: 'center', gap: 10,
                                        }}>
                                            <span style={{
                                                font: '700 11px Nunito', color: 'var(--flat)',
                                                textAlign: 'right',
                                            }}>#{i + 1}</span>
                                            <Tag tone={i === 0 ? 'plum' : 'aqua'}>{modeLabel(h.game_mode)}</Tag>
                                            <div style={{
                                                height: 10, background: 'var(--flat-soft)',
                                                borderRadius: 999, overflow: 'hidden',
                                            }}>
                                                <div style={{
                                                    height: '100%', width: `${pct}%`,
                                                    background: 'linear-gradient(90deg, #55DDE0, #6C3FA4)',
                                                }} />
                                            </div>
                                            <span style={{
                                                font: '700 12px Fredoka', textAlign: 'right',
                                            }}>{fmtNum(h.devices)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                </Card>
            </div>

            {/* Cohort heatmap — the moneyshot */}
            <div className="iv-col-12">
                <Card
                    title="Cohort retention heatmap"
                    meta="Each row = a weekly cohort. Each column = how many of that cohort came back N weeks later."
                    actions={
                        <button className="iv-btn iv-btn-sm"
                            disabled={!deep.data}
                            onClick={() => deep.data && downloadCsv(
                                'cohort-heatmap',
                                deep.data.cohort_heatmap.flatMap(r => r.cells.map(c => ({
                                    cohort_week: r.cohort_week, cohort_size: r.cohort_size,
                                    week_offset: c.w, return_pct: c.pct, active: c.active,
                                }))),
                                ['cohort_week', 'cohort_size', 'week_offset', 'return_pct', 'active'],
                            )}>Export</button>
                    }
                >
                    {deep.data ? <Heatmap rows={deep.data.cohort_heatmap} />
                        : <Skeleton count={4} />}
                </Card>
            </div>

            {/* New vs returning area chart */}
            <div className="iv-col-12">
                <Card title="Daily devices — new vs returning"
                    meta="Last 30 days · stacked area"
                    actions={
                        <button className="iv-btn iv-btn-sm"
                            disabled={!deep.data}
                            onClick={() => deep.data && downloadCsv(
                                'daily-active',
                                deep.data.daily as unknown as Array<Record<string, unknown>>,
                                ['day', 'active', 'new_devices', 'returning'],
                            )}>Export</button>
                    }
                >
                    {deep.data ? <DualAreaChart points={deep.data.daily} />
                        : <Skeleton count={3} />}
                </Card>
            </div>

            {/* Cohort curves */}
            <div className="iv-col-12">
                <Card title="Cohort retention curves"
                    meta="First 14 days of each weekly cohort"
                >
                    {curves.loading && !curves.data ? <Skeleton count={3} />
                        : curves.data && curves.data.cohorts.length > 0
                            ? <CohortCurves cohorts={curves.data.cohorts} />
                            : <Empty message="Not enough cohort data yet." />}
                </Card>
            </div>

            {/* Cohort retention table — D1/D3/D7 reference */}
            <div className="iv-col-12">
                <Card title="Cohort retention — D1 / D3 / D7"
                    actions={
                        <button className="iv-btn iv-btn-sm"
                            disabled={!cohorts.data}
                            onClick={() => cohorts.data && downloadCsv(
                                'cohort-retention',
                                cohorts.data.cohorts as unknown as Array<Record<string, unknown>>,
                                ['cohort_week', 'new_devices', 'd1_returns', 'd1_pct', 'd3_returns', 'd3_pct', 'd7_returns', 'd7_pct'],
                            )}>Export</button>
                    }
                >
                    {cohorts.loading && !cohorts.data ? <Skeleton count={3} />
                        : cohorts.data && cohorts.data.cohorts.length > 0 ? (
                            <TableWrap>
                                <table className="iv-table">
                                    <thead>
                                        <tr>
                                            <th>Cohort week</th>
                                            <th>New devices</th>
                                            <th>D1 return</th>
                                            <th>D3 return</th>
                                            <th>D7 return</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cohorts.data.cohorts.map(c => (
                                            <tr key={c.cohort_week}>
                                                <td>{new Date(c.cohort_week).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td>
                                                <td>{fmtNum(c.new_devices)}</td>
                                                <td>{c.d1_pct.toFixed(1)}% <span style={{ color: 'var(--flat)', fontSize: 11 }}>({c.d1_returns})</span></td>
                                                <td>{c.d3_pct.toFixed(1)}% <span style={{ color: 'var(--flat)', fontSize: 11 }}>({c.d3_returns})</span></td>
                                                <td>{c.d7_pct.toFixed(1)}% <span style={{ color: 'var(--flat)', fontSize: 11 }}>({c.d7_returns})</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </TableWrap>
                        ) : <Empty message="No cohort rows yet." />}
                </Card>
            </div>
        </>
    );
};

export default RetentionTab;
