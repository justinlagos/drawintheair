/**
 * Engagement tab — what kids actually play.
 */

import React from 'react';
import { Card, Skeleton, Empty, Tag, InlineBar, TableWrap } from '../components';
import { fmtNum, fmtPct, days as rangeDays, useRpc, downloadCsv } from '../helpers';
import { fetchTopModes } from '../rpc';
import type { FilterState } from '../types';

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

export const EngagementTab: React.FC<{ filter: FilterState }> = ({ filter }) => {
    const d = rangeDays(filter.range);
    const modes = useRpc(() => fetchTopModes(d), [d]);

    return (
        <div className="iv-col-12">
            <Card
                title="Most-played modes"
                meta={`Last ${d} day${d === 1 ? '' : 's'}`}
                actions={
                    <button className="iv-btn iv-btn-sm"
                        disabled={!modes.data}
                        onClick={() => modes.data && downloadCsv(
                            `modes-${d}d`,
                            modes.data.modes as unknown as Array<Record<string, unknown>>,
                            ['game_mode', 'started', 'completed', 'distinct_starters', 'completion_rate_pct', 'is_open_ended'],
                        )}>
                        Export
                    </button>
                }
            >
                {modes.loading && !modes.data ? <Skeleton count={4} /> : modes.data && modes.data.modes.length > 0 ? (
                    <TableWrap>
                        <table className="iv-table">
                            <thead>
                                <tr>
                                    <th>Mode</th>
                                    <th>Started</th>
                                    <th>Completed</th>
                                    <th>Distinct starters</th>
                                    <th>Completion</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {modes.data.modes.map(m => {
                                    const label = MODE_LABELS[m.game_mode] ?? m.game_mode;
                                    const pct = m.completion_rate_pct;
                                    return (
                                        <tr key={m.game_mode}>
                                            <td>
                                                <Tag tone="aqua">{label}</Tag>
                                                {m.is_open_ended && (
                                                    <Tag tone="gray"><span style={{ marginLeft: 4 }}>sandbox</span></Tag>
                                                )}
                                            </td>
                                            <td>{fmtNum(m.started)}</td>
                                            <td>{fmtNum(m.completed)}</td>
                                            <td>{fmtNum(m.distinct_starters)}</td>
                                            <td>{m.is_open_ended ? <span style={{ color: '#6B6F84' }}>—</span> : fmtPct(pct)}</td>
                                            <td style={{ width: 120 }}>
                                                {!m.is_open_ended && pct != null && <InlineBar pct={pct} />}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </TableWrap>
                ) : <Empty message="No mode plays in this period." />}
            </Card>
        </div>
    );
};

export default EngagementTab;
