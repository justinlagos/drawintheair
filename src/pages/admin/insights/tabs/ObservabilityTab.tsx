/**
 * Observability tab — Sprint 6 engineering surface.
 *
 * Renders the four SLO status tiles, the ingestion + idempotency +
 * latency strip, the 24-hour event-rate sparkline, and the rolling
 * anomaly log. Engineering-only — admin allow-list gates the dashboard.
 */

import React from 'react';
import { Card, Skeleton, Empty, TableWrap } from '../components';
import { fmtNum, days as rangeDays, useRpc } from '../helpers';
import { fetchObservability } from '../rpc';
import type { FilterState, ObservabilityData, SloBlock, SloStatus } from '../types';

const SEV_TONES: Record<'info' | 'warn' | 'critical', string> = {
    info:     '#55DDE0',
    warn:     '#FFB14D',
    critical: '#FF6B6B',
};
const SLO_TONES: Record<SloStatus, string> = {
    green:   '#7ED957',
    amber:   '#FFB14D',
    red:     '#FF6B6B',
    no_data: '#9094B0',
};

const SLO_LABELS: Record<string, { label: string; unit: string }> = {
    event_durability:          { label: 'Event durability (envelope coverage)', unit: '%' },
    idempotency:               { label: 'Idempotency (duplicate rate)',         unit: '%' },
    ingestion_latency_p99_ms:  { label: 'Ingestion latency p99',                 unit: 'ms' },
    session_quality:           { label: 'Session quality (publication-eligible)',unit: '%' },
    cron_health:               { label: 'Cron pipeline health',                  unit: '' },
};

export const ObservabilityTab: React.FC<{ filter: FilterState }> = ({ filter }) => {
    const d = rangeDays(filter.range);
    const ob = useRpc<ObservabilityData>(() => fetchObservability(d), [d]);

    if (ob.loading && !ob.data) return <div className="iv-col-12"><Skeleton count={3} /></div>;
    if (ob.error) return (
        <div className="iv-col-12">
            <Empty message={<>Observability RPC error: <code>{ob.error}</code></>} />
        </div>
    );
    if (!ob.data) return <div className="iv-col-12"><Empty message="No data." /></div>;

    const o = ob.data;
    const sloEntries: Array<[string, SloBlock]> = [
        ['event_durability',         o.slos.event_durability],
        ['idempotency',              o.slos.idempotency],
        ['ingestion_latency_p99_ms', o.slos.ingestion_latency_p99_ms],
        ['session_quality',          o.slos.session_quality],
        ['cron_health',              o.slos.cron_health],
    ];

    const max24h = Math.max(...o.by_hour_24h.map(p => p.n), 1);

    return (
        <>
            {/* Engineering banner */}
            <div className="iv-col-12">
                <div style={{
                    background: 'rgba(108, 63, 164, 0.04)',
                    border: '1px solid rgba(108, 63, 164, 0.16)',
                    borderRadius: 12, padding: '10px 14px', marginBottom: 12,
                    font: '12.5px/1.4 Nunito, system-ui, sans-serif', color: '#3F4052',
                }}>
                    <strong style={{ color: '#6C3FA4' }}>Observability + SLOs.</strong>{' '}
                    Engineering surface for pipeline health, ingestion integrity,
                    latency budgets, and the rolling anomaly log. Anomaly detector
                    runs every 5 minutes inside the cron pipeline.
                </div>
            </div>

            {/* SLO tiles */}
            <div className="iv-col-12">
                <Card title="SLO status" meta={`Live targets · ${o.days}d window`}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: 10,
                    }}>
                        {sloEntries.map(([key, slo]) => (
                            <SloTile key={key} sloKey={key} slo={slo} />
                        ))}
                    </div>
                </Card>
            </div>

            {/* Ingestion + latency summary */}
            <div className="iv-col-6">
                <Card title="Ingestion" meta="Event envelope coverage">
                    <table className="iv-table" style={{ fontSize: 12 }}>
                        <tbody>
                            <tr><th style={{textAlign:'left'}}>Total events</th><td>{fmtNum(o.ingest.events_total)}</td></tr>
                            <tr><th style={{textAlign:'left'}}>With LIOS envelope</th><td>{fmtNum(o.ingest.events_with_envelope)}</td></tr>
                            <tr><th style={{textAlign:'left'}}>Legacy (no envelope)</th><td>{fmtNum(o.ingest.events_legacy)}</td></tr>
                            <tr><th style={{textAlign:'left'}}>Distinct event_uids</th><td>{fmtNum(o.ingest.distinct_event_uids)}</td></tr>
                            <tr><th style={{textAlign:'left'}}>Duplicates accepted</th>
                                <td style={{color: (o.ingest.events_with_envelope - o.ingest.distinct_event_uids) > 0 ? '#C13A3A' : '#1f7a3a'}}>
                                    {fmtNum(o.ingest.events_with_envelope - o.ingest.distinct_event_uids)}
                                </td></tr>
                            <tr><th style={{textAlign:'left'}}>Hours observed</th><td>{fmtNum(o.ingest.hours_observed)}</td></tr>
                        </tbody>
                    </table>
                </Card>
            </div>

            <div className="iv-col-6">
                <Card title="Client → server latency" meta="client_ts → occurred_at">
                    {o.latency.rows_with_client_ts === 0
                        ? <Empty message="No client_ts data yet — deploy the LIOS-envelope client to populate this." />
                        : (
                            <table className="iv-table" style={{ fontSize: 12 }}>
                                <tbody>
                                    <tr><th style={{textAlign:'left'}}>Rows with client_ts</th>
                                        <td>{fmtNum(o.latency.rows_with_client_ts)}</td></tr>
                                    <tr><th style={{textAlign:'left'}}>p50</th><td>{fmtNum(o.latency.p50_latency_ms)} ms</td></tr>
                                    <tr><th style={{textAlign:'left'}}>p95</th><td>{fmtNum(o.latency.p95_latency_ms)} ms</td></tr>
                                    <tr><th style={{textAlign:'left'}}>p99</th><td>{fmtNum(o.latency.p99_latency_ms)} ms</td></tr>
                                </tbody>
                            </table>
                        )}
                </Card>
            </div>

            {/* 24h event-rate sparkline */}
            <div className="iv-col-12">
                <Card title="Event rate — last 24 hours"
                      meta={`${o.by_hour_24h.length} hourly buckets · max ${fmtNum(max24h)} events`}>
                    {o.by_hour_24h.length === 0
                        ? <Empty message="No data yet." />
                        : (
                            <div style={{
                                display: 'flex', alignItems: 'flex-end', gap: 2,
                                height: 80, padding: '4px 0',
                            }}>
                                {o.by_hour_24h.map(p => {
                                    const h = (p.n / max24h) * 76;
                                    return (
                                        <div key={p.h}
                                             title={`${new Date(p.h).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })} — ${fmtNum(p.n)} events`}
                                             style={{
                                                 flex: 1, height: `${h}px`,
                                                 background: 'linear-gradient(180deg, #7E4FB8, #6C3FA4)',
                                                 borderRadius: '3px 3px 0 0',
                                                 minHeight: 2,
                                             }} />
                                    );
                                })}
                            </div>
                        )}
                </Card>
            </div>

            {/* Anomaly log */}
            <div className="iv-col-12">
                <Card title="Recent anomalies"
                      meta={`${o.recent_anomalies.length} since ${o.days}d ago`}>
                    {o.recent_anomalies.length === 0
                        ? <Empty message="No anomalies detected. System is operating within baseline thresholds." />
                        : (
                            <TableWrap>
                                <table className="iv-table" style={{ fontSize: 12 }}>
                                    <thead>
                                        <tr>
                                            <th>When</th>
                                            <th>Severity</th>
                                            <th>Metric</th>
                                            <th>Current</th>
                                            <th>Baseline (μ ± σ)</th>
                                            <th>z</th>
                                            <th>Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {o.recent_anomalies.map(a => (
                                            <tr key={a.id}>
                                                <td>{new Date(a.detected_at).toLocaleString(undefined,
                                                    { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                                <td>
                                                    <span style={{
                                                        background: SEV_TONES[a.severity],
                                                        color: '#1A1B2E',
                                                        padding: '2px 8px', borderRadius: 6,
                                                        fontSize: 10, fontWeight: 700,
                                                    }}>{a.severity}</span>
                                                </td>
                                                <td style={{ fontFamily: 'ui-monospace, monospace' }}>{a.metric}</td>
                                                <td>{a.current_value != null ? Number(a.current_value).toFixed(2) : '—'}</td>
                                                <td>
                                                    {a.baseline_mean != null ? Number(a.baseline_mean).toFixed(2) : '—'}
                                                    {a.baseline_sd != null && ` ± ${Number(a.baseline_sd).toFixed(2)}`}
                                                </td>
                                                <td>{a.z_score != null ? Number(a.z_score).toFixed(2) : '—'}</td>
                                                <td style={{ maxWidth: 420, fontSize: 11 }}>{a.reason}</td>
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

const SloTile: React.FC<{ sloKey: string; slo: SloBlock }> = ({ sloKey, slo }) => {
    const meta = SLO_LABELS[sloKey] ?? { label: sloKey, unit: '' };
    const tone = SLO_TONES[slo.status];
    const currentDisplay = (() => {
        if (slo.current_pct != null) return `${slo.current_pct.toFixed(2)}${meta.unit}`;
        if (slo.current != null)     return `${Number(slo.current).toFixed(0)}${meta.unit}`;
        if (slo.current_failures_24h != null)
            return `${slo.current_failures_24h} failure${slo.current_failures_24h === 1 ? '' : 's'}`;
        return '—';
    })();
    const targetDisplay = (() => {
        if (slo.target_pct != null)       return `Target ≥ ${slo.target_pct}${meta.unit}`;
        if (slo.target_pct_max != null)   return `Target ≤ ${slo.target_pct_max}${meta.unit}`;
        if (slo.target_max != null)       return `Target < ${slo.target_max}${meta.unit}`;
        if (slo.target_failures_24h != null) return `Target ${slo.target_failures_24h} failures/24h`;
        return '';
    })();
    return (
        <div style={{
            background: 'var(--card)',
            border: `2px solid ${tone}`,
            borderRadius: 12, padding: '10px 12px',
            display: 'flex', flexDirection: 'column', gap: 4,
        }}>
            <div style={{
                font: '700 10.5px Nunito, system-ui, sans-serif',
                color: 'var(--flat)', textTransform: 'uppercase', letterSpacing: 0.5,
            }}>{meta.label}</div>
            <div style={{
                font: '700 20px Fredoka, system-ui, sans-serif',
                color: 'var(--ink)',
            }}>{currentDisplay}</div>
            <div style={{ font: '11px Nunito, system-ui, sans-serif', color: 'var(--flat)' }}>
                {targetDisplay}
            </div>
            <div style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                color: tone, letterSpacing: 0.6, marginTop: 2,
            }}>{slo.status}</div>
        </div>
    );
};
