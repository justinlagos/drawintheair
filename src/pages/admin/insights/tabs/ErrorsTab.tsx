/**
 * Errors tab — grouped error stream with frequency.
 */

import React, { useMemo } from 'react';
import { Card, Skeleton, Empty, Tag, TableWrap } from '../components';
import { fmtNum, fmtRelative, useRpc, downloadCsv } from '../helpers';
import { fetchErrors } from '../rpc';

export const ErrorsTab: React.FC = () => {
    const errors = useRpc(() => fetchErrors(100), []);

    // Group by event_name + meta.code so the table reads as "type → N events"
    const grouped = useMemo(() => {
        if (!errors.data) return [];
        const map = new Map<string, { event: string; code: string; count: number; last: string; pages: Set<string> }>();
        for (const e of errors.data.errors) {
            const code = (e.meta?.code as string | undefined) ?? '—';
            const key = `${e.event_name}::${code}`;
            const cur = map.get(key) ?? { event: e.event_name, code, count: 0, last: e.occurred_at, pages: new Set<string>() };
            cur.count++;
            if (e.occurred_at > cur.last) cur.last = e.occurred_at;
            if (e.page) cur.pages.add(e.page);
            map.set(key, cur);
        }
        return Array.from(map.values()).sort((a, b) => b.count - a.count);
    }, [errors.data]);

    return (
        <div className="iv-col-12">
            <Card
                title="Error stream (grouped)"
                meta={errors.data ? `${errors.data.errors.length} events · ${grouped.length} types` : '—'}
                actions={
                    <button className="iv-btn iv-btn-sm"
                        disabled={!errors.data || errors.data.errors.length === 0}
                        onClick={() => errors.data && downloadCsv(
                            'errors',
                            errors.data.errors as unknown as Array<Record<string, unknown>>,
                            ['occurred_at', 'event_name', 'browser', 'device_type', 'page', 'meta'],
                        )}>Export</button>
                }
            >
                {errors.loading && !errors.data ? <Skeleton count={3} />
                    : errors.data && errors.data.errors.length === 0
                        ? <Empty message={<><strong>All clear.</strong> No errors recently.</>} />
                        : (
                            <TableWrap>
                                <table className="iv-table">
                                    <thead>
                                        <tr>
                                            <th>Event</th>
                                            <th>Code</th>
                                            <th>Count</th>
                                            <th>Routes</th>
                                            <th>Last seen</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {grouped.map((g, i) => (
                                            <tr key={i}>
                                                <td><Tag tone="coral">{g.event}</Tag></td>
                                                <td><span style={{ font: '700 12px Nunito' }}>{g.code}</span></td>
                                                <td>{fmtNum(g.count)}</td>
                                                <td>
                                                    {Array.from(g.pages).slice(0, 2).map(p => <Tag key={p} tone="gray">{p}</Tag>)}
                                                </td>
                                                <td>{fmtRelative(g.last)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </TableWrap>
                        )}
            </Card>
        </div>
    );
};

export default ErrorsTab;
