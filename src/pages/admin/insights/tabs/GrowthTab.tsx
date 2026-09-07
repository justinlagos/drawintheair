/**
 * Growth tab — the dashboard's landing view (July 2026).
 *
 * Answers the founder's standing question — "are people signing up, and
 * how many users do we actually have?" — without a trip to the Supabase
 * auth page (which only counts adult logins and hides the real picture).
 *
 * Numbers are honest by construction:
 *  • subscriptions are split active / trialing / lapsed, never flattened
 *  • "active kids" = children in classroom sessions, not page hits
 *  • data comes from one admin-gated RPC (dashboard_growth)
 */

import React from 'react';
import { Card, Empty, Kpi, Skeleton, TableWrap } from '../components';
import { CHART_COLORS, days as rangeDays, fmtNum, fmtRelative, useRpc } from '../helpers';
import { fetchGrowth } from '../rpc';
import type { FilterState, GrowthData, GrowthWeekSignups, GrowthWeekActivity } from '../types';

const LAV = CHART_COLORS[0];
const MINT = CHART_COLORS[1];
const SKY = CHART_COLORS[2];

// ── Weekly stacked bars (teachers + parents per week) ───────────────
const WeeklySignupBars: React.FC<{ weeks: GrowthWeekSignups[] }> = ({ weeks }) => {
    if (!weeks.length) return <Empty message="No signup history yet." />;
    const max = Math.max(1, ...weeks.map(w => w.signups));
    return (
        <div>
            <div className="iv-growth-bars" role="img" aria-label="Weekly signups, teachers and parents stacked">
                {weeks.map(w => {
                    const other = Math.max(0, w.signups - w.teachers - w.parents);
                    return (
                        <div key={w.week} className="iv-growth-bar-col"
                             title={`${w.week}: ${w.signups} signups (${w.teachers} teachers, ${w.parents} parents)`}>
                            <div className="iv-growth-bar-stack">
                                {other > 0 && <i style={{ height: `${(other / max) * 100}%`, background: 'rgba(31,27,46,0.18)' }} />}
                                <i style={{ height: `${(w.parents / max) * 100}%`, background: MINT }} />
                                <i style={{ height: `${(w.teachers / max) * 100}%`, background: LAV }} />
                            </div>
                            <span className="iv-growth-bar-n">{w.signups > 0 ? w.signups : ''}</span>
                            <span className="iv-growth-bar-label">
                                {new Date(w.week).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </span>
                        </div>
                    );
                })}
            </div>
            <div className="iv-growth-legend">
                <span><i style={{ background: LAV }} />Teachers</span>
                <span><i style={{ background: MINT }} />Parents</span>
            </div>
        </div>
    );
};

// ── Weekly activity lines (kids in class + play sessions) ───────────
const WeeklyActivityChart: React.FC<{ weeks: GrowthWeekActivity[] }> = ({ weeks }) => {
    if (weeks.length < 2) return <Empty message="Not enough activity history yet." />;
    const W = 720, H = 190, padL = 34, padR = 8, padT = 10, padB = 24;
    const innerW = W - padL - padR, innerH = H - padT - padB;
    const stepX = innerW / (weeks.length - 1);
    const series: Array<{ key: 'classroom_kids' | 'play_sessions'; color: string; label: string }> = [
        { key: 'play_sessions', color: SKY, label: 'Play sessions' },
        { key: 'classroom_kids', color: LAV, label: 'Kids in class' },
    ];
    const max = Math.max(1, ...weeks.flatMap(w => series.map(s => w[s.key])));
    const y = (v: number) => padT + innerH - (v / max) * innerH;
    return (
        <div>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} role="img"
                 aria-label="Weekly activity: play sessions and classroom kids">
                {[0, 0.5, 1].map(f => (
                    <g key={f}>
                        <line x1={padL} x2={W - padR} y1={y(max * f)} y2={y(max * f)}
                              stroke="rgba(31,27,46,0.08)" strokeDasharray="3 3" />
                        <text x={padL - 6} y={y(max * f) + 3} textAnchor="end" fontSize="10"
                              fill="#6B6580" fontFamily="Nunito, system-ui, sans-serif">
                            {Math.round(max * f)}
                        </text>
                    </g>
                ))}
                {weeks.map((w, i) => (i % 2 === 0) && (
                    <text key={w.week} x={padL + i * stepX} y={H - 6} textAnchor="middle" fontSize="9.5"
                          fill="#6B6580" fontFamily="Nunito, system-ui, sans-serif">
                        {new Date(w.week).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </text>
                ))}
                {series.map(s => {
                    const path = weeks.map((w, i) =>
                        `${i === 0 ? 'M' : 'L'}${(padL + i * stepX).toFixed(1)},${y(w[s.key]).toFixed(1)}`).join(' ');
                    return (
                        <g key={s.key}>
                            <path d={path} fill="none" stroke={s.color} strokeWidth={2}
                                  strokeLinecap="round" strokeLinejoin="round" />
                            {weeks.map((w, i) => (
                                <circle key={w.week} cx={padL + i * stepX} cy={y(w[s.key])} r={2.4} fill={s.color} />
                            ))}
                        </g>
                    );
                })}
            </svg>
            <div className="iv-growth-legend">
                {series.map(s => <span key={s.key}><i style={{ background: s.color }} />{s.label}</span>)}
            </div>
        </div>
    );
};

// ── Tab ──────────────────────────────────────────────────────────────
export const GrowthTab: React.FC<{ filter: FilterState }> = ({ filter }) => {
    const d = rangeDays(filter.range);
    const growth = useRpc<GrowthData>(() => fetchGrowth(d), [d]);

    if (growth.loading && !growth.data) {
        return <div className="iv-col-12"><Skeleton count={4} /></div>;
    }
    if (growth.error || !growth.data) {
        return (
            <div className="iv-col-12">
                <Empty message={growth.error?.includes('42501') || growth.error?.toLowerCase().includes('forbidden')
                    ? 'Growth data is restricted to platform admins.'
                    : `Couldn't load growth data: ${growth.error ?? 'unknown error'}`} />
            </div>
        );
    }
    const g = growth.data;
    const subsLive = g.subscriptions.active + g.subscriptions.trialing;

    return (
        <>
            {/* Headline KPIs */}
            <div className="iv-row">
                <div className="iv-col-12">
                    <div className="iv-kpi-grid iv-kpi-grid-6">
                        <Kpi label="Accounts" value={fmtNum(g.totals.accounts)}
                             sub={`+${fmtNum(g.new_in_range.accounts)} in ${g.range_days}d`} />
                        <Kpi label="Parents" value={fmtNum(g.totals.parents)}
                             sub={`+${fmtNum(g.new_in_range.parents)} in ${g.range_days}d`} />
                        <Kpi label="Teachers" value={fmtNum(g.totals.teachers)}
                             sub={`+${fmtNum(g.new_in_range.teachers)} in ${g.range_days}d`} />
                        <Kpi label="Paying" value={fmtNum(g.subscriptions.active)}
                             sub={`${g.subscriptions.paying_conversion_pct ?? 0}% of parents`} />
                        <Kpi label="On trial" value={fmtNum(g.subscriptions.trialing)}
                             sub={g.subscriptions.trial_lapsed > 0 ? `+${g.subscriptions.trial_lapsed} lapsed` : 'no lapsed trials'} />
                        <Kpi label="Kids in class · 7d" value={fmtNum(g.engagement_7d.classroom_kids)}
                             sub={`${fmtNum(g.engagement_7d.live_classes)} live ${g.engagement_7d.live_classes === 1 ? 'class' : 'classes'}`} />
                    </div>
                </div>
            </div>

            {/* Signup pulse + activity */}
            <div className="iv-row">
                <Card title="Weekly signups" meta="last 12 weeks · teachers vs parents" className="iv-col-6">
                    <WeeklySignupBars weeks={g.weekly_signups} />
                    {g.last_signup_at && (
                        <p className="iv-growth-note">
                            Last signup {fmtRelative(g.last_signup_at)}.
                        </p>
                    )}
                </Card>
                <Card title="Weekly usage" meta="last 12 weeks" className="iv-col-6">
                    <WeeklyActivityChart weeks={g.weekly_activity} />
                </Card>
            </div>

            {/* Subscriptions + engagement + latest signups */}
            <div className="iv-row">
                <Card title="Subscriptions" meta="honest split" className="iv-col-4">
                    <ul className="iv-growth-list">
                        <li><span>Paying (active)</span><strong>{fmtNum(g.subscriptions.active)}</strong></li>
                        <li><span>On trial (current)</span><strong>{fmtNum(g.subscriptions.trialing)}</strong></li>
                        <li><span>Trial lapsed</span><strong>{fmtNum(g.subscriptions.trial_lapsed)}</strong></li>
                        <li><span>Canceled / other</span><strong>{fmtNum(g.subscriptions.canceled)}</strong></li>
                        <li className="iv-growth-list-total"><span>Live subscriptions</span><strong>{fmtNum(subsLive)}</strong></li>
                    </ul>
                </Card>
                <Card title="Engagement · last 7 days" meta={g.engagement_7d.last_event_at ? `last event ${fmtRelative(g.engagement_7d.last_event_at)}` : ''} className="iv-col-4">
                    <ul className="iv-growth-list">
                        <li><span>Play sessions</span><strong>{fmtNum(g.engagement_7d.play_sessions)}</strong></li>
                        <li><span>Learning attempts</span><strong>{fmtNum(g.engagement_7d.learning_attempts)}</strong></li>
                        <li><span>Events</span><strong>{fmtNum(g.engagement_7d.events)}</strong></li>
                        <li><span>Kids in classrooms</span><strong>{fmtNum(g.engagement_7d.classroom_kids)}</strong></li>
                        <li><span>Home child profiles</span><strong>{fmtNum(g.totals.child_profiles)}</strong></li>
                        <li><span>Roster children</span><strong>{fmtNum(g.totals.roster_children)}</strong></li>
                    </ul>
                </Card>
                <Card title="Latest signups" meta="masked" className="iv-col-4">
                    {g.latest_signups.length === 0 ? (
                        <Empty message="No signups yet." />
                    ) : (
                        <TableWrap>
                            <table className="iv-table">
                                <thead>
                                    <tr><th>Who</th><th>Role</th><th>Sub</th><th>When</th></tr>
                                </thead>
                                <tbody>
                                    {g.latest_signups.map(s => (
                                        <tr key={`${s.email_masked}-${s.created_at}`}>
                                            <td className="iv-growth-email">{s.email_masked}</td>
                                            <td>{s.role}</td>
                                            <td>{s.has_subscription ? '✓' : '—'}</td>
                                            <td>{fmtRelative(s.created_at)}</td>
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
