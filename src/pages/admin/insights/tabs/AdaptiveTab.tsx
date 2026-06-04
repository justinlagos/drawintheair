/**
 * Adaptive tab, engineering observability for the LIOS Adaptive
 * Engine v1 (Document B §5 + §6.2).
 *
 * Surfaces:
 *   • Total decisions made
 *   • Regime distribution, what state was each learner in?
 *   • Recovery-step ladder, how often does step N fire?
 *   • Hard-invariant fire counts, which guards have caught bad picks?
 *   • Scaffold + reward distributions
 *   • Per-game-mode throughput
 *   • Recent decision log, full audit row with reasoning
 *
 * Engineering-only, admin allow-list gates the dashboard. The teacher
 * surface ships once the bandit upgrade (v2) replaces the rule layer.
 */

import React from 'react';
import { Card, Skeleton, Empty } from '../components';
import { fmtNum, fmtPct, days as rangeDays, useRpc } from '../helpers';
import { fetchAdaptiveDecisions } from '../rpc';
import type {
    FilterState, AdaptiveDecisionsData,
    AdaptiveRegime, AdaptiveScaffold, AdaptiveReward,
} from '../types';

const REGIME_TONES: Record<AdaptiveRegime, { tone: string; label: string }> = {
    fresh:       { tone: '#9094B0', label: 'Fresh'       },
    productive:  { tone: '#55DDE0', label: 'Productive'  },
    flow:        { tone: '#7ED957', label: 'Flow'        },
    boredom:     { tone: '#6C3FA4', label: 'Boredom'     },
    frustration: { tone: '#FF6B6B', label: 'Frustration' },
};

const SCAFFOLD_TONES: Record<AdaptiveScaffold, string> = {
    none:    '#7ED957',
    partial: '#FFB14D',
    full:    '#FF6B6B',
};

const REWARD_TONES: Record<AdaptiveReward, string> = {
    quiet:    '#9094B0',
    standard: '#55DDE0',
    big:      '#FFD84D',
};

const RECOVERY_LABELS = [
    '', // 0 unused
    '1 · Soft scaffold raise',
    '2 · Sibling substitution',
    '3 · Confidence rebuild',
    '4 · Activity rotation',
    '5 · Graceful exit',
];

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

export const AdaptiveTab: React.FC<{ filter: FilterState }> = ({ filter }) => {
    const d = rangeDays(filter.range);
    const ad = useRpc<AdaptiveDecisionsData>(() => fetchAdaptiveDecisions(d), [d]);

    if (ad.loading && !ad.data) {
        return <div className="iv-col-12"><Skeleton count={4} /></div>;
    }
    if (ad.error) {
        return <div className="iv-col-12">
            <Empty message={<>Adaptive RPC error: <code>{ad.error}</code></>} />
        </div>;
    }
    if (!ad.data || ad.data.total === 0) {
        return <div className="iv-col-12">
            <Empty message={<>
                No adaptive decisions yet in the selected window.
                Wire <code>lios_recommend_next(...)</code> into a game mode
                or invoke it directly to start the audit log.
            </>} />
        </div>;
    }

    const f = ad.data;
    const totalRegimes = f.by_regime.reduce((s, x) => s + x.n, 0) || 1;

    return (
        <>
            {/* Engineering banner, same pattern as Friction tab */}
            <div className="iv-col-12">
                <div style={{
                    background: 'rgba(193, 58, 58, 0.06)',
                    border: '1px solid rgba(193, 58, 58, 0.18)',
                    borderRadius: 12, padding: '12px 16px', marginBottom: 16,
                    font: '13px/1.4 Nunito, system-ui, sans-serif', color: '#C13A3A',
                }}>
                    <strong>Adaptive Engine v1, engineering observability.</strong>{' '}
                    Rule-based recommendation layer. The bandit (v2) replaces this
                    in Sprint 7 once enough decisions are logged. Every decision
                    here is auditable, click a row to expand its full reasoning.
                </div>
            </div>

            {/* Totals strip */}
            <div className="iv-col-12">
                <div style={{
                    display: 'flex', gap: 32, padding: '12px 16px',
                    background: 'rgba(108, 63, 164, 0.04)',
                    border: '1px solid rgba(108, 63, 164, 0.12)',
                    borderRadius: 12, marginBottom: 16,
                    font: '13px/1.4 Nunito, system-ui, sans-serif',
                }}>
                    <KpiInline label="Total decisions" value={fmtNum(f.total)} />
                    <KpiInline label="Regimes seen"     value={`${f.by_regime.length} / 5`} />
                    <KpiInline label="Invariants fired" value={fmtNum(
                        f.invariant_fires.reduce((s, x) => s + x.n, 0))} />
                    <KpiInline label="Recoveries"       value={fmtNum(
                        f.by_recovery_step.reduce((s, x) => s + x.n, 0))} />
                    <KpiInline label="Window"           value={`${f.days}d`} />
                </div>
            </div>

            {/* Regime distribution */}
            <div className="iv-col-6">
                <Card title="Regime distribution"
                      meta={`${f.by_regime.length} of 5 regimes active`}>
                    <div style={{ display: 'grid', gap: 8 }}>
                        {(['frustration','boredom','flow','productive','fresh'] as AdaptiveRegime[])
                            .map(r => {
                                const row = f.by_regime.find(x => x.regime === r);
                                const n = row?.n ?? 0;
                                const pct = (n / totalRegimes) * 100;
                                const tone = REGIME_TONES[r].tone;
                                return (
                                    <div key={r}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between',
                                                      fontSize: 12, marginBottom: 2 }}>
                                            <span style={{ fontWeight: 600 }}>{REGIME_TONES[r].label}</span>
                                            <span style={{ color: '#6B6F84' }}>
                                                {fmtNum(n)} · {fmtPct(pct)}
                                            </span>
                                        </div>
                                        <div style={{ height: 8, background: 'rgba(63,64,82,0.06)',
                                                      borderRadius: 4, overflow: 'hidden' }}>
                                            <div style={{ width: `${pct}%`, height: '100%', background: tone }} />
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </Card>
            </div>

            {/* Recovery ladder + Invariants */}
            <div className="iv-col-6">
                <Card title="Recovery state machine"
                      meta="How often each recovery step fires">
                    {f.by_recovery_step.length === 0
                        ? <Empty message="No recovery branches fired yet, no learner has hit 3 consecutive failures." />
                        : (
                            <table className="iv-table" style={{ fontSize: 12 }}>
                                <thead>
                                    <tr><th>Step</th><th>Action</th><th>Count</th></tr>
                                </thead>
                                <tbody>
                                    {[1,2,3,4,5].map(step => {
                                        const row = f.by_recovery_step.find(x => x.recovery_step === step);
                                        return (
                                            <tr key={step}>
                                                <td><strong>{step}</strong></td>
                                                <td>{RECOVERY_LABELS[step].split(' · ')[1]}</td>
                                                <td>{fmtNum(row?.n ?? 0)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                </Card>
            </div>

            {/* Hard invariants */}
            <div className="iv-col-6">
                <Card title="Hard invariant fires (§5.3)"
                      meta="Each fire = the engine guarded the learner from a bad pick">
                    {f.invariant_fires.length === 0
                        ? <Empty message="No invariants have fired yet." />
                        : (
                            <table className="iv-table" style={{ fontSize: 12 }}>
                                <thead><tr><th>Invariant</th><th>Times fired</th></tr></thead>
                                <tbody>
                                    {f.invariant_fires.map(inv => (
                                        <tr key={inv.invariant}>
                                            <td style={{ fontFamily: 'ui-monospace, monospace' }}>{inv.invariant}</td>
                                            <td>{fmtNum(inv.n)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                </Card>
            </div>

            {/* Scaffold + reward distribution */}
            <div className="iv-col-6">
                <Card title="Scaffold + reward distribution" meta="Engine output mix">
                    <div style={{ display: 'grid', gap: 12 }}>
                        <div>
                            <div style={{ fontSize: 11, color: '#6B6F84', textTransform: 'uppercase',
                                          letterSpacing: 0.5, marginBottom: 4 }}>
                                Scaffold level
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {(['none','partial','full'] as AdaptiveScaffold[]).map(s => {
                                    const row = f.by_scaffold.find(x => x.scaffold_level === s);
                                    return (
                                        <span key={s} style={{
                                            padding: '4px 10px', borderRadius: 999,
                                            background: SCAFFOLD_TONES[s], color: '#fff',
                                            fontSize: 12, fontWeight: 600,
                                        }}>{s} · {fmtNum(row?.n ?? 0)}</span>
                                    );
                                })}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 11, color: '#6B6F84', textTransform: 'uppercase',
                                          letterSpacing: 0.5, marginBottom: 4 }}>
                                Reward intensity
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {(['quiet','standard','big'] as AdaptiveReward[]).map(r => {
                                    const row = f.by_reward.find(x => x.reward_intensity === r);
                                    return (
                                        <span key={r} style={{
                                            padding: '4px 10px', borderRadius: 999,
                                            background: REWARD_TONES[r], color: '#1A1B2E',
                                            fontSize: 12, fontWeight: 600,
                                        }}>{r} · {fmtNum(row?.n ?? 0)}</span>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Per-mode throughput */}
            <div className="iv-col-12">
                <Card title="Per-game-mode decision throughput"
                      meta={`${f.by_mode.length} modes have called the engine`}>
                    {f.by_mode.length === 0
                        ? <Empty message="No mode has called the engine yet." />
                        : (
                            <table className="iv-table" style={{ fontSize: 12 }}>
                                <thead>
                                    <tr><th>Game mode</th><th>Decisions</th><th>Mean P(expected)</th></tr>
                                </thead>
                                <tbody>
                                    {f.by_mode.map(m => (
                                        <tr key={m.game_mode}>
                                            <td>{modeLabel(m.game_mode)}</td>
                                            <td>{fmtNum(m.n)}</td>
                                            <td>{m.mean_p_expected != null ? m.mean_p_expected.toFixed(2) : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                </Card>
            </div>

            {/* Recent decisions, the auditable log */}
            <div className="iv-col-12">
                <Card title="Recent decisions"
                      meta={`Last ${f.recent.length}, click to expand reasoning`}>
                    {f.recent.length === 0
                        ? <Empty message="No decisions recorded yet." />
                        : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="iv-table" style={{ fontSize: 11 }}>
                                    <thead>
                                        <tr>
                                            <th>When</th>
                                            <th>Regime</th>
                                            <th>Mode</th>
                                            <th>Current</th>
                                            <th>→ Next</th>
                                            <th>Scaffold</th>
                                            <th>Reward</th>
                                            <th>P(exp)</th>
                                            <th>Rec.</th>
                                            <th>Invariants</th>
                                            <th>Reasoning</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {f.recent.map(r => (
                                            <tr key={r.id}>
                                                <td>{new Date(r.made_at).toLocaleString(undefined,
                                                    { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                                <td>
                                                    <span style={{
                                                        background: REGIME_TONES[r.regime].tone,
                                                        color: '#fff', padding: '1px 6px',
                                                        borderRadius: 4, fontWeight: 600, fontSize: 10,
                                                    }}>{REGIME_TONES[r.regime].label}</span>
                                                </td>
                                                <td>{modeLabel(r.game_mode)}</td>
                                                <td>{r.current_item ?? '-'}</td>
                                                <td>{r.next_item ?? <em style={{ color: '#FF6B6B' }}>break</em>}</td>
                                                <td>
                                                    <span style={{
                                                        background: SCAFFOLD_TONES[r.scaffold_level],
                                                        color: '#fff', padding: '1px 6px',
                                                        borderRadius: 4, fontSize: 10,
                                                    }}>{r.scaffold_level}</span>
                                                </td>
                                                <td>
                                                    <span style={{
                                                        background: REWARD_TONES[r.reward_intensity],
                                                        color: '#1A1B2E', padding: '1px 6px',
                                                        borderRadius: 4, fontSize: 10,
                                                    }}>{r.reward_intensity}</span>
                                                </td>
                                                <td>{r.p_expected != null ? r.p_expected.toFixed(2) : '-'}</td>
                                                <td>{r.recovery_step ?? '-'}</td>
                                                <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10 }}>
                                                    {r.invariants_applied.length > 0
                                                        ? r.invariants_applied.join(', ')
                                                        : '-'}
                                                </td>
                                                <td title={r.reasoning ?? ''}
                                                    style={{ maxWidth: 360, overflow: 'hidden',
                                                             textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {r.reasoning ?? '-'}
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

const KpiInline: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div>
        <div style={{ color: '#6B6F84', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {label}
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#2A2B3D' }}>{value}</div>
    </div>
);
