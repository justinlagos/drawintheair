/**
 * Sessions tab — searchable, filterable, exportable.
 */

import React, { useMemo, useState } from 'react';
import { Card, Skeleton, Empty, Tag, TableWrap } from '../components';
import { fmtDuration, fmtNum, fmtTime, useRpc, downloadCsv } from '../helpers';
import { fetchSessions } from '../rpc';
import type { FilterState, SessionRow } from '../types';

export const SessionsTab: React.FC<{ filter: FilterState }> = ({ filter }) => {
    const sessions = useRpc(() => fetchSessions(100), []);
    const [query, setQuery] = useState('');

    const filtered = useMemo<SessionRow[]>(() => {
        if (!sessions.data) return [];
        let rows = sessions.data.sessions;
        if (filter.deviceType !== 'all') rows = rows.filter(r => r.device_type === filter.deviceType);
        if (filter.ageBand !== 'all') rows = rows.filter(r => r.age_band === filter.ageBand);
        if (query.trim()) {
            const q = query.toLowerCase();
            rows = rows.filter(r =>
                r.session_id.toLowerCase().includes(q) ||
                (r.browser ?? '').toLowerCase().includes(q) ||
                (r.modes_played ?? []).some(m => m.toLowerCase().includes(q))
            );
        }
        return rows;
    }, [sessions.data, filter.deviceType, filter.ageBand, query]);

    return (
        <div className="iv-col-12">
            <Card
                title="Session log"
                meta={`${fmtNum(filtered.length)} of ${fmtNum(sessions.data?.sessions.length ?? 0)} sessions · most recent first`}
                actions={
                    <button className="iv-btn iv-btn-sm"
                        disabled={filtered.length === 0}
                        onClick={() => downloadCsv(
                            'sessions',
                            filtered as unknown as Array<Record<string, unknown>>,
                            ['started_at', 'duration_seconds', 'event_count', 'age_band', 'device_type', 'browser', 'reached_wave', 'reached_completion', 'tracker_failed', 'session_id'],
                        )}>Export</button>
                }
            >
                <input
                    type="search"
                    placeholder="Search session ID, browser, or mode…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{
                        width: '100%', padding: '8px 12px',
                        borderRadius: 8, border: '1px solid rgba(63,64,82,0.12)',
                        font: '13px Nunito, system-ui, sans-serif',
                        marginBottom: 12,
                    }}
                />
                {sessions.loading && !sessions.data ? <Skeleton count={5} />
                    : filtered.length === 0
                        ? <Empty message={query ? 'No sessions match this search.' : 'No sessions yet.'} />
                        : (
                            <TableWrap>
                                <table className="iv-table">
                                    <thead>
                                        <tr>
                                            <th>Started</th>
                                            <th>Age</th>
                                            <th>Device</th>
                                            <th>Events</th>
                                            <th>Duration</th>
                                            <th>Modes</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.slice(0, 60).map(s => {
                                            const status = s.reached_completion ? 'completed'
                                                : s.tracker_failed ? 'tracker fail'
                                                : s.reached_wave ? 'wave passed'
                                                : 'drop-off';
                                            const tone = s.reached_completion ? 'green'
                                                : s.tracker_failed ? 'coral'
                                                : s.reached_wave ? 'plum' : 'gray';
                                            return (
                                                <tr key={s.session_id}>
                                                    <td>{fmtTime(s.started_at)}</td>
                                                    <td>{s.age_band ?? '—'}</td>
                                                    <td>
                                                        <div style={{ font: '700 12px Nunito', color: '#1A1B2E' }}>{s.browser ?? '—'}</div>
                                                        <div style={{ fontSize: 11, color: '#6B6F84' }}>{s.device_type ?? '—'}</div>
                                                    </td>
                                                    <td>{fmtNum(s.event_count)}</td>
                                                    <td>{fmtDuration(s.duration_seconds)}</td>
                                                    <td>
                                                        {(s.modes_played ?? []).slice(0, 3).map(m => (
                                                            <Tag key={m} tone="aqua">{m}</Tag>
                                                        ))}
                                                    </td>
                                                    <td><Tag tone={tone}>{status}</Tag></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </TableWrap>
                        )}
            </Card>
        </div>
    );
};

export default SessionsTab;
