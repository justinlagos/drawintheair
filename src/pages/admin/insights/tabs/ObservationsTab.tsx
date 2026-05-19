/**
 * Observations tab — Document B §9 Human Observation Layer.
 *
 * Renders the qualitative side of LIOS: tag distribution per family,
 * per-classroom rollup, engagement-vs-mastery scatter (the chart that
 * protects against vanity metrics), and a recent observations log
 * with full tag chips + free-text note.
 *
 * Engineering-aware: the tab also surfaces "no observations yet"
 * empty states so the team sees clearly when the teacher tagging
 * surface hasn't been touched in a given classroom.
 */

import React, { useMemo } from 'react';
import { Card, Skeleton, Empty, Tag, TableWrap } from '../components';
import { fmtNum, days as rangeDays, useRpc } from '../helpers';
import { fetchObservations } from '../rpc';
import type {
    FilterState, ObservationsData, ObservationFamily,
} from '../types';

const FAMILY_ORDER: ObservationFamily[] = [
    'focus', 'affect', 'independence', 'social', 'notable',
];

const FAMILY_LABELS: Record<ObservationFamily, string> = {
    focus:        'Focus',
    affect:       'Affect',
    independence: 'Independence',
    social:       'Social',
    notable:      'Notable',
};

const TAG_TONES: Record<string, 'green' | 'aqua' | 'plum' | 'coral' | 'gray'> = {
    // focus
    focused:                'green',
    distracted:             'coral',
    disengaged:             'coral',
    // affect
    confident:              'green',
    calm:                   'aqua',
    hesitant:               'plum',
    frustrated:             'coral',
    // independence
    independent:            'green',
    supported:              'aqua',
    required_intervention:  'coral',
    // social
    alone:                  'gray',
    collaborated:           'aqua',
    disrupted_by_peer:      'coral',
    // notable
    new_behaviour_good:     'green',
    new_behaviour_concern:  'coral',
    help_needed:            'coral',
    breakthrough:           'green',
    avoided_activity:       'coral',
};
const tagTone = (t: string) => TAG_TONES[t] ?? 'gray';
const prettyTag = (t: string) => t.replace(/_/g, ' ');

export const ObservationsTab: React.FC<{ filter: FilterState }> = ({ filter }) => {
    const d = rangeDays(filter.range);
    const obs = useRpc<ObservationsData>(() => fetchObservations(Math.max(d, 30)), [d]);

    const tagsByFamily = useMemo(() => {
        if (!obs.data) return new Map<ObservationFamily, { tag: string; n: number }[]>();
        const m = new Map<ObservationFamily, { tag: string; n: number }[]>();
        for (const fam of FAMILY_ORDER) m.set(fam, []);
        obs.data.by_tag.forEach(t => {
            m.get(t.family as ObservationFamily)?.push({ tag: t.tag, n: t.n });
        });
        return m;
    }, [obs.data]);

    if (obs.loading && !obs.data) {
        return <div className="iv-col-12"><Skeleton count={3} /></div>;
    }
    if (!obs.data || obs.data.total === 0) {
        return (
            <div className="iv-col-12">
                <Card title="Human Observation Layer"
                      meta="Document B §9 — qualitative companion to telemetry">
                    <Empty message={<>
                        <strong>No teacher observations recorded yet.</strong><br />
                        Teachers tag classroom sessions via the tagging surface
                        on tablet web. Once tags start flowing, this tab fills
                        with tag distributions, classroom rollups, and the
                        engagement-vs-mastery scatter that protects against
                        vanity metrics.
                    </>} />
                </Card>
            </div>
        );
    }

    const o = obs.data;

    return (
        <>
            {/* Summary strip */}
            <div className="iv-col-12">
                <div style={{
                    display: 'flex', gap: 24, padding: '12px 16px',
                    background: 'rgba(108, 63, 164, 0.04)',
                    border: '1px solid rgba(108, 63, 164, 0.12)',
                    borderRadius: 12, marginBottom: 12,
                    font: '13px/1.4 Nunito, system-ui, sans-serif',
                    flexWrap: 'wrap',
                }}>
                    <KpiInline label="Observations"     value={fmtNum(o.total)} />
                    <KpiInline label="Learners observed" value={fmtNum(o.distinct_learners_observed)} />
                    <KpiInline label="Classrooms"        value={fmtNum(o.distinct_classrooms)} />
                    <KpiInline label="Window"            value={`${o.days}d`} />
                </div>
            </div>

            {/* Tag distribution by family */}
            <div className="iv-col-12">
                <Card title="Tag distribution"
                      meta="What teachers are seeing in their classrooms">
                    <div style={{ display: 'grid', gap: 16,
                                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                        {FAMILY_ORDER.map(fam => {
                            const tags = tagsByFamily.get(fam) ?? [];
                            return (
                                <div key={fam}>
                                    <div style={{
                                        font: '700 11px Nunito, system-ui, sans-serif',
                                        color: '#6B6F84', textTransform: 'uppercase',
                                        letterSpacing: 0.5, marginBottom: 6,
                                    }}>{FAMILY_LABELS[fam]}</div>
                                    {tags.length === 0
                                        ? <em style={{ color: '#B8BACF', fontSize: 12 }}>None tagged</em>
                                        : (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                {tags.map(t => (
                                                    <span key={t.tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                        <Tag tone={tagTone(t.tag)}>{prettyTag(t.tag)}</Tag>
                                                        <span style={{ fontSize: 11, color: '#6B6F84' }}>{t.n}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>

            {/* Engagement vs Mastery scatter — the anti-vanity chart */}
            <div className="iv-col-12">
                <Card title="Engagement vs Mastery"
                      meta="Document B §7.2 — high engagement + low mastery is the intervention list">
                    {o.engagement_vs_mastery.length === 0
                        ? <Empty message="No data yet." />
                        : <EngVsMastScatter data={o.engagement_vs_mastery} />}
                </Card>
            </div>

            {/* Classroom rollup */}
            <div className="iv-col-6">
                <Card title="Per-classroom observation volume"
                      meta={`${o.distinct_classrooms} classrooms`}>
                    {o.by_classroom.length === 0
                        ? <Empty message="No classroom-tagged observations yet." />
                        : (
                            <TableWrap>
                                <table className="iv-table">
                                    <thead><tr><th>Classroom</th><th>Observations</th><th>Learners</th></tr></thead>
                                    <tbody>
                                        {o.by_classroom.map(c => (
                                            <tr key={c.classroom_code}>
                                                <td style={{ fontFamily: 'ui-monospace, monospace' }}>{c.classroom_code}</td>
                                                <td>{fmtNum(c.n_observations)}</td>
                                                <td>{fmtNum(c.n_learners)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </TableWrap>
                        )}
                </Card>
            </div>

            {/* Recent observations log */}
            <div className="iv-col-6">
                <Card title="Recent observations"
                      meta={`${o.recent.length} most recent`}>
                    {o.recent.length === 0
                        ? <Empty message="No recent observations." />
                        : (
                            <div style={{ display: 'grid', gap: 10 }}>
                                {o.recent.slice(0, 10).map(r => (
                                    <div key={r.id} style={{
                                        background: 'var(--paper)',
                                        border: '1px solid var(--line)',
                                        borderRadius: 10,
                                        padding: '10px 12px',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between',
                                                      fontSize: 11, color: '#6B6F84', marginBottom: 6 }}>
                                            <span>
                                                <strong style={{ color: '#3F4052' }}>
                                                    {r.device_id.slice(0, 8)}
                                                </strong>
                                                {' · '}{r.age_band ?? '—'}
                                                {r.classroom_code && ` · ${r.classroom_code}`}
                                            </span>
                                            <span>{new Date(r.recorded_at).toLocaleString(undefined,
                                                { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                            {[
                                                ...r.focus_tags, ...r.affect_tags,
                                                ...r.independence_tags, ...r.social_tags,
                                                ...r.notable_tags,
                                            ].map(t => (
                                                <Tag key={t} tone={tagTone(t)}>{prettyTag(t)}</Tag>
                                            ))}
                                        </div>
                                        {r.note && (
                                            <div style={{ marginTop: 6, fontSize: 12, color: '#3F4052',
                                                          fontStyle: 'italic' }}>
                                                "{r.note}"
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                </Card>
            </div>
        </>
    );
};

// ── Engagement vs Mastery scatter (inline SVG) ─────────────────────

const EngVsMastScatter: React.FC<{
    data: Array<{
        device_id: string;
        focus: string[] | null;
        affect: string[] | null;
        n_attempts: number;
        n_mastered: number;
    }>;
}> = ({ data }) => {
    const W = 720, H = 280;
    const padL = 48, padR = 12, padT = 14, padB = 36;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    const maxAttempts = Math.max(...data.map(d => d.n_attempts), 1);
    const maxMastered = Math.max(...data.map(d => d.n_mastered), 1);

    const xOf = (n: number) => padL + (n / maxAttempts) * innerW;
    const yOf = (n: number) => padT + innerH - (n / maxMastered) * innerH;

    const ofConcern = (d: { focus: string[] | null; affect: string[] | null }) => {
        const all = [...(d.focus ?? []), ...(d.affect ?? [])];
        return all.includes('frustrated') || all.includes('disengaged');
    };

    return (
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
             style={{ width: '100%', height: 'auto' }} role="img"
             aria-label="Engagement vs mastery scatter">
            {/* Grid */}
            {[0, 0.25, 0.5, 0.75, 1].map(f => {
                const y = padT + innerH * (1 - f);
                return (
                    <g key={f}>
                        <line x1={padL} x2={W - padR} y1={y} y2={y}
                              stroke="rgba(63,64,82,0.10)" strokeDasharray="3 3" />
                        <text x={padL - 6} y={y + 3} textAnchor="end"
                              fontSize="10" fill="#6B6F84"
                              fontFamily="Nunito, system-ui, sans-serif">
                            {Math.round(f * maxMastered)}
                        </text>
                    </g>
                );
            })}
            {/* Axis labels */}
            <text x={padL + innerW / 2} y={H - 8} textAnchor="middle"
                  fontSize="11" fill="#3F4052" fontFamily="Nunito, system-ui, sans-serif"
                  fontWeight="700">Attempts (engagement →)</text>
            <text x={12} y={padT + innerH / 2} textAnchor="middle"
                  fontSize="11" fill="#3F4052" fontFamily="Nunito, system-ui, sans-serif"
                  fontWeight="700"
                  transform={`rotate(-90, 12, ${padT + innerH / 2})`}>Mastered ↑</text>
            {/* Points */}
            {data.map(d => (
                <circle key={d.device_id}
                        cx={xOf(d.n_attempts)} cy={yOf(d.n_mastered)} r={5}
                        fill={ofConcern(d) ? '#FF6B6B' : '#7ED957'}
                        opacity={0.75}>
                    <title>{`${d.device_id.slice(0, 8)} — ${d.n_attempts} attempts, ${d.n_mastered} mastered`}</title>
                </circle>
            ))}
        </svg>
    );
};

const KpiInline: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div>
        <div style={{ color: '#6B6F84', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {label}
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#2A2B3D' }}>{value}</div>
    </div>
);
