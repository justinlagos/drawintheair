/**
 * Friction tab, engineering observability for the 8 cognitive
 * friction detectors (Document B §4.1).
 *
 * Engineering-only surface for threshold calibration. The
 * teacher-facing view will be a separate ship once v1 thresholds
 * are validated against ground-truth tags (Sprint 4+).
 *
 * Sections:
 *   1. Total firings + days-in-window strip
 *   2. Per-detector count bars (8 detectors, sorted by frequency)
 *   3. Per-mode × detector heatmap (which game modes trigger which
 *      friction states)
 *   4. Threshold panel, the v1 rules in plain language, for
 *      engineering reference during calibration
 *   5. Recent firings list with full meta JSON
 */

import React, { useMemo } from 'react';
import { Card, Skeleton, Empty } from '../components';
import { fmtNum, days as rangeDays, useRpc } from '../helpers';
import { fetchFrictionEngineering } from '../rpc';
import type { FilterState, FrictionEngineeringData, FrictionModeCount } from '../types';

const DETECTOR_LABELS: Record<string, { short: string; long: string; tone: string }> = {
    'friction_successful_learning_detected':
        { short: 'Successful learning',  tone: '#7ED957',
          long: 'In the desirable-difficulty band, completed, low stuck count.' },
    'friction_productive_struggle_detected':
        { short: 'Productive struggle',  tone: '#55DDE0',
          long: 'Mid-accuracy (50–65%), recovering across attempts, completed.' },
    'friction_cognitive_overload_detected':
        { short: 'Cognitive overload',   tone: '#FFB14D',
          long: 'Low accuracy AND repeated stuck, overwhelmed, not unable.' },
    'friction_decision_fatigue_detected':
        { short: 'Decision fatigue',     tone: '#FFD84D',
          long: 'Long session with high stuck count, mid-accuracy. Probably tired.' },
    'friction_attention_collapse_detected':
        { short: 'Attention collapse',   tone: '#FF6B6B',
          long: 'Stuck, short, abandoned before completion.' },
    'friction_over_challenge_detected':
        { short: 'Over-challenge',       tone: '#C13A3A',
          long: 'Accuracy < 40% sustained. The item is genuinely too hard.' },
    'friction_boredom_detected':
        { short: 'Boredom',              tone: '#6C3FA4',
          long: 'Accuracy > 95% over ≥8 attempts. Time to push difficulty.' },
    'friction_distraction_detected':
        { short: 'Distraction',          tone: '#9094B0',
          long: 'Mean credibility below 0.85. Trust v1 flagged the attempts.' },
};
const detLabel = (raw: string) => DETECTOR_LABELS[raw]?.short ?? raw;
const detTone  = (raw: string) => DETECTOR_LABELS[raw]?.tone  ?? '#6C3FA4';
const detLong  = (raw: string) => DETECTOR_LABELS[raw]?.long  ?? '';

const MODE_LABELS: Record<string, string> = {
    'pre-writing': 'Tracing',
    'balloon-math': 'Balloon Math',
    'rainbow-bridge': 'Rainbow Bridge',
    'word-search': 'Word Search',
    'sort-and-place': 'Sort & Place',
    'gesture-spelling': 'Spelling Stars',
    'colour-builder': 'Colour Builder',
};
const modeLabel = (m: string) => MODE_LABELS[m] ?? m;

const THRESHOLD_PANEL: Array<{ name: string; rule: string }> = [
    { name: 'Successful learning',
      rule: 'accuracy ∈ [0.65, 0.90] ∧ n ≥ 6 ∧ stuck ≤ 2 ∧ credibility ≥ 0.85 ∧ completed' },
    { name: 'Productive struggle',
      rule: 'accuracy ∈ [0.50, 0.65] ∧ n ≥ 6 ∧ credibility ≥ 0.70 ∧ completed' },
    { name: 'Cognitive overload',
      rule: 'accuracy < 0.50 ∧ stuck ≥ 3 ∧ n ≥ 4' },
    { name: 'Decision fatigue',
      rule: 'stuck ≥ 5 ∧ n ≥ 8 ∧ accuracy ∈ [0.40, 0.80]' },
    { name: 'Attention collapse',
      rule: '¬completed ∧ stuck ≥ 3 ∧ n < 8' },
    { name: 'Over-challenge',
      rule: 'accuracy < 0.40 ∧ n ≥ 4' },
    { name: 'Boredom',
      rule: 'accuracy > 0.95 ∧ n ≥ 8' },
    { name: 'Distraction',
      rule: 'mean credibility < 0.85 ∧ n ≥ 4' },
];

export const FrictionTab: React.FC<{ filter: FilterState }> = ({ filter }) => {
    const d = rangeDays(filter.range);
    const friction = useRpc<FrictionEngineeringData>(
        () => fetchFrictionEngineering(d), [d],
    );

    // Per-mode heatmap matrix
    const modeMatrix = useMemo(() => {
        if (!friction.data) return null;
        const modes = Array.from(new Set(friction.data.by_mode.map(m => m.game_mode))).sort();
        const detectors = friction.data.by_detector.map(d => d.detector);
        const lookup = new Map<string, number>();
        friction.data.by_mode.forEach((m: FrictionModeCount) => {
            lookup.set(`${m.game_mode}|${m.detector}`, m.n);
        });
        return { modes, detectors, lookup };
    }, [friction.data]);

    if (friction.loading && !friction.data) {
        return <div className="iv-col-12"><Skeleton count={4} /></div>;
    }
    if (friction.error) {
        return <div className="iv-col-12">
            <Empty message={<>Friction engineering RPC error: <code>{friction.error}</code></>} />
        </div>;
    }
    if (!friction.data || friction.data.total === 0) {
        return <div className="iv-col-12">
            <Empty message={<>No friction firings yet in the selected window.
                Run <code>SELECT * FROM lios_detect_friction_v1('{filter.range}'::interval)</code> to backfill.</>} />
        </div>;
    }

    const f = friction.data;
    const totalByDetector = f.by_detector.reduce((s, x) => s + x.n, 0);
    const maxBar = Math.max(...f.by_detector.map(x => x.n), 1);

    return (
        <>
            {/* Engineering-mode banner */}
            <div className="iv-col-12">
                <div style={{
                    background: 'rgba(193, 58, 58, 0.06)',
                    border: '1px solid rgba(193, 58, 58, 0.18)',
                    borderRadius: 12, padding: '12px 16px', marginBottom: 16,
                    font: '13px/1.4 Nunito, system-ui, sans-serif', color: '#C13A3A',
                }}>
                    <strong>Engineering observability surface.</strong> Calibrating LIOS friction
                    detectors v1, thresholds in panel below. Teacher-facing version waits until
                    these firings are validated against ground-truth teacher tags.
                </div>
            </div>

            {/* Summary strip */}
            <div className="iv-col-12">
                <div style={{
                    display: 'flex', gap: 32, padding: '12px 16px',
                    background: 'rgba(108, 63, 164, 0.04)',
                    border: '1px solid rgba(108, 63, 164, 0.12)',
                    borderRadius: 12, marginBottom: 16,
                    font: '13px/1.4 Nunito, system-ui, sans-serif',
                }}>
                    <div>
                        <div style={{ color: '#6B6F84', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Total firings
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: '#2A2B3D' }}>
                            {fmtNum(f.total)}
                        </div>
                    </div>
                    <div>
                        <div style={{ color: '#6B6F84', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Distinct detectors firing
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: '#2A2B3D' }}>
                            {f.by_detector.length} / 8
                        </div>
                    </div>
                    <div>
                        <div style={{ color: '#6B6F84', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Window
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: '#2A2B3D' }}>
                            {f.days}d
                        </div>
                    </div>
                </div>
            </div>

            {/* Per-detector bars */}
            <div className="iv-col-6">
                <Card title="Detector firings, last 30 days" meta={`${f.by_detector.length} of 8 active`}>
                    <div style={{ display: 'grid', gap: 8 }}>
                        {f.by_detector.map(row => {
                            const pct = (row.n / maxBar) * 100;
                            const sharePct = totalByDetector ? (100 * row.n / totalByDetector).toFixed(1) : '0';
                            return (
                                <div key={row.detector} title={detLong(row.detector)}>
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between',
                                        font: '12px/1.2 Nunito, system-ui, sans-serif',
                                        marginBottom: 2,
                                    }}>
                                        <span style={{ color: '#3F4052', fontWeight: 600 }}>
                                            {detLabel(row.detector)}
                                        </span>
                                        <span style={{ color: '#6B6F84' }}>
                                            {fmtNum(row.n)} · {sharePct}%
                                        </span>
                                    </div>
                                    <div style={{
                                        height: 8, width: '100%',
                                        background: 'rgba(63, 64, 82, 0.06)',
                                        borderRadius: 4, overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            width: `${pct}%`, height: '100%',
                                            background: detTone(row.detector),
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>

            {/* Per-mode heatmap */}
            <div className="iv-col-6">
                <Card title="Per-game-mode firings" meta="Which modes trigger which states">
                    {!modeMatrix || modeMatrix.modes.length === 0
                        ? <Empty message="No per-mode data yet." />
                        : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="iv-table" style={{ fontSize: 11 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ minWidth: 100 }}>Game mode</th>
                                            {modeMatrix.detectors.map(d => (
                                                <th key={d} title={detLong(d)}
                                                    style={{ textAlign: 'center' }}>
                                                    {detLabel(d).split(' ').map(w => w[0]).join('')}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {modeMatrix.modes.map(mode => (
                                            <tr key={mode}>
                                                <td style={{ fontWeight: 600 }}>{modeLabel(mode)}</td>
                                                {modeMatrix.detectors.map(det => {
                                                    const v = modeMatrix.lookup.get(`${mode}|${det}`) ?? 0;
                                                    const opacity = v === 0 ? 0 : Math.min(1, 0.2 + v / 20);
                                                    return (
                                                        <td key={det}
                                                            title={`${detLabel(det)} on ${modeLabel(mode)}: ${v}`}
                                                            style={{
                                                                textAlign: 'center',
                                                                background: v === 0
                                                                    ? 'transparent'
                                                                    : `${detTone(det)}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`,
                                                                color: v === 0 ? '#B8BACF' : '#1A1B2E',
                                                                fontWeight: v > 5 ? 600 : 400,
                                                            }}>
                                                            {v || '·'}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div style={{ marginTop: 12, fontSize: 11, color: '#6B6F84', lineHeight: 1.5 }}>
                                    Initials: {modeMatrix.detectors.map(d => (
                                        <span key={d} style={{ marginRight: 12 }}>
                                            <strong>{detLabel(d).split(' ').map(w => w[0]).join('')}</strong> {detLabel(d)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                </Card>
            </div>

            {/* Threshold reference */}
            <div className="iv-col-12">
                <Card title="Detector thresholds, v1" meta="Engineering reference for calibration">
                    <table className="iv-table" style={{ fontSize: 12 }}>
                        <thead>
                            <tr><th style={{ width: 200 }}>Detector</th><th>Rule (Document B §4.1)</th></tr>
                        </thead>
                        <tbody>
                            {THRESHOLD_PANEL.map(t => (
                                <tr key={t.name}>
                                    <td style={{ fontWeight: 600 }}>{t.name}</td>
                                    <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: '#3F4052' }}>
                                        {t.rule}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            </div>

            {/* Recent firings */}
            <div className="iv-col-12">
                <Card title="Recent firings" meta={`Last ${f.recent.length}`}>
                    {f.recent.length === 0
                        ? <Empty message="No recent firings." />
                        : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="iv-table" style={{ fontSize: 11 }}>
                                    <thead>
                                        <tr>
                                            <th>When</th>
                                            <th>Detector</th>
                                            <th>Mode</th>
                                            <th>Age</th>
                                            <th>Acc.</th>
                                            <th>n</th>
                                            <th>Stuck</th>
                                            <th>Cred.</th>
                                            <th>Done?</th>
                                            <th>Session</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {f.recent.map((r, i) => (
                                            <tr key={`${r.session_id}-${r.detector}-${i}`}>
                                                <td>{new Date(r.occurred_at).toLocaleString(undefined,
                                                    { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                                <td>
                                                    <span style={{
                                                        background: detTone(r.detector),
                                                        color: '#fff',
                                                        padding: '1px 6px', borderRadius: 4,
                                                        fontWeight: 600, fontSize: 10,
                                                    }}>{detLabel(r.detector)}</span>
                                                </td>
                                                <td>{r.game_mode ? modeLabel(r.game_mode) : '-'}</td>
                                                <td>{r.age_band ?? '-'}</td>
                                                <td>{String(r.meta.accuracy ?? '-')}</td>
                                                <td>{String(r.meta.n_attempts ?? '-')}</td>
                                                <td>{String(r.meta.n_stuck ?? '-')}</td>
                                                <td>{String(r.meta.mean_credibility ?? '-')}</td>
                                                <td>{r.meta.reached_completion ? '✓' : '✗'}</td>
                                                <td style={{ fontFamily: 'ui-monospace, monospace', color: '#6B6F84' }}>
                                                    {r.session_id.slice(0, 8)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                </Card>
            </div>
        </>
    );
};
