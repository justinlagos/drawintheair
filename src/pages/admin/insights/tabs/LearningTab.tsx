/**
 * Learning tab — mastery, curriculum, milestones.
 */

import React from 'react';
import { Card, Skeleton, Empty, Tag, InlineBar, TableWrap } from '../components';
import { fmtNum, fmtPct, days as rangeDays, useRpc, downloadCsv } from '../helpers';
import { fetchMastery, fetchCurriculum, fetchMilestones } from '../rpc';
import type { FilterState } from '../types';

export const LearningTab: React.FC<{ filter: FilterState }> = ({ filter }) => {
    const d = rangeDays(filter.range);
    const mastery     = useRpc(() => fetchMastery(d, 3), [d]);
    const curriculum  = useRpc(() => fetchCurriculum(d), [d]);
    const milestones  = useRpc(() => fetchMilestones(60, 5, 80), []);

    return (
        <>
            <div className="iv-row">
                <div className="iv-col-6">
                    <Card title="Per-item mastery"
                        meta={`Last ${d} day${d === 1 ? '' : 's'} · ≥3 attempts`}
                        actions={
                            <button className="iv-btn iv-btn-sm"
                                disabled={!mastery.data}
                                onClick={() => mastery.data && downloadCsv(
                                    `mastery-${d}d`,
                                    mastery.data.items as unknown as Array<Record<string, unknown>>,
                                    ['game_mode', 'item_key', 'attempts', 'correct', 'accuracy_pct', 'distinct_devices', 'avg_ms'],
                                )}>Export</button>
                        }
                    >
                        {mastery.loading && !mastery.data ? <Skeleton count={3} />
                            : mastery.data && mastery.data.items.length > 0 ? (
                                <TableWrap>
                                    <table className="iv-table">
                                        <thead>
                                            <tr>
                                                <th>Item</th>
                                                <th>Mode</th>
                                                <th>Attempts</th>
                                                <th>Accuracy</th>
                                                <th>Devices</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {mastery.data.items.slice(0, 12).map((m, i) => (
                                                <tr key={`${m.game_mode}-${m.item_key}-${i}`}>
                                                    <td><Tag tone="plum">{m.item_key}</Tag></td>
                                                    <td><Tag tone="aqua">{m.game_mode}</Tag></td>
                                                    <td>{fmtNum(m.attempts)}</td>
                                                    <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        {fmtPct(m.accuracy_pct)}
                                                        <div style={{ flex: 1, minWidth: 50 }}>
                                                            <InlineBar pct={m.accuracy_pct} />
                                                        </div>
                                                    </td>
                                                    <td>{fmtNum(m.distinct_devices)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </TableWrap>
                            ) : <Empty message="No mastery rows yet — need ≥3 attempts per item." />}
                    </Card>
                </div>

                <div className="iv-col-6">
                    <Card title="Curriculum coverage"
                        meta={`Last ${d} day${d === 1 ? '' : 's'}`}
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
                                                <th>Avg items / kid</th>
                                                <th>Avg attempts / kid</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {curriculum.data.modes.map(c => (
                                                <tr key={c.game_mode}>
                                                    <td><Tag tone="aqua">{c.game_mode}</Tag></td>
                                                    <td>{fmtNum(c.devices)}</td>
                                                    <td>{c.avg_distinct_items?.toFixed(1) ?? '—'}</td>
                                                    <td>{c.avg_attempts?.toFixed(1) ?? '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </TableWrap>
                            ) : <Empty message="No coverage data for this period." />}
                    </Card>
                </div>
            </div>

            <div className="iv-col-12">
                <Card title="Mastery milestones"
                    meta="Last 60 days · ≥5 attempts · ≥80% correct"
                    tier="GAP 6"
                    actions={
                        <button className="iv-btn iv-btn-sm"
                            disabled={!milestones.data}
                            onClick={() => milestones.data && downloadCsv(
                                'milestones',
                                milestones.data.items as unknown as Array<Record<string, unknown>>,
                                ['game_mode', 'item_key', 'mastered_devices', 'practising_devices', 'touched_devices', 'mastery_pct', 'avg_recent_accuracy'],
                            )}>Export</button>
                    }
                >
                    {milestones.loading && !milestones.data ? <Skeleton count={3} />
                        : milestones.data && milestones.data.items.length > 0 ? (
                            <TableWrap>
                                <table className="iv-table">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>Mode</th>
                                            <th>Mastered</th>
                                            <th>Touched</th>
                                            <th>Mastery rate</th>
                                            <th>Recent acc.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {milestones.data.items.slice(0, 20).map((m, i) => (
                                            <tr key={`${m.game_mode}-${m.item_key}-${i}`}>
                                                <td><Tag tone="plum">{m.item_key}</Tag></td>
                                                <td><Tag tone="aqua">{m.game_mode}</Tag></td>
                                                <td>{fmtNum(m.mastered_devices)}</td>
                                                <td>{fmtNum(m.touched_devices)}</td>
                                                <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    {fmtPct(m.mastery_pct)}
                                                    <div style={{ flex: 1, minWidth: 50 }}>
                                                        <InlineBar pct={m.mastery_pct} />
                                                    </div>
                                                </td>
                                                <td>{fmtPct(m.avg_recent_accuracy)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </TableWrap>
                        ) : <Empty message="No mastery milestones to show yet." />}
                </Card>
            </div>
        </>
    );
};

export default LearningTab;
