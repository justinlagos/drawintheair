/**
 * Learning tab — mastery, curriculum, milestones.
 *
 * Investor-grade restructure: top summary KPIs ("X kids have mastered
 * Y items"), strength buckets per item (Strong / Practising / New),
 * the action-oriented "Struggling with…" list (items where median
 * accuracy is below 60% with ≥3 kids), the celebrate-oriented "Top
 * mastered" list, and the per-mode curriculum coverage table.
 */

import React, { useMemo, useState } from 'react';
import { Card, Skeleton, Empty, Tag, TableWrap, StrengthBar, StrengthKey, InlineBar } from '../components';
import { fmtNum, fmtPct, days as rangeDays, useRpc, downloadCsv } from '../helpers';
import { fetchMasterySummary, fetchCurriculum } from '../rpc';
import type { FilterState, MasteryItemSummary } from '../types';

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

export const LearningTab: React.FC<{ filter: FilterState }> = ({ filter }) => {
    const d = rangeDays(filter.range);
    const mastery     = useRpc(() => fetchMasterySummary(Math.max(d, 30)), [d]);
    const curriculum  = useRpc(() => fetchCurriculum(d), [d]);
    const [modeFilter, setModeFilter] = useState<string>('all');

    const modesInData = useMemo(() => {
        if (!mastery.data) return [] as string[];
        return Array.from(new Set(mastery.data.items.map(i => i.game_mode))).sort();
    }, [mastery.data]);

    const filteredItems = useMemo<MasteryItemSummary[]>(() => {
        if (!mastery.data) return [];
        return modeFilter === 'all'
            ? mastery.data.items
            : mastery.data.items.filter(i => i.game_mode === modeFilter);
    }, [mastery.data, modeFilter]);

    if (mastery.loading && !mastery.data) {
        return <div className="iv-col-12"><Skeleton count={4} /></div>;
    }
    const t = mastery.data?.totals;

    return (
        <>
            {/* Summary KPIs — what's actually been learned */}
            <div className="iv-col-12 iv-kpi-grid">
                <Kpi label="Items kids have mastered"
                    value={fmtNum(t?.total_strong)}
                    sub="≥5 attempts, ≥80% accuracy" />
                <Kpi label="Items being practised"
                    value={fmtNum(t?.total_practising)}
                    sub="≥3 attempts, ≥50% accuracy" />
                <Kpi label="Items just discovered"
                    value={fmtNum(t?.total_new)}
                    sub="started but not yet mastered" />
                <Kpi label="Distinct items touched"
                    value={fmtNum(t?.distinct_items)}
                    sub={`across ${fmtNum(t?.distinct_modes)} modes`} />
            </div>

            {/* Top mastered + Struggling with */}
            <div className="iv-row">
                <div className="iv-col-6">
                    <Card title="Top mastered — kids nailing this"
                        meta={mastery.data ? `${mastery.data.top_strong.length} items` : '—'}
                    >
                        {!mastery.data || mastery.data.top_strong.length === 0
                            ? <Empty message="No items mastered yet. Keep playing — first kids past the 80% bar will show here." />
                            : (
                                <TableWrap>
                                    <table className="iv-table">
                                        <thead>
                                            <tr><th>Item</th><th>Mode</th><th>Kids strong</th><th>Mean acc.</th></tr>
                                        </thead>
                                        <tbody>
                                            {mastery.data.top_strong.map((m, i) => (
                                                <tr key={i}>
                                                    <td><Tag tone="green">{m.item_key}</Tag></td>
                                                    <td><Tag tone="aqua">{modeLabel(m.game_mode)}</Tag></td>
                                                    <td>{fmtNum(m.strong)} / {fmtNum(m.total_devices)}</td>
                                                    <td>{fmtPct(m.mean_acc_pct)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </TableWrap>
                            )}
                    </Card>
                </div>

                <div className="iv-col-6">
                    <Card title="Struggling with — needs better scaffolding"
                        meta={mastery.data ? `${mastery.data.struggling.length} items` : '—'}
                    >
                        {!mastery.data || mastery.data.struggling.length === 0
                            ? <Empty message={<><strong>Nothing flagged.</strong> Either kids are doing well or we don't have enough attempts yet.</>} />
                            : (
                                <TableWrap>
                                    <table className="iv-table">
                                        <thead>
                                            <tr><th>Item</th><th>Mode</th><th>Kids</th><th>Median acc.</th><th>Avg tries</th></tr>
                                        </thead>
                                        <tbody>
                                            {mastery.data.struggling.map((m, i) => (
                                                <tr key={i}>
                                                    <td><Tag tone="coral">{m.item_key}</Tag></td>
                                                    <td><Tag tone="aqua">{modeLabel(m.game_mode)}</Tag></td>
                                                    <td>{fmtNum(m.total_devices)}</td>
                                                    <td style={{ color: 'var(--bad)' }}>{fmtPct(m.median_acc_pct)}</td>
                                                    <td>{m.mean_attempts.toFixed(1)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </TableWrap>
                            )}
                    </Card>
                </div>
            </div>

            {/* Per-item strength breakdown */}
            <div className="iv-col-12">
                <Card title="Per-item strength breakdown"
                    meta="Each row shows how kids split across the three mastery levels"
                    actions={
                        <button className="iv-btn iv-btn-sm"
                            disabled={filteredItems.length === 0}
                            onClick={() => downloadCsv(
                                `mastery-summary`,
                                filteredItems as unknown as Array<Record<string, unknown>>,
                                ['game_mode', 'item_key', 'strong', 'practising', 'new', 'total_devices', 'mean_acc_pct', 'median_acc_pct', 'mean_attempts'],
                            )}>Export</button>
                    }
                >
                    {modesInData.length > 1 && (
                        <div className="iv-filter-group iv-no-print" style={{ marginBottom: 12 }}>
                            <button
                                className={`iv-filter-pill ${modeFilter === 'all' ? 'is-active' : ''}`}
                                onClick={() => setModeFilter('all')}
                            >All modes</button>
                            {modesInData.map(m => (
                                <button key={m}
                                    className={`iv-filter-pill ${modeFilter === m ? 'is-active' : ''}`}
                                    onClick={() => setModeFilter(m)}
                                >{modeLabel(m)}</button>
                            ))}
                        </div>
                    )}

                    {filteredItems.length === 0
                        ? <Empty message="No mastery rows for this filter yet." />
                        : (
                            <TableWrap>
                                <table className="iv-table">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>Mode</th>
                                            <th>Kids</th>
                                            <th style={{ minWidth: 180 }}>Strength split</th>
                                            <th>Median acc.</th>
                                            <th>Avg tries</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredItems.slice(0, 25).map((m, i) => (
                                            <tr key={`${m.game_mode}-${m.item_key}-${i}`}>
                                                <td><Tag tone="plum">{m.item_key}</Tag></td>
                                                <td><Tag tone="aqua">{modeLabel(m.game_mode)}</Tag></td>
                                                <td>{fmtNum(m.total_devices)}</td>
                                                <td>
                                                    <StrengthBar
                                                        strong={m.strong}
                                                        practising={m.practising}
                                                        newCount={m.new}
                                                    />
                                                    <div style={{ fontSize: 11, color: 'var(--flat)', marginTop: 4 }}>
                                                        {m.strong} strong · {m.practising} practising · {m.new} new
                                                    </div>
                                                </td>
                                                <td>{fmtPct(m.median_acc_pct)}</td>
                                                <td>{m.mean_attempts.toFixed(1)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </TableWrap>
                        )}
                    <StrengthKey />
                </Card>
            </div>

            {/* Curriculum coverage — kept from v1 but properly framed */}
            <div className="iv-col-12">
                <Card
                    title="Curriculum coverage by mode"
                    meta={`Last ${d} day${d === 1 ? '' : 's'} · how much of each mode kids are exploring`}
                    actions={
                        <button className="iv-btn iv-btn-sm"
                            disabled={!curriculum.data}
                            onClick={() => curriculum.data && downloadCsv(
                                `curriculum-${d}d`,
                                curriculum.data.modes as unknown as Array<Record<string, unknown>>,
                                ['game_mode', 'devices', 'avg_distinct_items', 'avg_attempts'],
                            )}>Export</button>
                    }
                >
                    {curriculum.loading && !curriculum.data ? <Skeleton count={3} />
                        : curriculum.data && curriculum.data.modes.length > 0 ? (
                            <TableWrap>
                                <table className="iv-table">
                                    <thead>
                                        <tr>
                                            <th>Mode</th>
                                            <th>Kids</th>
                                            <th>Items per kid (avg)</th>
                                            <th>Attempts per kid (avg)</th>
                                            <th style={{ minWidth: 120 }}>Breadth</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {curriculum.data.modes.map(c => {
                                            const maxItems = Math.max(...curriculum.data!.modes.map(x => x.avg_distinct_items), 1);
                                            const pct = (c.avg_distinct_items / maxItems) * 100;
                                            return (
                                                <tr key={c.game_mode}>
                                                    <td><Tag tone="aqua">{modeLabel(c.game_mode)}</Tag></td>
                                                    <td>{fmtNum(c.devices)}</td>
                                                    <td>{c.avg_distinct_items?.toFixed(1) ?? '—'}</td>
                                                    <td>{c.avg_attempts?.toFixed(1) ?? '—'}</td>
                                                    <td><InlineBar pct={pct} /></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </TableWrap>
                        ) : <Empty message="No coverage data yet." />}
                </Card>
            </div>
        </>
    );
};

const Kpi: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
    <div className="iv-kpi">
        <div className="iv-kpi-label">{label}</div>
        <div>
            <div className="iv-kpi-value">{value}</div>
            {sub && <div className="iv-kpi-value-sub">{sub}</div>}
        </div>
    </div>
);

export default LearningTab;
