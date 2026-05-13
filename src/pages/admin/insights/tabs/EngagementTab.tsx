/**
 * Engagement tab — what kids actually play, how long, where they get stuck.
 *
 * Three sections:
 *   1. Mode performance cards (one per mode): started, completion,
 *      median + p90 time-on-task, stuck rate, daily-plays sparkline.
 *   2. Time-on-task chart: horizontal bars by median seconds.
 *   3. Friction map: stuck rate vs abandon rate (which modes need help).
 */

import React from 'react';
import {
    Card, Skeleton, Empty, Tag, InlineBar, TableWrap, Sparkline,
} from '../components';
import { fmtNum, fmtPct, fmtDuration, days as rangeDays, useRpc, downloadCsv } from '../helpers';
import { fetchEngagementDeep } from '../rpc';
import type { FilterState, EngagementModeRow } from '../types';

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
const label = (m: string) => MODE_LABELS[m] ?? m;

export const EngagementTab: React.FC<{ filter: FilterState }> = ({ filter }) => {
    const d = rangeDays(filter.range);
    const eng = useRpc(() => fetchEngagementDeep(d), [d]);

    if (eng.loading && !eng.data) return <div className="iv-col-12"><Skeleton count={4} /></div>;
    if (!eng.data) return <div className="iv-col-12"><Empty message="No engagement data." /></div>;

    const modes = eng.data.modes;
    if (modes.length === 0) {
        return <div className="iv-col-12"><Empty message={<><strong>No mode plays yet.</strong> Once kids start playing, engagement breaks down by mode here.</>} /></div>;
    }

    // Summary KPIs across all modes
    const totalStarted = modes.reduce((s, m) => s + m.started, 0);
    const totalCompleted = modes.reduce((s, m) => s + m.completed, 0);
    const totalStuck = modes.reduce((s, m) => s + m.stuck, 0);
    const closedModes = modes.filter(m => !m.is_open_ended);
    const overallCompletion = closedModes.length > 0
        ? closedModes.reduce((s, m) => s + (m.completion_rate_pct ?? 0), 0) / closedModes.length
        : null;
    const medianAcrossModes = closedModes.length > 0
        ? closedModes.reduce((s, m) => s + m.median_seconds, 0) / closedModes.length
        : null;

    return (
        <>
            {/* Summary strip */}
            <div className="iv-col-12 iv-kpi-grid">
                <Kpi label="Mode plays" value={fmtNum(totalStarted)} sub={`across ${modes.length} modes`} />
                <Kpi label="Completions" value={fmtNum(totalCompleted)} sub="finished activities" />
                <Kpi label="Avg completion rate" value={fmtPct(overallCompletion)} sub="across non-sandbox modes" />
                <Kpi label="Avg time-on-task" value={fmtDuration(medianAcrossModes)} sub="median per-mode play length" />
                <Kpi label="Stuck moments" value={fmtNum(totalStuck)} sub="30s+ idle during a stage" />
            </div>

            {/* Mode-by-mode cards */}
            <div className="iv-col-12">
                <Card
                    title="Per-mode performance"
                    meta={`Last ${d} day${d === 1 ? '' : 's'}`}
                    actions={
                        <button className="iv-btn iv-btn-sm"
                            onClick={() => downloadCsv(
                                `engagement-${d}d`,
                                modes as unknown as Array<Record<string, unknown>>,
                                ['game_mode', 'started', 'completed', 'completion_rate_pct',
                                 'median_seconds', 'p90_seconds', 'stuck_rate_pct',
                                 'abandon_rate_pct', 'distinct_devices', 'is_open_ended'],
                            )}>Export</button>
                    }
                >
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                        gap: 12,
                    }}>
                        {modes.map(m => <ModeCard key={m.game_mode} m={m} />)}
                    </div>
                </Card>
            </div>

            {/* Time-on-task ranking */}
            <div className="iv-col-6">
                <Card title="Time on task — longest sessions" meta="Median seconds per session, ranked">
                    {[...modes].sort((a, b) => b.median_seconds - a.median_seconds).slice(0, 8).map(m => {
                        const max = Math.max(...modes.map(x => x.median_seconds), 1);
                        const pct = (m.median_seconds / max) * 100;
                        return (
                            <div key={m.game_mode} style={{
                                display: 'grid', gridTemplateColumns: '120px 1fr 60px 56px',
                                alignItems: 'center', gap: 10, padding: '6px 0',
                                borderBottom: '1px solid var(--line)',
                            }}>
                                <span style={{ font: '600 12.5px Nunito' }}>{label(m.game_mode)}</span>
                                <InlineBar pct={pct} />
                                <span style={{ font: '700 12px Fredoka', textAlign: 'right' }}>{fmtDuration(m.median_seconds)}</span>
                                <span style={{ font: '600 10.5px Nunito', color: 'var(--flat)', textAlign: 'right' }}>p90 {fmtDuration(m.p90_seconds)}</span>
                            </div>
                        );
                    })}
                </Card>
            </div>

            {/* Friction map */}
            <div className="iv-col-6">
                <Card title="Friction map — where kids get stuck" meta="Higher % = more kids need help">
                    <TableWrap>
                        <table className="iv-table">
                            <thead>
                                <tr>
                                    <th>Mode</th>
                                    <th>Stuck rate</th>
                                    <th>Abandon rate</th>
                                    <th>Signal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...modes].sort((a, b) => b.stuck_rate_pct - a.stuck_rate_pct).slice(0, 8).map(m => {
                                    // Sandbox modes (Free Paint) have no goal, so "abandon" just means
                                    // "the kid moved on" — that is not a difficulty signal and should
                                    // never trigger the "too hard" badge. Surface them as exploratory.
                                    const signal = m.is_open_ended
                                        ? { tone: 'gray' as const, text: 'exploratory' }
                                        : m.stuck_rate_pct > 30 ? { tone: 'coral' as const, text: 'needs scaffolding' }
                                        : m.abandon_rate_pct > 40 ? { tone: 'coral' as const, text: 'too hard' }
                                        : m.stuck_rate_pct > 15 ? { tone: 'aqua' as const, text: 'some friction' }
                                        : { tone: 'green' as const, text: 'healthy' };
                                    return (
                                        <tr key={m.game_mode}>
                                            <td><Tag tone="aqua">{label(m.game_mode)}</Tag></td>
                                            <td>{fmtPct(m.stuck_rate_pct)}</td>
                                            <td>{m.is_open_ended ? '—' : fmtPct(m.abandon_rate_pct)}</td>
                                            <td><Tag tone={signal.tone}>{signal.text}</Tag></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </TableWrap>
                </Card>
            </div>
        </>
    );
};

// ── Mode card — packs a lot in a small footprint ─────────────────────
const ModeCard: React.FC<{ m: EngagementModeRow }> = ({ m }) => (
    <div className="iv-mode-card">
        <div className="iv-mode-card-head">
            <span className="iv-mode-card-title">{label(m.game_mode)}</span>
            {m.is_open_ended && <Tag tone="gray">sandbox</Tag>}
            <span style={{ marginLeft: 'auto' }}>
                <Sparkline points={m.daily} width={70} height={18} />
            </span>
        </div>

        <div className="iv-mode-card-grid">
            <div>
                <div className="iv-mode-stat-label">Plays</div>
                <div className="iv-mode-stat-value">{fmtNum(m.started)}</div>
            </div>
            <div>
                <div className="iv-mode-stat-label">Kids</div>
                <div className="iv-mode-stat-value">{fmtNum(m.distinct_devices)}</div>
            </div>
            <div>
                <div className="iv-mode-stat-label">Completion</div>
                <div className="iv-mode-stat-value">{m.is_open_ended ? '—' : fmtPct(m.completion_rate_pct)}</div>
            </div>
            <div>
                <div className="iv-mode-stat-label">Median time</div>
                <div className="iv-mode-stat-value">{fmtDuration(m.median_seconds)}</div>
            </div>
            <div>
                <div className="iv-mode-stat-label">p90 time</div>
                <div className="iv-mode-stat-value">{fmtDuration(m.p90_seconds)}</div>
            </div>
            <div>
                <div className="iv-mode-stat-label">Stuck</div>
                <div className="iv-mode-stat-value" style={{ color: m.stuck_rate_pct > 30 ? 'var(--bad)' : undefined }}>
                    {fmtPct(m.stuck_rate_pct)}
                </div>
            </div>
        </div>
    </div>
);

const Kpi: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
    <div className="iv-kpi">
        <div className="iv-kpi-label">{label}</div>
        <div>
            <div className="iv-kpi-value">{value}</div>
            {sub && <div className="iv-kpi-value-sub">{sub}</div>}
        </div>
    </div>
);

export default EngagementTab;
