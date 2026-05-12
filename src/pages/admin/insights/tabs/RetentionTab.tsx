/**
 * Retention tab — cohort retention curves + table.
 */

import React from 'react';
import { Card, Skeleton, Empty, CohortCurves, TableWrap } from '../components';
import { fmtNum, useRpc, downloadCsv } from '../helpers';
import { fetchCohorts, fetchCohortCurves } from '../rpc';

export const RetentionTab: React.FC = () => {
    const curves  = useRpc(() => fetchCohortCurves(6), []);
    const cohorts = useRpc(() => fetchCohorts(8), []);

    return (
        <>
            <div className="iv-col-12">
                <Card
                    title="Cohort retention curves"
                    meta="Last 6 weekly cohorts · daily return % over first 14 days"
                >
                    {curves.loading && !curves.data ? <Skeleton count={4} />
                        : curves.data && curves.data.cohorts.length > 0
                            ? <CohortCurves cohorts={curves.data.cohorts} />
                            : <Empty message="Not enough cohort data yet — needs at least one week of returns." />}
                </Card>
            </div>

            <div className="iv-col-12">
                <Card
                    title="Cohort retention table"
                    meta="D1 / D3 / D7 by week of first visit"
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
                                            <th>Week of first visit</th>
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
                                                <td>{c.d1_pct.toFixed(1)}% <span style={{ color: '#6B6F84', fontSize: 11 }}>({c.d1_returns})</span></td>
                                                <td>{c.d3_pct.toFixed(1)}% <span style={{ color: '#6B6F84', fontSize: 11 }}>({c.d3_returns})</span></td>
                                                <td>{c.d7_pct.toFixed(1)}% <span style={{ color: '#6B6F84', fontSize: 11 }}>({c.d7_returns})</span></td>
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
