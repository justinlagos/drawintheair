/**
 * System Health tab, the nervous-system view.
 *
 * Reads from the in-memory observability health registry
 * (src/lib/observability/health.ts) and surfaces the answers to the
 * questions in the observability brief:
 *
 *   • Did the app crash today?         → totalErrors + lastCriticalError
 *   • Which route crashed?             → incident.scope
 *   • Did the camera fail?             → cameraGrantRate
 *   • Did the tracker fail?            → trackerSuccessRate
 *   • Did a classroom session desync?  → classroomSyncFailures
 *   • Is the site currently up?        → see BetterStack, externally hosted
 *                                       (we surface the dashboard link)
 *
 * Notes:
 *   • This tab reads CLIENT-SIDE counters from THIS admin's tab,
 *     it's a real-time-on-this-device view, not aggregated across
 *     users. Aggregated counts live in Sentry / PostHog and in
 *     the existing Errors / Engagement tabs which read from
 *     analytics_events. Both views are needed.
 *
 *   • Site uptime + last deploy info come from env at build time
 *     (VITE_APP_VERSION / VITE_APP_ENV). The "uptime status"
 *     surface is a link out to BetterStack, true uptime cannot be
 *     reported from inside the same app.
 */

import React, { useEffect, useState } from 'react';
import { Card, Empty, Kpi, Tag, TableWrap } from '../components';
import { fmtNum, fmtRelative } from '../helpers';
import {
    getHealthSnapshot,
    type HealthSnapshot,
    type HealthIncident,
} from '../../../../lib/observability';

const REFRESH_MS = 4_000;

function pctOrDash(v: number | null): string {
    if (v === null || Number.isNaN(v)) return '-';
    return `${(v * 100).toFixed(1)}%`;
}

function rateTone(v: number | null, warnBelow: number, badBelow: number): 'ok' | 'warn' | 'bad' | 'none' {
    if (v === null) return 'none';
    if (v < badBelow) return 'bad';
    if (v < warnBelow) return 'warn';
    return 'ok';
}

const TONE: Record<'ok' | 'warn' | 'bad' | 'none', { bg: string; fg: string; label: string }> = {
    ok:   { bg: '#1a3d1a', fg: '#7ED957', label: 'Healthy' },
    warn: { bg: '#3d2a14', fg: '#FFB14D', label: 'Watch'   },
    bad:  { bg: '#3d1a1a', fg: '#FF6B6B', label: 'Alert'   },
    none: { bg: '#23263a', fg: '#9094B0', label: 'No data' },
};

function SeverityDot({ level }: { level: HealthIncident['level'] }) {
    const colour =
        level === 'fatal'   ? '#FF6B6B' :
        level === 'error'   ? '#FF6B6B' :
        level === 'warning' ? '#FFB14D' :
                              '#55DDE0';
    return (
        <span
            aria-hidden
            style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: colour,
                marginRight: 8,
            }}
        />
    );
}

export const SystemHealthTab: React.FC = () => {
    const [snap, setSnap] = useState<HealthSnapshot>(() => getHealthSnapshot());

    useEffect(() => {
        const id = window.setInterval(() => setSnap(getHealthSnapshot()), REFRESH_MS);
        return () => window.clearInterval(id);
    }, []);

    const camTone = rateTone(snap.cameraGrantRate, 0.80, 0.60);
    const trkTone = rateTone(snap.trackerSuccessRate, 0.95, 0.80);
    const errTone = snap.totalErrors === 0 ? 'ok' : snap.totalErrors < 5 ? 'warn' : 'bad';
    const overallTone =
        errTone === 'bad' || camTone === 'bad' || trkTone === 'bad' ? 'bad' :
        errTone === 'warn' || camTone === 'warn' || trkTone === 'warn' ? 'warn' : 'ok';

    const uptimeUrl = 'https://draw-in-the-air.betteruptime.com/'; // BetterStack status page (created 2026-05-24)

    return (
        <>
            {/* ── Status strip ───────────────────────────────────────── */}
            <div className="iv-col-12">
                <Card
                    title="System status"
                    meta={`Live · refreshed ${fmtRelative(new Date(snap.snapshotAt).toISOString())}`}
                >
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <Tag tone={overallTone === 'ok' ? 'green' : overallTone === 'warn' ? 'coral' : 'coral'}>
                            {TONE[overallTone].label}
                        </Tag>
                        <Tag tone="gray">Release: {snap.release}</Tag>
                        <Tag tone="gray">Env: {snap.environment}</Tag>
                        <Tag tone="aqua">Active class sessions: {snap.activeClassSessions}</Tag>
                        <a
                            href={uptimeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="iv-btn iv-btn-sm"
                            style={{ marginLeft: 'auto' }}
                        >
                            Open BetterStack ↗
                        </a>
                    </div>
                </Card>
            </div>

            {/* ── KPI row ──────────────────────────────────────────── */}
            <div className="iv-col-3">
                <Kpi label="Open issue scopes" value={fmtNum(snap.openIssues)} sub="distinct subsystems erroring" />
            </div>
            <div className="iv-col-3">
                <Kpi label="Errors (this tab)" value={fmtNum(snap.totalErrors)} sub="captured since page load" />
            </div>
            <div className="iv-col-3">
                <Kpi label="Camera grant rate" value={pctOrDash(snap.cameraGrantRate)} sub={`${snap.cameraGranted} / ${snap.cameraRequested}`} />
            </div>
            <div className="iv-col-3">
                <Kpi label="Tracker success" value={pctOrDash(snap.trackerSuccessRate)} sub={`${snap.trackerInitSucceeded} / ${snap.trackerInitStarted}`} />
            </div>

            <div className="iv-col-3">
                <Kpi label="Camera denials" value={fmtNum(snap.cameraDenied)} sub="permission denied" />
            </div>
            <div className="iv-col-3">
                <Kpi label="Tracker init failures" value={fmtNum(snap.trackerInitFailed)} sub="MediaPipe / GPU" />
            </div>
            <div className="iv-col-3">
                <Kpi label="Supabase RPC failures" value={fmtNum(snap.supabaseRpcFailures)} sub="5xx + network errors" />
            </div>
            <div className="iv-col-3">
                <Kpi label="Classroom sync failures" value={fmtNum(snap.classroomSyncFailures)} sub="realtime desyncs" />
            </div>

            {/* ── Last critical error ──────────────────────────────── */}
            <div className="iv-col-12">
                <Card
                    title="Last critical error"
                    meta={snap.lastCriticalError ? fmtRelative(new Date(snap.lastCriticalError.at).toISOString()) : '-'}
                >
                    {!snap.lastCriticalError ? (
                        <Empty message={<><strong>All clear.</strong> No critical errors this session.</>} />
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <SeverityDot level={snap.lastCriticalError.level} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                    {snap.lastCriticalError.scope} · {snap.lastCriticalError.level}
                                </div>
                                <code
                                    style={{
                                        display: 'block',
                                        background: '#1a1d2e',
                                        padding: '8px 12px',
                                        borderRadius: 6,
                                        fontSize: 13,
                                        color: '#e5e7eb',
                                        overflow: 'auto',
                                        maxHeight: 80,
                                    }}
                                >
                                    {snap.lastCriticalError.message}
                                </code>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* ── Incident timeline ────────────────────────────────── */}
            <div className="iv-col-12">
                <Card title="Recent incident timeline" meta={`${snap.incidents.length} captured`}>
                    {snap.incidents.length === 0 ? (
                        <Empty message={<>No incidents in this session.</>} />
                    ) : (
                        <TableWrap>
                            <table className="iv-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 110 }}>When</th>
                                        <th style={{ width: 130 }}>Scope</th>
                                        <th style={{ width: 90 }}>Level</th>
                                        <th>Message</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {snap.incidents.map((inc, i) => (
                                        <tr key={`${inc.at}-${i}`}>
                                            <td>{fmtRelative(new Date(inc.at).toISOString())}</td>
                                            <td>{inc.scope}</td>
                                            <td>
                                                <SeverityDot level={inc.level} />
                                                {inc.level}
                                            </td>
                                            <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{inc.message}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </TableWrap>
                    )}
                </Card>
            </div>

            {/* ── Footnote ─────────────────────────────────────────── */}
            <div className="iv-col-12" style={{ opacity: 0.7, fontSize: 12, paddingTop: 8 }}>
                Live counters reflect THIS admin tab. For population-level
                rollups see the Errors and Engagement tabs (Supabase
                analytics_events), and your Sentry / PostHog / BetterStack
                dashboards.
            </div>
        </>
    );
};
